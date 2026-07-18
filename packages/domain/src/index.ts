export const ONBOARDING_STEPS = [
  "profile",
  "cat",
  "photo",
  "complete",
] as const;
export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export const IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
export const PROFILE_IMAGE_SIZE = 512;
export const PROFILE_IMAGE_MIME_TYPE = "image/webp";
export const ENTRY_IMAGE_MAX_WIDTH = 1600;
export const ENTRY_IMAGE_MIME_TYPE = "image/webp";

export {
  TOWN_TICKET_TTL_SECONDS,
  issueTownTicket,
  verifyTownTicket,
  type TownTicketPayload,
} from "./town-ticket";

export {
  ENTRY_ACTIONS,
  canPerformEntryAction,
  type EntryAction,
  type EntryPolicyInput,
  type HouseholdMembershipStatus,
  type HouseholdRole,
} from "./household-policy";

export {
  BIRTH_PRECISIONS,
  validateCatProfile,
  type BirthPrecision,
  type CatLifeStatus,
} from "./cat-profile";

export {
  MAX_ENTRY_BODY_LENGTH,
  MAX_ENTRY_CATS,
  MAX_ENTRY_TAG_LENGTH,
  MAX_ENTRY_TAGS,
  MAX_ENTRY_TITLE_LENGTH,
  normalizeTag,
  validateEntryDraftInput,
  validateEntryInput,
} from "./entry";

export {
  BOARD_SORT_MODES,
  BOARD_ENTRY_PICKER_LIMIT,
  MAX_BOARD_NAME_LENGTH,
  MAX_BOARDS_PER_HOUSEHOLD,
  MAX_BOARD_ITEMS,
  boardSortKeyAt,
  nextBoardSortKey,
  normalizeBoardName,
  validateBoardInput,
  validateBoardItemOrder,
  type BoardSortMode,
} from "./board";

export {
  BOARD_ACTIONS,
  canPerformBoardAction,
  type BoardAction,
  type BoardPolicyInput,
} from "./board-policy";

export {
  MAX_SEARCH_QUERY_LENGTH,
  SEARCH_MEDIA_FILTERS,
  SEARCH_RESULT_LIMIT,
  parseEntrySearchInput,
  type EntrySearchError,
  type EntrySearchInput,
  type SearchMediaFilter,
} from "./search";

export {
  getLastYearDateWindow,
  type RediscoveryDateWindow,
} from "./rediscovery";

export {
  HOUSEHOLD_INVITE_HOURLY_LIMIT,
  HOUSEHOLD_INVITE_TTL_MS,
  createInviteToken,
  hashInviteToken,
} from "./invite-token";

export function getProfileImageDerivativeKey(providerKey: string) {
  if (!providerKey.endsWith("/original"))
    throw new Error("invalid_original_image_key");
  return `${providerKey.slice(0, -"/original".length)}/profile-512.webp`;
}

export function getEntryImageDerivativeKey(providerKey: string) {
  if (!providerKey.endsWith("/original"))
    throw new Error("invalid_original_image_key");
  return `${providerKey.slice(0, -"/original".length)}/entry-1600.webp`;
}

export function validateImageUpload(input: {
  contentType: unknown;
  byteSize: unknown;
  fileName: unknown;
}) {
  if (
    typeof input.fileName !== "string" ||
    input.fileName.trim().length === 0 ||
    input.fileName.length > 180
  ) {
    return { ok: false as const, code: "invalid_file_name" };
  }
  if (
    typeof input.contentType !== "string" ||
    !IMAGE_MIME_TYPES.includes(
      input.contentType as (typeof IMAGE_MIME_TYPES)[number],
    )
  ) {
    return { ok: false as const, code: "unsupported_image_type" };
  }
  if (
    !Number.isInteger(input.byteSize) ||
    (input.byteSize as number) <= 0 ||
    (input.byteSize as number) > MAX_IMAGE_BYTES
  ) {
    return { ok: false as const, code: "invalid_image_size" };
  }
  return {
    ok: true as const,
    fileName: input.fileName.trim(),
    contentType: input.contentType,
    byteSize: input.byteSize as number,
  };
}
