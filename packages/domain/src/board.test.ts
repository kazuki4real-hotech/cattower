import { describe, expect, it } from "vitest";

import {
  BOARD_SORT_MODES,
  MAX_BOARD_NAME_LENGTH,
  normalizeBoardName,
  validateBoardInput,
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
});
