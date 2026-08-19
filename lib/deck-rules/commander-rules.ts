/**
 * Compatibility getDeckWarnings — Phase 6 signature wrapping Phase 13 rules.
 * @deprecated Prefer DeckValidationService / `@/lib/format`.
 */

import {
  getCommanderCurrentWarnings,
  getCommanderProjectedWarnings,
  commanderRules,
} from "@/lib/format/commander-rules";
import type { FormatRules } from "@/lib/format/format-rules";
import type { FormatRulesInput } from "@/lib/deck-rules/types";
import type { DeckRuleThresholds } from "@/lib/deck-rules/thresholds";
import type {
  DeckWarning,
  RecommendationConfig,
} from "@/types/deck-validation";
import { DEFAULT_RECOMMENDATION_CONFIG } from "@/types/deck-validation";

export type { FormatRules };
export { commanderRules };

function configFromInput(
  input: FormatRulesInput,
  thresholds?: DeckRuleThresholds,
): RecommendationConfig {
  if (input.config) return input.config;
  if (thresholds) {
    return {
      minLands: thresholds.minLands,
      maxLands: DEFAULT_RECOMMENDATION_CONFIG.maxLands,
      minRamp: thresholds.minRamp,
      minCardDraw: thresholds.minDraw,
      minRemoval: thresholds.minRemoval,
      maxAverageCmc: DEFAULT_RECOMMENDATION_CONFIG.maxAverageCmc,
    };
  }
  return DEFAULT_RECOMMENDATION_CONFIG;
}

function toLookup(deckCards: FormatRulesInput["deckCards"]) {
  const map = new Map(deckCards.map((c) => [c.cardId, c.card]));
  return (cardId: string) => map.get(cardId);
}

export function getDeckWarnings(
  input: FormatRulesInput,
  format: string = input.deck.format,
  thresholds?: DeckRuleThresholds,
): DeckWarning[] {
  const lookup = toLookup(input.deckCards);
  const config = configFromInput(input, thresholds);
  const mode = input.mode ?? "current";

  if (format !== "commander") {
    return [
      {
        id: "format-stub",
        category: "WARNING",
        severity: "info",
        code: "FORMAT_UNSUPPORTED",
        message: `Format validation for ${format} is not available`,
      },
    ];
  }

  if (mode === "projected") {
    return getCommanderProjectedWarnings(
      input.deck,
      input.deckCards,
      lookup,
      config,
    );
  }

  return getCommanderCurrentWarnings(
    input.deck,
    input.deckCards,
    lookup,
    config,
  );
}
