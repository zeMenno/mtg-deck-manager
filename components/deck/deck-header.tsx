"use client";

import Link from "next/link";
import { ArrowLeft, Plus, Settings } from "lucide-react";

import { CardImage } from "@/components/cards/card-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Card } from "@/types/card";
import type { Deck } from "@/types/deck";

type DeckHeaderProps = {
  deck: Deck;
  cardCount: number;
  commander?: Card | null;
  /** @deprecated Commander hero always shows art (Phase 9). */
  imagesEnabled?: boolean;
  onAddCard?: () => void;
  onSettings?: () => void;
  onPickCommander?: () => void;
};

export function DeckHeader({
  deck,
  cardCount,
  commander,
  onAddCard,
  onSettings,
  onPickCommander,
}: DeckHeaderProps) {
  return (
    <header className="flex flex-col gap-4" data-testid="deck-header">
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="icon" aria-label="Back to decks">
          <Link href="/decks">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-black uppercase">
            {deck.name}
          </h1>
          <p className="text-muted-foreground font-mono text-xs uppercase">
            {deck.format} · {cardCount} cards
          </p>
        </div>
        {onSettings ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Deck settings"
            data-testid="deck-settings-btn"
            onClick={onSettings}
          >
            <Settings className="size-5" />
          </Button>
        ) : null}
      </div>

      <button
        type="button"
        data-testid="commander-slot"
        onClick={onPickCommander}
        className="border-border bg-card flex items-center gap-3 rounded-md border p-3 text-left shadow-sm"
      >
        {commander ? (
          <>
            <CardImage
              card={commander}
              size="sm"
              priority
              imagesEnabled
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase">Commander</p>
              <p className="truncate font-bold">{commander.name}</p>
              {commander.colorIdentity.length > 0 ? (
                <div className="mt-1 flex gap-1">
                  {commander.colorIdentity.map((c) => (
                    <Badge key={c} variant="secondary">
                      {c}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex w-full items-center justify-between">
            <div>
              <p className="font-mono text-xs uppercase">Commander</p>
              <p className="font-bold">Tap to choose</p>
            </div>
            <Plus className="size-5" />
          </div>
        )}
      </button>

      {onAddCard ? (
        <Button
          type="button"
          data-testid="deck-add-card-btn"
          onClick={onAddCard}
        >
          <Plus className="size-4" />
          Add card
        </Button>
      ) : null}
    </header>
  );
}
