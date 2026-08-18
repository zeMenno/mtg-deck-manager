/**
 * Build a projected deck composition (CURRENT + ADD − CUT).
 */

import { getProjectedDeckCards, sumQuantities } from "@/lib/deck/stats/filters";
import type { DeckCard } from "@/types/deck";
import type { ProjectedDeck } from "@/types/deck-validation";

/**
 * Projected deck = CURRENT + ADD (CUT excluded). Maybeboard excluded.
 * Quantities are already separate rows; ADD of an existing card is a
 * separate status row, so totals are a simple sum of projected rows.
 */
export function buildProjectedDeck(deckCards: DeckCard[]): ProjectedDeck {
  const projected = getProjectedDeckCards(deckCards);
  const commanders = projected.filter((c) => c.zone === "commander");
  const mainboard = projected.filter((c) => c.zone === "mainboard");
  const sideboard = projected.filter((c) => c.zone === "sideboard");

  const commander =
    commanders.length > 0
      ? commanders.reduce((best, c) => (c.quantity > best.quantity ? c : best))
      : null;

  const commanderQty = sumQuantities(commanders);
  const mainboardQty = sumQuantities(mainboard);

  return {
    commander,
    mainboard,
    sideboard,
    totalCount: commanderQty + mainboardQty,
  };
}

/** Convert ProjectedDeck back to a flat DeckCard list for validators. */
export function projectedDeckToCards(projected: ProjectedDeck): DeckCard[] {
  const cards: DeckCard[] = [...projected.mainboard, ...projected.sideboard];
  if (projected.commander) {
    cards.push(projected.commander);
  }
  return cards;
}
