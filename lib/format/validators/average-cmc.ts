/**
 * Average CMC warning (optional threshold).
 */

import { computeAverageManaValue } from "@/lib/deck/stats/mana-curve";
import { warning } from "@/lib/format/validators/helpers";
import type { DeckCardWithCard } from "@/types/deck";
import type {
  DeckWarning,
  RecommendationConfig,
} from "@/types/deck-validation";

export function validateAverageCmc(
  active: DeckCardWithCard[],
  config: RecommendationConfig,
): DeckWarning[] {
  const max = config.maxAverageCmc;
  if (max === undefined) return [];

  const playable = active.filter((c) => c.zone !== "sideboard");
  const avg = computeAverageManaValue(playable);

  if (avg <= max) {
    return [];
  }

  return [
    warning({
      id: "high-avg-cmc",
      code: "AVERAGE_CMC",
      category: "WARNING",
      severity: "warn",
      message: `Average mana value ${avg} (target ≤ ${max})`,
      details: "Non-land cards only. High curves can struggle to develop.",
      field: "averageCmc",
      actual: avg,
      expected: max,
    }),
  ];
}
