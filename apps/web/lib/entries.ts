import {
  cats,
  entries,
  entryCats,
  entryMedia,
  entryTags,
  mediaAssets,
  tags,
  user,
} from "@cattower/db";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;
type EntryRow = typeof entries.$inferSelect;

export async function getRecentEntries(
  viewer: Viewer,
  limit = 12,
  catId?: string | null,
) {
  const scope = and(
    eq(entries.householdId, viewer.household.id),
    eq(entries.status, "ready"),
    isNull(entries.deletedAt),
  );
  const rows = catId
    ? (
        await viewer.db
          .select({ entry: entries })
          .from(entries)
          .innerJoin(entryCats, eq(entryCats.entryId, entries.id))
          .where(and(scope, eq(entryCats.catId, catId)))
          .orderBy(desc(entries.occurredAt), desc(entries.createdAt))
          .limit(limit)
      ).map(({ entry }) => entry)
    : await viewer.db.query.entries.findMany({
        where: scope,
        orderBy: [desc(entries.occurredAt), desc(entries.createdAt)],
        limit,
      });
  return hydrateEntries(viewer, rows);
}

export async function getEntry(viewer: Viewer, entryId: string) {
  const row = await viewer.db.query.entries.findFirst({
    where: and(
      eq(entries.id, entryId),
      eq(entries.householdId, viewer.household.id),
      eq(entries.status, "ready"),
      isNull(entries.deletedAt),
    ),
  });
  return row ? ((await hydrateEntries(viewer, [row]))[0] ?? null) : null;
}

async function hydrateEntries(viewer: Viewer, rows: EntryRow[]) {
  if (!rows.length) return [];
  const ids = rows.map((entry) => entry.id);
  const [catRows, mediaRows, tagRows, authorRows] = await Promise.all([
    viewer.db
      .select({ entryId: entryCats.entryId, id: cats.id, name: cats.name })
      .from(entryCats)
      .innerJoin(cats, eq(cats.id, entryCats.catId))
      .where(inArray(entryCats.entryId, ids))
      .orderBy(entryCats.sortOrder),
    viewer.db
      .select({
        entryId: entryMedia.entryId,
        assetId: mediaAssets.id,
        width: mediaAssets.width,
        height: mediaAssets.height,
      })
      .from(entryMedia)
      .innerJoin(mediaAssets, eq(mediaAssets.id, entryMedia.mediaAssetId))
      .where(
        and(
          inArray(entryMedia.entryId, ids),
          eq(mediaAssets.status, "ready"),
          eq(mediaAssets.purpose, "entry"),
        ),
      )
      .orderBy(entryMedia.sortOrder),
    viewer.db
      .select({ entryId: entryTags.entryId, name: tags.name })
      .from(entryTags)
      .innerJoin(tags, eq(tags.id, entryTags.tagId))
      .where(inArray(entryTags.entryId, ids))
      .orderBy(tags.name),
    viewer.db
      .select({ entryId: entries.id, name: user.name })
      .from(entries)
      .innerJoin(user, eq(user.id, entries.authorUserId))
      .where(inArray(entries.id, ids)),
  ]);

  return rows.map((entry) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    occurredDate: entry.occurredAt.toISOString().slice(0, 10),
    createdAt: entry.createdAt.toISOString(),
    cats: catRows
      .filter((row) => row.entryId === entry.id)
      .map(({ id, name }) => ({ id, name })),
    tags: tagRows
      .filter((row) => row.entryId === entry.id)
      .map(({ name }) => name),
    media: mediaRows.find((row) => row.entryId === entry.id) ?? null,
    authorName:
      authorRows.find((row) => row.entryId === entry.id)?.name ?? "家族",
  }));
}

export type EntryView = Awaited<ReturnType<typeof getEntry>>;
