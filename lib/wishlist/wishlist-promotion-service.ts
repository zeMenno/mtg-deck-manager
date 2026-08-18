/**
 * WishlistPromotionService — move wishlist items into deck CONSIDER / ADD.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";
import { WishlistRepository } from "@/lib/db/repositories/wishlist-repository";
import { DeckCardService } from "@/lib/deck/deck-service";
import type { DeckCardStatus } from "@/types";
import {
  WishlistPromotionConflictError,
  type PromotionOptions,
  type PromotionResult,
} from "@/lib/wishlist/types";

export type WishlistPromotionServiceOptions = {
  database?: DeckBuilderDatabase;
  wishlist?: WishlistRepository;
  deckCards?: DeckCardRepository;
  decks?: DeckRepository;
  deckCardService?: DeckCardService;
};

export class WishlistPromotionService {
  private readonly database: DeckBuilderDatabase;
  private readonly wishlist: WishlistRepository;
  private readonly deckCards: DeckCardRepository;
  private readonly decks: DeckRepository;
  private readonly deckCardService: DeckCardService;

  constructor(options: WishlistPromotionServiceOptions = {}) {
    this.database = options.database ?? getDatabase();
    this.wishlist = options.wishlist ?? new WishlistRepository(this.database);
    this.deckCards = options.deckCards ?? new DeckCardRepository(this.database);
    this.decks = options.decks ?? new DeckRepository(this.database);
    this.deckCardService =
      options.deckCardService ?? new DeckCardService(this.database);
  }

  async promoteToConsider(
    itemId: string,
    deckId: string,
    options: PromotionOptions = {},
  ): Promise<PromotionResult> {
    return this.promote(itemId, deckId, "consider", options);
  }

  async promoteToAdd(
    itemId: string,
    deckId: string,
    options: PromotionOptions = {},
  ): Promise<PromotionResult> {
    return this.promote(itemId, deckId, "add", options);
  }

  async promoteMany(
    itemIds: string[],
    deckId: string,
    status: Extract<DeckCardStatus, "consider" | "add">,
    options: PromotionOptions = {},
  ): Promise<PromotionResult[]> {
    const results: PromotionResult[] = [];
    for (const itemId of itemIds) {
      results.push(await this.promote(itemId, deckId, status, options));
    }
    return results;
  }

  private async promote(
    itemId: string,
    deckId: string,
    status: Extract<DeckCardStatus, "consider" | "add">,
    options: PromotionOptions,
  ): Promise<PromotionResult> {
    const item = await this.wishlist.getItemById(itemId);
    if (!item) {
      throw new Error(`WishlistItem not found: ${itemId}`);
    }

    const deck = await this.decks.getById(deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }

    const existingRows = await this.deckCards.findByDeckAndCardId(
      deckId,
      item.cardId,
    );
    const existingCurrent = existingRows.filter((r) => r.status === "current");

    if (existingCurrent.length > 0 && !options.allowCurrentConflict) {
      throw new WishlistPromotionConflictError(
        "Card is already in deck as CURRENT",
        {
          deckId,
          cardId: item.cardId,
          existingCurrent,
        },
      );
    }

    const zone = options.zone ?? "mainboard";
    const quantity = options.quantity ?? item.quantity;
    const roles = this.resolveRoles(item.targetRole, options.roles);

    const result = await this.deckCardService.addCardToDeck({
      deckId,
      cardId: item.cardId,
      quantity,
      zone,
      status,
      roles: roles.length > 0 ? roles : undefined,
    });

    // If we merged into an existing row without roles, ensure targetRole is applied.
    if (
      roles.length > 0 &&
      result.merged &&
      !roles.every((r) => result.deckCard.roles.includes(r))
    ) {
      const mergedRoles = [...new Set([...result.deckCard.roles, ...roles])];
      await this.deckCardService.setRoles(result.deckCard.id, mergedRoles);
      result.deckCard =
        (await this.deckCards.getById(result.deckCard.id)) ?? result.deckCard;
    }

    const removeFromWishlist = options.removeFromWishlist !== false;
    let wishlistItem: typeof item | null = item;
    if (removeFromWishlist) {
      await this.wishlist.removeItem(itemId);
      wishlistItem = null;
    }

    const warnings = result.warnings.map((w) => w.message);
    if (existingCurrent.length > 0) {
      warnings.push(
        "Card is already in this deck as CURRENT — promoted as a separate upgrade row.",
      );
    }

    return {
      deckCard: result.deckCard,
      wishlistItem,
      removedFromWishlist: removeFromWishlist,
      merged: result.merged,
      status,
      warnings,
    };
  }

  private resolveRoles(
    targetRole: string | undefined,
    override?: string[],
  ): string[] {
    if (override && override.length > 0) return [...new Set(override)];
    if (targetRole) return [targetRole];
    return [];
  }
}

let singleton: WishlistPromotionService | null = null;

export function getWishlistPromotionService(): WishlistPromotionService {
  if (!singleton) {
    singleton = new WishlistPromotionService();
  }
  return singleton;
}

/** Tests only. */
export function resetWishlistPromotionServiceSingleton(): void {
  singleton = null;
}

export const wishlistPromotionService = {
  promoteToConsider: (
    ...args: Parameters<WishlistPromotionService["promoteToConsider"]>
  ) => getWishlistPromotionService().promoteToConsider(...args),
  promoteToAdd: (
    ...args: Parameters<WishlistPromotionService["promoteToAdd"]>
  ) => getWishlistPromotionService().promoteToAdd(...args),
  promoteMany: (...args: Parameters<WishlistPromotionService["promoteMany"]>) =>
    getWishlistPromotionService().promoteMany(...args),
};
