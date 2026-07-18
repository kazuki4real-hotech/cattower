import { describe, expect, it } from "vitest";

import { searchUrl } from "@/lib/search-url";

describe("search URL", () => {
  it("keeps normalized filters and board context between pages", () => {
    expect(
      searchUrl(
        {
          q: "窓辺",
          from: "2026-01-01",
          to: "2026-07-18",
          tagId: "tag-1",
          catId: "cat-1",
          media: "image",
          page: 1,
        },
        { page: 3, boardId: "board-1" },
      ),
    ).toBe(
      "/search?q=%E7%AA%93%E8%BE%BA&from=2026-01-01&to=2026-07-18&tagId=tag-1&catId=cat-1&media=image&boardId=board-1&page=3",
    );
  });

  it("omits default filters and the first page", () => {
    expect(
      searchUrl(
        {
          q: "",
          from: "",
          to: "",
          tagId: "",
          catId: "",
          media: "all",
          page: 4,
        },
        { page: 1 },
      ),
    ).toBe("/search");
  });
});
