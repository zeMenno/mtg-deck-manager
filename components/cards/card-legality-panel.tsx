"use client";

import { CardLegalityBadge } from "@/components/cards/card-legality-badge";
import { Button } from "@/components/ui/button";
import { DISPLAY_LEGALITY_FORMATS, formatLabel } from "@/lib/cards/legality";
import { cn } from "@/lib/utils";
import type { Card, LegalityFormat } from "@/types/card";
import type { DeckFormat } from "@/types/index";

type CardLegalityPanelProps = {
  card: Card;
  highlightFormat?: DeckFormat | null;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
};

export function CardLegalityPanel({
  card,
  highlightFormat,
  onRefresh,
  refreshing = false,
  className,
}: CardLegalityPanelProps) {
  const legalities = card.legalities;

  if (!legalities) {
    return (
      <div
        className={cn("flex flex-col gap-3", className)}
        data-testid="card-legality-panel"
      >
        <p className="text-muted-foreground text-sm">
          Legality data not cached — connect to refresh.
        </p>
        {onRefresh ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={refreshing}
            onClick={onRefresh}
            data-testid="refresh-legality-btn"
          >
            {refreshing ? "Refreshing…" : "Refresh card"}
          </Button>
        ) : null}
      </div>
    );
  }

  const pin =
    highlightFormat && highlightFormat !== "other"
      ? (highlightFormat as LegalityFormat)
      : null;

  const ordered = [
    ...(pin ? [pin] : []),
    ...DISPLAY_LEGALITY_FORMATS.filter((f) => f !== pin),
  ];

  return (
    <div
      className={cn("flex flex-col gap-3", className)}
      data-testid="card-legality-panel"
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {ordered.map((format) => {
          const value = legalities[format];
          if (!value) return null;
          const highlighted = pin === format;
          return (
            <li
              key={format}
              className={cn(
                "border-border flex items-center justify-between gap-2 border-2 px-3 py-2",
                highlighted && "border-primary bg-primary/10 shadow-brutal-sm",
              )}
              data-testid={`legality-row-${format}`}
            >
              <span className="text-sm font-bold">
                {formatLabel(format)}
                {highlighted ? (
                  <span className="text-muted-foreground ml-1 font-mono text-[0.625rem] uppercase">
                    Deck
                  </span>
                ) : null}
              </span>
              <CardLegalityBadge legality={value} />
            </li>
          );
        })}
      </ul>
      {onRefresh ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-fit"
          disabled={refreshing}
          onClick={onRefresh}
          data-testid="refresh-legality-btn"
        >
          {refreshing ? "Refreshing…" : "Refresh from Scryfall"}
        </Button>
      ) : null}
    </div>
  );
}
