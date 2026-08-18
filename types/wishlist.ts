/**
 * Wishlist domain types (Phase 12).
 *
 * v1.0 uses a single implicit wishlist — only `WishlistItem` rows are
 * persisted. The `Wishlist` container is defined for forward compatibility.
 */

import type { WishlistPriority } from "@/types/index";
import type { WishlistItem } from "@/types/card";

export type { WishlistPriority, WishlistItem };

/** Priority sort weight — lower sorts first (Essential → Low). */
export const PRIORITY_WEIGHT: Record<WishlistPriority, number> = {
  essential: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/** Alias matching docs/data-model.md naming. */
export const WISHLIST_PRIORITY_ORDER = PRIORITY_WEIGHT;

export const DEFAULT_WISHLIST_ID = "default";
export const DEFAULT_WISHLIST_NAME = "My Wishlist";

export interface Wishlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export type WishlistSortKey = "priority" | "name" | "price" | "date";

export type WishlistPriorityFilter = WishlistPriority | "all";

export type WishlistItemFilters = {
  priority?: WishlistPriority;
  targetDeckId?: string | null;
  cardId?: string;
  wishlistId?: string;
};

export const PRIORITY_LABELS: Record<WishlistPriority, string> = {
  essential: "Essential",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export const ALL_PRIORITIES: WishlistPriority[] = [
  "essential",
  "high",
  "medium",
  "low",
];
