import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { createId, nowIso } from "@/lib/db/ids";
import type { WishlistPriority } from "@/types";
import type { WishlistItem } from "@/types/card";
import {
  DEFAULT_WISHLIST_ID,
  DEFAULT_WISHLIST_NAME,
  PRIORITY_WEIGHT,
  type Wishlist,
  type WishlistItemFilters,
} from "@/types/wishlist";

export type CreateWishlistItemInput = {
  cardId: string;
  quantity?: number;
  priority?: WishlistPriority;
  targetDeckId?: string;
  targetRole?: string;
  notes?: string;
  wishlistId?: string;
};

export class WishlistRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  /**
   * Logical default wishlist (not a Dexie table in v1.0).
   * Always returns the same stable id for UI / filters.
   */
  getDefaultWishlist(): Wishlist {
    const timestamp = "1970-01-01T00:00:00.000Z";
    return {
      id: DEFAULT_WISHLIST_ID,
      name: DEFAULT_WISHLIST_NAME,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  async create(input: CreateWishlistItemInput): Promise<WishlistItem> {
    return this.addItem(input);
  }

  async addItem(input: CreateWishlistItemInput): Promise<WishlistItem> {
    const quantity = input.quantity ?? 1;
    if (quantity < 1) {
      throw new Error("quantity must be >= 1");
    }
    const timestamp = nowIso();
    const item: WishlistItem = {
      id: createId(),
      cardId: input.cardId,
      quantity,
      priority: input.priority ?? "medium",
      addedAt: timestamp,
      updatedAt: timestamp,
      wishlistId: input.wishlistId ?? DEFAULT_WISHLIST_ID,
      ...(input.targetDeckId !== undefined
        ? { targetDeckId: input.targetDeckId }
        : {}),
      ...(input.targetRole !== undefined
        ? { targetRole: input.targetRole }
        : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    };
    await this.database.wishlistItems.add(item);
    return item;
  }

  async getById(id: string): Promise<WishlistItem | undefined> {
    return this.getItemById(id);
  }

  async getItemById(id: string): Promise<WishlistItem | undefined> {
    return this.database.wishlistItems.get(id);
  }

  async getAll(): Promise<WishlistItem[]> {
    return this.database.wishlistItems.toArray();
  }

  async getItems(
    wishlistId: string = DEFAULT_WISHLIST_ID,
    filters?: WishlistItemFilters,
  ): Promise<WishlistItem[]> {
    let rows = await this.database.wishlistItems.toArray();

    rows = rows.filter((row) => {
      const id = row.wishlistId ?? DEFAULT_WISHLIST_ID;
      return id === wishlistId;
    });

    if (filters?.priority) {
      rows = rows.filter((r) => r.priority === filters.priority);
    }
    if (filters?.cardId) {
      rows = rows.filter((r) => r.cardId === filters.cardId);
    }
    if (filters?.targetDeckId !== undefined) {
      if (filters.targetDeckId === null) {
        rows = rows.filter((r) => !r.targetDeckId);
      } else {
        rows = rows.filter((r) => r.targetDeckId === filters.targetDeckId);
      }
    }

    return this.sortByPriority(rows);
  }

  async findByCardId(cardId: string): Promise<WishlistItem[]> {
    return this.database.wishlistItems.where("cardId").equals(cardId).toArray();
  }

  async update(
    id: string,
    patch: Partial<Omit<WishlistItem, "id" | "addedAt">>,
  ): Promise<WishlistItem> {
    return this.updateItem(id, patch);
  }

  async updateItem(
    id: string,
    patch: Partial<Omit<WishlistItem, "id" | "addedAt">>,
  ): Promise<WishlistItem> {
    const existing = await this.getItemById(id);
    if (!existing) {
      throw new Error(`WishlistItem not found: ${id}`);
    }
    const updated: WishlistItem = {
      ...existing,
      ...patch,
      id: existing.id,
      addedAt: existing.addedAt,
      updatedAt: nowIso(),
    };

    // Allow clearing optional fields with explicit undefined.
    if ("targetDeckId" in patch && patch.targetDeckId === undefined) {
      delete updated.targetDeckId;
    }
    if ("targetRole" in patch && patch.targetRole === undefined) {
      delete updated.targetRole;
    }
    if ("notes" in patch && patch.notes === undefined) {
      delete updated.notes;
    }

    await this.database.wishlistItems.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    return this.removeItem(id);
  }

  async removeItem(id: string): Promise<void> {
    await this.database.wishlistItems.delete(id);
  }

  /** Re-insert a previously deleted row with the same id (undo). */
  async restore(item: WishlistItem): Promise<WishlistItem> {
    await this.database.wishlistItems.put(item);
    return item;
  }

  async restoreMany(items: WishlistItem[]): Promise<void> {
    if (items.length === 0) return;
    await this.database.wishlistItems.bulkPut(items);
  }

  async removeItems(ids: string[]): Promise<void> {
    if (ids.length === 0) return;
    await this.database.wishlistItems.bulkDelete(ids);
  }

  async countByPriority(
    wishlistId: string = DEFAULT_WISHLIST_ID,
  ): Promise<Record<WishlistPriority, number>> {
    const items = await this.getItems(wishlistId);
    const counts: Record<WishlistPriority, number> = {
      essential: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const item of items) {
      counts[item.priority] += 1;
    }
    return counts;
  }

  /** Essential → High → Medium → Low, then `addedAt` descending. */
  sortByPriority(items: WishlistItem[]): WishlistItem[] {
    return [...items].sort((a, b) => {
      const byPriority =
        PRIORITY_WEIGHT[a.priority] - PRIORITY_WEIGHT[b.priority];
      if (byPriority !== 0) return byPriority;
      return Date.parse(b.addedAt) - Date.parse(a.addedAt);
    });
  }
}
