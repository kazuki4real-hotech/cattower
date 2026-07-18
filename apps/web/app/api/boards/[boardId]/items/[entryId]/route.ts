import { boardItems } from "@cattower/db";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq } from "drizzle-orm";

import { getBoardAccess } from "@/lib/boards";
import { getViewer } from "@/lib/viewer";

type RouteContext = {
  params: Promise<{ boardId: string; entryId: string }>;
};

async function remove(request: Request, context: RouteContext) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { boardId, entryId } = await context.params;
  const access = await getBoardAccess(viewer, boardId);
  if (!access) return Response.json({ error: "not_found" }, { status: 404 });
  if (!access.canManage)
    return Response.json({ error: "forbidden" }, { status: 403 });
  const body = (await request.json().catch(() => null)) as {
    version?: unknown;
  } | null;
  if (
    !Number.isInteger(body?.version) ||
    body?.version !== access.board.version
  )
    return Response.json({ error: "version_conflict" }, { status: 409 });
  const item = await viewer.db.query.boardItems.findFirst({
    where: and(
      eq(boardItems.boardId, boardId),
      eq(boardItems.entryId, entryId),
    ),
  });
  if (!item)
    return Response.json({ error: "board_item_not_found" }, { status: 404 });

  const nextVersion = access.board.version + 1;
  const now = Date.now();
  const results = await viewer.env.DB.batch([
    viewer.env.DB.prepare(
      "DELETE FROM board_items WHERE board_id = ? AND entry_id = ? AND EXISTS (SELECT 1 FROM boards WHERE id = ? AND household_id = ? AND version = ?)",
    ).bind(
      boardId,
      entryId,
      boardId,
      viewer.household.id,
      access.board.version,
    ),
    viewer.env.DB.prepare(
      "UPDATE boards SET version = ?, updated_at = ? WHERE id = ? AND household_id = ? AND version = ?",
    ).bind(
      nextVersion,
      now,
      boardId,
      viewer.household.id,
      access.board.version,
    ),
  ]);
  if (results[0]?.meta.changes !== 1 || results[1]?.meta.changes !== 1)
    return Response.json({ error: "version_conflict" }, { status: 409 });
  return Response.json({ ok: true, entryId, version: nextVersion });
}

export const DELETE = instrumentRequestHandler(
  {
    service: "cattower-web",
    route: "/api/boards/:boardId/items/:entryId",
  },
  remove,
);
