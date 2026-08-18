import type { DeckCard } from "@/types/deck";
import type { DeckChangeSummary } from "@/lib/deck/changes/types";

/**
 * Count distinct rows and total quantities for upgrade statuses.
 * `hasPendingChanges` is true when any ADD or CUT rows exist.
 */
export function computeChangeSummary(deckCards: DeckCard[]): DeckChangeSummary {
  let addCount = 0;
  let addQuantity = 0;
  let cutCount = 0;
  let cutQuantity = 0;
  let considerCount = 0;
  let considerQuantity = 0;

  for (const card of deckCards) {
    switch (card.status) {
      case "add":
        addCount += 1;
        addQuantity += card.quantity;
        break;
      case "cut":
        cutCount += 1;
        cutQuantity += card.quantity;
        break;
      case "consider":
        considerCount += 1;
        considerQuantity += card.quantity;
        break;
      default:
        break;
    }
  }

  return {
    addCount,
    addQuantity,
    cutCount,
    cutQuantity,
    considerCount,
    considerQuantity,
    hasPendingChanges: addCount > 0 || cutCount > 0,
  };
}

export function canApply(deckCards: DeckCard[]): boolean {
  return computeChangeSummary(deckCards).hasPendingChanges;
}
