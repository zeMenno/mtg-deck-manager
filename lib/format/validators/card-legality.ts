/**
 * Scryfall card legality validator for Commander.
 */

import { warning } from "@/lib/format/validators/helpers";
import type { DeckCardWithCard } from "@/types/deck";
import type { DeckWarning } from "@/types/deck-validation";

export function validateCardLegality(
  active: DeckCardWithCard[],
): DeckWarning[] {
  const warnings: DeckWarning[] = [];
  const seenIllegal = new Set<string>();
  let missingCount = 0;
  const missingIds: string[] = [];

  for (const deckCard of active) {
    if (deckCard.zone === "sideboard") continue;
    const legality = deckCard.card.legalities?.commander;
    const key = deckCard.card.oracleId || deckCard.card.id;

    if (!legality) {
      missingCount += 1;
      missingIds.push(deckCard.cardId);
      continue;
    }

    // Restricted is treated as not legal for Commander MVP.
    if (legality === "legal") continue;

    if (seenIllegal.has(key)) continue;
    seenIllegal.add(key);

    const label =
      legality === "restricted"
        ? "restricted (treated as not legal)"
        : legality.replace("_", " ");

    warnings.push(
      warning({
        id: `legality-${key}`,
        code: "CARD_LEGALITY",
        category: "LEGALITY",
        severity: "error",
        message: `${deckCard.card.name} is ${label} in Commander`,
        details:
          "Based on cached Scryfall legalities — refresh card data if the ban list may have changed.",
        cardIds: [deckCard.cardId],
      }),
    );
  }

  if (missingCount > 0) {
    warnings.push(
      warning({
        id: "legality-unknown",
        code: "CARD_LEGALITY_UNKNOWN",
        category: "WARNING",
        severity: "warn",
        message: `Could not verify legality for ${missingCount} card${missingCount === 1 ? "" : "s"}`,
        details:
          "Cached card metadata is missing Scryfall legalities (common offline). Refresh cards when online.",
        cardIds: missingIds.slice(0, 20),
        actual: missingCount,
      }),
    );
  }

  return warnings;
}
