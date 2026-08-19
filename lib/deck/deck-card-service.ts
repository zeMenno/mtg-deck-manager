/**
 * Deck card service — full API lives in deck-service; this module re-exports
 * for the Phase 5 file map and adds a dedicated entry point.
 */
export {
  DeckCardService,
  type AddCardToDeckInput,
  type AddCardToDeckResult,
} from "@/lib/deck/deck-service";

import { deckCardService as deckCardServiceSingleton } from "@/lib/deck/deck-service";

/** Convenience singleton — prefer injecting DeckCardService in new code. */
export function getDeckCardService() {
  return deckCardServiceSingleton;
}
