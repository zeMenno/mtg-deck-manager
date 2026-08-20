"use client";

import { useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { CardZoomOverlay } from "@/components/cards/card-zoom-overlay";
import { DeckCardGrid } from "@/components/deck/deck-card-grid";
import { DeckCardRow } from "@/components/deck/deck-card-row";
import { DeckZoneGroup } from "@/components/deck/deck-zone-group";
import { DECK_CARD_ZONES } from "@/lib/deck/constants";
import { groupDeckCardsByZone } from "@/lib/deck/group-cards-by-zone";
import { IMAGE_MODE_VIRTUALIZE_THRESHOLD } from "@/lib/display/constants";
import { estimateRowHeight } from "@/lib/display/density-classes";
import { useCardZoom } from "@/lib/hooks/use-card-zoom";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import type { DisplayDensity, DeckFormat } from "@/types";
import type { Tag } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

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
  onOpenDetails?: (item: DeckCardWithCard) => void;
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
  onOpenDetails,
  groupByZone = true,
}: DeckCardListProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const zoom = useCardZoom();
  const { tapImageOpensZoom, hoverPreview } = useDisplayPreferences();
  const detailsItem = useRef<DeckCardWithCard | null>(null);

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
    return groupDeckCardsByZone(cards);
  }, [cards, groupByZone, useVirtual]);

  function resolveTags(ids: string[]): Tag[] {
    if (!tagsById) return [];
    return ids
      .map((id) => tagsById.get(id))
      .filter((t): t is Tag => t !== undefined);
  }

  function openZoom(item: DeckCardWithCard) {
    if (!imagesEnabled || multiSelectMode) return;
    detailsItem.current = item;
    zoom.openZoom(item.card, item.id);
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
        onZoom={
          tapImageOpensZoom && imagesEnabled && !multiSelectMode
            ? () => openZoom(item)
            : undefined
        }
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

  const overlay = (
    <CardZoomOverlay
      card={zoom.card}
      open={zoom.open}
      onOpenChange={(next) => {
        if (!next) zoom.closeZoom();
      }}
      imagesEnabled={imagesEnabled}
      onOpenDetails={
        onOpenDetails
          ? () => {
              const item = detailsItem.current;
              zoom.closeZoom();
              if (item) onOpenDetails(item);
            }
          : undefined
      }
    />
  );

  if (density === "grid") {
    return (
      <>
        <DeckCardGrid
          cards={cards}
          imagesEnabled={imagesEnabled}
          tagsById={tagsById}
          selectedIds={selectedIds}
          multiSelectMode={multiSelectMode}
          deckFormat={deckFormat}
          hoverPreviewEnabled={hoverPreview && !zoom.open}
          zoomOpen={zoom.open}
          onPress={onPress}
          onLongPress={onLongPress}
          onZoom={openZoom}
        />
        {overlay}
      </>
    );
  }

  if (useVirtual) {
    return (
      <>
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
        {overlay}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6" data-testid="deck-card-list">
        {DECK_CARD_ZONES.map((zone) => {
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
      {overlay}
    </>
  );
}
