/**
 * Import/export types for full app backups and single-deck packages.
 *
 * `backupVersion` is independent of Dexie `appSchemaVersion` — bump only when
 * the backup JSON shape itself breaks. See `backup-version.ts`.
 */

import type {
  AppMeta,
  AppSetting,
  Card,
  CardPrice,
  Tag,
  WishlistItem,
} from "@/types/card";
import type { Deck, DeckCard, DeckVersion } from "@/types/deck";
import type { DeckCardStatus, DeckCardZone, DeckFormat } from "@/types/index";

export type BackupDisplayMode = "browser" | "standalone";

export interface AppBackupExportedFrom {
  appVersion?: string;
  userAgent?: string;
  appUrl?: string;
  displayMode?: BackupDisplayMode;
}

export interface AppBackupMetadata {
  deckCount: number;
  cardCount: number;
  versionCount: number;
  wishlistItemCount: number;
  /** @deprecated Prefer wishlistItemCount — kept for older backups. */
  wishlistCount?: number;
}

export interface AppBackupData {
  decks: Deck[];
  deckCards: DeckCard[];
  deckVersions: DeckVersion[];
  cards: Card[];
  cardPrices: CardPrice[];
  tags: Tag[];
  wishlistItems: WishlistItem[];
  settings: AppSetting[];
  appMeta: AppMeta[];
}

/**
 * Full application JSON backup.
 * Never embeds image binaries or base64 image payloads.
 */
export interface AppBackup {
  backupVersion: 1;
  appSchemaVersion: number;
  exportedAt: string;
  exportedFrom: AppBackupExportedFrom;
  metadata: AppBackupMetadata;
  data: AppBackupData;
}

export interface DeckExport {
  exportVersion: 1;
  exportedAt: string;
  deck: Deck;
  deckCards: DeckCard[];
  /** Referenced printings only (metadata URLs — no binary). */
  cards: Card[];
  tags?: Tag[];
}

export type DeckExportFormat = "json" | "text" | "csv";

export type FullImportMode = "replace";

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  path: string;
  message: string;
  severity: ValidationSeverity;
};

export type ValidationResult =
  | { ok: true; backup: AppBackup; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

export type UnresolvedCardRef = {
  name: string;
  line?: number;
  zone?: DeckCardZone;
  quantity?: number;
  setCode?: string;
  collectorNumber?: string;
};

export type ImportResult = {
  added: number;
  updated: number;
  unresolved: UnresolvedCardRef[];
  deckId?: string;
  deckName?: string;
};

export type ParsedDecklistLine = {
  zone: DeckCardZone;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
  status?: DeckCardStatus;
  foil?: boolean;
  line: number;
  raw: string;
};

export type ParsedDecklist = {
  deckName?: string;
  format?: DeckFormat;
  commanderName?: string;
  lines: ParsedDecklistLine[];
};

export type CsvDeckRow = {
  quantity: number;
  name: string;
  set?: string;
  code?: string;
  status: DeckCardStatus;
  zone: DeckCardZone;
  foil: boolean;
  owned: boolean;
  notes?: string;
  roles: string[];
  synergies: string[];
  line: number;
};

export type IdRemapResult<T> = {
  entity: T;
  idMap: Map<string, string>;
};
