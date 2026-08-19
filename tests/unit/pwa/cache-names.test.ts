import { describe, expect, it } from "vitest";

import {
  APP_CACHE_NAMES,
  APP_SHELL_CACHE,
  CACHE_VERSION,
  CARD_IMAGES_CACHE,
  STATIC_CACHE,
  supersededCacheNames,
} from "@/lib/pwa/cache-names";

describe("service worker cache names", () => {
  it("uses the documented v1 cache version", () => {
    expect(CACHE_VERSION).toBe("v1");
    expect(APP_SHELL_CACHE).toBe("app-shell-v1");
    expect(STATIC_CACHE).toBe("static-v1");
    expect(CARD_IMAGES_CACHE).toBe("card-images-v1");
  });

  it("lists all owned caches for cleanup assertions", () => {
    expect(APP_CACHE_NAMES).toEqual([
      "app-shell-v1",
      "static-v1",
      "card-images-v1",
    ]);
  });

  it("describes superseded cache names after a version bump", () => {
    expect(supersededCacheNames("v0")).toEqual([
      "app-shell-v0",
      "static-v0",
      "card-images-v0",
    ]);
  });
});
