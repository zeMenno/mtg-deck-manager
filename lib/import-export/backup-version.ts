/**
 * Backup format versioning.
 *
 * Increment `CURRENT_BACKUP_VERSION` only on breaking changes to the
 * serialized `AppBackup` shape. Older versions may still be readable via
 * migration/normalization on import.
 */

/** Supported backup schema version written by this app build. */
export const CURRENT_BACKUP_VERSION = 1 as const;

export type SupportedBackupVersion = typeof CURRENT_BACKUP_VERSION;

/** Human-readable backup filename stem. */
export const BACKUP_FILENAME_PREFIX = "mtg-deck-builder-backup";

/** Reject import files larger than this (bytes). */
export const MAX_IMPORT_FILE_BYTES = 50 * 1024 * 1024;

export function backupFilenameForDate(date = new Date()): string {
  const yyyyMmDd = date.toISOString().slice(0, 10);
  return `${BACKUP_FILENAME_PREFIX}-${yyyyMmDd}.json`;
}
