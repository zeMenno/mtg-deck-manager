/**
 * Status counts — sum quantity per status across all zones
 * (including maybeboard for upgrade visibility).
 */

import type { DeckCard } from "@/types/deck";
import type { StatusCounts } from "@/lib/deck/stats/types";

export function computeStatusCounts(deckCards: DeckCard[]): StatusCounts {
  const counts: StatusCounts = {
    current: 0,
    add: 0,
    cut: 0,
    consider: 0,
  };

  for (const card of deckCards) {
    counts[card.status] += card.quantity;
  }

  return counts;
}
