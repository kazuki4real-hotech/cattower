import {
  cats,
  createDatabase,
  entryCats,
  entryMedia,
  entryTags,
  householdMembers,
  households,
  mediaAssets,
  user,
  userPreferences,
} from "@cattower/db";
import { env } from "cloudflare:test";
import { beforeEach, describe, expect, it, vi } from "vitest";

const viewerState = vi.hoisted(() => ({ current: null as unknown }));

vi.mock("@/lib/viewer", () => ({
  getViewer: async () => viewerState.current,
}));

import { GET as getCats, POST as createCat } from "@/app/api/cats/route";
import { PUT as updateCat } from "@/app/api/cats/[catId]/route";
import { GET as getMedia } from "@/app/api/media/[assetId]/route";
import { POST as createEntry } from "@/app/api/entries/route";
import {
  GET as getHouseholds,
  PUT as switchHousehold,
} from "@/app/api/households/active/route";
import {
  GET as getInvites,
  POST as createInvite,
} from "@/app/api/household-invites/route";
import { POST as presignProfileImage } from "@/app/api/uploads/images/presign/route";
import { POST as completeProfileImage } from "@/app/api/uploads/images/[assetId]/complete/route";

const db = createDatabase(env.DB);
const ownerId = "user-owner";
const editorId = "user-editor";
const outsiderId = "user-outsider";
const revokedId = "user-revoked";
const homeId = "household-home";
const outsiderHomeId = "household-outsider";
const catId = "cat-home";
const outsiderCatId = "cat-outsider";
const assetId = "asset-home";
const editorAssetId = "asset-editor";
const failedAssetId = "asset-failed";
const editorEntryAssetId = "asset-editor-entry";

beforeEach(async () => {
  viewerState.current = null;
  await clearDatabase();
  await db.insert(user).values([
    { id: ownerId, name: "Owner", email: "owner@example.test" },
    { id: editorId, name: "Editor", email: "editor@example.test" },
    { id: outsiderId, name: "Outsider", email: "outsider@example.test" },
    { id: revokedId, name: "Revoked", email: "revoked@example.test" },
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
    { userId: revokedId, activeHouseholdId: homeId },
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
      householdId: homeId,
      userId: revokedId,
      role: "editor",
      status: "revoked",
      invitedBy: ownerId,
    },
    {
      householdId: outsiderHomeId,
      userId: outsiderId,
      role: "owner",
      status: "active",
    },
  ]);
  await db.insert(cats).values([
    { id: catId, householdId: homeId, name: "Mugi" },
    { id: outsiderCatId, householdId: outsiderHomeId, name: "Sora" },
  ]);
  await db.insert(mediaAssets).values([
    {
      id: assetId,
      householdId: homeId,
      ownerUserId: ownerId,
      kind: "image",
      provider: "r2",
      providerKey: "households/home/cats/mugi/asset/original",
      originalFilename: "mugi.jpg",
      mimeType: "image/jpeg",
      byteSize: 5,
      status: "ready",
    },
    {
      id: editorAssetId,
      householdId: homeId,
      ownerUserId: editorId,
      kind: "image",
      provider: "r2",
      providerKey: "households/home/cats/mugi/editor-asset/original",
      originalFilename: "mugi-editor.jpg",
      mimeType: "image/jpeg",
      byteSize: 5,
      status: "ready",
    },
    {
      id: failedAssetId,
      householdId: homeId,
      ownerUserId: ownerId,
      kind: "image",
      provider: "r2",
      providerKey: "households/home/cats/mugi/failed-asset/original",
      originalFilename: "mugi-failed.jpg",
      mimeType: "image/jpeg",
      byteSize: 5,
      status: "pending",
    },
    {
      id: editorEntryAssetId,
      householdId: homeId,
      ownerUserId: editorId,
      kind: "image",
      provider: "r2",
      purpose: "entry",
      providerKey: "households/home/cats/mugi/editor-entry/original",
      originalFilename: "entry.jpg",
      mimeType: "image/jpeg",
      byteSize: 5,
      status: "ready",
    },
  ]);
});

