/**
 * Card / pricing / tag / wishlist entities — mirrored from `docs/data-model.md`
 * §§4–6, §8–9.
 */

import type {
  Currency,
  DeckFormat,
  DisplayDensity,
  TagCategory,
  WishlistPriority,
} from "@/types/index";
import type { RecommendationConfig } from "@/types/deck-validation";
import { DEFAULT_RECOMMENDATION_CONFIG } from "@/types/deck-validation";

export type CardLegality = "legal" | "not_legal" | "banned" | "restricted";

/** Scryfall legality keys retained on Card (superset of DeckFormat minus `other`). */
export type LegalityFormat =
  | "standard"
  | "future"
  | "historic"
  | "timeless"
  | "gladiator"
  | "pioneer"
  | "explorer"
  | "modern"
  | "legacy"
  | "pauper"
  | "vintage"
  | "penny"
  | "commander"
  | "oathbreaker"
  | "standardbrawl"
  | "brawl"
  | "alchemy"
  | "paupercommander"
  | "duel"
  | "oldschool"
  | "premodern"
  | "predh";

export type ColorMode = "exact" | "including" | "atMost";

/** Faceted card search filters (Phase 17) — shared online + offline. */
export type CardSearchFilters = {
  colors?: string[];
  colorMode?: ColorMode;
  colorIdentity?: string[];
  types?: string[];
  rarities?: string[];
  manaValueMin?: number;
  manaValueMax?: number;
  setCode?: string;
  /** Deck format for `legal:` filter; `other` is ignored. */
  legalIn?: DeckFormat;
};

export interface CardFace {
  name: string;
  manaCost?: string;
  typeLine?: string;
  oracleText?: string;
  imageSmall?: string;
  imageNormal?: string;
  imageLarge?: string;
}

export interface Card {
  /** Scryfall `id` — specific printing. Primary key. */
  id: string;
  /** Scryfall `oracle_id` — logical card across printings. */
  oracleId: string;
  name: string;
  manaCost?: string;
  manaValue: number;
  typeLine: string;
  oracleText?: string;
  colors: string[];
  colorIdentity: string[];
  keywords: string[];
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  rarity?: string;
  imageSmall?: string;
  imageNormal?: string;
  imageLarge?: string;
  scryfallUri?: string;
  tcgplayerUri?: string;
  legalities?: Partial<Record<LegalityFormat, CardLegality>>;
  faces?: CardFace[];
  layout?: string;
  updatedAt: string;
}

/** Cached Scryfall symbology row (Dexie `symbols` table). */
export interface MtgSymbol {
  symbol: string;
  svgUri: string;
  english: string;
  representsMana: boolean;
  colors: string[];
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  category: TagCategory;
  color?: string;
  seeded?: boolean;
  hidden?: boolean;
  sortOrder?: number;
}

export interface CardPrice {
  cardId: string;
  currency: Currency;
  low?: number;
  market?: number;
  normal?: number;
  foil?: number;
  source: string;
  fetchedAt: string;
}

export interface WishlistItem {
  id: string;
  cardId: string;
  quantity: number;
  priority: WishlistPriority;
  targetDeckId?: string;
  targetRole?: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
  wishlistId?: string;
}

export const WISHLIST_PRIORITY_ORDER: Record<WishlistPriority, number> = {
  essential: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export interface AppSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}

export interface AppMeta {
  key: string;
  value: unknown;
  updatedAt: string;
}

/** Typed settings surface — preferred over raw key strings. */
export interface AppSettings {
  imagesEnabled: boolean;
  densityMode: DisplayDensity;
  currency: Currency;
  priceFreshnessHours: number;
  lastBackupAt: string | null;
  installBannerDismissed: boolean;
  activeDeckId: string | null;
  recommendationConfig: RecommendationConfig;
  /** Last-used card search filters (Phase 17). */
  searchFilters: CardSearchFilters | null;
  /** Apply deterministic local suggestions when adding an untagged card. */
  "tags.suggestOnAdd": boolean;
  /** Fine-pointer hover preview of card art. */
  "cardZoom.hoverPreview": boolean;
  /** Tap/click list thumbnails to open the zoom overlay. */
  "cardZoom.tapImageOpensZoom": boolean;
}

export const DEFAULT_APP_SETTINGS: AppSettings = {
  imagesEnabled: true,
  densityMode: "comfortable",
  currency: "USD",
  priceFreshnessHours: 24,
  lastBackupAt: null,
  installBannerDismissed: false,
  activeDeckId: null,
  recommendationConfig: { ...DEFAULT_RECOMMENDATION_CONFIG },
  searchFilters: null,
  "tags.suggestOnAdd": true,
  "cardZoom.hoverPreview": true,
  "cardZoom.tapImageOpensZoom": true,
};

/** Known setting keys (docs/data-model.md §9). */
export type SettingKey = keyof AppSettings;

export const SETTING_KEYS: SettingKey[] = [
  "imagesEnabled",
  "densityMode",
  "currency",
  "priceFreshnessHours",
  "lastBackupAt",
  "installBannerDismissed",
  "activeDeckId",
  "recommendationConfig",
  "searchFilters",
  "tags.suggestOnAdd",
  "cardZoom.hoverPreview",
  "cardZoom.tapImageOpensZoom",
];
