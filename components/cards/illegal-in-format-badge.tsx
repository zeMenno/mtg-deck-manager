"use client";

import { Badge } from "@/components/ui/badge";
import { getLegalityWarning } from "@/lib/cards/legality";
import type { Card } from "@/types/card";
import type { DeckFormat } from "@/types/index";

type IllegalInFormatBadgeProps = {
  card: Card;
  format: DeckFormat;
};

/** Small badge for deck rows when the card is illegal in the deck format. */
export function IllegalInFormatBadge({
  card,
  format,
}: IllegalInFormatBadgeProps) {
  const warning = getLegalityWarning(card, format);
  if (!warning) return null;

  return (
    <Badge
      variant={warning.kind === "banned" ? "destructive" : "outline"}
      data-testid="illegal-format-badge"
      className="shrink-0"
    >
      {warning.kind === "banned"
        ? "Banned"
        : warning.kind === "restricted"
          ? "Restricted"
          : "Illegal"}
    </Badge>
  );
}
