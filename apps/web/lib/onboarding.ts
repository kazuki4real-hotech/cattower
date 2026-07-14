import { asc, eq } from "drizzle-orm";

import { cats, userPreferences, type CattowerDatabase } from "@cattower/db";

export async function getOnboardingSnapshot(db: CattowerDatabase, userId: string, householdId: string) {
  const [preferences, cat] = await Promise.all([
    db.query.userPreferences.findFirst({ where: eq(userPreferences.userId, userId) }),
    db.query.cats.findFirst({ where: eq(cats.householdId, householdId), orderBy: asc(cats.createdAt) }),
  ]);

  return {
    step: preferences?.onboardingStep ?? 0,
    completed: Boolean(preferences?.onboardingCompletedAt),
    memoryPreferences: parseStringArray(preferences?.memoryPreferencesJson),
    cat: cat ? { id: cat.id, name: cat.name, themeColor: cat.themeColor, profileAssetId: cat.profileAssetId } : null,
  };
}

function parseStringArray(value: string | undefined) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string") ? parsed : [];
  } catch {
    return [];
  }
}
