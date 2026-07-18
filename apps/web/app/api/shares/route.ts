import { shareLinks } from "@cattower/db";
import {
  createShareToken,
  hashShareToken,
  parseShareExpiryDays,
  SHARE_CREATION_HOURLY_LIMIT,
} from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, count, eq, gte } from "drizzle-orm";

import {
  getManageableShareResource,
  listResourceShares,
  type ShareResourceType,
} from "@/lib/shares";
import { getViewer } from "@/lib/viewer";

async function get(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const input = parseResource(new URL(request.url).searchParams);
  if (!input)
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const shares = await listResourceShares(
    viewer,
    input.resourceType,
    input.resourceId,
  );
  if (!shares) return Response.json({ error: "forbidden" }, { status: 403 });
  return Response.json(
    { shares },
    { headers: { "cache-control": "private, no-store" } },
  );
}

async function post(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    resourceType?: unknown;
    resourceId?: unknown;
    expiresInDays?: unknown;
  } | null;
  const resource = parseResource(body);
  const expiresInDays = parseShareExpiryDays(body?.expiresInDays);
  if (!resource || !expiresInDays)
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const access = await getManageableShareResource(
    viewer,
    resource.resourceType,
    resource.resourceId,
  );
  if (!access) return Response.json({ error: "forbidden" }, { status: 403 });

  const since = new Date(Date.now() - 60 * 60 * 1000);
  const [rate] = await viewer.db
    .select({ total: count() })
    .from(shareLinks)
    .where(
      and(
        eq(shareLinks.createdBy, viewer.session.user.id),
        gte(shareLinks.createdAt, since),
      ),
    );
  if ((rate?.total ?? 0) >= SHARE_CREATION_HOURLY_LIMIT)
    return Response.json(
      { error: "rate_limited", retryAfterSeconds: 3600 },
      { status: 429, headers: { "retry-after": "3600" } },
    );

  const token = createShareToken();
  const tokenHash = await hashShareToken(token);
  if (!tokenHash)
    return Response.json({ error: "token_failed" }, { status: 500 });
  const now = new Date();
  const expiresAt = new Date(
    now.valueOf() + expiresInDays * 24 * 60 * 60 * 1000,
  );
  const id = crypto.randomUUID();
  await viewer.db.insert(shareLinks).values({
    id,
    householdId: access.householdId,
    createdBy: viewer.session.user.id,
    resourceType: resource.resourceType,
    resourceId: resource.resourceId,
    tokenHash,
    expiresAt,
    createdAt: now,
    updatedAt: now,
  });
  return Response.json(
    {
      share: {
        id,
        shareUrl: `${new URL(request.url).origin}/share/${token}`,
        createdAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        revokedAt: null,
        state: "active",
      },
    },
    {
      status: 201,
      headers: { "cache-control": "private, no-store" },
    },
  );
}

function parseResource(input: unknown): {
  resourceType: ShareResourceType;
  resourceId: string;
} | null {
  const resourceType =
    input instanceof URLSearchParams
      ? input.get("resourceType")
      : (input as { resourceType?: unknown } | null)?.resourceType;
  const resourceId =
    input instanceof URLSearchParams
      ? input.get("resourceId")
      : (input as { resourceId?: unknown } | null)?.resourceId;
  if (
    (resourceType !== "entry" && resourceType !== "board") ||
    typeof resourceId !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(resourceId)
  )
    return null;
  return { resourceType, resourceId };
}

export const GET = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/shares" },
  get,
);
export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/shares" },
  post,
);
