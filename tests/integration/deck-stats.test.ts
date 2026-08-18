import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories";
import { DeckCardService, DeckService } from "@/lib/deck/deck-service";
import { computeDeckStats } from "@/lib/deck/stats";
import { getDeckWarnings } from "@/lib/deck-rules";
import {
  closeAndDelete,
  MOCK_SOL_RING,
  seedDeck,
} from "@/tests/helpers/db-test-utils";
import type { Card } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

const MOCK_COMMANDER: Omit<Card, "updatedAt"> = {
  id: "adeline-1111-4111-8111-111111111111",
  oracleId: "adeline-oracle-2222-4222-8222-222222222222",
  name: "Adeline, Resplendent Cathar",
  manaCost: "{1}{W}{W}",
  manaValue: 3,
  typeLine: "Legendary Creature — Human Knight",
  colors: ["W"],
  colorIdentity: ["W"],
  keywords: [],
};

async function loadJoined(
  database: DeckBuilderDatabase,
  deckId: string,
): Promise<DeckCardWithCard[]> {
  const service = new DeckCardService(database);
  const cards = await service.listByDeck(deckId);
  const cardRepo = new CardRepository(database);
  const joined: DeckCardWithCard[] = [];
  for (const deckCard of cards) {
    const card = await cardRepo.getById(deckCard.cardId);
    if (!card) continue;
    joined.push({ ...deckCard, card });
  }
  return joined;
}

describe("deck stats integration", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("recomputes stats after adding a card", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const deckService = new DeckService(database);
    const cardService = new DeckCardService(database);
    const cardRepo = new CardRepository(database);

    await cardRepo.upsert(MOCK_COMMANDER);
    await deckService.setCommander(seeded.deck.id, MOCK_COMMANDER.id);

    const beforeCards = await loadJoined(database, seeded.deck.id);
    const before = computeDeckStats({
      deck: (await deckService.getDeck(seeded.deck.id))!,
      deckCards: beforeCards,
    });
    expect(before.counts.mainboard).toBe(1);

    await cardService.addCardToDeck({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "mainboard",
      status: "current",
    });

    const afterCards = await loadJoined(database, seeded.deck.id);
    const after = computeDeckStats({
      deck: (await deckService.getDeck(seeded.deck.id))!,
      deckCards: afterCards,
    });
    expect(after.counts.mainboard).toBe(2);
    expect(after.statusCounts.current).toBeGreaterThan(
      before.statusCounts.current,
    );
  });

  it("marks CUT excluded from current and included logic for projected", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const cardService = new DeckCardService(database);

    await cardService.setStatus(seeded.deckCard.id, "cut");
    const cards = await loadJoined(database, seeded.deck.id);
    const deck = (await new DeckService(database).getDeck(seeded.deck.id))!;

    const current = computeDeckStats({ deck, deckCards: cards }, "current");
    const projected = computeDeckStats({ deck, deckCards: cards }, "projected");

    expect(current.counts.mainboard).toBe(0);
    expect(projected.counts.mainboard).toBe(0);
    expect(current.statusCounts.cut).toBe(1);

    // Add an ADD card — projected includes it, current does not
    await cardService.addCardToDeck({
      deckId: seeded.deck.id,
      cardId: seeded.card.id,
      zone: "mainboard",
      status: "add",
    });
    const cards2 = await loadJoined(database, seeded.deck.id);
    const current2 = computeDeckStats({ deck, deckCards: cards2 }, "current");
    const projected2 = computeDeckStats(
      { deck, deckCards: cards2 },
      "projected",
    );
    expect(current2.counts.mainboard).toBe(0);
    expect(projected2.counts.mainboard).toBe(1);
  });

  it("assign Ramp role increases ramp count and clears low-ramp warning when enough", async () => {
    const seeded = await seedDeck(undefined, { card: MOCK_SOL_RING });
    database = seeded.database;
    const cardRepo = new CardRepository(database);
    const deckService = new DeckService(database);
    const cardService = new DeckCardService(database);

    await cardRepo.upsert(MOCK_COMMANDER);
    await deckService.setCommander(seeded.deck.id, MOCK_COMMANDER.id);

    // Seed 8 ramp pieces
    for (let i = 0; i < 8; i++) {
      const card = await cardRepo.upsert({
        ...MOCK_SOL_RING,
        id: `ramp-${i}-1111-4111-8111-11111111111${i}`,
        oracleId: `ramp-oracle-${i}`,
        name: `Ramp Rock ${i}`,
      });
      const added = await cardService.addCardToDeck({
        deckId: seeded.deck.id,
        cardId: card.id,
        zone: "mainboard",
        status: "current",
      });
      await cardService.updateDeckCard(added.deckCard.id, {
        roles: ["role.ramp"],
      });
    }

    const deck = (await deckService.getDeck(seeded.deck.id))!;
    const cards = await loadJoined(database, seeded.deck.id);
    const stats = computeDeckStats({ deck, deckCards: cards });
    expect(stats.manaSources).toBeGreaterThanOrEqual(8);

    const warnings = getDeckWarnings({
      deck,
      deckCards: cards,
      rampCount: stats.manaSources,
    });
    expect(warnings.some((w) => w.id === "low-ramp")).toBe(false);
  });
});
