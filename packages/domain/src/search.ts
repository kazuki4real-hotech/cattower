export const SEARCH_MEDIA_FILTERS = ["all", "image", "video", "none"] as const;
export const MAX_SEARCH_QUERY_LENGTH = 100;
export const SEARCH_RESULT_LIMIT = 50;
export const MAX_SEARCH_PAGE = 1_000;

export type SearchMediaFilter = (typeof SEARCH_MEDIA_FILTERS)[number];
export type EntrySearchInput = {
  q: string;
  from: string;
  to: string;
  tagId: string;
  catId: string;
  media: SearchMediaFilter;
  page: number;
};

export type EntrySearchError =
  "query_too_long" | "invalid_from" | "invalid_to" | "invalid_date_range";

export function parseEntrySearchInput(
  input: Record<string, string | string[] | undefined>,
) {
  const q = normalizeQuery(first(input.q));
  const from = first(input.from).trim();
  const to = first(input.to).trim();
  const tagId = boundedId(first(input.tagId));
  const catId = boundedId(first(input.catId));
  const rawMedia = first(input.media);
  const media = SEARCH_MEDIA_FILTERS.includes(rawMedia as SearchMediaFilter)
    ? (rawMedia as SearchMediaFilter)
    : "all";
  const page = parsePage(first(input.page));
  const errors: EntrySearchError[] = [];

  if (q.length > MAX_SEARCH_QUERY_LENGTH) errors.push("query_too_long");
  if (from && !parseDate(from)) errors.push("invalid_from");
  if (to && !parseDate(to)) errors.push("invalid_to");
  if (
    !errors.includes("invalid_from") &&
    !errors.includes("invalid_to") &&
    from &&
    to &&
    from > to
  )
    errors.push("invalid_date_range");

  return {
    filters: {
      q,
      from,
      to,
      tagId,
      catId,
      media,
      page,
    } satisfies EntrySearchInput,
    errors,
  };
}

function parsePage(value: string) {
  if (!/^\d+$/.test(value)) return 1;
  const page = Number(value);
  return Number.isSafeInteger(page) && page >= 1 && page <= MAX_SEARCH_PAGE
    ? page
    : 1;
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function normalizeQuery(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

function boundedId(value: string) {
  const id = value.trim();
  return id.length <= 128 ? id : "";
}

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}
