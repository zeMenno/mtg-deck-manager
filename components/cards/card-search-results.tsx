"use client";

import { CardResultRow } from "@/components/cards/card-result-row";
import { EmptyState } from "@/components/shared/empty-state";
import { OfflineSearchBanner } from "@/components/shared/offline-search-banner";
import { CardSearchSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import type { CardSearchErrorKind } from "@/lib/hooks/use-card-search";
import type { Card } from "@/types/card";
import { Search } from "lucide-react";

type CardSearchResultsProps = {
  query: string;
  hasFilters?: boolean;
  cards: Card[];
  isLoading: boolean;
  fromCache: boolean;
  online: boolean;
  errorKind: CardSearchErrorKind | null;
  errorMessage?: string | null;
  onSelect: (card: Card) => void;
  onAddToWishlist?: (card: Card) => void;
  onClearFilters?: () => void;
  imagesEnabled?: boolean;
};

function errorCopy(kind: CardSearchErrorKind | null): string | null {
  switch (kind) {
    case "rate_limit":
      return "Too many requests. Try again in a moment.";
    case "not_found":
      return "Card not found.";
    case "offline":
      return "Searching cached cards only.";
    case "network":
      return "Could not reach Scryfall. Showing cache if available.";
    case "unknown":
      return "Something went wrong searching cards.";
    default:
      return null;
  }
}

export function CardSearchResults({
  query,
  hasFilters = false,
  cards,
  isLoading,
  fromCache,
  online,
  errorKind,
  errorMessage,
  onSelect,
  onAddToWishlist,
  onClearFilters,
  imagesEnabled = true,
}: CardSearchResultsProps) {
  const trimmed = query.trim();
  const canSearch = trimmed.length >= 2 || hasFilters;

  if (!canSearch) {
    return (
      <EmptyState
        icon={Search}
        title="Type at least 2 characters"
        description="Search Scryfall by card name, or open Filters to search by color, type, and more."
      />
    );
  }

  const banner =
    !online || fromCache ? (
      <OfflineSearchBanner
        message={
          !online
            ? hasFilters
              ? "Searching cached cards only — filters apply to local cache."
              : "Searching cached cards only."
            : "Showing cached results (network unavailable)."
        }
      />
    ) : null;

  const errText = errorMessage ?? errorCopy(errorKind);

  if (isLoading && cards.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {banner}
        <CardSearchSkeleton />
      </div>
    );
  }

  if (errText && cards.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {banner}
        <EmptyState title="Search failed" description={errText} />
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {banner}
        <EmptyState
          icon={Search}
          title="No cards match"
          description={
            hasFilters
              ? "Try clearing filters or broadening your search."
              : `Nothing matched “${trimmed}”. Try a different name.`
          }
        />
        {hasFilters && onClearFilters ? (
          <Button
            type="button"
            variant="outline"
            className="mx-auto w-fit"
            data-testid="search-empty-clear-filters"
            onClick={onClearFilters}
          >
            Clear filters
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {banner}
      <ul className="flex flex-col gap-2" data-testid="card-search-results">
        {cards.map((card) => (
          <li key={card.id}>
            <CardResultRow
              card={card}
              onSelect={onSelect}
              onAddToWishlist={onAddToWishlist}
              imagesEnabled={imagesEnabled}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
