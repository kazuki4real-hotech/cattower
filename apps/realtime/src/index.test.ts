import { env } from "cloudflare:test";
import { describe, expect, it } from "vitest";

import { handleRequest } from "./index";

describe("realtime Worker", () => {
  it("reports its health without exposing request data", async () => {
    const response = handleRequest(
      new Request("https://realtime.example.test/health"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      service: "cattower-realtime",
      status: "ok",
    });
  });

  it("returns a structured 404 for routes not yet implemented", async () => {
    const response = handleRequest(
      new Request("https://realtime.example.test/connect"),
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "Not found" },
    });
  });

  it("binds each deterministic town room to the TownRoom Durable Object", async () => {
    const room = env.TOWN_ROOM.getByName("town:test-place:shard:0");
    const response = await room.fetch("https://room.internal/");

    expect(response.status).toBe(501);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "room_not_configured",
        message: "Town room is not configured",
      },
    });
  });
});
