/**
 * Deck card service — full API lives in deck-service; this module re-exports
 * for the Phase 5 file map and adds a dedicated entry point.
 */
export {
  DeckCardService,
  deckCardService,
  type AddCardToDeckInput,
  type AddCardToDeckResult,
} from "@/lib/deck/deck-service";
