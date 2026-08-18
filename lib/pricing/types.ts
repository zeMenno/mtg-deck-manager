/**
 * Pricing domain types — provider-agnostic snapshots.
 *
 * Null vs zero:
 * - `null` / `undefined` means price is **unavailable** (missing, failed fetch, or
 *   Scryfall returned null). Never coerce these to `0`.
 * - A numeric `0` or `0.00` is a **valid** market price and may be displayed as `$0.00`.
 */

import type { Currency } from "@/types";

export interface CardIdentity {
  /** Scryfall UUID for this printing. */
  cardId: string;
  /** For future oracle-level pricing. */
  oracleId?: string;
  name: string;
  foil?: boolean;
}

/**
 * Runtime price snapshot from a provider (before / after Dexie persistence).
 * `isStale` is computed, not persisted.
 */
export interface CardPriceSnapshot {
  cardId: string;
  currency: Currency;
  /** Market reference low — MVP: same as `normal` (Scryfall has no TCGplayer low). */
  low?: number;
  /** Market reference — MVP: same as `normal`. */
  market?: number;
  /** Non-foil price. */
  normal?: number;
  /** Foil price. */
  foil?: number;
  source: string;
  fetchedAt: string;
  isStale?: boolean;
  /** True when returned from cache after a failed refresh. */
  isCachedFallback?: boolean;
}

export type PriceDisplayState =
  "available" | "unavailable" | "cached_fallback" | "loading";

export type PricingProviderErrorCode =
  "UNAVAILABLE" | "RATE_LIMITED" | "NETWORK" | "PARSE_ERROR";

export class PricingProviderError extends Error {
  readonly code: PricingProviderErrorCode;
  readonly providerId: string;

  constructor(
    code: PricingProviderErrorCode,
    message: string,
    providerId: string,
  ) {
    super(message);
    this.name = "PricingProviderError";
    this.code = code;
    this.providerId = providerId;
  }
}

export interface PricingProvider {
  readonly id: string;
  readonly displayName: string;

  /**
   * Fetch fresh price for one card.
   * Returns `null` if unavailable — never a zero placeholder.
   */
  getPrice(identity: CardIdentity): Promise<CardPriceSnapshot | null>;

  /** Batch fetch; provider chunks internally. Missing cards are omitted from the map. */
  getPrices(
    identities: CardIdentity[],
  ): Promise<Map<string, CardPriceSnapshot>>;
}

export type RefreshResult = {
  refreshed: number;
  failed: number;
  skipped: number;
};

export type ValuationResult = {
  /** Sum of priced line items, or `undefined` when nothing could be priced. */
  total: number | undefined;
  pricedCount: number;
  totalCount: number;
  unpricedCardIds: string[];
  /** Most recent `fetchedAt` among priced cards, if any. */
  mostRecentFetchedAt?: string;
};

export type NetUpgradeResult = {
  net: number | undefined;
  add: ValuationResult;
  cut: ValuationResult;
  pricedAddCount: number;
  totalAddCount: number;
};

export type DeckValuationBundle = {
  currentValue: ValuationResult;
  upgradeCost: ValuationResult;
  cutValue: ValuationResult;
  netUpgrade: NetUpgradeResult;
  currency: Currency;
};
