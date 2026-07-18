export const BOARD_SORT_MODES = ["manual", "newest", "oldest"] as const;
export const MAX_BOARD_NAME_LENGTH = 60;
export const MAX_BOARDS_PER_HOUSEHOLD = 50;
export const MAX_BOARD_ITEMS = 500;
export const BOARD_ENTRY_PICKER_LIMIT = 100;

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

export function boardSortKeyAt(index: number) {
  if (!Number.isInteger(index) || index < 0 || index >= MAX_BOARD_ITEMS)
    throw new Error("invalid_board_item_index");
  return String((index + 1) * 1_000).padStart(12, "0");
}

export function nextBoardSortKey(previous?: string | null) {
  if (!previous) return boardSortKeyAt(0);
  const value = Number.parseInt(previous, 10);
  if (!Number.isSafeInteger(value) || value < 0)
    throw new Error("invalid_board_sort_key");
  return String(value + 1_000).padStart(12, "0");
}

export function validateBoardItemOrder(
  value: unknown,
  currentEntryIds: readonly string[],
) {
  if (
    !Array.isArray(value) ||
    value.length !== currentEntryIds.length ||
    value.length > MAX_BOARD_ITEMS ||
    value.some((entryId) => typeof entryId !== "string")
  )
    return null;
  const entryIds = value as string[];
  if (new Set(entryIds).size !== entryIds.length) return null;
  const current = new Set(currentEntryIds);
  if (entryIds.some((entryId) => !current.has(entryId))) return null;
  return entryIds;
}
