"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { CardSearchInput } from "@/components/cards/card-search-input";
import { CardResultRow } from "@/components/cards/card-result-row";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCardSearch } from "@/lib/hooks/use-card-search";
import { useAddCard, useRemoveCard } from "@/lib/hooks/use-deck-mutations";
import { useUndoAction } from "@/lib/hooks/use-undo-action";
import type { Card } from "@/types/card";
import type { DeckCardStatus } from "@/types";

type DeckAddCardSheetProps = {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imagesEnabled?: boolean;
  defaultStatus?: DeckCardStatus;
};

export function DeckAddCardSheet({
  deckId,
  open,
  onOpenChange,
  imagesEnabled = true,
  defaultStatus = "current",
}: DeckAddCardSheetProps) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const search = useCardSearch(debouncedQuery);
  const addCard = useAddCard();
  const removeCard = useRemoveCard();
  const { showUndo } = useUndoAction();

  const onDebouncedChange = useCallback((value: string) => {
    setDebouncedQuery(value);
  }, []);

  async function handleAdd(card: Card) {
    try {
      const result = await addCard.mutateAsync({
        deckId,
        cardId: card.id,
        status: defaultStatus,
      });
      const name = card.name;
      const deckCardId = result.deckCard.id;
      if (result.warnings.length > 0) {
        toast.warning(result.warnings[0]!.message);
      }
      showUndo({
        message: `Added ${name}`,
        undo: async () => {
          await removeCard.mutateAsync(deckCardId);
        },
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not add card");
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        snap="tall"
        className="overflow-y-auto"
        data-testid="deck-add-card-sheet"
      >
        <SheetHeader>
          <SheetTitle>Add card</SheetTitle>
          <SheetDescription>
            Search Scryfall and add cards to this deck.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 px-4 pb-8">
          <CardSearchInput
            value={inputValue}
            onChange={setInputValue}
            onDebouncedChange={onDebouncedChange}
            isLoading={search.isFetching}
            autoFocus
          />

          <ul className="flex flex-col gap-2" data-testid="add-card-results">
            {search.cards.map((card) => (
              <li key={card.id} className="flex items-stretch gap-2">
                <div className="min-w-0 flex-1">
                  <CardResultRow
                    card={card}
                    imagesEnabled={imagesEnabled}
                    onSelect={() => void handleAdd(card)}
                  />
                </div>
                <Button
                  type="button"
                  size="sm"
                  className="shrink-0 self-center"
                  data-testid={`add-to-deck-btn-${card.id}`}
                  disabled={addCard.isPending}
                  onClick={() => void handleAdd(card)}
                >
                  + Add
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
