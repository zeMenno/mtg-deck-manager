"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  applyChanges,
  demoteAddToConsider,
  dismissConsider,
  linkReplacement,
  markCurrentAsCut,
  promoteConsiderToAdd,
  promoteDemoteService,
  revertCutToCurrent,
  unlinkReplacement,
  type ApplyChangesResult,
  type OnApplyComplete,
} from "@/lib/deck/changes";
import { deckKeys } from "@/lib/deck/deck-queries";

function invalidateChangeQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  deckId: string,
) {
  void queryClient.invalidateQueries({ queryKey: deckKeys.all });
  void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.cards(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.stats(deckId) });
  void queryClient.invalidateQueries({
    queryKey: deckKeys.stats(deckId, "projected"),
  });
  void queryClient.invalidateQueries({ queryKey: deckKeys.warnings(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.changes(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.projected(deckId) });
}

export function useApplyChanges(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options?: { onApplyComplete?: OnApplyComplete }) =>
      applyChanges(deckId, options),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useLinkReplacement(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      addDeckCardId,
      cutDeckCardId,
    }: {
      addDeckCardId: string;
      cutDeckCardId: string;
    }) => linkReplacement(addDeckCardId, cutDeckCardId),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useUnlinkReplacement(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (addDeckCardId: string) => unlinkReplacement(addDeckCardId),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function usePromoteConsider(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCardId: string) => promoteConsiderToAdd(deckCardId),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useDemoteAdd(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCardId: string) => demoteAddToConsider(deckCardId),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useMarkCut(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCardId: string) => markCurrentAsCut(deckCardId),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useRevertCut(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCardId: string) => revertCutToCurrent(deckCardId),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useDismissConsider(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCardId: string) => dismissConsider(deckCardId),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useBulkPromoteConsider(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCardIds: string[]) =>
      promoteDemoteService.bulkPromoteConsiderToAdd(deckCardIds),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export function useBulkDismissConsider(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (deckCardIds: string[]) =>
      promoteDemoteService.bulkDismissConsider(deckCardIds),
    onSuccess: () => invalidateChangeQueries(queryClient, deckId),
  });
}

export type { ApplyChangesResult };
