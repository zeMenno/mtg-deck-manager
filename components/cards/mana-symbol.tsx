"use client";

import { useSymbology } from "@/lib/hooks/use-symbology";
import { cn } from "@/lib/utils";

const SIZE_PX = { sm: 14, md: 18, lg: 24 } as const;

const PIP_COLORS: Record<string, string> = {
  W: "bg-mana-w text-mana-w-foreground border-border",
  U: "bg-mana-u text-mana-u-foreground border-border",
  B: "bg-mana-b text-mana-b-foreground border-border",
  R: "bg-mana-r text-mana-r-foreground border-border",
  G: "bg-mana-g text-mana-g-foreground border-border",
  C: "bg-mana-c text-mana-c-foreground border-border",
};

type ManaSymbolProps = {
  symbol: string;
  size?: keyof typeof SIZE_PX;
  className?: string;
};

/**
 * Single mana / cost symbol. Prefer cached SVG; fall back to letter pip or raw text.
 */
export function ManaSymbol({
  symbol,
  size = "md",
  className,
}: ManaSymbolProps) {
  const { symbols } = useSymbology();
  const entry = symbols.get(symbol);
  const px = SIZE_PX[size];

  if (entry?.svgUri) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- Scryfall SVG; not next/image
      <img
        src={entry.svgUri}
        alt=""
        aria-hidden
        width={px}
        height={px}
        className={cn("inline-block shrink-0", className)}
        style={{ width: px, height: px }}
        loading="lazy"
        decoding="async"
      />
    );
  }

  const inner = symbol.replace(/^\{|\}$/g, "");
  const letter = inner.length === 1 ? inner.toUpperCase() : null;
  if (letter && PIP_COLORS[letter]) {
    return (
      <span
        aria-hidden
        className={cn(
          "inline-flex shrink-0 items-center justify-center rounded-full border font-mono font-bold",
          PIP_COLORS[letter],
          className,
        )}
        style={{ width: px, height: px, fontSize: Math.max(9, px * 0.55) }}
      >
        {letter}
      </span>
    );
  }

  return (
    <span
      aria-hidden
      className={cn("font-mono text-[0.65rem] font-bold", className)}
    >
      {symbol}
    </span>
  );
}
