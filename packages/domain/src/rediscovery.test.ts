import { describe, expect, it } from "vitest";

import { getAnniversaryDateWindow } from "./rediscovery";

describe("getAnniversaryDateWindow", () => {
  it("uses the calendar day in the requested time zone", () => {
    expect(
      getAnniversaryDateWindow(
        new Date("2026-01-01T00:30:00.000Z"),
        1,
        "America/Los_Angeles",
      ),
    ).toEqual({
      anchorDate: "2024-12-31",
      startDate: "2024-12-28",
      endDate: "2025-01-04",
      timeZone: "America/Los_Angeles",
    });
  });

  it("clamps February 29 to February 28 in a non-leap target year", () => {
    expect(
      getAnniversaryDateWindow(new Date("2024-02-29T03:00:00.000Z"), 1),
    ).toMatchObject({
      anchorDate: "2023-02-28",
      startDate: "2023-02-25",
      endDate: "2023-03-04",
    });
  });

  it("falls back to Asia/Tokyo for an invalid time zone", () => {
    expect(
      getAnniversaryDateWindow(
        new Date("2026-07-18T15:30:00.000Z"),
        1,
        "not/a-zone",
      ),
    ).toMatchObject({ anchorDate: "2025-07-19", timeZone: "Asia/Tokyo" });
  });

  it("calculates the three-year anniversary with the same window", () => {
    expect(
      getAnniversaryDateWindow(new Date("2026-07-18T03:00:00.000Z"), 3),
    ).toMatchObject({
      anchorDate: "2023-07-18",
      startDate: "2023-07-15",
      endDate: "2023-07-22",
    });
  });

  it("rejects a non-positive anniversary", () => {
    expect(() =>
      getAnniversaryDateWindow(new Date("2026-07-18T03:00:00.000Z"), 0),
    ).toThrow("invalid_anniversary_years");
  });
});
