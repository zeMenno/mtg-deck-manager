"use client";

import { useEffect, useState } from "react";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEFAULT_DEBOUNCE_MS = 300;

type CardSearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  /** Debounced value for queries (fires after idle). */
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  isLoading?: boolean;
  className?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
};

export function CardSearchInput({
  value,
  onChange,
  onDebouncedChange,
  debounceMs = DEFAULT_DEBOUNCE_MS,
  isLoading = false,
  className,
  autoFocus,
  inputRef,
}: CardSearchInputProps) {
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  useEffect(() => {
    if (!onDebouncedChange) return;
    const handle = window.setTimeout(() => {
      onDebouncedChange(local);
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [local, debounceMs, onDebouncedChange]);

  return (
    <div className={cn("relative", className)}>
      <Search
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
      />
      <Input
        ref={inputRef}
        data-testid="card-search-input"
        type="search"
        value={local}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="Search cards…"
        aria-label="Search cards"
        className="h-12 pr-20 pl-10 text-base"
        onChange={(event) => {
          const next = event.target.value;
          setLocal(next);
          onChange(next);
        }}
      />
      <div className="absolute top-1/2 right-2 flex -translate-y-1/2 items-center gap-1">
        {isLoading ? (
          <Loader2
            aria-label="Searching"
            className="text-muted-foreground size-4 animate-spin"
          />
        ) : null}
        {local ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Clear search"
            onClick={() => {
              setLocal("");
              onChange("");
              onDebouncedChange?.("");
            }}
          >
            <X className="size-4" />
          </Button>
        ) : null}
      </div>
    </div>
  );
}
