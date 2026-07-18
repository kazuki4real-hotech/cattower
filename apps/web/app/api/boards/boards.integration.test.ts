import {
  boardItems,
  boards,
  createDatabase,
  entries,
  householdMembers,
  households,
  user,
  userPreferences,
} from "@cattower/db";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

const viewerState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/viewer", () => ({
  getViewer: async () => viewerState.current,
}));

import { DELETE, PUT } from "@/app/api/boards/[boardId]/route";
import { DELETE as removeBoardItem } from "@/app/api/boards/[boardId]/items/[entryId]/route";
import {
  POST as addBoardItem,
  PUT as reorderBoardItems,
} from "@/app/api/boards/[boardId]/items/route";
import { GET, POST } from "@/app/api/boards/route";
import { getBoardDetail } from "@/lib/boards";

const db = createDatabase(env.DB);
const ownerId = "board-owner";
const editorId = "board-editor";
const outsiderId = "board-outsider";
const homeId = "board-home";
const outsiderHomeId = "board-outsider-home";

beforeEach(async () => {
  viewerState.current = null;
  await clearDatabase();
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: "board-owner@example.test" },
    { id: editorId, name: "Editor", email: "board-editor@example.test" },
    {
      id: outsiderId,
      name: "Outsider",
      email: "board-outsider@example.test",
    },
  ]);
  await db.insert(households).values([
    { id: homeId, name: "Home", ownerUserId: ownerId },
    {
      id: outsiderHomeId,
      name: "Outsider home",
      ownerUserId: outsiderId,
    },
  ]);
  await db.insert(userPreferences).values([
    { userId: ownerId, activeHouseholdId: homeId },
    { userId: editorId, activeHouseholdId: homeId },
    { userId: outsiderId, activeHouseholdId: outsiderHomeId },
  ]);
  await db.insert(householdMembers).values([
    {
      householdId: homeId,
      userId: ownerId,
      role: "owner",
      status: "active",
    },
    {
      householdId: homeId,
      userId: editorId,
      role: "editor",
      status: "active",
      invitedBy: ownerId,
    },
    {
      householdId: outsiderHomeId,
      userId: outsiderId,
      role: "owner",
      status: "active",
    },
  ]);
});

