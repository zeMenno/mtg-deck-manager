/**
 * Deck size validator — Commander requires exactly 100 (commander + mainboard).
 */

import { warning } from "@/lib/format/validators/helpers";
import type { DeckCardWithCard } from "@/types/deck";
import type { DeckWarning } from "@/types/deck-validation";

const COMMANDER_TARGET = 100;

export function validateDeckSize(
  active: DeckCardWithCard[],
  target: number = COMMANDER_TARGET,
): DeckWarning[] {
  const commander = active
    .filter((c) => c.zone === "commander")
    .reduce((sum, c) => sum + c.quantity, 0);
  const mainboard = active
    .filter((c) => c.zone === "mainboard")
    .reduce((sum, c) => sum + c.quantity, 0);
  const total = commander + mainboard;

  if (total === target) {
    return [
      warning({
        id: "deck-size-ok",
        code: "DECK_SIZE",
        category: "LEGALITY",
        severity: "success",
        message: `${target} cards`,
        details: `${mainboard} mainboard + ${commander} commander`,
        field: "deckSize",
        actual: total,
        expected: target,
      }),
    ];
  }

  const delta = total - target;
  const direction = delta < 0 ? "short" : "over";
  return [
    warning({
      id: "deck-size",
      code: "DECK_SIZE",
      category: "LEGALITY",
      severity: "error",
      message: `Deck size is ${total} (need ${target})`,
      details: `${mainboard} mainboard + ${commander} commander — ${Math.abs(delta)} ${direction}.`,
      field: "deckSize",
      actual: total,
      expected: target,
    }),
  ];
}
