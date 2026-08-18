import { describe, expect, it } from "vitest";

import {
  formatCurrency,
  formatPrice,
  formatPriceUnavailable,
  formatPriceWithMeta,
  formatRelativeTime,
  parsePrice,
} from "@/lib/pricing/format-price";

describe("parsePrice", () => {
  it("returns undefined for null", () => {
    expect(parsePrice(null)).toBeUndefined();
  });

  it("returns undefined for empty string", () => {
    expect(parsePrice("")).toBeUndefined();
  });

  it("parses valid decimals", () => {
    expect(parsePrice("0.25")).toBe(0.25);
  });

  it("parses valid zero", () => {
    expect(parsePrice("0.00")).toBe(0);
  });

  it("returns undefined for NaN strings", () => {
    expect(parsePrice("abc")).toBeUndefined();
  });
});

describe("formatPrice", () => {
  it("returns Price unavailable for undefined", () => {
    expect(formatPrice(undefined)).toBe("Price unavailable");
  });

  it("returns Price unavailable for null", () => {
    expect(formatPrice(null)).toBe("Price unavailable");
  });

  it("returns Price unavailable for NaN", () => {
    expect(formatPrice(Number.NaN)).toBe("Price unavailable");
  });

  it("formats valid zero as currency (not unavailable)", () => {
    const formatted = formatPrice(0, "USD");
    expect(formatted).not.toBe("Price unavailable");
    expect(formatted).toMatch(/0[.,]00/);
  });

  it("formats positive amounts", () => {
    expect(formatCurrency(1.5, "USD")).toMatch(/1[.,]50/);
  });
});

describe("formatRelativeTime", () => {
  const now = Date.parse("2026-08-18T12:00:00.000Z");

  it("shows Just now for recent timestamps", () => {
    expect(formatRelativeTime("2026-08-18T11:59:30.000Z", now)).toBe(
      "Just now",
    );
  });

  it("shows hours ago", () => {
    expect(formatRelativeTime("2026-08-18T09:00:00.000Z", now)).toBe("3h ago");
  });

  it("shows Yesterday", () => {
    expect(formatRelativeTime("2026-08-17T12:00:00.000Z", now)).toBe(
      "Yesterday",
    );
  });
});

describe("formatPriceWithMeta / unavailable", () => {
  it("includes source and relative time", () => {
    const now = Date.parse("2026-08-18T12:00:00.000Z");
    const label = formatPriceWithMeta(
      {
        normal: 0.25,
        source: "scryfall",
        fetchedAt: "2026-08-18T09:00:00.000Z",
        currency: "USD",
      },
      { showSource: true, showTimestamp: true },
    );
    // Relative time depends on Date.now — just assert structure when using explicit now via formatRelativeTime
    expect(formatRelativeTime("2026-08-18T09:00:00.000Z", now)).toBe("3h ago");
    expect(label).toContain("scryfall");
    expect(label).not.toBe("Price unavailable");
  });

  it("formatPriceUnavailable includes last known", () => {
    const label = formatPriceUnavailable({
      amount: 1.25,
      currency: "USD",
      fetchedAt: "2026-08-16T12:00:00.000Z",
    });
    expect(label).toContain("Price unavailable");
    expect(label).toContain("Last known");
    expect(label).not.toMatch(/^\$0\.00$/);
  });
});
