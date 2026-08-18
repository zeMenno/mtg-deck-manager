import {
  DeckBuilderDatabase,
  deleteDatabase,
  resetDatabaseSingleton,
} from "@/lib/db/database";
import { initializeDatabase } from "@/lib/db/initialize";
import {
  CardRepository,
  DeckCardRepository,
  DeckRepository,
} from "@/lib/db/repositories";
import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";

export type SeedDeckResult = {
  database: DeckBuilderDatabase;
  deck: Deck;
  card: Card;
  deckCard: DeckCard;
};

/** Unique IndexedDB name per test to avoid cross-test pollution. */
export function uniqueDbName(prefix = "DeckBuilderDB-test"): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

/**
 * Create a fresh DB, wire the singleton, optionally initialize (seed tags).
 */
export async function resetDatabase(options?: {
  name?: string;
  initialize?: boolean;
}): Promise<DeckBuilderDatabase> {
  const name = options?.name ?? uniqueDbName();
  await deleteDatabase(name).catch(() => undefined);

  const database = new DeckBuilderDatabase(name);
  await resetDatabaseSingleton(database);
  await database.open();

  if (options?.initialize !== false) {
    await initializeDatabase(database);
  }

  return database;
}

export const MOCK_SOL_RING: Omit<Card, "updatedAt"> = {
  id: "11111111-1111-4111-8111-111111111111",
  oracleId: "22222222-2222-4222-8222-222222222222",
  name: "Sol Ring",
  manaCost: "{1}",
  manaValue: 1,
  typeLine: "Artifact",
  oracleText: "{T}: Add {C}{C}.",
  colors: [],
  colorIdentity: [],
  keywords: [],
};

/** Seed a commander deck with one mainboard card. */
export async function seedDeck(
  database?: DeckBuilderDatabase,
  overrides?: { deckName?: string; card?: Omit<Card, "updatedAt"> },
): Promise<SeedDeckResult> {
  const db = database ?? (await resetDatabase());
  const decks = new DeckRepository(db);
  const cards = new CardRepository(db);
  const deckCards = new DeckCardRepository(db);

  const deck = await decks.create({
    name: overrides?.deckName ?? "Seed Deck",
    format: "commander",
  });
  const card = await cards.upsert(overrides?.card ?? MOCK_SOL_RING);
  const deckCard = await deckCards.add({
    deckId: deck.id,
    cardId: card.id,
    zone: "mainboard",
    status: "current",
  });

  return { database: db, deck, card, deckCard };
}

export async function closeAndDelete(
  database: DeckBuilderDatabase,
): Promise<void> {
  const name = database.name;
  database.close();
  await deleteDatabase(name);
}
