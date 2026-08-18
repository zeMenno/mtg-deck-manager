import { describe, expect, it } from "vitest";

import {
  getActiveDeckCards,
  getCurrentDeckCards,
  getProjectedDeckCards,
  withResolvedCards,
} from "@/lib/deck/stats/filters";
import type { Card } from "@/types/card";
import type { DeckCard } from "@/types/deck";

function makeDeckCard(
  overrides: Partial<DeckCard> & Pick<DeckCard, "id" | "status" | "zone">,
): DeckCard {
  return {
    deckId: "deck-1",
    cardId: "card-1",
    quantity: 1,
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const cardMeta: Card = {
  id: "card-1",
  oracleId: "oracle-1",
  name: "Sol Ring",
  manaValue: 1,
  typeLine: "Artifact",
  colors: [],
  colorIdentity: [],
  keywords: [],
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("deck stats filters", () => {
  it("returns empty for empty deck", () => {
    expect(getCurrentDeckCards([])).toEqual([]);
    expect(getProjectedDeckCards([])).toEqual([]);
  });

  it("current mode keeps current, excludes maybeboard and non-current", () => {
    const cards = [
      makeDeckCard({ id: "1", status: "current", zone: "mainboard" }),
      makeDeckCard({ id: "2", status: "add", zone: "mainboard" }),
      makeDeckCard({ id: "3", status: "cut", zone: "mainboard" }),
      makeDeckCard({ id: "4", status: "current", zone: "maybeboard" }),
      makeDeckCard({ id: "5", status: "consider", zone: "mainboard" }),
    ];
    expect(getCurrentDeckCards(cards).map((c) => c.id)).toEqual(["1"]);
  });

  it("projected mode includes current + add, excludes cut and maybeboard", () => {
    const cards = [
      makeDeckCard({ id: "1", status: "current", zone: "mainboard" }),
      makeDeckCard({ id: "2", status: "add", zone: "mainboard" }),
      makeDeckCard({ id: "3", status: "cut", zone: "mainboard" }),
      makeDeckCard({ id: "4", status: "add", zone: "maybeboard" }),
      makeDeckCard({ id: "5", status: "consider", zone: "mainboard" }),
    ];
    expect(getProjectedDeckCards(cards).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("all-cut deck yields empty projected and current", () => {
    const cards = [
      makeDeckCard({ id: "1", status: "cut", zone: "mainboard" }),
      makeDeckCard({ id: "2", status: "cut", zone: "commander" }),
    ];
    expect(getCurrentDeckCards(cards)).toHaveLength(0);
    expect(getProjectedDeckCards(cards)).toHaveLength(0);
  });

  it("getActiveDeckCards switches by mode", () => {
    const cards = [
      makeDeckCard({ id: "1", status: "current", zone: "mainboard" }),
      makeDeckCard({ id: "2", status: "add", zone: "mainboard" }),
    ];
    expect(getActiveDeckCards(cards, "current")).toHaveLength(1);
    expect(getActiveDeckCards(cards, "projected")).toHaveLength(2);
  });

  it("withResolvedCards joins metadata and placeholders", () => {
    const deckCards = [
      makeDeckCard({ id: "1", status: "current", zone: "mainboard" }),
      makeDeckCard({
        id: "2",
        status: "current",
        zone: "mainboard",
        cardId: "missing",
      }),
    ];
    const map = new Map([["card-1", cardMeta]]);
    const joined = withResolvedCards(deckCards, map);
    expect(joined[0]?.card.name).toBe("Sol Ring");
    expect(joined[1]?.card.name).toBe("Unknown card");
  });
});
