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
import { GET, POST } from "@/app/api/boards/route";

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

async function seedBoard(id: string, createdBy: string, name: string) {
  await db.insert(boards).values({
    id,
    householdId: homeId,
    createdBy,
    name,
    normalizedName: name,
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
