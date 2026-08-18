/**
 * Land count recommendation validator.
 */

import { isLand, warning } from "@/lib/format/validators/helpers";
import type { DeckCardWithCard } from "@/types/deck";
import type {
  DeckWarning,
  RecommendationConfig,
} from "@/types/deck-validation";

export function countLandsInDeck(active: DeckCardWithCard[]): number {
  return active.reduce((sum, c) => {
    if (c.zone === "sideboard") return sum;
    if (!isLand(c.card.typeLine)) return sum;
    return sum + c.quantity;
  }, 0);
}

export function validateLandCount(
  active: DeckCardWithCard[],
  config: RecommendationConfig,
): DeckWarning[] {
  const lands = countLandsInDeck(active);

  if (lands < config.minLands) {
    return [
      warning({
        id: "low-lands",
        code: "LAND_COUNT",
        category: "RECOMMENDATION",
        severity: "info",
        message: `${lands} lands (rec: ${config.minLands}–${config.maxLands})`,
        details: "Based on card type lines containing Land.",
        field: "landCount",
        actual: lands,
        expected: config.minLands,
      }),
    ];
  }

  if (lands > config.maxLands) {
    return [
      warning({
        id: "high-lands",
        code: "LAND_COUNT",
        category: "RECOMMENDATION",
        severity: "info",
        message: `${lands} lands (rec: ${config.minLands}–${config.maxLands})`,
        details: "Based on card type lines containing Land.",
        field: "landCount",
        actual: lands,
        expected: config.maxLands,
      }),
    ];
  }

  return [
    warning({
      id: "lands-ok",
      code: "LAND_COUNT",
      category: "RECOMMENDATION",
      severity: "success",
      message: `${lands} lands`,
      field: "landCount",
      actual: lands,
    }),
  ];
}
