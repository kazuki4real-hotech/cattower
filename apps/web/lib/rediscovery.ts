import { entries, entryCats, userPreferences } from "@cattower/db";
import { getLastYearDateWindow } from "@cattower/domain";
import { and, asc, desc, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { hydrateEntries } from "@/lib/entries";
import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function getLastYearMemory(
  viewer: Viewer,
  catId?: string | null,
  now = new Date(),
) {
  const preferences = await viewer.db.query.userPreferences.findFirst({
    columns: { timezone: true },
    where: eq(userPreferences.userId, viewer.session.user.id),
  });
  const window = getLastYearDateWindow(now, preferences?.timezone);
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

  const rows = catId
    ? await viewer.db
        .select({ entry: entries })
        .from(entries)
        .innerJoin(entryCats, eq(entryCats.entryId, entries.id))
        .where(and(scope, eq(entryCats.catId, catId)))
        .orderBy(
          asc(sql`abs(${entries.occurredAt} - ${anchorEpoch})`),
          desc(entries.occurredAt),
          desc(entries.createdAt),
        )
        .limit(1)
    : await viewer.db
        .select({ entry: entries })
        .from(entries)
        .where(scope)
        .orderBy(
          asc(sql`abs(${entries.occurredAt} - ${anchorEpoch})`),
          desc(entries.occurredAt),
          desc(entries.createdAt),
        )
        .limit(1);
  const row = rows[0]?.entry;
  return row ? ((await hydrateEntries(viewer, [row]))[0] ?? null) : null;
}

function atUtcMidnight(date: string) {
  return new Date(`${date}T00:00:00.000Z`);
}
