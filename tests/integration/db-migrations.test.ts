import Dexie, { type EntityTable } from "dexie";
import { afterEach, describe, expect, it } from "vitest";

import { APP_SCHEMA_VERSION, DeckBuilderDatabase } from "@/lib/db/database";
import { uniqueDbName } from "@/tests/helpers/db-test-utils";

/**
 * Opens historical schema versions then upgrades to the current
 * `DeckBuilderDatabase` (v5). Proves each interim store definition is reachable.
 */
describe("DB migrations v1 → current", () => {
  let dbName: string;

  afterEach(async () => {
    if (dbName) {
      await Dexie.delete(dbName);
    }
  });

  it("ships APP_SCHEMA_VERSION 5", () => {
    expect(APP_SCHEMA_VERSION).toBe(5);
  });

  it("migrates v1 data through to v5 and preserves decks", async () => {
    dbName = uniqueDbName("migrate-v1-v5");

    class V1 extends Dexie {
      decks!: EntityTable<{ id: string; name: string; format: string }, "id">;
      constructor() {
        super(dbName);
        this.version(1).stores({
          cards: "id, oracleId, name, updatedAt",
          cardPrices: "cardId, fetchedAt",
          decks: "id, name, format, updatedAt, createdAt",
          deckCards:
            "id, deckId, cardId, status, [deckId+status], [deckId+zone]",
          deckVersions: "id, deckId, createdAt",
          tags: "id, category, name",
          wishlistItems: "id, cardId, priority, targetDeckId",
          settings: "key",
          appMeta: "key",
        });
      }
    }

    const v1 = new V1();
    await v1.open();
    await v1.decks.add({
      id: "deck-legacy",
      name: "Legacy Soldiers",
      format: "commander",
    });
    v1.close();

    const current = new DeckBuilderDatabase(dbName);
    await current.open();
    expect(current.verno).toBe(APP_SCHEMA_VERSION);

    const deck = await current.decks.get("deck-legacy");
    expect(deck?.name).toBe("Legacy Soldiers");

    // v4 wishlist indexes exist and accept writes
    await current.wishlistItems.add({
      id: "wl-1",
      cardId: "card-1",
      quantity: 1,
      priority: "medium",
      addedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      wishlistId: "default",
    });
    expect(await current.wishlistItems.count()).toBe(1);

    // v5 symbols table exists (cache; excluded from backups)
    await current.symbols.add({
      symbol: "{W}",
      svgUri: "https://svgs.scryfall.io/card-symbols/W.svg",
      english: "one white mana",
      representsMana: true,
      colors: ["W"],
      updatedAt: new Date().toISOString(),
    });
    expect(await current.symbols.count()).toBe(1);
    current.close();
  });

  it("opens a fresh DB at the latest schema", async () => {
    dbName = uniqueDbName("migrate-fresh");
    const db = new DeckBuilderDatabase(dbName);
    await db.open();
    expect(db.verno).toBe(APP_SCHEMA_VERSION);
    db.close();
  });
});
