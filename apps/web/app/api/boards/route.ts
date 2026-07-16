import { boards } from "@cattower/db";
import {
  canPerformBoardAction,
  MAX_BOARDS_PER_HOUSEHOLD,
  validateBoardInput,
} from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, count, eq } from "drizzle-orm";

import { getBoards } from "@/lib/boards";
import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function get(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  return Response.json({ boards: await getBoards(viewer) });
}

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
    !canPerformBoardAction({
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
  const input = body ? validateBoardInput(body) : null;
  if (!input) return Response.json({ error: "invalid_board" }, { status: 400 });

  const countRows = await viewer.db
    .select({ value: count() })
    .from(boards)
    .where(eq(boards.householdId, viewer.household.id));
  const boardCount = countRows[0]?.value ?? 0;
  if (boardCount >= MAX_BOARDS_PER_HOUSEHOLD)
    return Response.json({ error: "board_limit_reached" }, { status: 409 });

  const duplicate = await viewer.db.query.boards.findFirst({
    where: and(
      eq(boards.householdId, viewer.household.id),
      eq(boards.normalizedName, input.normalizedName),
    ),
    columns: { id: true },
  });
  if (duplicate)
    return Response.json({ error: "board_name_exists" }, { status: 409 });

  const board = {
    id: crypto.randomUUID(),
    householdId: viewer.household.id,
    createdBy: viewer.session.user.id,
    name: input.name,
    normalizedName: input.normalizedName,
    sortMode: input.sortMode,
    version: 1,
  };
  try {
    await viewer.db.insert(boards).values(board);
  } catch (cause) {
    if (isUniqueConstraint(cause))
      return Response.json({ error: "board_name_exists" }, { status: 409 });
    throw cause;
  }

  return Response.json(
    {
      board: {
        id: board.id,
        name: board.name,
        sortMode: board.sortMode,
        createdBy: board.createdBy,
        version: board.version,
        itemCount: 0,
        canManage: true,
      },
    },
    { status: 201 },
  );
}

function isUniqueConstraint(cause: unknown) {
  return (
    cause instanceof Error && cause.message.includes("UNIQUE constraint failed")
  );
}

export const GET = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/boards" },
  get,
);
export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/boards" },
  post,
);
