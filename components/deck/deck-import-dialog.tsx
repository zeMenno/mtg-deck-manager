"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import {
  importCsvDeck,
  importDeckJson,
  importTextDecklist,
} from "@/lib/import-export/import-deck";
import { readFileAsText, readJsonFile } from "@/lib/import-export/read-file";
import type { ImportResult } from "@/lib/import-export/types";

export type DeckImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function summarizeResult(result: ImportResult): string {
  const base = `Imported ${result.deckName ?? "deck"} (${result.added} cards)`;
  if (result.unresolved.length === 0) return base;
  return `${base}. ${result.unresolved.length} cards not found.`;
}

export function DeckImportDialog({
  open,
  onOpenChange,
}: DeckImportDialogProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setPending(true);
    setProgress(null);
    try {
      const name = file.name.toLowerCase();
      let result: ImportResult;

      if (name.endsWith(".json") || file.type === "application/json") {
        const json = await readJsonFile(file);
        result = await importDeckJson(json, { renameOnCollision: true });
      } else if (name.endsWith(".csv") || file.type === "text/csv") {
        const text = await readFileAsText(file);
        result = await importCsvDeck(text, {
          onProgress: (p) =>
            setProgress(`Resolving ${p.resolved + p.failed}/${p.total}…`),
        });
      } else {
        const text = await readFileAsText(file);
        result = await importTextDecklist(text, {
          onProgress: (p) =>
            setProgress(`Resolving ${p.resolved + p.failed}/${p.total}…`),
        });
      }

      toast.success(summarizeResult(result));
      onOpenChange(false);
      if (result.deckId) {
        router.push(`/decks/${result.deckId}`);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
      setProgress(null);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" data-testid="deck-import-dialog">
        <SheetHeader>
          <SheetTitle>Import deck</SheetTitle>
          <SheetDescription>
            JSON deck export, text decklist, or CSV.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-2">
          {progress ? (
            <p className="font-mono text-xs uppercase">{progress}</p>
          ) : null}
          <input
            ref={fileRef}
            type="file"
            accept=".json,.txt,.csv,application/json,text/plain,text/csv"
            className="sr-only"
            data-testid="deck-import-input"
            onChange={(e) => void handleFile(e.target.files?.[0])}
          />
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={pending}
            data-testid="deck-import-pick-file"
            onClick={() => fileRef.current?.click()}
          >
            {pending ? "Importing…" : "Choose file"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
