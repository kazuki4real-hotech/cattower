import { and, eq } from "drizzle-orm";

import {
  householdMembers,
  households,
  userPreferences,
  type CattowerDatabase,
} from "@cattower/db";

export async function ensureUserFoundation(
  db: CattowerDatabase,
  userId: string,
  displayName: string,
) {
  await db.insert(userPreferences).values({ userId }).onConflictDoNothing();

  const householdId = crypto.randomUUID();
  await db
    .insert(households)
    .values({
      id: householdId,
      name: `${displayName}の家`,
      ownerUserId: userId,
    })
    .onConflictDoNothing({ target: households.ownerUserId });

  const household = await db.query.households.findFirst({
    where: eq(households.ownerUserId, userId),
  });
  if (!household) throw new Error("household_foundation_failed");

  await db
    .insert(householdMembers)
    .values({
      householdId: household.id,
      userId,
      role: "owner",
      status: "active",
      joinedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: [householdMembers.householdId, householdMembers.userId],
      set: {
        role: "owner",
        status: "active",
        joinedAt: new Date(),
        updatedAt: new Date(),
      },
    });

  const activeMemberships = await db
    .select({ household: households })
    .from(householdMembers)
    .innerJoin(households, eq(households.id, householdMembers.householdId))
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.status, "active"),
      ),
    );
  const preferences = await db.query.userPreferences.findFirst({
    where: eq(userPreferences.userId, userId),
  });
  const active =
    activeMemberships.find(
      ({ household: candidate }) =>
        candidate.id === preferences?.activeHouseholdId,
    )?.household ??
    activeMemberships.find(
      ({ household: candidate }) => candidate.id === household.id,
    )?.household ??
    activeMemberships[0]?.household;
  if (!active) throw new Error("active_household_not_found");
  if (preferences?.activeHouseholdId !== active.id) {
    await db
      .update(userPreferences)
      .set({ activeHouseholdId: active.id, updatedAt: new Date() })
      .where(eq(userPreferences.userId, userId));
  }
  return active;
}

export async function requireActiveMembership(
  db: CattowerDatabase,
  userId: string,
  householdId: string,
) {
  return db.query.householdMembers.findFirst({
    where: and(
      eq(householdMembers.userId, userId),
      eq(householdMembers.householdId, householdId),
      eq(householdMembers.status, "active"),
    ),
  });
}
