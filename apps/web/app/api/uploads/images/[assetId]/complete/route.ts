import { cats, mediaAssets } from "@cattower/db";
import {
  ENTRY_IMAGE_MAX_WIDTH,
  ENTRY_IMAGE_MIME_TYPE,
  getEntryImageDerivativeKey,
  getProfileImageDerivativeKey,
  MAX_IMAGE_BYTES,
  PROFILE_IMAGE_MIME_TYPE,
  PROFILE_IMAGE_SIZE,
} from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { createNotification } from "@/lib/notifications";
import { getViewer } from "@/lib/viewer";

async function post(
  request: Request,
  context: { params: Promise<{ assetId: string }> },
) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { assetId } = await context.params;
  const asset = await viewer.db.query.mediaAssets.findFirst({
    where: and(
      eq(mediaAssets.id, assetId),
      eq(mediaAssets.ownerUserId, viewer.session.user.id),
    ),
  });
  if (!asset || asset.provider !== "r2" || asset.kind !== "image")
    return Response.json({ error: "asset_not_found" }, { status: 404 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    asset.householdId,
  );
  if (
    !membership ||
    (asset.purpose === "profile" && membership.role !== "owner")
  )
    return Response.json({ error: "forbidden" }, { status: 403 });

  const head = await viewer.env.MEDIA.head(asset.providerKey);
  const contentType = head?.httpMetadata?.contentType;
  const validMetadata =
    head &&
    head.size > 0 &&
    head.size <= MAX_IMAGE_BYTES &&
    contentType === asset.mimeType &&
    head.customMetadata?.["asset-id"] === asset.id;
  if (!validMetadata) {
    return failUpload(viewer.db, asset, "uploaded_object_mismatch", 422);
  }

  const object = await viewer.env.MEDIA.get(asset.providerKey);
  if (!object)
    return failUpload(viewer.db, asset, "uploaded_object_missing", 404);
  const images = viewer.env.IMAGES;
  if (!images) {
    return failUpload(viewer.db, asset, "image_processing_not_configured", 503);
  }

  const derivativeKey =
    asset.purpose === "entry"
      ? getEntryImageDerivativeKey(asset.providerKey)
      : getProfileImageDerivativeKey(asset.providerKey);
  try {
    const originalBytes = await object.arrayBuffer();
    const infoStream = new Response(originalBytes).body;
    const transformStream = new Response(originalBytes).body;
    if (!infoStream || !transformStream)
      throw new Error("invalid_image_stream");

    const info = await images.info(infoStream);
    if (
      info.format === "image/svg+xml" ||
      !("width" in info) ||
      info.width < 1 ||
      info.height < 1
    )
      throw new Error("invalid_image");

    const transformer = images.input(transformStream);
    const derivative = await (
      asset.purpose === "entry"
        ? transformer.transform({
            width: ENTRY_IMAGE_MAX_WIDTH,
            fit: "scale-down",
          })
        : transformer.transform({
            width: PROFILE_IMAGE_SIZE,
            height: PROFILE_IMAGE_SIZE,
            fit: "cover",
            gravity: "auto",
          })
    ).output({
      format:
        asset.purpose === "entry"
          ? ENTRY_IMAGE_MIME_TYPE
          : PROFILE_IMAGE_MIME_TYPE,
      quality: 82,
      anim: false,
    });
    const derivativeResponse = derivative.response();
    if (!derivativeResponse.ok) throw new Error("derivative_failed");
    await viewer.env.MEDIA.put(
      derivativeKey,
      await derivativeResponse.arrayBuffer(),
      {
        httpMetadata: {
          contentType:
            asset.purpose === "entry"
              ? ENTRY_IMAGE_MIME_TYPE
              : PROFILE_IMAGE_MIME_TYPE,
        },
        customMetadata: { "asset-id": asset.id, variant: asset.purpose },
      },
    );

    await viewer.db
      .update(mediaAssets)
      .set({
        status: "ready",
        byteSize: head.size,
        mimeType: contentType,
        width: info.width,
        height: info.height,
        updatedAt: new Date(),
      })
      .where(eq(mediaAssets.id, asset.id));

    const catId = asset.providerKey.split("/")[3];
    if (asset.purpose === "profile" && catId) {
      await viewer.db
        .update(cats)
        .set({ profileAssetId: asset.id, updatedAt: new Date() })
        .where(
          and(eq(cats.id, catId), eq(cats.householdId, asset.householdId)),
        );
    }
    await createUploadNotification(viewer.db, asset, "ready");
    return Response.json({ ok: true, width: info.width, height: info.height });
  } catch {
    await viewer.env.MEDIA.delete(derivativeKey).catch(() => undefined);
    return failUpload(viewer.db, asset, "image_processing_failed", 422);
  }
}

async function failUpload(
  db: Parameters<typeof createNotification>[0],
  asset: typeof mediaAssets.$inferSelect,
  error: string,
  status: number,
) {
  await db
    .update(mediaAssets)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(mediaAssets.id, asset.id));
  await createUploadNotification(db, asset, "failed");
  return Response.json({ error }, { status });
}

async function createUploadNotification(
  db: Parameters<typeof createNotification>[0],
  asset: typeof mediaAssets.$inferSelect,
  outcome: "ready" | "failed",
) {
  await createNotification(db, {
    recipientUserId: asset.ownerUserId,
    type: outcome === "ready" ? "upload_ready" : "upload_failed",
    title:
      outcome === "ready"
        ? asset.purpose === "entry"
          ? "記録の写真を準備できました"
          : "写真の準備ができました"
        : "写真を設定できませんでした",
    message:
      outcome === "ready"
        ? asset.purpose === "entry"
          ? "記録に写真を追加できるようになりました。"
          : "猫のプロフィール写真を表示できるようになりました。"
        : "画像を確認できませんでした。別の写真でお試しください。",
    dedupeKey: `upload_${outcome}:${asset.id}`,
    resourceType: "media_asset",
    resourceId: asset.id,
  }).catch(() => null);
}

export const POST = instrumentRequestHandler(
  {
    service: "cattower-web",
    route: "/api/uploads/images/:assetId/complete",
  },
  post,
);
