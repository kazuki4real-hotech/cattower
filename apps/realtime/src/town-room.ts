import { DurableObject } from "cloudflare:workers";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

/**
 * Coordination boundary for one `place + cohort shard` room.
 *
 * The namespace binding and SQLite migration are configured. Ticket validation
 * and the hibernatable WebSocket lifecycle are introduced by P1-19 and P1-20.
 */
export class TownRoom extends DurableObject<CloudflareEnv> {
  fetch(): Response {
    return Response.json(
      {
        error: {
          code: "room_not_configured",
          message: "Town room is not configured",
        },
      },
      { status: 501, headers: JSON_HEADERS },
    );
  }
}
