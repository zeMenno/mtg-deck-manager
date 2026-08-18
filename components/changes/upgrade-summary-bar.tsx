"use client";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { DeckChangeSummary } from "@/lib/deck/changes";
import { useDeckValuation } from "@/lib/hooks/use-deck-valuation";
import { formatCurrency } from "@/lib/pricing/format-price";
import { cn } from "@/lib/utils";

type UpgradeSummaryBarProps = {
  deckId: string;
  summary: DeckChangeSummary;
  onReview?: () => void;
  className?: string;
};

/**
 * Sticky upgrade summary when ADD/CUT pending.
 */
export function UpgradeSummaryBar({
  deckId,
  summary,
  onReview,
  className,
}: UpgradeSummaryBarProps) {
  const { valuation } = useDeckValuation(deckId);
  const currency = valuation?.currency ?? "USD";
  const cost =
    valuation?.upgradeCost.total != null
      ? formatCurrency(valuation.upgradeCost.total, currency)
      : "—";

  if (!summary.hasPendingChanges) return null;

  return (
    <div
      data-testid="upgrade-summary-bar"
      className={cn(
        "border-border bg-secondary shadow-brutal sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-2 p-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-mono text-xs uppercase">
          {summary.addCount} adds · {summary.cutCount} cuts ·{" "}
          {summary.considerCount} consider · {cost}
        </p>
        {onReview ? (
          <Button
            type="button"
            size="sm"
            data-testid="upgrade-summary-review-btn"
            onClick={onReview}
          >
            Review changes
          </Button>
        ) : (
          <Button asChild size="sm" data-testid="upgrade-summary-review-btn">
            <Link href={`/decks/${deckId}/changes`}>Review changes</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
