"use client";

import { memo } from "react";

import { LazyCardImage } from "@/components/cards/lazy-card-image";
import { CardPriceDisplay } from "@/components/cards/card-price";
import { ReplacementLinkBadge } from "@/components/changes/replacement-link-badge";
import { DeckStatusBadge } from "@/components/deck/deck-status-badge";
import { Badge } from "@/components/ui/badge";
import {
  getDensityNameClass,
  getDensityRowClass,
} from "@/lib/display/density-classes";
import { cn } from "@/lib/utils";
import type { DisplayDensity } from "@/types";
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
  onPress?: () => void;
  onLongPress?: () => void;
  onPickReplacement?: () => void;
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
  onPress,
  onLongPress,
  onPickReplacement,
}: DeckCardRowProps) {
  const { card, quantity, status } = item;
  const showThumb =
    imagesEnabled && (density === "comfortable" || density === "image");
  const showReplacement =
    Boolean(replacementName) ||
    (Boolean(onPickReplacement) && (status === "add" || status === "cut"));

  let longPressTimer: ReturnType<typeof setTimeout> | undefined;

  return (
    <button
      type="button"
      data-testid={`deck-card-row-${item.id}`}
      data-density={density}
      aria-pressed={selected}
      onClick={onPress}
      onPointerDown={() => {
        if (!onLongPress) return;
        longPressTimer = setTimeout(() => onLongPress(), 450);
      }}
      onPointerUp={() => {
        if (longPressTimer) clearTimeout(longPressTimer);
      }}
      onPointerLeave={() => {
        if (longPressTimer) clearTimeout(longPressTimer);
      }}
      className={cn(
        "border-border bg-card shadow-brutal-sm flex w-full items-center border-2 text-left transition-all",
        getDensityRowClass(density),
        selected && "bg-primary/10 ring-primary ring-2",
      )}
    >
      {showThumb ? (
        <LazyCardImage
          card={card}
          size={density === "image" ? "sm" : "xs"}
          priority={priorityImage || item.zone === "commander"}
          imagesEnabled={imagesEnabled}
          className="shrink-0"
        />
      ) : null}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <span className={getDensityNameClass(density)}>
            {quantity > 1 ? `${quantity}× ` : null}
            {card.name}
          </span>
          <DeckStatusBadge status={status} />
        </div>

        {density === "compact" ? (
          <p className="text-muted-foreground truncate text-xs">
            {card.typeLine}
            {card.typeLine ? " · " : null}
            MV {card.manaValue}
          </p>
        ) : density === "comfortable" ? (
          <p className="text-muted-foreground truncate text-xs">
            {card.typeLine}
          </p>
        ) : null}

        <div className="mt-1 flex flex-wrap items-center gap-1">
          {density !== "compact" ? (
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
              showSource={density === "comfortable"}
              showTimestamp={density === "comfortable"}
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
    </button>
  );
}

export const DeckCardRow = memo(DeckCardRowComponent);
