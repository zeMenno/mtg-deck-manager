"use client";

import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import {
  deckKeys,
  fetchDeckCards,
  type DeckCardFilters,
} from "@/lib/deck/deck-queries";
import type { DeckCardWithCard } from "@/types/deck";

export function useDeckCards(
  deckId: string | undefined,
  filters: DeckCardFilters = {},
): {
  cards: DeckCardWithCard[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { ready } = useDatabase();
  const enabled = ready && Boolean(deckId);

  const query = useQuery({
    queryKey: deckKeys.cardsFiltered(deckId ?? "", filters),
    queryFn: () => fetchDeckCards(deckId!, filters),
    enabled,
  });

  return {
    cards: query.data ?? [],
    isLoading: !ready || query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
