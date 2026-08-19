"use client";

import { cn } from "@/lib/utils";
import type { DistributionItem } from "@/lib/deck/stats";

type DeckDistributionChartProps = {
  items: DistributionItem[];
  title?: string;
  compact?: boolean;
  className?: string;
  testId?: string;
};

export function DeckDistributionChart({
  items,
  title,
  compact = false,
  className,
  testId = "deck-distribution-chart",
}: DeckDistributionChartProps) {
  const max = Math.max(1, ...items.map((i) => i.count));

  return (
    <div data-testid={testId} className={cn("flex flex-col gap-2", className)}>
      {title ? (
        <h3 className="font-mono text-xs font-bold uppercase">{title}</h3>
      ) : null}
      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const pct = Math.round((item.count / max) * 100);
          return (
            <li key={item.id} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <span
                  className={cn("font-bold", compact ? "text-xs" : "text-sm")}
                >
                  {item.label}
                </span>
                <span className="font-mono text-xs tabular-nums">
                  {item.count}
                </span>
              </div>
              <div className="border-border h-3 border">
                <div
                  className="bg-secondary border-border h-full border-r"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      {items.length === 0 ? (
        <p className="text-muted-foreground text-sm">No data yet.</p>
      ) : null}
    </div>
  );
}
