"use client";

import { X } from "lucide-react";

import { formatLabel } from "@/lib/cards/legality";
import { countActiveFilters } from "@/lib/cards/search-filters";
import type { CardSearchFilters } from "@/types/card";

type CardSearchFilterChipsProps = {
  filters: CardSearchFilters;
  onChange: (next: CardSearchFilters) => void;
  onClearAll: () => void;
};

type Chip = { key: string; label: string; remove: () => CardSearchFilters };

function buildChips(filters: CardSearchFilters): Chip[] {
  const chips: Chip[] = [];

  if (filters.colors && filters.colors.length > 0) {
    const mode = filters.colorMode ?? "including";
    chips.push({
      key: "colors",
      label: `Colors ${mode}: ${filters.colors.join("")}`,
      remove: () => {
        const next = { ...filters };
        delete next.colors;
        delete next.colorMode;
        return next;
      },
    });
  }

  if (filters.colorIdentity && filters.colorIdentity.length > 0) {
    chips.push({
      key: "id",
      label: `ID ≤ ${filters.colorIdentity.join("")}`,
      remove: () => {
        const next = { ...filters };
        delete next.colorIdentity;
        return next;
      },
    });
  }

  if (filters.types && filters.types.length > 0) {
    chips.push({
      key: "types",
      label: filters.types.join(", "),
      remove: () => {
        const next = { ...filters };
        delete next.types;
        return next;
      },
    });
  }

  if (filters.rarities && filters.rarities.length > 0) {
    chips.push({
      key: "rarities",
      label: filters.rarities.join(", "),
      remove: () => {
        const next = { ...filters };
        delete next.rarities;
        return next;
      },
    });
  }

  if (filters.manaValueMin !== undefined) {
    chips.push({
      key: "mvmin",
      label: `MV ≥ ${filters.manaValueMin}`,
      remove: () => {
        const next = { ...filters };
        delete next.manaValueMin;
        return next;
      },
    });
  }

  if (filters.manaValueMax !== undefined) {
    chips.push({
      key: "mvmax",
      label: `MV ≤ ${filters.manaValueMax}`,
      remove: () => {
        const next = { ...filters };
        delete next.manaValueMax;
        return next;
      },
    });
  }

  if (filters.setCode?.trim()) {
    chips.push({
      key: "set",
      label: `Set ${filters.setCode.toUpperCase()}`,
      remove: () => {
        const next = { ...filters };
        delete next.setCode;
        return next;
      },
    });
  }

  if (filters.legalIn && filters.legalIn !== "other") {
    chips.push({
      key: "legal",
      label: `Legal: ${formatLabel(filters.legalIn)}`,
      remove: () => {
        const next = { ...filters };
        delete next.legalIn;
        return next;
      },
    });
  }

  return chips;
}

export function CardSearchFilterChips({
  filters,
  onChange,
  onClearAll,
}: CardSearchFilterChipsProps) {
  if (countActiveFilters(filters) === 0) return null;

  const chips = buildChips(filters);

  return (
    <div
      className="flex flex-wrap items-center gap-2"
      data-testid="card-search-filter-chips"
    >
      {chips.map((chip) => (
        <button
          key={chip.key}
          type="button"
          className="border-border bg-secondary inline-flex min-h-9 items-center gap-1 border px-2 text-xs font-bold uppercase"
          onClick={() => onChange(chip.remove())}
          data-testid={`filter-chip-${chip.key}`}
        >
          {chip.label}
          <X className="size-3" aria-hidden />
        </button>
      ))}
      <button
        type="button"
        className="text-muted-foreground font-mono text-[0.625rem] uppercase underline"
        onClick={onClearAll}
        data-testid="filter-chips-clear-all"
      >
        Clear all
      </button>
    </div>
  );
}
