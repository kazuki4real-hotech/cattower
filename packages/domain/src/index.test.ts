import { describe, expect, it } from "vitest";

import {
  getProfileImageDerivativeKey,
  issueTownTicket,
  MAX_IMAGE_BYTES,
  TOWN_TICKET_TTL_SECONDS,
  validateImageUpload,
  verifyTownTicket,
  validateCatProfile,
  createInviteToken,
  hashInviteToken,
} from "./index";

describe("household invite tokens", () => {
  it("creates opaque single-use-token material and hashes deterministically", async () => {
    const token = createInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await hashInviteToken(token)).toBe(await hashInviteToken(token));
    expect(await hashInviteToken("invalid token")).toBeNull();
  });
});

describe("validateCatProfile", () => {
  const valid = {
    name: "こむぎ",
    nickname: "こむちゃん",
    birthPrecision: "day",
    birthDate: "2022-04-03",
    adoptionDate: "2022-06-01",
    lifeStatus: "living",
    themeColor: "mint",
  };

  it("normalizes a complete cat profile", () => {
    expect(validateCatProfile(valid)).toMatchObject({
      name: "こむぎ",
      nickname: "こむちゃん",
      birthPrecision: "day",
      lifeStatus: "living",
    });
  });

  it("rejects missing names, invalid dates, and unknown theme colors", () => {
    expect(validateCatProfile({ ...valid, name: "" })).toBeNull();
    expect(
      validateCatProfile({ ...valid, birthDate: "2022-02-31" }),
    ).toBeNull();
    expect(validateCatProfile({ ...valid, themeColor: "purple" })).toBeNull();
  });
});

const TOWN_TICKET_SECRET = "test-only-town-ticket-secret-at-least-32-bytes";

describe("validateImageUpload", () => {
  it("accepts a bounded jpeg", () => {
    expect(
      validateImageUpload({
        fileName: "cat.jpg",
        contentType: "image/jpeg",
        byteSize: 1024,
      }).ok,
    ).toBe(true);
  });

  it("rejects oversized and svg uploads", () => {
    expect(
      validateImageUpload({
        fileName: "cat.jpg",
        contentType: "image/jpeg",
        byteSize: MAX_IMAGE_BYTES + 1,
      }).ok,
    ).toBe(false);
    expect(
      validateImageUpload({
        fileName: "cat.svg",
        contentType: "image/svg+xml",
        byteSize: 1024,
      }).ok,
    ).toBe(false);
  });
});

describe("getProfileImageDerivativeKey", () => {
  it("keeps the derivative beside its private original", () => {
    expect(
      getProfileImageDerivativeKey("households/home/cats/cat/asset/original"),
    ).toBe("households/home/cats/cat/asset/profile-512.webp");
  });

  it("rejects keys outside the original image convention", () => {
    expect(() =>
      getProfileImageDerivativeKey("households/home/cats/cat/asset"),
    ).toThrow("invalid_original_image_key");
  });
});

describe("town connection tickets", () => {
  const now = Date.UTC(2026, 6, 15, 12, 0, 0);
  const input = {
    userId: "user-1",
    catId: "cat-1",
    townCardId: "cat:cat-1",
    roomId: "town:courtyard:shard:0",
    blockVersion: 0,
  };

  it("issues a scoped ticket that expires after five minutes", async () => {
    const issued = await issueTownTicket(TOWN_TICKET_SECRET, input, now);
    const verified = await verifyTownTicket(
      TOWN_TICKET_SECRET,
      issued.ticket,
      now,
    );

    expect(verified).toEqual({ ok: true, payload: issued.payload });
    expect(issued.payload.exp - issued.payload.iat).toBe(
      TOWN_TICKET_TTL_SECONDS,
    );
  });

  it("rejects tampered and expired tickets", async () => {
    const issued = await issueTownTicket(TOWN_TICKET_SECRET, input, now);
    const [payload, signature] = issued.ticket.split(".");

    await expect(
      verifyTownTicket(TOWN_TICKET_SECRET, `${payload}x.${signature}`, now),
    ).resolves.toEqual({ ok: false, error: "invalid_ticket" });
    await expect(
      verifyTownTicket(
        TOWN_TICKET_SECRET,
        issued.ticket,
        now + TOWN_TICKET_TTL_SECONDS * 1000,
      ),
    ).resolves.toEqual({ ok: false, error: "expired_ticket" });
  });
});
