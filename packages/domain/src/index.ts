export const ONBOARDING_STEPS = ["profile", "cat", "preferences", "complete"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const CAT_THEME_COLORS = ["mint", "sky", "peach", "apricot", "mint-soft"] as const;
export type CatThemeColor = (typeof CAT_THEME_COLORS)[number];

export const MEMORY_PREFERENCES = ["写真と動画", "ことば", "おもちゃ", "ご飯"] as const;
export type MemoryPreference = (typeof MEMORY_PREFERENCES)[number];

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function isCatThemeColor(value: unknown): value is CatThemeColor {
  return typeof value === "string" && CAT_THEME_COLORS.includes(value as CatThemeColor);
}

export function parseMemoryPreferences(value: unknown): MemoryPreference[] | null {
  if (!Array.isArray(value)) return null;
  const unique = [...new Set(value)];
  if (!unique.every((item) => typeof item === "string" && MEMORY_PREFERENCES.includes(item as MemoryPreference))) return null;
  return unique as MemoryPreference[];
}

export function validateImageUpload(input: { contentType: unknown; byteSize: unknown; fileName: unknown }) {
  if (typeof input.fileName !== "string" || input.fileName.trim().length === 0 || input.fileName.length > 180) {
    return { ok: false as const, code: "invalid_file_name" };
  }
  if (typeof input.contentType !== "string" || !IMAGE_MIME_TYPES.includes(input.contentType as (typeof IMAGE_MIME_TYPES)[number])) {
    return { ok: false as const, code: "unsupported_image_type" };
  }
  if (!Number.isInteger(input.byteSize) || (input.byteSize as number) <= 0 || (input.byteSize as number) > MAX_IMAGE_BYTES) {
    return { ok: false as const, code: "invalid_image_size" };
  }
  return { ok: true as const, fileName: input.fileName.trim(), contentType: input.contentType, byteSize: input.byteSize as number };
}
