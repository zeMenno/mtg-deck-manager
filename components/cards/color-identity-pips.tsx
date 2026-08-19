"use client";

import { ManaSymbol } from "@/components/cards/mana-symbol";
import { cn } from "@/lib/utils";

const ORDER = ["W", "U", "B", "R", "G", "C"] as const;

type ColorIdentityPipsProps = {
  colors: string[];
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  testId?: string;
};

/**
 * Color / color-identity pips (WUBRG + C).
 */
export function ColorIdentityPips({
  colors,
  label,
  size = "sm",
  className,
  testId = "color-pips",
}: ColorIdentityPipsProps) {
  const normalized = colors.map((c) => c.toUpperCase());
  const ordered =
    normalized.length === 0
      ? (["C"] as string[])
      : ORDER.filter((c) => normalized.includes(c));

  return (
    <div
      className={cn("flex flex-wrap items-center gap-2", className)}
      data-testid={testId}
    >
      {label ? (
        <span className="text-muted-foreground font-mono text-[0.625rem] uppercase">
          {label}
        </span>
      ) : null}
      <span
        role="img"
        aria-label={
          normalized.length === 0
            ? "colorless"
            : ordered.map((c) => c).join(" ")
        }
        className="inline-flex items-center gap-0.5"
      >
        {ordered.map((c) => (
          <ManaSymbol key={c} symbol={`{${c}}`} size={size} />
        ))}
      </span>
    </div>
  );
}
