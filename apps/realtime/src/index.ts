import { verifyTownTicket } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";

export { TownRoom } from "./town-room";

export type RealtimeEnv = Omit<CloudflareEnv, "ALLOWED_WEB_ORIGINS"> & {
  ALLOWED_WEB_ORIGINS: string;
  TOWN_TICKET_SECRET: string;
};

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

export async function handleRequest(
  request: Request,
  env: RealtimeEnv,
): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return Response.json(
      { service: "cattower-realtime", status: "ok" },
      { headers: JSON_HEADERS },
    );
  }

  if (request.method === "GET" && url.pathname === "/connect") {
    return connect(request, url, env);
  }

  return Response.json(
    { error: { code: "not_found", message: "Not found" } },
    { status: 404, headers: JSON_HEADERS },
  );
}

async function connect(
  request: Request,
  url: URL,
  env: RealtimeEnv,
): Promise<Response> {
  if (request.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    return Response.json(
      {
        error: {
          code: "websocket_upgrade_required",
          message: "WebSocket upgrade required",
        },
      },
      { status: 426, headers: JSON_HEADERS },
    );
  }
  if (
    !isAllowedOrigin(request.headers.get("origin"), env.ALLOWED_WEB_ORIGINS)
  ) {
    return Response.json(
      { error: { code: "forbidden_origin", message: "Forbidden origin" } },
      { status: 403, headers: JSON_HEADERS },
    );
  }
  if (!env.TOWN_TICKET_SECRET) {
    return Response.json(
      {
        error: {
          code: "ticket_verification_not_configured",
          message: "Ticket verification not configured",
        },
      },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const ticket = url.searchParams.get("ticket") ?? "";
  const verified = await verifyTownTicket(env.TOWN_TICKET_SECRET, ticket);
  if (!verified.ok) {
    return Response.json(
      {
        error: {
          code: verified.error,
          message:
            verified.error === "expired_ticket"
              ? "Connection ticket expired"
              : "Invalid connection ticket",
        },
      },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const payload = verified.payload;
  const room = env.TOWN_ROOM.getByName(payload.roomId);
  return room.fetch(
    new Request("https://room.internal/connect", {
      headers: {
        Upgrade: "websocket",
        "x-cattower-user-id": payload.userId,
        "x-cattower-cat-id": payload.catId,
        "x-cattower-town-card-id": payload.townCardId,
        "x-cattower-block-version": String(payload.blockVersion),
        "x-cattower-ticket-id": payload.jti,
      },
    }),
  );
}

function isAllowedOrigin(origin: string | null, configured: string): boolean {
  if (!origin) return false;
  return configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .includes(origin);
}

const handleHealthRequest = instrumentRequestHandler(
  { service: "cattower-realtime", route: "/health" },
  handleRequest,
);
const handleConnectRequest = instrumentRequestHandler(
  { service: "cattower-realtime", route: "/connect" },
  handleRequest,
);
const handleUnmatchedRequest = instrumentRequestHandler(
  { service: "cattower-realtime", route: "unmatched" },
  handleRequest,
);

export default {
  fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health")
      return handleHealthRequest(request, env);
    if (request.method === "GET" && url.pathname === "/connect")
      return handleConnectRequest(request, env);
    return handleUnmatchedRequest(request, env);
  },
} satisfies ExportedHandler<RealtimeEnv>;
