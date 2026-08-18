import type { DeckBuilderDatabase } from "@/lib/db/database";
import {
  CardRepository,
  DeckCardRepository,
  DeckRepository,
} from "@/lib/db/repositories";
import { MOCK_SOL_RING, resetDatabase } from "@/tests/helpers/db-test-utils";
import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";

export type UpgradeFixture = {
  database: DeckBuilderDatabase;
  deck: Deck;
  cards: Card[];
  current: DeckCard[];
  add: DeckCard[];
  cut: DeckCard[];
  consider: DeckCard[];
};

function mockCard(
  index: number,
  overrides?: Partial<Omit<Card, "updatedAt">>,
): Omit<Card, "updatedAt"> {
  return {
    id: `upgrade-card-${index}`,
    oracleId: `upgrade-oracle-${index}`,
    name: overrides?.name ?? `Upgrade Card ${index}`,
    manaValue: overrides?.manaValue ?? 2,
    typeLine: overrides?.typeLine ?? "Creature",
    colors: [],
    colorIdentity: [],
    keywords: [],
    ...overrides,
  };
}

/**
 * Seed a commander deck with 5 ADD, 3 CUT, 4 CONSIDER, plus current cards.
 * Useful for Phase 7 change-workflow tests.
 */
export async function seedUpgradeDeck(
  database?: DeckBuilderDatabase,
): Promise<UpgradeFixture> {
  const db = database ?? (await resetDatabase());
  const decks = new DeckRepository(db);
  const cards = new CardRepository(db);
  const deckCards = new DeckCardRepository(db);

  const deck = await decks.create({
    name: "Upgrade Fixture",
    format: "commander",
  });

  const cardEntities: Card[] = [];
  for (let i = 0; i < 20; i += 1) {
    const base =
      i === 0
        ? {
            ...MOCK_SOL_RING,
            id: "upgrade-card-0",
            oracleId: "upgrade-oracle-0",
            name: "Sol Ring",
          }
        : mockCard(i);
    cardEntities.push(await cards.upsert(base));
  }

  const current: DeckCard[] = [];
  // 10 current mainboard so projected math has a base
  for (let i = 0; i < 10; i += 1) {
    current.push(
      await deckCards.add({
        deckId: deck.id,
        cardId: cardEntities[i]!.id,
        zone: "mainboard",
        status: "current",
      }),
    );
  }

  const add: DeckCard[] = [];
  for (let i = 10; i < 15; i += 1) {
    add.push(
      await deckCards.add({
        deckId: deck.id,
        cardId: cardEntities[i]!.id,
        zone: "mainboard",
        status: "add",
      }),
    );
  }

  // Mark 3 of the current as CUT (reuse same rows by updating status)
  const cut: DeckCard[] = [];
  for (let i = 0; i < 3; i += 1) {
    cut.push(await deckCards.update(current[i]!.id, { status: "cut" }));
  }

  const consider: DeckCard[] = [];
  for (let i = 15; i < 19; i += 1) {
    consider.push(
      await deckCards.add({
        deckId: deck.id,
        cardId: cardEntities[i]!.id,
        zone: "mainboard",
        status: "consider",
      }),
    );
  }

  return {
    database: db,
    deck,
    cards: cardEntities,
    current: current.slice(3), // remaining current after cuts
    add,
    cut,
    consider,
  };
}
