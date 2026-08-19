"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { formatLabel } from "@/lib/cards/legality";
import {
  LEGAL_IN_OPTIONS,
  MANA_COLORS,
  SEARCH_RARITY_OPTIONS,
  SEARCH_TYPE_OPTIONS,
} from "@/lib/cards/search-filters";
import { cn } from "@/lib/utils";
import type { CardSearchFilters, ColorMode } from "@/types/card";
import type { DeckFormat } from "@/types/index";

type CardSearchFiltersSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: CardSearchFilters;
  onApply: (filters: CardSearchFilters) => void;
  onClear: () => void;
};

function ToggleChip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId?: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={cn(
        "border-border inline-flex min-h-11 min-w-11 items-center justify-center border-2 px-3 text-xs font-bold uppercase",
        active
          ? "bg-primary text-primary-foreground shadow-brutal-sm"
          : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function toggleInList(list: string[] | undefined, item: string): string[] {
  const current = list ?? [];
  return current.includes(item)
    ? current.filter((x) => x !== item)
    : [...current, item];
}

export function CardSearchFiltersSheet({
  open,
  onOpenChange,
  value,
  onApply,
  onClear,
}: CardSearchFiltersSheetProps) {
  const [draft, setDraft] = useState<CardSearchFilters>(value);

  // Sync draft when opening
  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(value);
    onOpenChange(next);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        snap="tall"
        className="overflow-y-auto"
        data-testid="card-search-filters-sheet"
      >
        <SheetHeader>
          <SheetTitle>Filters</SheetTitle>
        </SheetHeader>

        <div className="flex flex-col gap-5 px-4 pb-2">
          <section className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase">Colors</h3>
            <div className="flex flex-wrap gap-2">
              {MANA_COLORS.map((c) => (
                <ToggleChip
                  key={c}
                  testId={`filter-color-${c}`}
                  active={(draft.colors ?? []).includes(c)}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      colors: toggleInList(d.colors, c),
                    }))
                  }
                >
                  {c}
                </ToggleChip>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["including", "Including"],
                  ["exact", "Exact"],
                  ["atMost", "At most"],
                ] as const
              ).map(([mode, label]) => (
                <ToggleChip
                  key={mode}
                  testId={`filter-color-mode-${mode}`}
                  active={(draft.colorMode ?? "including") === mode}
                  onClick={() =>
                    setDraft((d) => ({ ...d, colorMode: mode as ColorMode }))
                  }
                >
                  {label}
                </ToggleChip>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase">Color identity</h3>
            <div className="flex flex-wrap gap-2">
              {MANA_COLORS.filter((c) => c !== "C").map((c) => (
                <ToggleChip
                  key={c}
                  testId={`filter-id-${c}`}
                  active={(draft.colorIdentity ?? []).includes(c)}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      colorIdentity: toggleInList(d.colorIdentity, c),
                    }))
                  }
                >
                  {c}
                </ToggleChip>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase">Type</h3>
            <div className="flex flex-wrap gap-2">
              {SEARCH_TYPE_OPTIONS.map((t) => (
                <ToggleChip
                  key={t}
                  testId={`filter-type-${t}`}
                  active={(draft.types ?? []).includes(t)}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      types: toggleInList(d.types, t),
                    }))
                  }
                >
                  {t}
                </ToggleChip>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-mono text-xs uppercase">Rarity</h3>
            <div className="flex flex-wrap gap-2">
              {SEARCH_RARITY_OPTIONS.map((r) => (
                <ToggleChip
                  key={r}
                  testId={`filter-rarity-${r}`}
                  active={(draft.rarities ?? []).includes(r)}
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      rarities: toggleInList(d.rarities, r),
                    }))
                  }
                >
                  {r}
                </ToggleChip>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[0.625rem] uppercase">
                MV min
              </span>
              <Input
                type="number"
                min={0}
                max={20}
                data-testid="filter-mv-min"
                value={draft.manaValueMin ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    manaValueMin: v === "" ? undefined : Number(v),
                  }));
                }}
                className="h-11"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[0.625rem] uppercase">
                MV max
              </span>
              <Input
                type="number"
                min={0}
                max={20}
                data-testid="filter-mv-max"
                value={draft.manaValueMax ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setDraft((d) => ({
                    ...d,
                    manaValueMax: v === "" ? undefined : Number(v),
                  }));
                }}
                className="h-11"
              />
            </label>
          </section>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[0.625rem] uppercase">
              Set code
            </span>
            <Input
              data-testid="filter-set-code"
              value={draft.setCode ?? ""}
              placeholder="e.g. neo"
              className="h-11 uppercase"
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  setCode: e.target.value || undefined,
                }))
              }
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-mono text-[0.625rem] uppercase">
              Legal in
            </span>
            <select
              data-testid="filter-legal-in"
              className="border-border bg-background h-11 border-2 px-3 font-bold"
              value={draft.legalIn ?? ""}
              onChange={(e) => {
                const v = e.target.value;
                setDraft((d) => ({
                  ...d,
                  legalIn: (v || undefined) as DeckFormat | undefined,
                }));
              }}
            >
              <option value="">Any</option>
              {LEGAL_IN_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {formatLabel(f)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            data-testid="filter-clear-all"
            onClick={() => {
              onClear();
              setDraft({});
              onOpenChange(false);
            }}
          >
            Clear all
          </Button>
          <Button
            type="button"
            data-testid="filter-apply"
            onClick={() => {
              onApply(draft);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
