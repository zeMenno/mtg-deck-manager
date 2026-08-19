"use client";

import { Button } from "@/components/ui/button";
import { formatCurrency, formatRelativeTime } from "@/lib/pricing/format-price";
import type { WishlistSummary } from "@/lib/wishlist";
import type { Currency } from "@/types";
import { PRIORITY_LABELS } from "@/types/wishlist";

type WishlistSummaryBarProps = {
  summary: WishlistSummary | undefined;
  isRefreshing?: boolean;
  canRefresh?: boolean;
  onRefreshPrices?: () => void;
};

export function WishlistSummaryBar({
  summary,
  isRefreshing = false,
  canRefresh = true,
  onRefreshPrices,
}: WishlistSummaryBarProps) {
  if (!summary) {
    return (
      <div
        className="border-border bg-muted/40 h-16 animate-pulse border"
        data-testid="wishlist-summary-loading"
        aria-busy="true"
      />
    );
  }

  const currency = (summary.currency as Currency) || "USD";
  const costLabel =
    summary.estimatedCost != null
      ? formatCurrency(summary.estimatedCost, currency)
      : "Price unavailable";

  const priorityBits = (
    ["essential", "high", "medium", "low"] as const
  ).flatMap((p) =>
    summary.byPriority[p] > 0
      ? [`${summary.byPriority[p]} ${PRIORITY_LABELS[p]}`]
      : [],
  );

  return (
    <div
      className="border-border bg-card flex flex-col gap-2 rounded-md border p-3 shadow-sm"
      data-testid="wishlist-summary-bar"
    >
      <p className="font-mono text-xs uppercase">
        {summary.totalItems} item{summary.totalItems === 1 ? "" : "s"}
        {priorityBits.length > 0 ? ` · ${priorityBits.join(" · ")}` : null}
      </p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold">
          Est. {costLabel}
          <span className="text-muted-foreground ml-2 font-mono text-xs font-normal">
            ({summary.pricedCount} of {summary.totalPricedSlots} priced)
            {summary.mostRecentFetchedAt
              ? ` · Updated ${formatRelativeTime(summary.mostRecentFetchedAt)}`
              : null}
          </span>
        </p>
        {onRefreshPrices ? (
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="wishlist-refresh-prices-btn"
            disabled={!canRefresh || isRefreshing}
            onClick={onRefreshPrices}
          >
            {isRefreshing ? "Refreshing…" : "Refresh prices"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
