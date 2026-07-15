import {
  householdInvites,
  households,
  type CattowerDatabase,
} from "@cattower/db";
import { hashInviteToken } from "@cattower/domain";
import { eq } from "drizzle-orm";

export async function getInvite(db: CattowerDatabase, token: string) {
  const tokenHash = await hashInviteToken(token);
  if (!tokenHash) return null;
  const [result] = await db
    .select({ invite: householdInvites, householdName: households.name })
    .from(householdInvites)
    .innerJoin(households, eq(households.id, householdInvites.householdId))
    .where(eq(householdInvites.tokenHash, tokenHash))
    .limit(1);
  return result ?? null;
}

export function inviteState(
  invite: { expiresAt: Date; acceptedAt: Date | null; revokedAt: Date | null },
  now = new Date(),
) {
  if (invite.revokedAt) return "revoked" as const;
  if (invite.acceptedAt) return "accepted" as const;
  if (invite.expiresAt <= now) return "expired" as const;
  return "active" as const;
}
