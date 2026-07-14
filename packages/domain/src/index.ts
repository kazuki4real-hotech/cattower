export const ONBOARDING_STEPS = ["profile", "cat", "complete"] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const CAT_THEME_COLORS = ["mint", "sky", "peach", "apricot", "mint-soft"] as const;
export type CatThemeColor = (typeof CAT_THEME_COLORS)[number];

export const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const PROFILE_IMAGE_SIZE = 512;
export const PROFILE_IMAGE_MIME_TYPE = "image/webp";

export {
  TOWN_TICKET_TTL_SECONDS,
  issueTownTicket,
  verifyTownTicket,
  type TownTicketPayload,
} from "./town-ticket";

export function getProfileImageDerivativeKey(providerKey: string) {
  if (!providerKey.endsWith("/original")) throw new Error("invalid_original_image_key");
  return `${providerKey.slice(0, -"/original".length)}/profile-512.webp`;
}

export function isCatThemeColor(value: unknown): value is CatThemeColor {
  return typeof value === "string" && CAT_THEME_COLORS.includes(value as CatThemeColor);
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
