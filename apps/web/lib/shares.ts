import {
  boardItems,
  boards,
  cats,
  entries,
  entryCats,
  entryMedia,
  entryTags,
  households,
  mediaAssets,
  shareLinks,
  shareRateLimits,
  tags,
  user,
  type CattowerDatabase,
} from "@cattower/db";
import {
  canPerformBoardAction,
  canPerformEntryAction,
  createShareRateLimitKey,
  hashShareToken,
  SHARE_ACCESS_WINDOW_LIMIT,
  SHARE_ACCESS_WINDOW_MS,
} from "@cattower/domain";
import { and, asc, desc, eq, gt, inArray, isNull, lte, sql } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

type Viewer = NonNullable<Awaited<ReturnType<typeof getViewer>>>;
export type ShareResourceType = "entry" | "board";

export async function getManageableShareResource(
  viewer: Viewer,
  resourceType: ShareResourceType,
  resourceId: string,
) {
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (!membership) return null;
  if (resourceType === "entry") {
    const entry = await viewer.db.query.entries.findFirst({
      where: and(
        eq(entries.id, resourceId),
        eq(entries.householdId, viewer.household.id),
        eq(entries.status, "ready"),
        isNull(entries.deletedAt),
      ),
    });
    if (
      !entry ||
      !canPerformEntryAction({
        action: "edit",
        membership,
        actorUserId: viewer.session.user.id,
        authorUserId: entry.authorUserId,
      })
    )
      return null;
    return { resourceType, resourceId, householdId: entry.householdId };
  }
  const board = await viewer.db.query.boards.findFirst({
    where: and(
      eq(boards.id, resourceId),
      eq(boards.householdId, viewer.household.id),
    ),
  });
  if (
    !board ||
    !canPerformBoardAction({
      action: "edit",
      membership,
      actorUserId: viewer.session.user.id,
      creatorUserId: board.createdBy,
    })
  )
    return null;
  return { resourceType, resourceId, householdId: board.householdId };
}

export async function listResourceShares(
  viewer: Viewer,
  resourceType: ShareResourceType,
  resourceId: string,
) {
  const access = await getManageableShareResource(
    viewer,
    resourceType,
    resourceId,
  );
  if (!access) return null;
  const rows = await viewer.db.query.shareLinks.findMany({
    where: and(
      eq(shareLinks.householdId, access.householdId),
      eq(shareLinks.resourceType, resourceType),
      eq(shareLinks.resourceId, resourceId),
    ),
    orderBy: desc(shareLinks.createdAt),
    limit: 20,
  });
  return rows.map(serializeShareLink);
}

export function serializeShareLink(link: typeof shareLinks.$inferSelect) {
  const now = Date.now();
  return {
    id: link.id,
    createdAt: link.createdAt.toISOString(),
    expiresAt: link.expiresAt.toISOString(),
    revokedAt: link.revokedAt?.toISOString() ?? null,
    state: link.revokedAt
      ? ("revoked" as const)
      : link.expiresAt.valueOf() <= now
        ? ("expired" as const)
        : ("active" as const),
  };
}

export async function getShareByToken(
  db: CattowerDatabase,
  token: string,
  now = new Date(),
) {
  const tokenHash = await hashShareToken(token);
  if (!tokenHash) return null;
  const [row] = await db
    .select({ share: shareLinks, household: households })
    .from(shareLinks)
    .innerJoin(households, eq(households.id, shareLinks.householdId))
    .where(
      and(
        eq(shareLinks.tokenHash, tokenHash),
        isNull(shareLinks.revokedAt),
        isNull(households.deletionRequestedAt),
        gt(shareLinks.expiresAt, now),
      ),
    )
    .limit(1);
  return row ? { ...row.share, tokenHash } : null;
}

