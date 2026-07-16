import { boards } from "@cattower/db";
import { canPerformBoardAction, validateBoardInput } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq, ne } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

type RouteContext = { params: Promise<{ boardId: string }> };

async function put(request: Request, context: RouteContext) {
  const resolved = await resolveManagedBoard(request, context, "edit");
  if (resolved instanceof Response) return resolved;
  const { viewer, board } = resolved;
  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const input = body ? validateBoardInput(body) : null;
  if (!input) return Response.json({ error: "invalid_board" }, { status: 400 });
  if (!Number.isInteger(body?.version) || body?.version !== board.version)
    return Response.json({ error: "version_conflict" }, { status: 409 });

  const duplicate = await viewer.db.query.boards.findFirst({
    where: and(
      eq(boards.householdId, viewer.household.id),
      eq(boards.normalizedName, input.normalizedName),
      ne(boards.id, board.id),
    ),
    columns: { id: true },
  });
  if (duplicate)
    return Response.json({ error: "board_name_exists" }, { status: 409 });

  const nextVersion = board.version + 1;
  try {
    const result = await viewer.db
      .update(boards)
      .set({
        name: input.name,
        normalizedName: input.normalizedName,
        sortMode: input.sortMode,
        version: nextVersion,
        updatedAt: new Date(),
      })
      .where(and(eq(boards.id, board.id), eq(boards.version, board.version)));
    if (result.meta.changes !== 1)
      return Response.json({ error: "version_conflict" }, { status: 409 });
  } catch (cause) {
    if (isUniqueConstraint(cause))
      return Response.json({ error: "board_name_exists" }, { status: 409 });
    throw cause;
  }

  return Response.json({
    board: {
      id: board.id,
      name: input.name,
      sortMode: input.sortMode,
      createdBy: board.createdBy,
      version: nextVersion,
    },
  });
}

async function remove(request: Request, context: RouteContext) {
  const resolved = await resolveManagedBoard(request, context, "delete");
  if (resolved instanceof Response) return resolved;
  const { viewer, board } = resolved;
  const body = (await request.json().catch(() => null)) as {
    version?: unknown;
  } | null;
  if (!Number.isInteger(body?.version) || body?.version !== board.version)
    return Response.json({ error: "version_conflict" }, { status: 409 });

  const result = await viewer.db
    .delete(boards)
    .where(and(eq(boards.id, board.id), eq(boards.version, board.version)));
  if (result.meta.changes < 1)
    return Response.json({ error: "version_conflict" }, { status: 409 });
  return Response.json({ ok: true, boardId: board.id });
}

async function resolveManagedBoard(
  request: Request,
  context: RouteContext,
  action: "edit" | "delete",
) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { boardId } = await context.params;
  const board = await viewer.db.query.boards.findFirst({
    where: and(
      eq(boards.id, boardId),
      eq(boards.householdId, viewer.household.id),
    ),
  });
  if (!board) return Response.json({ error: "not_found" }, { status: 404 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (
    !membership ||
    !canPerformBoardAction({
      action,
      membership,
      actorUserId: viewer.session.user.id,
      creatorUserId: board.createdBy,
    })
  )
    return Response.json({ error: "forbidden" }, { status: 403 });
  return { viewer, board };
}

function isUniqueConstraint(cause: unknown) {
  return (
    cause instanceof Error && cause.message.includes("UNIQUE constraint failed")
  );
}

export const PUT = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/boards/:boardId" },
  put,
);
export const DELETE = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/boards/:boardId" },
  remove,
);
