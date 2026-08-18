/**
 * Sideboard presence advisory for Commander.
 */

import { warning } from "@/lib/format/validators/helpers";
import type { DeckCardWithCard } from "@/types/deck";
import type { DeckWarning } from "@/types/deck-validation";

export function validateSideboard(active: DeckCardWithCard[]): DeckWarning[] {
  const sideboard = active.filter((c) => c.zone === "sideboard");
  const qty = sideboard.reduce((sum, c) => sum + c.quantity, 0);
  if (qty === 0) return [];

  return [
    warning({
      id: "sideboard-present",
      code: "SIDEBOARD",
      category: "WARNING",
      severity: "warn",
      message: `Sideboard has ${qty} card${qty === 1 ? "" : "s"} (not used in Commander)`,
      details: "Commander typically does not use a sideboard.",
      actual: qty,
      cardIds: sideboard.map((c) => c.cardId),
    }),
  ];
}
