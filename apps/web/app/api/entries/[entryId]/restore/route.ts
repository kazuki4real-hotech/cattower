import { entries } from "@cattower/db";
import { canPerformEntryAction } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function post(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { entryId } = await params;
  const entry = await viewer.db.query.entries.findFirst({
    where: and(
      eq(entries.id, entryId),
      eq(entries.householdId, viewer.household.id),
    ),
  });
  if (!entry) return Response.json({ error: "not_found" }, { status: 404 });
  if (entry.status !== "ready")
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (
    !membership ||
    !canPerformEntryAction({
      action: "restore",
      membership,
      actorUserId: viewer.session.user.id,
      authorUserId: entry.authorUserId,
    })
  )
    return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as {
    version?: unknown;
  } | null;
  if (!Number.isInteger(body?.version) || body?.version !== entry.version)
    return Response.json({ error: "version_conflict" }, { status: 409 });
  if (!entry.deletedAt)
    return Response.json({ error: "not_deleted" }, { status: 409 });

  const nextVersion = entry.version + 1;
  await viewer.db
    .update(entries)
    .set({ deletedAt: null, version: nextVersion, updatedAt: new Date() })
    .where(and(eq(entries.id, entryId), eq(entries.version, entry.version)));
  return Response.json({ ok: true, entryId, version: nextVersion });
}

export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/entries/:entryId/restore" },
  post,
);
