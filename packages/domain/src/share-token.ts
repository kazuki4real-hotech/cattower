export const SHARE_EXPIRY_DAYS = [1, 7, 30] as const;
export const SHARE_CREATION_HOURLY_LIMIT = 10;
export const SHARE_ACCESS_WINDOW_MS = 60 * 1000;
export const SHARE_ACCESS_WINDOW_LIMIT = 60;

export type ShareExpiryDays = (typeof SHARE_EXPIRY_DAYS)[number];

export function createShareToken() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return encodeBase64Url(bytes);
}

export async function hashShareToken(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return bytesToHex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token)),
    ),
  );
}

export function parseShareExpiryDays(value: unknown): ShareExpiryDays | null {
  return SHARE_EXPIRY_DAYS.includes(value as ShareExpiryDays)
    ? (value as ShareExpiryDays)
    : null;
}

export async function createShareRateLimitKey(input: {
  tokenHash: string;
  address: string;
  windowStartedAt: number;
}) {
  const material = `${input.tokenHash}\0${input.address}\0${input.windowStartedAt}`;
  return bytesToHex(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(material)),
    ),
  );
}

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}
