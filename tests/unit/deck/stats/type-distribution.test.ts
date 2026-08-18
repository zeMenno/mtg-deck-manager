import { describe, expect, it } from "vitest";

import {
  computeTypeDistribution,
  parsePrimaryType,
} from "@/lib/deck/stats/type-distribution";
import type { DeckCardWithCard } from "@/types/deck";
import type { Card } from "@/types/card";

function entry(typeLine: string, quantity = 1): DeckCardWithCard {
  const card: Card = {
    id: typeLine,
    oracleId: typeLine,
    name: typeLine,
    manaValue: 1,
    typeLine,
    colors: [],
    colorIdentity: [],
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
  return {
    id: `dc-${typeLine}`,
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

describe("type distribution", () => {
  it("parses Legendary, Artifact Creature, and Land", () => {
    expect(parsePrimaryType("Legendary Creature — Human Soldier")).toBe(
      "Creature",
    );
    expect(parsePrimaryType("Artifact Creature — Construct")).toBe("Creature");
    expect(parsePrimaryType("Land — Plains")).toBe("Land");
    expect(parsePrimaryType("Instant")).toBe("Instant");
    expect(parsePrimaryType("Legendary Artifact — Equipment")).toBe("Artifact");
  });

  it("aggregates quantities by primary type", () => {
    const dist = computeTypeDistribution([
      entry("Creature — Soldier", 3),
      entry("Instant", 2),
      entry("Basic Land — Plains", 10),
    ]);
    expect(dist.find((d) => d.id === "Creature")?.count).toBe(3);
    expect(dist.find((d) => d.id === "Instant")?.count).toBe(2);
    expect(dist.find((d) => d.id === "Land")?.count).toBe(10);
  });
});