describe("boards API", () => {
  it("requires authentication for list and creation", async () => {
    expect((await GET(request())).status).toBe(401);
    expect(
      (await POST(request("", "POST", { name: "窓辺", sortMode: "manual" })))
        .status,
    ).toBe(401);
  });

  it("creates and lists only the active household boards", async () => {
    setViewer(editorId, homeId);
    const created = await POST(
      request("", "POST", { name: "  窓辺の 思い出  ", sortMode: "newest" }),
    );
    expect(created.status).toBe(201);
    const body = (await created.json()) as { board: { id: string } };
    await db.insert(boards).values({
      id: "outsider-board",
      householdId: outsiderHomeId,
      createdBy: outsiderId,
      name: "見えないボード",
      normalizedName: "見えないボード",
    });

    const listed = await GET(request());
    expect(listed.status).toBe(200);
    await expect(listed.json()).resolves.toMatchObject({
      boards: [
        {
          id: body.board.id,
          name: "窓辺の 思い出",
          itemCount: 0,
          canManage: true,
        },
      ],
    });
  });

  it("rejects a normalized duplicate name", async () => {
    setViewer(ownerId, homeId);
    expect(
      (
        await POST(
          request("", "POST", { name: "Favorite", sortMode: "manual" }),
        )
      ).status,
    ).toBe(201);
    const duplicate = await POST(
      request("", "POST", { name: "ＦＡＶＯＲＩＴＥ", sortMode: "oldest" }),
    );

    expect(duplicate.status).toBe(409);
    await expect(duplicate.json()).resolves.toEqual({
      error: "board_name_exists",
    });
  });

  it("lets editors manage only boards they created", async () => {
    await seedBoard("owner-board", ownerId, "家族の一冊");
    setViewer(editorId, homeId);
    const updated = await PUT(
      request("/owner-board", "PUT", {
        name: "変更後",
        sortMode: "manual",
        version: 1,
      }),
      context("owner-board"),
    );
    const deleted = await DELETE(
      request("/owner-board", "DELETE", { version: 1 }),
      context("owner-board"),
    );

    expect(updated.status).toBe(403);
    expect(deleted.status).toBe(403);
  });

  it("lets owners update editor boards with optimistic versioning", async () => {
    await seedBoard("editor-board", editorId, "毎日の顔");
    setViewer(ownerId, homeId);
    const updated = await PUT(
      request("/editor-board", "PUT", {
        name: "毎日の表情",
        sortMode: "newest",
        version: 1,
      }),
      context("editor-board"),
    );
    expect(updated.status).toBe(200);
    await expect(updated.json()).resolves.toMatchObject({
      board: { name: "毎日の表情", sortMode: "newest", version: 2 },
    });

    const stale = await PUT(
      request("/editor-board", "PUT", {
        name: "古い編集",
        sortMode: "manual",
        version: 1,
      }),
      context("editor-board"),
    );
    expect(stale.status).toBe(409);
  });

  it("adds household records once and rejects records from another home", async () => {
    await seedBoard("owner-board", ownerId, "窓辺");
    await seedEntry("home-entry", homeId, ownerId, "2026-07-17");
    await seedEntry("outsider-entry", outsiderHomeId, outsiderId, "2026-07-16");
    setViewer(ownerId, homeId);

    const added = await addBoardItem(
      request("/owner-board/items", "POST", {
        entryId: "home-entry",
        version: 1,
      }),
      context("owner-board"),
    );
    expect(added.status).toBe(200);
    await expect(added.json()).resolves.toMatchObject({ version: 2 });
    expect(await db.query.boardItems.findFirst()).toMatchObject({
      boardId: "owner-board",
      entryId: "home-entry",
      sortKey: "000000001000",
    });

    const duplicate = await addBoardItem(
      request("/owner-board/items", "POST", {
        entryId: "home-entry",
        version: 2,
      }),
      context("owner-board"),
    );
    expect(duplicate.status).toBe(409);

    const outsider = await addBoardItem(
      request("/owner-board/items", "POST", {
        entryId: "outsider-entry",
        version: 2,
      }),
      context("owner-board"),
    );
    expect(outsider.status).toBe(404);
  });

  it("reserves item changes on an owner board from editors", async () => {
    await seedBoard("owner-board", ownerId, "家族の一冊");
    await seedEntry("home-entry", homeId, editorId, "2026-07-17");
    setViewer(editorId, homeId);

    const added = await addBoardItem(
      request("/owner-board/items", "POST", {
        entryId: "home-entry",
        version: 1,
      }),
      context("owner-board"),
    );
    expect(added.status).toBe(403);
  });

  it("reorders every manual item and rejects stale or automatic ordering", async () => {
    await seedBoard("manual-board", ownerId, "手動");
    await seedEntry("entry-a", homeId, ownerId, "2026-07-15");
    await seedEntry("entry-b", homeId, ownerId, "2026-07-16");
    await db.insert(boardItems).values([
      {
        boardId: "manual-board",
        entryId: "entry-a",
        sortKey: "000000001000",
      },
      {
        boardId: "manual-board",
        entryId: "entry-b",
        sortKey: "000000002000",
      },
    ]);
    setViewer(ownerId, homeId);

    const reordered = await reorderBoardItems(
      request("/manual-board/items", "PUT", {
        entryIds: ["entry-b", "entry-a"],
        version: 1,
      }),
      context("manual-board"),
    );
    expect(reordered.status).toBe(200);
    await expect(reordered.json()).resolves.toMatchObject({ version: 2 });
    const rows = await db.query.boardItems.findMany({
      orderBy: (item, { asc }) => asc(item.sortKey),
    });
    expect(rows.map((row) => row.entryId)).toEqual(["entry-b", "entry-a"]);

    const stale = await reorderBoardItems(
      request("/manual-board/items", "PUT", {
        entryIds: ["entry-a", "entry-b"],
        version: 1,
      }),
      context("manual-board"),
    );
    expect(stale.status).toBe(409);

    await seedBoard("automatic-board", ownerId, "自動", "newest");
    const automatic = await reorderBoardItems(
      request("/automatic-board/items", "PUT", {
        entryIds: [],
        version: 1,
      }),
      context("automatic-board"),
    );
    expect(automatic.status).toBe(409);
  });

  it("shows automatic order to members without exposing edit candidates", async () => {
    await seedBoard("owner-board", ownerId, "新しい順", "newest");
    await seedEntry("older-entry", homeId, ownerId, "2026-07-15");
    await seedEntry("newer-entry", homeId, editorId, "2026-07-17");
    await seedEntry("candidate-entry", homeId, ownerId, "2026-07-16");
    await db.insert(boardItems).values([
      {
        boardId: "owner-board",
        entryId: "older-entry",
        sortKey: "000000001000",
      },
      {
        boardId: "owner-board",
        entryId: "newer-entry",
        sortKey: "000000002000",
      },
    ]);
    setViewer(editorId, homeId);

    const detail = await getBoardDetail(
      viewerState.current as Parameters<typeof getBoardDetail>[0],
      "owner-board",
    );
    expect(detail?.items.map((entry) => entry.id)).toEqual([
      "newer-entry",
      "older-entry",
    ]);
    expect(detail?.board.canManage).toBe(false);
    expect(detail?.candidates).toEqual([]);
  });

  it("reorders more than one D1 parameter chunk", async () => {
    await seedBoard("large-board", ownerId, "たくさんの記録");
    const entryIds = Array.from({ length: 65 }, (_, index) => `entry-${index}`);
    for (let index = 0; index < entryIds.length; index += 10) {
      const entryChunk = entryIds.slice(index, index + 10);
      await db.insert(entries).values(
        entryChunk.map((id) => ({
          id,
          householdId: homeId,
          authorUserId: ownerId,
          body: id,
          occurredAt: new Date("2026-07-17T00:00:00.000Z"),
        })),
      );
      await db.insert(boardItems).values(
        entryChunk.map((entryId, chunkIndex) => ({
          boardId: "large-board",
          entryId,
          sortKey: String((index + chunkIndex + 1) * 1_000).padStart(12, "0"),
        })),
      );
    }
    setViewer(ownerId, homeId);

    const reordered = await reorderBoardItems(
      request("/large-board/items", "PUT", {
        entryIds: [...entryIds].reverse(),
        version: 1,
      }),
      context("large-board"),
    );
    expect(reordered.status).toBe(200);
    const rows = await db.query.boardItems.findMany({
      where: eq(boardItems.boardId, "large-board"),
      orderBy: (item, { asc }) => asc(item.sortKey),
    });
    expect(rows.map((row) => row.entryId)).toEqual([...entryIds].reverse());
  });

  it("removes a placement while preserving the record", async () => {
    await seedBoard("owner-board", ownerId, "残したい記録");
    await seedEntry("kept-entry", homeId, ownerId, "2026-07-17");
    await db.insert(boardItems).values({
      boardId: "owner-board",
      entryId: "kept-entry",
      sortKey: "000000001000",
    });
    setViewer(ownerId, homeId);

    const removed = await removeBoardItem(
      request("/owner-board/items/kept-entry", "DELETE", { version: 1 }),
      itemContext("owner-board", "kept-entry"),
    );
    expect(removed.status).toBe(200);
    expect(await db.query.boardItems.findFirst()).toBeUndefined();
    expect(
      await db.query.entries.findFirst({ where: eq(entries.id, "kept-entry") }),
    ).toBeTruthy();
  });

  it("deletes the board and its placement without deleting the record", async () => {
    await seedBoard("owner-board", ownerId, "残したい記録");
    await db.insert(entries).values({
      id: "kept-entry",
      householdId: homeId,
      authorUserId: ownerId,
      body: "これは残る",
      occurredAt: new Date("2026-07-17T00:00:00.000Z"),
    });
    await db.insert(boardItems).values({
      boardId: "owner-board",
      entryId: "kept-entry",
      sortKey: "a0",
    });
    setViewer(ownerId, homeId);

    const deleted = await DELETE(
      request("/owner-board", "DELETE", { version: 1 }),
      context("owner-board"),
    );
    expect(deleted.status).toBe(200);
    expect(await db.query.boards.findFirst()).toBeUndefined();
    expect(await db.query.boardItems.findFirst()).toBeUndefined();
    expect(
      await db.query.entries.findFirst({ where: eq(entries.id, "kept-entry") }),
    ).toBeTruthy();
  });
});

