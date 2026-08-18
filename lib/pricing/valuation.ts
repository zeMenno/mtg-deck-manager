import type { CardPrice } from "@/types/card";
import type { DeckCard } from "@/types/deck";
import type {
  CardPriceSnapshot,
  NetUpgradeResult,
  ValuationResult,
} from "@/lib/pricing/types";

export type PriceLike = Pick<
  CardPrice | CardPriceSnapshot,
  "normal" | "foil" | "market" | "low" | "fetchedAt" | "cardId"
>;

/**
 * Select unit price for a deck card.
 * Prefers foil when marked; never returns `0` for missing data — returns `undefined`.
 */
export function selectUnitPrice(
  price: PriceLike | undefined | null,
  deckCard: Pick<DeckCard, "foil">,
): number | undefined {
  if (!price) return undefined;
  if (deckCard.foil && price.foil != null) return price.foil;
  if (price.normal != null) return price.normal;
  if (price.market != null) return price.market;
  if (price.low != null) return price.low;
  // Foil requested but only non-foil missing already handled; foil missing falls through to normal above.
  return undefined;
}

export type ValuationOptions = {
  /** Statuses to include. */
  statuses?: Array<DeckCard["status"]>;
  /** Zones to exclude (default: maybeboard). */
  excludeZones?: Array<DeckCard["zone"]>;
  /** Zones to include exclusively (if set, overrides excludeZones). */
  includeZones?: Array<DeckCard["zone"]>;
};

type DeckCardForValuation = Pick<
  DeckCard,
  "id" | "cardId" | "quantity" | "status" | "zone" | "foil"
>;

function emptyResult(totalCount = 0): ValuationResult {
  return {
    total: undefined,
    pricedCount: 0,
    totalCount,
    unpricedCardIds: [],
  };
}

function matchesFilters(
  deckCard: DeckCardForValuation,
  options: ValuationOptions,
): boolean {
  if (options.statuses && !options.statuses.includes(deckCard.status)) {
    return false;
  }
  if (options.includeZones) {
    return options.includeZones.includes(deckCard.zone);
  }
  const exclude = options.excludeZones ?? ["maybeboard"];
  return !exclude.includes(deckCard.zone);
}

function getPriceFromMap(
  prices: Map<string, PriceLike> | Record<string, PriceLike | undefined>,
  cardId: string,
): PriceLike | undefined {
  if (prices instanceof Map) {
    return prices.get(cardId);
  }
  return prices[cardId];
}

/**
 * Sum line items for matching deck cards. Unpriced cards are excluded from
 * `total` but counted in `totalCount` / `unpricedCardIds`.
 * When zero cards are priced, `total` is `undefined` (not `0`).
 */
export function calculateValuation(
  deckCards: DeckCardForValuation[],
  prices: Map<string, PriceLike> | Record<string, PriceLike | undefined>,
  options: ValuationOptions = {},
): ValuationResult {
  const filtered = deckCards.filter((c) => matchesFilters(c, options));
  if (filtered.length === 0) {
    return emptyResult(0);
  }

  let sum = 0;
  let pricedCount = 0;
  const unpricedCardIds: string[] = [];
  let mostRecentFetchedAt: string | undefined;

  for (const deckCard of filtered) {
    const price = getPriceFromMap(prices, deckCard.cardId);
    const unit = selectUnitPrice(price, deckCard);
    if (unit == null) {
      unpricedCardIds.push(deckCard.cardId);
      continue;
    }
    sum += unit * deckCard.quantity;
    pricedCount += 1;
    if (price?.fetchedAt) {
      if (
        !mostRecentFetchedAt ||
        Date.parse(price.fetchedAt) > Date.parse(mostRecentFetchedAt)
      ) {
        mostRecentFetchedAt = price.fetchedAt;
      }
    }
  }

  return {
    total: pricedCount === 0 ? undefined : sum,
    pricedCount,
    totalCount: filtered.length,
    unpricedCardIds,
    mostRecentFetchedAt,
  };
}

/** Current deck value: status `current`, excluding maybeboard. */
export function calculateDeckValue(
  deckCards: DeckCardForValuation[],
  prices: Map<string, PriceLike> | Record<string, PriceLike | undefined>,
  options: ValuationOptions = {},
): ValuationResult {
  return calculateValuation(deckCards, prices, {
    excludeZones: ["maybeboard"],
    ...options,
    statuses: options.statuses ?? ["current"],
  });
}

/** Upgrade cost: status `add`. */
export function calculateUpgradeCost(
  deckCards: DeckCardForValuation[],
  prices: Map<string, PriceLike> | Record<string, PriceLike | undefined>,
  options: ValuationOptions = {},
): ValuationResult {
  return calculateValuation(deckCards, prices, {
    excludeZones: ["maybeboard"],
    ...options,
    statuses: options.statuses ?? ["add"],
  });
}

/** CUT value (display credit). */
export function calculateCutValue(
  deckCards: DeckCardForValuation[],
  prices: Map<string, PriceLike> | Record<string, PriceLike | undefined>,
  options: ValuationOptions = {},
): ValuationResult {
  return calculateValuation(deckCards, prices, {
    excludeZones: ["maybeboard"],
    ...options,
    statuses: options.statuses ?? ["cut"],
  });
}

export function calculateNetUpgrade(
  add: ValuationResult,
  cut: ValuationResult,
): NetUpgradeResult {
  let net: number | undefined;
  if (add.total != null && cut.total != null) {
    net = add.total - cut.total;
  } else if (add.total != null) {
    net = add.total;
  } else {
    net = undefined;
  }

  return {
    net,
    add,
    cut,
    pricedAddCount: add.pricedCount,
    totalAddCount: add.totalCount,
  };
}
