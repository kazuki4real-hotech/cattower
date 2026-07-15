import {
  householdInvites,
  householdMembers,
  userPreferences,
} from "@cattower/db";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq, gt, isNull } from "drizzle-orm";

import { getInvite } from "@/lib/invites";
import { getViewer } from "@/lib/viewer";

async function post(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    token?: unknown;
  } | null;
  if (!body || typeof body.token !== "string")
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const found = await getInvite(viewer.db, body.token);
  if (!found)
    return Response.json({ error: "invite_not_found" }, { status: 404 });
  const existing = await viewer.db.query.householdMembers.findFirst({
    where: and(
      eq(householdMembers.householdId, found.invite.householdId),
      eq(householdMembers.userId, viewer.session.user.id),
      eq(householdMembers.status, "active"),
    ),
  });
  if (existing)
    return Response.json({ error: "already_member" }, { status: 409 });
  const now = new Date();
  const accepted = await viewer.db
    .update(householdInvites)
    .set({
      acceptedAt: now,
      acceptedBy: viewer.session.user.id,
      updatedAt: now,
    })
    .where(
      and(
        eq(householdInvites.id, found.invite.id),
        isNull(householdInvites.acceptedAt),
        isNull(householdInvites.revokedAt),
        gt(householdInvites.expiresAt, now),
      ),
    )
    .returning({ id: householdInvites.id });
  if (!accepted.length)
    return Response.json({ error: "invite_unavailable" }, { status: 410 });
  await viewer.db
    .insert(householdMembers)
    .values({
      householdId: found.invite.householdId,
      userId: viewer.session.user.id,
      role: "editor",
      status: "active",
      invitedBy: found.invite.createdBy,
      joinedAt: now,
    })
    .onConflictDoUpdate({
      target: [householdMembers.householdId, householdMembers.userId],
      set: {
        role: "editor",
        status: "active",
        invitedBy: found.invite.createdBy,
        joinedAt: now,
        updatedAt: now,
      },
    });
  await viewer.db
    .update(userPreferences)
    .set({
      activeHouseholdId: found.invite.householdId,
      activeCatId: null,
      updatedAt: now,
    })
    .where(eq(userPreferences.userId, viewer.session.user.id));
  return Response.json({ ok: true, destination: "/home" });
}

export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/invites/accept" },
  post,
);
