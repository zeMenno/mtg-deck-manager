import type { DeckCardStatus, WishlistPriority } from "@/types";
import type { DeckCard } from "@/types/deck";
import type { WishlistItem } from "@/types/wishlist";
import type { Card } from "@/types/card";
import type { CardPrice } from "@/types/card";

export type AddToWishlistOptions = {
  quantity?: number;
  priority?: WishlistPriority;
  targetDeckId?: string | null;
  targetRole?: string | null;
  notes?: string | null;
  /**
   * When the card is already on the wishlist:
   * - `reject` (default) — return existing without creating
   * - `update` — merge into the first existing entry
   * - `allow_duplicate` — always create a new row
   */
  duplicateMode?: "reject" | "update" | "allow_duplicate";
};

export type AddToWishlistResult = {
  item: WishlistItem;
  created: boolean;
  existing?: WishlistItem;
};

export type PromotionOptions = {
  quantity?: number;
  zone?: DeckCard["zone"];
  /** Default true — remove wishlist item after successful promotion. */
  removeFromWishlist?: boolean;
  /**
   * Proceed even when the card is already CURRENT in the deck.
   * Creates a separate CONSIDER/ADD row (upgrade workflow).
   */
  allowCurrentConflict?: boolean;
  roles?: string[];
};

export type PromotionResult = {
  deckCard: DeckCard;
  wishlistItem: WishlistItem | null;
  removedFromWishlist: boolean;
  merged: boolean;
  status: Extract<DeckCardStatus, "consider" | "add">;
  warnings: string[];
};

export class WishlistPromotionConflictError extends Error {
  readonly code = "CURRENT_CONFLICT" as const;
  readonly deckId: string;
  readonly cardId: string;
  readonly existingCurrent: DeckCard[];

  constructor(
    message: string,
    opts: { deckId: string; cardId: string; existingCurrent: DeckCard[] },
  ) {
    super(message);
    this.name = "WishlistPromotionConflictError";
    this.deckId = opts.deckId;
    this.cardId = opts.cardId;
    this.existingCurrent = opts.existingCurrent;
  }
}

export class WishlistCardNotCachedError extends Error {
  readonly code = "CARD_NOT_CACHED" as const;
  readonly cardId: string;

  constructor(cardId: string) {
    super(
      "Card is not in the local cache. Connect online and open the card first, then try again.",
    );
    this.name = "WishlistCardNotCachedError";
    this.cardId = cardId;
  }
}

export type WishlistItemWithCard = WishlistItem & {
  card?: Card;
};

export type WishlistSummary = {
  totalItems: number;
  totalQuantity: number;
  byPriority: Record<WishlistPriority, number>;
  estimatedCost: number | undefined;
  pricedCount: number;
  totalPricedSlots: number;
  mostRecentFetchedAt: string | undefined;
  currency: string;
};

export type WishlistValuationLine = {
  item: WishlistItem;
  unitPrice: number | undefined;
  lineTotal: number | undefined;
  price: CardPrice | undefined;
};
