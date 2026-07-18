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

import { getRediscoveryMemories } from "@/lib/rediscovery";

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

describe("rediscovery memories", () => {
  it("returns both anniversaries and a stable daily selection", async () => {
    await db.insert(entries).values([
      entry("three-days-before", "2025-07-15"),
      entry("one-day-after", "2025-07-19"),
      entry("other-cat-entry", "2025-07-18"),
      entry("draft", "2025-07-18", { status: "draft" }),
      entry("deleted", "2025-07-18", {
        deletedAt: new Date("2026-01-01T00:00:00.000Z"),
      }),
      entry("outside-window", "2025-07-22"),
      entry("three-years-before", "2023-07-16"),
      entry("three-years-after", "2023-07-19"),
    ]);
    await db.insert(entryCats).values([
      { entryId: "three-days-before", catId },
      { entryId: "one-day-after", catId },
      { entryId: "other-cat-entry", catId: "other-cat" },
      { entryId: "draft", catId },
      { entryId: "deleted", catId },
      { entryId: "outside-window", catId },
      { entryId: "three-years-before", catId },
      { entryId: "three-years-after", catId },
    ]);

    const now = new Date("2026-07-18T03:00:00.000Z");
    const result = await getRediscoveryMemories(viewer(), catId, now);
    const repeated = await getRediscoveryMemories(viewer(), catId, now);

    expect(result.lastYear?.id).toBe("one-day-after");
    expect(result.threeYearsAgo?.id).toBe("three-years-after");
    expect(result.threeYearsAgo?.cats).toEqual([{ id: catId, name: "むぎ" }]);
    expect(result.daily?.id).toBe(repeated.daily?.id);
    expect([
      "three-days-before",
      "one-day-after",
      "outside-window",
      "three-years-before",
      "three-years-after",
    ]).toContain(result.daily?.id);
  });

  it("can select a daily record when both anniversary windows are empty", async () => {
    await db.insert(entries).values(entry("too-old", "2025-07-10"));
    await db.insert(entryCats).values({ entryId: "too-old", catId });

    await expect(
      getRediscoveryMemories(
        viewer(),
        catId,
        new Date("2026-07-18T03:00:00.000Z"),
      ),
    ).resolves.toMatchObject({
      lastYear: null,
      threeYearsAgo: null,
      daily: { id: "too-old" },
    });
  });

  it("returns null for every rediscovery type without a record", async () => {
    await expect(
      getRediscoveryMemories(
        viewer(),
        catId,
        new Date("2026-07-18T03:00:00.000Z"),
      ),
    ).resolves.toEqual({ lastYear: null, threeYearsAgo: null, daily: null });
  });
});

function viewer() {
  return {
    db,
    session: { user: { id: ownerId } },
    household: { id: homeId },
    env: { DB: env.DB },
  } as Parameters<typeof getRediscoveryMemories>[0];
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
