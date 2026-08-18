import type { DeckCardStatus, DeckCardZone, DeckFormat } from "@/types";

/** MVP default format. */
export const DEFAULT_FORMAT: DeckFormat = "commander";

export const DECK_FORMATS: readonly DeckFormat[] = [
  "commander",
  "standard",
  "modern",
  "pioneer",
  "legacy",
  "vintage",
  "pauper",
  "other",
] as const;

export const DECK_CARD_STATUSES: readonly DeckCardStatus[] = [
  "current",
  "add",
  "cut",
  "consider",
] as const;

export const DECK_CARD_ZONES: readonly DeckCardZone[] = [
  "commander",
  "mainboard",
  "sideboard",
  "maybeboard",
] as const;

/**
 * Basic land oracle names exempt from singleton / duplicate warnings.
 * Matches Scryfall oracle names for basic and snow-covered basics + Wastes.
 */
export const BASIC_LAND_ORACLE_NAMES: ReadonlySet<string> = new Set([
  "Plains",
  "Island",
  "Swamp",
  "Mountain",
  "Forest",
  "Wastes",
  "Snow-Covered Plains",
  "Snow-Covered Island",
  "Snow-Covered Swamp",
  "Snow-Covered Mountain",
  "Snow-Covered Forest",
]);

/** Quantity bounds for non-basic deck cards. */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;

/** Undo toast window for destructive actions (ms). */
export const UNDO_WINDOW_MS = 5000;

/**
 * `DeckCard.cardId` always references `Card.id` (Scryfall printing id),
 * never `oracleId`. Commander is also stored as a printing id on `Deck.commanderId`.
 */
export const CARD_ID_CONVENTION =
  "DeckCard.cardId and Deck.commanderId are Card.id (printing ids).";
