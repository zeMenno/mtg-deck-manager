/**
 * Clear all user data (destructive). Logs event to appMeta.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import { TagRepository } from "@/lib/db/repositories";

export type ClearAllDataOptions = {
  /** Re-seed default role/synergy tags after clear (default true). */
  reseedTags?: boolean;
};

/**
 * Wipe all user tables. Preserves appMeta keys for audit (lastClearAt)
 * and re-seeds schemaVersion + optional default tags.
 */
export async function clearAllData(
  database: DeckBuilderDatabase = getDatabase(),
  options: ClearAllDataOptions = {},
): Promise<void> {
  const reseedTags = options.reseedTags !== false;
  const timestamp = nowIso();

  await database.transaction(
    "rw",
    [
      database.decks,
      database.deckCards,
      database.deckVersions,
      database.cards,
      database.cardPrices,
      database.tags,
      database.wishlistItems,
      database.settings,
      database.appMeta,
    ],
    async () => {
      await Promise.all([
        database.decks.clear(),
        database.deckCards.clear(),
        database.deckVersions.clear(),
        database.cards.clear(),
        database.cardPrices.clear(),
        database.tags.clear(),
        database.wishlistItems.clear(),
        database.settings.clear(),
      ]);

      await database.appMeta.put({
        key: "lastClearAt",
        value: timestamp,
        updatedAt: timestamp,
      });
      await database.appMeta.put({
        key: "lastClearEvent",
        value: { at: timestamp, source: "settings-data" },
        updatedAt: timestamp,
      });
    },
  );

  if (reseedTags) {
    await new TagRepository(database).seedDefaults();
  }
}
