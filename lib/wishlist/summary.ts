/**
 * Wishlist summary cost helpers (pure).
 */

import { selectUnitPrice, type PriceLike } from "@/lib/pricing/valuation";
import type { WishlistPriority } from "@/types";
import type { WishlistItem } from "@/types/card";

export type WishlistCostSummary = {
  estimatedCost: number | undefined;
  pricedCount: number;
  totalCount: number;
  mostRecentFetchedAt: string | undefined;
  byPriority: Record<WishlistPriority, number>;
};

/**
 * Sum (unitPrice × quantity) for wishlist items. Null/missing prices are
 * skipped — never coerced to $0.00.
 */
export function calculateWishlistCost(
  items: Pick<WishlistItem, "cardId" | "quantity" | "priority">[],
  prices: Map<string, PriceLike> | Record<string, PriceLike | undefined>,
): WishlistCostSummary {
  const byPriority: Record<WishlistPriority, number> = {
    essential: 0,
    high: 0,
    medium: 0,
    low: 0,
  };

  let sum = 0;
  let pricedCount = 0;
  let mostRecentFetchedAt: string | undefined;

  for (const item of items) {
    byPriority[item.priority] += 1;
    const price =
      prices instanceof Map ? prices.get(item.cardId) : prices[item.cardId];
    const unit = selectUnitPrice(price, { foil: false });
    if (unit == null) continue;
    sum += unit * item.quantity;
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
    estimatedCost: pricedCount === 0 ? undefined : sum,
    pricedCount,
    totalCount: items.length,
    mostRecentFetchedAt,
    byPriority,
  };
}

export function sortWishlistByPriority<
  T extends Pick<WishlistItem, "priority" | "addedAt">,
>(items: T[]): T[] {
  const weight: Record<WishlistPriority, number> = {
    essential: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  return [...items].sort((a, b) => {
    const byPriority = weight[a.priority] - weight[b.priority];
    if (byPriority !== 0) return byPriority;
    return Date.parse(b.addedAt) - Date.parse(a.addedAt);
  });
}
