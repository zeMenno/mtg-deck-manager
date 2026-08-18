/**
 * Deck validation service — validates current / projected decks.
 */

import {
  getCommanderCurrentWarnings,
  getCommanderProjectedWarnings,
} from "@/lib/format/commander-rules";
import { getFormatRules } from "@/lib/format/format-rules-factory";
import { buildProjectedDeck } from "@/lib/format/projected-deck-builder";
import {
  hasLegalityErrors,
  summarizeWarnings,
} from "@/lib/format/warning-utils";
import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import { recommendationConfigService } from "@/lib/services/recommendation-config-service";
import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";
import type {
  CardLookup,
  DeckValidationSummary,
  DeckWarning,
  RecommendationConfig,
} from "@/types/deck-validation";

export type ValidateDeckInput = {
  deck: Deck;
  deckCards: DeckCard[];
  cards?: Card[] | Map<string, Card>;
  config?: RecommendationConfig;
};

function toLookup(cards?: Card[] | Map<string, Card>): CardLookup {
  if (!cards) {
    return () => undefined;
  }
  const map =
    cards instanceof Map ? cards : new Map(cards.map((c) => [c.id, c]));
  return (id) => map.get(id);
}

export class DeckValidationService {
  constructor(private readonly database?: DeckBuilderDatabase) {}

  private deckRepo() {
    return new DeckRepository(this.database ?? getDatabase());
  }

  private deckCardRepo() {
    return new DeckCardRepository(this.database ?? getDatabase());
  }

  validateSync(input: ValidateDeckInput): DeckWarning[] {
    const lookup = toLookup(input.cards);
    const config = input.config;
    const rules = getFormatRules(input.deck.format);
    if (input.deck.format === "commander") {
      return getCommanderCurrentWarnings(
        input.deck,
        input.deckCards,
        lookup,
        config,
      );
    }
    return rules.getDeckWarnings(input.deck, input.deckCards, lookup, config);
  }

  validateProjectedSync(input: ValidateDeckInput): DeckWarning[] {
    const lookup = toLookup(input.cards);
    const config = input.config;
    if (input.deck.format === "commander") {
      return getCommanderProjectedWarnings(
        input.deck,
        input.deckCards,
        lookup,
        config,
      );
    }
    const projected = buildProjectedDeck(input.deckCards);
    return getFormatRules(input.deck.format).getProjectedWarnings(
      input.deck,
      projected,
      lookup,
      config,
    );
  }

  async validateCurrent(deckId: string): Promise<DeckWarning[]> {
    const { deck, deckCards, cards, config } = await this.loadContext(deckId);
    if (!deck) return [];
    return this.validateSync({ deck, deckCards, cards, config });
  }

  async validateProjected(deckId: string): Promise<DeckWarning[]> {
    const { deck, deckCards, cards, config } = await this.loadContext(deckId);
    if (!deck) return [];
    return this.validateProjectedSync({ deck, deckCards, cards, config });
  }

  hasLegalityErrors(warnings: DeckWarning[]): boolean {
    return hasLegalityErrors(warnings);
  }

  getSummary(warnings: DeckWarning[]): DeckValidationSummary {
    return summarizeWarnings(warnings);
  }

  private async loadContext(deckId: string) {
    const deck = await this.deckRepo().getById(deckId);
    if (!deck) {
      return {
        deck: null,
        deckCards: [] as DeckCard[],
        cards: [] as Card[],
        config: await recommendationConfigService.get(),
      };
    }
    const deckCards = await this.deckCardRepo().listByDeck(deckId);
    const cards = await getCardsByIdsBatched(deckCards.map((c) => c.cardId));
    const config = await recommendationConfigService.get();
    return { deck, deckCards, cards, config };
  }
}

export const deckValidationService = new DeckValidationService();
