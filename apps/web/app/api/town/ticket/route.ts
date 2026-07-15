import { cats } from "@cattower/db";
import { issueTownTicket, TOWN_TICKET_TTL_SECONDS } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

const ROOM_ID = "town:courtyard:shard:0";

async function post(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer)
    return Response.json(
      { error: "unauthorized" },
      { status: 401, headers: { "cache-control": "no-store" } },
    );
  if (!isAllowedOrigin(request, viewer.env.BETTER_AUTH_URL))
    return Response.json(
      { error: "forbidden_origin" },
      { status: 403, headers: { "cache-control": "no-store" } },
    );

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.catId !== "string")
    return Response.json(
      { error: "invalid_request" },
      { status: 400, headers: { "cache-control": "no-store" } },
    );

  const cat = await viewer.db.query.cats.findFirst({
    where: and(
      eq(cats.id, body.catId),
      eq(cats.householdId, viewer.household.id),
    ),
  });
  if (!cat)
    return Response.json(
      { error: "cat_not_found" },
      { status: 404, headers: { "cache-control": "no-store" } },
    );

  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    cat.householdId,
  );
  if (!membership)
    return Response.json(
      { error: "forbidden" },
      { status: 403, headers: { "cache-control": "no-store" } },
    );
  if (!viewer.env.TOWN_TICKET_SECRET)
    return Response.json(
      { error: "town_ticket_not_configured" },
      { status: 503, headers: { "cache-control": "no-store" } },
    );

  const { ticket, payload } = await issueTownTicket(
    viewer.env.TOWN_TICKET_SECRET,
    {
      userId: viewer.session.user.id,
      catId: cat.id,
      townCardId: `cat:${cat.id}`,
      roomId: ROOM_ID,
      blockVersion: 0,
    },
  );

  return Response.json(
    {
      ticket,
      connectUrl: viewer.env.REALTIME_WEBSOCKET_URL,
      expiresAt: new Date(payload.exp * 1000).toISOString(),
      expiresIn: TOWN_TICKET_TTL_SECONDS,
    },
    { headers: { "cache-control": "no-store" } },
  );
}

function isAllowedOrigin(request: Request, applicationUrl: string): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return origin === new URL(applicationUrl).origin;
  } catch {
    return false;
  }
}

export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/town/ticket" },
  post,
);
