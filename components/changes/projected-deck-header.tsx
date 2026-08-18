"use client";

import type { ProjectedDeckCounts } from "@/lib/deck/changes/projected-deck";

type ProjectedDeckHeaderProps = {
  counts: ProjectedDeckCounts;
  target?: number;
};

export function ProjectedDeckHeader({
  counts,
  target = 100,
}: ProjectedDeckHeaderProps) {
  const ok = counts.projectedQuantity === target;

  return (
    <div
      className="border-border bg-card flex flex-col gap-2 border-2 p-4"
      data-testid="projected-deck-header"
    >
      <p className="font-mono text-xs uppercase">
        Current {counts.currentQuantity} + Add {counts.addQuantity} − Cut{" "}
        {counts.cutQuantity} = Projected {counts.projectedQuantity}
      </p>
      <p
        className={
          ok
            ? "font-bold text-green-700 dark:text-green-400"
            : "font-bold text-amber-700 dark:text-amber-400"
        }
        data-testid="projected-deck-count"
      >
        {counts.projectedQuantity}/{target} projected
        {ok ? " ✓" : ""}
      </p>
    </div>
  );
}
