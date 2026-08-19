"use client";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ALL_PRIORITIES, PRIORITY_LABELS } from "@/types/wishlist";
import type { WishlistPriority, WishlistSortKey } from "@/types";
import type { Deck } from "@/types/deck";
import { cn } from "@/lib/utils";

type WishlistFiltersProps = {
  priority: WishlistPriority | "all";
  onPriorityChange: (value: WishlistPriority | "all") => void;
  targetDeckId: string | "all" | "none";
  onTargetDeckChange: (value: string | "all" | "none") => void;
  sort: WishlistSortKey;
  onSortChange: (value: WishlistSortKey) => void;
  search: string;
  onSearchChange: (value: string) => void;
  decks: Deck[];
};

export function WishlistFilters({
  priority,
  onPriorityChange,
  targetDeckId,
  onTargetDeckChange,
  sort,
  onSortChange,
  search,
  onSearchChange,
  decks,
}: WishlistFiltersProps) {
  const chips: Array<{ id: WishlistPriority | "all"; label: string }> = [
    { id: "all", label: "All" },
    ...ALL_PRIORITIES.map((p) => ({ id: p, label: PRIORITY_LABELS[p] })),
  ];

  return (
    <div className="flex flex-col gap-3" data-testid="wishlist-filters">
      <Input
        data-testid="wishlist-search-input"
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search wishlist…"
        aria-label="Search wishlist"
        className="h-11"
      />

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="Filter by priority"
      >
        {chips.map((chip) => (
          <Button
            key={chip.id}
            type="button"
            size="sm"
            variant={priority === chip.id ? "default" : "outline"}
            data-testid={`wishlist-filter-${chip.id}`}
            aria-pressed={priority === chip.id}
            className={cn("min-h-11")}
            onClick={() => onPriorityChange(chip.id)}
          >
            {chip.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.625rem] uppercase">Deck</span>
          <select
            data-testid="wishlist-deck-filter"
            value={targetDeckId}
            onChange={(e) =>
              onTargetDeckChange(e.target.value as string | "all" | "none")
            }
            className="border-border bg-background h-11 border px-2 font-bold"
          >
            <option value="all">All decks</option>
            <option value="none">No deck</option>
            {decks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="font-mono text-[0.625rem] uppercase">Sort</span>
          <select
            data-testid="wishlist-sort"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as WishlistSortKey)}
            className="border-border bg-background h-11 border px-2 font-bold"
          >
            <option value="priority">Priority</option>
            <option value="name">Name</option>
            <option value="price">Price</option>
            <option value="date">Date added</option>
          </select>
        </label>
      </div>
    </div>
  );
}
