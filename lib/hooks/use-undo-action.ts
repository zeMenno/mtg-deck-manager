"use client";

import { useUndo, type UndoAction } from "@/components/shared/undo-provider";

/**
 * Convenience hook for reversible actions.
 * Prefer capturing pre-action state in the undo closure.
 */
export function useUndoAction() {
  const { showUndo, dismiss, current } = useUndo();

  return {
    showUndo: (action: Omit<UndoAction, "id"> & { id?: string }) =>
      showUndo(action),
    dismiss,
    current,
  };
}
