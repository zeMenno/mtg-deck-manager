import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import type { CardPrice } from "@/types/card";
import type { Currency } from "@/types";

export class CardPriceRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async getByCardId(cardId: string): Promise<CardPrice | undefined> {
    if (!cardId) return undefined;
    return this.database.cardPrices.get(cardId);
  }

  async getByCardIds(cardIds: string[]): Promise<Map<string, CardPrice>> {
    const map = new Map<string, CardPrice>();
    if (cardIds.length === 0) return map;
    const unique = [...new Set(cardIds.filter(Boolean))];
    const rows = await this.database.cardPrices.bulkGet(unique);
    for (const row of rows) {
      if (row) map.set(row.cardId, row);
    }
    return map;
  }

  /**
   * Return cached prices matching the requested currency.
   * Rows with a different currency are treated as missing (currency switch requires re-fetch).
   */
  async getByCardIdsForCurrency(
    cardIds: string[],
    currency: Currency,
  ): Promise<Map<string, CardPrice>> {
    const all = await this.getByCardIds(cardIds);
    const filtered = new Map<string, CardPrice>();
    for (const [id, price] of all) {
      if (price.currency === currency) {
        filtered.set(id, price);
      }
    }
    return filtered;
  }

  async upsert(price: CardPrice): Promise<void> {
    await this.database.cardPrices.put(price);
  }

  async upsertMany(prices: CardPrice[]): Promise<void> {
    if (prices.length === 0) return;
    await this.database.cardPrices.bulkPut(prices);
  }

  async deleteOlderThan(isoDate: string): Promise<number> {
    const cutoff = Date.parse(isoDate);
    if (Number.isNaN(cutoff)) return 0;
    const stale = await this.database.cardPrices
      .where("fetchedAt")
      .below(isoDate)
      .toArray();
    if (stale.length === 0) return 0;
    await this.database.cardPrices.bulkDelete(stale.map((p) => p.cardId));
    return stale.length;
  }
}
