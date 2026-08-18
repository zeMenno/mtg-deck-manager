"use client";

import { useMemo } from "react";

import { deckValidationService } from "@/lib/services/deck-validation-service";
import type { StatsMode } from "@/lib/deck/stats";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useRecommendationConfig } from "@/lib/hooks/use-recommendation-config";
import type { DeckWarning } from "@/types/deck-validation";

export function useDeckWarnings(
  deckId: string | undefined,
  mode: StatsMode = "current",
): {
  warnings: DeckWarning[];
  issues: DeckWarning[];
  passes: DeckWarning[];
  summary: ReturnType<typeof deckValidationService.getSummary>;
  isLoading: boolean;
} {
  const { deck, isLoading: deckLoading } = useDeck(deckId);
  const { cards, isLoading: cardsLoading } = useDeckCards(deckId);
  const { config, hydrated } = useRecommendationConfig();

  const isLoading = deckLoading || cardsLoading || !hydrated;

  const warnings = useMemo(() => {
    if (!deck) return [];
    const cardMap = new Map(cards.map((c) => [c.cardId, c.card]));
    const input = {
      deck,
      deckCards: cards,
      cards: cardMap,
      config,
    };
    return mode === "projected"
      ? deckValidationService.validateProjectedSync(input)
      : deckValidationService.validateSync(input);
  }, [deck, cards, config, mode]);

  const issues = useMemo(
    () => warnings.filter((w) => w.severity !== "success"),
    [warnings],
  );
  const passes = useMemo(
    () => warnings.filter((w) => w.severity === "success"),
    [warnings],
  );
  const summary = useMemo(
    () => deckValidationService.getSummary(warnings),
    [warnings],
  );

  return { warnings, issues, passes, summary, isLoading };
}
