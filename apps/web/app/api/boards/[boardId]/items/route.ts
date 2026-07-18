import { boardItems, entries } from "@cattower/db";
import {
  boardSortKeyAt,
  MAX_BOARD_ITEMS,
  nextBoardSortKey,
  validateBoardItemOrder,
} from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, asc, count, eq, isNull } from "drizzle-orm";

import { getBoardAccess } from "@/lib/boards";
import { getViewer } from "@/lib/viewer";

type RouteContext = { params: Promise<{ boardId: string }> };

async function post(request: Request, context: RouteContext) {
  const resolved = await resolveManagedBoard(request, context);
  if (resolved instanceof Response) return resolved;
  const { viewer, board } = resolved;
  const body = (await request.json().catch(() => null)) as {
    entryId?: unknown;
    version?: unknown;
  } | null;
  if (typeof body?.entryId !== "string" || !body.entryId)
    return Response.json({ error: "invalid_board_item" }, { status: 400 });
  if (!Number.isInteger(body.version) || body.version !== board.version)
    return Response.json({ error: "version_conflict" }, { status: 409 });

  const entry = await viewer.db.query.entries.findFirst({
    where: and(
      eq(entries.id, body.entryId),
      eq(entries.householdId, viewer.household.id),
      eq(entries.status, "ready"),
      isNull(entries.deletedAt),
    ),
    columns: { id: true },
  });
  if (!entry)
    return Response.json({ error: "entry_not_found" }, { status: 404 });

  const countRows = await viewer.db
    .select({ value: count() })
    .from(boardItems)
    .where(eq(boardItems.boardId, board.id));
  const itemCount = countRows[0]?.value ?? 0;
  if (itemCount >= MAX_BOARD_ITEMS)
    return Response.json(
      { error: "board_item_limit_reached" },
      { status: 409 },
    );
  const existing = await viewer.db.query.boardItems.findFirst({
    where: and(
      eq(boardItems.boardId, board.id),
      eq(boardItems.entryId, entry.id),
    ),
  });
  if (existing)
    return Response.json({ error: "board_item_exists" }, { status: 409 });

  const lastItem = await viewer.db.query.boardItems.findFirst({
    where: eq(boardItems.boardId, board.id),
    orderBy: [asc(boardItems.sortKey)],
    offset: itemCount ? itemCount - 1 : 0,
    columns: { sortKey: true },
  });
  const sortKey = nextBoardSortKey(lastItem?.sortKey);
  const nextVersion = board.version + 1;
  const now = Date.now();
  try {
    const results = await viewer.env.DB.batch([
      viewer.env.DB.prepare(
        "INSERT INTO board_items (board_id, entry_id, sort_key, created_at) SELECT ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM boards WHERE id = ? AND household_id = ? AND version = ?)",
      ).bind(
        board.id,
        entry.id,
        sortKey,
        now,
        board.id,
        viewer.household.id,
        board.version,
      ),
      viewer.env.DB.prepare(
        "UPDATE boards SET version = ?, updated_at = ? WHERE id = ? AND household_id = ? AND version = ?",
      ).bind(nextVersion, now, board.id, viewer.household.id, board.version),
    ]);
    if (results[0]?.meta.changes !== 1 || results[1]?.meta.changes !== 1)
      return Response.json({ error: "version_conflict" }, { status: 409 });
  } catch (cause) {
    if (isUniqueConstraint(cause))
      return Response.json({ error: "board_item_exists" }, { status: 409 });
    throw cause;
  }
  return Response.json({ ok: true, entryId: entry.id, version: nextVersion });
}

async function put(request: Request, context: RouteContext) {
  const resolved = await resolveManagedBoard(request, context);
  if (resolved instanceof Response) return resolved;
  const { viewer, board } = resolved;
  if (board.sortMode !== "manual")
    return Response.json({ error: "manual_order_disabled" }, { status: 409 });
  const body = (await request.json().catch(() => null)) as {
    entryIds?: unknown;
    version?: unknown;
  } | null;
  if (!Number.isInteger(body?.version) || body?.version !== board.version)
    return Response.json({ error: "version_conflict" }, { status: 409 });
  const currentRows = await viewer.db
    .select({ entryId: boardItems.entryId })
    .from(boardItems)
    .innerJoin(entries, eq(entries.id, boardItems.entryId))
    .where(
      and(
        eq(boardItems.boardId, board.id),
        eq(entries.householdId, viewer.household.id),
        eq(entries.status, "ready"),
        isNull(entries.deletedAt),
      ),
    )
    .orderBy(asc(boardItems.sortKey));
  const entryIds = validateBoardItemOrder(
    body?.entryIds,
    currentRows.map(({ entryId }) => entryId),
  );
  if (!entryIds)
    return Response.json({ error: "invalid_board_order" }, { status: 400 });
  if (
    entryIds.every((entryId, index) => entryId === currentRows[index]?.entryId)
  )
    return Response.json({ ok: true, version: board.version });

  const nextVersion = board.version + 1;
  const now = Date.now();
  const orderChunks = chunk(entryIds, 30);
  const results = await viewer.env.DB.batch([
    ...orderChunks.map((entryIdChunk) => {
      const firstIndex = entryIds.indexOf(entryIdChunk[0]!);
      const caseSql = entryIdChunk.map(() => "WHEN ? THEN ?").join(" ");
      const inSql = entryIdChunk.map(() => "?").join(", ");
      return viewer.env.DB.prepare(
        `UPDATE board_items SET sort_key = CASE entry_id ${caseSql} ELSE sort_key END WHERE board_id = ? AND entry_id IN (${inSql}) AND EXISTS (SELECT 1 FROM boards WHERE id = ? AND household_id = ? AND version = ?)`,
      ).bind(
        ...entryIdChunk.flatMap((entryId, index) => [
          entryId,
          boardSortKeyAt(firstIndex + index),
        ]),
        board.id,
        ...entryIdChunk,
        board.id,
        viewer.household.id,
        board.version,
      );
    }),
    viewer.env.DB.prepare(
      "UPDATE boards SET version = ?, updated_at = ? WHERE id = ? AND household_id = ? AND version = ?",
    ).bind(nextVersion, now, board.id, viewer.household.id, board.version),
  ]);
  if (
    results.length !== orderChunks.length + 1 ||
    results
      .slice(0, -1)
      .some(
        (result, index) => result.meta.changes !== orderChunks[index]?.length,
      ) ||
    results.at(-1)?.meta.changes !== 1
  )
    return Response.json({ error: "version_conflict" }, { status: 409 });
  return Response.json({ ok: true, version: nextVersion });
}

async function resolveManagedBoard(request: Request, context: RouteContext) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { boardId } = await context.params;
  const access = await getBoardAccess(viewer, boardId);
  if (!access) return Response.json({ error: "not_found" }, { status: 404 });
  if (!access.canManage)
    return Response.json({ error: "forbidden" }, { status: 403 });
  return { viewer, board: access.board };
}

function isUniqueConstraint(cause: unknown) {
  return (
    cause instanceof Error && cause.message.includes("UNIQUE constraint failed")
  );
}

function chunk<T>(values: readonly T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size)
    chunks.push(values.slice(index, index + size));
  return chunks;
}

export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/boards/:boardId/items" },
  post,
);
export const PUT = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/boards/:boardId/items" },
  put,
);
