/**
 * PricingService — orchestration, staleness, batch refresh, in-flight dedup.
 *
 * UI never calls Scryfall for prices directly; it goes through this service
 * (and Dexie `cardPrices` snapshots).
 */

import type { Currency } from "@/types";
import type { CardPrice } from "@/types/card";
import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { CardPriceRepository } from "@/lib/db/repositories/card-price-repository";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { CardRepository } from "@/lib/db/repositories/card-repository";
import { SettingsRepository } from "@/lib/db/repositories/settings-repository";
import { DEFAULT_STALE_HOURS } from "@/lib/pricing/constants";
import { isPriceStale } from "@/lib/pricing/format-price";
import { getActiveProvider } from "@/lib/pricing/providers";
import type {
  CardIdentity,
  CardPriceSnapshot,
  PricingProvider,
  RefreshResult,
} from "@/lib/pricing/types";

export type GetPriceOptions = {
  refresh?: boolean;
  currency?: Currency;
  /** When offline, never hit the network. */
  online?: boolean;
};

export type PricingServiceOptions = {
  database?: DeckBuilderDatabase;
  prices?: CardPriceRepository;
  deckCards?: DeckCardRepository;
  cards?: CardRepository;
  settings?: SettingsRepository;
  providerFactory?: (currency: Currency) => PricingProvider;
};

function snapshotToRecord(snapshot: CardPriceSnapshot): CardPrice {
  return {
    cardId: snapshot.cardId,
    currency: snapshot.currency,
    low: snapshot.low,
    market: snapshot.market,
    normal: snapshot.normal,
    foil: snapshot.foil,
    source: snapshot.source,
    fetchedAt: snapshot.fetchedAt,
  };
}

function recordToSnapshot(
  record: CardPrice,
  extras?: Partial<Pick<CardPriceSnapshot, "isStale" | "isCachedFallback">>,
): CardPriceSnapshot {
  return {
    cardId: record.cardId,
    currency: record.currency,
    low: record.low,
    market: record.market,
    normal: record.normal,
    foil: record.foil,
    source: record.source,
    fetchedAt: record.fetchedAt,
    isStale: extras?.isStale,
    isCachedFallback: extras?.isCachedFallback,
  };
}

export class PricingService {
  private readonly database: DeckBuilderDatabase;
  private readonly prices: CardPriceRepository;
  private readonly deckCards: DeckCardRepository;
  private readonly cards: CardRepository;
  private readonly settings: SettingsRepository;
  private readonly providerFactory: (currency: Currency) => PricingProvider;

  private readonly inFlight = new Map<
    string,
    Promise<CardPriceSnapshot | null>
  >();
  private readonly deckInFlight = new Map<
    string,
    Promise<Map<string, CardPriceSnapshot>>
  >();

  constructor(options: PricingServiceOptions = {}) {
    this.database = options.database ?? getDatabase();
    this.prices = options.prices ?? new CardPriceRepository(this.database);
    this.deckCards = options.deckCards ?? new DeckCardRepository(this.database);
    this.cards = options.cards ?? new CardRepository(this.database);
    this.settings = options.settings ?? new SettingsRepository(this.database);
    this.providerFactory =
      options.providerFactory ??
      ((currency) => getActiveProvider({ currency }));
  }

  async getCachedPrice(cardId: string): Promise<CardPrice | undefined> {
    return this.prices.getByCardId(cardId);
  }

  async getCurrency(): Promise<Currency> {
    return this.settings.get("currency");
  }

  async getStaleAfterHours(): Promise<number> {
    const hours = await this.settings.get("priceFreshnessHours");
    return typeof hours === "number" && hours > 0 ? hours : DEFAULT_STALE_HOURS;
  }

