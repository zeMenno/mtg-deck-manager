import { describe, expect, it } from "vitest";

import {
  computeAverageManaValue,
  computeManaCurve,
  countLands,
} from "@/lib/deck/stats/mana-curve";
import type { DeckCardWithCard } from "@/types/deck";
import type { Card } from "@/types/card";

function card(
  overrides: Partial<Card> &
    Pick<Card, "id" | "name" | "manaValue" | "typeLine">,
): Card {
  return {
    oracleId: overrides.id,
    colors: [],
    colorIdentity: [],
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function entry(
  quantity: number,
  meta: Partial<Card> & Pick<Card, "id" | "name" | "manaValue" | "typeLine">,
): DeckCardWithCard {
  return {
    id: `dc-${meta.id}`,
    deckId: "d1",
    cardId: meta.id,
    quantity,
    zone: "mainboard",
    status: "current",
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    card: card(meta),
  };
}

describe("mana curve", () => {
  it("buckets mixed quantities including 7+", () => {
    const cards = [
      entry(2, { id: "a", name: "A", manaValue: 0, typeLine: "Land" }),
      entry(3, { id: "b", name: "B", manaValue: 2, typeLine: "Creature" }),
      entry(1, { id: "c", name: "C", manaValue: 2, typeLine: "Instant" }),
      entry(2, { id: "d", name: "D", manaValue: 8, typeLine: "Creature" }),
      entry(1, { id: "e", name: "E", manaValue: 7, typeLine: "Sorcery" }),
    ];
    const curve = computeManaCurve(cards);
    expect(curve.find((b) => b.cmc === 0)?.count).toBe(2);
    expect(curve.find((b) => b.cmc === 2)?.count).toBe(4);
    expect(curve.find((b) => b.cmc === 7)?.count).toBe(3);
    expect(curve.find((b) => b.cmc === 7)?.label).toBe("7+");
  });

  it("can exclude lands", () => {
    const cards = [
      entry(5, {
        id: "l",
        name: "Plains",
        manaValue: 0,
        typeLine: "Basic Land — Plains",
      }),
      entry(1, { id: "s", name: "Bolt", manaValue: 1, typeLine: "Instant" }),
    ];
    const curve = computeManaCurve(cards, { excludeLands: true });
    expect(curve.find((b) => b.cmc === 0)?.count).toBe(0);
    expect(curve.find((b) => b.cmc === 1)?.count).toBe(1);
  });

  it("computes average mana value for non-lands", () => {
    const cards = [
      entry(2, { id: "a", name: "A", manaValue: 2, typeLine: "Creature" }),
      entry(2, { id: "b", name: "B", manaValue: 4, typeLine: "Creature" }),
      entry(10, { id: "l", name: "Land", manaValue: 0, typeLine: "Land" }),
    ];
    expect(computeAverageManaValue(cards)).toBe(3);
    expect(countLands(cards)).toBe(10);
  });
});
