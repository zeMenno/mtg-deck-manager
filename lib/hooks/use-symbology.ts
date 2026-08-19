"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import { SymbolRepository } from "@/lib/db/repositories/symbol-repository";
import { ensureSymbologyCached } from "@/lib/scryfall/symbology";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import type { MtgSymbol } from "@/types/card";

/**
 * Hydrate symbology once at app boot. Safe offline (uses Dexie cache).
 */
export function useSymbology() {
  const { ready } = useDatabase();
  const online = useOnlineStatus();

  const query = useQuery({
    queryKey: ["symbology", online ? "online" : "offline"],
    enabled: ready,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 7 * 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Map<string, MtgSymbol>> => {
      if (online) {
        await ensureSymbologyCached();
      }
      const rows = await new SymbolRepository().getAll();
      return new Map(rows.map((s) => [s.symbol, s]));
    },
  });

  return {
    symbols: query.data ?? new Map<string, MtgSymbol>(),
    isLoading: query.isLoading,
    isError: query.isError,
  };
}

/** Fire-and-forget boot hydration (no UI subscription required). */
export function useSymbologyBootstrap(): void {
  const { ready } = useDatabase();
  const online = useOnlineStatus();

  useEffect(() => {
    if (!ready || !online) return;
    void ensureSymbologyCached();
  }, [ready, online]);
}
