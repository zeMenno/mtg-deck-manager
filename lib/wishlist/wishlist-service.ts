/**
 * WishlistService — business logic for global wishlist CRUD.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories/card-repository";
import { CardPriceRepository } from "@/lib/db/repositories/card-price-repository";
import { WishlistRepository } from "@/lib/db/repositories/wishlist-repository";
import { SettingsRepository } from "@/lib/db/repositories/settings-repository";
import { selectUnitPrice } from "@/lib/pricing/valuation";
import type { Currency, WishlistPriority } from "@/types";
import type { WishlistItem } from "@/types/card";
import {
  DEFAULT_WISHLIST_ID,
  PRIORITY_WEIGHT,
  type WishlistItemFilters,
  type WishlistSortKey,
} from "@/types/wishlist";
import type { Card } from "@/types/card";
import {
  WishlistCardNotCachedError,
  type AddToWishlistOptions,
  type AddToWishlistResult,
  type WishlistItemWithCard,
  type WishlistSummary,
} from "@/lib/wishlist/types";

export type WishlistServiceOptions = {
  database?: DeckBuilderDatabase;
  wishlist?: WishlistRepository;
  cards?: CardRepository;
  prices?: CardPriceRepository;
  settings?: SettingsRepository;
};

export class WishlistService {
  private readonly database: DeckBuilderDatabase;
  private readonly wishlist: WishlistRepository;
  private readonly cards: CardRepository;
  private readonly prices: CardPriceRepository;
  private readonly settings: SettingsRepository;

  constructor(options: WishlistServiceOptions = {}) {
    this.database = options.database ?? getDatabase();
    this.wishlist = options.wishlist ?? new WishlistRepository(this.database);
    this.cards = options.cards ?? new CardRepository(this.database);
    this.prices = options.prices ?? new CardPriceRepository(this.database);
    this.settings = options.settings ?? new SettingsRepository(this.database);
  }

  getDefaultWishlist() {
    return this.wishlist.getDefaultWishlist();
  }

  async listItems(filters?: WishlistItemFilters): Promise<WishlistItem[]> {
    return this.wishlist.getItems(DEFAULT_WISHLIST_ID, filters);
  }

  async listItemsWithCards(
    filters?: WishlistItemFilters,
  ): Promise<WishlistItemWithCard[]> {
    const items = await this.listItems(filters);
    if (items.length === 0) return [];

    const cardIds = [...new Set(items.map((i) => i.cardId))];
    const cards = await this.cards.getByIds(cardIds);
    const byId = new Map(cards.map((c) => [c.id, c]));

    return items.map((item) => ({
      ...item,
      card: byId.get(item.cardId),
    }));
  }

  async getItem(id: string): Promise<WishlistItem | undefined> {
    return this.wishlist.getItemById(id);
  }

  async findByCardId(cardId: string): Promise<WishlistItem[]> {
    return this.wishlist.findByCardId(cardId);
  }

  /**
   * Add a card to the wishlist. Requires the card to exist in the local
   * `cards` cache (offline-safe).
   */
  async addCardToWishlist(
    cardId: string,
    options: AddToWishlistOptions = {},
  ): Promise<AddToWishlistResult> {
    const card = await this.cards.getById(cardId);
    if (!card) {
      throw new WishlistCardNotCachedError(cardId);
    }

    const existing = await this.wishlist.findByCardId(cardId);
    const duplicateMode = options.duplicateMode ?? "reject";

    if (existing.length > 0 && duplicateMode === "reject") {
      return {
        item: existing[0]!,
        created: false,
        existing: existing[0],
      };
    }

    if (existing.length > 0 && duplicateMode === "update") {
      const first = existing[0]!;
      const patch: Partial<Omit<WishlistItem, "id" | "addedAt">> = {};
      if (options.quantity !== undefined) {
        patch.quantity = Math.max(1, options.quantity);
      } else {
        patch.quantity = first.quantity + (options.quantity ?? 1);
      }
      if (options.priority !== undefined) patch.priority = options.priority;
      if (options.targetDeckId !== undefined) {
        patch.targetDeckId = options.targetDeckId ?? undefined;
      }
      if (options.targetRole !== undefined) {
        patch.targetRole = options.targetRole ?? undefined;
      }
      if (options.notes !== undefined) {
        patch.notes = options.notes ?? undefined;
      }
      const item = await this.wishlist.updateItem(first.id, patch);
      return { item, created: false, existing: first };
    }

    const item = await this.wishlist.addItem({
      cardId,
      quantity: options.quantity,
      priority: options.priority,
      ...(options.targetDeckId ? { targetDeckId: options.targetDeckId } : {}),
      ...(options.targetRole ? { targetRole: options.targetRole } : {}),
      ...(options.notes ? { notes: options.notes } : {}),
    });

    return { item, created: true };
  }

  async updatePriority(
    itemId: string,
    priority: WishlistPriority,
  ): Promise<WishlistItem> {
    return this.wishlist.updateItem(itemId, { priority });
  }

  async setTargetDeck(
    itemId: string,
    deckId: string | null,
  ): Promise<WishlistItem> {
    return this.wishlist.updateItem(itemId, {
      targetDeckId: deckId ?? undefined,
    });
  }

  async setTargetRole(
    itemId: string,
    role: string | null,
  ): Promise<WishlistItem> {
    return this.wishlist.updateItem(itemId, {
      targetRole: role ?? undefined,
    });
  }

  async updateNotes(itemId: string, notes: string): Promise<WishlistItem> {
    return this.wishlist.updateItem(itemId, {
      notes: notes.trim() === "" ? undefined : notes,
    });
  }

  async updateQuantity(
    itemId: string,
    quantity: number,
  ): Promise<WishlistItem> {
    if (quantity < 1) {
      throw new Error("quantity must be >= 1");
    }
    return this.wishlist.updateItem(itemId, { quantity });
  }

  async updateItem(
    itemId: string,
    patch: {
      quantity?: number;
      priority?: WishlistPriority;
      targetDeckId?: string | null;
      targetRole?: string | null;
      notes?: string | null;
    },
  ): Promise<WishlistItem> {
    const next: Partial<Omit<WishlistItem, "id" | "addedAt">> = {};
    if (patch.quantity !== undefined) {
      if (patch.quantity < 1) throw new Error("quantity must be >= 1");
      next.quantity = patch.quantity;
    }
    if (patch.priority !== undefined) next.priority = patch.priority;
    if (patch.targetDeckId !== undefined) {
      next.targetDeckId = patch.targetDeckId ?? undefined;
    }
    if (patch.targetRole !== undefined) {
      next.targetRole = patch.targetRole ?? undefined;
    }
    if (patch.notes !== undefined) {
      next.notes =
        patch.notes == null || patch.notes.trim() === ""
          ? undefined
          : patch.notes;
    }
    return this.wishlist.updateItem(itemId, next);
  }

  async removeFromWishlist(itemId: string): Promise<void> {
    await this.wishlist.removeItem(itemId);
  }

  /** Undo helper: put a deleted wishlist row back with the same id. */
  async restoreWishlistItem(item: WishlistItem): Promise<WishlistItem> {
    return this.wishlist.restore(item);
  }

  async restoreWishlistItems(items: WishlistItem[]): Promise<void> {
    await this.wishlist.restoreMany(items);
  }

  async removeItems(ids: string[]): Promise<void> {
    await this.wishlist.removeItems(ids);
  }

  async countByPriority(): Promise<Record<WishlistPriority, number>> {
    return this.wishlist.countByPriority(DEFAULT_WISHLIST_ID);
  }

  /**
   * Estimated wishlist cost. Unpriced items are skipped (never treated as $0).
   */
  async getSummary(currency?: Currency): Promise<WishlistSummary> {
    const items = await this.listItems();
    const byPriority = await this.countByPriority();
    const resolvedCurrency = currency ?? (await this.settings.get("currency"));

    const cardIds = [...new Set(items.map((i) => i.cardId))];
    const priceMap = await this.prices.getByCardIdsForCurrency(
      cardIds,
      resolvedCurrency,
    );

    let sum = 0;
    let pricedCount = 0;
    let mostRecentFetchedAt: string | undefined;
    let totalQuantity = 0;

    for (const item of items) {
      totalQuantity += item.quantity;
      const price = priceMap.get(item.cardId);
      const unit = selectUnitPrice(price, { foil: false });
      if (unit == null) continue;
      sum += unit * item.quantity;
      pricedCount += 1;
      if (price?.fetchedAt) {
        if (
          !mostRecentFetchedAt ||
          Date.parse(price.fetchedAt) > Date.parse(mostRecentFetchedAt)
        ) {
          mostRecentFetchedAt = price.fetchedAt;
        }
      }
    }

    return {
      totalItems: items.length,
      totalQuantity,
      byPriority,
      estimatedCost: pricedCount === 0 ? undefined : sum,
      pricedCount,
      totalPricedSlots: items.length,
      mostRecentFetchedAt,
      currency: resolvedCurrency,
    };
  }

  sortItems(
    items: WishlistItemWithCard[],
    sort: WishlistSortKey,
    priceByCardId?: Map<string, number | undefined>,
  ): WishlistItemWithCard[] {
    const copy = [...items];
    switch (sort) {
      case "priority":
        return this.wishlist.sortByPriority(copy);
      case "name":
        return copy.sort((a, b) => {
          const an = a.card?.name ?? a.cardId;
          const bn = b.card?.name ?? b.cardId;
          return an.localeCompare(bn);
        });
      case "date":
        return copy.sort(
          (a, b) => Date.parse(b.addedAt) - Date.parse(a.addedAt),
        );
      case "price":
        return copy.sort((a, b) => {
          const ap = priceByCardId?.get(a.cardId);
          const bp = priceByCardId?.get(b.cardId);
          // Unpriced sort last
          if (ap == null && bp == null) {
            return PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
          }
          if (ap == null) return 1;
          if (bp == null) return -1;
          return bp * b.quantity - ap * a.quantity;
        });
      default: {
        const _exhaustive: never = sort;
        return _exhaustive;
      }
    }
  }

  filterByName(
    items: WishlistItemWithCard[],
    query: string,
  ): WishlistItemWithCard[] {
    const needle = query.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((item) => {
      const name = item.card?.name?.toLowerCase() ?? "";
      const type = item.card?.typeLine?.toLowerCase() ?? "";
      return name.includes(needle) || type.includes(needle);
    });
  }

  /** Ensure card metadata is available for display (returns undefined if missing). */
  async resolveCard(cardId: string): Promise<Card | undefined> {
    return this.cards.getById(cardId);
  }
}