export async function getSharedResource(
  db: CattowerDatabase,
  token: string,
  now = new Date(),
) {
  const share = await getShareByToken(db, token, now);
  if (!share) return null;
  const resource =
    share.resourceType === "entry"
      ? await getSharedEntry(db, share.householdId, share.resourceId)
      : await getSharedBoard(db, share.householdId, share.resourceId);
  if (!resource) return null;
  const accessBucket = new Date(
    Math.floor(now.valueOf() / (60 * 60 * 1000)) * 60 * 60 * 1000,
  );
  await db
    .update(shareLinks)
    .set({ lastAccessedAt: accessBucket, updatedAt: now })
    .where(eq(shareLinks.id, share.id));
  return { share, resource };
}

export async function checkShareAccessRateLimit(
  db: CattowerDatabase,
  token: string,
  address: string,
  now = new Date(),
) {
  const tokenHash = await hashShareToken(token);
  if (!tokenHash) return { allowed: false as const, invalid: true as const };
  const windowStartedAt =
    Math.floor(now.valueOf() / SHARE_ACCESS_WINDOW_MS) * SHARE_ACCESS_WINDOW_MS;
  const keyHash = await createShareRateLimitKey({
    tokenHash,
    address,
    windowStartedAt,
  });
  const expiresAt = new Date(windowStartedAt + SHARE_ACCESS_WINDOW_MS * 2);
  const [row] = await db
    .insert(shareRateLimits)
    .values({
      keyHash,
      windowStartedAt: new Date(windowStartedAt),
      requestCount: 1,
      expiresAt,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: shareRateLimits.keyHash,
      set: {
        requestCount: sql`${shareRateLimits.requestCount} + 1`,
        updatedAt: now,
      },
    })
    .returning({ requestCount: shareRateLimits.requestCount });
  await cleanupShareRateLimits(db, now);
  return {
    allowed:
      (row?.requestCount ?? SHARE_ACCESS_WINDOW_LIMIT + 1) <=
      SHARE_ACCESS_WINDOW_LIMIT,
    invalid: false as const,
  };
}

export async function cleanupShareRateLimits(
  db: CattowerDatabase,
  now = new Date(),
) {
  const expired = await db
    .select({ keyHash: shareRateLimits.keyHash })
    .from(shareRateLimits)
    .where(lte(shareRateLimits.expiresAt, now))
    .limit(100);
  if (!expired.length) return 0;
  const removed = await db
    .delete(shareRateLimits)
    .where(
      inArray(
        shareRateLimits.keyHash,
        expired.map((row) => row.keyHash),
      ),
    )
    .returning({ keyHash: shareRateLimits.keyHash });
  return removed.length;
}

export async function getSharedMediaAsset(
  db: CattowerDatabase,
  share: NonNullable<Awaited<ReturnType<typeof getShareByToken>>>,
  assetId: string,
) {
  const scope = and(
    eq(mediaAssets.id, assetId),
    eq(mediaAssets.householdId, share.householdId),
    eq(mediaAssets.status, "ready"),
    eq(mediaAssets.purpose, "entry"),
  );
  if (share.resourceType === "entry") {
    const [asset] = await db
      .select({ asset: mediaAssets })
      .from(entryMedia)
      .innerJoin(mediaAssets, eq(mediaAssets.id, entryMedia.mediaAssetId))
      .innerJoin(entries, eq(entries.id, entryMedia.entryId))
      .where(
        and(
          scope,
          eq(entryMedia.entryId, share.resourceId),
          eq(entries.status, "ready"),
          isNull(entries.deletedAt),
        ),
      )
      .limit(1);
    return asset?.asset ?? null;
  }
  const [asset] = await db
    .select({ asset: mediaAssets })
    .from(boardItems)
    .innerJoin(entries, eq(entries.id, boardItems.entryId))
    .innerJoin(entryMedia, eq(entryMedia.entryId, entries.id))
    .innerJoin(mediaAssets, eq(mediaAssets.id, entryMedia.mediaAssetId))
    .where(
      and(
        scope,
        eq(boardItems.boardId, share.resourceId),
        eq(entries.status, "ready"),
        isNull(entries.deletedAt),
      ),
    )
    .limit(1);
  return asset?.asset ?? null;
}

