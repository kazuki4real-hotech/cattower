export const BOARD_SORT_MODES = ["manual", "newest", "oldest"] as const;
export const MAX_BOARD_NAME_LENGTH = 60;
export const MAX_BOARDS_PER_HOUSEHOLD = 50;

export type BoardSortMode = (typeof BOARD_SORT_MODES)[number];

export function normalizeBoardName(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

export function validateBoardInput(input: Record<string, unknown>) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const normalizedName = normalizeBoardName(name);
  const sortMode = BOARD_SORT_MODES.includes(input.sortMode as BoardSortMode)
    ? (input.sortMode as BoardSortMode)
    : null;

  if (
    !name ||
    !normalizedName ||
    name.length > MAX_BOARD_NAME_LENGTH ||
    !sortMode
  )
    return null;

  return { name, normalizedName, sortMode };
}
