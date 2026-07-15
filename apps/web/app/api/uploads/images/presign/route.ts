import { cats, mediaAssets } from "@cattower/db";
import { validateImageUpload } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq } from "drizzle-orm";
import { AwsClient } from "aws4fetch";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

const UPLOAD_EXPIRY_SECONDS = 300;

async function post(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.catId !== "string")
    return Response.json({ error: "invalid_request" }, { status: 400 });
  const purpose = body.purpose === "entry" ? "entry" : "profile";
  const validated = validateImageUpload({
    contentType: body.contentType,
    byteSize: body.byteSize,
    fileName: body.fileName,
  });
  if (!validated.ok)
    return Response.json({ error: validated.code }, { status: 400 });

  const cat = await viewer.db.query.cats.findFirst({
    where: and(
      eq(cats.id, body.catId),
      eq(cats.householdId, viewer.household.id),
    ),
  });
  if (!cat) return Response.json({ error: "cat_not_found" }, { status: 404 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    cat.householdId,
  );
  if (!membership || (purpose === "profile" && membership.role !== "owner"))
    return Response.json({ error: "forbidden" }, { status: 403 });

  if (!viewer.env.R2_ACCESS_KEY_ID || !viewer.env.R2_SECRET_ACCESS_KEY) {
    return Response.json(
      { error: "upload_signing_not_configured" },
      { status: 503 },
    );
  }

  const assetId = crypto.randomUUID();
  const providerKey = `households/${cat.householdId}/cats/${cat.id}/${assetId}/original`;
  const uploadUrl = new URL(
    `https://${viewer.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${viewer.env.R2_BUCKET_NAME}/${providerKey}`,
  );
  uploadUrl.searchParams.set("X-Amz-Expires", String(UPLOAD_EXPIRY_SECONDS));

  const headers = {
    "Content-Type": validated.contentType,
    "x-amz-meta-asset-id": assetId,
  };
  const signer = new AwsClient({
    accessKeyId: viewer.env.R2_ACCESS_KEY_ID,
    secretAccessKey: viewer.env.R2_SECRET_ACCESS_KEY,
    service: "s3",
    region: "auto",
  });
  const signed = await signer.sign(uploadUrl, {
    method: "PUT",
    headers,
    aws: { signQuery: true },
  });

  await viewer.db.insert(mediaAssets).values({
    id: assetId,
    householdId: cat.householdId,
    ownerUserId: viewer.session.user.id,
    kind: "image",
    provider: "r2",
    purpose,
    providerKey,
    originalFilename: validated.fileName,
    mimeType: validated.contentType,
    byteSize: validated.byteSize,
    status: "pending",
  });

  return Response.json({
    assetId,
    uploadUrl: signed.url,
    method: "PUT",
    headers,
    expiresIn: UPLOAD_EXPIRY_SECONDS,
  });
}

export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/uploads/images/presign" },
  post,
);
