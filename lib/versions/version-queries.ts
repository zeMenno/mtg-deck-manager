/**
 * TanStack Query keys and fetchers for deck versions (Phase 11).
 */

import { versionService } from "@/lib/versions/version-service";
import type { VersionDiff } from "@/lib/versions/types";
import type { DeckVersion } from "@/types/deck";

export const versionKeys = {
  all: ["deck-versions"] as const,
  lists: () => [...versionKeys.all, "list"] as const,
  list: (deckId: string) => [...versionKeys.lists(), deckId] as const,
  details: () => [...versionKeys.all, "detail"] as const,
  detail: (versionId: string) => [...versionKeys.details(), versionId] as const,
  diffs: () => [...versionKeys.all, "diff"] as const,
  diff: (aId: string, bId: string) =>
    [...versionKeys.diffs(), aId, bId] as const,
};

export async function fetchDeckVersions(
  deckId: string,
): Promise<DeckVersion[]> {
  return versionService.listVersions(deckId);
}

export async function fetchDeckVersion(
  versionId: string,
): Promise<DeckVersion | undefined> {
  return versionService.getVersion(versionId);
}

export async function fetchVersionDiff(
  aId: string,
  bId: string | "current",
  deckId: string,
): Promise<VersionDiff> {
  if (bId === "current") {
    return versionService.compareVersionToCurrent(deckId, aId);
  }
  return versionService.compareVersions(aId, bId);
}
