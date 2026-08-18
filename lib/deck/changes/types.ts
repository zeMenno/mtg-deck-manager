/**
 * Types for the ADD / CUT / CONSIDER upgrade workflow (Phase 7).
 */

import type { DeckCard, DeckCardWithCard } from "@/types/deck";

export interface DeckChangeSummary {
  addCount: number;
  addQuantity: number;
  cutCount: number;
  cutQuantity: number;
  considerCount: number;
  considerQuantity: number;
  hasPendingChanges: boolean;
}

export interface ApplyChangesResult {
  promotedCount: number;
  removedCount: number;
  appliedAt: string;
  errors?: string[];
}

export type ApplyValidationSeverity = "error" | "warning";

export interface ApplyValidationIssue {
  id: string;
  severity: ApplyValidationSeverity;
  message: string;
}

export interface ApplyValidation {
  ok: boolean;
  canApply: boolean;
  issues: ApplyValidationIssue[];
  projectedTotal: number;
  projectedTarget: number;
}

export type ProjectedRowKind = "incoming" | "staying";

export interface ProjectedDeckViewModel extends DeckCardWithCard {
  kind: ProjectedRowKind;
}

export interface ReplacementPair {
  add: DeckCard | DeckCardWithCard;
  cut: DeckCard | DeckCardWithCard;
}

/** Optional Phase 11 hook — register snapshot creation after apply. */
export type OnApplyComplete = (
  result: ApplyChangesResult,
) => void | Promise<void>;
