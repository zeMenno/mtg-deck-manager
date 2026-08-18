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
  legalities?: Partial<Record<DeckFormat, CardLegality>>;
  faces?: CardFace[];
  layout?: string;
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
];
