import { boardItems, boards } from "@cattower/db";
import { canPerformBoardAction } from "@cattower/domain";
import { count, desc, eq } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;

export async function getBoards(viewer: Viewer) {
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (!membership) return [];

  const rows = await viewer.db
    .select({
      id: boards.id,
      name: boards.name,
      sortMode: boards.sortMode,
      createdBy: boards.createdBy,
      version: boards.version,
      itemCount: count(boardItems.entryId),
    })
    .from(boards)
    .leftJoin(boardItems, eq(boardItems.boardId, boards.id))
    .where(eq(boards.householdId, viewer.household.id))
    .groupBy(
      boards.id,
      boards.name,
      boards.sortMode,
      boards.createdBy,
      boards.version,
      boards.updatedAt,
    )
    .orderBy(desc(boards.updatedAt));

  return rows.map((board) => ({
    ...board,
    canManage: canPerformBoardAction({
      action: "edit",
      membership,
      actorUserId: viewer.session.user.id,
      creatorUserId: board.createdBy,
    }),
  }));
}

export type BoardView = Awaited<ReturnType<typeof getBoards>>[number];
