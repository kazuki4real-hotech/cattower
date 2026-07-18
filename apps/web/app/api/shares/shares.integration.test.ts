import {
  boardItems,
  boards,
  createDatabase,
  entries,
  entryMedia,
  householdMembers,
  households,
  mediaAssets,
  notifications,
  shareLinks,
  shareRateLimits,
  user,
  userPreferences,
} from "@cattower/db";
import {
  createShareToken,
  hashShareToken,
  SHARE_ACCESS_WINDOW_LIMIT,
  SHARE_CREATION_HOURLY_LIMIT,
} from "@cattower/domain";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const viewerState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/viewer", () => ({
  getViewer: async () => viewerState.current,
}));

import { DELETE as revokeShare } from "@/app/api/shares/[shareId]/route";
import { GET, POST } from "@/app/api/shares/route";
import { createShareExpiryNotifications } from "@/lib/notifications";
import {
  checkShareAccessRateLimit,
  getSharedMediaAsset,
  getSharedResource,
} from "@/lib/shares";

const db = createDatabase(env.DB);
const ownerId = "share-owner";
const editorId = "share-editor";
const homeId = "share-home";

beforeEach(async () => {
  viewerState.current = null;
  await clearDatabase();
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: "share-owner@example.test" },
    { id: editorId, name: "Editor", email: "share-editor@example.test" },
  ]);
  await db.insert(households).values({
    id: homeId,
    name: "Home",
    ownerUserId: ownerId,
  });
  await db.insert(userPreferences).values([
    { userId: ownerId, activeHouseholdId: homeId },
    { userId: editorId, activeHouseholdId: homeId },
  ]);
  await db.insert(householdMembers).values([
    {
      householdId: homeId,
      userId: ownerId,
      role: "owner",
      status: "active",
    },
    {
      householdId: homeId,
      userId: editorId,
      role: "editor",
      status: "active",
      invitedBy: ownerId,
    },
  ]);
  await seedEntry("owner-entry", ownerId);
  await seedEntry("editor-entry", editorId);
});

