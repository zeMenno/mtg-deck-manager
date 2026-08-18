/**
 * Duplicate non-basic detection via oracleId.
 */

import { isBasicLand, warning } from "@/lib/format/validators/helpers";
import type { DeckCardWithCard } from "@/types/deck";
import type { DeckWarning } from "@/types/deck-validation";

export function validateDuplicates(active: DeckCardWithCard[]): DeckWarning[] {
  const byOracle = new Map<
    string,
    { name: string; totalQty: number; isBasic: boolean; cardIds: string[] }
  >();

  for (const deckCard of active) {
    if (deckCard.zone === "sideboard") continue;
    const card = deckCard.card;
    const key = card.oracleId || card.id;
    const existing = byOracle.get(key);
    if (existing) {
      existing.totalQty += deckCard.quantity;
      existing.cardIds.push(deckCard.cardId);
    } else {
      byOracle.set(key, {
        name: card.name,
        totalQty: deckCard.quantity,
        isBasic: isBasicLand(card),
        cardIds: [deckCard.cardId],
      });
    }
  }

  const warnings: DeckWarning[] = [];
  for (const [oracleId, entry] of byOracle) {
    if (entry.isBasic) continue;
    if (entry.totalQty <= 1) continue;
    warnings.push(
      warning({
        id: `duplicate-${oracleId}`,
        code: "DUPLICATE_NON_BASIC",
        category: "LEGALITY",
        severity: "error",
        message: `Duplicate non-basic: ${entry.name} (×${entry.totalQty})`,
        details:
          "Commander is a singleton format — non-basic cards may appear only once (same oracle across printings counts as one card).",
        cardIds: entry.cardIds,
        actual: entry.totalQty,
        expected: 1,
      }),
    );
  }

  if (warnings.length === 0) {
    return [
      warning({
        id: "no-duplicates",
        code: "DUPLICATE_NON_BASIC",
        category: "LEGALITY",
        severity: "success",
        message: "No duplicate non-basics",
      }),
    ];
  }

  return warnings;
}
