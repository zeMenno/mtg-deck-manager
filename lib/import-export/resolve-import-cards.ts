/**
 * Resolve imported card names (and printings) via Scryfall with throttling.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories";
import {
  getCardBySetCollector,
  getCardNamed,
  ScryfallNotFoundError,
} from "@/lib/scryfall/client";
import { normalizeScryfallCard } from "@/lib/scryfall/normalize";
import type { Card } from "@/types/card";

export type ResolveProgress = {
  resolved: number;
  failed: number;
  total: number;
  currentName?: string;
};

export type ImportCardRef = {
  name: string;
  setCode?: string;
  collectorNumber?: string;
};

export type ResolveImportLookup = (
  name: string,
  opts?: { set?: string; fuzzy?: boolean; collectorNumber?: string },
) => Promise<Card | null>;

export type ResolveImportCardsOptions = {
  database?: DeckBuilderDatabase;
  onProgress?: (progress: ResolveProgress) => void;
  /** Inject named / printing lookup for tests. */
  lookup?: ResolveImportLookup;
};

export type ResolveImportCardsResult = {
  /** First resolved printing per lowercase name (CSV / name-only callers). */
  byName: Map<string, Card>;
  /** Unique `name|set|collector` keys so two printings of one name stay distinct. */
  byKey: Map<string, Card>;
  unresolved: string[];
};

export function importCardKey(entry: ImportCardRef): string {
  return `${entry.name.toLowerCase()}|${entry.setCode?.toLowerCase() ?? ""}|${entry.collectorNumber?.toLowerCase() ?? ""}`;
}

async function defaultLookup(
  name: string,
  opts?: { set?: string; fuzzy?: boolean; collectorNumber?: string },
): Promise<Card | null> {
  try {
    if (opts?.set && opts.collectorNumber) {
      const raw = await getCardBySetCollector(opts.set, opts.collectorNumber);
      return normalizeScryfallCard(raw);
    }
    const raw = await getCardNamed(name, {
      fuzzy: opts?.set ? false : opts?.fuzzy !== false,
      set: opts?.set,
    });
    return normalizeScryfallCard(raw);
  } catch (err) {
    if (err instanceof ScryfallNotFoundError) return null;
    throw err;
  }
}

async function findLocalPrinting(
  cards: CardRepository,
  entry: ImportCardRef,
): Promise<Card | undefined> {
  const localHits = await cards.searchLocal(entry.name, 20);
  const exact = localHits.filter(
    (c) => c.name.toLowerCase() === entry.name.toLowerCase(),
  );
  if (exact.length === 0) return undefined;

  const set = entry.setCode?.toLowerCase();
  const collector = entry.collectorNumber?.toLowerCase();

  if (set && collector) {
    return exact.find(
      (c) =>
        c.setCode?.toLowerCase() === set &&
        c.collectorNumber?.toLowerCase() === collector,
    );
  }
  if (set) {
    return exact.find((c) => c.setCode?.toLowerCase() === set) ?? exact[0];
  }
  return exact[0];
}

/**
 * Resolve unique card names / printings to local Card rows (cached in Dexie).
 * Failures are collected rather than aborting the whole import.
 */
export async function resolveImportCards(
  names: ImportCardRef[],
  options: ResolveImportCardsOptions = {},
): Promise<ResolveImportCardsResult> {
  const database = options.database ?? getDatabase();
  const cards = new CardRepository(database);
  const lookup = options.lookup ?? defaultLookup;

  const unique = new Map<string, ImportCardRef>();
  for (const entry of names) {
    const key = importCardKey(entry);
    if (!unique.has(key)) unique.set(key, entry);
  }

  const byName = new Map<string, Card>();
  const byKey = new Map<string, Card>();
  const unresolved: string[] = [];
  let resolved = 0;
  let failed = 0;
  const total = unique.size;

  for (const [key, entry] of unique.entries()) {
    options.onProgress?.({
      resolved,
      failed,
      total,
      currentName: entry.name,
    });

    const local = await findLocalPrinting(cards, entry);
    if (local) {
      byKey.set(key, local);
      if (!byName.has(entry.name.toLowerCase())) {
        byName.set(entry.name.toLowerCase(), local);
      }
      resolved += 1;
      continue;
    }

    try {
      const card = await lookup(entry.name, {
        set: entry.setCode,
        collectorNumber: entry.collectorNumber,
        fuzzy: !entry.setCode,
      });
      if (!card) {
        unresolved.push(entry.name);
        failed += 1;
        continue;
      }
      await cards.upsert(card);
      byKey.set(key, card);
      if (!byName.has(entry.name.toLowerCase())) {
        byName.set(entry.name.toLowerCase(), card);
      }
      resolved += 1;
    } catch {
      unresolved.push(entry.name);
      failed += 1;
    }
  }

  options.onProgress?.({ resolved, failed, total });
  return { byName, byKey, unresolved };
}
