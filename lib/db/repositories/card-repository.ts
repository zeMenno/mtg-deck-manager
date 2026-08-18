import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { nowIso } from "@/lib/db/ids";
import type { Card } from "@/types/card";

export class CardRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async upsert(
    card: Omit<Card, "updatedAt"> & { updatedAt?: string },
  ): Promise<Card> {
    const record: Card = {
      ...card,
      updatedAt: card.updatedAt ?? nowIso(),
    };
    await this.database.cards.put(record);
    return record;
  }

  /** Bulk put Scryfall-normalized cards (metadata only — safe to overwrite). */
  async bulkUpsert(cards: Card[]): Promise<void> {
    if (cards.length === 0) return;
    const stamped = cards.map((card) => ({
      ...card,
      updatedAt: card.updatedAt ?? nowIso(),
    }));
    await this.database.cards.bulkPut(stamped);
  }

  async getById(id: string): Promise<Card | undefined> {
    return this.database.cards.get(id);
  }

  async getByIds(ids: string[]): Promise<Card[]> {
    if (ids.length === 0) return [];
    const unique = [...new Set(ids)];
    return this.database.cards
      .bulkGet(unique)
      .then((rows) => rows.filter((row): row is Card => row !== undefined));
  }

  /** All cached printings for an oracle identity. */
  async getByOracleId(oracleId: string): Promise<Card[]> {
    if (!oracleId) return [];
    return this.database.cards.where("oracleId").equals(oracleId).toArray();
  }

  /**
   * Case-insensitive substring match on name (and oracleText as secondary).
   * Prefer name hits; sort alphabetically within each tier.
   */
  async searchLocal(query: string, limit = 50): Promise<Card[]> {
    const needle = query.trim().toLowerCase();
    if (!needle) return [];

    const all = await this.database.cards.toArray();
    const nameHits: Card[] = [];
    const textHits: Card[] = [];

    for (const card of all) {
      if (card.name.toLowerCase().includes(needle)) {
        nameHits.push(card);
      } else if (card.oracleText?.toLowerCase().includes(needle)) {
        textHits.push(card);
      }
    }

    const byName = (a: Card, b: Card) => a.name.localeCompare(b.name);
    return [...nameHits.sort(byName), ...textHits.sort(byName)].slice(0, limit);
  }

  /**
   * Printing ids whose `updatedAt` is older than `olderThanDays`.
   * Used by future background refresh jobs.
   */
  async getStaleIds(olderThanDays: number): Promise<string[]> {
    const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
    const all = await this.database.cards.toArray();
    return all
      .filter((card) => {
        const ts = Date.parse(card.updatedAt);
        return Number.isNaN(ts) || ts < cutoff;
      })
      .map((card) => card.id);
  }

  async getAll(): Promise<Card[]> {
    return this.database.cards.toArray();
  }
}
