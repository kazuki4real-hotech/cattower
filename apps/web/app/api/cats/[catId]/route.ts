import { cats } from "@cattower/db";
import { validateCatProfile } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function owner(request: Request, catId: string) {
  const viewer = await getViewer(request.headers);
  if (!viewer)
    return {
      response: Response.json({ error: "unauthorized" }, { status: 401 }),
      viewer: null,
      cat: null,
    };
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (membership?.role !== "owner")
    return {
      response: Response.json({ error: "forbidden" }, { status: 403 }),
      viewer: null,
      cat: null,
    };
  const cat = await viewer.db.query.cats.findFirst({
    where: and(eq(cats.id, catId), eq(cats.householdId, viewer.household.id)),
  });
  if (!cat)
    return {
      response: Response.json({ error: "cat_not_found" }, { status: 404 }),
      viewer: null,
      cat: null,
    };
  return { response: null, viewer, cat };
}

async function put(
  request: Request,
  context: { params: Promise<{ catId: string }> },
) {
  const { catId } = await context.params;
  const access = await owner(request, catId);
  if (access.response) return access.response;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const profile = body ? validateCatProfile(body) : null;
  if (!profile) return Response.json({ error: "invalid_cat" }, { status: 400 });
  await access.viewer.db
    .update(cats)
    .set({
      ...profile,
      updatedAt: new Date(),
    })
    .where(eq(cats.id, catId));
  return Response.json({ ok: true });
}

export const PUT = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/cats/:catId" },
  put,
);
