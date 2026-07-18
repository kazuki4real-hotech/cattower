import { describe, expect, it } from "vitest";

import {
  getProfileImageDerivativeKey,
  issueTownTicket,
  MAX_IMAGE_BYTES,
  TOWN_TICKET_TTL_SECONDS,
  validateImageUpload,
  verifyTownTicket,
  validateCatProfile,
  validateEntryDraftInput,
  validateEntryInput,
  createInviteToken,
  createShareRateLimitKey,
  createShareToken,
  hashInviteToken,
  hashShareToken,
  parseShareExpiryDays,
} from "./index";

describe("household invite tokens", () => {
  it("creates opaque single-use-token material and hashes deterministically", async () => {
    const token = createInviteToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await hashInviteToken(token)).toBe(await hashInviteToken(token));
    expect(await hashInviteToken("invalid token")).toBeNull();
  });
});

describe("limited share tokens", () => {
  it("creates 256-bit opaque token material and stores deterministic hashes", async () => {
    const token = createShareToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(await hashShareToken(token)).toBe(await hashShareToken(token));
    expect(await hashShareToken("invalid token")).toBeNull();
  });

  it("accepts only supported expiry choices", () => {
    expect(parseShareExpiryDays(1)).toBe(1);
    expect(parseShareExpiryDays(7)).toBe(7);
    expect(parseShareExpiryDays(30)).toBe(30);
    expect(parseShareExpiryDays(2)).toBeNull();
  });

  it("derives rate-limit keys without retaining the address", async () => {
    const input = {
      tokenHash: "a".repeat(64),
      address: "203.0.113.1",
      windowStartedAt: 1_000,
    };
    const key = await createShareRateLimitKey(input);
    expect(key).toMatch(/^[a-f0-9]{64}$/);
    expect(key).toBe(await createShareRateLimitKey(input));
    expect(key).not.toContain(input.address);
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
  };

  it("normalizes a complete cat profile", () => {
    expect(validateCatProfile(valid)).toMatchObject({
      name: "こむぎ",
      nickname: "こむちゃん",
      birthPrecision: "day",
      lifeStatus: "living",
    });
  });

  it("rejects missing names and invalid dates", () => {
    expect(validateCatProfile({ ...valid, name: "" })).toBeNull();
    expect(
      validateCatProfile({ ...valid, birthDate: "2022-02-31" }),
    ).toBeNull();
  });
});

describe("validateEntryInput", () => {
  it("normalizes a private record with cats and tags", () => {
    expect(
      validateEntryInput({
        title: " 窓辺 ",
        body: "風を見ていた。",
        occurredDate: "2026-07-15",
        catIds: ["cat-1", "cat-1", "cat-2"],
        assetIds: [],
        tags: [" 夕方 ", "夕方", "窓辺"],
      }),
    ).toMatchObject({
      title: "窓辺",
      catIds: ["cat-1", "cat-2"],
      tags: [
        { name: "夕方", normalizedName: "夕方" },
        { name: "窓辺", normalizedName: "窓辺" },
      ],
    });
  });

  it("requires a cat and either text or a photo", () => {
    const base = {
      occurredDate: "2026-07-15",
      catIds: ["cat-1"],
      assetIds: [],
      tags: [],
    };
    expect(validateEntryInput(base)).toBeNull();
    expect(validateEntryInput({ ...base, body: "ひとこと" })).not.toBeNull();
    expect(
      validateEntryInput({ ...base, assetIds: ["asset-1"] }),
    ).not.toBeNull();
    expect(
      validateEntryInput({ ...base, body: "ひとこと", catIds: [] }),
    ).toBeNull();
  });

  it("allows an empty draft while keeping structural validation", () => {
    const draft = {
      occurredDate: "2026-07-15",
      catIds: ["cat-1"],
      assetIds: [],
      tags: [],
    };
    expect(validateEntryDraftInput(draft)).toMatchObject({ body: null });
    expect(validateEntryDraftInput({ ...draft, catIds: [] })).toBeNull();
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
