"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/pricing/format-price";
import type { DeckVersion } from "@/types/deck";

export type DeckVersionRowProps = {
  deckId: string;
  version: DeckVersion;
  isActive?: boolean;
  onRestore: (version: DeckVersion) => void;
  onRename: (version: DeckVersion) => void;
  onDelete: (version: DeckVersion) => void;
};

export function DeckVersionRow({
  deckId,
  version,
  isActive = false,
  onRestore,
  onRename,
  onDelete,
}: DeckVersionRowProps) {
  const cardCount = version.snapshot.deckCards.reduce(
    (sum, row) => sum + row.quantity,
    0,
  );
  const notesPreview = version.notes?.trim();

  return (
    <article
      className="border-border bg-card flex flex-col gap-3 rounded-md border p-3 shadow-sm"
      data-testid={`version-row-${version.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate font-bold">{version.name}</h3>
            {isActive ? (
              <Badge variant="secondary" data-testid="version-active-badge">
                Active
              </Badge>
            ) : null}
          </div>
          <p className="text-muted-foreground font-mono text-xs uppercase">
            {formatRelativeTime(version.createdAt)} · {cardCount} cards
          </p>
          {notesPreview ? (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
              {notesPreview}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/decks/${deckId}/versions/${version.id}`}
            data-testid={`version-view-${version.id}`}
          >
            View
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/decks/${deckId}/versions/compare?a=${version.id}&b=current`}
            data-testid={`version-compare-${version.id}`}
          >
            Compare
          </Link>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={`version-restore-${version.id}`}
          onClick={() => onRestore(version)}
        >
          Restore
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          data-testid={`version-rename-${version.id}`}
          onClick={() => onRename(version)}
        >
          Rename
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          data-testid={`version-delete-${version.id}`}
          onClick={() => onDelete(version)}
        >
          Delete
        </Button>
      </div>
    </article>
  );
}
