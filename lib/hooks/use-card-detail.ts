"use client";

import { useQuery } from "@tanstack/react-query";

import { CardRepository } from "@/lib/db/repositories";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  getCardById,
  normalizeScryfallCard,
  ScryfallNotFoundError,
} from "@/lib/scryfall";
import type { Card } from "@/types/card";

const STALE_DAYS = 7;

function isStale(card: Card, olderThanDays = STALE_DAYS): boolean {
  const ts = Date.parse(card.updatedAt);
  if (Number.isNaN(ts)) return true;
  return Date.now() - ts > olderThanDays * 24 * 60 * 60 * 1000;
}

export type UseCardDetailResult = {
  card: Card | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  fromCache: boolean;
};

/**
 * Lookup by Scryfall printing id. Prefers Dexie; refreshes when missing/stale.
 */
export function useCardDetail(
  cardId: string | null | undefined,
): UseCardDetailResult {
  const online = useOnlineStatus();
  const id = cardId?.trim() ?? "";

  const result = useQuery({
    queryKey: ["cards", "detail", id],
    enabled: id.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    retry: 1,
    queryFn: async (): Promise<{ card: Card; fromCache: boolean }> => {
      const repo = new CardRepository();
      const cached = await repo.getById(id);

      if (cached && (!online || !isStale(cached))) {
        return { card: cached, fromCache: true };
      }

      if (!online) {
        if (cached) return { card: cached, fromCache: true };
        throw new ScryfallNotFoundError(
          "Card not in local cache and device is offline.",
        );
      }

      const raw = await getCardById(id);
      const card = normalizeScryfallCard(raw);
      await repo.upsert(card);
      return { card, fromCache: false };
    },
  });

  return {
    card: result.data?.card,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error instanceof Error ? result.error : null,
    fromCache: result.data?.fromCache ?? false,
  };
}
