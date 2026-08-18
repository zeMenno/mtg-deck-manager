"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { DeckExportMenu } from "@/components/deck/deck-export-menu";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import {
  useArchiveDeck,
  useDeleteDeck,
  useDuplicateDeck,
  useUnarchiveDeck,
  useUpdateDeck,
} from "@/lib/hooks/use-deck-mutations";
import type { Deck } from "@/types/deck";

type DeckActionsSheetProps = {
  deck: Deck | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function DeckActionsSheet({
  deck,
  open,
  onOpenChange,
}: DeckActionsSheetProps) {
  const router = useRouter();
  const updateDeck = useUpdateDeck();
  const duplicateDeck = useDuplicateDeck();
  const archiveDeck = useArchiveDeck();
  const unarchiveDeck = useUnarchiveDeck();
  const deleteDeck = useDeleteDeck();

  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  function reset() {
    setRenaming(false);
    setName("");
    setConfirmDelete(false);
    setExportOpen(false);
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  if (!deck) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent side="bottom" data-testid="deck-actions-sheet">
          <SheetHeader>
            <SheetTitle>{deck.name}</SheetTitle>
            <SheetDescription className="font-mono text-xs uppercase">
              {deck.format}
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-2 px-4 pb-6">
            <Button
              type="button"
              variant="outline"
              data-testid="deck-action-open"
              onClick={() => {
                handleOpenChange(false);
                router.push(`/decks/${deck.id}`);
              }}
            >
              Open
            </Button>

            {renaming ? (
              <div className="flex flex-col gap-2">
                <Input
                  data-testid="deck-rename-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoFocus
                />
                <Button
                  type="button"
                  data-testid="deck-rename-save"
                  disabled={updateDeck.isPending}
                  onClick={() => {
                    void updateDeck
                      .mutateAsync({ id: deck.id, patch: { name } })
                      .then(() => {
                        toast.success("Deck renamed");
                        handleOpenChange(false);
                      })
                      .catch((err: unknown) => {
                        toast.error(
                          err instanceof Error ? err.message : "Rename failed",
                        );
                      });
                  }}
                >
                  Save name
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                data-testid="deck-action-rename"
                onClick={() => {
                  setName(deck.name);
                  setRenaming(true);
                }}
              >
                Rename
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              data-testid="deck-action-duplicate"
              disabled={duplicateDeck.isPending}
              onClick={() => {
                void duplicateDeck.mutateAsync({ id: deck.id }).then((copy) => {
                  toast.success(`Duplicated as ${copy.name}`);
                  handleOpenChange(false);
                  router.push(`/decks/${copy.id}`);
                });
              }}
            >
              Duplicate
            </Button>

            {deck.archived ? (
              <Button
                type="button"
                variant="outline"
                data-testid="deck-action-unarchive"
                onClick={() => {
                  void unarchiveDeck.mutateAsync(deck.id).then(() => {
                    toast.success("Deck restored");
                    handleOpenChange(false);
                  });
                }}
              >
                Unarchive
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                data-testid="deck-action-archive"
                onClick={() => {
                  void archiveDeck.mutateAsync(deck.id).then(() => {
                    toast.success("Deck archived", {
                      action: {
                        label: "Undo",
                        onClick: () => {
                          void unarchiveDeck.mutateAsync(deck.id);
                        },
                      },
                    });
                    handleOpenChange(false);
                  });
                }}
              >
                Archive
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              data-testid="deck-action-export"
              onClick={() => setExportOpen(true)}
            >
              Export
            </Button>

            <Button
              type="button"
              variant="destructive"
              data-testid="deck-action-delete"
              onClick={() => setConfirmDelete(true)}
            >
              Delete
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <DeckExportMenu
        deckId={deck.id}
        deckName={deck.name}
        open={exportOpen}
        onOpenChange={setExportOpen}
      />

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete deck?"
        description={`Permanently delete “${deck.name}” and all of its cards. This cannot be undone.`}
        confirmLabel="Delete forever"
        destructive
        pending={deleteDeck.isPending}
        testId="deck-delete-confirm"
        onConfirm={async () => {
          await deleteDeck.mutateAsync(deck.id);
          toast.success("Deck deleted");
          handleOpenChange(false);
          router.push("/decks");
        }}
      />
    </>
  );
}
