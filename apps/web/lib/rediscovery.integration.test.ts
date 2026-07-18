import {
  cats,
  createDatabase,
  entries,
  entryCats,
  households,
  user,
  userPreferences,
} from "@cattower/db";
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { getLastYearMemory } from "@/lib/rediscovery";

const db = createDatabase(env.DB);
const ownerId = "rediscovery-owner";
const homeId = "rediscovery-home";
const catId = "rediscovery-cat";

beforeEach(async () => {
  await clearDatabase();
  await db.insert(user).values({
    id: ownerId,
    name: "Owner",
    email: "rediscovery-owner@example.test",
  });
  await db.insert(households).values({
    id: homeId,
    name: "Home",
    ownerUserId: ownerId,
  });
  await db.insert(cats).values([
    { id: catId, householdId: homeId, name: "むぎ" },
    { id: "other-cat", householdId: homeId, name: "こめ" },
  ]);
  await db.insert(userPreferences).values({
    userId: ownerId,
    timezone: "Asia/Tokyo",
  });
});

describe("last year rediscovery", () => {
  it("returns the closest ready record for the selected cat", async () => {
    await db.insert(entries).values([
      entry("three-days-before", "2025-07-15"),
      entry("one-day-after", "2025-07-19"),
      entry("other-cat-entry", "2025-07-18"),
      entry("draft", "2025-07-18", { status: "draft" }),
      entry("deleted", "2025-07-18", {
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      entry("outside-window", "2025-07-22"),
    ]);
    await db.insert(entryCats).values([
      { entryId: "three-days-before", catId },
      { entryId: "one-day-after", catId },
      { entryId: "other-cat-entry", catId: "other-cat" },
      { entryId: "draft", catId },
      { entryId: "deleted", catId },
      { entryId: "outside-window", catId },
    ]);

    const result = await getLastYearMemory(
      viewer(),
      catId,
      new Date("2026-07-18T03:00:00.000Z"),
    );

    expect(result?.id).toBe("one-day-after");
    expect(result?.cats).toEqual([{ id: catId, name: "むぎ" }]);
  });

  it("returns null when the seven-day window has no eligible record", async () => {
    await db.insert(entries).values(entry("too-old", "2025-07-10"));
    await db.insert(entryCats).values({ entryId: "too-old", catId });

    await expect(
      getLastYearMemory(viewer(), catId, new Date("2026-07-18T03:00:00.000Z")),
    ).resolves.toBeNull();
  });
});

function viewer() {
  return {
    db,
    session: { user: { id: ownerId } },
    household: { id: homeId },
    env: { DB: env.DB },
  } as Parameters<typeof getLastYearMemory>[0];
}

function entry(
  id: string,
  occurredDate: string,
  values: {
    status?: "ready" | "draft";
    deletedAt?: Date;
  } = {},
) {
  return {
    id,
    householdId: homeId,
    authorUserId: ownerId,
    body: `記録 ${id}`,
    occurredAt: new Date(`${occurredDate}T00:00:00.000Z`),
    ...values,
  };
}

async function clearDatabase() {
  for (const table of [
    "entry_cats",
    "entries",
    "cats",
    "user_preferences",
    "households",
    "user",
  ])
    await env.DB.prepare(`DELETE FROM ${table}`).run();
}
