import { describe, expect, it } from "vitest";

import {
  assertUniqueRemappedIds,
  remapDeckPackage,
} from "@/lib/import-export/id-remap";
import type { Deck, DeckCard } from "@/types/deck";

const deck: Deck = {
  id: "old-deck",
  name: "Original",
  format: "commander",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const deckCards: DeckCard[] = [
  {
    id: "old-dc-1",
    deckId: "old-deck",
    cardId: "card-1",
    quantity: 1,
    zone: "mainboard",
    status: "current",
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "old-dc-2",
    deckId: "old-deck",
    cardId: "card-2",
    quantity: 1,
    zone: "mainboard",
    status: "add",
    roles: [],
    synergies: [],
    replacesDeckCardId: "old-dc-1",
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
];

describe("remapDeckPackage", () => {
  it("produces unique ids and remaps replacesDeckCardId", () => {
    const result = remapDeckPackage({ deck, deckCards, newName: "Imported" });
    assertUniqueRemappedIds(result);
    expect(result.deck.id).not.toBe("old-deck");
    expect(result.deck.name).toBe("Imported");
    expect(result.deckCards[0]?.id).not.toBe("old-dc-1");
    expect(result.deckCards[0]?.deckId).toBe(result.deck.id);
    expect(result.deckCards[0]?.cardId).toBe("card-1");
    expect(result.deckCards[1]?.replacesDeckCardId).toBe(
      result.deckCards[0]?.id,
    );
  });
});
