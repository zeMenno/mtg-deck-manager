"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ChangeEmptyState } from "@/components/changes/change-empty-state";
import { ReplacementLinkBadge } from "@/components/changes/replacement-link-badge";
import { ReplacementLinkPicker } from "@/components/changes/replacement-link-picker";
import { DeckCardRow } from "@/components/deck/deck-card-row";
import { Button } from "@/components/ui/button";
import { getReplacementForCut } from "@/lib/deck/changes";
import {
  useLinkReplacement,
  useRevertCut,
  useUnlinkReplacement,
} from "@/lib/hooks/use-apply-changes";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import { useUpdateDeckCard } from "@/lib/hooks/use-deck-mutations";
import type { DeckCardWithCard } from "@/types/deck";

type CardsToCutListProps = {
  deckId: string;
  onOpenActions?: (item: DeckCardWithCard) => void;
};

export function CardsToCutList({ deckId, onOpenActions }: CardsToCutListProps) {
  const { cards, isLoading } = useDeckCards(deckId);
  const { imagesEnabled, effectiveDensity } = useDisplayPreferences();
  const cutCards = useMemo(
    () => cards.filter((c) => c.status === "cut"),
    [cards],
  );
  const addCards = useMemo(
    () => cards.filter((c) => c.status === "add"),
    [cards],
  );

  const revert = useRevertCut(deckId);
  const link = useLinkReplacement(deckId);
  const unlink = useUnlinkReplacement(deckId);
  const updateCard = useUpdateDeckCard();

  const [linkForCutId, setLinkForCutId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="cards-to-cut-list">
      <p className="text-muted-foreground text-sm">
        Cards marked CUT stay in your current deck until you apply changes. They
        are excluded from the projected deck.
      </p>

      {cutCards.length === 0 ? (
        <ChangeEmptyState
          title="No cards marked to cut."
          description="Mark current cards as CUT from the card list."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {cutCards.map((item) => {
            const linkedAdd = getReplacementForCut(item.id, cards);
            const reason =
              notesDraft[item.id] ?? item.cutReason ?? item.notes ?? "";
            return (
              <li
                key={item.id}
                className="border-border flex flex-col gap-2 border-2 p-2"
                data-testid={`cards-to-cut-row-${item.id}`}
              >
                <DeckCardRow
                  item={item}
                  density={effectiveDensity}
                  imagesEnabled={imagesEnabled}
                  showPrice
                  onPress={() => onOpenActions?.(item)}
                />
                <div className="text-muted-foreground px-1 text-xs">
                  Current price: —
                </div>
                <label className="flex flex-col gap-1 px-1">
                  <span className="font-mono text-[0.625rem] uppercase">
                    Reason for cut
                  </span>
                  <textarea
                    data-testid={`cut-reason-${item.id}`}
                    rows={2}
                    value={reason}
                    className="border-border bg-background w-full border-2 p-2 text-sm"
                    onChange={(e) =>
                      setNotesDraft((prev) => ({
                        ...prev,
                        [item.id]: e.target.value,
                      }))
                    }
                    onBlur={() => {
                      const next = notesDraft[item.id];
                      if (next === undefined) return;
                      if (next === (item.cutReason ?? item.notes ?? "")) return;
                      void updateCard.mutateAsync({
                        id: item.id,
                        patch: { cutReason: next, notes: next },
                      });
                    }}
                  />
                </label>
                <ReplacementLinkBadge
                  replacementName={linkedAdd?.card.name}
                  emptyLabel="Pick replacement"
                  onPick={() => setLinkForCutId(item.id)}
                  onClear={
                    linkedAdd
                      ? () => {
                          void unlink.mutateAsync(linkedAdd.id).then(() => {
                            toast.success("Replacement unlinked");
                          });
                        }
                      : undefined
                  }
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  data-testid={`revert-cut-${item.id}`}
                  onClick={() => {
                    void revert.mutateAsync(item.id).then(() => {
                      toast.success("Reverted to CURRENT");
                    });
                  }}
                >
                  Revert to current
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ReplacementLinkPicker
        open={Boolean(linkForCutId)}
        onOpenChange={(open) => {
          if (!open) setLinkForCutId(null);
        }}
        mode="pick-add"
        addCards={addCards}
        cutCards={cutCards}
        onSelect={(addId) => {
          if (!linkForCutId) return;
          void link
            .mutateAsync({
              addDeckCardId: addId,
              cutDeckCardId: linkForCutId,
            })
            .then(() => toast.success("Replacement linked"));
        }}
      />
    </div>
  );
}
