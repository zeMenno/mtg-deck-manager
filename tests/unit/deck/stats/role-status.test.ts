import { describe, expect, it } from "vitest";

import {
  computeRoleDistribution,
  computeSynergyDistribution,
  countCardsWithRole,
} from "@/lib/deck/stats/role-distribution";
import { computeStatusCounts } from "@/lib/deck/stats/status-counts";
import { computeDeckSize } from "@/lib/deck/stats/deck-size";
import { computeDeckStats } from "@/lib/deck/stats/compute-deck-stats";
import type { Tag } from "@/types/card";
import type { Card } from "@/types/card";
import type { Deck, DeckCardWithCard } from "@/types/deck";

const tags: Tag[] = [
  { id: "role.ramp", name: "Ramp", category: "role" },
  { id: "role.removal", name: "Removal", category: "role" },
  { id: "synergy.soldier", name: "Soldier", category: "synergy" },
];

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    oracleId: `oracle-${id}`,
    name: overrides.name ?? id,
    manaValue: overrides.manaValue ?? 1,
    typeLine: overrides.typeLine ?? "Creature",
    colors: overrides.colors ?? ["W"],
    colorIdentity: overrides.colorIdentity ?? ["W"],
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry(
  partial: Partial<DeckCardWithCard> & { card: Card },
): DeckCardWithCard {
  return {
    id: partial.id ?? `dc-${partial.card.id}`,
    deckId: "d1",
    cardId: partial.card.id,
    quantity: partial.quantity ?? 1,
    zone: partial.zone ?? "mainboard",
    status: partial.status ?? "current",
    roles: partial.roles ?? [],
    synergies: partial.synergies ?? [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    card: partial.card,
  };
}

describe("role and status stats", () => {
  it("double-counts a card with two roles", () => {
    const cards = [
      makeEntry({
        card: makeCard("a"),
        quantity: 2,
        roles: ["role.ramp", "role.removal"],
      }),
    ];
    const roles = computeRoleDistribution(cards, tags);
    expect(roles.find((r) => r.id === "role.ramp")?.count).toBe(2);
    expect(roles.find((r) => r.id === "role.removal")?.count).toBe(2);
    expect(countCardsWithRole(cards, "role.ramp")).toBe(2);
  });

  it("resolves synergy names via tag map", () => {
    const cards = [
      makeEntry({
        card: makeCard("s"),
        synergies: ["synergy.soldier"],
      }),
    ];
    const synergies = computeSynergyDistribution(cards, tags);
    expect(synergies[0]?.label).toBe("Soldier");
  });

  it("sums status quantities across zones including maybeboard", () => {
    const cards = [
      makeEntry({ card: makeCard("1"), status: "current", quantity: 2 }),
      makeEntry({
        card: makeCard("2"),
        status: "add",
        quantity: 3,
        zone: "maybeboard",
      }),
      makeEntry({ card: makeCard("3"), status: "cut", quantity: 1 }),
      makeEntry({ card: makeCard("4"), status: "consider", quantity: 4 }),
    ];
    expect(computeStatusCounts(cards)).toEqual({
      current: 2,
      add: 3,
      cut: 1,
      consider: 4,
    });
  });

  it("commander size totals mainboard + commander toward 100", () => {
    const deck: Deck = {
      id: "d1",
      name: "Soldiers",
      format: "commander",
      commanderId: "cmd",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const cards = [
      makeEntry({
        card: makeCard("cmd", { name: "Adeline" }),
        zone: "commander",
      }),
      ...Array.from({ length: 99 }, (_, i) =>
        makeEntry({
          card: makeCard(`c${i}`, {
            typeLine: i < 33 ? "Basic Land — Plains" : "Creature",
            manaValue: i < 33 ? 0 : 2,
          }),
        }),
      ),
    ];
    const size = computeDeckSize(deck, cards, "current");
    expect(size.total).toBe(100);
    expect(size.commander).toBe(1);
    expect(size.mainboard).toBe(99);
    expect(size.target).toBe(100);
  });

  it("computeDeckStats projected mode excludes cut and includes add", () => {
    const deck: Deck = {
      id: "d1",
      name: "Test",
      format: "commander",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const cards = [
      makeEntry({
        card: makeCard("keep", { manaValue: 1 }),
        status: "current",
      }),
      makeEntry({
        card: makeCard("add", { manaValue: 3 }),
        status: "add",
      }),
      makeEntry({
        card: makeCard("cut", { manaValue: 5 }),
        status: "cut",
      }),
    ];
    const current = computeDeckStats(
      { deck, deckCards: cards, tags },
      "current",
    );
    const projected = computeDeckStats(
      { deck, deckCards: cards, tags },
      "projected",
    );
    expect(current.counts.mainboard).toBe(1);
    expect(projected.counts.mainboard).toBe(2);
    expect(current.manaCurve.find((b) => b.cmc === 5)?.count).toBe(0);
    expect(projected.manaCurve.find((b) => b.cmc === 3)?.count).toBe(1);
    expect(projected.statusCounts.add).toBe(1);
  });
});
