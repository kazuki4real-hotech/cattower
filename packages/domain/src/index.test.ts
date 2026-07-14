import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, validateImageUpload } from "./index";

describe("validateImageUpload", () => {
  it("accepts a bounded jpeg", () => {
    expect(validateImageUpload({ fileName: "cat.jpg", contentType: "image/jpeg", byteSize: 1024 }).ok).toBe(true);
  });

  it("rejects oversized and svg uploads", () => {
    expect(validateImageUpload({ fileName: "cat.jpg", contentType: "image/jpeg", byteSize: MAX_IMAGE_BYTES + 1 }).ok).toBe(false);
    expect(validateImageUpload({ fileName: "cat.svg", contentType: "image/svg+xml", byteSize: 1024 }).ok).toBe(false);
  });
});
