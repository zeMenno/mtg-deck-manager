import { afterEach, describe, expect, it } from "vitest";

import { CardPriceRepository } from "@/lib/db/repositories/card-price-repository";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import {
  PricingService,
  resetPricingServiceSingleton,
} from "@/lib/pricing/pricing-service";
import { ScryfallPricingProvider } from "@/lib/pricing/providers";
import {
  closeAndDelete,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";
import { FIXTURE_SOL_RING } from "@/tests/fixtures/scryfall-cards";
import type { CardPrice } from "@/types/card";

afterEach(() => {
  resetPricingServiceSingleton();
});

describe("pricing service + card price repository", () => {
  it("persists fetched price and serves second read from cache", async () => {
    const database = await resetDatabase();
    const { card } = await seedDeck(database, {
      card: {
        id: FIXTURE_SOL_RING.id,
        oracleId: FIXTURE_SOL_RING.oracle_id!,
        name: FIXTURE_SOL_RING.name,
        manaValue: 1,
        typeLine: "Artifact",
        colors: [],
        colorIdentity: [],
        keywords: [],
      },
    });

    const service = new PricingService({
      database,
      providerFactory: (currency) =>
        new ScryfallPricingProvider({
          currency,
          now: () => new Date("2026-08-18T12:00:00.000Z"),
        }),
    });

    const first = await service.getPrice(card.id, {
      refresh: true,
      online: true,
      currency: "USD",
    });
    expect(first?.normal).toBe(1.5);
    expect(first?.source).toBe("scryfall");

    const cached = await new CardPriceRepository(database).getByCardId(card.id);
    expect(cached?.normal).toBe(1.5);

    const second = await service.getPrice(card.id, {
      online: false,
      currency: "USD",
    });
    expect(second?.normal).toBe(1.5);
    expect(second?.isCachedFallback).toBe(true);

    await closeAndDelete(database);
  });

  it("failed fetch returns cached price with fallback flag", async () => {
    const database = await resetDatabase();
    const { card } = await seedDeck(database, {
      card: {
        id: FIXTURE_SOL_RING.id,
        oracleId: FIXTURE_SOL_RING.oracle_id!,
        name: FIXTURE_SOL_RING.name,
        manaValue: 1,
        typeLine: "Artifact",
        colors: [],
        colorIdentity: [],
        keywords: [],
      },
    });

    const repo = new CardPriceRepository(database);
    const stale: CardPrice = {
      cardId: card.id,
      currency: "USD",
      normal: 9.99,
      source: "scryfall",
      fetchedAt: "2020-01-01T00:00:00.000Z",
    };
    await repo.upsert(stale);

    const service = new PricingService({
      database,
      prices: repo,
      providerFactory: () =>
        new ScryfallPricingProvider({
          getCardByIdFn: async () => {
            throw new Error("network down");
          },
        }),
    });

    const result = await service.getPrice(card.id, {
      refresh: true,
      online: true,
      currency: "USD",
    });
    expect(result?.normal).toBe(9.99);
    expect(result?.isCachedFallback).toBe(true);
    expect(result?.isStale).toBe(true);

    await closeAndDelete(database);
  });

  it("failed fetch with no cache returns null (not zero)", async () => {
    const database = await resetDatabase();
    const { card } = await seedDeck(database);

    const service = new PricingService({
      database,
      providerFactory: () =>
        new ScryfallPricingProvider({
          getCardByIdFn: async () => {
            throw new Error("network down");
          },
        }),
    });

    const result = await service.getPrice(card.id, {
      refresh: true,
      online: true,
    });
    expect(result).toBeNull();

    await closeAndDelete(database);
  });

  it("refreshDeckPrices updates ADD card prices", async () => {
    const database = await resetDatabase();
    const { deck } = await seedDeck(database, {
      card: {
        id: FIXTURE_SOL_RING.id,
        oracleId: FIXTURE_SOL_RING.oracle_id!,
        name: FIXTURE_SOL_RING.name,
        manaValue: 1,
        typeLine: "Artifact",
        colors: [],
        colorIdentity: [],
        keywords: [],
      },
    });

    const deckCardRepo = new DeckCardRepository(database);
    const deckCards = await deckCardRepo.listByDeck(deck.id);
    const dc = deckCards[0]!;
    await deckCardRepo.update(dc.id, { status: "add" });

    const service = new PricingService({
      database,
      providerFactory: (currency) =>
        new ScryfallPricingProvider({
          currency,
          now: () => new Date("2026-08-18T12:00:00.000Z"),
        }),
    });

    const result = await service.refreshDeckPrices(deck.id, {
      online: true,
      currency: "USD",
    });
    expect(result.refreshed).toBeGreaterThanOrEqual(1);

    const stored = await new CardPriceRepository(database).getByCardId(
      FIXTURE_SOL_RING.id,
    );
    expect(stored?.normal).toBe(1.5);

    await closeAndDelete(database);
  });
});
