"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { deckKeys } from "@/lib/deck/deck-queries";
import type {
  ExistingDeckConflictPolicy,
  ImportIntoDeckNewStatus,
  ImportIntoDeckPreview,
} from "@/lib/import-export/import-into-deck";
import {
  applyImportIntoDeck,
  previewImportIntoDeck,
} from "@/lib/import-export/import-into-deck";
import { readFileAsText } from "@/lib/import-export/read-file";

type DeckImportIntoSheetProps = {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const POLICIES: Array<{ value: ExistingDeckConflictPolicy; label: string }> = [
  { value: "skip-existing", label: "Skip cards already in the deck" },
  {
    value: "add-even-if-present",
    label: "Add as consider even if present",
  },
  {
    value: "replace-printing",
    label: "Replace printing when SET + number is given",
  },
];

const STATUSES: Array<{ value: ImportIntoDeckNewStatus; label: string }> = [
  { value: "consider", label: "Consider" },
  { value: "add", label: "Add" },
  { value: "current", label: "Current" },
];

export function DeckImportIntoSheet({
  deckId,
  open,
  onOpenChange,
}: DeckImportIntoSheetProps) {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [policy, setPolicy] =
    useState<ExistingDeckConflictPolicy>("skip-existing");
  const [newStatus, setNewStatus] =
    useState<ImportIntoDeckNewStatus>("consider");
  const [applyCategoriesOnReplace, setApplyCategoriesOnReplace] =
    useState(false);
  const [preview, setPreview] = useState<ImportIntoDeckPreview | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  function reset() {
    setText("");
    setPreview(null);
    setProgress(null);
    setPending(false);
    setPolicy("skip-existing");
    setNewStatus("consider");
    setApplyCategoriesOnReplace(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handlePreview() {
    if (!text.trim()) {
      toast.error("Paste a decklist first");
      return;
    }
    setPending(true);
    setProgress(null);
    try {
      const result = await previewImportIntoDeck(text, deckId, {
        policy,
        newStatus,
        applyCategoriesOnReplace,
        onProgress: (p) =>
          setProgress(`Resolving cards ${p.resolved + p.failed}/${p.total}…`),
      });
      setPreview(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not parse list");
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  async function handleApply() {
    if (!text.trim()) return;
    setPending(true);
    try {
      const result = await applyImportIntoDeck(text, deckId, {
        policy,
        newStatus,
        applyCategoriesOnReplace,
        onProgress: (p) =>
          setProgress(`Importing ${p.resolved + p.failed}/${p.total}…`),
      });
      void queryClient.invalidateQueries({ queryKey: deckKeys.all });
      const extra =
        result.unresolved.length > 0
          ? ` ${result.unresolved.length} unresolved.`
          : "";
      toast.success(
        `Imported ${result.added} new card${result.added === 1 ? "" : "s"}.${extra}`,
      );
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        snap="tall"
        className="overflow-y-auto"
        data-testid="deck-import-into-sheet"
      >
        <SheetHeader>
          <SheetTitle>Import cards</SheetTitle>
          <SheetDescription>
            Paste Arena, Moxfield, or Archidekt text into this deck. New cards
            default to Consider so your current list is not overwritten.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-6">
          <textarea
            data-testid="import-into-textarea"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setPreview(null);
            }}
            rows={8}
            disabled={pending}
            placeholder={`1x Sol Ring (c21) 263 *F* [Ramp] ^Buy,#0066ff^\n1 Arcane Signet`}
            className="border-border bg-background min-h-44 w-full rounded-md border p-3 font-mono text-sm shadow-sm"
          />

          <input
            ref={fileRef}
            type="file"
            accept=".txt,text/plain"
            className="sr-only"
            data-testid="import-into-file"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              void readFileAsText(file)
                .then((contents) => {
                  setText(contents);
                  setPreview(null);
                })
                .catch((err: unknown) => {
                  toast.error(
                    err instanceof Error ? err.message : "Could not read file",
                  );
                });
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => fileRef.current?.click()}
          >
            Choose text file
          </Button>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-mono text-xs uppercase">
              New card status
            </legend>
            <div className="flex flex-wrap gap-2">
              {STATUSES.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={newStatus === option.value ? "default" : "outline"}
                  disabled={pending}
                  data-testid={`import-status-${option.value}`}
                  onClick={() => setNewStatus(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="font-mono text-xs uppercase">
              If a card is already in this deck
            </legend>
            <div className="flex flex-col gap-2">
              {POLICIES.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  className="h-auto min-h-11 justify-start py-2 text-left whitespace-normal"
                  variant={policy === option.value ? "default" : "outline"}
                  disabled={pending}
                  data-testid={`import-policy-${option.value}`}
                  onClick={() => setPolicy(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </fieldset>

          {policy === "replace-printing" ? (
            <Button
              type="button"
              size="sm"
              variant={applyCategoriesOnReplace ? "default" : "outline"}
              disabled={pending}
              data-testid="import-apply-categories"
              onClick={() => setApplyCategoriesOnReplace((value) => !value)}
            >
              Also apply matched categories
            </Button>
          ) : null}

          {progress ? (
            <p className="font-mono text-xs uppercase" role="status">
              {progress}
            </p>
          ) : null}

          {preview ? (
            <div
              className="border-border bg-card flex flex-col gap-2 rounded-md border p-3 text-sm shadow-sm"
              data-testid="import-into-preview"
            >
              <p className="font-bold">
                {preview.newRows.length} new · {preview.skipped.length} already
                in deck · {preview.unresolved.length} unresolved
                {preview.replaceRows.length > 0
                  ? ` · ${preview.replaceRows.length} printing swaps`
                  : ""}
              </p>
              {preview.maybeboardCount > 0 ? (
                <p className="text-muted-foreground">
                  {preview.maybeboardCount} maybeboard line
                  {preview.maybeboardCount === 1 ? "" : "s"} will use the
                  maybeboard zone.
                </p>
              ) : null}
              {preview.ignoredCategories.length > 0 ? (
                <p className="text-muted-foreground">
                  Ignored categor
                  {preview.ignoredCategories.length === 1 ? "y" : "ies"}:{" "}
                  {preview.ignoredCategories.join(", ")}
                </p>
              ) : null}
              {preview.unresolved.length > 0 ? (
                <ul className="text-muted-foreground list-inside list-disc">
                  {preview.unresolved.slice(0, 8).map((row) => (
                    <li key={`${row.line}-${row.name}`}>{row.name}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            data-testid="import-into-preview-btn"
            disabled={pending || !text.trim()}
            onClick={() => void handlePreview()}
          >
            {pending && !preview ? "Resolving…" : "Preview"}
          </Button>
          <Button
            type="button"
            data-testid="import-into-confirm-btn"
            disabled={pending || !preview}
            onClick={() => void handleApply()}
          >
            {pending && preview ? "Importing…" : "Import into this deck"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/decks/new" data-testid="import-create-new-deck">
              Create a new deck instead
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
