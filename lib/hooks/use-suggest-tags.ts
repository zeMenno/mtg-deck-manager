"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deckKeys } from "@/lib/deck/deck-queries";
import {
  applyDeckTagSuggestions,
  previewDeckTagSuggestions,
  type DeckTagSuggestionPreview,
  type SuggestionApplyPolicy,
} from "@/lib/tags/apply-suggestions";

export function useSuggestTags(deckId: string) {
  const queryClient = useQueryClient();

  const preview = useMutation({
    mutationFn: (policy: SuggestionApplyPolicy) =>
      previewDeckTagSuggestions(deckId, policy),
  });

  const apply = useMutation({
    mutationFn: ({
      plan,
      selectedDeckCardIds,
    }: {
      plan: DeckTagSuggestionPreview;
      selectedDeckCardIds: string[];
    }) => applyDeckTagSuggestions(plan, selectedDeckCardIds),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
    },
  });

  return { preview, apply };
}
