"use client";

import Link from "next/link";

import { DeckCheckPanel } from "@/components/deck/deck-check-panel";
import { DeckStatsSummary } from "@/components/deck/deck-stats-summary";
import { PrefetchDeckImagesButton } from "@/components/deck/prefetch-deck-images-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeck } from "@/lib/hooks/use-deck";
import { useDeckStats } from "@/lib/hooks/use-deck-stats";
import { useDeckVersion, useDeckVersions } from "@/lib/hooks/use-deck-versions";

type DeckDashboardProps = {
  deckId: string;
  onAddCard?: () => void;
  onSaveVersion?: () => void;
};

export function DeckDashboard({
  deckId,
  onAddCard,
  onSaveVersion,
}: DeckDashboardProps) {
  const { deck } = useDeck(deckId);
  const { stats, isLoading, isEmpty } = useDeckStats(deckId, "current");
  const { version: activeVersion } = useDeckVersion(deck?.activeVersionId);
  const { versions } = useDeckVersions(deckId);

  const modifiedSinceVersion =
    Boolean(deck?.activeVersionId) &&
    Boolean(activeVersion) &&
    Boolean(deck) &&
    deck!.updatedAt > activeVersion!.createdAt;

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4" data-testid="deck-dashboard-loading">
        <div className="bg-muted border-border h-12 animate-pulse border" />
        <div className="bg-muted border-border h-24 animate-pulse border" />
        <div className="bg-muted border-border h-32 animate-pulse border" />
      </div>
    );
  }

  if (isEmpty || !stats) {
    return (
      <div
        className="border-border flex flex-col gap-4 border p-6"
        data-testid="deck-dashboard-empty"
      >
        <p className="font-bold">Add cards to see statistics</p>
        <p className="text-muted-foreground text-sm">
          Mana curve, type breakdown, and deck checks appear once your list has
          cards.
        </p>
        <div className="flex flex-wrap gap-2">
          {onAddCard ? (
            <Button
              type="button"
              onClick={onAddCard}
              data-testid="empty-add-card"
            >
              Add card
            </Button>
          ) : null}
          <Button asChild variant="outline">
            <Link href={`/decks/${deckId}/cards`}>Edit cards</Link>
          </Button>
          {onSaveVersion ? (
            <Button
              type="button"
              variant="outline"
              data-testid="save-version-btn"
              onClick={onSaveVersion}
            >
              Save version
            </Button>
          ) : null}
          <Button asChild variant="outline" data-testid="version-history-link">
            <Link href={`/decks/${deckId}/versions`}>Version history</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="deck-dashboard">
      {activeVersion ? (
        <div
          className="flex flex-wrap items-center gap-2"
          data-testid="active-version-badge"
        >
          <Badge variant={modifiedSinceVersion ? "secondary" : "default"}>
            {modifiedSinceVersion
              ? `Modified since ${activeVersion.name}`
              : `Based on ${activeVersion.name}`}
          </Badge>
          {versions.length > 0 ? (
            <span className="text-muted-foreground font-mono text-xs">
              {versions.length} saved
            </span>
          ) : null}
        </div>
      ) : null}

      <DeckStatsSummary stats={stats} deckId={deckId} compact />

      <DeckCheckPanel deckId={deckId} compact />

      <section className="flex flex-col gap-3">
        <Button asChild data-testid="edit-cards-btn">
          <Link href={`/decks/${deckId}/cards`}>Edit cards</Link>
        </Button>
        {onAddCard ? (
          <Button
            type="button"
            variant="outline"
            data-testid="deck-add-card-btn"
            onClick={onAddCard}
          >
            Add card
          </Button>
        ) : null}
        {onSaveVersion ? (
          <Button
            type="button"
            data-testid="save-version-btn"
            onClick={onSaveVersion}
          >
            Save version
          </Button>
        ) : null}
        <Button asChild variant="outline" data-testid="version-history-link">
          <Link href={`/decks/${deckId}/versions`}>Version history</Link>
        </Button>
        <Button asChild variant="outline" data-testid="view-stats-btn">
          <Link href={`/decks/${deckId}/stats`}>View stats</Link>
        </Button>
        <Button asChild variant="outline" data-testid="review-changes-btn">
          <Link href={`/decks/${deckId}/changes`}>Review changes</Link>
        </Button>
        <PrefetchDeckImagesButton deckId={deckId} />
      </section>
    </div>
  );
}
