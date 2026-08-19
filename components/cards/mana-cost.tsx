"use client";

import { ManaSymbol } from "@/components/cards/mana-symbol";
import { describeManaCost, parseManaCost } from "@/lib/mana/parse-mana-cost";
import { cn } from "@/lib/utils";

type ManaCostProps = {
  cost?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

/**
 * Renders a mana cost as a row of symbols with one accessible label.
 */
export function ManaCost({ cost, size = "md", className }: ManaCostProps) {
  const tokens = parseManaCost(cost);
  if (tokens.length === 0) return null;

  if (tokens.length === 1 && tokens[0]?.unknown) {
    return <span className={cn("font-mono text-sm", className)}>{cost}</span>;
  }

  return (
    <span
      role="img"
      aria-label={describeManaCost(cost)}
      className={cn("inline-flex flex-wrap items-center gap-0.5", className)}
      data-testid="mana-cost"
    >
      {tokens.map((token, index) => (
        <ManaSymbol
          key={`${token.raw}-${index}`}
          symbol={token.raw}
          size={size}
        />
      ))}
    </span>
  );
}
