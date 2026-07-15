import { cats, userPreferences } from "@cattower/db";
import { validateCatProfile } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { asc, eq } from "drizzle-orm";

import { serializeCat } from "@/lib/cats";
import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function get(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (!membership)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const list = await viewer.db.query.cats.findMany({
    where: eq(cats.householdId, viewer.household.id),
    orderBy: asc(cats.createdAt),
  });
  const preferences = await viewer.db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, viewer.session.user.id),
  });
  const available = list.filter((cat) => !cat.archivedAt);
  const active =
    available.find((cat) => cat.id === preferences?.activeCatId) ??
    available[0] ??
    null;
  if (active && preferences?.activeCatId !== active.id)
    await viewer.db
      .update(userPreferences)
      .set({ activeCatId: active.id, updatedAt: new Date() })
      .where(eq(userPreferences.userId, viewer.session.user.id));
  return Response.json(
    {
      cats: list.map(serializeCat),
      activeCatId: active?.id ?? null,
      canManage: membership.role === "owner",
    },
    { headers: { "cache-control": "no-store" } },
  );
}

async function post(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (membership?.role !== "owner")
    return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const profile = body ? validateCatProfile(body) : null;
  if (!profile) return Response.json({ error: "invalid_cat" }, { status: 400 });
  const id = crypto.randomUUID();
  const preferences = await viewer.db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, viewer.session.user.id),
  });
  await viewer.db
    .insert(cats)
    .values({ id, householdId: viewer.household.id, ...profile });
  if (!preferences?.activeCatId)
    await viewer.db
      .update(userPreferences)
      .set({ activeCatId: id, updatedAt: new Date() })
      .where(eq(userPreferences.userId, viewer.session.user.id));
  return Response.json({ ok: true, id }, { status: 201 });
}

export const GET = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/cats" },
  get,
);
export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/cats" },
  post,
);
