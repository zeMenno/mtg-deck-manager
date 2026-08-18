"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { downloadDeckExport } from "@/lib/import-export/export-deck";
import type { DeckExportFormat } from "@/lib/import-export/types";

export type DeckExportMenuProps = {
  deckId: string;
  deckName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const FORMATS: Array<{ format: DeckExportFormat; label: string }> = [
  { format: "json", label: "JSON" },
  { format: "text", label: "Text list" },
  { format: "csv", label: "CSV" },
];

export function DeckExportMenu({
  deckId,
  deckName,
  open,
  onOpenChange,
}: DeckExportMenuProps) {
  const [pending, setPending] = useState<DeckExportFormat | null>(null);

  async function handleExport(format: DeckExportFormat) {
    setPending(format);
    try {
      const result = await downloadDeckExport(deckId, format);
      if (result === "cancelled") {
        toast.message("Export cancelled");
        return;
      }
      toast.success(`Exported ${deckName} as ${format.toUpperCase()}`);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" data-testid="deck-export-menu">
        <SheetHeader>
          <SheetTitle>Export deck</SheetTitle>
          <SheetDescription>{deckName}</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4 pb-6">
          {FORMATS.map(({ format, label }) => (
            <Button
              key={format}
              type="button"
              variant="outline"
              disabled={pending !== null}
              data-testid={`deck-export-${format}`}
              onClick={() => void handleExport(format)}
            >
              {pending === format ? "Exporting…" : label}
            </Button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
