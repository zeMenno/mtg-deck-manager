/**
 * Mana curve: buckets 0–6 and 7+ (cmc key 7).
 */

import type { DeckCardWithCard } from "@/types/deck";
import type { ManaCurveBucket } from "@/lib/deck/stats/types";

export type ManaCurveOptions = {
  /** Default false — lands (typically MV 0) stay in the curve. */
  excludeLands?: boolean;
};

function isLand(typeLine: string): boolean {
  return /\bLand\b/i.test(typeLine);
}

export function computeManaCurve(
  cards: DeckCardWithCard[],
  options: ManaCurveOptions = {},
): ManaCurveBucket[] {
  const buckets = new Map<number, number>();
  for (let i = 0; i <= 7; i++) {
    buckets.set(i, 0);
  }

  for (const deckCard of cards) {
    if (options.excludeLands && isLand(deckCard.card.typeLine)) {
      continue;
    }
    const mv = deckCard.card.manaValue;
    const key = mv >= 7 ? 7 : Math.max(0, Math.floor(mv));
    buckets.set(key, (buckets.get(key) ?? 0) + deckCard.quantity);
  }

  return Array.from({ length: 8 }, (_, cmc) => ({
    cmc,
    label: cmc === 7 ? "7+" : String(cmc),
    count: buckets.get(cmc) ?? 0,
  }));
}

/** Average mana value of non-land cards (quantity-weighted). */
export function computeAverageManaValue(cards: DeckCardWithCard[]): number {
  let totalMv = 0;
  let totalQty = 0;
  for (const deckCard of cards) {
    if (isLand(deckCard.card.typeLine)) continue;
    totalMv += deckCard.card.manaValue * deckCard.quantity;
    totalQty += deckCard.quantity;
  }
  if (totalQty === 0) return 0;
  return Math.round((totalMv / totalQty) * 100) / 100;
}

export function countLands(cards: DeckCardWithCard[]): number {
  return cards.reduce((sum, c) => {
    if (!isLand(c.card.typeLine)) return sum;
    return sum + c.quantity;
  }, 0);
}
