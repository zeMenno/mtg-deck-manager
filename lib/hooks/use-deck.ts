"use client";

import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import {
  deckKeys,
  fetchCurrentCardCount,
  fetchDeck,
} from "@/lib/deck/deck-queries";
import type { Deck } from "@/types/deck";

export function useDeck(deckId: string | undefined): {
  deck: Deck | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  cardCount: number;
} {
  const { ready } = useDatabase();
  const enabled = ready && Boolean(deckId);

  const deckQuery = useQuery({
    queryKey: deckKeys.detail(deckId ?? ""),
    queryFn: () => fetchDeck(deckId!),
    enabled,
  });

  const countQuery = useQuery({
    queryKey: [...deckKeys.detail(deckId ?? ""), "count"],
    queryFn: () => fetchCurrentCardCount(deckId!),
    enabled,
  });

  return {
    deck: deckQuery.data,
    isLoading: !ready || deckQuery.isLoading,
    isError: deckQuery.isError,
    error: deckQuery.error instanceof Error ? deckQuery.error : null,
    cardCount: countQuery.data ?? 0,
  };
}
