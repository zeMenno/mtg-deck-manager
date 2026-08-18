"use client";

import { useMemo, useState } from "react";

import {
  buildProjectedDeckList,
  computeProjectedCounts,
  validateBeforeApply,
} from "@/lib/deck/changes";
import type {
  ApplyValidation,
  ProjectedDeckViewModel,
} from "@/lib/deck/changes";
import type { ProjectedDeckCounts } from "@/lib/deck/changes/projected-deck";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";

export function useProjectedDeck(deckId: string | undefined): {
  rows: ProjectedDeckViewModel[];
  counts: ProjectedDeckCounts;
  validation: ApplyValidation | undefined;
  changesOnly: boolean;
  setChangesOnly: (value: boolean) => void;
  isLoading: boolean;
} {
  const { deck, isLoading: deckLoading } = useDeck(deckId);
  const { cards, isLoading: cardsLoading } = useDeckCards(deckId);
  const [changesOnly, setChangesOnly] = useState(false);

  const isLoading = deckLoading || cardsLoading;

  const counts = useMemo(() => computeProjectedCounts(cards), [cards]);

  const rows = useMemo(() => {
    if (!deck) return [];
    return buildProjectedDeckList(
      deck,
      cards,
      cards.map((c) => c.card),
      {
        changesOnly,
      },
    );
  }, [deck, cards, changesOnly]);

  const validation = useMemo(() => {
    if (!deck) return undefined;
    return validateBeforeApply({
      deck,
      deckCards: cards,
      cards,
    });
  }, [deck, cards]);

  return {
    rows,
    counts,
    validation,
    changesOnly,
    setChangesOnly,
    isLoading,
  };
}
