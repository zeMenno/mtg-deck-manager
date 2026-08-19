/**
 * Scryfall symbology fetch + Dexie cache (Phase 17).
 */

import { SymbolRepository } from "@/lib/db/repositories/symbol-repository";
import { nowIso } from "@/lib/db/ids";
import { scryfallFetch } from "@/lib/scryfall/client";
import { symbologyUrl } from "@/lib/scryfall/endpoints";
import type { MtgSymbol } from "@/types/card";

type ScryfallCardSymbol = {
  object?: string;
  symbol: string;
  svg_uri?: string;
  english?: string;
  represents_mana?: boolean;
  colors?: string[];
};

type ScryfallSymbologyList = {
  object: "list";
  data: ScryfallCardSymbol[];
};

export function normalizeSymbologySymbol(
  raw: ScryfallCardSymbol,
  updatedAt = nowIso(),
): MtgSymbol | null {
  if (!raw.symbol || !raw.svg_uri) return null;
  return {
    symbol: raw.symbol,
    svgUri: raw.svg_uri,
    english: raw.english ?? raw.symbol,
    representsMana: Boolean(raw.represents_mana),
    colors: raw.colors ?? [],
    updatedAt,
  };
}

export async function fetchSymbology(): Promise<MtgSymbol[]> {
  const list = await scryfallFetch<ScryfallSymbologyList>(symbologyUrl());
  const stamp = nowIso();
  return list.data
    .map((row) => normalizeSymbologySymbol(row, stamp))
    .filter((row): row is MtgSymbol => row != null);
}

/**
 * Refresh Dexie symbology when empty or older than 30 days.
 * Fails silently when offline / network errors — callers use degradation ladder.
 */
export async function ensureSymbologyCached(
  repo = new SymbolRepository(),
): Promise<{ refreshed: boolean; count: number }> {
  const stale = await repo.isStale();
  if (!stale) {
    return { refreshed: false, count: await repo.count() };
  }
  try {
    const symbols = await fetchSymbology();
    await repo.bulkUpsert(symbols);
    return { refreshed: true, count: symbols.length };
  } catch {
    return { refreshed: false, count: await repo.count() };
  }
}
