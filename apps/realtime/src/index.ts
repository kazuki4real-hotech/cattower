import { instrumentRequestHandler } from "@cattower/observability";

export { TownRoom } from "./town-room";

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
} as const;

export function handleRequest(request: Request): Response {
  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/health") {
    return Response.json(
      { service: "cattower-realtime", status: "ok" },
      { headers: JSON_HEADERS },
    );
  }

  return Response.json(
    { error: { code: "not_found", message: "Not found" } },
    { status: 404, headers: JSON_HEADERS },
  );
}

const handleHealthRequest = instrumentRequestHandler(
  { service: "cattower-realtime", route: "/health" },
  handleRequest,
);
const handleUnmatchedRequest = instrumentRequestHandler(
  { service: "cattower-realtime", route: "unmatched" },
  handleRequest,
);

export default {
  fetch(request) {
    const url = new URL(request.url);
    return request.method === "GET" && url.pathname === "/health"
      ? handleHealthRequest(request)
      : handleUnmatchedRequest(request);
  },
} satisfies ExportedHandler<CloudflareEnv>;
