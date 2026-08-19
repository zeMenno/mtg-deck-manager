import { describe, expect, it } from "vitest";

import { describeManaCost, parseManaCost } from "@/lib/mana/parse-mana-cost";

describe("parseManaCost", () => {
  it("returns empty for nullish / blank", () => {
    expect(parseManaCost(undefined)).toEqual([]);
    expect(parseManaCost(null)).toEqual([]);
    expect(parseManaCost("")).toEqual([]);
    expect(parseManaCost("   ")).toEqual([]);
  });

  it("parses generic, colored, hybrid, phyrexian, X, snow, colorless, tap", () => {
    expect(parseManaCost("{2}{W}{U}")).toEqual([
      { raw: "{2}" },
      { raw: "{W}" },
      { raw: "{U}" },
    ]);
    expect(parseManaCost("{W/U}")).toEqual([{ raw: "{W/U}" }]);
    expect(parseManaCost("{2/W}")).toEqual([{ raw: "{2/W}" }]);
    expect(parseManaCost("{W/P}")).toEqual([{ raw: "{W/P}" }]);
    expect(parseManaCost("{X}{S}{C}{T}{Q}")).toEqual([
      { raw: "{X}" },
      { raw: "{S}" },
      { raw: "{C}" },
      { raw: "{T}" },
      { raw: "{Q}" },
    ]);
  });

  it("marks unknown garbage", () => {
    expect(parseManaCost("garbage")).toEqual([
      { raw: "garbage", unknown: true },
    ]);
  });

  it("describes costs for accessibility", () => {
    expect(describeManaCost("{2}{W/U}{X}")).toContain("generic");
    expect(describeManaCost(undefined)).toBe("no mana cost");
  });
});
