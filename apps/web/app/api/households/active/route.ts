import { householdMembers, households, userPreferences } from "@cattower/db";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, asc, eq } from "drizzle-orm";

import { getViewer } from "@/lib/viewer";

async function get(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const memberships = await viewer.db
    .select({
      id: households.id,
      name: households.name,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(
      and(
        eq(householdMembers.userId, viewer.session.user.id),
        eq(householdMembers.status, "active"),
      ),
    )
    .orderBy(asc(households.createdAt));
  return Response.json(
    { activeHouseholdId: viewer.household.id, households: memberships },
    { headers: { "cache-control": "no-store" } },
  );
}

async function put(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    householdId?: unknown;
  } | null;
  if (!body || typeof body.householdId !== "string")
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const membership = await viewer.db.query.householdMembers.findFirst({
    where: and(
      eq(householdMembers.userId, viewer.session.user.id),
      eq(householdMembers.householdId, body.householdId),
      eq(householdMembers.status, "active"),
    ),
  });
  if (!membership)
    return Response.json({ error: "forbidden" }, { status: 403 });
  await viewer.db
    .update(userPreferences)
    .set({ activeHouseholdId: body.householdId, updatedAt: new Date() })
    .where(eq(userPreferences.userId, viewer.session.user.id));
  return Response.json({ ok: true, activeHouseholdId: body.householdId });
}

export const GET = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/households/active" },
  get,
);
export const PUT = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/households/active" },
  put,
);
