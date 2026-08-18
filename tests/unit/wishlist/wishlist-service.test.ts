import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardPriceRepository } from "@/lib/db/repositories/card-price-repository";
import { WishlistRepository } from "@/lib/db/repositories/wishlist-repository";
import {
  WishlistService,
  resetWishlistServiceSingleton,
} from "@/lib/wishlist/wishlist-service";
import { WishlistCardNotCachedError } from "@/lib/wishlist/types";
import {
  closeAndDelete,
  MOCK_SOL_RING,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";
import { CardRepository } from "@/lib/db/repositories/card-repository";

describe("WishlistService", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    resetWishlistServiceSingleton();
    if (database) {
      await closeAndDelete(database);
    }
  });

  it("addCardToWishlist creates item with defaults", async () => {
    database = await resetDatabase();
    const { card } = await seedDeck(database);
    const service = new WishlistService({ database });

    const result = await service.addCardToWishlist(card.id);
    expect(result.created).toBe(true);
    expect(result.item.priority).toBe("medium");
    expect(result.item.quantity).toBe(1);
    expect(result.item.cardId).toBe(card.id);
  });

  it("duplicate card detection returns existing item", async () => {
    database = await resetDatabase();
    const { card } = await seedDeck(database);
    const service = new WishlistService({ database });

    const first = await service.addCardToWishlist(card.id, {
      priority: "high",
    });
    const second = await service.addCardToWishlist(card.id, {
      priority: "low",
    });

    expect(second.created).toBe(false);
    expect(second.item.id).toBe(first.item.id);
    expect(second.item.priority).toBe("high");
  });

  it("rejects add when card is not cached", async () => {
    database = await resetDatabase();
    const service = new WishlistService({ database });
    await expect(
      service.addCardToWishlist("missing-card-id"),
    ).rejects.toBeInstanceOf(WishlistCardNotCachedError);
  });

  it("updatePriority and findByCardId work", async () => {
    database = await resetDatabase();
    const { card } = await seedDeck(database);
    const service = new WishlistService({ database });
    const { item } = await service.addCardToWishlist(card.id);

    const updated = await service.updatePriority(item.id, "essential");
    expect(updated.priority).toBe("essential");

    const found = await service.findByCardId(card.id);
    expect(found).toHaveLength(1);
    expect(found[0]!.priority).toBe("essential");
  });

  it("summary cost skips missing prices", async () => {
    database = await resetDatabase();
    const cards = new CardRepository(database);
    const prices = new CardPriceRepository(database);
    const a = await cards.upsert({
      ...MOCK_SOL_RING,
      id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      name: "Priced Card",
    });
    const b = await cards.upsert({
      ...MOCK_SOL_RING,
      id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      oracleId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      name: "Unpriced Card",
    });
    await prices.upsert({
      cardId: a.id,
      currency: "USD",
      normal: 4,
      source: "test",
      fetchedAt: new Date().toISOString(),
    });

    const service = new WishlistService({ database });
    await service.addCardToWishlist(a.id, { quantity: 2 });
    await service.addCardToWishlist(b.id, {
      quantity: 1,
      duplicateMode: "allow_duplicate",
    });

    const summary = await service.getSummary("USD");
    expect(summary.estimatedCost).toBe(8);
    expect(summary.pricedCount).toBe(1);
    expect(summary.totalItems).toBe(2);
  });

  it("repository sortByPriority orders correctly", async () => {
    database = await resetDatabase();
    const cards = new CardRepository(database);
    const repo = new WishlistRepository(database);
    const c1 = await cards.upsert({
      ...MOCK_SOL_RING,
      id: "11111111-1111-4111-8111-111111111101",
      name: "A",
    });
    const c2 = await cards.upsert({
      ...MOCK_SOL_RING,
      id: "11111111-1111-4111-8111-111111111102",
      oracleId: "22222222-2222-4222-8222-222222222202",
      name: "B",
    });
    await repo.addItem({ cardId: c1.id, priority: "low" });
    await repo.addItem({ cardId: c2.id, priority: "essential" });
    const items = await repo.getItems();
    expect(items[0]!.priority).toBe("essential");
    expect(items[1]!.priority).toBe("low");
  });
});
