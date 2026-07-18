import { boardItems, boards, entries } from "@cattower/db";
import {
  BOARD_ENTRY_PICKER_LIMIT,
  canPerformBoardAction,
} from "@cattower/domain";
import { and, asc, count, desc, eq, isNull, notInArray } from "drizzle-orm";

import { hydrateEntries } from "@/lib/entries";
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
      itemCount: count(entries.id),
    })
    .from(boards)
    .leftJoin(boardItems, eq(boardItems.boardId, boards.id))
    .leftJoin(
      entries,
      and(
        eq(entries.id, boardItems.entryId),
        eq(entries.status, "ready"),
        isNull(entries.deletedAt),
      ),
    )
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

export async function getBoardAccess(viewer: Viewer, boardId: string) {
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (!membership) return null;
  const board = await viewer.db.query.boards.findFirst({
    where: and(
      eq(boards.id, boardId),
      eq(boards.householdId, viewer.household.id),
    ),
  });
  if (!board) return null;
  const canManage = canPerformBoardAction({
    action: "edit",
    membership,
    actorUserId: viewer.session.user.id,
    creatorUserId: board.createdBy,
  });
  return { board, membership, canManage };
}

export async function getBoardDetail(viewer: Viewer, boardId: string) {
  const access = await getBoardAccess(viewer, boardId);
  if (!access) return null;
  const { board, canManage } = access;
  const orderBy =
    board.sortMode === "manual"
      ? [asc(boardItems.sortKey)]
      : board.sortMode === "newest"
        ? [desc(entries.occurredAt), desc(entries.createdAt)]
        : [asc(entries.occurredAt), asc(entries.createdAt)];
  const itemRows = await viewer.db
    .select({ entry: entries, sortKey: boardItems.sortKey })
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
    .orderBy(...orderBy);
  const items = await hydrateEntries(
    viewer,
    itemRows.map(({ entry }) => entry),
  );

  const itemIds = itemRows.map(({ entry }) => entry.id);
  const candidateRows = canManage
    ? await viewer.db.query.entries.findMany({
        where: and(
          eq(entries.householdId, viewer.household.id),
          eq(entries.status, "ready"),
          isNull(entries.deletedAt),
          itemIds.length ? notInArray(entries.id, itemIds) : undefined,
        ),
        orderBy: [desc(entries.occurredAt), desc(entries.createdAt)],
        limit: BOARD_ENTRY_PICKER_LIMIT,
      })
    : [];

  return {
    board: {
      id: board.id,
      name: board.name,
      sortMode: board.sortMode,
      version: board.version,
      canManage,
    },
    items,
    candidates: await hydrateEntries(viewer, candidateRows),
  };
}

export type BoardDetailView = NonNullable<
  Awaited<ReturnType<typeof getBoardDetail>>
>;
