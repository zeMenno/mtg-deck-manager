import { BASIC_LAND_ORACLE_NAMES } from "@/lib/deck/constants";
import type { Card } from "@/types/card";
import type { DeckCard } from "@/types/deck";

export type DuplicateWarning = {
  cardId: string;
  oracleId: string;
  name: string;
  existingDeckCardIds: string[];
  message: string;
};

export type DuplicateCheckInput = {
  /** Cards already in the deck (any zone/status). */
  existingDeckCards: DeckCard[];
  /** Resolved Card metadata keyed by printing id. */
  cardsById: Map<string, Card>;
  /** The card being added. */
  candidate: Card;
};

function isBasicLand(card: Card): boolean {
  if (BASIC_LAND_ORACLE_NAMES.has(card.name)) return true;
  return /^Basic\b/i.test(card.typeLine);
}

/**
 * Basic Commander singleton stub (full rules in Phase 13).
 * Warns when the same oracle appears in mainboard/commander with status !== cut,
 * excluding basic lands. Non-blocking — callers may still add the card.
 */
export function getDuplicateWarnings(
  input: DuplicateCheckInput,
): DuplicateWarning[] {
  const { existingDeckCards, cardsById, candidate } = input;

  if (isBasicLand(candidate)) {
    return [];
  }

  const matches: DeckCard[] = [];
  for (const deckCard of existingDeckCards) {
    if (deckCard.status === "cut") continue;
    if (deckCard.zone !== "mainboard" && deckCard.zone !== "commander") {
      continue;
    }
    const existing = cardsById.get(deckCard.cardId);
    if (!existing) continue;
    if (isBasicLand(existing)) continue;
    if (existing.oracleId === candidate.oracleId) {
      matches.push(deckCard);
    }
  }

  if (matches.length === 0) {
    return [];
  }

  return [
    {
      cardId: candidate.id,
      oracleId: candidate.oracleId,
      name: candidate.name,
      existingDeckCardIds: matches.map((m) => m.id),
      message: `${candidate.name} is already in this deck (non-basic singleton warning).`,
    },
  ];
}
