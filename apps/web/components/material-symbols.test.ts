import { describe, expect, it } from "vitest";

import {
  materialSymbolsRoundedHref,
  materialSymbolsRoundedNames,
} from "./material-symbols";

describe("Material Symbols font subset", () => {
  it("loads the calendar icon used by rediscovery empty states", () => {
    expect(materialSymbolsRoundedNames).toContain("calendar_today");
    expect(materialSymbolsRoundedHref).toContain(
      "icon_names=add,arrow_back,arrow_downward,arrow_forward,arrow_upward,auto_awesome,bookmarks,calendar_today",
    );
  });

  it("keeps the requested icon names sorted for the Google Fonts API", () => {
    expect(materialSymbolsRoundedNames).toEqual(
      [...materialSymbolsRoundedNames].sort(),
    );
  });
});
