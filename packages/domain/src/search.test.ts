import { describe, expect, it } from "vitest";

import { parseEntrySearchInput } from "./search";

describe("entry search input", () => {
  it("normalizes a complete URL query", () => {
    expect(
      parseEntrySearchInput({
        q: "  夕方　の   窓辺 ",
        from: "2026-01-01",
        to: "2026-07-18",
        tagId: " tag-1 ",
        catId: "cat-1",
        media: "image",
        page: "3",
      }),
    ).toEqual({
      filters: {
        q: "夕方 の 窓辺",
        from: "2026-01-01",
        to: "2026-07-18",
        tagId: "tag-1",
        catId: "cat-1",
        media: "image",
        page: 3,
      },
      errors: [],
    });
  });

  it("rejects invalid dates and reversed ranges", () => {
    expect(
      parseEntrySearchInput({ from: "2026-02-30", to: "2026-01-01" }).errors,
    ).toEqual(["invalid_from"]);
    expect(
      parseEntrySearchInput({ from: "2026-02-01", to: "2026-01-01" }).errors,
    ).toEqual(["invalid_date_range"]);
  });

  it("bounds query text and ignores unsupported filters", () => {
    const parsed = parseEntrySearchInput({
      q: "猫".repeat(101),
      media: "audio",
      tagId: "x".repeat(129),
    });
    expect(parsed.errors).toEqual(["query_too_long"]);
    expect(parsed.filters.media).toBe("all");
    expect(parsed.filters.tagId).toBe("");
  });

  it("uses the first page for missing or unsupported page numbers", () => {
    expect(parseEntrySearchInput({}).filters.page).toBe(1);
    expect(parseEntrySearchInput({ page: "0" }).filters.page).toBe(1);
    expect(parseEntrySearchInput({ page: "1.5" }).filters.page).toBe(1);
    expect(parseEntrySearchInput({ page: "1001" }).filters.page).toBe(1);
    expect(parseEntrySearchInput({ page: "12" }).filters.page).toBe(12);
  });
});
