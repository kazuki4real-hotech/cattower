import { instrumentRequestHandler } from "@cattower/observability";

import {
  cleanupExpiredNotifications,
  getVisibleNotifications,
  markNotificationsRead,
  notificationPayload,
} from "@/lib/notifications";
import { getViewer } from "@/lib/viewer";

async function get(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  await cleanupExpiredNotifications(viewer.db);
  const visible = await getVisibleNotifications(
    viewer.db,
    viewer.session.user.id,
  );
  const unreadCount = visible.filter((item) => !item.readAt).length;
  if (new URL(request.url).searchParams.get("summary") === "1")
    return Response.json(
      { unreadCount },
      { headers: { "cache-control": "no-store" } },
    );
  return Response.json(
    {
      unreadCount,
      notifications: visible.slice(0, 50).map((item) => ({
        id: item.id,
        type: item.type,
        ...notificationPayload(item.payloadJson),
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        createdAt: item.createdAt.toISOString(),
        readAt: item.readAt?.toISOString() ?? null,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

async function patch(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as {
    all?: unknown;
    ids?: unknown;
  } | null;
  const ids = Array.isArray(body?.ids)
    ? body.ids.filter((id): id is string => typeof id === "string")
    : [];
  if (
    !body ||
    (body.all !== true && (!ids.length || ids.length > 50)) ||
    (body.all === true && body.ids !== undefined) ||
    ids.some((id) => id.length > 100)
  )
    return Response.json({ error: "invalid_request" }, { status: 400 });
  await cleanupExpiredNotifications(viewer.db);
  const changed = await markNotificationsRead(
    viewer.db,
    viewer.session.user.id,
    body.all === true ? { all: true } : { ids },
  );
  return Response.json({ ok: true, changed });
}

export const GET = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/notifications" },
  get,
);
export const PATCH = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/notifications" },
  patch,
);
