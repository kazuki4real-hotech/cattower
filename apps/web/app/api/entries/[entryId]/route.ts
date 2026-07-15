import { entries, entryMedia } from "@cattower/db";
import {
  canPerformEntryAction,
  validateEntryDraftInput,
  validateEntryInput,
} from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq } from "drizzle-orm";

import {
  guardedEntryRelationStatements,
  resolveEntryTagIds,
  validateEntryRelations,
} from "@/lib/entry-mutations";
import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

type RouteContext = { params: Promise<{ entryId: string }> };

async function put(request: Request, context: RouteContext) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { entryId } = await context.params;
  const entry = await viewer.db.query.entries.findFirst({
    where: and(
      eq(entries.id, entryId),
      eq(entries.householdId, viewer.household.id),
    ),
  });
  if (!entry) return Response.json({ error: "not_found" }, { status: 404 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (
    !membership ||
    !canPerformEntryAction({
      action: "edit",
      membership,
      actorUserId: viewer.session.user.id,
      authorUserId: entry.authorUserId,
    })
  )
    return Response.json({ error: "forbidden" }, { status: 403 });
  if (entry.deletedAt)
    return Response.json({ error: "entry_deleted" }, { status: 409 });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const expectedVersion = body?.version;
  if (!Number.isInteger(expectedVersion) || expectedVersion !== entry.version)
    return Response.json({ error: "version_conflict" }, { status: 409 });
  const mode = body?.mode === "draft" ? "draft" : "ready";
  if (mode === "draft" && entry.status !== "draft")
    return Response.json({ error: "invalid_transition" }, { status: 409 });
  const input = body
    ? mode === "draft"
      ? validateEntryDraftInput(body)
      : validateEntryInput(body)
    : null;
  if (!input) return Response.json({ error: "invalid_entry" }, { status: 400 });

  const existingMedia = await viewer.db
    .select({ id: entryMedia.mediaAssetId })
    .from(entryMedia)
    .where(eq(entryMedia.entryId, entryId));
  if (
    !(await validateEntryRelations(
      viewer,
      input,
      existingMedia.map((asset) => asset.id),
    ))
  )
    return Response.json({ error: "invalid_relations" }, { status: 400 });

  const tagRows = await resolveEntryTagIds(viewer, input);
  const nextVersion = entry.version + 1;
  const updatedAt = Date.now();
  const results = await viewer.env.DB.batch([
    viewer.env.DB.prepare(
      "UPDATE entries SET primary_cat_id = ?, title = ?, body = ?, occurred_at = ?, status = ?, version = ?, updated_at = ? WHERE id = ? AND version = ? AND deleted_at IS NULL",
    ).bind(
      input.catIds[0],
      input.title,
      input.body,
      input.occurredAt.valueOf(),
      mode,
      nextVersion,
      updatedAt,
      entryId,
      entry.version,
    ),
    ...guardedEntryRelationStatements(
      viewer,
      entryId,
      input,
      tagRows,
      nextVersion,
      updatedAt,
    ),
  ]);
  if (results[0]?.meta.changes !== 1)
    return Response.json({ error: "version_conflict" }, { status: 409 });
  return Response.json({ ok: true, entryId, version: nextVersion });
}

async function remove(request: Request, context: RouteContext) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { entryId } = await context.params;
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
      action: "soft_delete",
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
  if (entry.deletedAt)
    return Response.json({ error: "already_deleted" }, { status: 409 });

  const nextVersion = entry.version + 1;
  await viewer.db
    .update(entries)
    .set({ deletedAt: new Date(), version: nextVersion, updatedAt: new Date() })
    .where(and(eq(entries.id, entryId), eq(entries.version, entry.version)));
  return Response.json({ ok: true, entryId, version: nextVersion });
}

export const PUT = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/entries/:entryId" },
  put,
);
export const DELETE = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/entries/:entryId" },
  remove,
);
