import { describe, expect, it } from "vitest";

import {
  canPerformEntryAction,
  ENTRY_ACTIONS,
  type EntryAction,
  type HouseholdRole,
} from "./index";

const actorUserId = "user-editor";

function can(
  role: HouseholdRole,
  action: EntryAction,
  authorUserId: string | null = "user-other",
) {
  return canPerformEntryAction({
    action,
    membership: { role, status: "active" },
    actorUserId,
    authorUserId,
  });
}

describe("household entry policy", () => {
  it.each(ENTRY_ACTIONS)("allows an active owner to %s any entry", (action) => {
    expect(can("owner", action)).toBe(true);
  });

  it.each(ENTRY_ACTIONS)(
    "denies an invited or revoked member attempting to %s",
    (action) => {
      for (const role of ["owner", "editor"] as const) {
        for (const status of ["invited", "revoked"] as const) {
          expect(
            canPerformEntryAction({
              action,
              membership: { role, status },
              actorUserId,
              authorUserId: actorUserId,
            }),
          ).toBe(false);
        }
      }
    },
  );

  it("fails closed without an authenticated actor", () => {
    expect(
      canPerformEntryAction({
        action: "view",
        membership: { role: "owner", status: "active" },
        actorUserId: "",
      }),
    ).toBe(false);
  });

  it("allows an active editor to view any entry and create an entry", () => {
    expect(can("editor", "view")).toBe(true);
    expect(can("editor", "create", null)).toBe(true);
  });

  it.each(["edit", "soft_delete", "restore"] as const)(
    "allows an active editor to %s their own entry",
    (action) => {
      expect(can("editor", action, actorUserId)).toBe(true);
    },
  );

  it.each(["edit", "soft_delete", "restore"] as const)(
    "denies an active editor attempting to %s another member's entry",
    (action) => {
      expect(can("editor", action)).toBe(false);
      expect(can("editor", action, null)).toBe(false);
    },
  );
});