describe("limited sharing", () => {
  it("requires authentication and restricts editors to resources they manage", async () => {
    expect(
      (
        await POST(
          request("", "POST", {
            resourceType: "entry",
            resourceId: "owner-entry",
            expiresInDays: 7,
          }),
        )
      ).status,
    ).toBe(401);

    setViewer(editorId);
    expect(
      (
        await POST(
          request("", "POST", {
            resourceType: "entry",
            resourceId: "owner-entry",
            expiresInDays: 7,
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await POST(
          request("", "POST", {
            resourceType: "entry",
            resourceId: "editor-entry",
            expiresInDays: 7,
          }),
        )
      ).status,
    ).toBe(201);
  });

  it("returns raw token material once and stores only its hash", async () => {
    setViewer(ownerId);
    const response = await POST(
      request("", "POST", {
        resourceType: "entry",
        resourceId: "owner-entry",
        expiresInDays: 7,
      }),
    );
    const body = (await response.json()) as {
      share: { id: string; shareUrl: string };
    };
    const token = body.share.shareUrl.split("/").at(-1) as string;
    const stored = await db.query.shareLinks.findFirst({
      where: eq(shareLinks.id, body.share.id),
    });
    expect(response.status).toBe(201);
    expect(stored?.tokenHash).toBe(await hashShareToken(token));
    expect(stored?.tokenHash).not.toBe(token);

    const listed = await GET(
      request("?resourceType=entry&resourceId=owner-entry"),
    );
    const listBody = (await listed.json()) as {
      shares: Array<Record<string, unknown>>;
    };
    expect(listBody.shares).toHaveLength(1);
    expect(listBody.shares[0]).not.toHaveProperty("tokenHash");
    expect(listBody.shares[0]).not.toHaveProperty("shareUrl");
  });

  it("revokes immediately and denies expired links", async () => {
    const first = await seedShare("owner-entry", "entry");
    setViewer(ownerId);
    expect(await getSharedResource(db, first.token)).not.toBeNull();
    const revoked = await revokeShare(
      request(`/${first.id}`, "DELETE"),
      context(first.id),
    );
    expect(revoked.status).toBe(200);
    expect(await getSharedResource(db, first.token)).toBeNull();

    const expired = await seedShare("owner-entry", "entry");
    await db
      .update(shareLinks)
      .set({ expiresAt: new Date(Date.now() - 1) })
      .where(eq(shareLinks.id, expired.id));
    expect(await getSharedResource(db, expired.token)).toBeNull();
  });

  it("invalidates entry shares on deletion and all shares on account deletion request", async () => {
    const deletedEntryShare = await seedShare("owner-entry", "entry");
    await db
      .update(entries)
      .set({ deletedAt: new Date() })
      .where(eq(entries.id, "owner-entry"));
    expect(await getSharedResource(db, deletedEntryShare.token)).toBeNull();

    const accountShare = await seedShare("editor-entry", "entry");
    await db
      .update(households)
      .set({ deletionRequestedAt: new Date() })
      .where(eq(households.id, homeId));
    expect(await getSharedResource(db, accountShare.token)).toBeNull();
  });

  it("keeps board shares inside the selected board media scope", async () => {
    await db.insert(boards).values({
      id: "shared-board",
      householdId: homeId,
      createdBy: ownerId,
      name: "窓辺",
      normalizedName: "窓辺",
      sortMode: "manual",
    });
    await db.insert(boardItems).values({
      boardId: "shared-board",
      entryId: "owner-entry",
      sortKey: "000000001000",
    });
    await seedAsset("owner-asset", "owner-entry", ownerId);
    await seedAsset("outside-asset", "editor-entry", editorId);
    const seeded = await seedShare("shared-board", "board");
    const found = await getSharedResource(db, seeded.token);
    expect(found?.resource).toMatchObject({
      type: "board",
      entries: [{ id: "owner-entry" }],
    });
    const share = found?.share;
    if (!share) throw new Error("share_fixture_failed");
    expect(await getSharedMediaAsset(db, share, "owner-asset")).not.toBeNull();
    expect(await getSharedMediaAsset(db, share, "outside-asset")).toBeNull();
  });

  it("rate limits creation and public access without storing raw addresses", async () => {
    setViewer(ownerId);
    for (let index = 0; index < SHARE_CREATION_HOURLY_LIMIT; index += 1)
      await seedShare("owner-entry", "entry", ownerId);
    const creation = await POST(
      request("", "POST", {
        resourceType: "entry",
        resourceId: "owner-entry",
        expiresInDays: 7,
      }),
    );
    expect(creation.status).toBe(429);

    const token = createShareToken();
    let allowed = true;
    for (let index = 0; index <= SHARE_ACCESS_WINDOW_LIMIT; index += 1) {
      const result = await checkShareAccessRateLimit(
        db,
        token,
        "203.0.113.8",
        new Date("2026-07-18T00:00:10.000Z"),
      );
      allowed = result.allowed;
    }
    expect(allowed).toBe(false);
    const rows = await db.query.shareRateLimits.findMany();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.keyHash).not.toContain("203.0.113.8");
  });

  it("creates one safe in-app notice within 24 hours of expiry", async () => {
    await seedShare("owner-entry", "entry", ownerId, 12 * 60 * 60 * 1000);
    const now = new Date();
    expect(await createShareExpiryNotifications(db, ownerId, now)).toBe(1);
    expect(await createShareExpiryNotifications(db, ownerId, now)).toBe(0);
    const [notice] = await db.query.notifications.findMany();
    expect(notice).toMatchObject({
      recipientUserId: ownerId,
      type: "share_expiring",
      resourceType: "household",
      resourceId: homeId,
    });
    expect(notice?.payloadJson).not.toContain("owner-entry");
  });
});

async function seedEntry(id: string, authorUserId: string) {
  await db.insert(entries).values({
    id,
    householdId: homeId,
    authorUserId,
    title: id,
    body: "本文",
    occurredAt: new Date("2026-07-18T00:00:00.000Z"),
    status: "ready",
  });
}

async function seedAsset(id: string, entryId: string, ownerUserId: string) {
  await db.insert(mediaAssets).values({
    id,
    householdId: homeId,
    ownerUserId,
    kind: "image",
    provider: "r2",
    purpose: "entry",
    providerKey: `entries/${id}/original`,
    originalFilename: `${id}.jpg`,
    mimeType: "image/jpeg",
    status: "ready",
  });
  await db.insert(entryMedia).values({
    entryId,
    mediaAssetId: id,
    role: "primary",
  });
}

async function seedShare(
  resourceId: string,
  resourceType: "entry" | "board",
  createdBy = ownerId,
  ttlMs = 7 * 24 * 60 * 60 * 1000,
) {
  const token = createShareToken();
  const tokenHash = await hashShareToken(token);
  if (!tokenHash) throw new Error("token_fixture_failed");
  const id = crypto.randomUUID();
  await db.insert(shareLinks).values({
    id,
    householdId: homeId,
    createdBy,
    resourceType,
    resourceId,
    tokenHash,
    expiresAt: new Date(Date.now() + ttlMs),
  });
  return { id, token };
}

function setViewer(userId: string) {
  viewerState.current = {
    db,
    env,
    session: { user: { id: userId } },
    household: { id: homeId },
  };
}

function request(path = "", method = "GET", body?: unknown) {
  return new Request(`https://example.test/api/shares${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function context(shareId: string) {
  return { params: Promise.resolve({ shareId }) };
}

async function clearDatabase() {
  for (const table of [
    notifications,
    shareRateLimits,
    shareLinks,
    boardItems,
    boards,
    entryMedia,
    mediaAssets,
    entries,
    householdMembers,
    userPreferences,
    households,
    user,
  ])
    await db.delete(table);
}
