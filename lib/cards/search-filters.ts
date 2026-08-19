/**
 * Faceted card search filters — shared online (Scryfall) + offline (Dexie) model.
 */

import type {
  Card,
  CardSearchFilters,
  ColorMode,
  LegalityFormat,
} from "@/types/card";
import type { DeckFormat } from "@/types/index";

export type { CardSearchFilters, ColorMode };

export const EMPTY_SEARCH_FILTERS: CardSearchFilters = {};

export const SEARCH_TYPE_OPTIONS = [
  "creature",
  "instant",
  "sorcery",
  "artifact",
  "enchantment",
  "planeswalker",
  "land",
  "battle",
] as const;

export const SEARCH_RARITY_OPTIONS = [
  "common",
  "uncommon",
  "rare",
  "mythic",
] as const;

export const MANA_COLORS = ["W", "U", "B", "R", "G", "C"] as const;

function colorsKey(colors: string[]): string {
  return colors.map((c) => c.toLowerCase()).join("");
}

/** Append Scryfall filter fragments to user text (never rewrite the text). */
export function buildScryfallQuery(
  text: string,
  filters: CardSearchFilters,
): string {
  const parts: string[] = [];
  const trimmed = text.trim();
  if (trimmed) parts.push(trimmed);

  if (filters.colors && filters.colors.length > 0) {
    const key = colorsKey(filters.colors);
    const mode = filters.colorMode ?? "including";
    if (mode === "exact") parts.push(`c=${key}`);
    else if (mode === "atMost") parts.push(`c<=${key}`);
    else parts.push(`c>=${key}`);
  }

  if (filters.colorIdentity && filters.colorIdentity.length > 0) {
    parts.push(`id<=${colorsKey(filters.colorIdentity)}`);
  }

  if (filters.types && filters.types.length > 0) {
    const fragment = filters.types
      .map((t) => `t:${t.toLowerCase()}`)
      .join(" or ");
    parts.push(`(${fragment})`);
  }

  if (filters.rarities && filters.rarities.length > 0) {
    const fragment = filters.rarities
      .map((r) => `r:${r.toLowerCase()}`)
      .join(" or ");
    parts.push(`(${fragment})`);
  }

  if (filters.manaValueMin !== undefined) {
    parts.push(`cmc>=${filters.manaValueMin}`);
  }
  if (filters.manaValueMax !== undefined) {
    parts.push(`cmc<=${filters.manaValueMax}`);
  }

  if (filters.setCode?.trim()) {
    parts.push(`set:${filters.setCode.trim().toLowerCase()}`);
  }

  if (filters.legalIn && filters.legalIn !== "other") {
    parts.push(`legal:${filters.legalIn}`);
  }

  return parts.join(" ");
}

export function countActiveFilters(filters: CardSearchFilters): number {
  let n = 0;
  if (filters.colors && filters.colors.length > 0) n += 1;
  if (filters.colorIdentity && filters.colorIdentity.length > 0) n += 1;
  if (filters.types && filters.types.length > 0) n += 1;
  if (filters.rarities && filters.rarities.length > 0) n += 1;
  if (filters.manaValueMin !== undefined) n += 1;
  if (filters.manaValueMax !== undefined) n += 1;
  if (filters.setCode?.trim()) n += 1;
  if (filters.legalIn && filters.legalIn !== "other") n += 1;
  return n;
}

export function clearFilters(): CardSearchFilters {
  return { ...EMPTY_SEARCH_FILTERS };
}

export function hasActiveFilters(filters: CardSearchFilters): boolean {
  return countActiveFilters(filters) > 0;
}

function colorSet(colors: string[]): Set<string> {
  return new Set(colors.map((c) => c.toUpperCase()));
}

function matchesColors(
  cardColors: string[],
  filterColors: string[],
  mode: ColorMode,
): boolean {
  const card = colorSet(cardColors);
  const want = colorSet(filterColors);
  if (mode === "exact") {
    if (card.size !== want.size) return false;
    for (const c of want) if (!card.has(c)) return false;
    return true;
  }
  if (mode === "atMost") {
    for (const c of card) if (!want.has(c)) return false;
    return true;
  }
  for (const c of want) if (!card.has(c)) return false;
  return true;
}

function matchesIdentity(
  cardIdentity: string[],
  filterIdentity: string[],
): boolean {
  const allowed = colorSet(filterIdentity);
  for (const c of cardIdentity) {
    if (!allowed.has(c.toUpperCase())) return false;
  }
  return true;
}

/** Local predicates mirroring Scryfall filter fragments. */
export function applyLocalFilters(
  cards: Card[],
  filters: CardSearchFilters,
): Card[] {
  if (!hasActiveFilters(filters)) return cards;

  return cards.filter((card) => {
    if (filters.colors && filters.colors.length > 0) {
      const mode = filters.colorMode ?? "including";
      const want = filters.colors.map((c) => c.toUpperCase());
      const onlyColorless = want.length === 1 && want[0] === "C";
      if (onlyColorless) {
        if (card.colors.length > 0) return false;
      } else {
        const coloredWant = want.filter((c) => c !== "C");
        if (coloredWant.length > 0) {
          if (!matchesColors(card.colors, coloredWant, mode)) return false;
        }
      }
    }

    if (filters.colorIdentity && filters.colorIdentity.length > 0) {
      if (!matchesIdentity(card.colorIdentity, filters.colorIdentity)) {
        return false;
      }
    }

    if (filters.types && filters.types.length > 0) {
      const line = card.typeLine.toLowerCase();
      if (!filters.types.some((t) => line.includes(t.toLowerCase()))) {
        return false;
      }
    }

    if (filters.rarities && filters.rarities.length > 0) {
      const rarity = (card.rarity ?? "").toLowerCase();
      if (!filters.rarities.some((r) => r.toLowerCase() === rarity)) {
        return false;
      }
    }

    if (
      filters.manaValueMin !== undefined &&
      card.manaValue < filters.manaValueMin
    ) {
      return false;
    }
    if (
      filters.manaValueMax !== undefined &&
      card.manaValue > filters.manaValueMax
    ) {
      return false;
    }

    if (filters.setCode?.trim()) {
      const code = filters.setCode.trim().toLowerCase();
      if ((card.setCode ?? "").toLowerCase() !== code) return false;
    }

    if (filters.legalIn && filters.legalIn !== "other") {
      const legality = card.legalities?.[filters.legalIn as LegalityFormat];
      if (legality !== "legal") return false;
    }

    return true;
  });
}

/** Stable key fragment for React Query. */
export function filtersQueryKey(filters: CardSearchFilters): string {
  return JSON.stringify({
    colors: filters.colors ?? [],
    colorMode: filters.colorMode ?? "including",
    colorIdentity: filters.colorIdentity ?? [],
    types: filters.types ?? [],
    rarities: filters.rarities ?? [],
    manaValueMin: filters.manaValueMin ?? null,
    manaValueMax: filters.manaValueMax ?? null,
    setCode: filters.setCode?.trim().toLowerCase() ?? "",
    legalIn: filters.legalIn ?? "",
  });
}

/** Deck formats selectable in the “legal in” filter (exclude other). */
export const LEGAL_IN_OPTIONS: Exclude<DeckFormat, "other">[] = [
  "commander",
  "standard",
  "modern",
  "pioneer",
  "legacy",
  "vintage",
  "pauper",
];
