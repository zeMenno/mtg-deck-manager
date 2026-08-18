"use client";

import { DeckEmptyState } from "@/components/deck/deck-empty-state";
import { DeckListItem } from "@/components/deck/deck-list-item";
import type { Deck } from "@/types/deck";

type DeckListProps = {
  decks: Deck[];
  cardCounts?: Record<string, number>;
  onOpenActions: (deck: Deck) => void;
  onCreateClick?: () => void;
  loading?: boolean;
};

export function DeckList({
  decks,
  cardCounts,
  onOpenActions,
  onCreateClick,
  loading,
}: DeckListProps) {
  if (loading) {
    return (
      <p
        className="font-mono text-sm uppercase"
        data-testid="deck-list-loading"
      >
        Loading decks…
      </p>
    );
  }

  if (decks.length === 0) {
    return <DeckEmptyState onCreateClick={onCreateClick} />;
  }

  return (
    <ul className="flex flex-col gap-3" data-testid="deck-list">
      {decks.map((deck) => (
        <DeckListItem
          key={deck.id}
          deck={deck}
          cardCount={cardCounts?.[deck.id]}
          onOpenActions={onOpenActions}
        />
      ))}
    </ul>
  );
}
