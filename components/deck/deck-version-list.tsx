"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";

import { DeckVersionRow } from "@/components/deck/deck-version-row";
import { RestoreVersionDialog } from "@/components/deck/restore-version-dialog";
import { SaveVersionDialog } from "@/components/deck/save-version-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { useDeck } from "@/lib/hooks/use-deck";
import {
  useDeckVersions,
  useDeleteVersion,
  useRenameVersion,
} from "@/lib/hooks/use-deck-versions";
import type { DeckVersion } from "@/types/deck";

export type DeckVersionListProps = {
  deckId: string;
};

export function DeckVersionList({ deckId }: DeckVersionListProps) {
  const { deck } = useDeck(deckId);
  const { versions, isLoading } = useDeckVersions(deckId);
  const deleteVersion = useDeleteVersion(deckId);
  const renameVersion = useRenameVersion(deckId);

  const [saveOpen, setSaveOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<DeckVersion | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeckVersion | null>(null);
  const [renameTarget, setRenameTarget] = useState<DeckVersion | null>(null);
  const [renameName, setRenameName] = useState("");
  const [renameNotes, setRenameNotes] = useState("");

  if (isLoading) {
    return (
      <p className="font-mono text-sm uppercase" data-testid="versions-loading">
        Loading versions…
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="deck-version-list">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="save-version-btn"
          onClick={() => setSaveOpen(true)}
        >
          Save version
        </Button>
        <Button asChild variant="outline" data-testid="compare-versions-btn">
          <Link href={`/decks/${deckId}/versions/compare`}>Compare</Link>
        </Button>
      </div>

      {versions.length === 0 ? (
        <div
          className="border-border flex flex-col gap-3 border p-6"
          data-testid="versions-empty"
        >
          <p className="font-bold">No saved versions yet</p>
          <p className="text-muted-foreground text-sm">
            Save a named snapshot before experimenting so you can restore or
            compare later.
          </p>
          <Button
            type="button"
            data-testid="versions-empty-save"
            onClick={() => setSaveOpen(true)}
          >
            Save first version
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {versions.map((version) => (
            <li key={version.id}>
              <DeckVersionRow
                deckId={deckId}
                version={version}
                isActive={deck?.activeVersionId === version.id}
                onRestore={setRestoreTarget}
                onRename={(v) => {
                  setRenameTarget(v);
                  setRenameName(v.name);
                  setRenameNotes(v.notes ?? "");
                }}
                onDelete={setDeleteTarget}
              />
            </li>
          ))}
        </ul>
      )}

      <SaveVersionDialog
        deckId={deckId}
        open={saveOpen}
        onOpenChange={setSaveOpen}
      />

      <RestoreVersionDialog
        deckId={deckId}
        version={restoreTarget}
        open={Boolean(restoreTarget)}
        onOpenChange={(open) => {
          if (!open) setRestoreTarget(null);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Delete version?"
        description={`Delete “${deleteTarget?.name ?? ""}” permanently? This cannot be undone.`}
        confirmLabel="Delete"
        destructive
        pending={deleteVersion.isPending}
        testId="delete-version-confirm"
        onConfirm={async () => {
          if (!deleteTarget) return;
          await deleteVersion.mutateAsync(deleteTarget.id);
          toast.success("Version deleted");
          setDeleteTarget(null);
        }}
      />

      <Sheet
        open={Boolean(renameTarget)}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      >
        <SheetContent side="bottom" data-testid="rename-version-dialog">
          <SheetHeader>
            <SheetTitle>Rename version</SheetTitle>
            <SheetDescription>
              Updates the label only — the snapshot stays the same.
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-3 px-4">
            <Input
              data-testid="rename-version-name"
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
            />
            <textarea
              data-testid="rename-version-notes"
              value={renameNotes}
              onChange={(e) => setRenameNotes(e.target.value)}
              rows={3}
              className="border-input min-h-20 w-full rounded-md border bg-transparent px-3 py-2 text-base shadow-sm outline-none md:text-sm"
              placeholder="Notes…"
            />
          </div>
          <SheetFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setRenameTarget(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={renameVersion.isPending || !renameName.trim()}
              data-testid="rename-version-save"
              onClick={() => {
                if (!renameTarget) return;
                void renameVersion
                  .mutateAsync({
                    versionId: renameTarget.id,
                    name: renameName,
                    notes: renameNotes,
                  })
                  .then(() => {
                    toast.success("Version renamed");
                    setRenameTarget(null);
                  })
                  .catch((err: unknown) => {
                    toast.error(
                      err instanceof Error ? err.message : "Rename failed",
                    );
                  });
              }}
            >
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
