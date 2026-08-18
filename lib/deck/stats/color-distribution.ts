/**
 * Color pip distribution and deck color identity.
 *
 * Pip counts: for each non-land card, increment each color in Card.colors
 * by quantity. Colorless cards (empty colors) increment C.
 */

import type { Card } from "@/types/card";
import type { Deck } from "@/types/deck";
import type { DeckCardWithCard } from "@/types/deck";
import type { ColorDistribution } from "@/lib/deck/stats/types";

export type ManaColor = "W" | "U" | "B" | "R" | "G" | "C";

const EMPTY_PIPS: Record<ManaColor, number> = {
  W: 0,
  U: 0,
  B: 0,
  R: 0,
  G: 0,
  C: 0,
};

function isLand(typeLine: string): boolean {
  return /\bLand\b/i.test(typeLine);
}

function isManaColor(value: string): value is Exclude<ManaColor, "C"> {
  return (
    value === "W" ||
    value === "U" ||
    value === "B" ||
    value === "R" ||
    value === "G"
  );
}

export function computeColorDistribution(
  cards: DeckCardWithCard[],
): Record<ManaColor, number> {
  const pips: Record<ManaColor, number> = { ...EMPTY_PIPS };

  for (const deckCard of cards) {
    if (isLand(deckCard.card.typeLine)) continue;
    const qty = deckCard.quantity;
    const colors = deckCard.card.colors;
    if (!colors || colors.length === 0) {
      pips.C += qty;
      continue;
    }
    for (const color of colors) {
      if (isManaColor(color)) {
        pips[color] += qty;
      }
    }
  }

  return pips;
}

/**
 * Union of color identity across active cards.
 * Prefer commander card identity when available.
 */
export function computeColorIdentity(
  deck: Deck,
  cards: DeckCardWithCard[],
  commanderCard?: Card | null,
): string[] {
  if (commanderCard?.colorIdentity) {
    return [...commanderCard.colorIdentity].sort();
  }

  if (deck.commanderId) {
    const commander = cards.find(
      (c) => c.cardId === deck.commanderId || c.zone === "commander",
    );
    if (commander) {
      return [...commander.card.colorIdentity].sort();
    }
  }

  const identity = new Set<string>();
  for (const deckCard of cards) {
    for (const color of deckCard.card.colorIdentity) {
      identity.add(color);
    }
  }
  return Array.from(identity).sort();
}

export function buildColorDistribution(
  deck: Deck,
  cards: DeckCardWithCard[],
  commanderCard?: Card | null,
): ColorDistribution {
  return {
    pips: computeColorDistribution(cards),
    identity: computeColorIdentity(deck, cards, commanderCard),
  };
}
