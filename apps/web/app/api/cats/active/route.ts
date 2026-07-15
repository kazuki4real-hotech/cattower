import { cats, userPreferences } from "@cattower/db";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq, isNull } from "drizzle-orm";

import { getViewer } from "@/lib/viewer";

async function put(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    catId?: unknown;
  } | null;
  if (!body || typeof body.catId !== "string")
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const cat = await viewer.db.query.cats.findFirst({
    where: and(
      eq(cats.id, body.catId),
      eq(cats.householdId, viewer.household.id),
      isNull(cats.archivedAt),
    ),
  });
  if (!cat) return Response.json({ error: "cat_not_found" }, { status: 404 });
  await viewer.db
    .update(userPreferences)
    .set({ activeCatId: cat.id, updatedAt: new Date() })
    .where(eq(userPreferences.userId, viewer.session.user.id));
  return Response.json({ ok: true, activeCatId: cat.id });
}

export const PUT = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/cats/active" },
  put,
);
