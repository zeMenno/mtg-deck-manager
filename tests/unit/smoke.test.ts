import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("test harness", () => {
  it("runs", () => {
    expect(true).toBe(true);
  });
});

describe("cn", () => {
  it("joins class names", () => {
    expect(cn("border-2", "px-2")).toBe("border-2 px-2");
  });

  it("drops falsy values", () => {
    expect(cn("border-2", false && "px-2", undefined)).toBe("border-2");
  });

  it("lets the last conflicting tailwind class win", () => {
    expect(cn("rounded-md", "rounded-none")).toBe("rounded-none");
  });
});
