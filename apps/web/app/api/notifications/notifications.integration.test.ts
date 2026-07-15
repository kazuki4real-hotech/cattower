import {
  createDatabase,
  householdInvites,
  householdMembers,
  households,
  notifications,
  user,
  userPreferences,
} from "@cattower/db";
import { createInviteToken, hashInviteToken } from "@cattower/domain";
import { env } from "cloudflare:test";
import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createNotification } from "@/lib/notifications";

const viewerState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/viewer", () => ({
  getViewer: async () => viewerState.current,
}));

import { GET, PATCH } from "@/app/api/notifications/route";
import { POST as acceptInvite } from "@/app/api/invites/accept/route";

const db = createDatabase(env.DB);
const ownerId = "notification-owner";
const otherId = "notification-other";
const homeId = "notification-home";
const otherHomeId = "notification-other-home";

beforeEach(async () => {
  viewerState.current = null;
  await clearDatabase();
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: "notice-owner@example.test" },
    { id: otherId, name: "Other", email: "notice-other@example.test" },
  ]);
  await db.insert(households).values([
    { id: homeId, name: "Home", ownerUserId: ownerId },
    { id: otherHomeId, name: "Other home", ownerUserId: otherId },
  ]);
  await db.insert(userPreferences).values([
    { userId: ownerId, activeHouseholdId: homeId },
    { userId: otherId, activeHouseholdId: otherHomeId },
  ]);
  await db.insert(householdMembers).values([
    {
      householdId: homeId,
      userId: ownerId,
      role: "owner",
      status: "active",
    },
    {
      householdId: otherHomeId,
      userId: otherId,
      role: "owner",
      status: "active",
    },
  ]);
});

describe("notifications API", () => {
  it("requires authentication", async () => {
    const response = await GET(request());

    expect(response.status).toBe(401);
  });

  it("deduplicates notification creation and reports unread count", async () => {
    setViewer(ownerId, homeId);
    const input = {
      recipientUserId: ownerId,
      type: "household_joined" as const,
      title: "家族が参加しました",
      message: "新しい家族が、おうちに参加しました。",
      dedupeKey: "household_joined:member-1",
      resourceType: "household" as const,
      resourceId: homeId,
    };
    const first = await createNotification(db, input);
    const duplicate = await createNotification(db, input);

    expect(first).toBeTruthy();
    expect(duplicate).toBeNull();
    const response = await GET(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      unreadCount: 1,
      notifications: [
        {
          title: "家族が参加しました",
          resourceId: homeId,
          readAt: null,
        },
      ],
    });
    const summary = await GET(request("?summary=1"));
    await expect(summary.json()).resolves.toEqual({ unreadCount: 1 });
  });

  it("hides notifications after resource access is lost", async () => {
    setViewer(ownerId, homeId);
    await createNotification(db, {
      recipientUserId: ownerId,
      type: "household_joined",
      title: "表示できる通知",
      message: "参加中のおうちに関する通知です。",
      dedupeKey: "visible:home",
      resourceType: "household",
      resourceId: homeId,
    });
    await createNotification(db, {
      recipientUserId: ownerId,
      type: "household_joined",
      title: "表示しない通知",
      message: "参加していないおうちに関する通知です。",
      dedupeKey: "hidden:other-home",
      resourceType: "household",
      resourceId: otherHomeId,
    });

    const response = await GET(request());
    const body = (await response.json()) as {
      notifications: Array<{ title: string }>;
    };
    expect(body.notifications.map((item) => item.title)).toEqual([
      "表示できる通知",
    ]);
  });

  it("marks only the authenticated recipient notifications as read", async () => {
    setViewer(ownerId, homeId);
    const ownerNotice = await createNotification(db, {
      recipientUserId: ownerId,
      type: "upload_ready",
      title: "写真の準備ができました",
      message: "プロフィール写真を表示できます。",
      dedupeKey: "upload_ready:owner",
    });
    const otherNotice = await createNotification(db, {
      recipientUserId: otherId,
      type: "upload_ready",
      title: "別の利用者のお知らせ",
      message: "この通知は変更できません。",
      dedupeKey: "upload_ready:other",
    });
    if (!ownerNotice || !otherNotice) throw new Error("fixture_failed");

    const response = await PATCH(
      request("", "PATCH", { ids: [ownerNotice, otherNotice] }),
    );
    await expect(response.json()).resolves.toEqual({ ok: true, changed: 1 });
    const ownerRow = await db.query.notifications.findFirst({
      where: eq(notifications.id, ownerNotice),
    });
    const otherRow = await db.query.notifications.findFirst({
      where: eq(notifications.id, otherNotice),
    });
    expect(ownerRow?.readAt).toBeInstanceOf(Date);
    expect(otherRow?.readAt).toBeNull();
  });

  it("removes expired notifications during a read", async () => {
    setViewer(ownerId, homeId);
    await createNotification(db, {
      recipientUserId: ownerId,
      type: "share_expiring",
      title: "期限切れ通知",
      message: "この通知は表示されません。",
      dedupeKey: "expired:share-1",
      expiresAt: new Date(Date.now() - 1_000),
    });

    const response = await GET(request());
    await expect(response.json()).resolves.toMatchObject({
      unreadCount: 0,
      notifications: [],
    });
    expect(await db.$count(notifications)).toBe(0);
  });

  it("notifies both people after an invitation is accepted", async () => {
    const token = createInviteToken();
    const tokenHash = await hashInviteToken(token);
    if (!tokenHash) throw new Error("token_fixture_failed");
    await db.insert(householdInvites).values({
      id: "invite-for-notification",
      householdId: homeId,
      tokenHash,
      createdBy: ownerId,
      role: "editor",
      expiresAt: new Date(Date.now() + 60_000),
    });
    setViewer(otherId, otherHomeId);

    const response = await acceptInvite(request("/accept", "POST", { token }));
    expect(response.status).toBe(200);
    const rows = await db.query.notifications.findMany();
    expect(
      rows.map((item) => [item.recipientUserId, item.type]).sort(),
    ).toEqual(
      [
        [otherId, "household_invite"],
        [ownerId, "household_joined"],
      ].sort(),
    );
  });
});

function setViewer(userId: string, householdId: string) {
  viewerState.current = {
    db,
    session: {
      user: { id: userId, name: userId === ownerId ? "Owner" : "Other" },
    },
    household: { id: householdId },
    env: { DB: env.DB },
  };
}

function request(path = "", method = "GET", body?: object) {
  return new Request(`https://example.test/api/notifications${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function clearDatabase() {
  for (const table of [
    "notifications",
    "household_invites",
    "household_members",
    "households",
    "user_preferences",
    "user",
  ]) {
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  }
}
