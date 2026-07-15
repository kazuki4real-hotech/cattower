import { cats, mediaAssets, tags } from "@cattower/db";
import { and, eq, inArray } from "drizzle-orm";

import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export type ValidEntryInput = {
  title: string | null;
  body: string | null;
  occurredAt: Date;
  catIds: string[];
  assetIds: string[];
  tags: { name: string; normalizedName: string }[];
};

export async function validateEntryRelations(
  viewer: Viewer,
  input: ValidEntryInput,
  allowedExistingAssetIds: string[] = [],
) {
  const catRows = await viewer.db
    .select({ id: cats.id })
    .from(cats)
    .where(
      and(
        eq(cats.householdId, viewer.household.id),
        inArray(cats.id, input.catIds),
      ),
    );
  if (catRows.length !== input.catIds.length) return false;

  if (input.assetIds.length) {
    const assetRows = await viewer.db
      .select({ id: mediaAssets.id, ownerUserId: mediaAssets.ownerUserId })
      .from(mediaAssets)
      .where(
        and(
          inArray(mediaAssets.id, input.assetIds),
          eq(mediaAssets.householdId, viewer.household.id),
          eq(mediaAssets.purpose, "entry"),
          eq(mediaAssets.status, "ready"),
        ),
      );
    if (
      assetRows.length !== input.assetIds.length ||
      assetRows.some(
        (asset) =>
          asset.ownerUserId !== viewer.session.user.id &&
          !allowedExistingAssetIds.includes(asset.id),
      )
    )
      return false;
  }
  return true;
}

export async function resolveEntryTagIds(
  viewer: Viewer,
  input: ValidEntryInput,
) {
  for (const tag of input.tags) {
    await viewer.db
      .insert(tags)
      .values({
        id: crypto.randomUUID(),
        householdId: viewer.household.id,
        name: tag.name,
        normalizedName: tag.normalizedName,
      })
      .onConflictDoNothing({
        target: [tags.householdId, tags.normalizedName],
      });
  }
  if (!input.tags.length) return [];
  return viewer.db
    .select({ id: tags.id })
    .from(tags)
    .where(
      and(
        eq(tags.householdId, viewer.household.id),
        inArray(
          tags.normalizedName,
          input.tags.map((tag) => tag.normalizedName),
        ),
      ),
    );
}

export function entryRelationStatements(
  viewer: Viewer,
  entryId: string,
  input: ValidEntryInput,
  tagIds: { id: string }[],
  replace: boolean,
) {
  return [
    ...(replace
      ? [
          viewer.env.DB.prepare(
            "DELETE FROM entry_tags WHERE entry_id = ?",
          ).bind(entryId),
          viewer.env.DB.prepare(
            "DELETE FROM entry_media WHERE entry_id = ?",
          ).bind(entryId),
          viewer.env.DB.prepare(
            "DELETE FROM entry_cats WHERE entry_id = ?",
          ).bind(entryId),
        ]
      : []),
    ...input.catIds.map((catId, index) =>
      viewer.env.DB.prepare(
        "INSERT INTO entry_cats (entry_id, cat_id, sort_order) VALUES (?, ?, ?)",
      ).bind(entryId, catId, index),
    ),
    ...input.assetIds.map((assetId, index) =>
      viewer.env.DB.prepare(
        "INSERT INTO entry_media (entry_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?)",
      ).bind(entryId, assetId, index === 0 ? "primary" : "gallery", index),
    ),
    ...tagIds.map((tag) =>
      viewer.env.DB.prepare(
        "INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
      ).bind(entryId, tag.id),
    ),
  ];
}

export function guardedEntryRelationStatements(
  viewer: Viewer,
  entryId: string,
  input: ValidEntryInput,
  tagIds: { id: string }[],
  version: number,
  updatedAt: number,
) {
  const guard =
    "EXISTS (SELECT 1 FROM entries WHERE id = ? AND version = ? AND updated_at = ?)";
  return [
    viewer.env.DB.prepare(
      `DELETE FROM entry_tags WHERE entry_id = ? AND ${guard}`,
    ).bind(entryId, entryId, version, updatedAt),
    viewer.env.DB.prepare(
      `DELETE FROM entry_media WHERE entry_id = ? AND ${guard}`,
    ).bind(entryId, entryId, version, updatedAt),
    viewer.env.DB.prepare(
      `DELETE FROM entry_cats WHERE entry_id = ? AND ${guard}`,
    ).bind(entryId, entryId, version, updatedAt),
    ...input.catIds.map((catId, index) =>
      viewer.env.DB.prepare(
        `INSERT INTO entry_cats (entry_id, cat_id, sort_order) SELECT ?, ?, ? WHERE ${guard}`,
      ).bind(entryId, catId, index, entryId, version, updatedAt),
    ),
    ...input.assetIds.map((assetId, index) =>
      viewer.env.DB.prepare(
        `INSERT INTO entry_media (entry_id, media_asset_id, role, sort_order) SELECT ?, ?, ?, ? WHERE ${guard}`,
      ).bind(
        entryId,
        assetId,
        index === 0 ? "primary" : "gallery",
        index,
        entryId,
        version,
        updatedAt,
      ),
    ),
    ...tagIds.map((tag) =>
      viewer.env.DB.prepare(
        `INSERT INTO entry_tags (entry_id, tag_id) SELECT ?, ? WHERE ${guard}`,
      ).bind(entryId, tag.id, entryId, version, updatedAt),
    ),
  ];
}
