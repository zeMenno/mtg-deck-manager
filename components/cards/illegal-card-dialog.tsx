"use client";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { LegalityWarning } from "@/lib/cards/legality";

type IllegalCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warning: LegalityWarning | null;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
};

/** Warn-but-allow confirmation when adding a banned / restricted / not-legal card. */
export function IllegalCardDialog({
  open,
  onOpenChange,
  warning,
  pending,
  onConfirm,
}: IllegalCardDialogProps) {
  if (!warning) return null;

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={warning.title}
      description={warning.message.replace(/\*\*/g, "")}
      confirmLabel="Add anyway"
      cancelLabel="Cancel"
      destructive={warning.kind === "banned"}
      pending={pending}
      onConfirm={onConfirm}
      testId="illegal-card-dialog"
    />
  );
}
