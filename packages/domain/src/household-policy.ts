export const ENTRY_ACTIONS = [
  "view",
  "create",
  "edit",
  "soft_delete",
  "restore",
] as const;

export type EntryAction = (typeof ENTRY_ACTIONS)[number];
export type HouseholdRole = "owner" | "editor";
export type HouseholdMembershipStatus = "invited" | "active" | "revoked";

export type EntryPolicyInput = Readonly<{
  action: EntryAction;
  membership: Readonly<{
    role: HouseholdRole;
    status: HouseholdMembershipStatus;
  }>;
  actorUserId: string;
  authorUserId?: string | null;
}>;

export function canPerformEntryAction(input: EntryPolicyInput): boolean {
  if (!input.actorUserId || input.membership.status !== "active") return false;
  if (input.membership.role === "owner") return true;
  if (input.action === "view" || input.action === "create") return true;
  return Boolean(
    input.actorUserId &&
    input.authorUserId &&
    input.actorUserId === input.authorUserId,
  );
}
