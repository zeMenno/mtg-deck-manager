"use client";

import type { VersionDiff } from "@/lib/versions/types";

export type VersionDiffSummaryProps = {
  diff: VersionDiff;
};

export function VersionDiffSummary({ diff }: VersionDiffSummaryProps) {
  const { summary } = diff;
  return (
    <div
      className="border-border bg-card rounded-md border p-3 font-mono text-sm shadow-sm"
      data-testid="version-diff-summary"
    >
      <span className="text-status-add">+ {summary.addedCount} cards</span>
      <span className="mx-2">·</span>
      <span className="text-status-cut">− {summary.removedCount} cards</span>
      <span className="mx-2">·</span>
      <span className="text-status-consider">
        {summary.quantityChangeCount} qty changes
      </span>
      {summary.statusChangeCount > 0 ? (
        <>
          <span className="mx-2">·</span>
          <span className="text-status-commander">
            {summary.statusChangeCount} status
          </span>
        </>
      ) : null}
    </div>
  );
}
