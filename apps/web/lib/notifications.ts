import {
  cats,
  householdMembers,
  mediaAssets,
  notifications,
  shareLinks,
  type CattowerDatabase,
} from "@cattower/db";
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  isNotNull,
  isNull,
  lte,
  or,
} from "drizzle-orm";

export const NOTIFICATION_UNREAD_RETENTION_MS = 90 * 24 * 60 * 60 * 1000;
export const NOTIFICATION_READ_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const SHARE_EXPIRY_NOTICE_WINDOW_MS = 24 * 60 * 60 * 1000;

type NotificationType = typeof notifications.$inferInsert.type;
type NotificationResourceType = NonNullable<
  typeof notifications.$inferInsert.resourceType
>;

export async function createNotification(
  db: CattowerDatabase,
  input: Readonly<{
    recipientUserId: string;
    type: NotificationType;
    title: string;
    message: string;
    dedupeKey: string;
    resourceType?: NotificationResourceType | null;
    resourceId?: string | null;
    expiresAt?: Date | null;
  }>,
  now = new Date(),
) {
  if (
    !input.recipientUserId ||
    !/^[a-z0-9:_-]{1,200}$/.test(input.dedupeKey) ||
    !input.title.trim() ||
    input.title.length > 80 ||
    !input.message.trim() ||
    input.message.length > 240 ||
    Boolean(input.resourceType) !== Boolean(input.resourceId)
  )
    throw new Error("invalid_notification");

  const [created] = await db
    .insert(notifications)
    .values({
      id: crypto.randomUUID(),
      recipientUserId: input.recipientUserId,
      type: input.type,
      resourceType: input.resourceType ?? null,
      resourceId: input.resourceId ?? null,
      payloadJson: JSON.stringify({
        title: input.title.trim(),
        message: input.message.trim(),
      }),
      dedupeKey: input.dedupeKey,
      expiresAt:
        input.expiresAt ??
        new Date(now.valueOf() + NOTIFICATION_UNREAD_RETENTION_MS),
    })
    .onConflictDoNothing({
      target: [notifications.recipientUserId, notifications.dedupeKey],
    })
    .returning({ id: notifications.id });
  return created?.id ?? null;
}

export async function cleanupExpiredNotifications(
  db: CattowerDatabase,
  now = new Date(),
) {
  const expired = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      or(
        lte(notifications.expiresAt, now),
        lte(
          notifications.createdAt,
          new Date(now.valueOf() - NOTIFICATION_UNREAD_RETENTION_MS),
        ),
        and(
          isNotNull(notifications.readAt),
          lte(
            notifications.readAt,
            new Date(now.valueOf() - NOTIFICATION_READ_RETENTION_MS),
          ),
        ),
      ),
    )
    .limit(100);
  if (!expired.length) return 0;
  const removed = await db
    .delete(notifications)
    .where(
      inArray(
        notifications.id,
        expired.map((item) => item.id),
      ),
    )
    .returning({ id: notifications.id });
  return removed.length;
}

export async function createShareExpiryNotifications(
  db: CattowerDatabase,
  userId: string,
  now = new Date(),
) {
  const expiring = await db.query.shareLinks.findMany({
    where: and(
      eq(shareLinks.createdBy, userId),
      isNull(shareLinks.revokedAt),
      gt(shareLinks.expiresAt, now),
      lte(
        shareLinks.expiresAt,
        new Date(now.valueOf() + SHARE_EXPIRY_NOTICE_WINDOW_MS),
      ),
    ),
    orderBy: shareLinks.expiresAt,
    limit: 20,
  });
  const created = await Promise.all(
    expiring.map((share) =>
      createNotification(
        db,
        {
          recipientUserId: userId,
          type: "share_expiring",
          title: "共有リンクの期限が近づいています",
          message:
            share.resourceType === "entry"
              ? "記録の共有リンクが24時間以内に期限切れになります。"
              : "ボードの共有リンクが24時間以内に期限切れになります。",
          resourceType: "household",
          resourceId: share.householdId,
          dedupeKey: `share_expiring:${share.id}`,
          expiresAt: share.expiresAt,
        },
        now,
      ),
    ),
  );
  return created.filter(Boolean).length;
}

export async function getVisibleNotifications(
  db: CattowerDatabase,
  userId: string,
) {
  const rows = await db.query.notifications.findMany({
    where: eq(notifications.recipientUserId, userId),
    orderBy: desc(notifications.createdAt),
    limit: 200,
  });
  const memberships = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.status, "active"),
      ),
    );
  const householdIds = memberships.map((item) => item.householdId);
  const catIds = rows
    .filter((item) => item.resourceType === "cat" && item.resourceId)
    .map((item) => item.resourceId as string);
  const mediaIds = rows
    .filter((item) => item.resourceType === "media_asset" && item.resourceId)
    .map((item) => item.resourceId as string);
  const visibleCats =
    householdIds.length && catIds.length
      ? await db
          .select({ id: cats.id })
          .from(cats)
          .where(
            and(
              inArray(cats.id, catIds),
              inArray(cats.householdId, householdIds),
            ),
          )
      : [];
  const visibleMedia =
    householdIds.length && mediaIds.length
      ? await db
          .select({ id: mediaAssets.id })
          .from(mediaAssets)
          .where(
            and(
              inArray(mediaAssets.id, mediaIds),
              inArray(mediaAssets.householdId, householdIds),
            ),
          )
      : [];
  const householdSet = new Set(householdIds);
  const catSet = new Set(visibleCats.map((item) => item.id));
  const mediaSet = new Set(visibleMedia.map((item) => item.id));

  return rows.filter((item) => {
    if (!item.resourceType) return !item.resourceId;
    if (!item.resourceId) return false;
    if (item.resourceType === "household")
      return householdSet.has(item.resourceId);
    if (item.resourceType === "cat") return catSet.has(item.resourceId);
    if (item.resourceType === "media_asset")
      return mediaSet.has(item.resourceId);
    return false;
  });
}

export async function markNotificationsRead(
  db: CattowerDatabase,
  userId: string,
  input: { all: true } | { ids: string[] },
  now = new Date(),
) {
  const scope = and(
    eq(notifications.recipientUserId, userId),
    isNull(notifications.readAt),
    "all" in input
      ? undefined
      : inArray(notifications.id, [...new Set(input.ids)]),
  );
  const changed = await db
    .update(notifications)
    .set({ readAt: now, updatedAt: now })
    .where(scope)
    .returning({ id: notifications.id });
  return changed.length;
}

export function notificationPayload(payloadJson: string) {
  try {
    const value = JSON.parse(payloadJson) as {
      title?: unknown;
      message?: unknown;
    };
    if (
      typeof value.title === "string" &&
      value.title.length <= 80 &&
      typeof value.message === "string" &&
      value.message.length <= 240
    )
      return { title: value.title, message: value.message };
  } catch {
    return fallbackPayload();
  }
  return fallbackPayload();
}

function fallbackPayload() {
  return {
    title: "お知らせ",
    message: "このお知らせの内容を表示できませんでした。",
  };
}
