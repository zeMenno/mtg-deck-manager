"use client";

import { Heart } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CardImage } from "@/components/cards/card-image";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";

type CardResultRowProps = {
  card: Card;
  onSelect?: (card: Card) => void;
  onAddToWishlist?: (card: Card) => void;
  imagesEnabled?: boolean;
  className?: string;
};

export function CardResultRow({
  card,
  onSelect,
  onAddToWishlist,
  imagesEnabled = true,
  className,
}: CardResultRowProps) {
  return (
    <div
      data-testid={`card-result-${card.id}`}
      className={cn(
        "border-border bg-card shadow-brutal-sm flex min-h-11 w-full items-center gap-2 border-2 p-2 transition-all",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => onSelect?.(card)}
        className="focus-visible:ring-ring flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:ring-2 focus-visible:outline-none"
      >
        {imagesEnabled ? (
          <CardImage
            card={card}
            size="xs"
            imagesEnabled={imagesEnabled}
            className="shrink-0"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="truncate font-bold">{card.name}</span>
            <Badge variant="secondary" className="shrink-0">
              {Number.isInteger(card.manaValue)
                ? card.manaValue
                : card.manaValue.toFixed(1)}
            </Badge>
          </div>
          <p className="text-muted-foreground truncate text-xs">
            {card.typeLine}
          </p>
          {card.manaCost ? (
            <p className="font-mono text-xs">{card.manaCost}</p>
          ) : null}
        </div>
      </button>
      {onAddToWishlist ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="size-11 shrink-0 p-0"
          data-testid={`card-result-wishlist-${card.id}`}
          aria-label={`Add ${card.name} to wishlist`}
          onClick={(e) => {
            e.stopPropagation();
            onAddToWishlist(card);
          }}
        >
          <Heart className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
