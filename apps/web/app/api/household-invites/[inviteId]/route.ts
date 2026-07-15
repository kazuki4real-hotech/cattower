import { householdInvites } from "@cattower/db";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq, isNull } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function del(
  request: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (membership?.role !== "owner")
    return Response.json({ error: "forbidden" }, { status: 403 });
  const { inviteId } = await context.params;
  const changed = await viewer.db
    .update(householdInvites)
    .set({ revokedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(householdInvites.id, inviteId),
        eq(householdInvites.householdId, viewer.household.id),
        isNull(householdInvites.acceptedAt),
        isNull(householdInvites.revokedAt),
      ),
    )
    .returning({ id: householdInvites.id });
  if (!changed.length)
    return Response.json({ error: "invite_not_active" }, { status: 409 });
  return Response.json({ ok: true });
}

export const DELETE = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/household-invites/:inviteId" },
  del,
);