let singleton: WishlistService | null = null;

export function getWishlistService(): WishlistService {
  if (!singleton) {
    singleton = new WishlistService();
  }
  return singleton;
}

/** Tests only. */
export function resetWishlistServiceSingleton(): void {
  singleton = null;
}

export const wishlistService = {
  addCardToWishlist: (
    ...args: Parameters<WishlistService["addCardToWishlist"]>
  ) => getWishlistService().addCardToWishlist(...args),
  listItems: (...args: Parameters<WishlistService["listItems"]>) =>
    getWishlistService().listItems(...args),
  listItemsWithCards: (
    ...args: Parameters<WishlistService["listItemsWithCards"]>
  ) => getWishlistService().listItemsWithCards(...args),
  getSummary: (...args: Parameters<WishlistService["getSummary"]>) =>
    getWishlistService().getSummary(...args),
  updatePriority: (...args: Parameters<WishlistService["updatePriority"]>) =>
    getWishlistService().updatePriority(...args),
  updateItem: (...args: Parameters<WishlistService["updateItem"]>) =>
    getWishlistService().updateItem(...args),
  removeFromWishlist: (
    ...args: Parameters<WishlistService["removeFromWishlist"]>
  ) => getWishlistService().removeFromWishlist(...args),
  removeItems: (...args: Parameters<WishlistService["removeItems"]>) =>
    getWishlistService().removeItems(...args),
  findByCardId: (...args: Parameters<WishlistService["findByCardId"]>) =>
    getWishlistService().findByCardId(...args),
  getItem: (...args: Parameters<WishlistService["getItem"]>) =>
    getWishlistService().getItem(...args),
  setTargetDeck: (...args: Parameters<WishlistService["setTargetDeck"]>) =>
    getWishlistService().setTargetDeck(...args),
  setTargetRole: (...args: Parameters<WishlistService["setTargetRole"]>) =>
    getWishlistService().setTargetRole(...args),
  updateNotes: (...args: Parameters<WishlistService["updateNotes"]>) =>
    getWishlistService().updateNotes(...args),
  updateQuantity: (...args: Parameters<WishlistService["updateQuantity"]>) =>
    getWishlistService().updateQuantity(...args),
};
