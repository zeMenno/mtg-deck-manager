"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { SaveVersionDialog } from "@/components/deck/save-version-dialog";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useRestoreVersion } from "@/lib/hooks/use-deck-versions";
import type { DeckVersion } from "@/types/deck";

export type RestoreVersionDialogProps = {
  deckId: string;
  version: DeckVersion | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function RestoreVersionDialog({
  deckId,
  version,
  open,
  onOpenChange,
}: RestoreVersionDialogProps) {
  const router = useRouter();
  const restore = useRestoreVersion(deckId);
  const [saveFirstOpen, setSaveFirstOpen] = useState(false);

  if (!version) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" data-testid="restore-version-dialog">
          <SheetHeader>
            <SheetTitle>Restore version?</SheetTitle>
            <SheetDescription>
              Replace current deck with &ldquo;{version.name}&rdquo;?
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-3 px-4">
            <p className="text-sm">
              Current unsaved changes will be lost. Consider saving a version
              first.
            </p>
            <Button
              type="button"
              variant="outline"
              data-testid="restore-save-first-btn"
              onClick={() => setSaveFirstOpen(true)}
            >
              Save current first
            </Button>
          </div>

          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              disabled={restore.isPending}
              onClick={() => onOpenChange(false)}
              data-testid="restore-cancel-btn"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={restore.isPending}
              data-testid="restore-confirm-btn"
              onClick={() => {
                void restore
                  .mutateAsync(version.id)
                  .then(() => {
                    toast.success(`Restored ${version.name}`);
                    onOpenChange(false);
                    router.push(`/decks/${deckId}`);
                  })
                  .catch((err: unknown) => {
                    toast.error(
                      err instanceof Error ? err.message : "Restore failed",
                    );
                  });
              }}
            >
              {restore.isPending ? "Restoring…" : "Restore"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <SaveVersionDialog
        deckId={deckId}
        open={saveFirstOpen}
        onOpenChange={setSaveFirstOpen}
      />
    </>
  );
}
