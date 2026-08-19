"use client";

import { DECK_FORMATS } from "@/lib/deck/constants";
import type { DeckFormat } from "@/types";
import { cn } from "@/lib/utils";

type DeckFormatSelectProps = {
  value: DeckFormat;
  onChange: (format: DeckFormat) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
};

export function DeckFormatSelect({
  value,
  onChange,
  id = "deck-format",
  disabled,
  className,
}: DeckFormatSelectProps) {
  return (
    <select
      id={id}
      data-testid="deck-format-select"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as DeckFormat)}
      className={cn(
        "border-border bg-background h-11 w-full rounded-md border px-3 font-bold uppercase shadow-sm",
        className,
      )}
    >
      {DECK_FORMATS.map((format) => (
        <option key={format} value={format}>
          {format}
        </option>
      ))}
    </select>
  );
}
