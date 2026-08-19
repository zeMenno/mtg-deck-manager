"use client";

import Link from "next/link";
import { Check } from "lucide-react";

import { DeckWarningList } from "@/components/deck/deck-warning-list";
import { DeckCheckSummary } from "@/components/deck/deck-check-summary";
import { Button } from "@/components/ui/button";
import { useDeckWarnings } from "@/lib/hooks/use-deck-warnings";
import { cn } from "@/lib/utils";

type DeckCheckPanelProps = {
  deckId: string;
  className?: string;
  compact?: boolean;
};

export function DeckCheckPanel({
  deckId,
  className,
  compact = true,
}: DeckCheckPanelProps) {
  const { warnings, issues, summary, isLoading } = useDeckWarnings(deckId);

  if (isLoading) {
    return (
      <div
        className={cn(
          "bg-muted border-border h-24 animate-pulse border",
          className,
        )}
        data-testid="deck-check-panel-loading"
      />
    );
  }

  const hasErrors = summary.errors > 0;

  return (
    <section
      data-testid="deck-check-panel"
      className={cn(
        "border-border border p-3",
        hasErrors ? "bg-destructive/10" : "bg-card",
        className,
      )}
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="font-mono text-xs font-bold uppercase">Deck check</h2>
          {!hasErrors && issues.length === 0 ? (
            <span
              className="bg-status-current text-status-current-foreground border-border inline-flex size-6 items-center justify-center border"
              aria-label="All checks passed"
            >
              <Check className="size-3.5" />
            </span>
          ) : null}
          {hasErrors ? (
            <span
              data-testid="deck-check-error-badge"
              className="bg-destructive text-destructive-foreground border-border inline-flex min-w-6 items-center justify-center rounded-sm border px-1.5 font-mono text-xs font-bold"
            >
              {summary.errors}
            </span>
          ) : null}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link
            href={`/decks/${deckId}/stats#warnings`}
            data-testid="deck-check-view-all"
          >
            View all
          </Link>
        </Button>
      </div>

      <DeckCheckSummary summary={summary} className="mb-3" />

      <DeckWarningList
        warnings={warnings}
        limit={compact ? 3 : undefined}
        deckId={deckId}
        title=""
      />
    </section>
  );
}
