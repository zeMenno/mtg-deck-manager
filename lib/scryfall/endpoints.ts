/**
 * Scryfall URL builders.
 *
 * Search defaults to `unique=cards` (one result per oracle identity) to keep
 * the mobile list uncluttered. Use `unique=prints` when picking a specific art/set.
 */

export const SCRYFALL_BASE = "https://api.scryfall.com";

/** Descriptive User-Agent per Scryfall API guidelines. */
export const USER_AGENT =
  "MTGDeckBuilder/1.0 (+https://github.com/mfese/mtg-deck-manager)";

export type SearchUniqueMode = "cards" | "prints" | "art";

export type SearchCardsOptions = {
  unique?: SearchUniqueMode;
  page?: number;
  order?: string;
  dir?: "asc" | "desc";
  includeExtras?: boolean;
};

function withBase(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${SCRYFALL_BASE}${normalized}`;
}

/** `/cards/search?q=...&unique=cards` (default unique=cards). */
export function searchCardsUrl(
  q: string,
  options: SearchCardsOptions = {},
): string {
  const params = new URLSearchParams();
  params.set("q", q);
  params.set("unique", options.unique ?? "cards");
  if (options.page !== undefined) {
    params.set("page", String(options.page));
  }
  if (options.order) {
    params.set("order", options.order);
  }
  if (options.dir) {
    params.set("dir", options.dir);
  }
  if (options.includeExtras !== undefined) {
    params.set("include_extras", String(options.includeExtras));
  }
  return withBase(`/cards/search?${params.toString()}`);
}

/** `/cards/{id}` */
export function cardByIdUrl(id: string): string {
  return withBase(`/cards/${encodeURIComponent(id)}`);
}

/** `/cards/{set}/{collector_number}` — a specific printing. */
export function cardBySetCollectorUrl(
  setCode: string,
  collectorNumber: string,
): string {
  const set = setCode.trim().toLowerCase();
  const number = collectorNumber.trim();
  return withBase(
    `/cards/${encodeURIComponent(set)}/${encodeURIComponent(number)}`,
  );
}

/**
 * Collection endpoint path (POST body separately).
 * Scryfall allows max 75 identifiers per request.
 */
export function cardsCollectionUrl(): string {
  return withBase("/cards/collection");
}

/** `/cards/autocomplete?q=...` */
export function autocompleteUrl(q: string): string {
  const params = new URLSearchParams();
  params.set("q", q);
  return withBase(`/cards/autocomplete?${params.toString()}`);
}

/** `/cards/named?fuzzy=...` or `?exact=...` (+ optional set). */
export function namedCardUrl(
  name: string,
  options: { fuzzy?: boolean; set?: string } = {},
): string {
  const params = new URLSearchParams();
  if (options.fuzzy === false) {
    params.set("exact", name);
  } else {
    params.set("fuzzy", name);
  }
  if (options.set) {
    params.set("set", options.set);
  }
  return withBase(`/cards/named?${params.toString()}`);
}

/** `/symbology` — unpaginated card symbols list. */
export function symbologyUrl(): string {
  return withBase("/symbology");
}

export { withBase as resolveScryfallUrl };
