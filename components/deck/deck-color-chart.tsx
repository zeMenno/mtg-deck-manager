"use client";

import { cn } from "@/lib/utils";
import type { ColorDistribution } from "@/lib/deck/stats";
import type { ManaColor } from "@/lib/deck/stats/color-distribution";

const COLOR_ORDER: ManaColor[] = ["W", "U", "B", "R", "G", "C"];

const COLOR_STYLES: Record<ManaColor, string> = {
  W: "bg-[#F9FAF4] text-black",
  U: "bg-[#0E68AB] text-white",
  B: "bg-[#150B00] text-white",
  R: "bg-[#D3202A] text-white",
  G: "bg-[#00733E] text-white",
  C: "bg-[#CBC5C0] text-black",
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
      <div className="border-border flex h-6 w-full overflow-hidden border-2">
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
              "border-border inline-flex min-w-8 items-center justify-center gap-1 border-2 px-1.5 py-0.5 font-mono text-xs font-bold",
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
