"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { RoleSynergyPicker } from "@/components/deck/role-synergy-picker";
import { DeckStatusBadge } from "@/components/deck/deck-status-badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { DECK_CARD_STATUSES, DECK_CARD_ZONES } from "@/lib/deck/constants";
import {
  useAddCard,
  useRemoveCard,
  useSetQuantity,
  useSetStatus,
  useSetZone,
  useUpdateDeckCard,
} from "@/lib/hooks/use-deck-mutations";
import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { DeckCardWithCard } from "@/types/deck";

type DeckCardActionsSheetProps = {
  item: DeckCardWithCard | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onViewDetails?: () => void;
};

export function DeckCardActionsSheet({
  item,
  open,
  onOpenChange,
  onViewDetails,
}: DeckCardActionsSheetProps) {
  const setStatus = useSetStatus();
  const setQuantity = useSetQuantity();
  const setZone = useSetZone();
  const updateCard = useUpdateDeckCard();
  const removeCard = useRemoveCard();
  const addCard = useAddCard();

  const [notes, setNotes] = useState("");
  const [roles, setRoles] = useState<string[]>([]);
  const [synergies, setSynergies] = useState<string[]>([]);
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!item) return;
    setNotes(item.notes ?? "");
    setRoles(item.roles);
    setSynergies(item.synergies);
  }, [item]);

  if (!item) return null;

  const isCommander = item.zone === "commander";

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="overflow-y-auto"
          data-testid="deck-card-actions-sheet"
        >
          <SheetHeader>
            <SheetTitle>{item.card.name}</SheetTitle>
            <SheetDescription className="flex items-center gap-2">
              <DeckStatusBadge status={item.status} />
              <span className="font-mono text-xs uppercase">{item.zone}</span>
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-col gap-5 px-4 pb-8">
            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase">Status</h3>
              <div className="grid grid-cols-2 gap-2">
                {DECK_CARD_STATUSES.map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={item.status === status ? "default" : "outline"}
                    data-testid={`status-${status}-btn`}
                    onClick={() => {
                      void setStatus
                        .mutateAsync({ deckCardId: item.id, status })
                        .then(() => toast.success(`Marked ${status}`));
                    }}
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase">Quantity</h3>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isCommander || item.quantity <= 1}
                  data-testid="qty-decrement"
                  onClick={() => {
                    void setQuantity.mutateAsync({
                      deckCardId: item.id,
                      quantity: item.quantity - 1,
                    });
                  }}
                >
                  −
                </Button>
                <span
                  className="font-mono text-lg font-bold"
                  data-testid="qty-value"
                >
                  {item.quantity}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={isCommander || item.quantity >= 99}
                  data-testid="qty-increment"
                  onClick={() => {
                    void setQuantity.mutateAsync({
                      deckCardId: item.id,
                      quantity: item.quantity + 1,
                    });
                  }}
                >
                  +
                </Button>
              </div>
            </section>

            {!isCommander ? (
              <section className="flex flex-col gap-2">
                <h3 className="font-mono text-xs uppercase">Zone</h3>
                <div className="grid grid-cols-2 gap-2">
                  {DECK_CARD_ZONES.filter((z) => z !== "commander").map(
                    (zone) => (
                      <Button
                        key={zone}
                        type="button"
                        size="sm"
                        variant={item.zone === zone ? "default" : "outline"}
                        data-testid={`zone-${zone}-btn`}
                        onClick={() => {
                          void setZone.mutateAsync({
                            deckCardId: item.id,
                            zone: zone as DeckCardZone,
                          });
                        }}
                      >
                        {zone}
                      </Button>
                    ),
                  )}
                </div>
              </section>
            ) : null}

            <section className="flex gap-2">
              <Button
                type="button"
                variant={item.owned ? "default" : "outline"}
                size="sm"
                data-testid="toggle-owned-btn"
                onClick={() => {
                  void updateCard.mutateAsync({
                    id: item.id,
                    patch: { owned: !item.owned },
                  });
                }}
              >
                Owned
              </Button>
              <Button
                type="button"
                variant={item.foil ? "default" : "outline"}
                size="sm"
                data-testid="toggle-foil-btn"
                onClick={() => {
                  void updateCard.mutateAsync({
                    id: item.id,
                    patch: { foil: !item.foil },
                  });
                }}
              >
                Foil
              </Button>
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase">Notes</h3>
              <textarea
                data-testid="deck-card-notes"
                value={notes}
                rows={3}
                className="border-border bg-background w-full border-2 p-3 text-sm"
                onChange={(e) => setNotes(e.target.value)}
                onBlur={() => {
                  if (notes !== (item.notes ?? "")) {
                    void updateCard.mutateAsync({
                      id: item.id,
                      patch: { notes },
                    });
                  }
                }}
              />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase">Roles</h3>
              <RoleSynergyPicker
                category="role"
                selectedIds={roles}
                onChange={(ids) => {
                  setRoles(ids);
                  void updateCard.mutateAsync({
                    id: item.id,
                    patch: { roles: ids },
                  });
                }}
              />
            </section>

            <section className="flex flex-col gap-2">
              <h3 className="font-mono text-xs uppercase">Synergies</h3>
              <RoleSynergyPicker
                category="synergy"
                selectedIds={synergies}
                onChange={(ids) => {
                  setSynergies(ids);
                  void updateCard.mutateAsync({
                    id: item.id,
                    patch: { synergies: ids },
                  });
                }}
              />
            </section>

            {onViewDetails ? (
              <Button
                type="button"
                variant="outline"
                data-testid="view-card-details-btn"
                onClick={onViewDetails}
              >
                View card details
              </Button>
            ) : null}

            <Button
              type="button"
              variant="destructive"
              data-testid="remove-from-deck-btn"
              onClick={() => setConfirmRemove(true)}
            >
              Remove from deck
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title="Remove card?"
        description={`Remove ${item.card.name} from this deck?`}
        confirmLabel="Remove"
        destructive
        pending={removeCard.isPending}
        onConfirm={async () => {
          const snapshot = item;
          await removeCard.mutateAsync(item.id);
          onOpenChange(false);
          toast.success(`Removed ${snapshot.card.name}`, {
            action: {
              label: "Undo",
              onClick: () => {
                void addCard.mutateAsync({
                  deckId: snapshot.deckId,
                  cardId: snapshot.cardId,
                  quantity: snapshot.quantity,
                  zone: snapshot.zone,
                  status: snapshot.status as DeckCardStatus,
                  foil: snapshot.foil,
                  owned: snapshot.owned,
                  notes: snapshot.notes,
                  roles: snapshot.roles,
                  synergies: snapshot.synergies,
                });
              },
            },
          });
        }}
      />
    </>
  );
}
