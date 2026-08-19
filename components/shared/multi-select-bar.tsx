"use client";

import { Button } from "@/components/ui/button";

type MultiSelectBarProps = {
  count: number;
  onMarkAdd: () => void;
  onMarkCut: () => void;
  onRemove: () => void;
  onDone: () => void;
};

export function MultiSelectBar({
  count,
  onMarkAdd,
  onMarkCut,
  onRemove,
  onDone,
}: MultiSelectBarProps) {
  return (
    <div
      data-testid="multi-select-bar"
      className="pb-safe border-border bg-background fixed inset-x-0 bottom-[var(--bottom-nav-height)] z-40 border-t px-4 py-3 shadow-md"
    >
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <p className="font-mono text-xs uppercase">{count} selected</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            data-testid="status-add-btn"
            onClick={onMarkAdd}
            disabled={count === 0}
          >
            Mark ADD
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            data-testid="status-cut-btn"
            onClick={onMarkCut}
            disabled={count === 0}
          >
            Mark CUT
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            data-testid="bulk-remove-btn"
            onClick={onRemove}
            disabled={count === 0}
          >
            Remove
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="ml-auto"
            data-testid="multi-select-done-btn"
            onClick={onDone}
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
