"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { CardDetailSheet } from "@/components/cards/card-detail-sheet";
import { BulkCheapestSheet } from "@/components/deck/bulk-cheapest-sheet";
import { CommanderPicker } from "@/components/deck/commander-picker";
import { DeckActionsSheet } from "@/components/deck/deck-actions-sheet";
import { DeckAddCardSheet } from "@/components/deck/deck-add-card-sheet";
import { DeckDashboard } from "@/components/deck/deck-dashboard";
import { DeckHeader } from "@/components/deck/deck-header";
import { DeckImportIntoSheet } from "@/components/deck/deck-import-into-sheet";
import { SaveVersionDialog } from "@/components/deck/save-version-dialog";
import { SuggestTagsSheet } from "@/components/deck/suggest-tags-sheet";
import { DeckTabs } from "@/components/navigation/deck-tabs";
import { PageTransition } from "@/components/shared/page-transition";
import { DeckDashboardSkeleton } from "@/components/shared/skeletons";
import { Button } from "@/components/ui/button";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckStats } from "@/lib/hooks/use-deck-stats";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import type { Card } from "@/types/card";

type DeckDashboardClientProps = {
  params: Promise<{ deckId: string }>;
};

export function DeckDashboardClient({ params }: DeckDashboardClientProps) {
  const { deckId } = use(params);
  const searchParams = useSearchParams();
  const { deck, isLoading } = useDeck(deckId);
  const { stats } = useDeckStats(deckId, "current");
  const { imagesEnabled } = useDisplayPreferences();

  const [commander, setCommander] = useState<Card | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [commanderOpen, setCommanderOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [saveVersionOpen, setSaveVersionOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [bulkCheapestOpen, setBulkCheapestOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [suggestTagsOpen, setSuggestTagsOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("pickCommander") === "1") {
      setCommanderOpen(true);
    }
    if (searchParams.get("saveVersion") === "1") {
      setSaveVersionOpen(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!deck?.commanderId) {
      setCommander(null);
      return;
    }
    void getCardsByIdsBatched([deck.commanderId]).then((cards) => {
      setCommander(cards[0] ?? null);
    });
  }, [deck?.commanderId]);

  if (isLoading) {
    return <DeckDashboardSkeleton />;
  }

  if (!deck) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-bold">Deck not found</p>
        <Button asChild variant="outline">
          <Link href="/decks">Back to decks</Link>
        </Button>
      </div>
    );
  }

  const cardCount = stats?.counts.total ?? 0;

  return (
    <PageTransition transitionKey={`deck-dashboard-${deckId}`}>
      <div className="flex flex-col gap-6">
        <DeckHeader
          deck={deck}
          cardCount={cardCount}
          commander={commander}
          imagesEnabled={imagesEnabled}
          onAddCard={() => setAddOpen(true)}
          onSettings={() => setSettingsOpen(true)}
          onPickCommander={() => setCommanderOpen(true)}
        />

        <DeckTabs deckId={deckId} />

        <DeckDashboard
          deckId={deckId}
          onAddCard={() => setAddOpen(true)}
          onSaveVersion={() => setSaveVersionOpen(true)}
          onCheapestPrintings={() => setBulkCheapestOpen(true)}
          onImportCards={() => setImportOpen(true)}
          onSuggestTags={() => setSuggestTagsOpen(true)}
        />

        {commander ? (
          <Button
            type="button"
            variant="ghost"
            className="justify-start"
            onClick={() => setDetailCard(commander)}
          >
            View commander details
          </Button>
        ) : null}

        <DeckAddCardSheet
          deckId={deckId}
          open={addOpen}
          onOpenChange={setAddOpen}
          imagesEnabled={imagesEnabled}
        />
        <CommanderPicker
          deckId={deckId}
          open={commanderOpen}
          onOpenChange={setCommanderOpen}
          imagesEnabled={imagesEnabled}
        />
        <DeckActionsSheet
          deck={deck}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
        />
        <SaveVersionDialog
          deckId={deckId}
          open={saveVersionOpen}
          onOpenChange={setSaveVersionOpen}
        />
        <BulkCheapestSheet
          deckId={deckId}
          open={bulkCheapestOpen}
          onOpenChange={setBulkCheapestOpen}
        />
        <DeckImportIntoSheet
          deckId={deckId}
          open={importOpen}
          onOpenChange={setImportOpen}
        />
        <SuggestTagsSheet
          deckId={deckId}
          open={suggestTagsOpen}
          onOpenChange={setSuggestTagsOpen}
        />
        <CardDetailSheet
          card={detailCard}
          open={Boolean(detailCard)}
          onOpenChange={(open) => {
            if (!open) setDetailCard(null);
          }}
          deckId={deckId}
        />
      </div>
    </PageTransition>
  );
}
