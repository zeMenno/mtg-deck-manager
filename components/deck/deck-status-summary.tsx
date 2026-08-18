"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import type { StatusCounts } from "@/lib/deck/stats";
import { cn } from "@/lib/utils";

type DeckStatusSummaryProps = {
  counts: StatusCounts;
  deckId?: string;
  className?: string;
};

export function DeckStatusSummary({
  counts,
  deckId,
  className,
}: DeckStatusSummaryProps) {
  const chips = [
    {
      key: "add",
      label: `+${counts.add} ADD`,
      className: "bg-status-add text-status-add-foreground",
      href: deckId ? `/decks/${deckId}/changes/add` : undefined,
    },
    {
      key: "cut",
      label: `-${counts.cut} CUT`,
      className: "bg-status-cut text-status-cut-foreground",
      href: deckId ? `/decks/${deckId}/changes/cut` : undefined,
    },
    {
      key: "consider",
      label: `${counts.consider} CONSIDER`,
      className: "bg-status-consider text-status-consider-foreground",
      href: deckId ? `/decks/${deckId}/changes/consider` : undefined,
    },
  ] as const;

  return (
    <div
      data-testid="deck-status-summary"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {chips.map((chip) => {
        const badge = (
          <Badge
            variant="outline"
            className={cn("border-border border-2", chip.className)}
            data-testid={`status-count-${chip.key}`}
          >
            {chip.label}
          </Badge>
        );
        if (chip.href) {
          return (
            <Link key={chip.key} href={chip.href} className="hover:opacity-90">
              {badge}
            </Link>
          );
        }
        return <span key={chip.key}>{badge}</span>;
      })}
    </div>
  );
}
