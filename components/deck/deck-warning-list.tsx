"use client";

import Link from "next/link";

import { DeckWarningItem } from "@/components/deck/deck-warning-item";
import { Button } from "@/components/ui/button";
import type { DeckWarning, WarningCategory } from "@/types/deck-validation";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: WarningCategory[] = [
  "LEGALITY",
  "WARNING",
  "RECOMMENDATION",
];

const LEGALITY_SUCCESS_CODES = new Set([
  "COMMANDER_COUNT",
  "DECK_SIZE",
  "DUPLICATE_NON_BASIC",
  "COLOR_IDENTITY",
]);

type DeckWarningListProps = {
  warnings: DeckWarning[];
  limit?: number;
  deckId?: string;
  className?: string;
  title?: string;
  grouped?: boolean;
};

function sortWarnings(warnings: DeckWarning[]): DeckWarning[] {
  return [...warnings].sort((a, b) => {
    if (a.severity === "success" && b.severity !== "success") return 1;
    if (b.severity === "success" && a.severity !== "success") return -1;
    return (
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category)
    );
  });
}

export function DeckWarningList({
  warnings,
  limit,
  deckId,
  className,
  title = "Deck check",
  grouped = false,
}: DeckWarningListProps) {
  const sorted = sortWarnings(warnings);
  const issues = sorted.filter((w) => w.severity !== "success");
  const passes = sorted.filter((w) => w.severity === "success");

  let visible: DeckWarning[];
  let truncated = false;

  if (typeof limit === "number") {
    const topIssues = issues.slice(0, limit);
    const topPasses = passes.slice(0, Math.max(0, 3 - topIssues.length));
    visible = [...topPasses, ...topIssues];
    truncated = issues.length > limit;
  } else {
    visible = sorted;
  }

  return (
    <section
      data-testid="deck-warning-list"
      className={cn("flex flex-col gap-3", className)}
    >
      <div className="flex items-center justify-between gap-2">
        {title ? (
          <h2 className="font-mono text-xs font-bold uppercase">{title}</h2>
        ) : (
          <span />
        )}
        {deckId && truncated ? (
          <Button asChild variant="ghost" size="sm">
            <Link
              href={`/decks/${deckId}/stats#warnings`}
              data-testid="view-all-warnings"
            >
              View all
            </Link>
          </Button>
        ) : null}
      </div>
      {visible.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          Add cards to run deck checks.
        </p>
      ) : grouped ? (
        <div className="flex flex-col gap-4">
          {CATEGORY_ORDER.map((category) => {
            const withPasses = visible.filter((w) => {
              if (w.severity === "success") {
                if (category === "LEGALITY") {
                  return LEGALITY_SUCCESS_CODES.has(w.code);
                }
                if (category === "RECOMMENDATION") {
                  return w.code === "LAND_COUNT";
                }
                return false;
              }
              return w.category === category;
            });
            if (withPasses.length === 0) return null;
            return (
              <div key={category} className="flex flex-col gap-2">
                <h3 className="font-mono text-[10px] font-bold uppercase">
                  {category}
                </h3>
                <ul className="flex flex-col gap-2">
                  {withPasses.map((warning) => (
                    <DeckWarningItem key={warning.id} warning={warning} />
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((warning) => (
            <DeckWarningItem key={warning.id} warning={warning} />
          ))}
        </ul>
      )}
    </section>
  );
}
