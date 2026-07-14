import { describe, expect, it, vi } from "vitest";

import { instrumentRequestHandler, type RequestLogEntry } from "./index";

function createSink() {
  return {
    log: vi.fn<(entry: RequestLogEntry) => void>(),
    warn: vi.fn<(entry: RequestLogEntry) => void>(),
    error: vi.fn<(entry: RequestLogEntry) => void>(),
  };
}

describe("instrumentRequestHandler", () => {
  it("logs only allowlisted request metadata", async () => {
    const sink = createSink();
    const clock = vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(124.6);
    const handler = instrumentRequestHandler(
      { service: "cattower-web", route: "/api/auth/*" },
      () => Response.json({ error: "unauthorized" }, { status: 401 }),
      { sink, clock, createRequestId: () => "fallback-id" },
    );

    const response = await handler(
      new Request("https://example.test/api/auth/callback?code=oauth-secret", {
        headers: {
          authorization: "Bearer private-token",
          cookie: "session=private-cookie",
          "cf-ray": "safe-ray-KIX",
        },
      }),
    );

    expect(response.status).toBe(401);
    expect(sink.warn).toHaveBeenCalledWith({
      event: "request.completed",
      requestId: "safe-ray-KIX",
      service: "cattower-web",
      route: "/api/auth/*",
      status: 401,
      durationMs: 25,
    });
    expect(JSON.stringify(sink.warn.mock.calls)).not.toMatch(
      /oauth-secret|private-token|private-cookie|callback/,
    );
  });

  it("returns a safe error without logging an exception message", async () => {
    const sink = createSink();
    const handler = instrumentRequestHandler(
      { service: "cattower-realtime", route: "unmatched" },
      () => {
        throw new Error("sensitive user content");
      },
      {
        sink,
        clock: vi.fn().mockReturnValueOnce(50).mockReturnValueOnce(52),
        createRequestId: () => "generated-id",
      },
    );

    const response = await handler(
      new Request("https://example.test/private-value", {
        headers: { "cf-ray": "invalid value" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "internal_error" });
    expect(sink.error).toHaveBeenCalledWith({
      event: "request.failed",
      requestId: "generated-id",
      service: "cattower-realtime",
      route: "unmatched",
      status: 500,
      durationMs: 2,
      errorCode: "unhandled_exception",
    });
    expect(JSON.stringify(sink.error.mock.calls)).not.toContain(
      "sensitive user content",
    );
  });
});
