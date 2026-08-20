/**
 * Scryfall API response types (subset used by this app).
 * @see https://scryfall.com/docs/api/cards
 */

export type ScryfallObject =
  "card" | "list" | "error" | "catalog" | "card_face";

export interface ScryfallImageUris {
  small?: string;
  normal?: string;
  large?: string;
  png?: string;
  art_crop?: string;
  border_crop?: string;
}

export interface ScryfallCardFace {
  object?: "card_face";
  name: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  image_uris?: ScryfallImageUris;
  power?: string;
  toughness?: string;
  loyalty?: string;
}

export interface ScryfallPurchaseUris {
  tcgplayer?: string;
  cardmarket?: string;
  cardhoarder?: string;
}

export interface ScryfallPrices {
  usd?: string | null;
  usd_foil?: string | null;
  usd_etched?: string | null;
  eur?: string | null;
  eur_foil?: string | null;
  eur_etched?: string | null;
  tix?: string | null;
}

export interface ScryfallCard {
  object: "card";
  id: string;
  oracle_id?: string;
  name: string;
  lang?: string;
  mana_cost?: string;
  cmc?: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity?: string[];
  keywords?: string[];
  layout?: string;
  set?: string;
  set_name?: string;
  collector_number?: string;
  rarity?: string;
  released_at?: string;
  image_uris?: ScryfallImageUris;
  card_faces?: ScryfallCardFace[];
  scryfall_uri?: string;
  purchase_uris?: ScryfallPurchaseUris;
  prices?: ScryfallPrices;
  legalities?: Record<string, string>;
}

export interface ScryfallList<T> {
  object: "list";
  total_cards?: number;
  has_more?: boolean;
  next_page?: string;
  data: T[];
}

export interface ScryfallErrorBody {
  object: "error";
  code: string;
  status: number;
  details: string;
  type?: string;
  warnings?: string[];
}

export interface ScryfallCatalog {
  object: "catalog";
  uri?: string;
  total_values?: number;
  data: string[];
}

export type ScryfallSearchResult = ScryfallList<ScryfallCard>;

export interface ScryfallCollectionRequest {
  identifiers: Array<{ id: string } | { oracle_id: string } | { name: string }>;
}

export interface ScryfallCollectionResponse extends ScryfallList<ScryfallCard> {
  not_found?: Array<Record<string, string>>;
}