async function getSharedEntry(
  db: CattowerDatabase,
  householdId: string,
  entryId: string,
) {
  const entry = await db.query.entries.findFirst({
    where: and(
      eq(entries.id, entryId),
      eq(entries.householdId, householdId),
      eq(entries.status, "ready"),
      isNull(entries.deletedAt),
    ),
  });
  if (!entry) return null;
  const [hydrated] = await hydrateSharedEntries(db, [entry]);
  return hydrated ? { type: "entry" as const, entry: hydrated } : null;
}

async function getSharedBoard(
  db: CattowerDatabase,
  householdId: string,
  boardId: string,
) {
  const board = await db.query.boards.findFirst({
    where: and(eq(boards.id, boardId), eq(boards.householdId, householdId)),
  });
  if (!board) return null;
  const orderBy =
    board.sortMode === "manual"
      ? [asc(boardItems.sortKey)]
      : board.sortMode === "newest"
        ? [desc(entries.occurredAt), desc(entries.createdAt)]
        : [asc(entries.occurredAt), asc(entries.createdAt)];
  const rows = await db
    .select({ entry: entries })
    .from(boardItems)
    .innerJoin(entries, eq(entries.id, boardItems.entryId))
    .where(
      and(
        eq(boardItems.boardId, board.id),
        eq(entries.householdId, householdId),
        eq(entries.status, "ready"),
        isNull(entries.deletedAt),
      ),
    )
    .orderBy(...orderBy);
  return {
    type: "board" as const,
    board: { id: board.id, name: board.name },
    entries: await hydrateSharedEntries(
      db,
      rows.map((row) => row.entry),
    ),
  };
}

async function hydrateSharedEntries(
  db: CattowerDatabase,
  rows: Array<typeof entries.$inferSelect>,
) {
  if (!rows.length) return [];
  const ids = rows.map((entry) => entry.id);
  const [catRows, mediaRows, tagRows, authorRows] = await Promise.all([
    db
      .select({ entryId: entryCats.entryId, name: cats.name })
      .from(entryCats)
      .innerJoin(cats, eq(cats.id, entryCats.catId))
      .where(inArray(entryCats.entryId, ids))
      .orderBy(entryCats.sortOrder),
    db
      .select({
        entryId: entryMedia.entryId,
        assetId: mediaAssets.id,
        width: mediaAssets.width,
        height: mediaAssets.height,
      })
      .from(entryMedia)
      .innerJoin(mediaAssets, eq(mediaAssets.id, entryMedia.mediaAssetId))
      .where(
        and(
          inArray(entryMedia.entryId, ids),
          eq(mediaAssets.status, "ready"),
          eq(mediaAssets.purpose, "entry"),
        ),
      )
      .orderBy(entryMedia.sortOrder),
    db
      .select({ entryId: entryTags.entryId, name: tags.name })
      .from(entryTags)
      .innerJoin(tags, eq(tags.id, entryTags.tagId))
      .where(inArray(entryTags.entryId, ids))
      .orderBy(tags.name),
    db
      .select({ entryId: entries.id, name: user.name })
      .from(entries)
      .innerJoin(user, eq(user.id, entries.authorUserId))
      .where(inArray(entries.id, ids)),
  ]);
  return rows.map((entry) => ({
    id: entry.id,
    title: entry.title,
    body: entry.body,
    occurredDate: entry.occurredAt.toISOString().slice(0, 10),
    cats: catRows
      .filter((row) => row.entryId === entry.id)
      .map((row) => row.name),
    tags: tagRows
      .filter((row) => row.entryId === entry.id)
      .map((row) => row.name),
    media: mediaRows.find((row) => row.entryId === entry.id) ?? null,
    authorName:
      authorRows.find((row) => row.entryId === entry.id)?.name ?? "家族",
  }));
}

export function shareRequestAddress(headers: Headers) {
  const address =
    headers.get("cf-connecting-ip") ??
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return address.slice(0, 80);
}

export function shareSecurityHeaders() {
  return {
    "cache-control": "private, no-store, max-age=0",
    "content-security-policy":
      "default-src 'none'; sandbox; frame-ancestors 'none'",
    "permissions-policy":
      "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "referrer-policy": "no-referrer",
    "x-content-type-options": "nosniff",
    "x-robots-tag": "noindex, nofollow, noarchive",
  };
}
