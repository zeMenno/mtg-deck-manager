"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useDecks } from "@/lib/hooks/use-decks";
import {
  usePromoteWishlistItem,
  usePromoteWishlistItems,
} from "@/lib/hooks/use-wishlist-item";
import {
  WishlistPromotionConflictError,
  type PromotionOptions,
} from "@/lib/wishlist";
import type { DeckCardStatus } from "@/types";
import type { WishlistItemWithCard } from "@/lib/wishlist/types";

type MoveToDeckSheetProps = {
  items: WishlistItemWithCard[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: Extract<DeckCardStatus, "consider" | "add">;
  onSuccess?: (deckId: string) => void;
};

export function MoveToDeckSheet({
  items,
  open,
  onOpenChange,
  status,
  onSuccess,
}: MoveToDeckSheetProps) {
  const { decks } = useDecks();
  const promoteOne = usePromoteWishlistItem();
  const promoteMany = usePromoteWishlistItems();

  const primary = items[0];
  const [deckId, setDeckId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [removeAfter, setRemoveAfter] = useState(true);
  const [forceConflict, setForceConflict] = useState(false);

  useEffect(() => {
    if (!open || !primary) return;
    setDeckId(primary.targetDeckId ?? decks[0]?.id ?? "");
    setQuantity(primary.quantity);
    setRemoveAfter(true);
    setForceConflict(false);
  }, [open, primary, decks]);

  const actionLabel = status === "consider" ? "CONSIDER" : "ADD";
  const isBulk = items.length > 1;
  const pending = promoteOne.isPending || promoteMany.isPending;

  async function handleConfirm() {
    if (!deckId || items.length === 0) {
      toast.error("Select a deck");
      return;
    }

    const options: PromotionOptions = {
      removeFromWishlist: removeAfter,
      allowCurrentConflict: forceConflict,
      ...(isBulk ? {} : { quantity }),
    };

    try {
      if (isBulk) {
        await promoteMany.mutateAsync({
          itemIds: items.map((i) => i.id),
          deckId,
          status,
          options,
        });
      } else {
        await promoteOne.mutateAsync({
          itemId: primary!.id,
          deckId,
          status,
          options,
        });
      }
      onOpenChange(false);
      onSuccess?.(deckId);
    } catch (err) {
      if (err instanceof WishlistPromotionConflictError) {
        setForceConflict(true);
        toast.error(
          "Already in deck as CURRENT. Tap confirm again to add as upgrade.",
        );
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Could not move to deck",
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="overflow-y-auto"
        data-testid="move-to-deck-sheet"
      >
        <SheetHeader>
          <SheetTitle>Move to {actionLabel}</SheetTitle>
          <SheetDescription>
            {isBulk
              ? `${items.length} wishlist items`
              : (primary?.card?.name ?? "Wishlist item")}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-2">
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[0.625rem] uppercase">Deck</span>
            <select
              data-testid="move-to-deck-select"
              value={deckId}
              onChange={(e) => setDeckId(e.target.value)}
              className="border-border bg-background h-11 border-2 px-3 font-bold"
            >
              <option value="">Select deck…</option>
              {decks.map((deck) => (
                <option key={deck.id} value={deck.id}>
                  {deck.name}
                </option>
              ))}
            </select>
          </label>

          {!isBulk ? (
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[0.625rem] uppercase">Qty</span>
              <input
                type="number"
                min={1}
                max={99}
                data-testid="move-to-deck-qty"
                value={quantity}
                onChange={(e) =>
                  setQuantity(Math.max(1, Number(e.target.value) || 1))
                }
                className="border-border bg-background h-11 border-2 px-3"
              />
            </label>
          ) : null}

          {primary?.targetRole ? (
            <p
              className="font-mono text-xs uppercase"
              data-testid="move-to-deck-role-preview"
            >
              Role: will inherit target role
            </p>
          ) : null}

          <label className="flex min-h-11 items-center gap-3">
            <input
              type="checkbox"
              data-testid="move-to-deck-remove"
              checked={removeAfter}
              onChange={(e) => setRemoveAfter(e.target.checked)}
              className="size-5"
            />
            <span className="text-sm font-bold">
              Remove from wishlist after moving
            </span>
          </label>

          {forceConflict ? (
            <p
              className="border-border border-2 bg-yellow-100 p-3 text-sm font-bold text-black"
              data-testid="move-to-deck-conflict"
            >
              Card is already CURRENT in this deck. Confirming will add a
              separate {actionLabel} row.
            </p>
          ) : null}
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            data-testid="move-to-deck-confirm"
            disabled={!deckId || pending}
            onClick={() => void handleConfirm()}
          >
            {pending ? "Moving…" : `Move to ${actionLabel}`}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