  async getPrice(
    cardId: string,
    options: GetPriceOptions = {},
  ): Promise<CardPriceSnapshot | null> {
    const currency = options.currency ?? (await this.getCurrency());
    const online = options.online ?? true;
    const staleAfterHours = await this.getStaleAfterHours();
    const cacheKey = `${cardId}:${currency}`;

    const existing = await this.prices.getByCardId(cardId);
    const cached =
      existing && existing.currency === currency ? existing : undefined;

    // Offline: never hit network; always prefer cache with clear labeling.
    if (!online) {
      if (!cached) return null;
      return recordToSnapshot(cached, {
        isStale: isPriceStale(cached.fetchedAt, staleAfterHours),
        isCachedFallback: true,
      });
    }

    const needsRefresh =
      options.refresh ||
      !cached ||
      isPriceStale(cached.fetchedAt, staleAfterHours);

    if (!needsRefresh && cached) {
      return recordToSnapshot(cached, {
        isStale: isPriceStale(cached.fetchedAt, staleAfterHours),
      });
    }

    const pending = this.inFlight.get(cacheKey);
    if (pending) return pending;

    const promise = this.fetchAndCache(
      cardId,
      currency,
      cached,
      staleAfterHours,
    );
    this.inFlight.set(cacheKey, promise);
    try {
      return await promise;
    } finally {
      this.inFlight.delete(cacheKey);
    }
  }

