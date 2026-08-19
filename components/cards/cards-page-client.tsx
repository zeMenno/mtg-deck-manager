"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import { CardDetailSheet } from "@/components/cards/card-detail-sheet";
import { CardSearchFilterChips } from "@/components/cards/card-search-filter-chips";
import { CardSearchFiltersSheet } from "@/components/cards/card-search-filters-sheet";
import { CardSearchInput } from "@/components/cards/card-search-input";
import { CardSearchResults } from "@/components/cards/card-search-results";
import { AddToWishlistSheet } from "@/components/wishlist/add-to-wishlist-sheet";
import { useCardSearch } from "@/lib/hooks/use-card-search";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import { useSearchFilters } from "@/lib/hooks/use-search-filters";
import { useDeckUiStore } from "@/store/deck-ui-store";
import type { Card } from "@/types/card";

export function CardsPageClient() {
  const searchParams = useSearchParams();
  const deckIdParam = searchParams.get("deckId");
  const setActiveDeckIdForSearch = useDeckUiStore(
    (s) => s.setActiveDeckIdForSearch,
  );
  const { imagesEnabled, effectiveDensity } = useDisplayPreferences();
  const {
    filters,
    setFilters,
    clear: clearFilters,
    activeCount,
    hasFilters,
  } = useSearchFilters();

  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Card | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [wishlistCard, setWishlistCard] = useState<Card | null>(null);
  const [wishlistOpen, setWishlistOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCardSearch(debouncedQuery, filters);

  useEffect(() => {
    setActiveDeckIdForSearch(deckIdParam);
    return () => setActiveDeckIdForSearch(null);
  }, [deckIdParam, setActiveDeckIdForSearch]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !(event.target instanceof HTMLInputElement) &&
        !(event.target instanceof HTMLTextAreaElement)
      ) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onDebouncedChange = useCallback((value: string) => {
    setDebouncedQuery(value);
  }, []);

  const onSelect = useCallback((card: Card) => {
    setSelected(card);
    setSheetOpen(true);
  }, []);

  const onAddToWishlist = useCallback((card: Card) => {
    setWishlistCard(card);
    setWishlistOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-background sticky top-[calc(env(safe-area-inset-top,0px)+3.5rem)] z-30 -mx-4 border-b-2 border-transparent px-4 py-2">
        <h1 className="mb-3 text-2xl font-black uppercase">Search Cards</h1>
        {deckIdParam ? (
          <p
            className="text-muted-foreground mb-2 font-mono text-xs uppercase"
            data-testid="cards-deck-context"
          >
            Adding to deck
          </p>
        ) : null}
        <CardSearchInput
          value={inputValue}
          onChange={setInputValue}
          onDebouncedChange={onDebouncedChange}
          isLoading={search.isFetching}
          inputRef={inputRef}
          filterCount={activeCount}
          onOpenFilters={() => setFiltersOpen(true)}
        />
        <div className="mt-2">
          <CardSearchFilterChips
            filters={filters}
            onChange={setFilters}
            onClearAll={clearFilters}
          />
        </div>
      </div>

      <CardSearchResults
        query={debouncedQuery}
        hasFilters={hasFilters}
        cards={search.cards}
        isLoading={search.isLoading}
        fromCache={search.fromCache}
        online={search.online}
        errorKind={search.errorKind}
        errorMessage={search.error?.message}
        onSelect={onSelect}
        onAddToWishlist={onAddToWishlist}
        onClearFilters={clearFilters}
        imagesEnabled={imagesEnabled && effectiveDensity !== "compact"}
      />

      <CardSearchFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        value={filters}
        onApply={setFilters}
        onClear={clearFilters}
      />

      <CardDetailSheet
        card={selected}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        deckId={deckIdParam ?? undefined}
      />

      <AddToWishlistSheet
        card={wishlistCard}
        open={wishlistOpen}
        onOpenChange={setWishlistOpen}
        defaultDeckId={deckIdParam ?? undefined}
      />
    </div>
  );
}
