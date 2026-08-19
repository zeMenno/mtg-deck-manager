/**
 * Legality formats (Scryfall) and helpers for display + add-card warnings.
 */

import type { Card, CardLegality, LegalityFormat } from "@/types/card";
import type { DeckFormat } from "@/types/index";

/** All Scryfall legality keys we retain in the Card model. */
export const KNOWN_LEGALITY_FORMATS = [
  "standard",
  "future",
  "historic",
  "timeless",
  "gladiator",
  "pioneer",
  "explorer",
  "modern",
  "legacy",
  "pauper",
  "vintage",
  "penny",
  "commander",
  "oathbreaker",
  "standardbrawl",
  "brawl",
  "alchemy",
  "paupercommander",
  "duel",
  "oldschool",
  "premodern",
  "predh",
] as const satisfies readonly LegalityFormat[];

export const KNOWN_LEGALITY_FORMAT_SET = new Set<string>(
  KNOWN_LEGALITY_FORMATS,
);

/** Ordered list for the Legality tab UI. */
export const DISPLAY_LEGALITY_FORMATS: LegalityFormat[] = [
  "commander",
  "standard",
  "modern",
  "pioneer",
  "legacy",
  "vintage",
  "pauper",
  "brawl",
  "standardbrawl",
  "historic",
  "alchemy",
  "explorer",
  "timeless",
  "gladiator",
  "oathbreaker",
  "paupercommander",
  "duel",
  "penny",
  "premodern",
  "predh",
  "oldschool",
  "future",
];

export const FORMAT_LABELS: Record<LegalityFormat, string> = {
  standard: "Standard",
  future: "Future",
  historic: "Historic",
  timeless: "Timeless",
  gladiator: "Gladiator",
  pioneer: "Pioneer",
  explorer: "Explorer",
  modern: "Modern",
  legacy: "Legacy",
  pauper: "Pauper",
  vintage: "Vintage",
  penny: "Penny Dreadful",
  commander: "Commander",
  oathbreaker: "Oathbreaker",
  standardbrawl: "Standard Brawl",
  brawl: "Brawl",
  alchemy: "Alchemy",
  paupercommander: "Pauper Commander",
  duel: "Duel Commander",
  oldschool: "Old School",
  premodern: "Premodern",
  predh: "PreDH",
};

export function formatLabel(format: LegalityFormat | DeckFormat): string {
  if (format === "other") return "Other";
  return FORMAT_LABELS[format as LegalityFormat] ?? format;
}

export function isPlayableIn(
  card: Pick<Card, "legalities">,
  format: DeckFormat,
): boolean {
  if (format === "other") return true;
  const legality = card.legalities?.[format as LegalityFormat];
  return legality === "legal" || legality === undefined;
}

export type LegalityWarningKind = "banned" | "restricted" | "not_legal";

export type LegalityWarning = {
  kind: LegalityWarningKind;
  legality: CardLegality;
  format: Exclude<DeckFormat, "other">;
  /** Dialog / callout body (plain text; bold words marked with ** for UI split). */
  message: string;
  title: string;
};

/**
 * Returns a warning when adding would violate the deck format pool.
 * Skips when format is `other` or legality is missing / legal.
 */
export function getLegalityWarning(
  card: Pick<Card, "name" | "legalities">,
  format: DeckFormat,
): LegalityWarning | null {
  if (format === "other") return null;
  const legality = card.legalities?.[format as LegalityFormat];
  if (!legality || legality === "legal") return null;

  const label = formatLabel(format);
  const name = card.name;

  if (legality === "banned") {
    return {
      kind: "banned",
      legality,
      format,
      title: "Banned card",
      message: `${name} is **banned** in ${label}. Add it anyway?`,
    };
  }
  if (legality === "restricted") {
    return {
      kind: "restricted",
      legality,
      format,
      title: "Restricted card",
      message: `${name} is **restricted** in ${label} — max 1 copy. Add it anyway?`,
    };
  }
  return {
    kind: "not_legal",
    legality: "not_legal",
    format,
    title: "Not legal",
    message: `${name} is **not legal** in ${label} (not in the card pool). Add it anyway?`,
  };
}

/** Inline callout copy (no question — shown before commit). */
export function getLegalityCalloutText(
  card: Pick<Card, "name" | "legalities">,
  format: DeckFormat,
): string | null {
  const warning = getLegalityWarning(card, format);
  if (!warning) return null;
  const label = formatLabel(format);
  if (warning.kind === "banned") {
    return `${card.name} is banned in ${label}.`;
  }
  if (warning.kind === "restricted") {
    return `${card.name} is restricted in ${label} (max 1 copy).`;
  }
  return `${card.name} is not legal in ${label}.`;
}
