import {
  getEntryImageDerivativeKey,
  getProfileImageDerivativeKey,
} from "@cattower/domain";
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { cleanupOrphanedMedia } from "@/lib/media-cleanup";

const NOW = new Date("2026-07-17T04:00:00.000Z");
const ownerId = "cleanup-owner";
const householdId = "cleanup-home";

beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare("DELETE FROM entry_media"),
    env.DB.prepare("DELETE FROM entries"),
    env.DB.prepare("DELETE FROM cats"),
    env.DB.prepare("DELETE FROM media_assets"),
    env.DB.prepare("DELETE FROM household_members"),
    env.DB.prepare("DELETE FROM user_preferences"),
    env.DB.prepare("DELETE FROM households"),
    env.DB.prepare("DELETE FROM user"),
  ]);
  const listed = await env.MEDIA.list();
  if (listed.objects.length)
    await env.MEDIA.delete(listed.objects.map((object) => object.key));

  await env.DB.batch([
    env.DB.prepare(
      "INSERT INTO user (id, name, email, email_verified, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)",
    ).bind(
      ownerId,
      "Owner",
      "cleanup@example.test",
      NOW.getTime(),
      NOW.getTime(),
    ),
    env.DB.prepare(
      "INSERT INTO households (id, name, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
    ).bind(householdId, "Cleanup home", ownerId, NOW.getTime(), NOW.getTime()),
  ]);
});

describe("cleanupOrphanedMedia", () => {
  it("deletes only old unreferenced originals and derivatives", async () => {
    const oldFailed = await insertAsset("old-failed", "failed", daysAgo(2));
    const oldReady = await insertAsset("old-ready", "ready", daysAgo(8));
    const recentFailed = await insertAsset(
      "recent-failed",
      "failed",
      hoursAgo(2),
    );
    const profileAsset = await insertAsset(
      "profile-reference",
      "ready",
      daysAgo(8),
    );
    const entryAsset = await insertAsset(
      "entry-reference",
      "ready",
      daysAgo(8),
    );

    await env.DB.batch([
      env.DB.prepare(
        "INSERT INTO cats (id, household_id, name, profile_asset_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(
        "cleanup-cat",
        householdId,
        "Mugi",
        profileAsset.providerKey.split("/")[4],
        NOW.getTime(),
        NOW.getTime(),
      ),
      env.DB.prepare(
        "INSERT INTO entries (id, household_id, author_user_id, occurred_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(
        "cleanup-entry",
        householdId,
        ownerId,
        NOW.getTime(),
        NOW.getTime(),
        NOW.getTime(),
      ),
      env.DB.prepare(
        "INSERT INTO entry_media (entry_id, media_asset_id) VALUES (?, ?)",
      ).bind("cleanup-entry", entryAsset.providerKey.split("/")[4]),
    ]);

    const result = await cleanupOrphanedMedia(env, { now: NOW });

    expect(result).toEqual({ scanned: 2, claimed: 2, deleted: 2, failed: 0 });
    await expectDeleted(oldFailed.providerKey);
    await expectDeleted(oldReady.providerKey);
    expect(await env.MEDIA.head(recentFailed.providerKey)).not.toBeNull();
    expect(await env.MEDIA.head(profileAsset.providerKey)).not.toBeNull();
    expect(await env.MEDIA.head(entryAsset.providerKey)).not.toBeNull();

    const rows = await env.DB.prepare(
      "SELECT id, status, deleted_at AS deletedAt FROM media_assets ORDER BY id",
    ).all<{ id: string; status: string; deletedAt: number | null }>();
    expect(rows.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "old-failed", status: "deleting" }),
        expect.objectContaining({ id: "old-ready", status: "deleting" }),
        { id: "recent-failed", status: "failed", deletedAt: null },
        { id: "profile-reference", status: "ready", deletedAt: null },
        { id: "entry-reference", status: "ready", deletedAt: null },
      ]),
    );
    expect(
      rows.results
        .filter((row) => row.id.startsWith("old-"))
        .every((row) => row.deletedAt === NOW.getTime()),
    ).toBe(true);
  });

  it("retries stale deleting assets and respects the batch limit", async () => {
    const first = await insertAsset("retry-first", "deleting", hoursAgo(2));
    const second = await insertAsset("retry-second", "deleting", hoursAgo(2));

    const result = await cleanupOrphanedMedia(env, { now: NOW, limit: 1 });

    expect(result).toEqual({ scanned: 1, claimed: 1, deleted: 1, failed: 0 });
    await expectDeleted(first.providerKey);
    expect(await env.MEDIA.head(second.providerKey)).not.toBeNull();
  });
});

async function insertAsset(
  id: string,
  status: "failed" | "ready" | "deleting",
  updatedAt: number,
) {
  const providerKey = `households/${householdId}/cats/cleanup-cat/${id}/original`;
  await env.DB.prepare(
    `INSERT INTO media_assets
      (id, household_id, owner_user_id, kind, provider, purpose, provider_key, original_filename, mime_type, status, created_at, updated_at)
     VALUES (?, ?, ?, 'image', 'r2', 'entry', ?, ?, 'image/jpeg', ?, ?, ?)`,
  )
    .bind(
      id,
      householdId,
      ownerId,
      providerKey,
      `${id}.jpg`,
      status,
      updatedAt,
      updatedAt,
    )
    .run();
  await Promise.all([
    env.MEDIA.put(providerKey, "original"),
    env.MEDIA.put(getProfileImageDerivativeKey(providerKey), "profile"),
    env.MEDIA.put(getEntryImageDerivativeKey(providerKey), "entry"),
  ]);
  return { providerKey };
}

async function expectDeleted(providerKey: string) {
  const objects = await Promise.all([
    env.MEDIA.head(providerKey),
    env.MEDIA.head(getProfileImageDerivativeKey(providerKey)),
    env.MEDIA.head(getEntryImageDerivativeKey(providerKey)),
  ]);
  expect(objects).toEqual([null, null, null]);
}

function daysAgo(days: number) {
  return NOW.getTime() - days * 24 * 60 * 60 * 1000;
}

function hoursAgo(hours: number) {
  return NOW.getTime() - hours * 60 * 60 * 1000;
}
