import type { Currency } from "@/types";
import type { ScryfallCard, ScryfallPrices } from "@/lib/scryfall/types";
import {
  COLLECTION_BATCH_SIZE,
  getCardById,
  getCardsByIds,
  ScryfallNotFoundError,
  ScryfallRateLimitError,
} from "@/lib/scryfall/client";
import { PROVIDER_DISPLAY_NAMES, PROVIDER_IDS } from "@/lib/pricing/constants";
import { parsePrice } from "@/lib/pricing/format-price";
import type {
  CardIdentity,
  CardPriceSnapshot,
  PricingProvider,
} from "@/lib/pricing/types";
import { PricingProviderError } from "@/lib/pricing/types";

export type ScryfallPricingProviderOptions = {
  currency?: Currency;
  /** Inject for tests. */
  getCardByIdFn?: typeof getCardById;
  getCardsByIdsFn?: typeof getCardsByIds;
  now?: () => Date;
};

/**
 * Map Scryfall `prices` object to a snapshot for the given currency.
 * Returns `null` when no numeric prices are present (not zero).
 */
export function mapScryfallPrices(
  card: Pick<ScryfallCard, "id" | "prices">,
  currency: Currency,
  fetchedAt: string,
): CardPriceSnapshot | null {
  const prices = card.prices;
  if (!prices) return null;

  const { normal, foil } = pickCurrencyPrices(prices, currency);
  if (normal == null && foil == null) return null;

  return {
    cardId: card.id,
    currency,
    normal,
    foil,
    low: normal,
    market: normal,
    source: PROVIDER_IDS.scryfall,
    fetchedAt,
  };
}

function pickCurrencyPrices(
  prices: ScryfallPrices,
  currency: Currency,
): { normal?: number; foil?: number } {
  if (currency === "EUR") {
    return {
      normal: parsePrice(prices.eur),
      foil: parsePrice(prices.eur_foil),
    };
  }
  return {
    normal: parsePrice(prices.usd),
    foil: parsePrice(prices.usd_foil),
  };
}

export class ScryfallPricingProvider implements PricingProvider {
  readonly id = PROVIDER_IDS.scryfall;
  readonly displayName = PROVIDER_DISPLAY_NAMES.scryfall;

  private readonly currency: Currency;
  private readonly getCardByIdFn: typeof getCardById;
  private readonly getCardsByIdsFn: typeof getCardsByIds;
  private readonly now: () => Date;

  constructor(options: ScryfallPricingProviderOptions = {}) {
    this.currency = options.currency ?? "USD";
    this.getCardByIdFn = options.getCardByIdFn ?? getCardById;
    this.getCardsByIdsFn = options.getCardsByIdsFn ?? getCardsByIds;
    this.now = options.now ?? (() => new Date());
  }

  async getPrice(identity: CardIdentity): Promise<CardPriceSnapshot | null> {
    try {
      const card = await this.getCardByIdFn(identity.cardId);
      return mapScryfallPrices(card, this.currency, this.now().toISOString());
    } catch (err) {
      if (err instanceof ScryfallNotFoundError) {
        return null;
      }
      if (err instanceof ScryfallRateLimitError) {
        throw new PricingProviderError("RATE_LIMITED", err.message, this.id);
      }
      throw new PricingProviderError(
        "NETWORK",
        err instanceof Error ? err.message : "Network error",
        this.id,
      );
    }
  }

  async getPrices(
    identities: CardIdentity[],
  ): Promise<Map<string, CardPriceSnapshot>> {
    const result = new Map<string, CardPriceSnapshot>();
    const uniqueIds = [
      ...new Set(identities.map((i) => i.cardId).filter(Boolean)),
    ];
    if (uniqueIds.length === 0) return result;

    const fetchedAt = this.now().toISOString();

    try {
      // getCardsByIds already chunks at COLLECTION_BATCH_SIZE (75).
      const cards = await this.getCardsByIdsFn(uniqueIds);
      for (const card of cards) {
        const snapshot = mapScryfallPrices(card, this.currency, fetchedAt);
        if (snapshot) {
          result.set(card.id, snapshot);
        }
      }
    } catch (err) {
      if (err instanceof ScryfallRateLimitError) {
        throw new PricingProviderError("RATE_LIMITED", err.message, this.id);
      }
      throw new PricingProviderError(
        "NETWORK",
        err instanceof Error ? err.message : "Network error",
        this.id,
      );
    }

    return result;
  }
}

/** Expose batch size for unit tests asserting chunking behavior. */
export { COLLECTION_BATCH_SIZE as SCRYFALL_PRICE_BATCH_SIZE };
