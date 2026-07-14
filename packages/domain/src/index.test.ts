import { describe, expect, it } from "vitest";

import { MAX_IMAGE_BYTES, parseMemoryPreferences, validateImageUpload } from "./index";

describe("parseMemoryPreferences", () => {
  it("deduplicates allowed preferences", () => {
    expect(parseMemoryPreferences(["ことば", "ことば", "ご飯"])).toEqual(["ことば", "ご飯"]);
  });

  it("rejects unknown preferences", () => {
    expect(parseMemoryPreferences(["ランキング"])).toBeNull();
  });
});

describe("validateImageUpload", () => {
  it("accepts a bounded jpeg", () => {
    expect(validateImageUpload({ fileName: "cat.jpg", contentType: "image/jpeg", byteSize: 1024 }).ok).toBe(true);
  });

  it("rejects oversized and svg uploads", () => {
    expect(validateImageUpload({ fileName: "cat.jpg", contentType: "image/jpeg", byteSize: MAX_IMAGE_BYTES + 1 }).ok).toBe(false);
    expect(validateImageUpload({ fileName: "cat.svg", contentType: "image/svg+xml", byteSize: 1024 }).ok).toBe(false);
  });
});
