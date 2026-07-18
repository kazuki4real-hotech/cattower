import { shareLinks } from "@cattower/db";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq, isNull } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function del(
  request: Request,
  context: { params: Promise<{ shareId: string }> },
) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { shareId } = await context.params;
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (!membership)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const share = await viewer.db.query.shareLinks.findFirst({
    where: and(
      eq(shareLinks.id, shareId),
      eq(shareLinks.householdId, viewer.household.id),
    ),
  });
  if (
    !share ||
    (membership.role !== "owner" && share.createdBy !== viewer.session.user.id)
  )
    return Response.json({ error: "forbidden" }, { status: 403 });
  if (!share.revokedAt) {
    const now = new Date();
    await viewer.db
      .update(shareLinks)
      .set({ revokedAt: now, updatedAt: now })
      .where(and(eq(shareLinks.id, share.id), isNull(shareLinks.revokedAt)));
  }
  return Response.json(
    { ok: true },
    { headers: { "cache-control": "private, no-store" } },
  );
}

export const DELETE = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/shares/:shareId" },
  del,
);
