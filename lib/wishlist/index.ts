/**
 * Public exports for wishlist (Phase 12).
 */

export {
  WishlistService,
  getWishlistService,
  resetWishlistServiceSingleton,
  wishlistService,
} from "@/lib/wishlist/wishlist-service";
export {
  WishlistPromotionService,
  getWishlistPromotionService,
  resetWishlistPromotionServiceSingleton,
  wishlistPromotionService,
} from "@/lib/wishlist/wishlist-promotion-service";
export {
  calculateWishlistCost,
  sortWishlistByPriority,
} from "@/lib/wishlist/summary";
export type { WishlistCostSummary } from "@/lib/wishlist/summary";
export {
  WishlistPromotionConflictError,
  WishlistCardNotCachedError,
} from "@/lib/wishlist/types";
export type {
  AddToWishlistOptions,
  AddToWishlistResult,
  PromotionOptions,
  PromotionResult,
  WishlistItemWithCard,
  WishlistSummary,
} from "@/lib/wishlist/types";
export { wishlistKeys } from "@/lib/wishlist/wishlist-queries";
