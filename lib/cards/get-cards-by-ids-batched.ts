/**
 * Resolve Card metadata for many printing ids — local first, Scryfall fill-in.
 */

import { CardRepository } from "@/lib/db/repositories/card-repository";
import { getCardsByIds, normalizeScryfallCards } from "@/lib/scryfall";
import type { Card } from "@/types/card";

/**
 * Batch-load cards by printing id. Hits Dexie first; fetches missing ids from
 * Scryfall (when available) and upserts them. Orphans (not found remotely)
 * are omitted from the result.
 */
export async function getCardsByIdsBatched(ids: string[]): Promise<Card[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const repo = new CardRepository();
  const local = await repo.getByIds(unique);
  const found = new Map(local.map((c) => [c.id, c]));
  const missing = unique.filter((id) => !found.has(id));

  if (missing.length > 0) {
    try {
      const remote = await getCardsByIds(missing);
      const normalized = normalizeScryfallCards(remote);
      if (normalized.length > 0) {
        await repo.bulkUpsert(normalized);
        for (const card of normalized) {
          found.set(card.id, card);
        }
      }
    } catch {
      // Offline or Scryfall error — return what we have locally.
    }
  }

  return unique
    .map((id) => found.get(id))
    .filter((c): c is Card => c !== undefined);
}
