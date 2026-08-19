"use client";

import { CardImage } from "@/components/cards/card-image";
import { DeckStatusBadge } from "@/components/deck/deck-status-badge";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Card } from "@/types/card";
import type { DeckCardStatus, DeckCardZone } from "@/types";

export type VersionDiffEntryKind = "added" | "removed" | "quantity" | "status";

export type VersionDiffEntryProps = {
  kind: VersionDiffEntryKind;
  card: Card | null;
  cardId: string;
  zone: DeckCardZone;
  quantityLabel: string;
  status?: DeckCardStatus;
  statusLabel?: string;
  imagesEnabled?: boolean;
  onPress?: () => void;
};

const KIND_STYLES: Record<VersionDiffEntryKind, string> = {
  added: "border-l-2 border-l-status-add",
  removed: "border-l-2 border-l-status-cut",
  quantity: "border-l-2 border-l-status-consider",
  status: "border-l-2 border-l-status-commander",
};

const KIND_PREFIX: Record<VersionDiffEntryKind, string> = {
  added: "+",
  removed: "−",
  quantity: "~",
  status: "~",
};

export function VersionDiffEntry({
  kind,
  card,
  cardId,
  zone,
  quantityLabel,
  status,
  statusLabel,
  imagesEnabled = true,
  onPress,
}: VersionDiffEntryProps) {
  const name = card?.name ?? "Unknown card";

  return (
    <button
      type="button"
      data-testid={`diff-entry-${kind}-${cardId}-${zone}`}
      onClick={onPress}
      className={cn(
        "border-border bg-card flex w-full items-center gap-3 rounded-md border p-2 text-left shadow-sm",
        KIND_STYLES[kind],
      )}
    >
      <span className="font-mono text-lg font-black" aria-hidden>
        {KIND_PREFIX[kind]}
      </span>
      {card ? (
        <CardImage
          card={card}
          size="xs"
          imagesEnabled={imagesEnabled}
          className="shrink-0"
        />
      ) : (
        <div className="bg-muted border-border size-10 shrink-0 border" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold">{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1">
          <Badge variant="outline" className="font-mono text-xs uppercase">
            {zone}
          </Badge>
          <span className="font-mono text-xs">{quantityLabel}</span>
          {status ? <DeckStatusBadge status={status} /> : null}
          {statusLabel ? (
            <span className="text-muted-foreground font-mono text-xs">
              {statusLabel}
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
