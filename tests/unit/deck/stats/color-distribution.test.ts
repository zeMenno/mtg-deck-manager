import { describe, expect, it } from "vitest";

import {
  buildColorDistribution,
  computeColorDistribution,
} from "@/lib/deck/stats/color-distribution";
import type { DeckCardWithCard } from "@/types/deck";
import type { Card } from "@/types/card";
import type { Deck } from "@/types/deck";

function entry(
  colors: string[],
  quantity: number,
  typeLine = "Creature",
): DeckCardWithCard {
  const card: Card = {
    id: `${colors.join("") || "C"}-${quantity}`,
    oracleId: colors.join("") || "C",
    name: colors.join("") || "Colorless",
    manaValue: 2,
    typeLine,
    colors,
    colorIdentity: colors,
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return {
    id: `dc-${card.id}`,
    deckId: "d1",
    cardId: card.id,
    quantity,
    zone: "mainboard",
    status: "current",
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    card,
  };
}

describe("color distribution", () => {
  it("counts each color on multicolor cards by quantity", () => {
    const pips = computeColorDistribution([
      entry(["W", "U"], 2),
      entry(["R"], 1),
      entry([], 3),
    ]);
    expect(pips.W).toBe(2);
    expect(pips.U).toBe(2);
    expect(pips.R).toBe(1);
    expect(pips.C).toBe(3);
  });

  it("ignores lands for pip counts", () => {
    const pips = computeColorDistribution([
      entry(["W"], 5, "Basic Land — Plains"),
      entry(["U"], 1, "Instant"),
    ]);
    expect(pips.W).toBe(0);
    expect(pips.U).toBe(1);
  });

  it("uses commander identity when provided", () => {
    const deck: Deck = {
      id: "d1",
      name: "Test",
      format: "commander",
      commanderId: "cmd",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const commander: Card = {
      id: "cmd",
      oracleId: "cmd-o",
      name: "Adeline",
      manaValue: 3,
      typeLine: "Legendary Creature — Human Knight",
      colors: ["W"],
      colorIdentity: ["W"],
      keywords: [],
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const dist = buildColorDistribution(
      deck,
      [entry(["W", "R"], 1)],
      commander,
    );
    expect(dist.identity).toEqual(["W"]);
  });
});
