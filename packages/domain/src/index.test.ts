import { describe, expect, it } from "vitest";

import { getProfileImageDerivativeKey, MAX_IMAGE_BYTES, validateImageUpload } from "./index";

describe("validateImageUpload", () => {
  it("accepts a bounded jpeg", () => {
    expect(validateImageUpload({ fileName: "cat.jpg", contentType: "image/jpeg", byteSize: 1024 }).ok).toBe(true);
  });

  it("rejects oversized and svg uploads", () => {
    expect(validateImageUpload({ fileName: "cat.jpg", contentType: "image/jpeg", byteSize: MAX_IMAGE_BYTES + 1 }).ok).toBe(false);
    expect(validateImageUpload({ fileName: "cat.svg", contentType: "image/svg+xml", byteSize: 1024 }).ok).toBe(false);
  });
});

describe("getProfileImageDerivativeKey", () => {
  it("keeps the derivative beside its private original", () => {
    expect(getProfileImageDerivativeKey("households/home/cats/cat/asset/original")).toBe(
      "households/home/cats/cat/asset/profile-512.webp",
    );
  });

  it("rejects keys outside the original image convention", () => {
    expect(() => getProfileImageDerivativeKey("households/home/cats/cat/asset")).toThrow(
      "invalid_original_image_key",
    );
  });
});
