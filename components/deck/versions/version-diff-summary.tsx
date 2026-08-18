"use client";

import type { VersionDiff } from "@/lib/versions/types";

export type VersionDiffSummaryProps = {
  diff: VersionDiff;
};

export function VersionDiffSummary({ diff }: VersionDiffSummaryProps) {
  const { summary } = diff;
  return (
    <div
      className="border-border bg-card shadow-brutal-sm border-2 p-3 font-mono text-sm"
      data-testid="version-diff-summary"
    >
      <span className="text-green-700">+ {summary.addedCount} cards</span>
      <span className="mx-2">·</span>
      <span className="text-red-700">− {summary.removedCount} cards</span>
      <span className="mx-2">·</span>
      <span className="text-yellow-700">
        {summary.quantityChangeCount} qty changes
      </span>
      {summary.statusChangeCount > 0 ? (
        <>
          <span className="mx-2">·</span>
          <span className="text-blue-700">
            {summary.statusChangeCount} status
          </span>
        </>
      ) : null}
    </div>
  );
}
