"use client";

import { useMemo } from "react";

import { computeDeckStats } from "@/lib/deck/stats";
import type { DeckStats, StatsMode } from "@/lib/deck/stats";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useTags } from "@/lib/hooks/use-tags";

export function useDeckStats(
  deckId: string | undefined,
  mode: StatsMode = "current",
): {
  stats: DeckStats | undefined;
  isLoading: boolean;
  isEmpty: boolean;
} {
  const { deck, isLoading: deckLoading } = useDeck(deckId);
  const { cards, isLoading: cardsLoading } = useDeckCards(deckId);
  const { tags, isLoading: tagsLoading } = useTags();

  const isLoading = deckLoading || cardsLoading || tagsLoading;

  const stats = useMemo(() => {
    if (!deck) return undefined;
    return computeDeckStats({ deck, deckCards: cards, tags }, mode);
  }, [deck, cards, tags, mode]);

  const isEmpty = !isLoading && (cards.length === 0 || !deck);

  return { stats, isLoading, isEmpty };
}
