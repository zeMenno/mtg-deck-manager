"use client";

import { use, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

import { CardDetailSheet } from "@/components/cards/card-detail-sheet";
import { DeckAddCardSheet } from "@/components/deck/deck-add-card-sheet";
import { DeckCardActionsSheet } from "@/components/deck/deck-card-actions-sheet";
import { DeckCardList } from "@/components/deck/deck-card-list";
import { DeckListToolbar } from "@/components/deck/deck-list-toolbar";
import { DeckTabs } from "@/components/navigation/deck-tabs";
import { MultiSelectBar } from "@/components/shared/multi-select-bar";
import { Button } from "@/components/ui/button";
import type { DeckCardFilters } from "@/lib/deck/deck-queries";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import {
  useBulkRemove,
  useBulkSetStatus,
} from "@/lib/hooks/use-deck-mutations";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import { useTags } from "@/lib/hooks/use-tags";
import { useDeckUiStore } from "@/store/deck-ui-store";
import type { DeckCardStatus } from "@/types";
import type { Tag } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

const STATUS_FILTERS: Array<DeckCardStatus | "all"> = [
  "all",
  "current",
  "add",
  "cut",
  "consider",
];

type DeckCardsClientProps = {
  params: Promise<{ deckId: string }>;
};

export function DeckCardsClient({ params }: DeckCardsClientProps) {
  const { deckId } = use(params);
  const searchParams = useSearchParams();
  const { deck, isLoading: deckLoading } = useDeck(deckId);
  const { imagesEnabled, effectiveDensity } = useDisplayPreferences();

  const statusParam = searchParams.get("status");
  const initialStatus =
    statusParam && STATUS_FILTERS.includes(statusParam as DeckCardStatus)
      ? (statusParam as DeckCardStatus)
      : "all";

  const [statusFilter, setStatusFilter] = useState<DeckCardStatus | "all">(
    initialStatus,
  );
  const [sort, setSort] =
    useState<NonNullable<DeckCardFilters["sort"]>>("name");
  const [addOpen, setAddOpen] = useState(false);
  const [activeItem, setActiveItem] = useState<DeckCardWithCard | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const multiSelectMode = useDeckUiStore((s) => s.multiSelectMode);
  const selectedIds = useDeckUiStore((s) => s.selectedDeckCardIds);
  const enterMultiSelect = useDeckUiStore((s) => s.enterMultiSelect);
  const exitMultiSelect = useDeckUiStore((s) => s.exitMultiSelect);
  const toggleSelected = useDeckUiStore((s) => s.toggleSelectedDeckCardId);

  const bulkSetStatus = useBulkSetStatus();
  const bulkRemove = useBulkRemove();

  const filters: DeckCardFilters = useMemo(
    () => ({ status: statusFilter, sort }),
    [statusFilter, sort],
  );

  const { cards, isLoading } = useDeckCards(deckId, filters);
  const { tags } = useTags();

  const tagsById = useMemo(() => {
    const map = new Map<string, Tag>();
    for (const tag of tags) map.set(tag.id, tag);
    return map;
  }, [tags]);

  if (deckLoading) {
    return <p className="font-mono text-sm uppercase">Loading…</p>;
  }

  if (!deck) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-bold">Deck not found</p>
        <Button asChild variant="outline">
          <Link href="/decks">Back to decks</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back">
          <Link href={`/decks/${deckId}`}>
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-black uppercase">{deck.name}</h1>
          <p className="text-muted-foreground font-mono text-xs uppercase">
            Cards
          </p>
        </div>
        <Button
          type="button"
          size="icon"
          aria-label="Add card"
          data-testid="deck-add-card-btn"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="size-5" />
        </Button>
      </div>

      <DeckTabs deckId={deckId} />

      <div className="flex flex-wrap gap-2" data-testid="status-filter-chips">
        {STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            type="button"
            size="sm"
            variant={statusFilter === status ? "default" : "outline"}
            data-testid={`filter-status-${status}`}
            onClick={() => setStatusFilter(status)}
          >
            {status}
          </Button>
        ))}
      </div>

      <div className="flex gap-2">
        <label className="sr-only" htmlFor="deck-sort">
          Sort
        </label>
        <select
          id="deck-sort"
          data-testid="deck-sort-select"
          value={sort}
          onChange={(e) =>
            setSort(e.target.value as NonNullable<DeckCardFilters["sort"]>)
          }
          className="border-border bg-background h-11 flex-1 border-2 px-3 font-bold uppercase"
        >
          <option value="name">Name</option>
          <option value="mv">Mana value</option>
          <option value="type">Type</option>
          <option value="status">Status</option>
          <option value="price">Price</option>
        </select>
      </div>

      <DeckListToolbar />

      {isLoading ? (
        <p className="font-mono text-sm uppercase">Loading cards…</p>
      ) : (
        <DeckCardList
          cards={cards}
          density={effectiveDensity}
          imagesEnabled={imagesEnabled}
          tagsById={tagsById}
          selectedIds={selectedIds}
          multiSelectMode={multiSelectMode}
          onPress={(item) => {
            if (multiSelectMode) {
              toggleSelected(item.id);
              return;
            }
            setActiveItem(item);
            setActionsOpen(true);
          }}
          onLongPress={(item) => {
            enterMultiSelect(item.id);
            toast.message("Multi-select on");
          }}
        />
      )}

      {multiSelectMode ? (
        <MultiSelectBar
          count={selectedIds.length}
          onMarkAdd={() => {
            void bulkSetStatus
              .mutateAsync({
                deckCardIds: selectedIds,
                status: "add",
                deckId,
              })
              .then(() => {
                toast.success("Marked ADD");
                exitMultiSelect();
              });
          }}
          onMarkCut={() => {
            void bulkSetStatus
              .mutateAsync({
                deckCardIds: selectedIds,
                status: "cut",
                deckId,
              })
              .then(() => {
                toast.success("Marked CUT");
                exitMultiSelect();
              });
          }}
          onRemove={() => {
            void bulkRemove
              .mutateAsync({ deckCardIds: selectedIds, deckId })
              .then(() => {
                toast.success("Removed");
                exitMultiSelect();
              });
          }}
          onDone={exitMultiSelect}
        />
      ) : null}

      <DeckAddCardSheet
        deckId={deckId}
        open={addOpen}
        onOpenChange={setAddOpen}
        imagesEnabled={imagesEnabled}
      />

      <DeckCardActionsSheet
        item={activeItem}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        onViewDetails={() => {
          setActionsOpen(false);
          setDetailOpen(true);
        }}
      />

      <CardDetailSheet
        card={activeItem?.card ?? null}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        deckId={deckId}
      />
    </div>
  );
}
