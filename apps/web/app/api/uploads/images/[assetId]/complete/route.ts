import { cats, mediaAssets } from "@cattower/db";
import { MAX_IMAGE_BYTES } from "@cattower/domain";
import { and, eq } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

export async function POST(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { assetId } = await context.params;
  const asset = await viewer.db.query.mediaAssets.findFirst({
    where: and(eq(mediaAssets.id, assetId), eq(mediaAssets.ownerUserId, viewer.session.user.id)),
  });
  if (!asset || asset.provider !== "r2" || asset.kind !== "image") return Response.json({ error: "asset_not_found" }, { status: 404 });
  const membership = await requireActiveMembership(viewer.db, viewer.session.user.id, asset.householdId);
  if (!membership) return Response.json({ error: "forbidden" }, { status: 403 });

  const head = await viewer.env.MEDIA.head(asset.providerKey);
  const contentType = head?.httpMetadata?.contentType;
  const validMetadata =
    head &&
    head.size > 0 &&
    head.size <= MAX_IMAGE_BYTES &&
    contentType === asset.mimeType &&
    head.customMetadata?.["asset-id"] === asset.id;
  if (!validMetadata) {
    await viewer.db.update(mediaAssets).set({ status: "failed", updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
    return Response.json({ error: "uploaded_object_mismatch" }, { status: 422 });
  }

  const object = await viewer.env.MEDIA.get(asset.providerKey);
  if (!object) return Response.json({ error: "uploaded_object_missing" }, { status: 404 });

  try {
    const info = await viewer.env.IMAGES!.info(object.body);
    if (info.format === "image/svg+xml" || !("width" in info) || info.width < 1 || info.height < 1) throw new Error("invalid_image");

    await viewer.db
      .update(mediaAssets)
      .set({ status: "ready", byteSize: head.size, mimeType: contentType, width: info.width, height: info.height, updatedAt: new Date() })
      .where(eq(mediaAssets.id, asset.id));

    const catId = asset.providerKey.split("/")[3];
    if (catId) {
      await viewer.db
        .update(cats)
        .set({ profileAssetId: asset.id, updatedAt: new Date() })
        .where(and(eq(cats.id, catId), eq(cats.householdId, asset.householdId)));
    }
    return Response.json({ ok: true, width: info.width, height: info.height });
  } catch {
    await viewer.db.update(mediaAssets).set({ status: "failed", updatedAt: new Date() }).where(eq(mediaAssets.id, asset.id));
    return Response.json({ error: "image_decode_failed" }, { status: 422 });
  }
}
