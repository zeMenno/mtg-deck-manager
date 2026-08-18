/**
 * Shared domain types — mirrored from `docs/data-model.md`.
 *
 * Enums live here; entity interfaces live in sibling modules and are
 * re-exported for a single import surface (`@/types`).
 */

/** Deck formats. Only `commander` is validated in the MVP; the rest are stubs. */
export type DeckFormat =
  | "commander"
  | "standard"
  | "modern"
  | "pioneer"
  | "legacy"
  | "vintage"
  | "pauper"
  | "other";

/** The four-state upgrade workflow. */
export type DeckCardStatus = "current" | "add" | "cut" | "consider";

/** Where a card sits within a deck. */
export type DeckCardZone =
  "commander" | "mainboard" | "sideboard" | "maybeboard";

/** Tag classification. */
export type TagCategory = "role" | "synergy" | "custom";

/** Wishlist urgency, ordered essential > high > medium > low. */
export type WishlistPriority = "essential" | "high" | "medium" | "low";

/** Supported display currencies. */
export type Currency = "USD" | "EUR";

/** Card list density. */
export type DisplayDensity = "compact" | "comfortable" | "image";

export type {
  Deck,
  DeckCard,
  DeckCardWithCard,
  DeckVersion,
  DeckSnapshot,
  DeckCardSnapshot,
} from "@/types/deck";

export type {
  Card,
  CardFace,
  CardLegality,
  CardPrice,
  Tag,
  WishlistItem,
  AppSetting,
  AppMeta,
  AppSettings,
  SettingKey,
} from "@/types/card";

export {
  WISHLIST_PRIORITY_ORDER,
  DEFAULT_APP_SETTINGS,
  SETTING_KEYS,
} from "@/types/card";

export type {
  Wishlist,
  WishlistSortKey,
  WishlistPriorityFilter,
  WishlistItemFilters,
} from "@/types/wishlist";

export {
  PRIORITY_WEIGHT,
  PRIORITY_LABELS,
  ALL_PRIORITIES,
  DEFAULT_WISHLIST_ID,
  DEFAULT_WISHLIST_NAME,
} from "@/types/wishlist";

export type { AppBackup, DeckExport } from "@/types/backup";

export type {
  WarningCategory,
  WarningSeverity,
  DeckWarning,
  ProjectedDeck,
  RecommendationConfig,
  CardLookup,
  DeckValidationContext,
  DeckValidationMode,
  DeckValidationSummary,
} from "@/types/deck-validation";

export {
  DEFAULT_RECOMMENDATION_CONFIG,
  VALIDATION_ROLE_IDS,
} from "@/types/deck-validation";
