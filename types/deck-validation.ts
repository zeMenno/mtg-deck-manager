/**
 * Format & deck validation types — Phase 13.
 */

import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";

export type WarningCategory = "LEGALITY" | "RECOMMENDATION" | "WARNING";
export type WarningSeverity = "error" | "warn" | "info" | "success";

export interface DeckWarning {
  id: string;
  category: WarningCategory;
  severity: WarningSeverity;
  /** Stable machine code, e.g. COMMANDER_COUNT, DUPLICATE_NON_BASIC */
  code: string;
  message: string;
  details?: string;
  cardIds?: string[];
  field?: string;
  actual?: number;
  expected?: number;
}

export interface ProjectedDeck {
  commander: DeckCard | null;
  mainboard: DeckCard[];
  sideboard: DeckCard[];
  totalCount: number;
}

export interface RecommendationConfig {
  minLands: number;
  maxLands: number;
  minRamp: number;
  minCardDraw: number;
  minRemoval: number;
  maxAverageCmc?: number;
}

export const DEFAULT_RECOMMENDATION_CONFIG: RecommendationConfig = {
  minLands: 33,
  maxLands: 40,
  minRamp: 8,
  minCardDraw: 8,
  minRemoval: 5,
  maxAverageCmc: 3.5,
};

export type CardLookup = (cardId: string) => Card | undefined;

export type DeckValidationMode = "current" | "projected";

export interface DeckValidationContext {
  deck: Deck;
  deckCards: DeckCard[];
  cardLookup: CardLookup;
  recommendationConfig: RecommendationConfig;
  mode: DeckValidationMode;
}

export interface DeckValidationSummary {
  errors: number;
  warnings: number;
  recommendations: number;
  passed: number;
}

/** Role tag ids used for recommendation counts. */
export const VALIDATION_ROLE_IDS = {
  ramp: "role.ramp",
  draw: "role.card-draw",
  removal: "role.removal",
} as const;
