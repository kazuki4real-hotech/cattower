import { cats, mediaAssets, tags } from "@cattower/db";
import { canPerformEntryAction, validateEntryInput } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, eq, inArray } from "drizzle-orm";

import { requireActiveMembership } from "@/lib/foundation";
import { getViewer } from "@/lib/viewer";

async function post(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const membership = await requireActiveMembership(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  if (
    !membership ||
    !canPerformEntryAction({
      action: "create",
      membership,
      actorUserId: viewer.session.user.id,
    })
  )
    return Response.json({ error: "forbidden" }, { status: 403 });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  const input = body ? validateEntryInput(body) : null;
  if (!input) return Response.json({ error: "invalid_entry" }, { status: 400 });

  const catRows = await viewer.db
    .select({ id: cats.id })
    .from(cats)
    .where(
      and(
        eq(cats.householdId, viewer.household.id),
        inArray(cats.id, input.catIds),
      ),
    );
  if (catRows.length !== input.catIds.length)
    return Response.json({ error: "invalid_cats" }, { status: 400 });

  if (input.assetIds.length) {
    const assetRows = await viewer.db
      .select({ id: mediaAssets.id })
      .from(mediaAssets)
      .where(
        and(
          inArray(mediaAssets.id, input.assetIds),
          eq(mediaAssets.householdId, viewer.household.id),
          eq(mediaAssets.ownerUserId, viewer.session.user.id),
          eq(mediaAssets.purpose, "entry"),
          eq(mediaAssets.status, "ready"),
        ),
      );
    if (assetRows.length !== input.assetIds.length)
      return Response.json({ error: "invalid_media" }, { status: 400 });
  }

  for (const tag of input.tags) {
    await viewer.db
      .insert(tags)
      .values({
        id: crypto.randomUUID(),
        householdId: viewer.household.id,
        name: tag.name,
        normalizedName: tag.normalizedName,
      })
      .onConflictDoNothing({
        target: [tags.householdId, tags.normalizedName],
      });
  }
  const tagRows = input.tags.length
    ? await viewer.db
        .select({ id: tags.id, normalizedName: tags.normalizedName })
        .from(tags)
        .where(
          and(
            eq(tags.householdId, viewer.household.id),
            inArray(
              tags.normalizedName,
              input.tags.map((tag) => tag.normalizedName),
            ),
          ),
        )
    : [];

  const entryId = crypto.randomUUID();
  const now = Date.now();
  const statements: D1PreparedStatement[] = [
    viewer.env.DB.prepare(
      "INSERT INTO entries (id, household_id, primary_cat_id, author_user_id, title, body, occurred_at, occurred_precision, status, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'day', 'ready', 1, ?, ?)",
    ).bind(
      entryId,
      viewer.household.id,
      input.catIds[0],
      viewer.session.user.id,
      input.title,
      input.body,
      input.occurredAt.valueOf(),
      now,
      now,
    ),
    ...input.catIds.map((catId, index) =>
      viewer.env.DB.prepare(
        "INSERT INTO entry_cats (entry_id, cat_id, sort_order) VALUES (?, ?, ?)",
      ).bind(entryId, catId, index),
    ),
    ...input.assetIds.map((assetId, index) =>
      viewer.env.DB.prepare(
        "INSERT INTO entry_media (entry_id, media_asset_id, role, sort_order) VALUES (?, ?, ?, ?)",
      ).bind(entryId, assetId, index === 0 ? "primary" : "gallery", index),
    ),
    ...tagRows.map((tag) =>
      viewer.env.DB.prepare(
        "INSERT INTO entry_tags (entry_id, tag_id) VALUES (?, ?)",
      ).bind(entryId, tag.id),
    ),
  ];
  await viewer.env.DB.batch(statements);

  return Response.json({ ok: true, entryId }, { status: 201 });
}

export const POST = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/entries" },
  post,
);
