import { describe, expect, it } from "vitest";

import {
  annotateProjectedKind,
  buildProjectedDeckList,
  computeProjectedCounts,
  getProjectedDeckCards,
} from "@/lib/deck/changes/projected-deck";
import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";

function deckCard(
  overrides: Partial<DeckCard> & Pick<DeckCard, "id" | "status">,
): DeckCard {
  return {
    deckId: "d1",
    cardId: overrides.cardId ?? `card-${overrides.id}`,
    quantity: 1,
    zone: "mainboard",
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function card(id: string, name: string): Card {
  return {
    id,
    oracleId: `oracle-${id}`,
    name,
    manaValue: 1,
    typeLine: "Creature",
    colors: [],
    colorIdentity: [],
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

const deck: Deck = {
  id: "d1",
  name: "Test",
  format: "commander",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("projected deck", () => {
  it("excludes cut and consider; includes current + add", () => {
    const cards = [
      deckCard({ id: "1", status: "current" }),
      deckCard({ id: "2", status: "add" }),
      deckCard({ id: "3", status: "cut" }),
      deckCard({ id: "4", status: "consider" }),
    ];
    expect(getProjectedDeckCards(cards).map((c) => c.id)).toEqual(["1", "2"]);
  });

  it("computes CURRENT + ADD − CUT quantities", () => {
    const cards = [
      deckCard({ id: "1", status: "current", quantity: 90 }),
      deckCard({ id: "2", status: "add", quantity: 8 }),
      deckCard({ id: "3", status: "cut", quantity: 5 }),
      deckCard({ id: "4", status: "consider", quantity: 3 }),
    ];
    const counts = computeProjectedCounts(cards);
    expect(counts.currentQuantity).toBe(90);
    expect(counts.addQuantity).toBe(8);
    expect(counts.cutQuantity).toBe(5);
    expect(counts.projectedQuantity).toBe(98);
    expect(counts.considerQuantity).toBe(3);
  });

  it("annotates incoming vs staying", () => {
    expect(annotateProjectedKind("add")).toBe("incoming");
    expect(annotateProjectedKind("current")).toBe("staying");
  });

  it("buildProjectedDeckList badges NEW/STAYING and changesOnly filter", () => {
    const deckCards = [
      deckCard({ id: "1", status: "current", cardId: "a" }),
      deckCard({ id: "2", status: "add", cardId: "b" }),
      deckCard({ id: "3", status: "cut", cardId: "c" }),
    ];
    const meta = [card("a", "Alpha"), card("b", "Beta"), card("c", "Cut")];
    const full = buildProjectedDeckList(deck, deckCards, meta);
    expect(full).toHaveLength(2);
    expect(full.find((r) => r.id === "2")?.kind).toBe("incoming");
    expect(full.find((r) => r.id === "1")?.kind).toBe("staying");

    const changes = buildProjectedDeckList(deck, deckCards, meta, {
      changesOnly: true,
    });
    expect(changes).toHaveLength(1);
    expect(changes[0]?.id).toBe("2");
  });

  it("excludes maybeboard from projected counts", () => {
    const cards = [
      deckCard({ id: "1", status: "current", zone: "mainboard" }),
      deckCard({ id: "2", status: "add", zone: "maybeboard" }),
    ];
    expect(computeProjectedCounts(cards).projectedQuantity).toBe(1);
  });
});
