import {
  cats,
  createDatabase,
  entries,
  entryCats,
  entryMedia,
  entryTags,
  households,
  mediaAssets,
  tags,
  user,
} from "@cattower/db";
import { parseEntrySearchInput } from "@cattower/domain";
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it } from "vitest";

import { getSearchFacets, searchEntries } from "@/lib/search";

const db = createDatabase(env.DB);
const ownerId = "search-owner";
const outsiderId = "search-outsider";
const homeId = "search-home";
const outsiderHomeId = "search-outsider-home";
const mugiId = "search-cat-mugi";
const komeId = "search-cat-kome";

beforeEach(async () => {
  await clearDatabase();
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: "search-owner@example.test" },
    {
      id: outsiderId,
      name: "Outsider",
      email: "search-outsider@example.test",
    },
  ]);
  await db.insert(households).values([
    { id: homeId, name: "Home", ownerUserId: ownerId },
    {
      id: outsiderHomeId,
      name: "Other",
      ownerUserId: outsiderId,
    },
  ]);
  await db.insert(cats).values([
    { id: mugiId, householdId: homeId, name: "むぎ" },
    { id: komeId, householdId: homeId, name: "こめ" },
    { id: "outside-cat", householdId: outsiderHomeId, name: "そら" },
  ]);
  await db.insert(tags).values([
    {
      id: "tag-window",
      householdId: homeId,
      name: "お気に入り",
      normalizedName: "お気に入り",
    },
    {
      id: "tag-food",
      householdId: homeId,
      name: "ごはん",
      normalizedName: "ごはん",
    },
    {
      id: "tag-outside",
      householdId: outsiderHomeId,
      name: "窓辺",
      normalizedName: "窓辺",
    },
  ]);
  await db.insert(entries).values([
    entry("window", homeId, ownerId, "2026-07-15", {
      title: "夕方の窓辺",
      body: "満足度は100%だった。",
    }),
    entry("breakfast", homeId, ownerId, "2026-07-10", {
      body: "朝のごはんを待っている。",
    }),
    entry("draft", homeId, ownerId, "2026-07-18", {
      title: "窓辺の下書き",
      status: "draft",
    }),
    entry("deleted", homeId, ownerId, "2026-07-17", {
      title: "削除した窓辺",
      deletedAt: new Date("2026-07-18T00:00:00.000Z"),
    }),
    entry("processing", homeId, ownerId, "2026-07-16", {
      title: "処理中の窓辺",
      status: "processing",
    }),
    entry("outside", outsiderHomeId, outsiderId, "2026-07-18", {
      title: "別のおうちの窓辺",
    }),
  ]);
  await db.insert(entryCats).values([
    { entryId: "window", catId: mugiId },
    { entryId: "breakfast", catId: komeId },
    { entryId: "outside", catId: "outside-cat" },
  ]);
  await db.insert(entryTags).values([
    { entryId: "window", tagId: "tag-window" },
    { entryId: "breakfast", tagId: "tag-food" },
    { entryId: "outside", tagId: "tag-outside" },
  ]);
  await db.insert(mediaAssets).values({
    id: "window-image",
    householdId: homeId,
    ownerUserId: ownerId,
    kind: "image",
    provider: "r2",
    purpose: "entry",
    providerKey: "search/window/original",
    originalFilename: "window.jpg",
    mimeType: "image/jpeg",
    status: "ready",
  });
  await db.insert(entryMedia).values({
    entryId: "window",
    mediaAssetId: "window-image",
  });
});

describe("entry search", () => {
  it("lists only ready, undeleted records in the active household", async () => {
    const result = await search({});
    expect(result.items.map((item) => item.id)).toEqual([
      "window",
      "breakfast",
    ]);
    expect(result.total).toBe(2);
    const facets = await getSearchFacets(viewer());
    expect(facets.cats.map((cat) => cat.id)).toEqual([komeId, mugiId]);
    expect(facets.tags.map((tag) => tag.id).sort()).toEqual([
      "tag-food",
      "tag-window",
    ]);
  });

  it("searches titles, bodies, tags, and escaped LIKE characters", async () => {
    expect((await search({ q: "夕方" })).items.map(id)).toEqual(["window"]);
    expect((await search({ q: "ごはん" })).items.map(id)).toEqual([
      "breakfast",
    ]);
    expect((await search({ q: "%" })).items.map(id)).toEqual(["window"]);
    expect((await search({ q: "窓辺" })).items.map(id)).toEqual(["window"]);
    expect((await search({ q: "お気に入り" })).items.map(id)).toEqual([
      "window",
    ]);
  });

  it("combines date, cat, tag, and media filters without crossing households", async () => {
    expect(
      (
        await search({
          from: "2026-07-14",
          to: "2026-07-15",
          catId: mugiId,
          tagId: "tag-window",
          media: "image",
        })
      ).items.map(id),
    ).toEqual(["window"]);
    expect((await search({ media: "none" })).items.map(id)).toEqual([
      "breakfast",
    ]);
    expect((await search({ tagId: "tag-outside" })).items).toEqual([]);
  });

  it("returns a bounded first result set with an accurate total", async () => {
    const extraEntries = Array.from({ length: 50 }, (_, index) =>
      entry(
        `older-${index}`,
        homeId,
        ownerId,
        `2026-06-${String((index % 28) + 1).padStart(2, "0")}`,
        { body: `古い記録 ${index}` },
      ),
    );
    for (let index = 0; index < extraEntries.length; index += 10)
      await db.insert(entries).values(extraEntries.slice(index, index + 10));

    const result = await search({});
    expect(result.items).toHaveLength(50);
    expect(result.total).toBe(52);
    expect(result.hasMore).toBe(true);
    expect(result.items[0]?.id).toBe("window");
  });
});

async function search(input: Record<string, string | string[] | undefined>) {
  const { filters, errors } = parseEntrySearchInput(input);
  expect(errors).toEqual([]);
  return searchEntries(viewer(), filters);
}

function viewer() {
  return {
    db,
    session: { user: { id: ownerId } },
    household: { id: homeId },
    env: { DB: env.DB },
  } as Parameters<typeof searchEntries>[0];
}

function id(value: { id: string }) {
  return value.id;
}

function entry(
  entryId: string,
  householdId: string,
  authorUserId: string,
  occurredDate: string,
  values: {
    title?: string;
    body?: string;
    status?: "ready" | "draft" | "processing" | "failed";
    deletedAt?: Date;
  },
) {
  return {
    id: entryId,
    householdId,
    authorUserId,
    occurredAt: new Date(`${occurredDate}T00:00:00.000Z`),
    ...values,
  };
}

async function clearDatabase() {
  for (const table of [
    "entry_tags",
    "entry_media",
    "entry_cats",
    "entries",
    "tags",
    "media_assets",
    "cats",
    "households",
    "user",
  ])
    await env.DB.prepare(`DELETE FROM ${table}`).run();
}
