"use client";

import { Button } from "@/components/ui/button";
import type { UndoAction } from "@/components/shared/undo-provider";
import { cn } from "@/lib/utils";

type UndoSnackbarProps = {
  action: UndoAction | null;
  onUndo: () => void;
  onDismiss: () => void;
  onPause: () => void;
  onResume: () => void;
};

/**
 * Fixed snackbar above bottom nav. Respects safe-area via bottom-above-nav.
 */
export function UndoSnackbar({
  action,
  onUndo,
  onDismiss,
  onPause,
  onResume,
}: UndoSnackbarProps) {
  if (!action) return null;

  return (
    <div
      role="status"
      data-testid="undo-snackbar"
      className={cn(
        "border-border bg-foreground text-background shadow-brutal",
        "fixed inset-x-4 z-[60] mx-auto flex max-w-3xl items-center gap-3 border-4 px-4 py-3",
        "bottom-above-nav",
      )}
      onMouseEnter={onPause}
      onMouseLeave={onResume}
      onFocus={onPause}
      onBlur={onResume}
    >
      <p className="min-w-0 flex-1 text-sm font-bold">{action.message}</p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        data-testid="undo-snackbar-btn"
        className="font-mono tracking-wide"
        onClick={onUndo}
      >
        UNDO
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Dismiss"
        data-testid="undo-snackbar-dismiss"
        className="text-background hover:bg-background/20 hover:text-background"
        onClick={onDismiss}
      >
        ×
      </Button>
    </div>
  );
}
