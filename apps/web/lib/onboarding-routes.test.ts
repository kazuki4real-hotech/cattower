import { describe, expect, it } from "vitest";

import { getOnboardingRoute, sanitizeReturnTo } from "./onboarding-routes";

describe("onboarding routes", () => {
  it.each([
    [0, "/onboarding/profile"],
    [1, "/onboarding/cat"],
    [2, "/onboarding/photo"],
    [3, "/onboarding/complete"],
    [4, "/onboarding/complete"],
  ])("maps checkpoint %s to %s", (step, route) => {
    expect(getOnboardingRoute(step)).toBe(route);
  });

  it("accepts a same-origin application path", () => {
    expect(sanitizeReturnTo("/entries/window-evening?from=search#photo")).toBe(
      "/entries/window-evening?from=search#photo",
    );
  });

  it.each([
    "https://example.com",
    "//example.com",
    "/api/onboarding",
    "/auth/continue",
    "/onboarding/profile",
  ])("rejects unsafe destination %s", (destination) => {
    expect(sanitizeReturnTo(destination)).toBeNull();
  });
});
