"use client";

import { DeckCardTile } from "@/components/deck/deck-card-tile";
import { DeckZoneGroup } from "@/components/deck/deck-zone-group";
import { DECK_CARD_ZONES } from "@/lib/deck/constants";
import { groupDeckCardsByZone } from "@/lib/deck/group-cards-by-zone";
import { GRID_COLUMNS_CLASS } from "@/lib/display/grid-classes";
import type { DeckFormat } from "@/types";
import type { Tag } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

type DeckCardGridProps = {
  cards: DeckCardWithCard[];
  imagesEnabled?: boolean;
  tagsById?: Map<string, Tag>;
  selectedIds?: string[];
  multiSelectMode?: boolean;
  deckFormat?: DeckFormat;
  hoverPreviewEnabled?: boolean;
  zoomOpen?: boolean;
  onPress: (item: DeckCardWithCard) => void;
  onLongPress: (item: DeckCardWithCard) => void;
  onZoom: (item: DeckCardWithCard) => void;
};

export function DeckCardGrid({
  cards,
  imagesEnabled = true,
  tagsById,
  selectedIds = [],
  multiSelectMode,
  deckFormat,
  hoverPreviewEnabled = true,
  zoomOpen = false,
  onPress,
  onLongPress,
  onZoom,
}: DeckCardGridProps) {
  const grouped = groupDeckCardsByZone(cards);

  function resolveTags(ids: string[]): Tag[] {
    if (!tagsById) return [];
    return ids
      .map((id) => tagsById.get(id))
      .filter((t): t is Tag => t !== undefined);
  }

  return (
    <div className="flex flex-col gap-6" data-testid="deck-card-grid">
      {DECK_CARD_ZONES.map((zone) => {
        const zoneCards = grouped.get(zone) ?? [];
        if (zoneCards.length === 0) return null;
        return (
          <DeckZoneGroup
            key={zone}
            title={zone}
            count={zoneCards.reduce((s, c) => s + c.quantity, 0)}
          >
            <div className={GRID_COLUMNS_CLASS}>
              {zoneCards.map((item) => (
                <DeckCardTile
                  key={item.id}
                  item={item}
                  imagesEnabled={imagesEnabled}
                  selected={selectedIds.includes(item.id)}
                  multiSelectMode={multiSelectMode}
                  roleTags={resolveTags(item.roles)}
                  synergyTags={resolveTags(item.synergies)}
                  deckFormat={deckFormat}
                  hoverPreviewEnabled={hoverPreviewEnabled}
                  zoomOpen={zoomOpen}
                  onPress={() => onPress(item)}
                  onLongPress={() => onLongPress(item)}
                  onZoom={() => onZoom(item)}
                />
              ))}
            </div>
          </DeckZoneGroup>
        );
      })}
    </div>
  );
}
