/**
 * Projected deck view helpers — wraps Phase 6 filters with row annotations.
 */

import { getProjectedDeckCards, sumQuantities } from "@/lib/deck/stats/filters";
import type {
  ProjectedDeckViewModel,
  ProjectedRowKind,
} from "@/lib/deck/changes/types";
import type { Card } from "@/types/card";
import type { Deck, DeckCard, DeckCardWithCard } from "@/types/deck";

export { getProjectedDeckCards } from "@/lib/deck/stats/filters";

export type ProjectedDeckCounts = {
  currentQuantity: number;
  addQuantity: number;
  cutQuantity: number;
  projectedQuantity: number;
  considerQuantity: number;
};

export function computeProjectedCounts(
  deckCards: DeckCard[],
): ProjectedDeckCounts {
  let currentQuantity = 0;
  let addQuantity = 0;
  let cutQuantity = 0;
  let considerQuantity = 0;

  for (const card of deckCards) {
    if (card.zone === "maybeboard") continue;
    switch (card.status) {
      case "current":
        currentQuantity += card.quantity;
        break;
      case "add":
        addQuantity += card.quantity;
        break;
      case "cut":
        cutQuantity += card.quantity;
        break;
      case "consider":
        considerQuantity += card.quantity;
        break;
      default:
        break;
    }
  }

  return {
    currentQuantity,
    addQuantity,
    cutQuantity,
    projectedQuantity: currentQuantity + addQuantity,
    considerQuantity,
  };
}

function resolveCard(
  deckCard: DeckCard,
  cardMap: Map<string, Card>,
): DeckCardWithCard {
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
}

export function annotateProjectedKind(
  status: DeckCard["status"],
): ProjectedRowKind {
  return status === "add" ? "incoming" : "staying";
}

/**
 * Build projected deck rows with NEW/STAYING badges.
 * Optionally filter to only changed (incoming) rows.
 */
export function buildProjectedDeckList(
  _deck: Deck,
  deckCards: DeckCard[],
  cards: Card[] | Map<string, Card>,
  options?: { changesOnly?: boolean },
): ProjectedDeckViewModel[] {
  const cardMap =
    cards instanceof Map ? cards : new Map(cards.map((c) => [c.id, c]));
  const projected = getProjectedDeckCards(deckCards);
  const rows: ProjectedDeckViewModel[] = projected.map((deckCard) => {
    const resolved = resolveCard(deckCard, cardMap);
    return {
      ...resolved,
      kind: annotateProjectedKind(deckCard.status),
    };
  });

  const filtered = options?.changesOnly
    ? rows.filter((r) => r.kind === "incoming")
    : rows;

  return filtered.sort(
    (a, b) =>
      a.zone.localeCompare(b.zone) || a.card.name.localeCompare(b.card.name),
  );
}

export function sumProjectedQuantity(deckCards: DeckCard[]): number {
  return sumQuantities(getProjectedDeckCards(deckCards));
}
