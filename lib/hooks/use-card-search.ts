"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";

import {
  applyLocalFilters,
  buildScryfallQuery,
  filtersQueryKey,
  hasActiveFilters,
} from "@/lib/cards/search-filters";
import { CardRepository } from "@/lib/db/repositories";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import {
  ScryfallError,
  ScryfallNotFoundError,
  ScryfallRateLimitError,
  normalizeScryfallCard,
  searchCards,
} from "@/lib/scryfall";
import type { Card, CardSearchFilters } from "@/types/card";

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
 * Debounced query is expected from the caller (UI).
 * Enabled when text length >= 2 OR any filter is active.
 */
export function useCardSearch(
  query: string,
  filters: CardSearchFilters = {},
): UseCardSearchResult {
  const online = useOnlineStatus();
  const trimmed = query.trim();
  const filtersActive = hasActiveFilters(filters);
  const enabled = trimmed.length >= 2 || filtersActive;
  const scryfallQuery = buildScryfallQuery(trimmed, filters);
  const filterKey = filtersQueryKey(filters);

  const result = useQuery({
    queryKey: [
      "cards",
      "search",
      trimmed,
      filterKey,
      online ? "online" : "offline",
    ],
    enabled,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    placeholderData: keepPreviousData,
    retry: 1,
    queryFn: async (): Promise<{ cards: Card[]; fromCache: boolean }> => {
      if (!online) {
        const local = await new CardRepository().searchLocal(
          trimmed.length >= 1 ? trimmed : "",
        );
        // Empty text + filters: scan more cards from Dexie
        const base =
          trimmed.length >= 1
            ? local
            : await new CardRepository().searchLocal("");
        // When query is empty, searchLocal("") may return nothing useful —
        // fall back to a broader local pull via first page of all cards.
        let pool = base;
        if (trimmed.length < 1) {
          const { getDatabase } = await import("@/lib/db/database");
          pool = await getDatabase().cards.limit(200).toArray();
        }
        return {
          cards: applyLocalFilters(pool, filters),
          fromCache: true,
        };
      }
      try {
        const remoteQuery =
          scryfallQuery.trim().length > 0 ? scryfallQuery : "*";
        const cards = await searchRemoteAndCache(remoteQuery);
        // Remote already applied Scryfall filters; still run local for safety
        // when filters-only used a broad query.
        return {
          cards: filtersActive ? applyLocalFilters(cards, filters) : cards,
          fromCache: false,
        };
      } catch (err) {
        const local = await new CardRepository().searchLocal(
          trimmed.length >= 1 ? trimmed : "",
        );
        let pool = local;
        if (trimmed.length < 1) {
          const { getDatabase } = await import("@/lib/db/database");
          pool = await getDatabase().cards.limit(200).toArray();
        }
        const filtered = applyLocalFilters(pool, filters);
        if (filtered.length > 0) {
          return { cards: filtered, fromCache: true };
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
