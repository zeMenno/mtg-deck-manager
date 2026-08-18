"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { CardImage } from "@/components/cards/card-image";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
  useRemoveFromWishlist,
  useUpdateWishlistItem,
} from "@/lib/hooks/use-wishlist";
import type { WishlistPriority } from "@/types";
import type { WishlistItemWithCard } from "@/lib/wishlist/types";

type EditWishlistItemSheetProps = {
  item: WishlistItemWithCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewCard?: () => void;
  onMoveConsider?: () => void;
  onMoveAdd?: () => void;
};

export function EditWishlistItemSheet({
  item,
  open,
  onOpenChange,
  onViewCard,
  onMoveConsider,
  onMoveAdd,
}: EditWishlistItemSheetProps) {
  const { decks } = useDecks();
  const { tags: roleTags } = useTagsByCategory("role");
  const updateItem = useUpdateWishlistItem();
  const removeItem = useRemoveFromWishlist();

  const [quantity, setQuantity] = useState(1);
  const [priority, setPriority] = useState<WishlistPriority>("medium");
  const [targetDeckId, setTargetDeckId] = useState("");
  const [targetRole, setTargetRole] = useState("");
  const [notes, setNotes] = useState("");
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!item) return;
    setQuantity(item.quantity);
    setPriority(item.priority);
    setTargetDeckId(item.targetDeckId ?? "");
    setTargetRole(item.targetRole ?? "");
    setNotes(item.notes ?? "");
  }, [item]);

  async function handleSave() {
    if (!item) return;
    try {
      await updateItem.mutateAsync({
        itemId: item.id,
        patch: {
          quantity,
          priority,
          targetDeckId: targetDeckId || null,
          targetRole: targetRole || null,
          notes: notes.trim() || null,
        },
      });
      toast.success("Wishlist item updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not update wishlist item",
      );
    }
  }

  async function handleRemove() {
    if (!item) return;
    try {
      await removeItem.mutateAsync(item.id);
      toast.success("Removed from wishlist");
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not remove wishlist item",
      );
    }
  }

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="overflow-y-auto"
          data-testid="edit-wishlist-item-sheet"
        >
          {item ? (
            <>
              <SheetHeader>
                <SheetTitle>Edit Wishlist Item</SheetTitle>
                <SheetDescription>
                  {item.card?.name ?? "Unknown card"}
                </SheetDescription>
              </SheetHeader>

              <div className="flex flex-col gap-4 px-4 pb-2">
                {item.card ? (
                  <div className="flex justify-center">
                    <CardImage
                      card={item.card}
                      size="sm"
                      imagesEnabled
                      priority
                    />
                  </div>
                ) : null}

                <label className="flex flex-col gap-1">
                  <span className="font-mono text-[0.625rem] uppercase">
                    Qty
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    data-testid="edit-wishlist-qty"
                    value={quantity}
                    onChange={(e) =>
                      setQuantity(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="border-border bg-background h-11 border-2 px-3"
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
                    Target deck
                  </span>
                  <select
                    data-testid="edit-wishlist-target-deck"
                    value={targetDeckId}
                    onChange={(e) => setTargetDeckId(e.target.value)}
                    className="border-border bg-background h-11 border-2 px-3 font-bold"
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
                    Target role
                  </span>
                  <select
                    data-testid="edit-wishlist-target-role"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="border-border bg-background h-11 border-2 px-3 font-bold"
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
                    data-testid="edit-wishlist-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="border-border bg-background border-2 p-3"
                  />
                </label>
              </div>

              <SheetFooter>
                {onViewCard ? (
                  <Button
                    type="button"
                    variant="outline"
                    data-testid="edit-wishlist-view-card"
                    onClick={onViewCard}
                  >
                    View card
                  </Button>
                ) : null}
                {onMoveConsider ? (
                  <Button
                    type="button"
                    variant="secondary"
                    data-testid="edit-wishlist-move-consider"
                    onClick={onMoveConsider}
                  >
                    Move to CONSIDER
                  </Button>
                ) : null}
                {onMoveAdd ? (
                  <Button
                    type="button"
                    variant="secondary"
                    data-testid="edit-wishlist-move-add"
                    onClick={onMoveAdd}
                  >
                    Move to ADD
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="destructive"
                  data-testid="edit-wishlist-remove"
                  onClick={() => setConfirmRemove(true)}
                >
                  Remove from wishlist
                </Button>
                <Button
                  type="button"
                  data-testid="edit-wishlist-save"
                  disabled={updateItem.isPending}
                  onClick={() => void handleSave()}
                >
                  {updateItem.isPending ? "Saving…" : "Save"}
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove from wishlist?"
        description="This cannot be undone."
        confirmLabel="Remove"
        destructive
        pending={removeItem.isPending}
        onConfirm={() => handleRemove()}
        testId="wishlist-remove-confirm"
      />
    </>
  );
}
