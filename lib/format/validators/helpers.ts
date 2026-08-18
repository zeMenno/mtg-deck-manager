/**
 * Shared helpers for format validators.
 */

import { getActiveDeckCards } from "@/lib/deck/stats/filters";
import type { Card } from "@/types/card";
import type { Deck, DeckCard, DeckCardWithCard } from "@/types/deck";
import type {
  CardLookup,
  DeckValidationMode,
  DeckWarning,
} from "@/types/deck-validation";
import { BASIC_LAND_ORACLE_NAMES } from "@/lib/deck/constants";

export function resolveCards(
  deckCards: DeckCard[],
  cardLookup: CardLookup,
): DeckCardWithCard[] {
  return deckCards.map((deckCard) => {
    const card = cardLookup(deckCard.cardId);
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
      } satisfies Card,
    };
  });
}

export function getActiveResolved(
  deckCards: DeckCard[],
  cardLookup: CardLookup,
  mode: DeckValidationMode,
): DeckCardWithCard[] {
  const resolved = resolveCards(deckCards, cardLookup);
  return getActiveDeckCards(resolved, mode);
}

export function isBasicLand(card: Card): boolean {
  if (BASIC_LAND_ORACLE_NAMES.has(card.name)) return true;
  return /\bBasic\b/i.test(card.typeLine) && /\bLand\b/i.test(card.typeLine);
}

export function isLand(typeLine: string): boolean {
  return /\bLand\b/i.test(typeLine);
}

export function resolveCommander(
  deck: Deck,
  active: DeckCardWithCard[],
): DeckCardWithCard | undefined {
  const fromZone = active.filter((c) => c.zone === "commander");
  if (fromZone.length > 0) return fromZone[0];
  if (deck.commanderId) {
    return active.find((c) => c.cardId === deck.commanderId);
  }
  return undefined;
}

export function warning(
  partial: Omit<DeckWarning, "id"> & { id?: string },
): DeckWarning {
  return {
    id: partial.id ?? partial.code.toLowerCase().replace(/_/g, "-"),
    category: partial.category,
    severity: partial.severity,
    code: partial.code,
    message: partial.message,
    details: partial.details,
    cardIds: partial.cardIds,
    field: partial.field,
    actual: partial.actual,
    expected: partial.expected,
  };
}

export function sortWarnings(warnings: DeckWarning[]): DeckWarning[] {
  const categoryOrder: Record<DeckWarning["category"], number> = {
    LEGALITY: 0,
    WARNING: 1,
    RECOMMENDATION: 2,
  };
  const severityOrder: Record<DeckWarning["severity"], number> = {
    error: 0,
    warn: 1,
    info: 2,
    success: 3,
  };
  return [...warnings].sort((a, b) => {
    if (a.severity === "success" && b.severity !== "success") return 1;
    if (b.severity === "success" && a.severity !== "success") return -1;
    const cat = categoryOrder[a.category] - categoryOrder[b.category];
    if (cat !== 0) return cat;
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}
