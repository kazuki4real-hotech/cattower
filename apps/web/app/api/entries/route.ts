import { entries } from "@cattower/db";
import {
  canPerformEntryAction,
  validateEntryDraftInput,
  validateEntryInput,
} from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, desc, eq, isNull } from "drizzle-orm";

import {
  entryRelationStatements,
  guardedEntryRelationStatements,
  resolveEntryTagIds,
  validateEntryRelations,
} from "@/lib/entry-mutations";
import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function post(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (
    !membership ||
    !canPerformEntryAction({
      action: "create",
      membership,
      actorUserId: viewer.session.user.id,
    })
  )
    return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const mode = body?.mode === "draft" ? "draft" : "ready";
  const input = body
    ? mode === "draft"
      ? validateEntryDraftInput(body)
      : validateEntryInput(body)
    : null;
  if (!input) return Response.json({ error: "invalid_entry" }, { status: 400 });
  if (!(await validateEntryRelations(viewer, input)))
    return Response.json({ error: "invalid_relations" }, { status: 400 });

  if (mode === "draft") {
    const existing = await viewer.db.query.entries.findFirst({
      where: and(
        eq(entries.householdId, viewer.household.id),
        eq(entries.authorUserId, viewer.session.user.id),
        eq(entries.status, "draft"),
        isNull(entries.deletedAt),
      ),
      orderBy: desc(entries.updatedAt),
    });
    if (existing)
      return persistExistingDraft(viewer, existing.id, existing.version, input);
  }

  const tagRows = await resolveEntryTagIds(viewer, input);
  const entryId = crypto.randomUUID();
  const now = Date.now();
  await viewer.env.DB.batch([
    viewer.env.DB.prepare(
      "INSERT INTO entries (id, household_id, primary_cat_id, author_user_id, title, body, occurred_at, occurred_precision, status, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'day', ?, 1, ?, ?)",
    ).bind(
      entryId,
      viewer.household.id,
      input.catIds[0],
      viewer.session.user.id,
      input.title,
      input.body,
      input.occurredAt.valueOf(),
      mode,
      now,
      now,
    ),
    ...entryRelationStatements(viewer, entryId, input, tagRows, false),
  ]);

  return Response.json({ ok: true, entryId, version: 1 }, { status: 201 });
}

async function persistExistingDraft(
  viewer: NonNullable<Awaited<ReturnType<typeof getViewer>>>,
  entryId: string,
  version: number,
  input: NonNullable<ReturnType<typeof validateEntryDraftInput>>,
) {
  const tagRows = await resolveEntryTagIds(viewer, input);
  const nextVersion = version + 1;
  const updatedAt = Date.now();
  const results = await viewer.env.DB.batch([
    viewer.env.DB.prepare(
      "UPDATE entries SET primary_cat_id = ?, title = ?, body = ?, occurred_at = ?, version = ?, updated_at = ? WHERE id = ? AND version = ?",
    ).bind(
      input.catIds[0],
      input.title,
      input.body,
      input.occurredAt.valueOf(),
      nextVersion,
      updatedAt,
      entryId,
      version,
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

export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/entries" },
  post,
);
