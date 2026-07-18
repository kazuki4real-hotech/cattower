import { createDatabase } from "@cattower/db";
import { getEntryImageDerivativeKey } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";

import { getRuntimeEnv } from "@/lib/cloudflare";
import {
  checkShareAccessRateLimit,
  getShareByToken,
  getSharedMediaAsset,
  shareRequestAddress,
  shareSecurityHeaders,
} from "@/lib/shares";

async function get(
  request: Request,
  context: { params: Promise<{ token: string; assetId: string }> },
) {
  const { token, assetId } = await context.params;
  const env = getRuntimeEnv();
  const db = createDatabase(env.DB);
  const rate = await checkShareAccessRateLimit(
    db,
    token,
    shareRequestAddress(request.headers),
  );
  if (!rate.allowed)
    return Response.json(
      { error: rate.invalid ? "not_found" : "rate_limited" },
      {
        status: rate.invalid ? 404 : 429,
        headers: {
          ...shareSecurityHeaders(),
          ...(rate.invalid ? {} : { "retry-after": "60" }),
        },
      },
    );
  const share = await getShareByToken(db, token);
  if (!share)
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: shareSecurityHeaders() },
    );
  const asset = await getSharedMediaAsset(db, share, assetId);
  if (!asset)
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: shareSecurityHeaders() },
    );
  const object = await env.MEDIA.get(
    getEntryImageDerivativeKey(asset.providerKey),
  );
  if (!object)
    return Response.json(
      { error: "not_found" },
      { status: 404, headers: shareSecurityHeaders() },
    );
  const headers = new Headers(shareSecurityHeaders());
  object.writeHttpMetadata(headers);
  headers.set("cache-control", "private, no-store, max-age=0");
  return new Response(object.body, { headers });
}

export const GET = instrumentRequestHandler(
  {
    service: "cattower-web",
    route: "/api/share/:token/media/:assetId",
  },
  get,
);
