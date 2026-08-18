import { describe, expect, it, vi } from "vitest";

import {
  mapScryfallPrices,
  ScryfallPricingProvider,
  SCRYFALL_PRICE_BATCH_SIZE,
} from "@/lib/pricing/providers/scryfall-pricing-provider";
import type { ScryfallCard } from "@/lib/scryfall/types";
import { FIXTURE_SOL_RING } from "@/tests/fixtures/scryfall-cards";

describe("mapScryfallPrices", () => {
  it("maps usd and foil", () => {
    const snap = mapScryfallPrices(
      FIXTURE_SOL_RING,
      "USD",
      "2026-08-18T00:00:00.000Z",
    );
    expect(snap).toMatchObject({
      cardId: FIXTURE_SOL_RING.id,
      normal: 1.5,
      foil: 3,
      source: "scryfall",
      currency: "USD",
    });
  });

  it("maps eur", () => {
    const snap = mapScryfallPrices(
      FIXTURE_SOL_RING,
      "EUR",
      "2026-08-18T00:00:00.000Z",
    );
    expect(snap?.normal).toBe(1.2);
    expect(snap?.foil).toBe(2.5);
  });

  it("returns null when all prices null", () => {
    const card: ScryfallCard = {
      ...FIXTURE_SOL_RING,
      prices: { usd: null, usd_foil: null, eur: null, eur_foil: null },
    };
    expect(
      mapScryfallPrices(card, "USD", "2026-08-18T00:00:00.000Z"),
    ).toBeNull();
  });

  it("treats zero string as valid zero", () => {
    const card: ScryfallCard = {
      ...FIXTURE_SOL_RING,
      prices: { usd: "0.00" },
    };
    const snap = mapScryfallPrices(card, "USD", "2026-08-18T00:00:00.000Z");
    expect(snap?.normal).toBe(0);
  });
});

describe("ScryfallPricingProvider", () => {
  it("getPrice returns null for missing card", async () => {
    const provider = new ScryfallPricingProvider({
      getCardByIdFn: async () => {
        const { ScryfallNotFoundError } = await import("@/lib/scryfall/client");
        throw new ScryfallNotFoundError();
      },
    });
    const result = await provider.getPrice({
      cardId: "missing",
      name: "Missing",
    });
    expect(result).toBeNull();
  });

  it("getPrices batches via getCardsByIds", async () => {
    const ids = Array.from({ length: 150 }, (_, i) => `id-${i}`);
    const getCardsByIdsFn = vi.fn(async (requested: string[]) =>
      requested.map((id): ScryfallCard => ({
        object: "card",
        id,
        name: id,
        prices: { usd: "1.00" },
      })),
    );

    const provider = new ScryfallPricingProvider({ getCardsByIdsFn });
    const map = await provider.getPrices(
      ids.map((cardId) => ({ cardId, name: cardId })),
    );

    expect(getCardsByIdsFn).toHaveBeenCalledTimes(1);
    expect(getCardsByIdsFn.mock.calls[0]![0]).toHaveLength(150);
    expect(map.size).toBe(150);
    // Document batch size constant used by underlying client
    expect(SCRYFALL_PRICE_BATCH_SIZE).toBe(75);
  });

  it("chunks are handled by client — provider receives already-fetched list", async () => {
    // Simulate client chunking by verifying provider still maps all results
    const cards: ScryfallCard[] = Array.from({ length: 80 }, (_, i) => ({
      object: "card" as const,
      id: `c-${i}`,
      name: `Card ${i}`,
      prices: { usd: "0.50" },
    }));
    const provider = new ScryfallPricingProvider({
      getCardsByIdsFn: async () => cards,
    });
    const map = await provider.getPrices(
      cards.map((c) => ({ cardId: c.id, name: c.name })),
    );
    expect(map.size).toBe(80);
  });
});
