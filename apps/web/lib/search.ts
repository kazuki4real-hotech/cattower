import { cats, entries, tags } from "@cattower/db";
import {
  normalizeTag,
  SEARCH_RESULT_LIMIT,
  type EntrySearchInput,
} from "@cattower/domain";
import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { hydrateEntries } from "@/lib/entries";
import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function getSearchFacets(viewer: Viewer) {
  const [catRows, tagRows] = await Promise.all([
    viewer.db.query.cats.findMany({
      where: eq(cats.householdId, viewer.household.id),
      columns: { id: true, name: true },
      orderBy: [asc(cats.name), asc(cats.createdAt)],
    }),
    viewer.db.query.tags.findMany({
      where: eq(tags.householdId, viewer.household.id),
      columns: { id: true, name: true },
      orderBy: [asc(tags.name), asc(tags.createdAt)],
    }),
  ]);
  return { cats: catRows, tags: tagRows };
}

export async function searchEntries(viewer: Viewer, filters: EntrySearchInput) {
  const where = searchWhere(viewer.household.id, filters);
  const [rows, countRows] = await Promise.all([
    viewer.db.query.entries.findMany({
      where,
      orderBy: [desc(entries.occurredAt), desc(entries.createdAt)],
      limit: SEARCH_RESULT_LIMIT,
    }),
    viewer.db.select({ value: count() }).from(entries).where(where),
  ]);
  const total = countRows[0]?.value ?? 0;
  return {
    items: await hydrateEntries(viewer, rows),
    total,
    hasMore: total > rows.length,
  };
}

function searchWhere(householdId: string, filters: EntrySearchInput) {
  const conditions: (SQL | undefined)[] = [
    eq(entries.householdId, householdId),
    eq(entries.status, "ready"),
    isNull(entries.deletedAt),
  ];

  if (filters.q) {
    const pattern = `%${escapeLike(filters.q)}%`;
    const normalizedPattern = `%${escapeLike(normalizeTag(filters.q))}%`;
    conditions.push(
      or(
        sql`${entries.title} LIKE ${pattern} ESCAPE char(92)`,
        sql`${entries.body} LIKE ${pattern} ESCAPE char(92)`,
        sql`EXISTS (
          SELECT 1 FROM entry_tags search_entry_tags
          INNER JOIN tags search_tags ON search_tags.id = search_entry_tags.tag_id
          WHERE search_entry_tags.entry_id = ${entries.id}
            AND search_tags.household_id = ${householdId}
            AND search_tags.normalized_name LIKE ${normalizedPattern} ESCAPE char(92)
        )`,
      ),
    );
  }
  if (filters.from)
    conditions.push(
      gte(entries.occurredAt, new Date(`${filters.from}T00:00:00.000Z`)),
    );
  if (filters.to)
    conditions.push(
      lt(
        entries.occurredAt,
        new Date(
          new Date(`${filters.to}T00:00:00.000Z`).valueOf() + 86_400_000,
        ),
      ),
    );
  if (filters.tagId)
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM entry_tags search_filter_entry_tags
        INNER JOIN tags search_filter_tags
          ON search_filter_tags.id = search_filter_entry_tags.tag_id
        WHERE search_filter_entry_tags.entry_id = ${entries.id}
          AND search_filter_tags.id = ${filters.tagId}
          AND search_filter_tags.household_id = ${householdId}
      )`,
    );
  if (filters.catId)
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM entry_cats search_filter_entry_cats
        INNER JOIN cats search_filter_cats
          ON search_filter_cats.id = search_filter_entry_cats.cat_id
        WHERE search_filter_entry_cats.entry_id = ${entries.id}
          AND search_filter_cats.id = ${filters.catId}
          AND search_filter_cats.household_id = ${householdId}
      )`,
    );
  if (filters.media !== "all") {
    const mediaExists = sql`EXISTS (
      SELECT 1 FROM entry_media search_filter_entry_media
      INNER JOIN media_assets search_filter_media
        ON search_filter_media.id = search_filter_entry_media.media_asset_id
      WHERE search_filter_entry_media.entry_id = ${entries.id}
        AND search_filter_media.household_id = ${householdId}
        AND search_filter_media.purpose = 'entry'
        AND search_filter_media.status = 'ready'
        AND search_filter_media.deleted_at IS NULL
        ${filters.media === "none" ? sql.empty() : sql`AND search_filter_media.kind = ${filters.media}`}
    )`;
    conditions.push(
      filters.media === "none" ? sql`NOT ${mediaExists}` : mediaExists,
    );
  }
  return and(...conditions);
}

function escapeLike(value: string) {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("%", "\\%")
    .replaceAll("_", "\\_");
}

export type SearchResults = Awaited<ReturnType<typeof searchEntries>>;
export type SearchFacets = Awaited<ReturnType<typeof getSearchFacets>>;
