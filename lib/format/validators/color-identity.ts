/**
 * Color identity validator — each card's identity must be a subset of the commander's.
 */

import { resolveCommander, warning } from "@/lib/format/validators/helpers";
import type { Card } from "@/types/card";
import type { Deck, DeckCardWithCard } from "@/types/deck";
import type { DeckWarning } from "@/types/deck-validation";

export function getDeckColorIdentity(commander: Card): string[] {
  return [...commander.colorIdentity];
}

export function isWithinIdentity(card: Card, deckIdentity: string[]): boolean {
  if (!card.colorIdentity || card.colorIdentity.length === 0) {
    return true;
  }
  const allowed = new Set(deckIdentity);
  return card.colorIdentity.every((c) => allowed.has(c));
}

export function validateColorIdentity(
  deck: Deck,
  active: DeckCardWithCard[],
): DeckWarning[] {
  const commanderEntry = resolveCommander(deck, active);
  if (!commanderEntry) {
    return [];
  }

  const identity = getDeckColorIdentity(commanderEntry.card);
  const warnings: DeckWarning[] = [];
  const seen = new Set<string>();

  for (const entry of active) {
    if (entry.zone === "commander") continue;
    if (entry.zone === "sideboard") continue;
    if (isWithinIdentity(entry.card, identity)) continue;
    const key = entry.card.oracleId || entry.card.id;
    if (seen.has(key)) continue;
    seen.add(key);
    warnings.push(
      warning({
        id: `color-id-${key}`,
        code: "COLOR_IDENTITY",
        category: "LEGALITY",
        severity: "error",
        message: `${entry.card.name} is outside commander color identity`,
        details: `Card identity [${entry.card.colorIdentity.join("") || "C"}] vs commander [${identity.join("") || "C"}].`,
        cardIds: [entry.cardId],
      }),
    );
  }

  if (warnings.length === 0) {
    return [
      warning({
        id: "color-identity-ok",
        code: "COLOR_IDENTITY",
        category: "LEGALITY",
        severity: "success",
        message: "Color identity valid",
      }),
    ];
  }

  return warnings;
}
