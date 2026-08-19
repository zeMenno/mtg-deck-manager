"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { deckKeys } from "@/lib/deck/deck-queries";
import {
  deckCardService,
  deckService,
  type AddCardToDeckInput,
  type CreateDeckInput,
} from "@/lib/deck/deck-service";
import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { Deck, DeckCard } from "@/types/deck";

function invalidateDeckQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  deckId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: deckKeys.all });
  if (deckId) {
    void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
    void queryClient.invalidateQueries({ queryKey: deckKeys.cards(deckId) });
  }
}

export function useCreateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateDeckInput) => deckService.createDeck(input),
    onSuccess: () => invalidateDeckQueries(queryClient),
  });
}

export function useUpdateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Omit<Deck, "id" | "createdAt">>;
    }) => deckService.updateDeck(id, patch),
    onSuccess: (deck) => invalidateDeckQueries(queryClient, deck.id),
  });
}

export function useDeleteDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deckService.deleteDeck(id),
    onSuccess: () => invalidateDeckQueries(queryClient),
  });
}

export function useDuplicateDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, newName }: { id: string; newName?: string }) =>
      deckService.duplicateDeck(id, newName),
    onSuccess: () => invalidateDeckQueries(queryClient),
  });
}

export function useArchiveDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deckService.archiveDeck(id),
    onSuccess: (deck) => invalidateDeckQueries(queryClient, deck.id),
  });
}

export function useUnarchiveDeck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deckService.unarchiveDeck(id),
    onSuccess: (deck) => invalidateDeckQueries(queryClient, deck.id),
  });
}

export function useSetCommander() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ deckId, cardId }: { deckId: string; cardId: string }) =>
      deckService.setCommander(deckId, cardId),
    onSuccess: (deck) => invalidateDeckQueries(queryClient, deck.id),
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, favorite }: { id: string; favorite: boolean }) =>
      deckService.setFavorite(id, favorite),
    onSuccess: (deck) => invalidateDeckQueries(queryClient, deck.id),
  });
}

export function useAddCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: AddCardToDeckInput) =>
      deckCardService.addCardToDeck(input),
    onSuccess: (result) =>
      invalidateDeckQueries(queryClient, result.deckCard.deckId),
  });
}

export function useRemoveCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deckCardId: string) => {
      const removed = await deckCardService.removeCardFromDeck(deckCardId);
      return removed;
    },
    onSuccess: (removed) => {
      if (removed) {
        invalidateDeckQueries(queryClient, removed.deckId);
      }
    },
  });
}

export function useUpdateDeckCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: Partial<Omit<DeckCard, "id" | "deckId" | "addedAt">>;
    }) => deckCardService.updateDeckCard(id, patch),
    onSuccess: (card) => invalidateDeckQueries(queryClient, card.deckId),
  });
}

export function useSetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckCardId,
      status,
    }: {
      deckCardId: string;
      status: DeckCardStatus;
    }) => deckCardService.setStatus(deckCardId, status),
    onMutate: async ({ deckCardId, status }) => {
      await queryClient.cancelQueries({ queryKey: deckKeys.all });
      return { deckCardId, status };
    },
    onSuccess: (card) => invalidateDeckQueries(queryClient, card.deckId),
  });
}

export function useSetQuantity() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckCardId,
      quantity,
    }: {
      deckCardId: string;
      quantity: number;
    }) => deckCardService.updateQuantity(deckCardId, quantity),
    onSuccess: (card) => invalidateDeckQueries(queryClient, card.deckId),
  });
}

export function useSetZone() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckCardId,
      zone,
    }: {
      deckCardId: string;
      zone: DeckCardZone;
    }) => deckCardService.setZone(deckCardId, zone),
    onSuccess: (card) => invalidateDeckQueries(queryClient, card.deckId),
  });
}

export function useBulkSetStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      deckCardIds,
      status,
      deckId,
    }: {
      deckCardIds: string[];
      status: DeckCardStatus;
      deckId: string;
    }) => deckCardService.bulkSetStatus(deckCardIds, status).then(() => deckId),
    onSuccess: (deckId) => invalidateDeckQueries(queryClient, deckId),
  });
}

export function useBulkRemove() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      deckCardIds,
      deckId,
    }: {
      deckCardIds: string[];
      deckId: string;
    }) => {
      const removed = await deckCardService.bulkRemove(deckCardIds);
      return { deckId, removed };
    },
    onSuccess: ({ deckId }) => invalidateDeckQueries(queryClient, deckId),
  });
}

export function useRestoreDeckCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCard: DeckCard) =>
      deckCardService.restoreDeckCard(deckCard),
    onSuccess: (card) => invalidateDeckQueries(queryClient, card.deckId),
  });
}

export function useRestoreDeckCards() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (deckCards: DeckCard[]) => {
      await deckCardService.restoreDeckCards(deckCards);
      return deckCards[0]?.deckId;
    },
    onSuccess: (deckId) => {
      if (deckId) invalidateDeckQueries(queryClient, deckId);
    },
  });
}