  private async fetchAndCache(
    cardId: string,
    currency: Currency,
    cached: CardPrice | undefined,
    staleAfterHours: number,
  ): Promise<CardPriceSnapshot | null> {
    const provider = this.providerFactory(currency);
    const card = await this.cards.getById(cardId);
    const identity: CardIdentity = {
      cardId,
      oracleId: card?.oracleId,
      name: card?.name ?? cardId,
    };

    try {
      const snapshot = await provider.getPrice(identity);
      if (snapshot) {
        await this.prices.upsert(snapshotToRecord(snapshot));
        return {
          ...snapshot,
          isStale: false,
        };
      }
      // Provider returned null — use cache if any
      if (cached) {
        return recordToSnapshot(cached, {
          isStale: isPriceStale(cached.fetchedAt, staleAfterHours),
          isCachedFallback: true,
        });
      }
      return null;
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PricingService] fetch failed", cardId, err);
      }
      if (cached) {
        return recordToSnapshot(cached, {
          isStale: true,
          isCachedFallback: true,
        });
      }
      return null;
    }
  }

  async getPricesForDeck(
    deckId: string,
    options: GetPriceOptions = {},
  ): Promise<Map<string, CardPriceSnapshot>> {
    const currency = options.currency ?? (await this.getCurrency());
    const online = options.online ?? true;
    const deckKey = `${deckId}:${currency}:${options.refresh ? "r" : "c"}`;

    const pending = this.deckInFlight.get(deckKey);
    if (pending) return pending;

    const promise = this.loadDeckPrices(
      deckId,
      currency,
      online,
      options.refresh,
    );
    this.deckInFlight.set(deckKey, promise);
    try {
      return await promise;
    } finally {
      this.deckInFlight.delete(deckKey);
    }
  }

  private async loadDeckPrices(
    deckId: string,
    currency: Currency,
    online: boolean,
    refresh?: boolean,
  ): Promise<Map<string, CardPriceSnapshot>> {
    const deckCardRows = await this.deckCards.listByDeck(deckId);
    const cardIds = [...new Set(deckCardRows.map((c) => c.cardId))];
    const staleAfterHours = await this.getStaleAfterHours();
    const cached = await this.prices.getByCardIdsForCurrency(cardIds, currency);

    const result = new Map<string, CardPriceSnapshot>();
    const toFetch: string[] = [];

    for (const cardId of cardIds) {
      const row = cached.get(cardId);
      if (row && !refresh && !isPriceStale(row.fetchedAt, staleAfterHours)) {
        result.set(
          cardId,
          recordToSnapshot(row, {
            isStale: false,
          }),
        );
      } else if (
        row &&
        (!online ||
          (!refresh && isPriceStale(row.fetchedAt, staleAfterHours) && !online))
      ) {
        result.set(
          cardId,
          recordToSnapshot(row, {
            isStale: true,
            isCachedFallback: !online,
          }),
        );
      } else if (!online && row) {
        result.set(
          cardId,
          recordToSnapshot(row, {
            isStale: true,
            isCachedFallback: true,
          }),
        );
      } else if (!online) {
        // no cache, offline — skip
      } else {
        if (row) {
          result.set(
            cardId,
            recordToSnapshot(row, {
              isStale: isPriceStale(row.fetchedAt, staleAfterHours),
            }),
          );
        }
        toFetch.push(cardId);
      }
    }

    if (toFetch.length === 0 || !online) {
      return result;
    }

    await this.batchFetchInto(toFetch, currency, result, staleAfterHours);
    return result;
  }

  private async batchFetchInto(
    cardIds: string[],
    currency: Currency,
    result: Map<string, CardPriceSnapshot>,
    staleAfterHours: number,
  ): Promise<void> {
    const provider = this.providerFactory(currency);
    const cardRows = await this.cards.getByIds(cardIds);
    const byId = new Map(cardRows.map((c) => [c.id, c]));
    const identities: CardIdentity[] = cardIds.map((cardId) => {
      const card = byId.get(cardId);
      return {
        cardId,
        oracleId: card?.oracleId,
        name: card?.name ?? cardId,
      };
    });

    try {
      const fresh = await provider.getPrices(identities);
      const toUpsert: CardPrice[] = [];
      for (const [cardId, snapshot] of fresh) {
        toUpsert.push(snapshotToRecord(snapshot));
        result.set(cardId, { ...snapshot, isStale: false });
      }
      await this.prices.upsertMany(toUpsert);

      // Mark remaining as cached fallback if we had cache
      for (const cardId of cardIds) {
        if (result.has(cardId) && !fresh.has(cardId)) {
          const existing = result.get(cardId)!;
          result.set(cardId, {
            ...existing,
            isCachedFallback: true,
            isStale:
              existing.isStale ??
              isPriceStale(existing.fetchedAt, staleAfterHours),
          });
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PricingService] batch fetch failed", err);
      }
      for (const cardId of cardIds) {
        const existing = result.get(cardId);
        if (existing) {
          result.set(cardId, {
            ...existing,
            isStale: true,
            isCachedFallback: true,
          });
        }
      }
    }
  }

  async refreshDeckPrices(
    deckId: string,
    options: { online?: boolean; currency?: Currency } = {},
  ): Promise<RefreshResult> {
    const deckCardRows = await this.deckCards.listByDeck(deckId);
    const cardIds = [...new Set(deckCardRows.map((c) => c.cardId))];
    return this.refreshCardPrices(cardIds, options);
  }

  /**
   * Batch-refresh prices for arbitrary card ids (e.g. wishlist).
   * Failures keep prior cache; never invent $0.00.
   */
  async refreshCardPrices(
    cardIdsInput: string[],
    options: { online?: boolean; currency?: Currency } = {},
  ): Promise<RefreshResult> {
    const online = options.online ?? true;
    if (!online) {
      return { refreshed: 0, failed: 0, skipped: 0 };
    }

    const cardIds = [...new Set(cardIdsInput)];
    if (cardIds.length === 0) {
      return { refreshed: 0, failed: 0, skipped: 0 };
    }

    const currency = options.currency ?? (await this.getCurrency());
    const before = await this.prices.getByCardIdsForCurrency(cardIds, currency);
    const result = new Map<string, CardPriceSnapshot>();
    for (const [id, row] of before) {
      result.set(id, recordToSnapshot(row));
    }

    const staleAfterHours = await this.getStaleAfterHours();
    await this.batchFetchInto(cardIds, currency, result, staleAfterHours);

    let refreshed = 0;
    let failed = 0;
    for (const cardId of cardIds) {
      const snap = result.get(cardId);
      if (snap && !snap.isCachedFallback) {
        refreshed += 1;
      } else {
        failed += 1;
      }
    }

    return { refreshed, failed, skipped: 0 };
  }
}

let singleton: PricingService | null = null;

export function getPricingService(): PricingService {
  if (!singleton) {
    singleton = new PricingService();
  }
  return singleton;
}

/** Tests only. */
export function resetPricingServiceSingleton(): void {
  singleton = null;
}

export const pricingService = {
  getCachedPrice: (...args: Parameters<PricingService["getCachedPrice"]>) =>
    getPricingService().getCachedPrice(...args),
  getPrice: (...args: Parameters<PricingService["getPrice"]>) =>
    getPricingService().getPrice(...args),
  getPricesForDeck: (...args: Parameters<PricingService["getPricesForDeck"]>) =>
    getPricingService().getPricesForDeck(...args),
  refreshDeckPrices: (
    ...args: Parameters<PricingService["refreshDeckPrices"]>
  ) => getPricingService().refreshDeckPrices(...args),
  refreshCardPrices: (
    ...args: Parameters<PricingService["refreshCardPrices"]>
  ) => getPricingService().refreshCardPrices(...args),
  getCurrency: () => getPricingService().getCurrency(),
};
