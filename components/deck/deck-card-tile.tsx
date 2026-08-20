"use client";

import { useRef, useState } from "react";
import { Search } from "lucide-react";

import { CardHoverPreview } from "@/components/cards/card-hover-preview";
import { CardPriceDisplay } from "@/components/cards/card-price";
import { IllegalInFormatBadge } from "@/components/cards/illegal-in-format-badge";
import { LazyCardImage } from "@/components/cards/lazy-card-image";
import { ManaCost } from "@/components/cards/mana-cost";
import { DeckStatusBadge } from "@/components/deck/deck-status-badge";
import { Badge } from "@/components/ui/badge";
import { HOVER_PREVIEW_DELAY_MS, LONG_PRESS_MS } from "@/lib/display/constants";
import { getTileMetaClass } from "@/lib/display/grid-classes";
import { useFinePointer } from "@/lib/hooks/use-fine-pointer";
import { cn } from "@/lib/utils";
import type { DeckFormat } from "@/types";
import type { Tag } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

type DeckCardTileProps = {
  item: DeckCardWithCard;
  selected?: boolean;
  imagesEnabled?: boolean;
  multiSelectMode?: boolean;
  roleTags?: Tag[];
  synergyTags?: Tag[];
  deckFormat?: DeckFormat;
  hoverPreviewEnabled?: boolean;
  zoomOpen?: boolean;
  onPress: () => void;
  onLongPress: () => void;
  onZoom: () => void;
};

export function DeckCardTile({
  item,
  selected = false,
  imagesEnabled = true,
  multiSelectMode = false,
  roleTags = [],
  synergyTags = [],
  deckFormat,
  hoverPreviewEnabled = true,
  zoomOpen = false,
  onPress,
  onLongPress,
  onZoom,
}: DeckCardTileProps) {
  const { card, quantity, status } = item;
  const finePointer = useFinePointer();
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const longPressFired = useRef(false);
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);

  const tags = [...roleTags, ...synergyTags];
  const visibleTag = tags[0];
  const overflow = tags.length - (visibleTag ? 1 : 0);
  const showHover =
    finePointer &&
    hoverPreviewEnabled &&
    imagesEnabled &&
    !multiSelectMode &&
    !zoomOpen &&
    hoverAnchor != null;

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = undefined;
  }

  function clearHover() {
    if (hoverTimer.current) clearTimeout(hoverTimer.current);
    hoverTimer.current = undefined;
    setHoverAnchor(null);
  }

  function startLongPress() {
    longPressFired.current = false;
    clearLongPress();
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      clearHover();
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function handleActivate(action: () => void) {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    if (multiSelectMode) {
      onPress();
      return;
    }
    action();
  }

  return (
    <div
      data-testid={`deck-card-tile-${item.id}`}
      className={cn(
        "card-tile-contain border-border bg-card flex flex-col overflow-hidden rounded-md border shadow-sm",
        selected && "border-primary ring-primary ring-2",
      )}
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerLeave={() => {
        clearLongPress();
        clearHover();
      }}
      onPointerCancel={clearLongPress}
    >
      <div className="relative">
        <button
          type="button"
          data-testid={`deck-card-tile-art-${item.id}`}
          aria-label={`Zoom ${card.name}`}
          aria-pressed={multiSelectMode ? selected : undefined}
          className="relative block w-full bg-transparent p-0"
          onClick={() => handleActivate(onZoom)}
          onPointerEnter={(event) => {
            if (!finePointer || !hoverPreviewEnabled || multiSelectMode) return;
            const rect = event.currentTarget.getBoundingClientRect();
            hoverTimer.current = setTimeout(() => {
              setHoverAnchor(rect);
            }, HOVER_PREVIEW_DELAY_MS);
          }}
          onPointerLeave={clearHover}
        >
          <LazyCardImage
            card={card}
            size="tile"
            priority={item.zone === "commander"}
            imagesEnabled={imagesEnabled}
            className="w-full"
          />
        </button>

        <div className="pointer-events-none absolute top-1 left-1 flex flex-wrap gap-1">
          {quantity > 1 ? (
            <Badge variant="secondary" className="font-mono">
              {quantity}×
            </Badge>
          ) : null}
        </div>
        <div className="pointer-events-none absolute top-1 right-1 flex flex-col items-end gap-1">
          <DeckStatusBadge status={status} />
          {deckFormat ? (
            <IllegalInFormatBadge card={card} format={deckFormat} />
          ) : null}
        </div>

        {!multiSelectMode ? (
          <button
            type="button"
            data-testid={`deck-card-tile-zoom-${item.id}`}
            aria-label={`Magnify ${card.name}`}
            className="bg-background/80 border-border absolute right-1 bottom-1 inline-flex size-11 items-center justify-center rounded-md border shadow-xs"
            onClick={(event) => {
              event.stopPropagation();
              handleActivate(onZoom);
            }}
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        data-testid={`deck-card-tile-meta-${item.id}`}
        aria-pressed={selected}
        className={cn(
          getTileMetaClass(),
          "hover:bg-muted/60 w-full bg-transparent",
        )}
        onClick={() => handleActivate(onPress)}
      >
        <span className="line-clamp-2 text-sm font-bold">{card.name}</span>
        <div className="text-muted-foreground flex flex-wrap items-center gap-1 text-xs">
          {card.manaCost ? <ManaCost cost={card.manaCost} size="sm" /> : null}
          <span className="font-mono">MV {card.manaValue}</span>
          <CardPriceDisplay
            cardId={item.cardId}
            foil={item.foil}
            showSource={false}
            showTimestamp={false}
            className="text-xs"
          />
        </div>
        <div className="flex flex-wrap gap-1">
          {visibleTag ? (
            <Badge
              variant="outline"
              style={
                visibleTag.color ? { borderColor: visibleTag.color } : undefined
              }
            >
              {visibleTag.name}
            </Badge>
          ) : null}
          {overflow > 0 ? <Badge variant="outline">+{overflow}</Badge> : null}
        </div>
      </button>

      {showHover ? (
        <CardHoverPreview
          card={card}
          anchor={hoverAnchor}
          imagesEnabled={imagesEnabled}
        />
      ) : null}
    </div>
  );
}
