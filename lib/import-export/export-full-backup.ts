/**
 * Full application backup export.
 */

import {
  APP_SCHEMA_VERSION,
  type DeckBuilderDatabase,
  getDatabase,
} from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import { SettingsRepository } from "@/lib/db/repositories";
import { backupFilenameForDate } from "@/lib/import-export/backup-version";
import { CURRENT_BACKUP_VERSION } from "@/lib/import-export/backup-version";
import { shareOrDownloadFile } from "@/lib/import-export/download-file";
import type { AppBackup } from "@/lib/import-export/types";
import { isStandaloneDisplayMode } from "@/lib/pwa/use-is-standalone";

export type ExportFullBackupOptions = {
  appVersion?: string;
  userAgent?: string;
  appUrl?: string;
  displayMode?: "browser" | "standalone";
};

function resolveDisplayMode(
  override?: "browser" | "standalone",
): "browser" | "standalone" | undefined {
  if (override) return override;
  if (typeof window === "undefined") return undefined;
  return isStandaloneDisplayMode(window) ? "standalone" : "browser";
}

/**
 * Serialize all user tables into an `AppBackup` JSON document.
 * Does not embed image binaries — only metadata URL strings on Card rows.
 */
export async function exportFullBackup(
  database: DeckBuilderDatabase = getDatabase(),
  options: ExportFullBackupOptions = {},
): Promise<AppBackup> {
  const [
    decks,
    deckCards,
    deckVersions,
    cards,
    cardPrices,
    tags,
    wishlistItems,
    settings,
    appMeta,
  ] = await Promise.all([
    database.decks.toArray(),
    database.deckCards.toArray(),
    database.deckVersions.toArray(),
    database.cards.toArray(),
    database.cardPrices.toArray(),
    database.tags.toArray(),
    database.wishlistItems.toArray(),
    database.settings.toArray(),
    database.appMeta.toArray(),
  ]);

  const displayMode = resolveDisplayMode(options.displayMode);

  return {
    backupVersion: CURRENT_BACKUP_VERSION,
    appSchemaVersion: APP_SCHEMA_VERSION,
    exportedAt: nowIso(),
    exportedFrom: {
      appVersion: options.appVersion ?? "0.1.0",
      ...(options.userAgent !== undefined
        ? { userAgent: options.userAgent }
        : typeof navigator !== "undefined"
          ? { userAgent: navigator.userAgent }
          : {}),
      ...(options.appUrl !== undefined
        ? { appUrl: options.appUrl }
        : typeof window !== "undefined"
          ? { appUrl: window.location.origin }
          : {}),
      ...(displayMode !== undefined ? { displayMode } : {}),
    },
    metadata: {
      deckCount: decks.length,
      cardCount: cards.length,
      versionCount: deckVersions.length,
      wishlistItemCount: wishlistItems.length,
    },
    data: {
      decks,
      deckCards,
      deckVersions,
      cards,
      cardPrices,
      tags,
      wishlistItems,
      settings,
      appMeta,
    },
  };
}

/** Record last backup timestamp in settings + appMeta after a successful export. */
export async function recordSuccessfulBackup(
  deckCount: number,
  database: DeckBuilderDatabase = getDatabase(),
): Promise<void> {
  const timestamp = nowIso();
  const settings = new SettingsRepository(database);
  await settings.set("lastBackupAt", timestamp);
  await database.appMeta.put({
    key: "lastBackupAt",
    value: timestamp,
    updatedAt: timestamp,
  });
  await database.appMeta.put({
    key: "lastBackupDeckCount",
    value: deckCount,
    updatedAt: timestamp,
  });
}

/**
 * Export full backup and download/share the JSON file.
 * Updates lastBackupAt on success (not on share cancel).
 */
export async function exportAndDownloadFullBackup(
  database: DeckBuilderDatabase = getDatabase(),
  options: ExportFullBackupOptions & {
    filename?: string;
    preferShare?: boolean;
  } = {},
): Promise<"shared" | "downloaded" | "cancelled"> {
  const backup = await exportFullBackup(database, options);
  const filename = options.filename ?? backupFilenameForDate();
  const result = await shareOrDownloadFile(JSON.stringify(backup, null, 2), {
    filename,
    mimeType: "application/json",
    preferShare: options.preferShare,
  });
  if (result !== "cancelled") {
    await recordSuccessfulBackup(backup.metadata.deckCount, database);
  }
  return result;
}

/** @deprecated Prefer exportAndDownloadFullBackup — kept for Phase 3 callers. */
export async function downloadBackupJson(filename?: string): Promise<void> {
  await exportAndDownloadFullBackup(getDatabase(), {
    filename: filename ?? backupFilenameForDate(),
    preferShare: false,
  });
}
