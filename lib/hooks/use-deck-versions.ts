"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import { deckKeys } from "@/lib/deck/deck-queries";
import {
  fetchDeckVersion,
  fetchDeckVersions,
  versionKeys,
} from "@/lib/versions/version-queries";
import { versionService } from "@/lib/versions/version-service";
import type { SaveVersionInput } from "@/lib/versions/types";

function invalidateVersionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  deckId: string,
  versionId?: string,
) {
  void queryClient.invalidateQueries({ queryKey: versionKeys.list(deckId) });
  void queryClient.invalidateQueries({ queryKey: versionKeys.all });
  void queryClient.invalidateQueries({ queryKey: deckKeys.detail(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.cards(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.stats(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.warnings(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.changes(deckId) });
  void queryClient.invalidateQueries({ queryKey: deckKeys.projected(deckId) });
  if (versionId) {
    void queryClient.invalidateQueries({
      queryKey: versionKeys.detail(versionId),
    });
  }
}

export function useDeckVersions(deckId: string | undefined) {
  const { ready } = useDatabase();
  const enabled = ready && Boolean(deckId);

  const query = useQuery({
    queryKey: versionKeys.list(deckId ?? ""),
    queryFn: () => fetchDeckVersions(deckId!),
    enabled,
  });

  return {
    versions: query.data ?? [],
    isLoading: !ready || query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
  };
}

export function useDeckVersion(versionId: string | undefined) {
  const { ready } = useDatabase();
  const enabled = ready && Boolean(versionId);

  const query = useQuery({
    queryKey: versionKeys.detail(versionId ?? ""),
    queryFn: () => fetchDeckVersion(versionId!),
    enabled,
  });

  return {
    version: query.data,
    isLoading: !ready || query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
  };
}

export function useSaveVersion(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: SaveVersionInput) =>
      versionService.saveVersion(deckId, input),
    onSuccess: (version) => {
      invalidateVersionQueries(queryClient, deckId, version.id);
    },
  });
}

export function useRestoreVersion(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) =>
      versionService.restoreVersion(deckId, versionId),
    onSuccess: (_void, versionId) => {
      invalidateVersionQueries(queryClient, deckId, versionId);
    },
  });
}

export function useDeleteVersion(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (versionId: string) => versionService.deleteVersion(versionId),
    onSuccess: (_void, versionId) => {
      invalidateVersionQueries(queryClient, deckId, versionId);
    },
  });
}

export function useRenameVersion(deckId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      versionId,
      name,
      notes,
    }: {
      versionId: string;
      name: string;
      notes?: string;
    }) => versionService.renameVersion(versionId, name, notes),
    onSuccess: (version) => {
      invalidateVersionQueries(queryClient, deckId, version.id);
    },
  });
}

export function useSuggestedVersionName(deckId: string | undefined) {
  const { ready } = useDatabase();
  const enabled = ready && Boolean(deckId);

  return useQuery({
    queryKey: [...versionKeys.list(deckId ?? ""), "suggest-name"],
    queryFn: () => versionService.suggestName(deckId!),
    enabled,
  });
}
