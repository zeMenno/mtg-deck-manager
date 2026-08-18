"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { DeckCardWithCard } from "@/types/deck";

type ReplacementLinkPickerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** ADD cards available as replacements. */
  addCards: DeckCardWithCard[];
  /** When linking from CUT → pick an ADD. */
  mode: "pick-add" | "pick-cut";
  cutCards?: DeckCardWithCard[];
  title?: string;
  onSelect: (deckCardId: string) => void;
};

export function ReplacementLinkPicker({
  open,
  onOpenChange,
  addCards,
  cutCards = [],
  mode,
  title,
  onSelect,
}: ReplacementLinkPickerProps) {
  const [query, setQuery] = useState("");

  const options = mode === "pick-add" ? addCards : cutCards;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((c) => c.card.name.toLowerCase().includes(q));
  }, [options, query]);

  const heading =
    title ??
    (mode === "pick-add" ? "Replace with ADD card" : "Link to CUT card");

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) setQuery("");
        onOpenChange(next);
      }}
    >
      <SheetContent
        side="bottom"
        className="overflow-y-auto"
        data-testid="replacement-link-picker"
      >
        <SheetHeader>
          <SheetTitle>{heading}</SheetTitle>
          <SheetDescription>
            {mode === "pick-add"
              ? "Select an ADD card that replaces this cut."
              : "Select the CUT card this ADD replaces."}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4 pb-8">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            data-testid="replacement-search"
            className="border-border bg-background h-11 w-full border-2 px-3"
          />

          {filtered.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {mode === "pick-add"
                ? "No ADD cards available. Mark cards as ADD first."
                : "No CUT cards available. Mark cards as CUT first."}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {filtered.map((item) => (
                <li key={item.id}>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-start py-3 text-left"
                    data-testid={`replacement-option-${item.id}`}
                    onClick={() => {
                      onSelect(item.id);
                      onOpenChange(false);
                      setQuery("");
                    }}
                  >
                    <span className="font-bold">{item.card.name}</span>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
