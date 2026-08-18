"use client";

import { useMemo } from "react";

import { computeChangeSummary } from "@/lib/deck/changes";
import type { DeckChangeSummary } from "@/lib/deck/changes";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";

export function useDeckChanges(deckId: string | undefined): {
  summary: DeckChangeSummary;
  isLoading: boolean;
} {
  const { cards, isLoading } = useDeckCards(deckId);

  const summary = useMemo(() => computeChangeSummary(cards), [cards]);

  return { summary, isLoading };
}
