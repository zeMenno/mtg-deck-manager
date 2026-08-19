"use client";

import { cn } from "@/lib/utils";
import type { ColorDistribution } from "@/lib/deck/stats";
import type { ManaColor } from "@/lib/deck/stats/color-distribution";

const COLOR_ORDER: ManaColor[] = ["W", "U", "B", "R", "G", "C"];

const COLOR_STYLES: Record<ManaColor, string> = {
  W: "bg-mana-w text-mana-w-foreground",
  U: "bg-mana-u text-mana-u-foreground",
  B: "bg-mana-b text-mana-b-foreground",
  R: "bg-mana-r text-mana-r-foreground",
  G: "bg-mana-g text-mana-g-foreground",
  C: "bg-mana-c text-mana-c-foreground",
};

type DeckColorChartProps = {
  distribution: ColorDistribution;
  compact?: boolean;
  className?: string;
};

export function DeckColorChart({
  distribution,
  compact = false,
  className,
}: DeckColorChartProps) {
  const total = COLOR_ORDER.reduce((sum, c) => sum + distribution.pips[c], 0);

  return (
    <div
      data-testid="deck-color-chart"
      className={cn("flex flex-col gap-2", className)}
    >
      <h3 className="font-mono text-xs font-bold uppercase">Colors</h3>
      <div className="border-border flex h-6 w-full overflow-hidden border">
        {total === 0 ? (
          <div className="bg-muted h-full w-full" />
        ) : (
          COLOR_ORDER.map((color) => {
            const count = distribution.pips[color];
            if (count === 0) return null;
            const pct = (count / total) * 100;
            return (
              <div
                key={color}
                className={cn(
                  "border-border flex items-center justify-center border-r text-[10px] font-bold last:border-r-0",
                  COLOR_STYLES[color],
                )}
                style={{ width: `${pct}%` }}
                title={`${color}: ${count}`}
                data-testid={`color-pip-${color}`}
              >
                {!compact && pct >= 12 ? color : null}
              </div>
            );
          })
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {COLOR_ORDER.map((color) => (
          <span
            key={color}
            className={cn(
              "border-border inline-flex min-w-8 items-center justify-center gap-1 border px-1.5 py-0.5 font-mono text-xs font-bold",
              COLOR_STYLES[color],
            )}
          >
            <span aria-hidden>{color}</span>
            <span>{distribution.pips[color]}</span>
          </span>
        ))}
      </div>
      {distribution.identity.length > 0 ? (
        <p className="font-mono text-xs uppercase">
          Identity: {distribution.identity.join("") || "C"}
        </p>
      ) : (
        <p className="text-muted-foreground font-mono text-xs uppercase">
          Identity: —
        </p>
      )}
    </div>
  );
}
