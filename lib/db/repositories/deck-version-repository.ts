import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import type { DeckVersion } from "@/types/deck";

export type ListVersionsOptions = {
  order?: "asc" | "desc";
};

export class DeckVersionRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async create(version: DeckVersion): Promise<string> {
    await this.database.deckVersions.add(version);
    return version.id;
  }

  async getById(id: string): Promise<DeckVersion | undefined> {
    return this.database.deckVersions.get(id);
  }

  async listByDeckId(
    deckId: string,
    options: ListVersionsOptions = {},
  ): Promise<DeckVersion[]> {
    const order = options.order ?? "desc";
    const rows = await this.database.deckVersions
      .where("deckId")
      .equals(deckId)
      .sortBy("createdAt");

    if (order === "desc") {
      rows.reverse();
    }
    return rows;
  }

  async countByDeckId(deckId: string): Promise<number> {
    return this.database.deckVersions.where("deckId").equals(deckId).count();
  }

  async getOldest(deckId: string): Promise<DeckVersion | undefined> {
    const rows = await this.listByDeckId(deckId, { order: "asc" });
    return rows[0];
  }

  async update(
    id: string,
    patch: Partial<Pick<DeckVersion, "name" | "notes">>,
  ): Promise<DeckVersion> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`DeckVersion not found: ${id}`);
    }
    const updated: DeckVersion = {
      ...existing,
      ...patch,
      id: existing.id,
      deckId: existing.deckId,
      createdAt: existing.createdAt,
      snapshot: existing.snapshot,
    };
    if ("notes" in patch && patch.notes === undefined) {
      delete updated.notes;
    }
    await this.database.deckVersions.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.database.deckVersions.delete(id);
  }
}
