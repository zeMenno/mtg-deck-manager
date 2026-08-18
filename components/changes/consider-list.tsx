"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ChangeEmptyState } from "@/components/changes/change-empty-state";
import { DeckCardRow } from "@/components/deck/deck-card-row";
import { Button } from "@/components/ui/button";
import {
  useBulkDismissConsider,
  useBulkPromoteConsider,
  useDismissConsider,
  usePromoteConsider,
} from "@/lib/hooks/use-apply-changes";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import type { DeckCardWithCard } from "@/types/deck";

type ConsiderListProps = {
  deckId: string;
  onOpenActions?: (item: DeckCardWithCard) => void;
};

export function ConsiderList({ deckId, onOpenActions }: ConsiderListProps) {
  const { cards, isLoading } = useDeckCards(deckId);
  const { imagesEnabled, effectiveDensity } = useDisplayPreferences();
  const considerCards = useMemo(
    () => cards.filter((c) => c.status === "consider"),
    [cards],
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const promote = usePromoteConsider(deckId);
  const dismiss = useDismissConsider(deckId);
  const bulkPromote = useBulkPromoteConsider(deckId);
  const bulkDismiss = useBulkDismissConsider(deckId);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelected(new Set(considerCards.map((c) => c.id)));
  }

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="consider-list">
      {considerCards.length === 0 ? (
        <ChangeEmptyState
          title="Nothing in the consider queue."
          description="Mark cards as CONSIDER from search or the card list."
        />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              data-testid="consider-select-all"
              onClick={selectAll}
            >
              Select all
            </Button>
            <Button
              type="button"
              size="sm"
              data-testid="consider-bulk-promote"
              disabled={selected.size === 0 || bulkPromote.isPending}
              onClick={() => {
                void bulkPromote.mutateAsync([...selected]).then(() => {
                  setSelected(new Set());
                  toast.success("Promoted to ADD");
                });
              }}
            >
              Promote selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              data-testid="consider-bulk-dismiss"
              disabled={selected.size === 0 || bulkDismiss.isPending}
              onClick={() => {
                void bulkDismiss.mutateAsync([...selected]).then(() => {
                  setSelected(new Set());
                  toast.success("Dismissed");
                });
              }}
            >
              Dismiss selected
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled
              title="Phase 12"
            >
              Move to wishlist
            </Button>
          </div>

          <ul className="flex flex-col gap-3">
            {considerCards.map((item) => (
              <li
                key={item.id}
                className="border-border flex flex-col gap-2 border-2 p-2"
                data-testid={`consider-row-${item.id}`}
              >
                <label className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-3 size-5"
                    checked={selected.has(item.id)}
                    onChange={() => toggle(item.id)}
                    data-testid={`consider-select-${item.id}`}
                  />
                  <div className="min-w-0 flex-1">
                    <DeckCardRow
                      item={item}
                      density={effectiveDensity}
                      imagesEnabled={imagesEnabled}
                      showPrice
                      onPress={() => onOpenActions?.(item)}
                    />
                  </div>
                </label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    data-testid={`promote-consider-${item.id}`}
                    onClick={() => {
                      void promote.mutateAsync(item.id).then(() => {
                        toast.success("Promoted to ADD");
                      });
                    }}
                  >
                    Promote to ADD
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    data-testid={`dismiss-consider-${item.id}`}
                    onClick={() => {
                      void dismiss.mutateAsync(item.id).then(() => {
                        toast.success("Removed from list");
                      });
                    }}
                  >
                    Remove from list
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
