"use client";

import { cn } from "@/lib/utils";
import type { DeckCountStats } from "@/lib/deck/stats";

type DeckSizeBadgeProps = {
  counts: DeckCountStats;
  className?: string;
};

export function DeckSizeBadge({ counts, className }: DeckSizeBadgeProps) {
  const onTarget = counts.total === counts.target;
  return (
    <div
      data-testid="deck-size-badge"
      className={cn(
        "border-border inline-flex items-baseline gap-2 border-2 px-3 py-2 font-black",
        onTarget
          ? "bg-status-current text-status-current-foreground"
          : "bg-destructive text-white",
        className,
      )}
    >
      <span className="text-2xl tabular-nums">
        {counts.total}
        <span className="text-base font-bold opacity-80">
          {" "}
          / {counts.target}
        </span>
      </span>
      <span className="font-mono text-xs uppercase">cards</span>
    </div>
  );
}