function context(boardId: string) {
  return { params: Promise.resolve({ boardId }) };
}

function itemContext(boardId: string, entryId: string) {
  return { params: Promise.resolve({ boardId, entryId }) };
}

function request(path = "", method = "GET", body?: object) {
  return new Request(`https://example.test/api/boards${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function setViewer(userId: string, householdId: string) {
  viewerState.current = {
    db,
    session: { user: { id: userId } },
    household: { id: householdId },
    env: { DB: env.DB },
  };
}

async function seedBoard(
  id: string,
  createdBy: string,
  name: string,
  sortMode: "manual" | "newest" | "oldest" = "manual",
) {
  await db.insert(boards).values({
    id,
    householdId: homeId,
    createdBy,
    name,
    normalizedName: name,
    sortMode,
  });
}

async function seedEntry(
  id: string,
  householdId: string,
  authorUserId: string,
  occurredDate: string,
) {
  await db.insert(entries).values({
    id,
    householdId,
    authorUserId,
    body: id,
    occurredAt: new Date(`${occurredDate}T00:00:00.000Z`),
  });
}

async function clearDatabase() {
  for (const table of [
    "board_items",
    "boards",
    "entries",
    "household_members",
    "households",
    "user_preferences",
    "user",
  ]) {
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  }
}
