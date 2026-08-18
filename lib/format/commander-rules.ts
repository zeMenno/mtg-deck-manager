/**
 * Commander format rules orchestrator.
 */

import type { FormatRules } from "@/lib/format/format-rules";
import {
  buildProjectedDeck,
  projectedDeckToCards,
} from "@/lib/format/projected-deck-builder";
import { validateAverageCmc } from "@/lib/format/validators/average-cmc";
import { validateCardLegality } from "@/lib/format/validators/card-legality";
import { validateColorIdentity } from "@/lib/format/validators/color-identity";
import { validateCommanderCount } from "@/lib/format/validators/commander-count";
import { validateDeckSize } from "@/lib/format/validators/deck-size";
import { validateDuplicates } from "@/lib/format/validators/duplicate-detection";
import {
  getActiveResolved,
  sortWarnings,
  warning,
} from "@/lib/format/validators/helpers";
import { validateLandCount } from "@/lib/format/validators/land-count";
import { validateRoleCoverage } from "@/lib/format/validators/role-coverage";
import { validateSideboard } from "@/lib/format/validators/sideboard";
import type { Deck, DeckCard } from "@/types/deck";
import type {
  CardLookup,
  DeckValidationMode,
  DeckWarning,
  ProjectedDeck,
  RecommendationConfig,
} from "@/types/deck-validation";
import { DEFAULT_RECOMMENDATION_CONFIG } from "@/types/deck-validation";

function runValidators(
  deck: Deck,
  deckCards: DeckCard[],
  cardLookup: CardLookup,
  mode: DeckValidationMode,
  config: RecommendationConfig,
): DeckWarning[] {
  const active = getActiveResolved(deckCards, cardLookup, mode);
  const warnings: DeckWarning[] = [
    ...validateCommanderCount(deck, active),
    ...validateDeckSize(active),
    ...validateDuplicates(active),
    ...validateColorIdentity(deck, active),
    ...validateCardLegality(active),
    ...validateSideboard(active),
    ...validateLandCount(active, config),
    ...validateRoleCoverage(active, config),
    ...validateAverageCmc(active, config),
  ];
  return sortWarnings(warnings);
}

function compareProjectionMeta(
  current: DeckWarning[],
  projected: DeckWarning[],
): DeckWarning[] {
  const currentErrors = current.filter(
    (w) => w.category === "LEGALITY" && w.severity === "error",
  ).length;
  const projectedErrors = projected.filter(
    (w) => w.category === "LEGALITY" && w.severity === "error",
  ).length;

  if (currentErrors > 0 && projectedErrors === 0) {
    return [
      warning({
        id: "projection-fixes",
        code: "PROJECTION_DELTA",
        category: "WARNING",
        severity: "info",
        message: "Projected deck resolves current legality errors",
        details: `Current has ${currentErrors} legality error(s); projected is clean.`,
      }),
    ];
  }

  if (projectedErrors > currentErrors) {
    return [
      warning({
        id: "projection-introduces",
        code: "PROJECTION_DELTA",
        category: "WARNING",
        severity: "warn",
        message: "Projected deck introduces additional legality errors",
        details: `Current: ${currentErrors} · Projected: ${projectedErrors}`,
        actual: projectedErrors,
        expected: currentErrors,
      }),
    ];
  }

  return [];
}

export const commanderRules: FormatRules = {
  format: "commander",

  getDeckWarnings(
    deck,
    cards,
    cardLookup,
    config = DEFAULT_RECOMMENDATION_CONFIG,
  ) {
    return runValidators(deck, cards, cardLookup, "current", config);
  },

  getProjectedWarnings(
    deck,
    projected,
    cardLookup,
    config = DEFAULT_RECOMMENDATION_CONFIG,
  ) {
    const projectedCards = projectedDeckToCards(projected);
    // Ensure statuses are treated as projected composition: rebuild from
    // projected cards already filtered to CURRENT+ADD.
    const asCurrent = projectedCards.map((c) => ({
      ...c,
      status: "current" as const,
    }));
    const projectedWarnings = runValidators(
      deck,
      asCurrent,
      cardLookup,
      "current",
      config,
    );

    // Meta comparison against true current deck requires original cards —
    // callers that have them can append; here we only validate projected.
    return projectedWarnings;
  },
};

/**
 * Full projected validation including delta meta vs current deck.
 */
export function getCommanderProjectedWarnings(
  deck: Deck,
  allDeckCards: DeckCard[],
  cardLookup: CardLookup,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): DeckWarning[] {
  const current = runValidators(
    deck,
    allDeckCards,
    cardLookup,
    "current",
    config,
  );
  const projected = buildProjectedDeck(allDeckCards);
  const projectedWarnings = commanderRules.getProjectedWarnings(
    deck,
    projected,
    cardLookup,
    config,
  );
  const meta = compareProjectionMeta(current, projectedWarnings);
  return sortWarnings([...projectedWarnings, ...meta]);
}

export function getCommanderCurrentWarnings(
  deck: Deck,
  deckCards: DeckCard[],
  cardLookup: CardLookup,
  config: RecommendationConfig = DEFAULT_RECOMMENDATION_CONFIG,
): DeckWarning[] {
  return commanderRules.getDeckWarnings(deck, deckCards, cardLookup, config);
}

/** @internal exported for tests */
export function validateProjectedComposition(
  deck: Deck,
  projected: ProjectedDeck,
  cardLookup: CardLookup,
  config?: RecommendationConfig,
): DeckWarning[] {
  return commanderRules.getProjectedWarnings(
    deck,
    projected,
    cardLookup,
    config,
  );
}
