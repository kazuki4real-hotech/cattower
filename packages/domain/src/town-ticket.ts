const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

export const TOWN_TICKET_TTL_SECONDS = 5 * 60;
const MAX_TICKET_LENGTH = 4096;
const CLOCK_SKEW_SECONDS = 30;
const ROOM_ID_PATTERN = /^town:[a-z0-9-]{1,40}:shard:[0-9]{1,3}$/;

export type TownTicketPayload = Readonly<{
  v: 1;
  userId: string;
  catId: string;
  townCardId: string;
  roomId: string;
  blockVersion: number;
  iat: number;
  exp: number;
  jti: string;
}>;

type TownTicketInput = Omit<TownTicketPayload, "v" | "iat" | "exp" | "jti">;

export async function issueTownTicket(
  secret: string,
  input: TownTicketInput,
  now = Date.now(),
): Promise<{ ticket: string; payload: TownTicketPayload }> {
  assertSecret(secret);
  assertTownTicketInput(input);
  const issuedAt = Math.floor(now / 1000);
  const payload: TownTicketPayload = {
    v: 1,
    ...input,
    iat: issuedAt,
    exp: issuedAt + TOWN_TICKET_TTL_SECONDS,
    jti: crypto.randomUUID(),
  };
  const encodedPayload = encodeBase64Url(
    encoder.encode(JSON.stringify(payload)),
  );
  const signature = await sign(secret, encodedPayload);
  return {
    ticket: `${encodedPayload}.${encodeBase64Url(signature)}`,
    payload,
  };
}

export async function verifyTownTicket(
  secret: string,
  ticket: string,
  now = Date.now(),
): Promise<
  | { ok: true; payload: TownTicketPayload }
  | { ok: false; error: "invalid_ticket" | "expired_ticket" }
> {
  try {
    assertSecret(secret);
    if (ticket.length === 0 || ticket.length > MAX_TICKET_LENGTH)
      return { ok: false, error: "invalid_ticket" };
    const parts = ticket.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1])
      return { ok: false, error: "invalid_ticket" };

    const valid = await verifySignature(
      secret,
      parts[0],
      decodeBase64Url(parts[1]),
    );
    if (!valid) return { ok: false, error: "invalid_ticket" };

    const payload = JSON.parse(
      decoder.decode(decodeBase64Url(parts[0])),
    ) as unknown;
    if (!isTownTicketPayload(payload))
      return { ok: false, error: "invalid_ticket" };

    const nowSeconds = Math.floor(now / 1000);
    if (payload.exp <= nowSeconds)
      return { ok: false, error: "expired_ticket" };
    if (
      payload.iat > nowSeconds + CLOCK_SKEW_SECONDS ||
      payload.exp - payload.iat !== TOWN_TICKET_TTL_SECONDS
    ) {
      return { ok: false, error: "invalid_ticket" };
    }
    return { ok: true, payload };
  } catch {
    return { ok: false, error: "invalid_ticket" };
  }
}

function assertSecret(secret: string): void {
  if (encoder.encode(secret).byteLength < 32)
    throw new Error("town_ticket_secret_too_short");
}

function assertTownTicketInput(input: TownTicketInput): void {
  if (
    !isOpaqueId(input.userId) ||
    !isOpaqueId(input.catId) ||
    !isOpaqueId(input.townCardId) ||
    !ROOM_ID_PATTERN.test(input.roomId) ||
    !Number.isSafeInteger(input.blockVersion) ||
    input.blockVersion < 0
  ) {
    throw new Error("invalid_town_ticket_input");
  }
}

function isTownTicketPayload(value: unknown): value is TownTicketPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return (
    payload.v === 1 &&
    isOpaqueId(payload.userId) &&
    isOpaqueId(payload.catId) &&
    isOpaqueId(payload.townCardId) &&
    typeof payload.roomId === "string" &&
    ROOM_ID_PATTERN.test(payload.roomId) &&
    Number.isSafeInteger(payload.blockVersion) &&
    (payload.blockVersion as number) >= 0 &&
    Number.isSafeInteger(payload.iat) &&
    Number.isSafeInteger(payload.exp) &&
    typeof payload.iat === "number" &&
    typeof payload.exp === "number" &&
    payload.exp > payload.iat &&
    isOpaqueId(payload.jti)
  );
}

function isOpaqueId(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1 && value.length <= 128;
}

async function sign(secret: string, value: string): Promise<Uint8Array> {
  const key = await importHmacKey(secret, ["sign"]);
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", key, encoder.encode(value)),
  );
}

async function verifySignature(
  secret: string,
  value: string,
  signature: Uint8Array<ArrayBuffer>,
): Promise<boolean> {
  const key = await importHmacKey(secret, ["verify"]);
  return crypto.subtle.verify("HMAC", key, signature, encoder.encode(value));
}

function importHmacKey(secret: string, usages: KeyUsage[]): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usages,
  );
}

function encodeBase64Url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function decodeBase64Url(value: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) throw new Error("invalid_base64url");
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}
