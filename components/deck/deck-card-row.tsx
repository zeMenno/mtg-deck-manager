"use client";

import { memo, useRef } from "react";

import { LazyCardImage } from "@/components/cards/lazy-card-image";
import { CardPriceDisplay } from "@/components/cards/card-price";
import { IllegalInFormatBadge } from "@/components/cards/illegal-in-format-badge";
import { ManaCost } from "@/components/cards/mana-cost";
import { ReplacementLinkBadge } from "@/components/changes/replacement-link-badge";
import { DeckStatusBadge } from "@/components/deck/deck-status-badge";
import { Badge } from "@/components/ui/badge";
import { LONG_PRESS_MS } from "@/lib/display/constants";
import {
  getDensityNameClass,
  getDensityRowClass,
  toRowDensity,
} from "@/lib/display/density-classes";
import { cn } from "@/lib/utils";
import type { DisplayDensity, DeckFormat } from "@/types";
import type { Tag } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

type DeckCardRowProps = {
  item: DeckCardWithCard;
  density?: DisplayDensity;
  selected?: boolean;
  imagesEnabled?: boolean;
  roleTags?: Tag[];
  synergyTags?: Tag[];
  replacementName?: string;
  /** Show price (all densities when true; compact shows $ only). */
  showPrice?: boolean;
  /** Commander / above-fold: eager image load. */
  priorityImage?: boolean;
  /** Deck format — shows illegal badge when card is banned/not legal. */
  deckFormat?: DeckFormat;
  onPress?: () => void;
  onLongPress?: () => void;
  onPickReplacement?: () => void;
  /** Thumbnail tap opens zoom (sibling control — not nested in the row button). */
  onZoom?: () => void;
};

function TagChips({
  roleTags,
  synergyTags,
}: {
  roleTags: Tag[];
  synergyTags: Tag[];
}) {
  const chips = [...roleTags, ...synergyTags];
  const visible = chips.slice(0, 2);
  const overflow = chips.length - visible.length;
  return (
    <>
      {visible.map((tag) => (
        <Badge
          key={tag.id}
          variant="outline"
          style={tag.color ? { borderColor: tag.color } : undefined}
        >
          {tag.name}
        </Badge>
      ))}
      {overflow > 0 ? <Badge variant="outline">+{overflow}</Badge> : null}
    </>
  );
}

function DeckCardRowComponent({
  item,
  density = "comfortable",
  selected = false,
  imagesEnabled = true,
  roleTags = [],
  synergyTags = [],
  replacementName,
  showPrice = false,
  priorityImage = false,
  deckFormat,
  onPress,
  onLongPress,
  onPickReplacement,
  onZoom,
}: DeckCardRowProps) {
  const rowDensity = toRowDensity(density);
  const { card, quantity, status } = item;
  const showThumb =
    imagesEnabled && (rowDensity === "comfortable" || rowDensity === "image");
  const showReplacement =
    Boolean(replacementName) ||
    (Boolean(onPickReplacement) && (status === "add" || status === "cut"));
  const splitZoom = Boolean(onZoom && showThumb);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const longPressFired = useRef(false);

  function startLongPress() {
    if (!onLongPress) return;
    longPressFired.current = false;
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      onLongPress();
    }, LONG_PRESS_MS);
  }

  function clearLongPress() {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  }

  function handlePress() {
    if (longPressFired.current) {
      longPressFired.current = false;
      return;
    }
    onPress?.();
  }

  const body = (
    <>
      {showThumb && !splitZoom ? (
        <LazyCardImage
          card={card}
          size={rowDensity === "image" ? "sm" : "xs"}
          priority={priorityImage || item.zone === "commander"}
          imagesEnabled={imagesEnabled}
          className="shrink-0"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={getDensityNameClass(rowDensity)}>
            {quantity > 1 ? `${quantity}× ` : null}
            {card.name}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {deckFormat ? (
              <IllegalInFormatBadge card={card} format={deckFormat} />
            ) : null}
            <DeckStatusBadge status={status} />
          </div>
        </div>

        {rowDensity === "compact" ? (
          <p className="text-muted-foreground truncate text-xs">
            {card.typeLine}
            {card.typeLine ? " · " : null}
            MV {card.manaValue}
          </p>
        ) : rowDensity === "comfortable" || rowDensity === "image" ? (
          <div className="flex flex-wrap items-center gap-2">
            {rowDensity === "comfortable" ? (
              <p className="text-muted-foreground truncate text-xs">
                {card.typeLine}
              </p>
            ) : null}
            {rowDensity === "comfortable" && card.manaCost ? (
              <ManaCost cost={card.manaCost} size="sm" />
            ) : null}
          </div>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {rowDensity !== "compact" ? (
            <Badge variant="secondary" className="font-mono">
              MV {card.manaValue}
            </Badge>
          ) : null}
          <TagChips roleTags={roleTags} synergyTags={synergyTags} />
        </div>

        {showPrice ? (
          <div
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <CardPriceDisplay
              cardId={item.cardId}
              foil={item.foil}
              showSource={rowDensity === "comfortable"}
              showTimestamp={rowDensity === "comfortable"}
            />
          </div>
        ) : null}

        {showReplacement ? (
          <div
            className="mt-1"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            <ReplacementLinkBadge
              replacementName={replacementName}
              onPick={onPickReplacement}
            />
          </div>
        ) : null}
      </div>
    </>
  );

  const chrome = cn(
    "border-border bg-card flex w-full items-center rounded-md border text-left shadow-sm transition-all",
    getDensityRowClass(rowDensity),
    selected && "border-primary bg-primary/10 border",
  );

  if (splitZoom) {
    return (
      <div
        data-testid={`deck-card-row-${item.id}`}
        data-density={rowDensity}
        aria-pressed={selected}
        className={chrome}
        onPointerDown={startLongPress}
        onPointerUp={clearLongPress}
        onPointerLeave={clearLongPress}
      >
        <button
          type="button"
          data-testid={`deck-card-row-zoom-${item.id}`}
          aria-label={`Zoom ${card.name}`}
          className="shrink-0 bg-transparent p-0"
          onClick={(event) => {
            event.stopPropagation();
            if (longPressFired.current) {
              longPressFired.current = false;
              return;
            }
            onZoom?.();
          }}
        >
          <LazyCardImage
            card={card}
            size={rowDensity === "image" ? "sm" : "xs"}
            priority={priorityImage || item.zone === "commander"}
            imagesEnabled={imagesEnabled}
            className="shrink-0"
          />
        </button>
        <button
          type="button"
          className="min-w-0 flex-1 bg-transparent text-left"
          onClick={handlePress}
        >
          {body}
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid={`deck-card-row-${item.id}`}
      data-density={rowDensity}
      aria-pressed={selected}
      onClick={handlePress}
      onPointerDown={startLongPress}
      onPointerUp={clearLongPress}
      onPointerLeave={clearLongPress}
      className={chrome}
    >
      {body}
    </button>
  );
}

export const DeckCardRow = memo(DeckCardRowComponent);
