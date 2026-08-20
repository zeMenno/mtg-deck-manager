/**
 * Public import/export surface (Phase 10).
 */

export {
  CURRENT_BACKUP_VERSION,
  MAX_IMPORT_FILE_BYTES,
  BACKUP_FILENAME_PREFIX,
  backupFilenameForDate,
} from "@/lib/import-export/backup-version";

export type {
  AppBackup,
  AppBackupData,
  AppBackupExportedFrom,
  AppBackupMetadata,
  BackupDisplayMode,
  DeckExport,
  DeckExportFormat,
  FullImportMode,
  ValidationIssue,
  ValidationResult,
  UnresolvedCardRef,
  ImportResult,
  ParsedDecklist,
  ParsedDecklistLine,
  CsvDeckRow,
} from "@/lib/import-export/types";

export {
  AppBackupSchema,
  DeckExportSchema,
} from "@/lib/import-export/backup-schema";

export {
  validateBackup,
  isAppBackupShape,
  normalizeLegacyBackupShape,
} from "@/lib/import-export/validate-backup";

export {
  exportFullBackup,
  exportAndDownloadFullBackup,
  recordSuccessfulBackup,
  downloadBackupJson,
} from "@/lib/import-export/export-full-backup";

export {
  importFullBackup,
  BackupImportError,
} from "@/lib/import-export/import-full-backup";

export { clearAllData } from "@/lib/import-export/clear-all-data";

export {
  exportDeckJson,
  exportDeckText,
  exportDeckCsv,
  downloadDeckExport,
} from "@/lib/import-export/export-deck";

export {
  importDeckJson,
  importTextDecklist,
  importCsvDeck,
} from "@/lib/import-export/import-deck";

export {
  parseTextDecklist,
  normalizeCardName,
  parseNameWithSet,
  stripArchidektDecorations,
} from "@/lib/import-export/text-decklist-parser";

export {
  mapArchidektCategory,
  mapArchidektCategories,
  isArchidektTypeBucket,
} from "@/lib/import-export/archidekt-categories";

export {
  previewImportIntoDeck,
  applyImportIntoDeck,
} from "@/lib/import-export/import-into-deck";
export type {
  ExistingDeckConflictPolicy,
  ImportIntoDeckNewStatus,
  ImportIntoDeckPreview,
  ImportIntoDeckPreviewRow,
} from "@/lib/import-export/import-into-deck";

export {
  resolveImportCards,
  importCardKey,
} from "@/lib/import-export/resolve-import-cards";
export type {
  ResolveProgress,
  ResolveImportCardsResult,
  ImportCardRef,
} from "@/lib/import-export/resolve-import-cards";

export {
  CSV_HEADERS,
  buildDeckCsv,
  parseDeckCsv,
  escapeCsvField,
} from "@/lib/import-export/csv-deck-parser";

export {
  remapDeckPackage,
  assertUniqueRemappedIds,
} from "@/lib/import-export/id-remap";

export {
  downloadBlob,
  downloadText,
  downloadJson,
  shareOrDownloadFile,
} from "@/lib/import-export/download-file";

export {
  readFileAsText,
  readJsonFile,
  assertFileSize,
  ImportFileTooLargeError,
  ImportJsonParseError,
} from "@/lib/import-export/read-file";

export { estimateStorageUsage } from "@/lib/import-export/storage-estimate";
export type { StorageUsageEstimate } from "@/lib/import-export/storage-estimate";
