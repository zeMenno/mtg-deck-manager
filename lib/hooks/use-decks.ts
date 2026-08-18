"use client";

import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import { deckKeys, fetchDecks } from "@/lib/deck/deck-queries";
import type { Deck } from "@/types/deck";

/**
 * List decks (non-archived by default), favorites first, then updatedAt desc.
 */
export function useDecks(includeArchived = false): {
  decks: Deck[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const { ready } = useDatabase();

  const query = useQuery({
    queryKey: deckKeys.list(includeArchived),
    queryFn: () => fetchDecks(includeArchived),
    enabled: ready,
  });

  return {
    decks: query.data ?? [],
    isLoading: !ready || query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
    refetch: () => {
      void query.refetch();
    },
  };
}
