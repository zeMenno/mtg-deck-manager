"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { useDatabase } from "@/components/providers/database-provider";
import { SettingsRepository } from "@/lib/db/repositories";
import {
  clearFilters,
  countActiveFilters,
  EMPTY_SEARCH_FILTERS,
  hasActiveFilters,
} from "@/lib/cards/search-filters";
import type { CardSearchFilters } from "@/types/card";

const PERSIST_MS = 300;

/**
 * Search filter state with Dexie persistence (`settings.searchFilters`).
 */
export function useSearchFilters() {
  const { ready } = useDatabase();
  const [filters, setFiltersState] =
    useState<CardSearchFilters>(EMPTY_SEARCH_FILTERS);
  const [hydrated, setHydrated] = useState(false);
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<CardSearchFilters | null>(null);

  useEffect(() => {
    if (!ready || hydrated) return;
    void new SettingsRepository().get("searchFilters").then((value) => {
      if (value && typeof value === "object") {
        setFiltersState(value as CardSearchFilters);
      }
      setHydrated(true);
    });
  }, [ready, hydrated]);

  const flush = useCallback(async () => {
    const next = pending.current;
    if (next === undefined) return;
    pending.current = undefined as unknown as null;
    await new SettingsRepository().set(
      "searchFilters",
      hasActiveFilters(next ?? {}) ? next : null,
    );
  }, []);

  const schedulePersist = useCallback(
    (next: CardSearchFilters | null) => {
      pending.current = next;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        void flush();
      }, PERSIST_MS);
    },
    [flush],
  );

  useEffect(() => {
    return () => {
      if (persistTimer.current) {
        clearTimeout(persistTimer.current);
        void flush();
      }
    };
  }, [flush]);

  const setFilters = useCallback(
    (next: CardSearchFilters) => {
      setFiltersState(next);
      schedulePersist(hasActiveFilters(next) ? next : null);
    },
    [schedulePersist],
  );

  const clear = useCallback(() => {
    setFiltersState(clearFilters());
    schedulePersist(null);
  }, [schedulePersist]);

  return {
    filters,
    setFilters,
    clear,
    activeCount: countActiveFilters(filters),
    hasFilters: hasActiveFilters(filters),
    hydrated,
  };
}
