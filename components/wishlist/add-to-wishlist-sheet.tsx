"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CardImage } from "@/components/cards/card-image";
import { PriorityPicker } from "@/components/wishlist/priority-picker";
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
import { useTagsByCategory } from "@/lib/hooks/use-tags";
import {
  useAddToWishlist,
  useRemoveFromWishlist,
} from "@/lib/hooks/use-wishlist";
import { useUndoAction } from "@/lib/hooks/use-undo-action";
import {
  WishlistCardNotCachedError,
  type AddToWishlistOptions,
} from "@/lib/wishlist";
import type { WishlistPriority } from "@/types";
import type { Card } from "@/types/card";

type AddToWishlistSheetProps = {
  card: Card | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDeckId?: string;
};

export function AddToWishlistSheet({
  card,
  open,
  onOpenChange,
  defaultDeckId,
}: AddToWishlistSheetProps) {
  const { decks } = useDecks();
  const { tags: roleTags } = useTagsByCategory("role");
  const addToWishlist = useAddToWishlist();
  const removeFromWishlist = useRemoveFromWishlist();
  const { showUndo } = useUndoAction();

  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<WishlistPriority>("medium");
  const [targetDeckId, setTargetDeckId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [notes, setNotes] = useState("");
  const [duplicateChoice, setDuplicateChoice] = useState<
    "new" | "update" | null
  >(null);

  useEffect(() => {
    if (!open) return;
    setQuantity(1);
    setPriority("medium");
    setTargetDeckId(defaultDeckId ?? "");
    setTargetRole("");
    setNotes("");
    setDuplicateChoice(null);
  }, [open, card?.id, defaultDeckId]);

  async function handleSave(mode?: AddToWishlistOptions["duplicateMode"]) {
    if (!card) return;
    try {
      const options: AddToWishlistOptions = {
        quantity,
        priority,
        targetDeckId: targetDeckId || null,
        targetRole: targetRole || null,
        notes: notes.trim() || null,
        duplicateMode:
          mode ?? (duplicateChoice === "update" ? "update" : "reject"),
      };

      if (duplicateChoice === "new") {
        options.duplicateMode = "allow_duplicate";
      }

      const result = await addToWishlist.mutateAsync({
        cardId: card.id,
        options,
      });

      if (!result.created && !mode && duplicateChoice === null) {
        setDuplicateChoice("update");
        toast.message("Already on wishlist", {
          description: "Update the existing entry or add another?",
        });
        return;
      }

      onOpenChange(false);
      showUndo({
        message: "Added to wishlist",
        undo: async () => {
          await removeFromWishlist.mutateAsync(result.item.id);
        },
      });
    } catch (err) {
      if (err instanceof WishlistCardNotCachedError) {
        toast.error(err.message);
        return;
      }
      toast.error(
        err instanceof Error ? err.message : "Could not add to wishlist",
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        snap="detail"
        className="overflow-y-auto"
        data-testid="add-to-wishlist-sheet"
      >
        {card ? (
          <>
            <SheetHeader>
              <SheetTitle>Add to Wishlist</SheetTitle>
              <SheetDescription>{card.name}</SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4 px-4 pb-2">
              <div className="flex justify-center">
                <CardImage card={card} size="sm" imagesEnabled priority />
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.625rem] uppercase">Qty</span>
                <input
                  type="number"
                  min={1}
                  max={99}
                  data-testid="wishlist-qty-input"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="border-border bg-background h-11 border px-3"
                />
              </label>

              <div className="flex flex-col gap-1">
                <span className="font-mono text-[0.625rem] uppercase">
                  Priority
                </span>
                <PriorityPicker value={priority} onChange={setPriority} />
              </div>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.625rem] uppercase">
                  Target deck (optional)
                </span>
                <select
                  data-testid="wishlist-target-deck"
                  value={targetDeckId}
                  onChange={(e) => setTargetDeckId(e.target.value)}
                  className="border-border bg-background h-11 border px-3 font-bold"
                >
                  <option value="">No deck</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.625rem] uppercase">
                  Target role (optional)
                </span>
                <select
                  data-testid="wishlist-target-role"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  className="border-border bg-background h-11 border px-3 font-bold"
                >
                  <option value="">No role</option>
                  {roleTags.map((tag) => (
                    <option key={tag.id} value={tag.id}>
                      {tag.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-mono text-[0.625rem] uppercase">
                  Notes
                </span>
                <textarea
                  data-testid="wishlist-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="border-border bg-background border p-3"
                />
              </label>

              {duplicateChoice !== null ? (
                <div
                  className="border-border bg-muted/40 flex flex-col gap-2 border p-3"
                  data-testid="wishlist-duplicate-prompt"
                >
                  <p className="text-sm font-bold">
                    This card is already on your wishlist.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      data-testid="wishlist-duplicate-update"
                      onClick={() => void handleSave("update")}
                    >
                      Update existing
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      data-testid="wishlist-duplicate-add"
                      onClick={() => void handleSave("allow_duplicate")}
                    >
                      Add another entry
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>

            <SheetFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                data-testid="wishlist-save-btn"
                disabled={addToWishlist.isPending}
                onClick={() => void handleSave()}
              >
                {addToWishlist.isPending ? "Saving…" : "Save"}
              </Button>
            </SheetFooter>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
