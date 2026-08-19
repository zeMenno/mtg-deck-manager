"use client";

import { memo } from "react";

import { LazyCardImage } from "@/components/cards/lazy-card-image";
import { CardPriceDisplay } from "@/components/cards/card-price";
import { TcgplayerLink } from "@/components/cards/tcgplayer-link";
import { PriorityBadge } from "@/components/wishlist/priority-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getDensityNameClass,
  getDensityRowClass,
} from "@/lib/display/density-classes";
import { cn } from "@/lib/utils";
import type { DisplayDensity } from "@/types";
import type { Tag } from "@/types/card";
import type { WishlistItemWithCard } from "@/lib/wishlist/types";

type WishlistItemRowProps = {
  item: WishlistItemWithCard;
  density?: DisplayDensity;
  imagesEnabled?: boolean;
  selected?: boolean;
  selectionMode?: boolean;
  deckName?: string;
  roleTag?: Tag;
  onPress?: () => void;
  onToggleSelect?: () => void;
  onConsider?: () => void;
  onAdd?: () => void;
};

function WishlistItemRowComponent({
  item,
  density = "comfortable",
  imagesEnabled = true,
  selected = false,
  selectionMode = false,
  deckName,
  roleTag,
  onPress,
  onToggleSelect,
  onConsider,
  onAdd,
}: WishlistItemRowProps) {
  const card = item.card;
  const showThumb =
    imagesEnabled && (density === "comfortable" || density === "image");

  return (
    <div
      data-testid={`wishlist-item-${item.id}`}
      data-density={density}
      className={cn(
        "border-border bg-card flex w-full items-stretch rounded-md border shadow-sm",
        getDensityRowClass(density),
        selected && "bg-primary/10 ring-primary ring-2",
      )}
    >
      {selectionMode ? (
        <button
          type="button"
          aria-pressed={selected}
          aria-label={selected ? "Deselect item" : "Select item"}
          data-testid={`wishlist-select-${item.id}`}
          className="border-border mr-2 flex size-11 shrink-0 items-center justify-center border"
          onClick={onToggleSelect}
        >
          {selected ? "✓" : ""}
        </button>
      ) : null}

      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
        onClick={onPress}
        data-testid={`wishlist-item-open-${item.id}`}
      >
        {showThumb && card ? (
          <LazyCardImage
            card={card}
            size={density === "image" ? "sm" : "xs"}
            imagesEnabled={imagesEnabled}
            className="shrink-0"
          />
        ) : null}

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className={getDensityNameClass(density)}>
              {item.quantity > 1 ? `${item.quantity}× ` : null}
              {card?.name ?? "Unknown card"}
            </span>
            <PriorityBadge priority={item.priority} />
          </div>

          {density !== "compact" && card?.typeLine ? (
            <p className="text-muted-foreground truncate text-xs">
              {card.typeLine}
            </p>
          ) : null}

          <div className="mt-1 flex flex-wrap items-center gap-1">
            {card ? (
              <Badge variant="secondary" className="font-mono">
                MV {card.manaValue}
              </Badge>
            ) : null}
            <Badge variant="outline">{deckName ?? "No deck"}</Badge>
            {roleTag ? (
              <Badge
                variant="outline"
                style={
                  roleTag.color ? { borderColor: roleTag.color } : undefined
                }
              >
                {roleTag.name}
              </Badge>
            ) : null}
          </div>

          <div
            className="mt-1 flex flex-wrap items-center gap-2"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CardPriceDisplay
              cardId={item.cardId}
              quantity={item.quantity}
              showSource={density === "comfortable"}
              showTimestamp={density === "comfortable"}
            />
            {card?.tcgplayerUri ? (
              <TcgplayerLink
                tcgplayerUri={card.tcgplayerUri}
                cardName={card.name}
              />
            ) : null}
          </div>
        </div>
      </button>

      {!selectionMode ? (
        <div className="ml-2 flex shrink-0 flex-col justify-center gap-1">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="min-h-11"
            data-testid={`wishlist-consider-${item.id}`}
            onClick={onConsider}
          >
            Consider
          </Button>
          <Button
            type="button"
            size="sm"
            className="min-h-11"
            data-testid={`wishlist-add-${item.id}`}
            onClick={onAdd}
          >
            Add
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export const WishlistItemRow = memo(WishlistItemRowComponent);

export type { WishlistItemRowProps };
