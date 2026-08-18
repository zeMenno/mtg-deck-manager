"use client";

import Link from "next/link";
import { MoreVertical, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeckValuation } from "@/lib/hooks/use-deck-valuation";
import { useToggleFavorite } from "@/lib/hooks/use-deck-mutations";
import { formatCurrency } from "@/lib/pricing/format-price";
import type { Deck } from "@/types/deck";
import { cn } from "@/lib/utils";

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return "";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

type DeckListItemProps = {
  deck: Deck;
  cardCount?: number;
  onOpenActions: (deck: Deck) => void;
};

export function DeckListItem({
  deck,
  cardCount,
  onOpenActions,
}: DeckListItemProps) {
  const toggleFavorite = useToggleFavorite();
  const { valuation } = useDeckValuation(deck.id);
  const valueLabel =
    valuation?.currentValue.total != null
      ? formatCurrency(valuation.currentValue.total, valuation.currency)
      : null;

  return (
    <li
      data-testid={`deck-item-${deck.id}`}
      className="border-border bg-card shadow-brutal-sm flex items-stretch border-2"
    >
      <Link
        href={`/decks/${deck.id}`}
        data-testid="deck-item"
        className="flex min-w-0 flex-1 flex-col gap-1 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          {deck.favorite ? (
            <Star
              aria-label="Favorite"
              className="size-4 shrink-0 fill-current"
            />
          ) : null}
          <span className="truncate font-bold">{deck.name}</span>
          {deck.archived ? (
            <Badge variant="outline" className="shrink-0">
              Archived
            </Badge>
          ) : null}
        </div>
        <p className="text-muted-foreground font-mono text-xs uppercase">
          {deck.format}
          {cardCount !== undefined ? ` · ${cardCount} cards` : null}
          {valueLabel ? ` · ${valueLabel}` : null}
        </p>
        <p className="text-muted-foreground text-xs">
          Updated {relativeTime(deck.updatedAt)}
        </p>
      </Link>

      <div className="border-border flex flex-col border-l-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={deck.favorite ? "Unfavorite" : "Favorite"}
          data-testid={`deck-favorite-${deck.id}`}
          className={cn("rounded-none", deck.favorite && "text-primary")}
          onClick={() =>
            void toggleFavorite.mutateAsync({
              id: deck.id,
              favorite: !deck.favorite,
            })
          }
        >
          <Star className={cn("size-4", deck.favorite && "fill-current")} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Deck actions"
          data-testid={`deck-actions-${deck.id}`}
          className="rounded-none"
          onClick={() => onOpenActions(deck)}
        >
          <MoreVertical className="size-4" />
        </Button>
      </div>
    </li>
  );
}
