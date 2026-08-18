/**
 * Shared domain unions, mirrored from `docs/data-model.md` §1.
 *
 * Phase 1 only needs the enums that the app shell and theme tokens refer to.
 * Phase 3 owns the entity interfaces (`Deck`, `DeckCard`, `Card`, …) alongside
 * the Dexie schema, and must keep this file in sync with the data model doc.
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
