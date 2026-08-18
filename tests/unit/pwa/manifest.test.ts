import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import manifest from "@/app/manifest";

const publicDir = fileURLToPath(new URL("../../../public/", import.meta.url));

describe("web app manifest", () => {
  const result = manifest();

  it("launches standalone from the app root", () => {
    expect(result.display).toBe("standalone");
    expect(result.start_url).toBe("/");
    expect(result.id).toBe("/");
    expect(result.scope).toBe("/");
  });

  it("uses the locked product names (ADR-013)", () => {
    expect(result.name).toBe("MTG Deck Builder");
    expect(result.short_name).toBe("Deck Builder");
  });

  it("declares 192, 512, and maskable icons", () => {
    const icons = result.icons ?? [];
    const sizes = icons.map((icon) => icon.sizes);

    expect(sizes).toContain("192x192");
    expect(sizes).toContain("512x512");
    expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  });

  it("points every icon at a file that exists", () => {
    for (const icon of result.icons ?? []) {
      const src = icon.src as string;

      expect(src.startsWith("/")).toBe(true);
      expect(existsSync(`${publicDir}${src.slice(1)}`)).toBe(true);
    }
  });

  it("ships the apple-touch-icon referenced by the root layout", () => {
    expect(existsSync(`${publicDir}icons/apple-touch-icon.png`)).toBe(true);
  });
});
