"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus, Upload } from "lucide-react";

import { DeckActionsSheet } from "@/components/deck/deck-actions-sheet";
import { DeckImportDialog } from "@/components/deck/deck-import-dialog";
import { DeckList } from "@/components/deck/deck-list";
import { PageTransition } from "@/components/shared/page-transition";
import { Button } from "@/components/ui/button";
import { useDecks } from "@/lib/hooks/use-decks";
import { useDeckUiStore } from "@/store/deck-ui-store";
import type { Deck } from "@/types/deck";

export function DecksPageClient() {
  const showArchived = useDeckUiStore((s) => s.showArchived);
  const setShowArchived = useDeckUiStore((s) => s.setShowArchived);
  const { decks, isLoading } = useDecks(showArchived);
  const [actionsDeck, setActionsDeck] = useState<Deck | null>(null);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <PageTransition transitionKey="decks">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-black uppercase">My Decks</h1>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              data-testid="deck-import-btn"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="size-4" />
              Import
            </Button>
            <Button asChild data-testid="deck-create-btn">
              <Link href="/decks/new">
                <Plus className="size-4" />
                New
              </Link>
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant={!showArchived ? "default" : "outline"}
            data-testid="filter-active-decks"
            onClick={() => setShowArchived(false)}
          >
            Active
          </Button>
          <Button
            type="button"
            size="sm"
            variant={showArchived ? "default" : "outline"}
            data-testid="filter-archived-decks"
            onClick={() => setShowArchived(true)}
          >
            Include archived
          </Button>
        </div>

        <DeckList
          decks={showArchived ? decks : decks.filter((d) => !d.archived)}
          loading={isLoading}
          onOpenActions={(deck) => {
            setActionsDeck(deck);
            setActionsOpen(true);
          }}
          onCreateClick={() => {
            window.location.href = "/decks/new";
          }}
        />

        <DeckActionsSheet
          deck={actionsDeck}
          open={actionsOpen}
          onOpenChange={setActionsOpen}
        />

        <DeckImportDialog open={importOpen} onOpenChange={setImportOpen} />
      </div>
    </PageTransition>
  );
}
