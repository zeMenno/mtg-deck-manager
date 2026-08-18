import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { clearAllData } from "@/lib/import-export/clear-all-data";
import { exportFullBackup } from "@/lib/import-export/export-full-backup";
import { exportDeckJson } from "@/lib/import-export/export-deck";
import { importDeckJson } from "@/lib/import-export/import-deck";
import { importFullBackup } from "@/lib/import-export/import-full-backup";
import { validateBackup } from "@/lib/import-export/validate-backup";
import {
  closeAndDelete,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";

describe("export/import roundtrip", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("restores decks, cards, and tags after import", async () => {
    database = await resetDatabase();
    const seeded = await seedDeck(database, { deckName: "Roundtrip Deck" });

    const backup = await exportFullBackup(database, { appVersion: "0.1.0" });
    expect(backup.data.decks[0]?.name).toBe("Roundtrip Deck");

    await database.decks.clear();
    await database.deckCards.clear();
    await database.cards.clear();
    expect(await database.decks.count()).toBe(0);

    await importFullBackup(backup, database);

    expect(await database.decks.count()).toBe(1);
    expect(await database.deckCards.count()).toBe(1);
    expect(await database.cards.count()).toBe(1);
    expect(await database.tags.count()).toBe(49);

    const deck = await database.decks.get(seeded.deck.id);
    expect(deck?.name).toBe("Roundtrip Deck");
  });

  it("export → clear all → import restores deck count", async () => {
    database = await resetDatabase();
    await seedDeck(database, { deckName: "A" });
    await seedDeck(database, { deckName: "B" });
    const backup = await exportFullBackup(database);
    expect(backup.metadata.deckCount).toBe(2);

    await clearAllData(database);
    expect(await database.decks.count()).toBe(0);

    await importFullBackup(backup, database);
    expect(await database.decks.count()).toBe(2);
  });

  it("export deck → import as new → two decks exist", async () => {
    database = await resetDatabase();
    const seeded = await seedDeck(database, { deckName: "Solo" });
    const pack = await exportDeckJson(seeded.deck.id, database);
    const result = await importDeckJson(pack, {
      database,
      renameOnCollision: true,
    });
    expect(result.deckId).toBeTruthy();
    expect(await database.decks.count()).toBe(2);
    const names = (await database.decks.toArray()).map((d) => d.name).sort();
    expect(names).toContain("Solo");
    expect(names.some((n) => n.includes("imported"))).toBe(true);
  });

  it("rejects unrecognised backupVersion without mutating data", async () => {
    database = await resetDatabase();
    await seedDeck(database, { deckName: "Keep Me" });
    const before = await database.decks.count();

    await expect(
      importFullBackup(
        {
          backupVersion: 99,
          appSchemaVersion: 1,
          exportedAt: new Date().toISOString(),
          exportedFrom: { appVersion: "0.1.0" },
          metadata: {
            deckCount: 0,
            cardCount: 0,
            versionCount: 0,
            wishlistItemCount: 0,
          },
          data: {
            decks: [],
            deckCards: [],
            deckVersions: [],
            cards: [],
            cardPrices: [],
            tags: [],
            wishlistItems: [],
            settings: [],
            appMeta: [],
          },
        } as never,
        database,
      ),
    ).rejects.toThrow(/backupVersion|newer app version|Invalid backup/i);

    expect(await database.decks.count()).toBe(before);
  });

  it("import invalid JSON shape fails safely with no mutation", async () => {
    database = await resetDatabase();
    await seedDeck(database, { deckName: "Safe" });
    const beforeCards = await database.cards.count();

    const result = validateBackup({ not: "a backup" });
    expect(result.ok).toBe(false);

    await expect(
      importFullBackup({ not: "a backup" } as never, database),
    ).rejects.toThrow();

    expect(await database.cards.count()).toBe(beforeCards);
    expect(await database.decks.count()).toBe(1);
  });

  it("export → clear all → import restores wishlist items", async () => {
    database = await resetDatabase();
    const seeded = await seedDeck(database, { deckName: "Wish Deck" });
    const { WishlistRepository } =
      await import("@/lib/db/repositories/wishlist-repository");
    await new WishlistRepository(database).addItem({
      cardId: seeded.card.id,
      priority: "high",
      targetDeckId: seeded.deck.id,
      notes: "roundtrip",
    });

    const backup = await exportFullBackup(database);
    expect(backup.metadata.wishlistItemCount).toBe(1);

    await clearAllData(database);
    expect(await database.wishlistItems.count()).toBe(0);

    await importFullBackup(backup, database);
    expect(await database.wishlistItems.count()).toBe(1);
    const item = (await database.wishlistItems.toArray())[0];
    expect(item?.notes).toBe("roundtrip");
    expect(item?.priority).toBe("high");
  });
});
