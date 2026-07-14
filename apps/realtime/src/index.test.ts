import { issueTownTicket } from "@cattower/domain";
import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { handleRequest, type RealtimeEnv } from "./index";

const TEST_SECRET = "test-only-town-ticket-secret-at-least-32-bytes";
const TEST_ORIGIN = "https://web.example.test";

function testEnv(): RealtimeEnv {
  return {
    TOWN_ROOM: env.TOWN_ROOM,
    ALLOWED_WEB_ORIGINS: TEST_ORIGIN,
    TOWN_TICKET_SECRET: TEST_SECRET,
  };
}

describe("realtime Worker", () => {
  it("reports its health without exposing request data", async () => {
    const response = await handleRequest(
      new Request("https://realtime.example.test/health"),
      testEnv(),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      service: "cattower-realtime",
      status: "ok",
    });
  });

  it("returns a structured 404 for unmatched routes", async () => {
    const response = await handleRequest(
      new Request("https://realtime.example.test/missing"),
      testEnv(),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "Not found" },
    });
  });

  it("rejects non-upgrade and invalid-ticket connection attempts", async () => {
    const nonUpgrade = await handleRequest(
      new Request("https://realtime.example.test/connect"),
      testEnv(),
    );
    expect(nonUpgrade.status).toBe(426);

    const invalidTicket = await handleRequest(
      new Request("https://realtime.example.test/connect?ticket=invalid", {
        headers: { Origin: TEST_ORIGIN, Upgrade: "websocket" },
      }),
      testEnv(),
    );
    expect(invalidTicket.status).toBe(401);
  });

  it("upgrades a valid, origin-bound ticket through the town room", async () => {
    const { ticket } = await issueTownTicket(TEST_SECRET, {
      userId: "user-1",
      catId: "cat-1",
      townCardId: "cat:cat-1",
      roomId: "town:test-place:shard:0",
      blockVersion: 0,
    });
    const response = await handleRequest(
      new Request(
        `https://realtime.example.test/connect?ticket=${encodeURIComponent(ticket)}`,
        { headers: { Origin: TEST_ORIGIN, Upgrade: "websocket" } },
      ),
      testEnv(),
    );

    expect(response.status).toBe(101);
    expect(response.webSocket).not.toBeNull();
    response.webSocket?.accept();
    response.webSocket?.close(1000, "test complete");
  });

  it("does not expose the Durable Object without internal connection scope", async () => {
    const room = env.TOWN_ROOM.getByName("town:test-place:shard:0");
    const response = await room.fetch("https://room.internal/");

    expect(response.status).toBe(426);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "websocket_upgrade_required",
        message: "WebSocket upgrade required",
      },
    });
  });
});
