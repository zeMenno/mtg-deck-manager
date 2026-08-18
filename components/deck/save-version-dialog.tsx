"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MAX_VERSIONS_PER_DECK } from "@/lib/versions/constants";
import { VersionLimitError } from "@/lib/versions/types";
import {
  useDeckVersions,
  useSaveVersion,
  useSuggestedVersionName,
} from "@/lib/hooks/use-deck-versions";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckStats } from "@/lib/hooks/use-deck-stats";

export type SaveVersionDialogProps = {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: (versionId: string) => void;
};

export function SaveVersionDialog({
  deckId,
  open,
  onOpenChange,
  onSaved,
}: SaveVersionDialogProps) {
  const { deck } = useDeck(deckId);
  const { stats } = useDeckStats(deckId, "current");
  const { versions } = useDeckVersions(deckId);
  const { data: suggestedName } = useSuggestedVersionName(
    open ? deckId : undefined,
  );
  const saveVersion = useSaveVersion(deckId);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [limitPrompt, setLimitPrompt] = useState(false);

  useEffect(() => {
    if (open) {
      setName(suggestedName ?? "");
      setNotes("");
      setLimitPrompt(false);
    }
  }, [open, suggestedName]);

  const cardCount = stats?.counts.total ?? 0;
  const atLimit = versions.length >= MAX_VERSIONS_PER_DECK;

  async function handleSave(pruneOldest: boolean) {
    try {
      const version = await saveVersion.mutateAsync({
        name,
        notes: notes.trim() || undefined,
        pruneOldest,
      });
      toast.success("Version saved");
      setLimitPrompt(false);
      onOpenChange(false);
      onSaved?.(version.id);
    } catch (err) {
      if (err instanceof VersionLimitError) {
        setLimitPrompt(true);
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Failed to save version",
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="overflow-y-auto"
        data-testid="save-version-dialog"
      >
        <SheetHeader>
          <SheetTitle>Save version</SheetTitle>
          <SheetDescription>
            {cardCount} cards · {deck?.format ?? "deck"}
            {atLimit
              ? ` · ${MAX_VERSIONS_PER_DECK} version limit reached`
              : null}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-2">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase">Name</span>
            <Input
              data-testid="version-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="v1 — Original"
              autoFocus
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-xs uppercase">
              Notes (optional)
            </span>
            <textarea
              data-testid="version-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="border-input shadow-brutal-sm min-h-20 w-full rounded-none border-2 bg-transparent px-3 py-2 text-base outline-none md:text-sm"
              placeholder="Playtest notes…"
            />
          </label>

          {limitPrompt ? (
            <p
              className="border-border bg-destructive/10 text-destructive border-2 p-3 text-sm font-bold"
              data-testid="version-limit-warning"
            >
              This deck already has {MAX_VERSIONS_PER_DECK} versions. Delete the
              oldest version to save this one, or cancel.
            </p>
          ) : null}
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            disabled={saveVersion.isPending}
            onClick={() => onOpenChange(false)}
            data-testid="save-version-cancel"
          >
            Cancel
          </Button>
          {limitPrompt ? (
            <Button
              type="button"
              disabled={saveVersion.isPending || !name.trim()}
              onClick={() => void handleSave(true)}
              data-testid="save-version-prune-btn"
            >
              {saveVersion.isPending ? "Saving…" : "Delete oldest & save"}
            </Button>
          ) : (
            <Button
              type="button"
              disabled={saveVersion.isPending || !name.trim()}
              onClick={() => void handleSave(false)}
              data-testid="save-version-confirm"
            >
              {saveVersion.isPending ? "Saving…" : "Save version"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
