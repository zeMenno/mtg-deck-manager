"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

import { CardRepository } from "@/lib/db/repositories";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  ScryfallError,
  ScryfallNotFoundError,
  ScryfallRateLimitError,
  normalizeScryfallCard,
  searchCards,
} from "@/lib/scryfall";
import type { Card } from "@/types/card";

export type CardSearchErrorKind =
  "offline" | "rate_limit" | "not_found" | "network" | "unknown";

export type UseCardSearchResult = {
  cards: Card[];
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  errorKind: CardSearchErrorKind | null;
  /** True when results came from Dexie because the device is offline. */
  fromCache: boolean;
  online: boolean;
};

function classifySearchError(err: unknown): CardSearchErrorKind {
  if (err instanceof ScryfallRateLimitError) return "rate_limit";
  if (err instanceof ScryfallNotFoundError) return "not_found";
  if (err instanceof ScryfallError) return "network";
  return "unknown";
}

async function searchRemoteAndCache(query: string): Promise<Card[]> {
  const result = await searchCards(query, { unique: "cards" });
  const cards = result.data.map(normalizeScryfallCard);
  const repo = new CardRepository();
  await repo.bulkUpsert(cards);

  // Best-effort appMeta stamp (non-fatal if table write fails).
  try {
    const { getDatabase } = await import("@/lib/db/database");
    const { nowIso } = await import("@/lib/db/ids");
    await getDatabase().appMeta.put({
      key: "scryfall.lastSyncAt",
      value: nowIso(),
      updatedAt: nowIso(),
    });
  } catch {
    // ignore
  }

  return cards;
}

/**
 * Debounced query is expected from the caller (UI). Enabled when `query.length >= 2`.
 */
export function useCardSearch(query: string): UseCardSearchResult {
  const online = useOnlineStatus();
  const trimmed = query.trim();
  const enabled = trimmed.length >= 2;

  const result = useQuery({
    queryKey: ["cards", "search", trimmed, online ? "online" : "offline"],
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
    queryFn: async (): Promise<{ cards: Card[]; fromCache: boolean }> => {
      if (!online) {
        const cards = await new CardRepository().searchLocal(trimmed);
        return { cards, fromCache: true };
      }
      try {
        const cards = await searchRemoteAndCache(trimmed);
        return { cards, fromCache: false };
      } catch (err) {
        // Never block UX if local cache has matches.
        const local = await new CardRepository().searchLocal(trimmed);
        if (local.length > 0) {
          return { cards: local, fromCache: true };
        }
        throw err;
      }
    },
  });

  const payload = result.data;
  const error = result.error instanceof Error ? result.error : null;

  return {
    cards: payload?.cards ?? [],
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError && (payload?.cards.length ?? 0) === 0,
    error,
    errorKind: error ? classifySearchError(error) : null,
    fromCache: payload?.fromCache ?? !online,
    online,
  };
}
