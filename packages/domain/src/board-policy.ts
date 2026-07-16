import type {
  HouseholdMembershipStatus,
  HouseholdRole,
} from "./household-policy";

export const BOARD_ACTIONS = ["view", "create", "edit", "delete"] as const;

export type BoardAction = (typeof BOARD_ACTIONS)[number];
export type BoardPolicyInput = Readonly<{
  action: BoardAction;
  membership: Readonly<{
    role: HouseholdRole;
    status: HouseholdMembershipStatus;
  }>;
  actorUserId: string;
  creatorUserId?: string | null;
}>;

export function canPerformBoardAction(input: BoardPolicyInput): boolean {
  if (!input.actorUserId || input.membership.status !== "active") return false;
  if (input.membership.role === "owner") return true;
  if (input.action === "view" || input.action === "create") return true;
  return Boolean(
    input.creatorUserId && input.actorUserId === input.creatorUserId,
  );
}
