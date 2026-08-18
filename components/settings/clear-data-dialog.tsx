"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { clearAllData } from "@/lib/import-export/clear-all-data";
import { exportAndDownloadFullBackup } from "@/lib/import-export/export-full-backup";

export type ClearDataDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCleared?: () => void;
};

export function ClearDataDialog({
  open,
  onOpenChange,
  onCleared,
}: ClearDataDialogProps) {
  const [pending, setPending] = useState(false);
  const [understood, setUnderstood] = useState(false);
  const [step, setStep] = useState<"main" | "confirm-delete">("main");

  function reset() {
    setPending(false);
    setUnderstood(false);
    setStep("main");
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleExportAndContinue() {
    setPending(true);
    try {
      const result = await exportAndDownloadFullBackup();
      if (result === "cancelled") {
        toast.message("Export cancelled — data not cleared");
        return;
      }
      await clearAllData();
      toast.success("Backup saved and all data cleared");
      handleOpenChange(false);
      onCleared?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setPending(false);
    }
  }

  async function handleDeleteWithoutExport() {
    if (!understood) return;
    setPending(true);
    try {
      await clearAllData();
      toast.success("All data cleared");
      handleOpenChange(false);
      onCleared?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Clear failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" data-testid="clear-data-dialog">
        <SheetHeader>
          <SheetTitle>Clear all data?</SheetTitle>
          <SheetDescription>
            This permanently removes all decks on this device.
          </SheetDescription>
        </SheetHeader>

        {step === "main" ? (
          <div className="flex flex-col gap-3 px-4 pb-2">
            <p className="text-sm font-bold">Export a backup first.</p>
            <SheetFooter className="px-0">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => handleOpenChange(false)}
                data-testid="clear-cancel-btn"
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={pending}
                data-testid="clear-export-continue-btn"
                onClick={() => void handleExportAndContinue()}
              >
                {pending ? "Working…" : "Export & Continue"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending}
                data-testid="clear-without-export-btn"
                onClick={() => setStep("confirm-delete")}
              >
                Delete Without Export
              </Button>
            </SheetFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-3 px-4 pb-2">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                className="border-border mt-1 size-5 border-2"
                checked={understood}
                onChange={(e) => setUnderstood(e.target.checked)}
                data-testid="clear-understand-checkbox"
              />
              <span>
                I understand this cannot be undone and I have no backup.
              </span>
            </label>
            <SheetFooter className="px-0">
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={() => setStep("main")}
              >
                Back
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={pending || !understood}
                data-testid="clear-confirm-delete-btn"
                onClick={() => void handleDeleteWithoutExport()}
              >
                {pending ? "Deleting…" : "Delete forever"}
              </Button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
