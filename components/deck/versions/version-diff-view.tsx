"use client";

import { useEffect, useMemo, useState } from "react";

import { CardDetailSheet } from "@/components/cards/card-detail-sheet";
import { VersionDiffEntry } from "@/components/deck/versions/version-diff-entry";
import { VersionDiffSummary } from "@/components/deck/versions/version-diff-summary";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import { isEmptyDiff } from "@/lib/versions/diff";
import type { VersionDiff } from "@/lib/versions/types";
import type { Card } from "@/types/card";

export type VersionDiffViewProps = {
  deckId: string;
  diff: VersionDiff;
};

export function VersionDiffView({ deckId, diff }: VersionDiffViewProps) {
  const { imagesEnabled } = useDisplayPreferences();
  const [cardsById, setCardsById] = useState<Map<string, Card>>(new Map());
  const [detailCard, setDetailCard] = useState<Card | null>(null);

  const cardIds = useMemo(() => {
    const ids = new Set<string>();
    for (const row of diff.added) ids.add(row.cardId);
    for (const row of diff.removed) ids.add(row.cardId);
    for (const row of diff.quantityChanges) ids.add(row.cardId);
    for (const row of diff.statusChanges) ids.add(row.cardId);
    return [...ids];
  }, [diff]);

  useEffect(() => {
    if (cardIds.length === 0) {
      setCardsById(new Map());
      return;
    }
    void getCardsByIdsBatched(cardIds).then((cards) => {
      setCardsById(new Map(cards.map((c) => [c.id, c])));
    });
  }, [cardIds]);

  if (isEmptyDiff(diff)) {
    return (
      <p
        className="border-border border-2 p-4 text-sm font-bold"
        data-testid="version-diff-empty"
      >
        No differences between these decks.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-testid="version-diff-view">
      <VersionDiffSummary diff={diff} />

      {diff.added.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="diff-added">
          <h2 className="text-sm font-black text-green-700 uppercase">Added</h2>
          {diff.added.map((row) => (
            <VersionDiffEntry
              key={`add-${row.cardId}-${row.zone}`}
              kind="added"
              card={cardsById.get(row.cardId) ?? null}
              cardId={row.cardId}
              zone={row.zone}
              quantityLabel={`×${row.quantity}`}
              status={row.status}
              imagesEnabled={imagesEnabled}
              onPress={() => {
                const card = cardsById.get(row.cardId);
                if (card) setDetailCard(card);
              }}
            />
          ))}
        </section>
      ) : null}

      {diff.removed.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="diff-removed">
          <h2 className="text-sm font-black text-red-700 uppercase">Removed</h2>
          {diff.removed.map((row) => (
            <VersionDiffEntry
              key={`rem-${row.cardId}-${row.zone}`}
              kind="removed"
              card={cardsById.get(row.cardId) ?? null}
              cardId={row.cardId}
              zone={row.zone}
              quantityLabel={`×${row.quantity}`}
              status={row.status}
              imagesEnabled={imagesEnabled}
              onPress={() => {
                const card = cardsById.get(row.cardId);
                if (card) setDetailCard(card);
              }}
            />
          ))}
        </section>
      ) : null}

      {diff.quantityChanges.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="diff-qty">
          <h2 className="text-sm font-black text-yellow-700 uppercase">
            Quantity changes
          </h2>
          {diff.quantityChanges.map((row) => (
            <VersionDiffEntry
              key={`qty-${row.cardId}-${row.zone}`}
              kind="quantity"
              card={cardsById.get(row.cardId) ?? null}
              cardId={row.cardId}
              zone={row.zone}
              quantityLabel={`${row.fromQuantity} → ${row.toQuantity}`}
              status={row.status}
              imagesEnabled={imagesEnabled}
              onPress={() => {
                const card = cardsById.get(row.cardId);
                if (card) setDetailCard(card);
              }}
            />
          ))}
        </section>
      ) : null}

      {diff.statusChanges.length > 0 ? (
        <section className="flex flex-col gap-2" data-testid="diff-status">
          <h2 className="text-sm font-black text-blue-700 uppercase">
            Status changes
          </h2>
          {diff.statusChanges.map((row) => (
            <VersionDiffEntry
              key={`status-${row.cardId}-${row.zone}`}
              kind="status"
              card={cardsById.get(row.cardId) ?? null}
              cardId={row.cardId}
              zone={row.zone}
              quantityLabel={`×${row.quantity}`}
              status={row.toStatus}
              statusLabel={`${row.fromStatus} → ${row.toStatus}`}
              imagesEnabled={imagesEnabled}
              onPress={() => {
                const card = cardsById.get(row.cardId);
                if (card) setDetailCard(card);
              }}
            />
          ))}
        </section>
      ) : null}

      <p className="text-muted-foreground text-xs">
        Moving a card between zones appears as remove + add.
      </p>

      <CardDetailSheet
        card={detailCard}
        open={Boolean(detailCard)}
        onOpenChange={(open) => {
          if (!open) setDetailCard(null);
        }}
        deckId={deckId}
      />
    </div>
  );
}
