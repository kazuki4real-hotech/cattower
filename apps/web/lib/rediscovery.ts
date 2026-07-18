import { entries, entryCats, userPreferences } from "@cattower/db";
import {
  getAnniversaryDateWindow,
  getDailyRediscoverySelection,
  type RediscoveryDateWindow,
} from "@cattower/domain";
import { and, asc, count, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { hydrateEntries } from "@/lib/entries";
import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function getRediscoveryMemories(
  viewer: Viewer,
  catId?: string | null,
  now = new Date(),
) {
  const preferences = await viewer.db.query.userPreferences.findFirst({
    columns: { timezone: true },
    where: eq(userPreferences.userId, viewer.session.user.id),
  });
  const windows = [
    getAnniversaryDateWindow(now, 1, preferences?.timezone),
    getAnniversaryDateWindow(now, 3, preferences?.timezone),
  ] as const;
  const [anniversaryRows, dailyRow] = await Promise.all([
    Promise.all(
      windows.map((window) => findAnniversaryEntry(viewer, window, catId)),
    ),
    findDailyEntry(viewer, now, preferences?.timezone, catId),
  ]);
  const rows = [...anniversaryRows, dailyRow];
  const hydrated = await hydrateEntries(
    viewer,
    rows.filter((row): row is NonNullable<typeof row> => Boolean(row)),
  );
  const byId = new Map(hydrated.map((entry) => [entry.id, entry]));

  return {
    lastYear: rows[0] ? (byId.get(rows[0].id) ?? null) : null,
    threeYearsAgo: rows[1] ? (byId.get(rows[1].id) ?? null) : null,
    daily: rows[2] ? (byId.get(rows[2].id) ?? null) : null,
  };
}

async function findDailyEntry(
  viewer: Viewer,
  now: Date,
  timeZone: string | undefined,
  catId?: string | null,
) {
  const scope = and(
    eq(entries.householdId, viewer.household.id),
    eq(entries.status, "ready"),
    isNull(entries.deletedAt),
  );
  const countRows = catId
    ? await viewer.db
        .select({ total: count() })
        .from(entries)
        .innerJoin(entryCats, eq(entryCats.entryId, entries.id))
        .where(and(scope, eq(entryCats.catId, catId)))
    : await viewer.db.select({ total: count() }).from(entries).where(scope);
  const total = countRows[0]?.total ?? 0;
  if (total === 0) return null;
  const selection = getDailyRediscoverySelection(
    now,
    total,
    `${viewer.household.id}:${catId ?? "all"}`,
    timeZone,
  );
  const order = [
    desc(entries.occurredAt),
    desc(entries.createdAt),
    asc(entries.id),
  ] as const;
  const rows = catId
    ? await viewer.db
        .select({ entry: entries })
        .from(entries)
        .innerJoin(entryCats, eq(entryCats.entryId, entries.id))
        .where(and(scope, eq(entryCats.catId, catId)))
        .orderBy(...order)
        .limit(1)
        .offset(selection.index)
    : await viewer.db
        .select({ entry: entries })
        .from(entries)
        .where(scope)
        .orderBy(...order)
        .limit(1)
        .offset(selection.index);
  return rows[0]?.entry ?? null;
}

async function findAnniversaryEntry(
  viewer: Viewer,
  window: RediscoveryDateWindow,
  catId?: string | null,
) {
  const start = atUtcMidnight(window.startDate);
  const end = atUtcMidnight(window.endDate);
  const anchorEpoch = atUtcMidnight(window.anchorDate).getTime();
  const scope = and(
    eq(entries.householdId, viewer.household.id),
    eq(entries.status, "ready"),
    isNull(entries.deletedAt),
    gte(entries.occurredAt, start),
    lt(entries.occurredAt, end),
  );
  const order = [
    asc(sql`abs(${entries.occurredAt} - ${anchorEpoch})`),
    desc(entries.occurredAt),
    desc(entries.createdAt),
  ] as const;
  const rows = catId
    ? await viewer.db
        .select({ entry: entries })
        .from(entries)
        .innerJoin(entryCats, eq(entryCats.entryId, entries.id))
        .where(and(scope, eq(entryCats.catId, catId)))
        .orderBy(...order)
        .limit(1)
    : await viewer.db
        .select({ entry: entries })
        .from(entries)
        .where(scope)
        .orderBy(...order)
        .limit(1);
  return rows[0]?.entry ?? null;
}

function atUtcMidnight(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
