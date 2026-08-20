import { DECK_CARD_ZONES } from "@/lib/deck/constants";
import type { DeckCardZone } from "@/types";
import type { DeckCardWithCard } from "@/types/deck";

export function groupDeckCardsByZone(
  cards: DeckCardWithCard[],
): Map<DeckCardZone, DeckCardWithCard[]> {
  const map = new Map<DeckCardZone, DeckCardWithCard[]>();
  for (const zone of DECK_CARD_ZONES) map.set(zone, []);
  for (const card of cards) {
    const list = map.get(card.zone) ?? [];
    list.push(card);
    map.set(card.zone, list);
  }
  return map;
}
