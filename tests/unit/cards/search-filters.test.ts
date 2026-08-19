import { describe, expect, it } from "vitest";

import {
  applyLocalFilters,
  buildScryfallQuery,
  clearFilters,
  countActiveFilters,
} from "@/lib/cards/search-filters";
import type { Card } from "@/types/card";

function fixture(partial: Partial<Card> & Pick<Card, "id" | "name">): Card {
  return {
    oracleId: partial.id,
    manaValue: 0,
    typeLine: "Creature",
    colors: [],
    colorIdentity: [],
    keywords: [],
    updatedAt: new Date().toISOString(),
    ...partial,
  };
}

describe("buildScryfallQuery", () => {
  it("returns text alone when filters empty", () => {
    expect(buildScryfallQuery("bolt", {})).toBe("bolt");
  });

  it("appends filter fragments without rewriting text", () => {
    expect(
      buildScryfallQuery("bolt", {
        colors: ["R"],
        colorMode: "including",
        types: ["instant"],
        rarities: ["common"],
        manaValueMax: 1,
        legalIn: "commander",
      }),
    ).toBe("bolt c>=r (t:instant) (r:common) cmc<=1 legal:commander");
  });

  it("supports exact and atMost color modes", () => {
    expect(
      buildScryfallQuery("", { colors: ["W", "U"], colorMode: "exact" }),
    ).toBe("c=wu");
    expect(
      buildScryfallQuery("", { colors: ["W", "U"], colorMode: "atMost" }),
    ).toBe("c<=wu");
  });
});

describe("countActiveFilters / clearFilters", () => {
  it("counts and clears", () => {
    expect(countActiveFilters({})).toBe(0);
    expect(
      countActiveFilters({
        colors: ["R"],
        types: ["instant"],
        manaValueMin: 1,
      }),
    ).toBe(3);
    expect(clearFilters()).toEqual({});
  });
});

describe("applyLocalFilters", () => {
  const cards = [
    fixture({
      id: "1",
      name: "Lightning Bolt",
      colors: ["R"],
      colorIdentity: ["R"],
      typeLine: "Instant",
      rarity: "common",
      manaValue: 1,
      setCode: "lea",
      legalities: { commander: "legal", modern: "legal" },
    }),
    fixture({
      id: "2",
      name: "Counterspell",
      colors: ["U"],
      colorIdentity: ["U"],
      typeLine: "Instant",
      rarity: "uncommon",
      manaValue: 2,
      setCode: "mh2",
      legalities: { commander: "legal" },
    }),
    fixture({
      id: "3",
      name: "Sol Ring",
      colors: [],
      colorIdentity: [],
      typeLine: "Artifact",
      rarity: "uncommon",
      manaValue: 1,
      setCode: "c21",
      legalities: { commander: "legal" },
    }),
  ];

  it("filters by color including and type", () => {
    const result = applyLocalFilters(cards, {
      colors: ["R"],
      colorMode: "including",
      types: ["instant"],
    });
    expect(result.map((c) => c.name)).toEqual(["Lightning Bolt"]);
  });

  it("filters colorless and legalIn", () => {
    expect(
      applyLocalFilters(cards, { colors: ["C"] }).map((c) => c.name),
    ).toEqual(["Sol Ring"]);
    expect(
      applyLocalFilters(cards, { legalIn: "modern" }).map((c) => c.name),
    ).toEqual(["Lightning Bolt"]);
  });
});
