import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { WishlistRepository } from "@/lib/db/repositories/wishlist-repository";
import {
  WishlistPromotionService,
  resetWishlistPromotionServiceSingleton,
} from "@/lib/wishlist/wishlist-promotion-service";
import { WishlistService } from "@/lib/wishlist/wishlist-service";
import { WishlistPromotionConflictError } from "@/lib/wishlist/types";
import {
  closeAndDelete,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";

describe("WishlistPromotionService", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    resetWishlistPromotionServiceSingleton();
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("promoteToConsider creates DeckCard with status consider", async () => {
    database = await resetDatabase();
    const { deck, card } = await seedDeck(database);
    // Remove the seeded current card so promotion has a clean slate for this card
    // — use a second card path: seed already has CURRENT Sol Ring; promote same card
    // should conflict unless forced. Use fresh wishlist on same card with force off
    // after removing current row.
    const deckCards = new DeckCardRepository(database);
    const rows = await deckCards.listByDeck(deck.id);
    for (const row of rows) {
      await deckCards.delete(row.id);
    }

    const wishlist = new WishlistService({ database });
    const { item } = await wishlist.addCardToWishlist(card.id, {
      priority: "high",
      targetRole: "ramp",
      quantity: 2,
    });

    const promo = new WishlistPromotionService({ database });
    const result = await promo.promoteToConsider(item.id, deck.id);

    expect(result.status).toBe("consider");
    expect(result.deckCard.status).toBe("consider");
    expect(result.deckCard.quantity).toBe(2);
    expect(result.deckCard.roles).toContain("ramp");
    expect(result.removedFromWishlist).toBe(true);
    expect(
      await new WishlistRepository(database).getItemById(item.id),
    ).toBeUndefined();
  });

  it("promoteToAdd creates DeckCard with status add and can keep wishlist item", async () => {
    database = await resetDatabase();
    const { deck, card } = await seedDeck(database);
    const deckCards = new DeckCardRepository(database);
    for (const row of await deckCards.listByDeck(deck.id)) {
      await deckCards.delete(row.id);
    }

    const wishlist = new WishlistService({ database });
    const { item } = await wishlist.addCardToWishlist(card.id, {
      targetRole: "draw",
    });

    const promo = new WishlistPromotionService({ database });
    const result = await promo.promoteToAdd(item.id, deck.id, {
      removeFromWishlist: false,
    });

    expect(result.status).toBe("add");
    expect(result.deckCard.status).toBe("add");
    expect(result.deckCard.roles).toContain("draw");
    expect(result.removedFromWishlist).toBe(false);
    expect(
      await new WishlistRepository(database).getItemById(item.id),
    ).toBeDefined();
  });

  it("throws when card is already CURRENT unless allowCurrentConflict", async () => {
    database = await resetDatabase();
    const { deck, card } = await seedDeck(database);
    const wishlist = new WishlistService({ database });
    const { item } = await wishlist.addCardToWishlist(card.id);
    const promo = new WishlistPromotionService({ database });

    await expect(
      promo.promoteToConsider(item.id, deck.id),
    ).rejects.toBeInstanceOf(WishlistPromotionConflictError);

    const result = await promo.promoteToConsider(item.id, deck.id, {
      allowCurrentConflict: true,
    });
    expect(result.deckCard.status).toBe("consider");
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
