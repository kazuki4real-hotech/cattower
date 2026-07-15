import { cats, userPreferences } from "@cattower/db";
import { asc, eq } from "drizzle-orm";
import { connection } from "next/server";
import { cache } from "react";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export function serializeCat(cat: {
  id: string;
  name: string;
  nickname: string | null;
  birthDate: Date | null;
  birthPrecision: "day" | "month" | "year" | "unknown";
  adoptionDate: Date | null;
  profileAssetId: string | null;
  lifeStatus: "living" | "memorial";
}) {
  return {
    ...cat,
    birthDate: cat.birthDate?.toISOString().slice(0, 10) ?? null,
    adoptionDate: cat.adoptionDate?.toISOString().slice(0, 10) ?? null,
  };
}

export type CatOverview = Awaited<ReturnType<typeof getCatOverview>>;

export async function getCatOverview(viewer: Viewer) {
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (!membership) return null;

  const [list, preferences] = await Promise.all([
    viewer.db.query.cats.findMany({
      where: eq(cats.householdId, viewer.household.id),
      orderBy: asc(cats.createdAt),
    }),
    viewer.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, viewer.session.user.id),
    }),
  ]);
  const active =
    list.find((cat) => cat.id === preferences?.activeCatId) ?? list[0] ?? null;

  if (active && preferences?.activeCatId !== active.id)
    await viewer.db
      .update(userPreferences)
      .set({ activeCatId: active.id, updatedAt: new Date() })
      .where(eq(userPreferences.userId, viewer.session.user.id));

  return {
    cats: list.map(serializeCat),
    activeCatId: active?.id ?? null,
    canManage: membership.role === "owner",
  };
}

export const getCurrentCatOverview = cache(async () => {
  await connection();
  const viewer = await getViewer();
  return viewer ? getCatOverview(viewer) : null;
});
