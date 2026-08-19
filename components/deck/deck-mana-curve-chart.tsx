"use client";

import { cn } from "@/lib/utils";
import type { ManaCurveBucket } from "@/lib/deck/stats";

type DeckManaCurveChartProps = {
  buckets: ManaCurveBucket[];
  averageManaValue?: number;
  compact?: boolean;
  className?: string;
};

export function DeckManaCurveChart({
  buckets,
  averageManaValue,
  compact = false,
  className,
}: DeckManaCurveChartProps) {
  const max = Math.max(1, ...buckets.map((b) => b.count));
  const heightClass = compact ? "h-16" : "h-28";

  return (
    <div
      data-testid="deck-mana-curve"
      className={cn("flex flex-col gap-2", className)}
    >
      <div
        className={cn(
          "border-border flex items-end gap-1 border p-2",
          heightClass,
        )}
      >
        {buckets.map((bucket) => {
          const pct = Math.round((bucket.count / max) * 100);
          return (
            <div
              key={bucket.cmc}
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1"
            >
              {!compact && bucket.count > 0 ? (
                <span className="font-mono text-[10px] leading-none">
                  {bucket.count}
                </span>
              ) : null}
              <div
                className="bg-primary border-border w-full border"
                style={{
                  height: `${Math.max(bucket.count > 0 ? 8 : 2, pct)}%`,
                }}
                title={`${bucket.label}: ${bucket.count}`}
                data-testid={`mana-curve-bar-${bucket.cmc}`}
              />
            </div>
          );
        })}
      </div>
      <div className="text-muted-foreground flex justify-between font-mono text-[10px] uppercase">
        {buckets.map((bucket) => (
          <span key={bucket.cmc} className="flex-1 text-center">
            {bucket.label}
          </span>
        ))}
      </div>
      {typeof averageManaValue === "number" ? (
        <p className="font-mono text-xs uppercase">
          Avg MV (non-lands): {averageManaValue.toFixed(2)}
        </p>
      ) : null}
    </div>
  );
}
