/**
 * Deck-domain entities — mirrored from `docs/data-model.md` §§2–3, §7.
 */

import type { DeckCardStatus, DeckCardZone, DeckFormat } from "@/types/index";
import type { Card, CardPrice } from "@/types/card";

export interface Deck {
  id: string;
  name: string;
  format: DeckFormat;
  description?: string;
  /** Card.id (Scryfall printing) of the commander. */
  commanderId?: string;
  createdAt: string;
  updatedAt: string;
  activeVersionId?: string;
  archived?: boolean;
  favorite?: boolean;
}

export interface DeckCard {
  id: string;
  deckId: string;
  cardId: string;
  quantity: number;
  zone: DeckCardZone;
  status: DeckCardStatus;
  foil?: boolean;
  owned?: boolean;
  notes?: string;
  roles: string[];
  synergies: string[];
  /** ADD card points to the CUT deckCard it replaces. */
  replacesDeckCardId?: string;
  /** Optional reason when status is cut (falls back to notes in UI). */
  cutReason?: string;
  addedAt: string;
  updatedAt: string;
}

/** Resolved view type — never persisted. */
export interface DeckCardWithCard extends DeckCard {
  card: Card;
  price?: CardPrice;
}

export interface DeckVersion {
  id: string;
  deckId: string;
  name: string;
  createdAt: string;
  snapshot: DeckSnapshot;
  notes?: string;
}

export interface DeckSnapshot {
  /** Schema version for forward-compatible restores (Phase 11+). */
  snapshotVersion?: number;
  deck: Pick<Deck, "name" | "format" | "description" | "commanderId">;
  deckCards: DeckCardSnapshot[];
  capturedAt: string;
}

export interface DeckCardSnapshot {
  cardId: string;
  quantity: number;
  zone: DeckCardZone;
  status: DeckCardStatus;
  foil?: boolean;
  owned?: boolean;
  notes?: string;
  roles: string[];
  synergies: string[];
}
