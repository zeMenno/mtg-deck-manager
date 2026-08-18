"use client";

import { DeckColorChart } from "@/components/deck/deck-color-chart";
import { DeckDistributionChart } from "@/components/deck/deck-distribution-chart";
import { DeckManaCurveChart } from "@/components/deck/deck-mana-curve-chart";
import { DeckSizeBadge } from "@/components/deck/deck-size-badge";
import { DeckStatusSummary } from "@/components/deck/deck-status-summary";
import { Button } from "@/components/ui/button";
import type { DeckStats } from "@/lib/deck/stats";
import { useDeckValuation } from "@/lib/hooks/use-deck-valuation";
import { useRefreshPrices } from "@/lib/hooks/use-refresh-prices";
import { formatCurrency, formatRelativeTime } from "@/lib/pricing/format-price";
import { cn } from "@/lib/utils";

type DeckStatsSummaryProps = {
  stats: DeckStats;
  deckId: string;
  compact?: boolean;
  className?: string;
};

function formatValuationLine(
  label: string,
  total: number | undefined,
  pricedCount: number,
  totalCount: number,
  currency: "USD" | "EUR",
): string {
  if (total == null) {
    return `${label}: Price unavailable`;
  }
  const base = `${label}: ${formatCurrency(total, currency)}`;
  if (pricedCount < totalCount && totalCount > 0) {
    return `${base} (${pricedCount} of ${totalCount} priced)`;
  }
  return base;
}

export function DeckStatsSummary({
  stats,
  deckId,
  compact = true,
  className,
}: DeckStatsSummaryProps) {
  const { valuation, isLoading } = useDeckValuation(deckId);
  const { refresh, isPending, isOnline } = useRefreshPrices(deckId);
  const currency = valuation?.currency ?? "USD";

  return (
    <div
      data-testid="deck-stats-summary"
      className={cn("flex flex-col gap-4", className)}
    >
      <div className="flex flex-wrap items-center gap-3">
        <DeckSizeBadge counts={stats.counts} />
        <DeckStatusSummary counts={stats.statusCounts} deckId={deckId} />
      </div>

      <div
        className="border-border bg-muted/30 flex flex-col gap-2 border-2 p-3"
        data-testid="deck-valuation-block"
      >
        {isLoading || !valuation ? (
          <p className="text-muted-foreground font-mono text-xs uppercase">
            Estimated value: …
          </p>
        ) : (
          <>
            <p className="font-mono text-xs uppercase">
              {formatValuationLine(
                "Estimated value",
                valuation.currentValue.total,
                valuation.currentValue.pricedCount,
                valuation.currentValue.totalCount,
                currency,
              )}
            </p>
            <p className="font-mono text-xs uppercase">
              {formatValuationLine(
                "Upgrade cost",
                valuation.upgradeCost.total,
                valuation.upgradeCost.pricedCount,
                valuation.upgradeCost.totalCount,
                currency,
              )}
            </p>
            {valuation.cutValue.totalCount > 0 ? (
              <p className="text-muted-foreground font-mono text-xs uppercase">
                {formatValuationLine(
                  "Net est. upgrade",
                  valuation.netUpgrade.net,
                  valuation.netUpgrade.pricedAddCount,
                  valuation.netUpgrade.totalAddCount,
                  currency,
                )}
              </p>
            ) : null}
            {valuation.currentValue.mostRecentFetchedAt ||
            valuation.upgradeCost.mostRecentFetchedAt ? (
              <p className="text-muted-foreground text-xs">
                Prices updated:{" "}
                {formatRelativeTime(
                  valuation.upgradeCost.mostRecentFetchedAt ??
                    valuation.currentValue.mostRecentFetchedAt!,
                )}
              </p>
            ) : null}
          </>
        )}
        <Button
          type="button"
          size="sm"
          variant="outline"
          data-testid="refresh-deck-prices-btn"
          disabled={isPending || !isOnline}
          title={!isOnline ? "Offline — refresh unavailable" : undefined}
          onClick={refresh}
        >
          {isPending
            ? "Refreshing…"
            : !isOnline
              ? "Offline · cached"
              : "Refresh prices"}
        </Button>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="font-mono text-xs font-bold uppercase">Mana curve</h2>
        <DeckManaCurveChart
          buckets={stats.manaCurve}
          averageManaValue={compact ? undefined : stats.averageManaValue}
          compact={compact}
        />
      </section>

      <div
        className={cn(
          "grid gap-4",
          compact ? "grid-cols-1 sm:grid-cols-2" : "grid-cols-1",
        )}
      >
        <DeckDistributionChart
          items={stats.typeDistribution.slice(0, compact ? 5 : undefined)}
          title="Types"
          compact={compact}
          testId="deck-type-summary"
        />
        <DeckColorChart
          distribution={stats.colorDistribution}
          compact={compact}
        />
      </div>
    </div>
  );
}
