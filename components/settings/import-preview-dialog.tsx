"use client";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { AppBackup } from "@/lib/import-export/types";

export type ImportPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  backup: AppBackup | null;
  existingDeckCount: number;
  pending?: boolean;
  onConfirm: () => void | Promise<void>;
};

export function ImportPreviewDialog({
  open,
  onOpenChange,
  backup,
  existingDeckCount,
  pending = false,
  onConfirm,
}: ImportPreviewDialogProps) {
  if (!backup) return null;

  const deckNames = backup.data.decks.map((d) => d.name);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" data-testid="import-preview-dialog">
        <SheetHeader>
          <SheetTitle>Import backup?</SheetTitle>
          <SheetDescription>
            Exported {new Date(backup.exportedAt).toLocaleString()} · schema v
            {backup.appSchemaVersion} · backup v{backup.backupVersion}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          <p className="text-sm font-bold">
            {backup.metadata.deckCount} decks · {backup.metadata.cardCount}{" "}
            cards · {backup.metadata.wishlistItemCount} wishlist
          </p>

          {existingDeckCount > 0 ? (
            <p
              className="border-border bg-destructive/10 text-destructive border p-3 text-sm font-bold"
              data-testid="import-replace-warning"
            >
              This replaces {existingDeckCount} existing deck
              {existingDeckCount === 1 ? "" : "s"} on this device.
            </p>
          ) : null}

          <div
            className="border-border max-h-40 overflow-y-auto border p-2"
            data-testid="import-deck-list"
          >
            {deckNames.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No decks in backup
              </p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {deckNames.map((name) => (
                  <li key={name} className="font-bold">
                    {name}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
            data-testid="import-preview-cancel"
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            data-testid="import-preview-confirm"
            onClick={() => {
              void Promise.resolve(onConfirm());
            }}
          >
            {pending ? "Importing…" : "Replace all data"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
