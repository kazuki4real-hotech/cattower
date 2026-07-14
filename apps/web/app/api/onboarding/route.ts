import {
  cats,
  user,
  userPreferences,
  type CattowerDatabase,
} from "@cattower/db";
import { isCatThemeColor } from "@cattower/domain";
import { instrumentRequestHandler } from "@cattower/observability";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getOnboardingSnapshot } from "@/lib/onboarding";
import { sanitizeReturnTo } from "@/lib/onboarding-routes";
import { getViewer } from "@/lib/viewer";

async function get(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });
  const snapshot = await getOnboardingSnapshot(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  return Response.json({ ...snapshot, displayName: viewer.session.user.name });
}

async function put(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body || typeof body.step !== "string")
    return Response.json({ error: "invalid_request" }, { status: 400 });

  if (body.step === "profile") {
    const displayName =
      typeof body.displayName === "string" ? body.displayName.trim() : "";
    if (displayName.length < 1 || displayName.length > 50)
      return Response.json({ error: "invalid_display_name" }, { status: 400 });
    await viewer.db
      .update(user)
      .set({ name: displayName, updatedAt: new Date() })
      .where(eq(user.id, viewer.session.user.id));
    await advance(viewer.db, viewer.session.user.id, 1);
    return Response.json({ ok: true });
  }

  if (body.step === "cat") {
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (name.length < 1 || name.length > 50) {
      return Response.json({ error: "invalid_cat" }, { status: 400 });
    }
    const existing = await viewer.db.query.cats.findFirst({
      where: and(
        eq(cats.householdId, viewer.household.id),
        isNull(cats.archivedAt),
      ),
      orderBy: asc(cats.createdAt),
    });
    const catId = existing?.id ?? crypto.randomUUID();
    if (existing) {
      await viewer.db
        .update(cats)
        .set({ name, updatedAt: new Date() })
        .where(eq(cats.id, existing.id));
    } else {
      await viewer.db.insert(cats).values({
        id: catId,
        householdId: viewer.household.id,
        name,
        themeColor: "mint",
      });
    }
    await advance(viewer.db, viewer.session.user.id, 2);
    return Response.json({ ok: true, catId });
  }

  if (body.step === "photo") {
    const cat = await viewer.db.query.cats.findFirst({
      where: and(
        eq(cats.householdId, viewer.household.id),
        isNull(cats.archivedAt),
      ),
    });
    if (!cat) return Response.json({ error: "cat_required" }, { status: 409 });
    await advance(viewer.db, viewer.session.user.id, 3);
    return Response.json({ ok: true });
  }

  if (body.step === "theme") {
    if (!isCatThemeColor(body.themeColor))
      return Response.json({ error: "invalid_theme" }, { status: 400 });
    const cat = await viewer.db.query.cats.findFirst({
      where: and(
        eq(cats.householdId, viewer.household.id),
        isNull(cats.archivedAt),
      ),
    });
    if (!cat) return Response.json({ error: "cat_required" }, { status: 409 });
    await viewer.db
      .update(cats)
      .set({ themeColor: body.themeColor, updatedAt: new Date() })
      .where(eq(cats.id, cat.id));
    await advance(viewer.db, viewer.session.user.id, 4);
    return Response.json({ ok: true });
  }

  if (body.step === "complete") {
    const cat = await viewer.db.query.cats.findFirst({
      where: eq(cats.householdId, viewer.household.id),
    });
    if (!cat) return Response.json({ error: "cat_required" }, { status: 409 });
    const preferences = await viewer.db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, viewer.session.user.id),
    });
    if (!preferences || preferences.onboardingStep < 4)
      return Response.json({ error: "onboarding_incomplete" }, { status: 409 });
    await viewer.db
      .update(userPreferences)
      .set({
        onboardingStep: 4,
        onboardingCompletedAt: preferences.onboardingCompletedAt ?? new Date(),
        updatedAt: new Date(),
      })
      .where(eq(userPreferences.userId, viewer.session.user.id));
    const cookie = request.headers
      .get("cookie")
      ?.split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("cattower_return_to="));
    let cookieDestination: string | null = null;
    try {
      cookieDestination = cookie
        ? sanitizeReturnTo(
            decodeURIComponent(cookie.slice("cattower_return_to=".length)),
          )
        : null;
    } catch {
      cookieDestination = null;
    }
    const destination = cookieDestination ?? "/home";
    const response = NextResponse.json({ ok: true, destination });
    response.cookies.set("cattower_return_to", "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0,
    });
    return response;
  }

  return Response.json({ error: "unknown_step" }, { status: 400 });
}

async function advance(db: CattowerDatabase, userId: string, step: number) {
  await db
    .update(userPreferences)
    .set({
      onboardingStep: sql`max(${userPreferences.onboardingStep}, ${step})`,
      updatedAt: new Date(),
    })
    .where(eq(userPreferences.userId, userId));
}

export const GET = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/onboarding" },
  get,
);
export const PUT = instrumentRequestHandler(
  { service: "cattower-web", route: "/api/onboarding" },
  put,
);
