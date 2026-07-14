import { cats, user, userPreferences, type CattowerDatabase } from "@cattower/db";
import { isCatThemeColor, parseMemoryPreferences } from "@cattower/domain";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const snapshot = await getOnboardingSnapshot(viewer.db, viewer.session.user.id, viewer.household.id);
  return Response.json({ ...snapshot, displayName: viewer.session.user.name });
}

export async function PUT(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body || typeof body.step !== "string") return Response.json({ error: "invalid_request" }, { status: 400 });

  if (body.step === "profile") {
    const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 1 || displayName.length > 50) return Response.json({ error: "invalid_display_name" }, { status: 400 });
    await viewer.db.update(user).set({ name: displayName, updatedAt: new Date() }).where(eq(user.id, viewer.session.user.id));
    await advance(viewer.db, viewer.session.user.id, 1);
    return Response.json({ ok: true });
  }

  if (body.step === "cat") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > 50 || !isCatThemeColor(body.themeColor)) {
      return Response.json({ error: "invalid_cat" }, { status: 400 });
    }
    const existing = await viewer.db.query.cats.findFirst({
      where: and(eq(cats.householdId, viewer.household.id), isNull(cats.archivedAt)),
      orderBy: asc(cats.createdAt),
    });
    const catId = existing?.id ?? crypto.randomUUID();
    if (existing) {
      await viewer.db.update(cats).set({ name, themeColor: body.themeColor, updatedAt: new Date() }).where(eq(cats.id, existing.id));
    } else {
      await viewer.db.insert(cats).values({ id: catId, householdId: viewer.household.id, name, themeColor: body.themeColor });
    }
    await advance(viewer.db, viewer.session.user.id, 2);
    return Response.json({ ok: true, catId });
  }

  if (body.step === "preferences") {
    const preferences = parseMemoryPreferences(body.preferences);
    if (!preferences) return Response.json({ error: "invalid_preferences" }, { status: 400 });
    await viewer.db
      .update(userPreferences)
      .set({ memoryPreferencesJson: JSON.stringify(preferences), onboardingStep: sql`max(${userPreferences.onboardingStep}, 3)`, updatedAt: new Date() })
      .where(eq(userPreferences.userId, viewer.session.user.id));
    return Response.json({ ok: true });
  }

  if (body.step === "complete") {
    const cat = await viewer.db.query.cats.findFirst({ where: eq(cats.householdId, viewer.household.id) });
    if (!cat) return Response.json({ error: "cat_required" }, { status: 409 });
    await viewer.db
      .update(userPreferences)
      .set({ onboardingStep: 3, onboardingCompletedAt: new Date(), updatedAt: new Date() })
      .where(eq(userPreferences.userId, viewer.session.user.id));
    return Response.json({ ok: true });
  }

  return Response.json({ error: "unknown_step" }, { status: 400 });
}

async function advance(db: CattowerDatabase, userId: string, step: number) {
  await db
    .update(userPreferences)
    .set({ onboardingStep: sql`max(${userPreferences.onboardingStep}, ${step})`, updatedAt: new Date() })
    .where(eq(userPreferences.userId, userId));
}
