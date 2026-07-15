import { householdInvites, householdMembers, user } from "@cattower/db";
import {
  createInviteToken,
  hashInviteToken,
  HOUSEHOLD_INVITE_HOURLY_LIMIT,
  HOUSEHOLD_INVITE_TTL_MS,
} from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, count, desc, eq, gte } from "drizzle-orm";

import { inviteState } from "@/lib/invites";
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
  const members = await viewer.db
    .select({
      userId: user.id,
      name: user.name,
      role: householdMembers.role,
      status: householdMembers.status,
    })
    .from(householdMembers)
    .innerJoin(user, eq(user.id, householdMembers.userId))
    .where(eq(householdMembers.householdId, viewer.household.id));
  const invites =
    membership.role === "owner"
      ? await viewer.db.query.householdInvites.findMany({
          where: eq(householdInvites.householdId, viewer.household.id),
          orderBy: desc(householdInvites.createdAt),
          limit: 20,
        })
      : [];
  return Response.json(
    {
      canInvite: membership.role === "owner",
      members,
      invites: invites.map((invite) => ({
        id: invite.id,
        state: inviteState(invite),
        expiresAt: invite.expiresAt.toISOString(),
        createdAt: invite.createdAt.toISOString(),
      })),
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
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [rate] = await viewer.db
    .select({ total: count() })
    .from(householdInvites)
    .where(
      and(
        eq(householdInvites.createdBy, viewer.session.user.id),
        gte(householdInvites.createdAt, since),
      ),
    );
  if ((rate?.total ?? 0) >= HOUSEHOLD_INVITE_HOURLY_LIMIT)
    return Response.json(
      { error: "rate_limited", retryAfterSeconds: 3600 },
      { status: 429, headers: { "retry-after": "3600" } },
    );
  const token = createInviteToken();
  const tokenHash = await hashInviteToken(token);
  if (!tokenHash)
    return Response.json({ error: "token_failed" }, { status: 500 });
  const id = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + HOUSEHOLD_INVITE_TTL_MS);
  await viewer.db.insert(householdInvites).values({
    id,
    householdId: viewer.household.id,
    tokenHash,
    createdBy: viewer.session.user.id,
    role: "editor",
    expiresAt,
  });
  return Response.json(
    {
      id,
      inviteUrl: `${new URL(request.url).origin}/invite/${token}`,
      expiresAt: expiresAt.toISOString(),
    },
    { status: 201, headers: { "cache-control": "no-store" } },
  );
}

export const GET = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/household-invites" },
  get,
);
export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/household-invites" },
  post,
);
