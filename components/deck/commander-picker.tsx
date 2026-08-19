"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";

import { CardSearchInput } from "@/components/cards/card-search-input";
import { CardResultRow } from "@/components/cards/card-result-row";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCardSearch } from "@/lib/hooks/use-card-search";
import { useSetCommander } from "@/lib/hooks/use-deck-mutations";
import type { Card } from "@/types/card";

type CommanderPickerProps = {
  deckId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imagesEnabled?: boolean;
};

export function CommanderPicker({
  deckId,
  open,
  onOpenChange,
  imagesEnabled = true,
}: CommanderPickerProps) {
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  const search = useCardSearch(debouncedQuery);
  const setCommander = useSetCommander();

  const onDebouncedChange = useCallback((value: string) => {
    setDebouncedQuery(value);
  }, []);

  async function handleSelect(card: Card) {
    try {
      await setCommander.mutateAsync({ deckId, cardId: card.id });
      toast.success(`${card.name} is your commander`);
      onOpenChange(false);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not set commander",
      );
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        snap="tall"
        className="overflow-y-auto"
        data-testid="commander-picker"
      >
        <SheetHeader>
          <SheetTitle>Choose commander</SheetTitle>
          <SheetDescription>
            Search for a legendary creature (is:commander).
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

          <ul className="flex flex-col gap-2">
            {search.cards.map((card) => (
              <li key={card.id}>
                <CardResultRow
                  card={card}
                  imagesEnabled={imagesEnabled}
                  onSelect={() => void handleSelect(card)}
                />
              </li>
            ))}
          </ul>
        </div>
      </SheetContent>
    </Sheet>
  );
}
