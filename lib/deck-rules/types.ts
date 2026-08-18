/**
 * @deprecated Prefer `@/types/deck-validation`.
 * Kept so deep imports from Phase 6 continue to typecheck.
 */

export type {
  WarningCategory,
  WarningSeverity,
  DeckWarning,
} from "@/types/deck-validation";

export type FormatRulesInput = {
  deck: import("@/types/deck").Deck;
  deckCards: import("@/types/deck").DeckCardWithCard[];
  landCount?: number;
  rampCount?: number;
  drawCount?: number;
  removalCount?: number;
  totalCards?: number;
  targetSize?: number;
  mode?: "current" | "projected";
  config?: import("@/types/deck-validation").RecommendationConfig;
};
