/**
 * Pluggable format rules interface — Phase 13.
 */

import type { DeckFormat } from "@/types/index";
import type { Deck, DeckCard } from "@/types/deck";
import type {
  CardLookup,
  DeckWarning,
  ProjectedDeck,
  RecommendationConfig,
} from "@/types/deck-validation";

export interface FormatRules {
  format: DeckFormat;
  getDeckWarnings(
    deck: Deck,
    cards: DeckCard[],
    cardLookup: CardLookup,
    config?: RecommendationConfig,
  ): DeckWarning[];
  getProjectedWarnings(
    deck: Deck,
    projected: ProjectedDeck,
    cardLookup: CardLookup,
    config?: RecommendationConfig,
  ): DeckWarning[];
}
