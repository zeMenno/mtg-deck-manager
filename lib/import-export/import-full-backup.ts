/**
 * Full application backup import (replace-all) with validation + transaction.
 */

import {
  APP_SCHEMA_VERSION,
  type DeckBuilderDatabase,
  getDatabase,
} from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import { TagRepository } from "@/lib/db/repositories";
import type { AppBackup } from "@/lib/import-export/types";
import { validateBackup } from "@/lib/import-export/validate-backup";

export type ImportFullBackupOptions = {
  /** When true, skip Zod/referential validation (tests only). */
  skipValidation?: boolean;
};

export class BackupImportError extends Error {
  readonly issues: string[];

  constructor(message: string, issues: string[] = []) {
    super(message);
    this.name = "BackupImportError";
    this.issues = issues;
  }
}

const USER_TABLES = [
  "decks",
  "deckCards",
  "deckVersions",
  "cards",
  "cardPrices",
  "tags",
  "wishlistItems",
  "settings",
] as const;

/**
 * Clear all user tables and bulk-put backup rows inside one Dexie transaction.
 * appMeta is partially preserved/updated (schemaVersion, lastImportAt).
 */
export async function importFullBackup(
  data: AppBackup,
  database: DeckBuilderDatabase = getDatabase(),
  options: ImportFullBackupOptions = {},
): Promise<void> {
  if (!options.skipValidation) {
    const result = validateBackup(data);
    if (!result.ok) {
      throw new BackupImportError(
        result.errors[0]?.message ??
          "This file isn't a valid MTG Deck Builder backup.",
        result.errors.map((e) => e.message),
      );
    }
  } else {
    // Minimal version check even when skipping full validation.
    if (data.backupVersion !== 1) {
      throw new BackupImportError(
        `Unsupported backupVersion ${String(data.backupVersion)}`,
      );
    }
  }

  const tables = data.data;

  try {
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

        await Promise.all([
          tables.decks.length
            ? database.decks.bulkPut(tables.decks)
            : Promise.resolve(),
          tables.deckCards.length
            ? database.deckCards.bulkPut(tables.deckCards)
            : Promise.resolve(),
          tables.deckVersions.length
            ? database.deckVersions.bulkPut(tables.deckVersions)
            : Promise.resolve(),
          tables.cards.length
            ? database.cards.bulkPut(tables.cards)
            : Promise.resolve(),
          tables.cardPrices.length
            ? database.cardPrices.bulkPut(tables.cardPrices)
            : Promise.resolve(),
          tables.tags.length
            ? database.tags.bulkPut(tables.tags)
            : Promise.resolve(),
          tables.wishlistItems.length
            ? database.wishlistItems.bulkPut(tables.wishlistItems)
            : Promise.resolve(),
          tables.settings.length
            ? database.settings.bulkPut(tables.settings)
            : Promise.resolve(),
        ]);

        // Restore appMeta from backup (except we overwrite schema / import markers).
        if (Array.isArray(tables.appMeta) && tables.appMeta.length > 0) {
          await database.appMeta.bulkPut(tables.appMeta);
        }

        const timestamp = nowIso();
        await database.appMeta.put({
          key: "schemaVersion",
          value: APP_SCHEMA_VERSION,
          updatedAt: timestamp,
        });
        await database.appMeta.put({
          key: "dbSchemaVersion",
          value: APP_SCHEMA_VERSION,
          updatedAt: timestamp,
        });
        await database.appMeta.put({
          key: "lastImportAt",
          value: timestamp,
          updatedAt: timestamp,
        });
        await database.appMeta.put({
          key: "lastImportBackupVersion",
          value: data.backupVersion,
          updatedAt: timestamp,
        });
      },
    );
  } catch (err) {
    if (
      err instanceof DOMException &&
      (err.name === "QuotaExceededError" || err.code === 22)
    ) {
      throw new BackupImportError(
        "This device is out of space for app data. Export a backup and remove unused decks.",
      );
    }
    if (err instanceof BackupImportError) throw err;
    throw new BackupImportError(
      err instanceof Error ? err.message : "Import failed",
    );
  }

  // Ensure default tags exist if backup had an empty tags table.
  const tagRepo = new TagRepository(database);
  await tagRepo.seedDefaults();
}

/**
 * Minimal structural check for Phase 3 compatibility.
 * Prefer `validateBackup` for UI flows.
 */
export function isAppBackupShape(value: unknown): value is AppBackup {
  return validateBackup(value).ok;
}

export { USER_TABLES };
