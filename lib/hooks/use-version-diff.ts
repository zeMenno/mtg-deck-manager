"use client";

import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import { fetchVersionDiff, versionKeys } from "@/lib/versions/version-queries";

export function useVersionDiff(
  deckId: string | undefined,
  aId: string | undefined,
  bId: string | "current" | undefined,
) {
  const { ready } = useDatabase();
  const enabled =
    ready && Boolean(deckId) && Boolean(aId) && Boolean(bId) && aId !== bId;

  const query = useQuery({
    queryKey: versionKeys.diff(aId ?? "", bId ?? ""),
    queryFn: () => fetchVersionDiff(aId!, bId!, deckId!),
    enabled,
  });

  return {
    diff: query.data,
    isLoading: enabled && query.isLoading,
    isError: query.isError,
    error: query.error instanceof Error ? query.error : null,
  };
}
