import { describe, expect, it } from "vitest";

import {
  BOARD_ACTIONS,
  canPerformBoardAction,
  type BoardAction,
  type HouseholdRole,
} from "./index";

const actorUserId = "board-editor";

function can(
  role: HouseholdRole,
  action: BoardAction,
  creatorUserId: string | null = "other-user",
) {
  return canPerformBoardAction({
    action,
    membership: { role, status: "active" },
    actorUserId,
    creatorUserId,
  });
}

describe("household board policy", () => {
  it.each(BOARD_ACTIONS)("allows an active owner to %s any board", (action) => {
    expect(can("owner", action)).toBe(true);
  });

  it("allows an active editor to view and create", () => {
    expect(can("editor", "view")).toBe(true);
    expect(can("editor", "create", null)).toBe(true);
  });

  it.each(["edit", "delete"] as const)(
    "allows an editor to %s only their own board",
    (action) => {
      expect(can("editor", action, actorUserId)).toBe(true);
      expect(can("editor", action)).toBe(false);
      expect(can("editor", action, null)).toBe(false);
    },
  );

  it.each(BOARD_ACTIONS)(
    "denies inactive members attempting to %s",
    (action) => {
      expect(
        canPerformBoardAction({
          action,
          membership: { role: "owner", status: "revoked" },
          actorUserId,
          creatorUserId: actorUserId,
        }),
      ).toBe(false);
    },
  );
});
