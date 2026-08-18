/**
 * Resolve imported card names via Scryfall fuzzy search with throttling.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories";
import { getCardNamed, ScryfallNotFoundError } from "@/lib/scryfall/client";
import { normalizeScryfallCard } from "@/lib/scryfall/normalize";
import type { Card } from "@/types/card";

export type ResolveProgress = {
  resolved: number;
  failed: number;
  total: number;
  currentName?: string;
};

export type ResolveImportCardsOptions = {
  database?: DeckBuilderDatabase;
  onProgress?: (progress: ResolveProgress) => void;
  /** Inject named lookup for tests. */
  lookup?: (
    name: string,
    opts?: { set?: string; fuzzy?: boolean },
  ) => Promise<Card | null>;
};

export type ResolveImportCardsResult = {
  byName: Map<string, Card>;
  unresolved: string[];
};

async function defaultLookup(
  name: string,
  opts?: { set?: string; fuzzy?: boolean },
): Promise<Card | null> {
  try {
    const raw = await getCardNamed(name, {
      fuzzy: opts?.fuzzy !== false,
      set: opts?.set,
    });
    return normalizeScryfallCard(raw);
  } catch (err) {
    if (err instanceof ScryfallNotFoundError) return null;
    throw err;
  }
}

/**
 * Resolve unique card names to local Card rows (cached in Dexie).
 * Failures are collected rather than aborting the whole import.
 */
export async function resolveImportCards(
  names: Array<{ name: string; setCode?: string }>,
  options: ResolveImportCardsOptions = {},
): Promise<ResolveImportCardsResult> {
  const database = options.database ?? getDatabase();
  const cards = new CardRepository(database);
  const lookup = options.lookup ?? defaultLookup;

  const unique = new Map<string, { name: string; setCode?: string }>();
  for (const entry of names) {
    const key = `${entry.name.toLowerCase()}|${entry.setCode?.toLowerCase() ?? ""}`;
    if (!unique.has(key)) unique.set(key, entry);
  }

  const byName = new Map<string, Card>();
  const unresolved: string[] = [];
  let resolved = 0;
  let failed = 0;
  const total = unique.size;

  for (const entry of unique.values()) {
    options.onProgress?.({
      resolved,
      failed,
      total,
      currentName: entry.name,
    });

    // Local cache first (exact name, case-insensitive).
    const localHits = await cards.searchLocal(entry.name, 5);
    const exact = localHits.find(
      (c) => c.name.toLowerCase() === entry.name.toLowerCase(),
    );
    if (exact) {
      byName.set(entry.name.toLowerCase(), exact);
      resolved += 1;
      continue;
    }

    try {
      const card = await lookup(entry.name, {
        set: entry.setCode,
        fuzzy: true,
      });
      if (!card) {
        unresolved.push(entry.name);
        failed += 1;
        continue;
      }
      await cards.upsert(card);
      byName.set(entry.name.toLowerCase(), card);
      resolved += 1;
    } catch {
      unresolved.push(entry.name);
      failed += 1;
    }
  }

  options.onProgress?.({ resolved, failed, total });
  return { byName, unresolved };
}
