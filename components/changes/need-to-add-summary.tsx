"use client";

import type { DeckChangeSummary } from "@/lib/deck/changes";
import { formatCurrency, formatRelativeTime } from "@/lib/pricing/format-price";
import type { ValuationResult } from "@/lib/pricing/types";
import type { Currency } from "@/types";

type NeedToAddSummaryProps = {
  summary: Pick<DeckChangeSummary, "addCount" | "addQuantity">;
  upgradeCost?: ValuationResult;
  currency?: Currency;
  onRefreshPrices?: () => void;
  refreshing?: boolean;
  online?: boolean;
};

export function NeedToAddSummary({
  summary,
  upgradeCost,
  currency = "USD",
  onRefreshPrices,
  refreshing = false,
  online = true,
}: NeedToAddSummaryProps) {
  const costLabel =
    upgradeCost?.total != null
      ? formatCurrency(upgradeCost.total, currency)
      : "Price unavailable";

  const partial =
    upgradeCost &&
    upgradeCost.pricedCount > 0 &&
    upgradeCost.pricedCount < upgradeCost.totalCount
      ? ` (${upgradeCost.pricedCount} of ${upgradeCost.totalCount} priced)`
      : upgradeCost &&
          upgradeCost.totalCount > 0 &&
          upgradeCost.pricedCount === 0
        ? " (0 priced)"
        : "";

  return (
    <div
      className="border-border bg-status-add/20 sticky top-0 z-10 flex flex-col gap-2 border-2 p-3"
      data-testid="need-to-add-summary"
    >
      <p className="font-mono text-xs uppercase">
        Cards to add: {summary.addCount}
        <span className="mx-2">·</span>
        Qty: {summary.addQuantity}
        <span className="mx-2">·</span>
        Est. cost: {costLabel}
        {partial}
      </p>
      {upgradeCost?.mostRecentFetchedAt ? (
        <p
          className="text-muted-foreground text-xs"
          data-testid="need-to-add-prices-updated"
        >
          Prices updated: {formatRelativeTime(upgradeCost.mostRecentFetchedAt)}
        </p>
      ) : null}
      {onRefreshPrices ? (
        <button
          type="button"
          data-testid="refresh-prices-btn"
          disabled={refreshing || !online}
          title={!online ? "Offline — refresh unavailable" : undefined}
          onClick={onRefreshPrices}
          className="border-border bg-background disabled:text-muted-foreground min-h-11 self-start border-2 px-3 text-xs font-bold uppercase disabled:opacity-60"
        >
          {refreshing
            ? "Refreshing…"
            : !online
              ? "Offline · cached prices"
              : "Refresh prices"}
        </button>
      ) : null}
    </div>
  );
}
