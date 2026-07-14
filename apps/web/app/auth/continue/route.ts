import { userPreferences } from "@cattower/db";
import { eq, isNull, and } from "drizzle-orm";
import { NextResponse } from "next/server";

import { getOnboardingSnapshot } from "@/lib/onboarding";
import { getOnboardingRoute, sanitizeReturnTo } from "@/lib/onboarding-routes";
import { getViewer } from "@/lib/viewer";

export async function GET(request: Request) {
  const viewer = await getViewer(request.headers);
  if (!viewer) return NextResponse.redirect(new URL("/", request.url));

  const snapshot = await getOnboardingSnapshot(
    viewer.db,
    viewer.session.user.id,
    viewer.household.id,
  );
  const returnTo = sanitizeReturnTo(
    new URL(request.url).searchParams.get("returnTo"),
  );
  const destination = returnTo ?? "/home";

  if (snapshot.completed || snapshot.prompted) {
    return NextResponse.redirect(new URL(destination, request.url));
  }

  await viewer.db
    .update(userPreferences)
    .set({ onboardingPromptedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(userPreferences.userId, viewer.session.user.id),
        isNull(userPreferences.onboardingPromptedAt),
      ),
    );

  const response = NextResponse.redirect(
    new URL(getOnboardingRoute(snapshot.step), request.url),
  );
  if (returnTo) {
    response.cookies.set("cattower_return_to", returnTo, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 2,
    });
  }
  return response;
}
