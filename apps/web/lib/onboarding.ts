import { asc, eq } from "drizzle-orm";

import { cats, userPreferences, type CattowerDatabase } from "@cattower/db";

export async function getOnboardingSnapshot(
  db: CattowerDatabase,
  userId: string,
  householdId: string,
) {
  const [preferences, cat] = await Promise.all([
    db.query.userPreferences.findFirst({
      where: eq(userPreferences.userId, userId),
    }),
    db.query.cats.findFirst({
      where: eq(cats.householdId, householdId),
      orderBy: asc(cats.createdAt),
    }),
  ]);

  return {
    step: preferences?.onboardingStep ?? 0,
    prompted: Boolean(preferences?.onboardingPromptedAt),
    completed: Boolean(preferences?.onboardingCompletedAt),
    cat: cat
      ? {
          id: cat.id,
          name: cat.name,
          themeColor: cat.themeColor,
          profileAssetId: cat.profileAssetId,
        }
      : null,
  };
}
