import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories";
import { DeckCardService, DeckService } from "@/lib/deck/deck-service";
import {
  closeAndDelete,
  MOCK_SOL_RING,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";
import type { Card } from "@/types/card";

function mockCard(
  overrides: Partial<Omit<Card, "updatedAt">> & {
    id: string;
    oracleId: string;
    name: string;
  },
): Omit<Card, "updatedAt"> {
  return {
    manaValue: 1,
    typeLine: "Artifact",
    colors: [],
    colorIdentity: [],
    keywords: [],
    ...overrides,
  };
}

describe("deck management integration", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("create deck → add 10 cards → reload → 10 cards persist", async () => {
    database = await resetDatabase();
    const decks = new DeckService(database);
    const cards = new DeckCardService(database);
    const cardRepo = new CardRepository(database);

    const deck = await decks.createDeck({
      name: "Ten Card Test",
      format: "commander",
    });

    for (let i = 0; i < 10; i += 1) {
      const card = await cardRepo.upsert(
        mockCard({
          id: `card-${i}`,
          oracleId: `oracle-${i}`,
          name: `Test Card ${i}`,
        }),
      );
      await cards.addCardToDeck({
        deckId: deck.id,
        cardId: card.id,
      });
    }

    const name = database.name;
    database.close();
    const { DeckBuilderDatabase: DB } = await import("@/lib/db/database");
    const reopened = new DB(name);
    await reopened.open();
    database = reopened;

    const listed = await new DeckCardService(reopened).listByDeck(deck.id);
    expect(listed).toHaveLength(10);
  });

  it("change status current → add → filter shows card in add filter", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new DeckCardService(database);

    await service.setStatus(seeded.deckCard.id, "add");
    const adds = await service.listByDeck(seeded.deck.id, "add");
    expect(adds).toHaveLength(1);
    expect(adds[0]?.id).toBe(seeded.deckCard.id);
  });

  it("assign roles/synergies → persist", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const service = new DeckCardService(database);

    await service.setRoles(seeded.deckCard.id, ["role.ramp", "role.tutor"]);
    await service.setSynergies(seeded.deckCard.id, ["synergy.artifact"]);

    const reloaded = await service.listByDeck(seeded.deck.id);
    expect(reloaded[0]?.roles).toEqual(["role.ramp", "role.tutor"]);
    expect(reloaded[0]?.synergies).toEqual(["synergy.artifact"]);
  });

  it("duplicate deck is independent — edits do not affect original", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const decks = new DeckService(database);
    const cards = new DeckCardService(database);

    const copy = await decks.duplicateDeck(seeded.deck.id, "Copy Deck");
    const copyCards = await cards.listByDeck(copy.id);
    expect(copyCards).toHaveLength(1);

    await cards.setStatus(copyCards[0]!.id, "cut");
    const original = await cards.listByDeck(seeded.deck.id);
    expect(original[0]?.status).toBe("current");
  });

  it("archive hides from list; unarchive restores", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const decks = new DeckService(database);

    await decks.archiveDeck(seeded.deck.id);
    expect(await decks.listDecks(false)).toHaveLength(0);
    expect(await decks.listDecks(true)).toHaveLength(1);

    await decks.unarchiveDeck(seeded.deck.id);
    expect(await decks.listDecks(false)).toHaveLength(1);
  });

  it("offline: add cached card to deck works", async () => {
    database = await resetDatabase();
    const cardRepo = new CardRepository(database);
    const card = await cardRepo.upsert(MOCK_SOL_RING);
    const decks = new DeckService(database);
    const cards = new DeckCardService(database);

    const deck = await decks.createDeck({
      name: "Offline Deck",
      format: "commander",
    });

    const result = await cards.addCardToDeck({
      deckId: deck.id,
      cardId: card.id,
    });
    expect(result.deckCard.cardId).toBe(card.id);
    expect(result.merged).toBe(false);
  });

  it("rename and cascade delete", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const decks = new DeckService(database);

    const renamed = await decks.renameDeck(seeded.deck.id, "Renamed");
    expect(renamed.name).toBe("Renamed");

    await decks.deleteDeck(seeded.deck.id);
    expect(await database.deckCards.count()).toBe(0);
  });
});
