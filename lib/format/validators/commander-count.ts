/**
 * Commander count validator — exactly 1 card in zone:commander.
 */

import { resolveCommander, warning } from "@/lib/format/validators/helpers";
import type { Deck, DeckCardWithCard } from "@/types/deck";
import type { DeckWarning } from "@/types/deck-validation";

export function validateCommanderCount(
  deck: Deck,
  active: DeckCardWithCard[],
): DeckWarning[] {
  const commanders = active.filter((c) => c.zone === "commander");
  const qty = commanders.reduce((sum, c) => sum + c.quantity, 0);

  // Partner support is out of scope — 2+ is always an error in MVP.
  if (qty === 0 && !deck.commanderId) {
    return [
      warning({
        id: "no-commander",
        code: "COMMANDER_COUNT",
        category: "LEGALITY",
        severity: "error",
        message: "No commander set",
        details: "Choose a legendary creature as commander.",
        field: "commanderId",
        actual: 0,
        expected: 1,
      }),
    ];
  }

  if (qty === 0 && deck.commanderId) {
    // commanderId set but no zone card — still treat as present for soft pass,
    // but prefer a warning so the user assigns the zone correctly.
    const resolved = resolveCommander(deck, active);
    if (resolved) {
      return [
        warning({
          id: "commander-set",
          code: "COMMANDER_COUNT",
          category: "LEGALITY",
          severity: "success",
          message: "Commander set",
          details: resolved.card.name,
          actual: 1,
          expected: 1,
        }),
      ];
    }
    return [
      warning({
        id: "no-commander",
        code: "COMMANDER_COUNT",
        category: "LEGALITY",
        severity: "error",
        message: "No commander set",
        details: "Commander id is set but no commander-zone card was found.",
        field: "commanderId",
        actual: 0,
        expected: 1,
      }),
    ];
  }

  if (qty > 1 || commanders.length > 1) {
    return [
      warning({
        id: "multi-commander",
        code: "COMMANDER_COUNT",
        category: "LEGALITY",
        severity: "error",
        message: `${qty} commanders found (exactly 1 required)`,
        details:
          "Partner / Background commanders are not supported in MVP — use a single commander.",
        field: "commanderId",
        actual: qty,
        expected: 1,
        cardIds: commanders.map((c) => c.cardId),
      }),
    ];
  }

  return [
    warning({
      id: "commander-set",
      code: "COMMANDER_COUNT",
      category: "LEGALITY",
      severity: "success",
      message: "Commander set",
      details: commanders[0]?.card.name,
      actual: 1,
      expected: 1,
    }),
  ];
}
