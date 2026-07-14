import { instrumentRequestHandler } from "@cattower/observability";

import { getAuth } from "@/lib/auth";

async function handler(request: Request) {
  return getAuth().handler(request);
}

const observedHandler = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/auth/*" },
  handler,
);

export { observedHandler as GET, observedHandler as POST };
