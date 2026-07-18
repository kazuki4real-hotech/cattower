import type { EntrySearchInput } from "@cattower/domain";

export function searchUrl(
  filters: EntrySearchInput,
  options: { page: number; boardId?: string },
) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.tagId) params.set("tagId", filters.tagId);
  if (filters.catId) params.set("catId", filters.catId);
  if (filters.media !== "all") params.set("media", filters.media);
  if (options.boardId) params.set("boardId", options.boardId);
  if (options.page > 1) params.set("page", String(options.page));
  const query = params.toString();
  return query ? `/search?${query}` : "/search";
}
