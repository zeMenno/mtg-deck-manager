"use client";

import type { DeckValidationSummary } from "@/types/deck-validation";
import { cn } from "@/lib/utils";

type DeckCheckSummaryProps = {
  summary: DeckValidationSummary;
  className?: string;
};

export function DeckCheckSummary({
  summary,
  className,
}: DeckCheckSummaryProps) {
  return (
    <dl
      data-testid="deck-check-summary"
      className={cn(
        "grid grid-cols-2 gap-2 font-mono text-[10px] uppercase sm:grid-cols-4",
        className,
      )}
    >
      <div className="border-border border-2 p-2">
        <dt className="text-muted-foreground">Errors</dt>
        <dd
          className={cn(
            "text-lg font-black",
            summary.errors > 0 && "text-destructive",
          )}
          data-testid="summary-errors"
        >
          {summary.errors}
        </dd>
      </div>
      <div className="border-border border-2 p-2">
        <dt className="text-muted-foreground">Warnings</dt>
        <dd className="text-lg font-black" data-testid="summary-warnings">
          {summary.warnings}
        </dd>
      </div>
      <div className="border-border border-2 p-2">
        <dt className="text-muted-foreground">Recs</dt>
        <dd
          className="text-lg font-black"
          data-testid="summary-recommendations"
        >
          {summary.recommendations}
        </dd>
      </div>
      <div className="border-border border-2 p-2">
        <dt className="text-muted-foreground">Passed</dt>
        <dd className="text-lg font-black" data-testid="summary-passed">
          {summary.passed}
        </dd>
      </div>
    </dl>
  );
}
