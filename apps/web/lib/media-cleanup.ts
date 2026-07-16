import {
  getEntryImageDerivativeKey,
  getProfileImageDerivativeKey,
} from "@cattower/domain";

const FAILED_RETENTION_MS = 24 * 60 * 60 * 1000;
const ORPHAN_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const DELETING_RETRY_MS = 60 * 60 * 1000;
export const MEDIA_CLEANUP_BATCH_SIZE = 50;

type CleanupCandidate = {
  id: string;
  providerKey: string;
  status:
    "pending" | "uploaded" | "processing" | "ready" | "failed" | "deleting";
};

export type MediaCleanupResult = {
  scanned: number;
  claimed: number;
  deleted: number;
  failed: number;
};

export async function cleanupOrphanedMedia(
  env: Pick<CloudflareEnv, "DB" | "MEDIA">,
  options: { now?: Date; limit?: number } = {},
): Promise<MediaCleanupResult> {
  const now = options.now ?? new Date();
  const nowMs = now.getTime();
  const limit = Math.min(
    MEDIA_CLEANUP_BATCH_SIZE,
    Math.max(1, options.limit ?? MEDIA_CLEANUP_BATCH_SIZE),
  );
  const candidates = await env.DB.prepare(
    `SELECT ma.id, ma.provider_key AS providerKey, ma.status
       FROM media_assets ma
      WHERE ma.provider = 'r2'
        AND ma.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM cats c WHERE c.profile_asset_id = ma.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM entry_media em WHERE em.media_asset_id = ma.id
        )
        AND (
          (ma.status IN ('pending', 'uploaded', 'processing', 'failed') AND ma.updated_at <= ?)
          OR (ma.status = 'ready' AND ma.updated_at <= ?)
          OR (ma.status = 'deleting' AND ma.updated_at <= ?)
        )
      ORDER BY ma.updated_at ASC, ma.id ASC
      LIMIT ?`,
  )
    .bind(
      nowMs - FAILED_RETENTION_MS,
      nowMs - ORPHAN_RETENTION_MS,
      nowMs - DELETING_RETRY_MS,
      limit,
    )
    .all<CleanupCandidate>();

  const result: MediaCleanupResult = {
    scanned: candidates.results.length,
    claimed: 0,
    deleted: 0,
    failed: 0,
  };

  for (const candidate of candidates.results) {
    const claim = await env.DB.prepare(
      `UPDATE media_assets
          SET status = 'deleting', updated_at = ?
        WHERE id = ?
          AND status = ?
          AND deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM cats c WHERE c.profile_asset_id = media_assets.id
          )
          AND NOT EXISTS (
            SELECT 1 FROM entry_media em WHERE em.media_asset_id = media_assets.id
          )`,
    )
      .bind(nowMs, candidate.id, candidate.status)
      .run();
    if (claim.meta.changes !== 1) continue;
    result.claimed += 1;

    try {
      await env.MEDIA.delete([
        candidate.providerKey,
        getProfileImageDerivativeKey(candidate.providerKey),
        getEntryImageDerivativeKey(candidate.providerKey),
      ]);
      await env.DB.prepare(
        `UPDATE media_assets
            SET deleted_at = ?, updated_at = ?
          WHERE id = ? AND status = 'deleting' AND deleted_at IS NULL`,
      )
        .bind(nowMs, nowMs, candidate.id)
        .run();
      result.deleted += 1;
    } catch {
      await env.DB.prepare(
        `UPDATE media_assets
            SET status = 'failed', updated_at = ?
          WHERE id = ? AND status = 'deleting' AND deleted_at IS NULL`,
      )
        .bind(nowMs, candidate.id)
        .run();
      result.failed += 1;
    }
  }

  return result;
}
