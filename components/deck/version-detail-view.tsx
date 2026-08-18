"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { CardDetailSheet } from "@/components/cards/card-detail-sheet";
import { DeckCardRow } from "@/components/deck/deck-card-row";
import { RestoreVersionDialog } from "@/components/deck/restore-version-dialog";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import {
  useDeckVersion,
  useDeleteVersion,
} from "@/lib/hooks/use-deck-versions";
import { formatRelativeTime } from "@/lib/pricing/format-price";
import { snapshotRowToDeckCard } from "@/lib/versions/snapshot";
import type { Card } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

export type VersionDetailViewProps = {
  deckId: string;
  versionId: string;
};

export function VersionDetailView({
  deckId,
  versionId,
}: VersionDetailViewProps) {
  const router = useRouter();
  const { version, isLoading } = useDeckVersion(versionId);
  const { imagesEnabled, density } = useDisplayPreferences();
  const deleteVersion = useDeleteVersion(deckId);

  const [cardsById, setCardsById] = useState<Map<string, Card>>(new Map());
  const [detailCard, setDetailCard] = useState<Card | null>(null);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (!version) return;
    const ids = version.snapshot.deckCards.map((r) => r.cardId);
    void getCardsByIdsBatched(ids).then((cards) => {
      setCardsById(new Map(cards.map((c) => [c.id, c])));
    });
  }, [version]);

  const rows: DeckCardWithCard[] = useMemo(() => {
    if (!version) return [];
    return version.snapshot.deckCards.map((row, index) => {
      const deckCard = snapshotRowToDeckCard(row, deckId, index);
      const card =
        cardsById.get(row.cardId) ??
        ({
          id: row.cardId,
          oracleId: "",
          name: "Unknown card",
          manaValue: 0,
          typeLine: "",
          colors: [],
          colorIdentity: [],
          keywords: [],
          updatedAt: version.createdAt,
        } satisfies Card);
      return { ...deckCard, card };
    });
  }, [version, cardsById, deckId]);

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading version…</p>;
  }

  if (!version || version.deckId !== deckId) {
    return (
      <div className="flex flex-col gap-4">
        <p className="font-bold">Version not found</p>
        <Button asChild variant="outline">
          <Link href={`/decks/${deckId}/versions`}>Back to versions</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="version-detail">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-black uppercase">{version.name}</h1>
        <p className="text-muted-foreground font-mono text-xs uppercase">
          {formatRelativeTime(version.createdAt)} ·{" "}
          {version.snapshot.deckCards.length} entries ·{" "}
          {version.snapshot.deck.format}
        </p>
        {version.notes ? (
          <p className="text-sm" data-testid="version-detail-notes">
            {version.notes}
          </p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          data-testid="version-detail-restore"
          onClick={() => setRestoreOpen(true)}
        >
          Restore
        </Button>
        <Button asChild variant="outline">
          <Link
            href={`/decks/${deckId}/versions/compare?a=${version.id}&b=current`}
            data-testid="version-detail-compare"
          >
            Compare to current
          </Link>
        </Button>
        <Button
          type="button"
          variant="destructive"
          data-testid="version-detail-delete"
          onClick={() => setDeleteOpen(true)}
        >
          Delete
        </Button>
      </div>

      <ul className="flex flex-col gap-2" data-testid="version-card-list">
        {rows.map((item) => (
          <li key={item.id}>
            <DeckCardRow
              item={item}
              density={density}
              imagesEnabled={imagesEnabled}
              onPress={() => setDetailCard(item.card)}
            />
          </li>
        ))}
      </ul>

      <p className="text-muted-foreground text-xs">
        Read-only snapshot. Zone moves between versions show as remove + add in
        compare.
      </p>

      <RestoreVersionDialog
        deckId={deckId}
        version={version}
        open={restoreOpen}
        onOpenChange={setRestoreOpen}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete version?"
        description={`Delete “${version.name}” permanently?`}
        confirmLabel="Delete"
        destructive
        pending={deleteVersion.isPending}
        testId="version-detail-delete-confirm"
        onConfirm={async () => {
          await deleteVersion.mutateAsync(version.id);
          toast.success("Version deleted");
          router.push(`/decks/${deckId}/versions`);
        }}
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
  );
}
