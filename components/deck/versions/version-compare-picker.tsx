"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { VersionDiffView } from "@/components/deck/versions/version-diff-view";
import { useDeckVersions } from "@/lib/hooks/use-deck-versions";
import { useVersionDiff } from "@/lib/hooks/use-version-diff";

const CURRENT = "current";

export type VersionComparePickerProps = {
  deckId: string;
};

export function VersionComparePicker({ deckId }: VersionComparePickerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { versions, isLoading } = useDeckVersions(deckId);

  const aId = searchParams.get("a") ?? undefined;
  const rawB = searchParams.get("b");
  const bId: string | "current" | undefined =
    rawB === null || rawB === ""
      ? undefined
      : rawB === CURRENT
        ? CURRENT
        : rawB;

  const setParams = useCallback(
    (nextA: string, nextB: string) => {
      const params = new URLSearchParams();
      params.set("a", nextA);
      params.set("b", nextB);
      router.replace(`/decks/${deckId}/versions/compare?${params.toString()}`, {
        scroll: false,
      });
    },
    [deckId, router],
  );

  const defaults = useMemo(() => {
    if (versions.length === 0) return null;
    const first = versions[0]!.id;
    const second = versions[1]?.id ?? CURRENT;
    return { a: first, b: second };
  }, [versions]);

  const resolvedA = aId ?? defaults?.a;
  const resolvedB = bId ?? defaults?.b;

  const {
    diff,
    isLoading: diffLoading,
    error,
  } = useVersionDiff(deckId, resolvedA, resolvedB);

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading versions…</p>;
  }

  if (versions.length === 0) {
    return (
      <p
        className="border-border border p-4 text-sm font-bold"
        data-testid="compare-empty"
      >
        Save at least one version to compare.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="version-compare-picker">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase">
            Version A (baseline)
          </span>
          <select
            data-testid="compare-a-select"
            className="border-input h-11 rounded-md border bg-transparent px-3 text-sm shadow-sm"
            value={resolvedA ?? ""}
            onChange={(e) => {
              const nextA = e.target.value;
              const nextB = resolvedB ?? CURRENT;
              if (nextA && nextB) setParams(nextA, nextB);
            }}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-xs uppercase">
            Version B (target)
          </span>
          <select
            data-testid="compare-b-select"
            className="border-input h-11 rounded-md border bg-transparent px-3 text-sm shadow-sm"
            value={resolvedB ?? ""}
            onChange={(e) => {
              const nextB = e.target.value;
              const nextA = resolvedA ?? versions[0]!.id;
              if (nextA && nextB) setParams(nextA, nextB);
            }}
          >
            <option value={CURRENT}>Current deck</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {resolvedA && resolvedB && resolvedA === resolvedB ? (
        <p className="text-muted-foreground text-sm">
          Pick two different versions to compare.
        </p>
      ) : null}

      {diffLoading ? (
        <p className="font-mono text-sm uppercase">Computing diff…</p>
      ) : null}

      {error ? (
        <p className="text-destructive text-sm font-bold">{error.message}</p>
      ) : null}

      {diff ? <VersionDiffView deckId={deckId} diff={diff} /> : null}
    </div>
  );
}
