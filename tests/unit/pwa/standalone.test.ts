import { describe, expect, it } from "vitest";

import { isStandaloneDisplayMode } from "@/lib/pwa/use-is-standalone";

function browserWindow(matches: boolean, standalone?: boolean) {
  return {
    matchMedia: (query: string) => ({
      matches: query === "(display-mode: standalone)" ? matches : false,
    }),
    navigator: standalone === undefined ? {} : { standalone },
  };
}

describe("isStandaloneDisplayMode", () => {
  it("is false in a browser tab", () => {
    expect(isStandaloneDisplayMode(browserWindow(false))).toBe(false);
  });

  it("is true when the display-mode media query matches", () => {
    expect(isStandaloneDisplayMode(browserWindow(true))).toBe(true);
  });

  it("is true when iOS reports navigator.standalone", () => {
    expect(isStandaloneDisplayMode(browserWindow(false, true))).toBe(true);
  });

  it("is false when iOS reports navigator.standalone as false", () => {
    expect(isStandaloneDisplayMode(browserWindow(false, false))).toBe(false);
  });

  it("does not throw when matchMedia is unavailable", () => {
    expect(isStandaloneDisplayMode({})).toBe(false);
  });
});