describe("authorization integration", () => {
  it("requires authentication before reading household cats", async () => {
    const response = await getCats(request("/api/cats"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("lets editors read cats but reserves profile mutation for owners", async () => {
    setViewer(editorId, homeId);
    expect((await getCats(request("/api/cats"))).status).toBe(200);
    expect(
      (
        await createCat(
          request("/api/cats", "POST", {
            name: "Kome",
            nickname: "",
            birthPrecision: "unknown",
            lifeStatus: "living",
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await updateCat(request(`/api/cats/${catId}`, "PUT", catProfile()), {
          params: Promise.resolve({ catId }),
        })
      ).status,
    ).toBe(403);
  });

  it("lets owners mutate their cats without exposing another household", async () => {
    setViewer(ownerId, homeId);
    expect(
      (
        await updateCat(request(`/api/cats/${catId}`, "PUT", catProfile()), {
          params: Promise.resolve({ catId }),
        })
      ).status,
    ).toBe(200);
    expect(
      (
        await updateCat(
          request(`/api/cats/${outsiderCatId}`, "PUT", catProfile()),
          { params: Promise.resolve({ catId: outsiderCatId }) },
        )
      ).status,
    ).toBe(404);
  });

  it("allows private media only to active household members", async () => {
    setViewer(editorId, homeId);
    const allowed = await getMedia(request(`/api/media/${assetId}`), {
      params: Promise.resolve({ assetId }),
    });
    expect(allowed.status).toBe(200);
    expect((await allowed.arrayBuffer()).byteLength).toBe(5);
    const entryImage = await getMedia(
      request(`/api/media/${editorEntryAssetId}?variant=entry`),
      { params: Promise.resolve({ assetId: editorEntryAssetId }) },
    );
    expect(entryImage.status).toBe(200);
    const wrongVariant = await getMedia(
      request(`/api/media/${editorEntryAssetId}?variant=profile`),
      { params: Promise.resolve({ assetId: editorEntryAssetId }) },
    );
    expect(wrongVariant.status).toBe(400);

    setViewer(outsiderId, outsiderHomeId);
    const denied = await getMedia(request(`/api/media/${assetId}`), {
      params: Promise.resolve({ assetId }),
    });
    expect(denied.status).toBe(403);

    setViewer(revokedId, homeId);
    const revoked = await getMedia(request(`/api/media/${assetId}`), {
      params: Promise.resolve({ assetId }),
    });
    expect(revoked.status).toBe(403);
  });

  it("prevents editors from replacing the cat profile image", async () => {
    setViewer(editorId, homeId);
    const denied = await presignProfileImage(
      request("/api/uploads/images/presign", "POST", {
        catId,
        contentType: "image/jpeg",
        byteSize: 1024,
        fileName: "mugi.jpg",
      }),
    );
    expect(denied.status).toBe(403);
    expect(
      (
        await completeProfileImage(
          request(`/api/uploads/images/${editorAssetId}/complete`, "POST"),
          { params: Promise.resolve({ assetId: editorAssetId }) },
        )
      ).status,
    ).toBe(403);

    setViewer(ownerId, homeId);
    const ownerPassedAuthorization = await presignProfileImage(
      request("/api/uploads/images/presign", "POST", {
        catId,
        contentType: "image/jpeg",
        byteSize: 1024,
        fileName: "mugi.jpg",
      }),
    );
    expect(ownerPassedAuthorization.status).toBe(503);
    const failed = await completeProfileImage(
      request(`/api/uploads/images/${failedAssetId}/complete`, "POST"),
      { params: Promise.resolve({ assetId: failedAssetId }) },
    );
    expect(failed.status).toBe(422);
    const notification = await db.query.notifications.findFirst();
    expect(notification).toMatchObject({
      recipientUserId: ownerId,
      type: "upload_failed",
      resourceId: failedAssetId,
    });
  });

  it("lets active household members create private records", async () => {
    setViewer(editorId, homeId);
    const created = await createEntry(
      request("/api/entries", "POST", {
        title: "夕方の窓辺",
        body: "風を見ていた。",
        occurredDate: "2026-07-15",
        catIds: [catId],
        assetIds: [editorEntryAssetId],
        tags: ["窓辺", "夕方"],
      }),
    );
    expect(created.status).toBe(201);
    const result = (await created.json()) as { entryId: string };
    expect(await db.query.entries.findFirst()).toMatchObject({
      id: result.entryId,
      householdId: homeId,
      authorUserId: editorId,
      status: "ready",
    });
    expect(await db.select().from(entryCats)).toHaveLength(1);
    expect(await db.select().from(entryMedia)).toHaveLength(1);
    expect(await db.select().from(entryTags)).toHaveLength(2);

    setViewer(outsiderId, outsiderHomeId);
    const denied = await createEntry(
      request("/api/entries", "POST", {
        body: "見えない記録",
        occurredDate: "2026-07-15",
        catIds: [catId],
        assetIds: [],
        tags: [],
      }),
    );
    expect(denied.status).toBe(400);
  });

  it("allows editors to prepare entry photos without profile access", async () => {
    setViewer(editorId, homeId);
    const presign = await presignProfileImage(
      request("/api/uploads/images/presign", "POST", {
        purpose: "entry",
        catId,
        contentType: "image/jpeg",
        byteSize: 1024,
        fileName: "entry.jpg",
      }),
    );
    expect(presign.status).toBe(503);
    const completion = await completeProfileImage(
      request(`/api/uploads/images/${editorEntryAssetId}/complete`, "POST"),
      { params: Promise.resolve({ assetId: editorEntryAssetId }) },
    );
    expect(completion.status).toBe(422);
  });

  it("allows household switching only for active memberships", async () => {
    setViewer(editorId, homeId);
    expect(
      (await getHouseholds(request("/api/households/active"))).status,
    ).toBe(200);
    expect(
      (
        await switchHousehold(
          request("/api/households/active", "PUT", {
            householdId: outsiderHomeId,
          }),
        )
      ).status,
    ).toBe(403);

    setViewer(outsiderId, outsiderHomeId);
    expect(
      (
        await switchHousehold(
          request("/api/households/active", "PUT", { householdId: homeId }),
        )
      ).status,
    ).toBe(403);
  });

  it("reserves invitation management for the household owner", async () => {
    setViewer(editorId, homeId);
    const editorList = await getInvites(request("/api/household-invites"));
    expect(editorList.status).toBe(200);
    expect(await editorList.json()).toMatchObject({
      canInvite: false,
      invites: [],
    });
    expect(
      (await createInvite(request("/api/household-invites", "POST"))).status,
    ).toBe(403);

    setViewer(ownerId, homeId);
    const created = await createInvite(
      request("/api/household-invites", "POST"),
    );
    expect(created.status).toBe(201);
    expect(await created.json()).toMatchObject({
      inviteUrl: expect.stringMatching(/^https:\/\/example\.test\/invite\//),
    });
  });
});

function request(path: string, method = "GET", body?: object) {
  return new Request(`https://example.test${path}`, {
    method,
    headers: body ? { "content-type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
}

function catProfile() {
  return {
    name: "Mugi updated",
    nickname: "",
    birthPrecision: "unknown",
    lifeStatus: "living",
  };
}

function setViewer(userId: string, householdId: string) {
  viewerState.current = {
    db,
    session: { user: { id: userId } },
    household: { id: householdId },
    env: {
      DB: env.DB,
      MEDIA: {
        head: async () => null,
        get: async () => ({
          body: new Response("image").body,
          writeHttpMetadata: (headers: Headers) =>
            headers.set("content-type", "image/jpeg"),
        }),
        delete: async () => undefined,
      },
    },
  };
}

async function clearDatabase() {
  for (const table of [
    "notifications",
    "household_invites",
    "entry_tags",
    "tags",
    "entry_media",
    "entry_cats",
    "entries",
    "media_assets",
    "cats",
    "household_members",
    "households",
    "user_preferences",
    "user",
  ]) {
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  }
}
