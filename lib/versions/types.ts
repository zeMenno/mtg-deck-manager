/**
 * Version / snapshot / diff types (Phase 11).
 * Entity shapes live in `@/types/deck`; diff types are local to versions.
 */

import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { DeckCardSnapshot, DeckSnapshot, DeckVersion } from "@/types/deck";
import type { SNAPSHOT_VERSION } from "@/lib/versions/constants";

export type { DeckCardSnapshot, DeckSnapshot, DeckVersion };

export type SnapshotSchemaVersion = typeof SNAPSHOT_VERSION;

export type DiffEntry = {
  cardId: string;
  zone: DeckCardZone;
  quantity: number;
  status?: DeckCardStatus;
};

export type QuantityChangeEntry = {
  cardId: string;
  zone: DeckCardZone;
  fromQuantity: number;
  toQuantity: number;
  status?: DeckCardStatus;
};

export type StatusChangeEntry = {
  cardId: string;
  zone: DeckCardZone;
  quantity: number;
  fromStatus: DeckCardStatus;
  toStatus: DeckCardStatus;
};

export type VersionDiffSummary = {
  addedCount: number;
  removedCount: number;
  quantityChangeCount: number;
  statusChangeCount: number;
};

export type VersionDiff = {
  added: DiffEntry[];
  removed: DiffEntry[];
  quantityChanges: QuantityChangeEntry[];
  statusChanges: StatusChangeEntry[];
  summary: VersionDiffSummary;
};

export type SaveVersionInput = {
  name: string;
  notes?: string;
  /** When at the version cap, delete the oldest version then save. */
  pruneOldest?: boolean;
};

export class VersionLimitError extends Error {
  readonly code = "VERSION_LIMIT" as const;
  readonly deckId: string;
  readonly limit: number;
  readonly count: number;

  constructor(deckId: string, limit: number, count: number) {
    super(
      `Deck has ${count} versions (limit ${limit}). Delete an older version or prune the oldest to save.`,
    );
    this.name = "VersionLimitError";
    this.deckId = deckId;
    this.limit = limit;
    this.count = count;
  }
}
