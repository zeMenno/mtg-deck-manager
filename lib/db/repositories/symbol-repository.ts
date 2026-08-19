import type { MtgSymbol } from "@/types/card";
import { getDatabase, type DeckBuilderDatabase } from "@/lib/db/database";

const STALE_MS = 30 * 24 * 60 * 60 * 1000;

export class SymbolRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async getAll(): Promise<MtgSymbol[]> {
    return this.database.symbols.toArray();
  }

  async getBySymbol(symbol: string): Promise<MtgSymbol | undefined> {
    return this.database.symbols.get(symbol);
  }

  async bulkUpsert(symbols: MtgSymbol[]): Promise<void> {
    if (symbols.length === 0) return;
    await this.database.symbols.bulkPut(symbols);
  }

  async count(): Promise<number> {
    return this.database.symbols.count();
  }

  /** True when empty or oldest/newest stamp is older than 30 days. */
  async isStale(now = Date.now()): Promise<boolean> {
    const count = await this.count();
    if (count === 0) return true;
    const newest = await this.database.symbols
      .orderBy("updatedAt")
      .reverse()
      .first();
    if (!newest?.updatedAt) return true;
    const age = now - Date.parse(newest.updatedAt);
    return Number.isNaN(age) || age > STALE_MS;
  }

  /** Test helper — wipe cache. */
  async clear(): Promise<void> {
    await this.database.symbols.clear();
  }
}
