/**
 * Active-deck card filters for current vs projected stats.
 *
 * Current: status === "current" AND zone !== "maybeboard"
 * Projected: (status current OR add) AND zone !== "maybeboard"
 *   — CUT cards are excluded; ADD cards are included (Phase 7 preview).
 */

import type { Card } from "@/types/card";
import type { DeckCard, DeckCardWithCard } from "@/types/deck";
import type { StatsMode } from "@/lib/deck/stats/types";

export function isMaybeboard(card: DeckCard): boolean {
  return card.zone === "maybeboard";
}

/** Cards that contribute to "current deck" composition stats. */
export function getCurrentDeckCards<T extends DeckCard>(cards: T[]): T[] {
  return cards.filter((c) => c.status === "current" && !isMaybeboard(c));
}

/**
 * Cards that would remain after applying ADD/CUT changes.
 * CONSIDER is excluded (not yet decided).
 */
export function getProjectedDeckCards<T extends DeckCard>(cards: T[]): T[] {
  return cards.filter(
    (c) => !isMaybeboard(c) && (c.status === "current" || c.status === "add"),
  );
}

export function getActiveDeckCards<T extends DeckCard>(
  cards: T[],
  mode: StatsMode,
): T[] {
  return mode === "projected"
    ? getProjectedDeckCards(cards)
    : getCurrentDeckCards(cards);
}

/** Join DeckCard rows with resolved Card metadata. */
export function withResolvedCards(
  deckCards: DeckCard[],
  cardMap: Map<string, Card>,
): DeckCardWithCard[] {
  return deckCards.map((deckCard) => {
    const card = cardMap.get(deckCard.cardId);
    if (card) {
      return { ...deckCard, card };
    }
    return {
      ...deckCard,
      card: {
        id: deckCard.cardId,
        oracleId: "",
        name: "Unknown card",
        manaValue: 0,
        typeLine: "",
        colors: [],
        colorIdentity: [],
        keywords: [],
        updatedAt: deckCard.updatedAt,
      },
    };
  });
}

/** Sum quantities for a list of deck cards. */
export function sumQuantities(cards: Pick<DeckCard, "quantity">[]): number {
  return cards.reduce((sum, c) => sum + c.quantity, 0);
}
