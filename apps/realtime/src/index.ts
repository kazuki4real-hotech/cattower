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

export default {
  fetch(request) {
    return handleRequest(request);
  },
} satisfies ExportedHandler<CloudflareEnv>;
