/**
 * Commander color identity helpers.
 */

import type { Card } from "@/types/card";

export function getCommanderColorIdentity(commanderCard: Card): string[] {
  return [...commanderCard.colorIdentity].sort();
}

/**
 * A card is within identity when every color in its colorIdentity
 * appears in the commander's identity. Colorless (empty) is always OK.
 */
export function isWithinColorIdentity(card: Card, identity: string[]): boolean {
  if (!card.colorIdentity || card.colorIdentity.length === 0) {
    return true;
  }
  const allowed = new Set(identity);
  return card.colorIdentity.every((c) => allowed.has(c));
}

export function findColorIdentityViolations(
  cards: Array<{ card: Card; quantity: number; zone: string; status: string }>,
  identity: string[],
): Array<{ name: string; colors: string[] }> {
  const violations: Array<{ name: string; colors: string[] }> = [];
  const seen = new Set<string>();

  for (const entry of cards) {
    if (entry.status === "cut") continue;
    if (entry.zone === "maybeboard") continue;
    if (isWithinColorIdentity(entry.card, identity)) continue;
    if (seen.has(entry.card.oracleId || entry.card.id)) continue;
    seen.add(entry.card.oracleId || entry.card.id);
    violations.push({
      name: entry.card.name,
      colors: entry.card.colorIdentity,
    });
  }

  return violations;
}
