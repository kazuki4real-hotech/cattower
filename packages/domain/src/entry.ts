export const MAX_ENTRY_TITLE_LENGTH = 120;
export const MAX_ENTRY_BODY_LENGTH = 5000;
export const MAX_ENTRY_TAGS = 10;
export const MAX_ENTRY_TAG_LENGTH = 30;
export const MAX_ENTRY_CATS = 20;

export function validateEntryInput(input: Record<string, unknown>) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const body = typeof input.body === "string" ? input.body.trim() : "";
  const occurredDate = parseDate(input.occurredDate);
  const catIds = uniqueStrings(input.catIds);
  const assetIds = uniqueStrings(input.assetIds);
  const rawTags = Array.isArray(input.tags) ? input.tags : [];
  const tags = rawTags
    .filter((value): value is string => typeof value === "string")
    .map((name) => ({ name: name.trim(), normalizedName: normalizeTag(name) }))
    .filter(({ name, normalizedName }) => name && normalizedName)
    .filter(
      (tag, index, all) =>
        all.findIndex(
          (candidate) => candidate.normalizedName === tag.normalizedName,
        ) === index,
    );

  if (
    title.length > MAX_ENTRY_TITLE_LENGTH ||
    body.length > MAX_ENTRY_BODY_LENGTH ||
    !occurredDate ||
    catIds.length < 1 ||
    catIds.length > MAX_ENTRY_CATS ||
    assetIds.length > 1 ||
    tags.length > MAX_ENTRY_TAGS ||
    tags.some(({ name }) => name.length > MAX_ENTRY_TAG_LENGTH) ||
    (!body && assetIds.length === 0)
  )
    return null;

  return {
    title: title || null,
    body: body || null,
    occurredAt: occurredDate,
    catIds,
    assetIds,
    tags,
  };
}

export function normalizeTag(value: string) {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLowerCase();
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value.filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      ),
    ),
  ];
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.valueOf()) ||
    date.toISOString().slice(0, 10) !== value
    ? null
    : date;
}
