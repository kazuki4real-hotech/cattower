import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

type ConnectionAttachment = Readonly<{
  connectionId: string;
  userId: string;
  catId: string;
  townCardId: string;
  joinedAtBucket: number;
  blockVersion: number;
  ticketId: string;
}>;

/** Coordination boundary for one `place + cohort shard` room. */
export class TownRoom extends DurableObject<CloudflareEnv> {
  private readonly generationId = crypto.randomUUID();

  fetch(request: Request): Response {
    const url = new URL(request.url);
    if (
      request.method !== "GET" ||
      url.pathname !== "/connect" ||
      request.headers.get("upgrade")?.toLowerCase() !== "websocket"
    ) {
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

    const attachment = readAttachment(request.headers);
    if (!attachment) {
      return Response.json(
        {
          error: {
            code: "invalid_connection_scope",
            message: "Invalid connection scope",
          },
        },
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];
    this.ctx.acceptWebSocket(server, [`cat:${attachment.catId}`]);
    server.serializeAttachment(attachment);
    server.send(
      JSON.stringify({
        v: 1,
        type: "connection.ready",
        connectionId: attachment.connectionId,
        generationId: this.generationId,
      }),
    );
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): void {
    const envelope = parseEnvelope(message);
    if (envelope?.v === 1 && envelope.type === "connection.ping") {
      const attachment =
        socket.deserializeAttachment() as ConnectionAttachment | null;
      if (!attachment) {
        socket.close(1011, "connection state unavailable");
        return;
      }
      socket.send(
        JSON.stringify({
          v: 1,
          type: "connection.pong",
          connectionId: attachment.connectionId,
          generationId: this.generationId,
        }),
      );
      return;
    }

    socket.send(
      JSON.stringify({ v: 1, type: "error", code: "message_not_supported" }),
    );
  }

  webSocketClose(socket: WebSocket, code: number, reason: string): void {
    socket.close(code, reason);
  }
}

function parseEnvelope(
  message: string | ArrayBuffer,
): Record<string, unknown> | null {
  if (typeof message !== "string") return null;
  try {
    const value = JSON.parse(message) as unknown;
    return value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function readAttachment(headers: Headers): ConnectionAttachment | null {
  const userId = headers.get("x-cattower-user-id");
  const catId = headers.get("x-cattower-cat-id");
  const townCardId = headers.get("x-cattower-town-card-id");
  const blockVersion = Number(headers.get("x-cattower-block-version"));
  const ticketId = headers.get("x-cattower-ticket-id");
  if (
    !userId ||
    !catId ||
    !townCardId ||
    !ticketId ||
    !Number.isSafeInteger(blockVersion) ||
    blockVersion < 0
  ) {
    return null;
  }
  return {
    connectionId: crypto.randomUUID(),
    userId,
    catId,
    townCardId,
    joinedAtBucket: Math.floor(Date.now() / 60_000),
    blockVersion,
    ticketId,
  };
}
