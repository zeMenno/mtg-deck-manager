"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { DeckCardRow } from "@/components/deck/deck-card-row";
import { DeckZoneGroup } from "@/components/deck/deck-zone-group";
import { IMAGE_MODE_VIRTUALIZE_THRESHOLD } from "@/lib/display/constants";
import { estimateRowHeight } from "@/lib/display/density-classes";
import type { DisplayDensity, DeckCardZone, DeckFormat } from "@/types";
import type { Tag } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

const ZONE_ORDER: DeckCardZone[] = [
  "commander",
  "mainboard",
  "sideboard",
  "maybeboard",
];

type DeckCardListProps = {
  cards: DeckCardWithCard[];
  density?: DisplayDensity;
  imagesEnabled?: boolean;
  tagsById?: Map<string, Tag>;
  selectedIds?: string[];
  multiSelectMode?: boolean;
  deckFormat?: DeckFormat;
  onPress: (item: DeckCardWithCard) => void;
  onLongPress: (item: DeckCardWithCard) => void;
  groupByZone?: boolean;
};

export function DeckCardList({
  cards,
  density = "comfortable",
  imagesEnabled = true,
  tagsById,
  selectedIds = [],
  multiSelectMode,
  deckFormat,
  onPress,
  onLongPress,
  groupByZone = true,
}: DeckCardListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Phase 9: virtualize when image mode + long lists (flat, no zone headers).
  const useVirtual =
    density === "image" &&
    cards.length > IMAGE_MODE_VIRTUALIZE_THRESHOLD &&
    (!groupByZone || cards.length > IMAGE_MODE_VIRTUALIZE_THRESHOLD);

  const virtualizer = useVirtualizer({
    count: useVirtual ? cards.length : 0,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateRowHeight(density),
    overscan: 8,
  });

  const grouped = useMemo(() => {
    if (!groupByZone || useVirtual) return null;
    const map = new Map<DeckCardZone, DeckCardWithCard[]>();
    for (const zone of ZONE_ORDER) map.set(zone, []);
    for (const card of cards) {
      const list = map.get(card.zone) ?? [];
      list.push(card);
      map.set(card.zone, list);
    }
    return map;
  }, [cards, groupByZone, useVirtual]);

  function resolveTags(ids: string[]): Tag[] {
    if (!tagsById) return [];
    return ids
      .map((id) => tagsById.get(id))
      .filter((t): t is Tag => t !== undefined);
  }

  function renderRow(item: DeckCardWithCard) {
    return (
      <DeckCardRow
        key={item.id}
        item={item}
        density={density}
        imagesEnabled={imagesEnabled}
        selected={selectedIds.includes(item.id)}
        roleTags={resolveTags(item.roles)}
        synergyTags={resolveTags(item.synergies)}
        showPrice
        priorityImage={item.zone === "commander"}
        deckFormat={deckFormat}
        onPress={() => onPress(item)}
        onLongPress={() => onLongPress(item)}
      />
    );
  }

  if (cards.length === 0) {
    return (
      <p
        className="text-muted-foreground font-mono text-sm uppercase"
        data-testid="deck-card-list-empty"
      >
        No cards yet — add some to get started.
      </p>
    );
  }

  if (useVirtual) {
    return (
      <div
        ref={parentRef}
        className="h-[60dvh] overflow-auto"
        data-testid="deck-card-list"
        data-virtualized="true"
      >
        <div
          style={{
            height: virtualizer.getTotalSize(),
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = cards[virtualRow.index]!;
            return (
              <div
                key={item.id}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="pb-2"
              >
                {renderRow(item)}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="deck-card-list">
      {ZONE_ORDER.map((zone) => {
        const zoneCards = grouped?.get(zone) ?? [];
        if (zoneCards.length === 0) return null;
        return (
          <DeckZoneGroup
            key={zone}
            title={zone}
            count={zoneCards.reduce((s, c) => s + c.quantity, 0)}
          >
            {zoneCards.map((item) => renderRow(item))}
          </DeckZoneGroup>
        );
      })}
      {multiSelectMode ? (
        <p className="sr-only">Multi-select mode active</p>
      ) : null}
    </div>
  );
}
