import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { clearAllData } from "@/lib/import-export/clear-all-data";
import { exportFullBackup } from "@/lib/import-export/export-full-backup";
import { importFullBackup } from "@/lib/import-export/import-full-backup";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { WishlistRepository } from "@/lib/db/repositories/wishlist-repository";
import { WishlistPromotionService } from "@/lib/wishlist/wishlist-promotion-service";
import { WishlistService } from "@/lib/wishlist/wishlist-service";
import {
  closeAndDelete,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";

describe("wishlist integration", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("add → update priority → persists after reload", async () => {
    database = await resetDatabase();
    const { card } = await seedDeck(database);
    const service = new WishlistService({ database });

    const { item } = await service.addCardToWishlist(card.id, {
      priority: "medium",
      notes: "LGS find",
    });
    await service.updatePriority(item.id, "essential");
    await service.setTargetDeck(item.id, null);

    const reloaded = await new WishlistRepository(database).getItemById(
      item.id,
    );
    expect(reloaded?.priority).toBe("essential");
    expect(reloaded?.notes).toBe("LGS find");
    expect(reloaded?.targetDeckId).toBeUndefined();
  });

  it("promote to CONSIDER removes wishlist item and creates deck card", async () => {
    database = await resetDatabase();
    const { deck, card } = await seedDeck(database);
    const deckCards = new DeckCardRepository(database);
    for (const row of await deckCards.listByDeck(deck.id)) {
      await deckCards.delete(row.id);
    }

    const wishlist = new WishlistService({ database });
    const { item } = await wishlist.addCardToWishlist(card.id, {
      targetDeckId: deck.id,
      quantity: 1,
    });

    const promo = new WishlistPromotionService({ database });
    await promo.promoteToConsider(item.id, deck.id);

    expect(await new WishlistRepository(database).getAll()).toHaveLength(0);
    const rows = await deckCards.listByDeckAndStatus(deck.id, "consider");
    expect(rows).toHaveLength(1);
    expect(rows[0]!.cardId).toBe(card.id);
  });

  it("promote to ADD appears among deck add-status cards", async () => {
    database = await resetDatabase();
    const { deck, card } = await seedDeck(database);
    const deckCards = new DeckCardRepository(database);
    for (const row of await deckCards.listByDeck(deck.id)) {
      await deckCards.delete(row.id);
    }

    const wishlist = new WishlistService({ database });
    const { item } = await wishlist.addCardToWishlist(card.id);
    await new WishlistPromotionService({ database }).promoteToAdd(
      item.id,
      deck.id,
    );

    const adds = await deckCards.listByDeckAndStatus(deck.id, "add");
    expect(adds.map((r) => r.cardId)).toContain(card.id);
  });

  it("full backup export/import preserves wishlist fields", async () => {
    database = await resetDatabase();
    const { deck, card } = await seedDeck(database);
    const service = new WishlistService({ database });
    const { item } = await service.addCardToWishlist(card.id, {
      priority: "essential",
      targetDeckId: deck.id,
      targetRole: "ramp",
      notes: "buy next week",
      quantity: 3,
    });

    const backup = await exportFullBackup(database);
    expect(backup.metadata.wishlistItemCount).toBe(1);
    expect(backup.data.wishlistItems[0]?.notes).toBe("buy next week");
    expect(backup.data.wishlistItems[0]?.targetRole).toBe("ramp");
    expect(backup.data.wishlistItems[0]?.targetDeckId).toBe(deck.id);

    await clearAllData(database);
    expect(await database.wishlistItems.count()).toBe(0);

    await importFullBackup(backup, database);
    const restored = await database.wishlistItems.get(item.id);
    expect(restored).toMatchObject({
      cardId: card.id,
      priority: "essential",
      targetDeckId: deck.id,
      targetRole: "ramp",
      notes: "buy next week",
      quantity: 3,
    });
  });

  it("offline-style CRUD works with cached card only", async () => {
    database = await resetDatabase();
    const { card } = await seedDeck(database);
    const service = new WishlistService({ database });

    const { item } = await service.addCardToWishlist(card.id, {
      priority: "low",
    });
    await service.updateQuantity(item.id, 4);
    await service.updateNotes(item.id, "offline note");
    await service.removeFromWishlist(item.id);

    expect(await service.listItems()).toHaveLength(0);
  });
});
