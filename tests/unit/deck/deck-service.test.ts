import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories";
import { DeckService, DeckCardService } from "@/lib/deck/deck-service";
import { getDuplicateWarnings } from "@/lib/deck/duplicate-detection";
import {
  closeAndDelete,
  MOCK_SOL_RING,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";
import type { Card } from "@/types/card";

const MOCK_PLAINS: Omit<Card, "updatedAt"> = {
  id: "plains-1111-1111-1111-111111111111",
  oracleId: "plains-oracle-2222-4222-8222-222222222222",
  name: "Plains",
  manaCost: "",
  manaValue: 0,
  typeLine: "Basic Land — Plains",
  colors: [],
  colorIdentity: ["W"],
  keywords: [],
};

const MOCK_SOL_RING_ALT: Omit<Card, "updatedAt"> = {
  ...MOCK_SOL_RING,
  id: "33333333-3333-4333-8333-333333333333",
};

describe("deck service (unit)", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("duplicateDeck copies all deckCards with new ids", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const cards = new DeckCardService(database);
    await cards.addCardToDeck({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "sideboard",
      status: "consider",
    });

    const service = new DeckService(database);
    const copy = await service.duplicateDeck(seeded.deck.id);

    expect(copy.id).not.toBe(seeded.deck.id);
    expect(copy.name).toBe(`${seeded.deck.name} (Copy)`);

    const originalCards = await cards.listByDeck(seeded.deck.id);
    const copiedCards = await cards.listByDeck(copy.id);
    expect(copiedCards).toHaveLength(originalCards.length);
    const originalIds = new Set(originalCards.map((c) => c.id));
    for (const card of copiedCards) {
      expect(originalIds.has(card.id)).toBe(false);
      expect(card.deckId).toBe(copy.id);
    }
  });

  it("addCardToDeck increments quantity on duplicate cardId+zone+status", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new DeckCardService(database);

    const first = await service.addCardToDeck({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "mainboard",
      status: "current",
    });
    expect(first.merged).toBe(true);
    expect(first.deckCard.quantity).toBe(2);

    const consider = await service.addCardToDeck({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "mainboard",
      status: "consider",
    });
    expect(consider.merged).toBe(false);
    expect(consider.deckCard.status).toBe("consider");

    const all = await service.listByDeck(seeded.deck.id);
    expect(all).toHaveLength(2);
  });

  it("setCommander creates commander zone card", async () => {
    database = await resetDatabase();
    const decks = new DeckService(database);
    const cardRepo = new CardRepository(database);
    const card = await cardRepo.upsert(MOCK_SOL_RING);

    const deck = await decks.createDeck({
      name: "Commander Test",
      format: "commander",
    });
    const updated = await decks.setCommander(deck.id, card.id);

    expect(updated.commanderId).toBe(card.id);
    const deckCards = await new DeckCardService(database).listByDeck(deck.id);
    expect(deckCards).toHaveLength(1);
    expect(deckCards[0]?.zone).toBe("commander");
    expect(deckCards[0]?.quantity).toBe(1);
    expect(deckCards[0]?.status).toBe("current");
  });

  it("deleteDeck cascades deckCards", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    await new DeckService(database).deleteDeck(seeded.deck.id);
    expect(await database.decks.count()).toBe(0);
    expect(await database.deckCards.count()).toBe(0);
  });
});

describe("duplicate detection", () => {
  it("ignores basic lands", () => {
    const warnings = getDuplicateWarnings({
      existingDeckCards: [
        {
          id: "dc1",
          deckId: "d1",
          cardId: MOCK_PLAINS.id,
          quantity: 1,
          zone: "mainboard",
          status: "current",
          roles: [],
          synergies: [],
          addedAt: "",
          updatedAt: "",
        },
      ],
      cardsById: new Map([[MOCK_PLAINS.id, { ...MOCK_PLAINS, updatedAt: "" }]]),
      candidate: { ...MOCK_PLAINS, updatedAt: "" },
    });
    expect(warnings).toHaveLength(0);
  });

  it("warns for non-basic duplicates by oracleId", () => {
    const warnings = getDuplicateWarnings({
      existingDeckCards: [
        {
          id: "dc1",
          deckId: "d1",
          cardId: MOCK_SOL_RING.id,
          quantity: 1,
          zone: "mainboard",
          status: "current",
          roles: [],
          synergies: [],
          addedAt: "",
          updatedAt: "",
        },
      ],
      cardsById: new Map([
        [MOCK_SOL_RING.id, { ...MOCK_SOL_RING, updatedAt: "" }],
        [MOCK_SOL_RING_ALT.id, { ...MOCK_SOL_RING_ALT, updatedAt: "" }],
      ]),
      candidate: { ...MOCK_SOL_RING_ALT, updatedAt: "" },
    });
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.oracleId).toBe(MOCK_SOL_RING.oracleId);
  });
});
