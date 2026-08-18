import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { createId, nowIso } from "@/lib/db/ids";
import type { DeckFormat } from "@/types";
import type { Deck } from "@/types/deck";

export type CreateDeckInput = {
  name: string;
  format: DeckFormat;
  description?: string;
};

export type ListDecksOptions = {
  includeArchived?: boolean;
};

export class DeckRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async create(input: CreateDeckInput): Promise<Deck> {
    const timestamp = nowIso();
    const deck: Deck = {
      id: createId(),
      name: input.name.trim(),
      format: input.format,
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      archived: false,
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.database.decks.add(deck);
    return deck;
  }

  async getById(id: string): Promise<Deck | undefined> {
    return this.database.decks.get(id);
  }

  /** @deprecated Prefer `list({ includeArchived })`. */
  async getAll(): Promise<Deck[]> {
    return this.list({ includeArchived: true });
  }

  async list(options: ListDecksOptions = {}): Promise<Deck[]> {
    const includeArchived = options.includeArchived ?? false;
    const all = await this.database.decks
      .orderBy("updatedAt")
      .reverse()
      .toArray();

    const filtered = includeArchived ? all : all.filter((d) => !d.archived);

    // Favorites first, then updatedAt desc (already sorted).
    return filtered.sort((a, b) => {
      const favA = a.favorite ? 1 : 0;
      const favB = b.favorite ? 1 : 0;
      if (favA !== favB) return favB - favA;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }

  async update(
    id: string,
    patch: Partial<Omit<Deck, "id" | "createdAt">>,
  ): Promise<Deck> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Deck not found: ${id}`);
    }
    const updated: Deck = {
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: patch.updatedAt ?? nowIso(),
    };
    if ("activeVersionId" in patch && patch.activeVersionId === undefined) {
      delete updated.activeVersionId;
    }
    if ("description" in patch && patch.description === undefined) {
      delete updated.description;
    }
    if ("commanderId" in patch && patch.commanderId === undefined) {
      delete updated.commanderId;
    }
    await this.database.decks.put(updated);
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.database.decks.delete(id);
  }

  /**
   * Copy deck row + all deckCards with new ids.
   * Caller should wrap in a transaction with deckCards if needed.
   */
  async duplicate(id: string, newName?: string): Promise<Deck> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Deck not found: ${id}`);
    }
    const timestamp = nowIso();
    const copy: Deck = {
      id: createId(),
      name: (newName?.trim() || `${existing.name} (Copy)`).trim(),
      format: existing.format,
      ...(existing.description !== undefined
        ? { description: existing.description }
        : {}),
      ...(existing.commanderId !== undefined
        ? { commanderId: existing.commanderId }
        : {}),
      archived: false,
      favorite: false,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.database.decks.add(copy);
    return copy;
  }
}
