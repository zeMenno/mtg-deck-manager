/**
 * Role coverage recommendations (ramp / draw / removal).
 */

import { countCardsWithRole } from "@/lib/deck/stats/role-distribution";
import { warning } from "@/lib/format/validators/helpers";
import type { DeckCardWithCard } from "@/types/deck";
import type {
  DeckWarning,
  RecommendationConfig,
} from "@/types/deck-validation";
import { VALIDATION_ROLE_IDS } from "@/types/deck-validation";

export function validateRoleCoverage(
  active: DeckCardWithCard[],
  config: RecommendationConfig,
): DeckWarning[] {
  const playable = active.filter((c) => c.zone !== "sideboard");
  const warnings: DeckWarning[] = [];

  const ramp = countCardsWithRole(playable, VALIDATION_ROLE_IDS.ramp);
  const draw = countCardsWithRole(playable, VALIDATION_ROLE_IDS.draw);
  const removal = countCardsWithRole(playable, VALIDATION_ROLE_IDS.removal);

  if (ramp < config.minRamp) {
    warnings.push(
      warning({
        id: "low-ramp",
        code: "ROLE_RAMP",
        category: "RECOMMENDATION",
        severity: "info",
        message: `${ramp} ramp sources (rec: ${config.minRamp}+)`,
        details: "Based on assigned Ramp roles — tag cards for accuracy.",
        field: "rampCount",
        actual: ramp,
        expected: config.minRamp,
      }),
    );
  }

  if (draw < config.minCardDraw) {
    warnings.push(
      warning({
        id: "low-draw",
        code: "ROLE_DRAW",
        category: "RECOMMENDATION",
        severity: "info",
        message: `${draw} card draw sources (rec: ${config.minCardDraw}+)`,
        details: "Based on assigned Card Draw roles — tag cards for accuracy.",
        field: "drawCount",
        actual: draw,
        expected: config.minCardDraw,
      }),
    );
  }

  if (removal < config.minRemoval) {
    warnings.push(
      warning({
        id: "low-removal",
        code: "ROLE_REMOVAL",
        category: "RECOMMENDATION",
        severity: "info",
        message: `${removal} removal sources (rec: ${config.minRemoval}+)`,
        details: "Based on assigned Removal roles — tag cards for accuracy.",
        field: "removalCount",
        actual: removal,
        expected: config.minRemoval,
      }),
    );
  }

  return warnings;
}
