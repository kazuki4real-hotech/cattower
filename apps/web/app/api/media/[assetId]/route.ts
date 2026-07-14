import { mediaAssets } from "@cattower/db";
import { and, eq } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

export async function GET(request: Request, context: { params: Promise<{ assetId: string }> }) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const { assetId } = await context.params;
  const asset = await viewer.db.query.mediaAssets.findFirst({
    where: and(eq(mediaAssets.id, assetId), eq(mediaAssets.status, "ready")),
  });
  if (!asset) return Response.json({ error: "asset_not_found" }, { status: 404 });
  const membership = await requireActiveMembership(viewer.db, viewer.session.user.id, asset.householdId);
  if (!membership) return Response.json({ error: "forbidden" }, { status: 403 });

  const object = await viewer.env.MEDIA.get(asset.providerKey);
  if (!object) return Response.json({ error: "object_not_found" }, { status: 404 });
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, no-store");
  headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(object.body, { headers });
}
