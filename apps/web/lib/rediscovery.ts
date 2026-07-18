import { entries, entryCats, userPreferences } from "@cattower/db";
import {
  getAnniversaryDateWindow,
  type RediscoveryDateWindow,
} from "@cattower/domain";
import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { hydrateEntries } from "@/lib/entries";
import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function getAnniversaryMemories(
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
  const rows = await Promise.all(
    windows.map((window) => findAnniversaryEntry(viewer, window, catId)),
  );
  const hydrated = await hydrateEntries(
    viewer,
    rows.filter((row): row is NonNullable<typeof row> => Boolean(row)),
  );
  const byId = new Map(hydrated.map((entry) => [entry.id, entry]));

  return {
    lastYear: rows[0] ? (byId.get(rows[0].id) ?? null) : null,
    threeYearsAgo: rows[1] ? (byId.get(rows[1].id) ?? null) : null,
  };
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
