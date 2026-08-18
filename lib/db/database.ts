/**
 * Dexie database — local-first source of truth for decks and related data.
 *
 * Schema v1 matches `docs/data-model.md` §13.
 * Schema v2 adds `archived` / `favorite` indexes on decks (Phase 5).
 * Schema v3 adds `replacesDeckCardId` index on deckCards (Phase 7).
 * Schema v4 adds wishlist item indexes (wishlistId, addedAt, updatedAt) — Phase 12.
 */

import Dexie, { type EntityTable } from "dexie";

import type {
  AppMeta,
  AppSetting,
  Card,
  CardPrice,
  Tag,
  WishlistItem,
} from "@/types/card";
import type { Deck, DeckCard, DeckVersion } from "@/types/deck";

/** Current shipped Dexie schema version. */
export const APP_SCHEMA_VERSION = 4;

export const DB_NAME = "DeckBuilderDB";

export class DeckBuilderDatabase extends Dexie {
  cards!: EntityTable<Card, "id">;
  cardPrices!: EntityTable<CardPrice, "cardId">;
  decks!: EntityTable<Deck, "id">;
  deckCards!: EntityTable<DeckCard, "id">;
  deckVersions!: EntityTable<DeckVersion, "id">;
  tags!: EntityTable<Tag, "id">;
  wishlistItems!: EntityTable<WishlistItem, "id">;
  settings!: EntityTable<AppSetting, "key">;
  appMeta!: EntityTable<AppMeta, "key">;

  constructor(name = DB_NAME) {
    super(name);

    this.version(1).stores({
      cards: "id, oracleId, name, updatedAt",
      cardPrices: "cardId, fetchedAt",
      decks: "id, name, format, updatedAt, createdAt",
      deckCards: "id, deckId, cardId, status, [deckId+status], [deckId+zone]",
      deckVersions: "id, deckId, createdAt",
      tags: "id, category, name",
      wishlistItems: "id, cardId, priority, targetDeckId",
      settings: "key",
      appMeta: "key",
    });

    // Phase 5: index archived/favorite for list filtering/sorting.
    this.version(2).stores({
      decks: "id, name, format, updatedAt, createdAt, archived, favorite",
    });

    // Phase 7: optional replacement link index on deckCards.
    this.version(3).stores({
      deckCards:
        "id, deckId, cardId, status, replacesDeckCardId, [deckId+status], [deckId+zone]",
    });

    // Phase 12: richer wishlist indexes for filter/sort queries.
    this.version(4).stores({
      wishlistItems:
        "id, wishlistId, cardId, priority, targetDeckId, addedAt, updatedAt",
    });
  }
}

let singleton: DeckBuilderDatabase | null = null;

/**
 * Returns the shared DB instance. Safe to call on the server: returns a
 * constructed class without opening IndexedDB until a table operation runs
 * (which must only happen in the browser / test env with fake-indexeddb).
 */
export function getDatabase(): DeckBuilderDatabase {
  if (!singleton) {
    singleton = new DeckBuilderDatabase();
  }
  return singleton;
}

/** Alias used throughout the app. Prefer repositories over raw table access. */
export const db = typeof window !== "undefined" ? getDatabase() : getDatabase();

/** Replace the singleton (tests only). Closes the previous instance. */
export async function resetDatabaseSingleton(
  next?: DeckBuilderDatabase,
): Promise<DeckBuilderDatabase> {
  if (singleton) {
    singleton.close();
  }
  singleton = next ?? new DeckBuilderDatabase();
  return singleton;
}

/** Close and drop the named database (tests / import wipe). */
export async function deleteDatabase(name = DB_NAME): Promise<void> {
  if (singleton) {
    singleton.close();
    singleton = null;
  }
  await Dexie.delete(name);
}
