import { describe, expect, it } from "vitest";

import {
  BOARD_SORT_MODES,
  MAX_BOARD_ITEMS,
  MAX_BOARD_NAME_LENGTH,
  boardSortKeyAt,
  nextBoardSortKey,
  normalizeBoardName,
  validateBoardInput,
  validateBoardItemOrder,
} from "./index";

describe("board input", () => {
  it("normalizes names and accepts every sort mode", () => {
    expect(normalizeBoardName("  ＭＵＧＩ   Days  ")).toBe("mugi days");
    for (const sortMode of BOARD_SORT_MODES) {
      expect(validateBoardInput({ name: "窓辺の時間", sortMode })).toEqual({
        name: "窓辺の時間",
        normalizedName: "窓辺の時間",
        sortMode,
      });
    }
  });

  it("rejects missing, oversized, and unsupported values", () => {
    expect(validateBoardInput({ name: "", sortMode: "manual" })).toBeNull();
    expect(
      validateBoardInput({
        name: "a".repeat(MAX_BOARD_NAME_LENGTH + 1),
        sortMode: "manual",
      }),
    ).toBeNull();
    expect(
      validateBoardInput({ name: "窓辺", sortMode: "popular" }),
    ).toBeNull();
  });

  it("creates stable manual sort keys", () => {
    expect(boardSortKeyAt(0)).toBe("000000001000");
    expect(boardSortKeyAt(499)).toBe("000000500000");
    expect(() => boardSortKeyAt(MAX_BOARD_ITEMS)).toThrow(
      "invalid_board_item_index",
    );
    expect(nextBoardSortKey()).toBe("000000001000");
    expect(nextBoardSortKey("000000500000")).toBe("000000501000");
  });

  it("accepts only a complete, unique reorder", () => {
    expect(validateBoardItemOrder(["c", "a", "b"], ["a", "b", "c"])).toEqual([
      "c",
      "a",
      "b",
    ]);
    expect(validateBoardItemOrder(["a", "a", "c"], ["a", "b", "c"])).toBeNull();
    expect(validateBoardItemOrder(["a", "b"], ["a", "b", "c"])).toBeNull();
    expect(validateBoardItemOrder(["a", "b", "x"], ["a", "b", "c"])).toBeNull();
  });
});
