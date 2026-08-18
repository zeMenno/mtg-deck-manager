/**
 * Duplicate detection — re-export adapted for Phase 6 tests.
 * @deprecated Prefer `@/lib/format/validators/duplicate-detection`.
 */

import { validateDuplicates } from "@/lib/format/validators/duplicate-detection";
import { getActiveDeckCards } from "@/lib/deck/stats/filters";
import type { StatsMode } from "@/lib/deck/stats/types";
import type { DeckCardWithCard } from "@/types/deck";
import type { DeckWarning } from "@/types/deck-validation";

export function findDuplicateOracleNames(
  deckCards: DeckCardWithCard[],
  mode: StatsMode = "current",
): DeckWarning[] {
  const active = getActiveDeckCards(deckCards, mode);
  return validateDuplicates(active).filter((w) => w.severity === "error");
}
