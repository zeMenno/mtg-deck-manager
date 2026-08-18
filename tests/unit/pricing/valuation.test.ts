import { describe, expect, it } from "vitest";

import {
  calculateCutValue,
  calculateDeckValue,
  calculateNetUpgrade,
  calculateUpgradeCost,
  selectUnitPrice,
} from "@/lib/pricing/valuation";
import type { CardPrice } from "@/types/card";
import type { DeckCard } from "@/types/deck";

function deckCard(
  overrides: Partial<DeckCard> & Pick<DeckCard, "id" | "cardId" | "status">,
): DeckCard {
  return {
    deckId: "d1",
    quantity: 1,
    zone: "mainboard",
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function price(cardId: string, overrides: Partial<CardPrice> = {}): CardPrice {
  return {
    cardId,
    currency: "USD",
    source: "scryfall",
    fetchedAt: "2026-08-18T00:00:00.000Z",
    ...overrides,
  };
}

describe("selectUnitPrice", () => {
  it("prefers foil when deck card is foil", () => {
    expect(
      selectUnitPrice(price("a", { normal: 1, foil: 5 }), { foil: true }),
    ).toBe(5);
  });

  it("falls back to normal when foil missing", () => {
    expect(selectUnitPrice(price("a", { normal: 1.5 }), { foil: true })).toBe(
      1.5,
    );
  });

  it("returns undefined when no fields present", () => {
    expect(selectUnitPrice(price("a"), { foil: false })).toBeUndefined();
  });

  it("allows legitimate zero", () => {
    expect(selectUnitPrice(price("a", { normal: 0 }), { foil: false })).toBe(0);
  });
});

describe("calculateUpgradeCost", () => {
  it("sums multi-qty ADD cards", () => {
    const cards = [
      deckCard({ id: "1", cardId: "a", status: "add", quantity: 2 }),
      deckCard({ id: "2", cardId: "b", status: "add", quantity: 1 }),
      deckCard({ id: "3", cardId: "c", status: "current", quantity: 1 }),
    ];
    const prices = new Map([
      ["a", price("a", { normal: 10 })],
      ["b", price("b", { normal: 5 })],
    ]);
    const result = calculateUpgradeCost(cards, prices);
    expect(result.total).toBe(25);
    expect(result.pricedCount).toBe(2);
    expect(result.totalCount).toBe(2);
  });

  it("excludes unpriced from total but counts them", () => {
    const cards = [
      deckCard({ id: "1", cardId: "a", status: "add" }),
      deckCard({ id: "2", cardId: "b", status: "add" }),
    ];
    const prices = new Map([["a", price("a", { normal: 3 })]]);
    const result = calculateUpgradeCost(cards, prices);
    expect(result.total).toBe(3);
    expect(result.pricedCount).toBe(1);
    expect(result.totalCount).toBe(2);
    expect(result.unpricedCardIds).toEqual(["b"]);
  });

  it("returns total undefined when zero cards priced", () => {
    const cards = [deckCard({ id: "1", cardId: "a", status: "add" })];
    const result = calculateUpgradeCost(cards, new Map());
    expect(result.total).toBeUndefined();
    expect(result.pricedCount).toBe(0);
    expect(result.totalCount).toBe(1);
  });

  it("uses foil price for foil ADD cards", () => {
    const cards = [
      deckCard({ id: "1", cardId: "a", status: "add", foil: true }),
    ];
    const prices = new Map([["a", price("a", { normal: 2, foil: 8 })]]);
    expect(calculateUpgradeCost(cards, prices).total).toBe(8);
  });
});

describe("calculateDeckValue", () => {
  it("sums current cards and excludes maybeboard", () => {
    const cards = [
      deckCard({ id: "1", cardId: "a", status: "current", quantity: 2 }),
      deckCard({
        id: "2",
        cardId: "b",
        status: "current",
        zone: "maybeboard",
      }),
      deckCard({ id: "3", cardId: "c", status: "add" }),
    ];
    const prices = new Map([
      ["a", price("a", { normal: 4 })],
      ["b", price("b", { normal: 100 })],
      ["c", price("c", { normal: 50 })],
    ]);
    expect(calculateDeckValue(cards, prices).total).toBe(8);
  });
});

describe("calculateNetUpgrade", () => {
  it("subtracts cut value from add cost", () => {
    const cards = [
      deckCard({ id: "1", cardId: "a", status: "add" }),
      deckCard({ id: "2", cardId: "b", status: "cut" }),
    ];
    const prices = new Map([
      ["a", price("a", { normal: 20 })],
      ["b", price("b", { normal: 5 })],
    ]);
    const add = calculateUpgradeCost(cards, prices);
    const cut = calculateCutValue(cards, prices);
    const net = calculateNetUpgrade(add, cut);
    expect(net.net).toBe(15);
  });

  it("returns undefined net when add unpriced", () => {
    const add = {
      total: undefined,
      pricedCount: 0,
      totalCount: 1,
      unpricedCardIds: ["a"],
    };
    const cut = {
      total: 5,
      pricedCount: 1,
      totalCount: 1,
      unpricedCardIds: [],
    };
    expect(calculateNetUpgrade(add, cut).net).toBeUndefined();
  });
});
