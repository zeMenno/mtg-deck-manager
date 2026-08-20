import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { createId, nowIso } from "@/lib/db/ids";
import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { DeckCard } from "@/types/deck";

export type AddDeckCardInput = {
  deckId: string;
  cardId: string;
  zone: DeckCardZone;
  status?: DeckCardStatus;
  quantity?: number;
  foil?: boolean;
  owned?: boolean;
  notes?: string;
  roles?: string[];
  synergies?: string[];
  replacesDeckCardId?: string;
};

export type ListDeckCardsFilters = {
  status?: DeckCardStatus;
  zone?: DeckCardZone;
};

export class DeckCardRepository {
  constructor(private readonly database: DeckBuilderDatabase = getDatabase()) {}

  async create(input: AddDeckCardInput): Promise<DeckCard> {
    return this.add(input);
  }

  async add(input: AddDeckCardInput): Promise<DeckCard> {
    const quantity = input.quantity ?? 1;
    if (quantity < 1) {
      throw new Error("quantity must be >= 1");
    }
    if (input.zone === "commander" && quantity !== 1) {
      throw new Error("commander zone quantity must be 1");
    }

    const timestamp = nowIso();
    const deckCard: DeckCard = {
      id: createId(),
      deckId: input.deckId,
      cardId: input.cardId,
      quantity,
      zone: input.zone,
      status: input.status ?? "current",
      roles: input.roles ?? [],
      synergies: input.synergies ?? [],
      addedAt: timestamp,
      updatedAt: timestamp,
      ...(input.foil !== undefined ? { foil: input.foil } : {}),
      ...(input.owned !== undefined ? { owned: input.owned } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.replacesDeckCardId !== undefined
        ? { replacesDeckCardId: input.replacesDeckCardId }
        : {}),
    };
    await this.database.deckCards.add(deckCard);
    return deckCard;
  }

  async getById(id: string): Promise<DeckCard | undefined> {
    return this.database.deckCards.get(id);
  }

  /** @deprecated Prefer `listByDeck`. */
  async getByDeckId(deckId: string): Promise<DeckCard[]> {
    return this.listByDeck(deckId);
  }

  async listByDeck(
    deckId: string,
    filters?: ListDeckCardsFilters,
  ): Promise<DeckCard[]> {
    let rows = await this.database.deckCards
      .where("deckId")
      .equals(deckId)
      .toArray();

    if (filters?.status) {
      rows = rows.filter((r) => r.status === filters.status);
    }
    if (filters?.zone) {
      rows = rows.filter((r) => r.zone === filters.zone);
    }
    return rows;
  }

  /** @deprecated Prefer `listByDeckAndStatus`. */
  async getByStatus(
    deckId: string,
    status: DeckCardStatus,
  ): Promise<DeckCard[]> {
    return this.listByDeckAndStatus(deckId, status);
  }

  async listByDeckAndStatus(
    deckId: string,
    status: DeckCardStatus,
  ): Promise<DeckCard[]> {
    return this.database.deckCards
      .where("[deckId+status]")
      .equals([deckId, status])
      .toArray();
  }

  /**
   * Find existing row for composite key (deckId, cardId, zone, status).
   * Unique constraint: one row per cardId+zone+status within a deck.
   */
  async findByDeckCardZoneStatus(
    deckId: string,
    cardId: string,
    zone: DeckCardZone,
    status: DeckCardStatus,
  ): Promise<DeckCard | undefined> {
    const rows = await this.database.deckCards
      .where("deckId")
      .equals(deckId)
      .filter(
        (row) =>
          row.cardId === cardId && row.zone === zone && row.status === status,
      )
      .first();
    return rows;
  }

  async findByDeckAndCardId(
    deckId: string,
    cardId: string,
  ): Promise<DeckCard[]> {
    return this.database.deckCards
      .where("deckId")
      .equals(deckId)
      .filter((row) => row.cardId === cardId)
      .toArray();
  }

  async update(
    id: string,
    patch: Partial<Omit<DeckCard, "id" | "deckId" | "addedAt">>,
  ): Promise<DeckCard> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`DeckCard not found: ${id}`);
    }
    if (patch.quantity !== undefined && patch.quantity < 1) {
      throw new Error("quantity must be >= 1");
    }
    const updated: DeckCard = {
      ...existing,
      ...patch,
      id: existing.id,
      deckId: existing.deckId,
      addedAt: existing.addedAt,
      updatedAt: nowIso(),
    };
    // Explicit undefined clears optional link / cut fields.
    if (
      "replacesDeckCardId" in patch &&
      patch.replacesDeckCardId === undefined
    ) {
      delete updated.replacesDeckCardId;
    }
    if ("cutReason" in patch && patch.cutReason === undefined) {
      delete updated.cutReason;
    }
    await this.database.deckCards.put(updated);
    return updated;
  }

  /** Clear replacesDeckCardId on any ADD rows pointing at the given CUT ids. */
  async clearReplacementsPointingTo(cutDeckCardIds: string[]): Promise<void> {
    if (cutDeckCardIds.length === 0) return;
    const idSet = new Set(cutDeckCardIds);
    const linked = await this.database.deckCards
      .where("replacesDeckCardId")
      .anyOf(cutDeckCardIds)
      .toArray()
      .catch(async () => {
        // Fallback when index is missing (pre-migration / sparse).
        const all = await this.database.deckCards.toArray();
        return all.filter(
          (row) =>
            row.replacesDeckCardId !== undefined &&
            idSet.has(row.replacesDeckCardId),
        );
      });

    for (const row of linked) {
      if (!row.replacesDeckCardId || !idSet.has(row.replacesDeckCardId)) {
        continue;
      }
      await this.update(row.id, { replacesDeckCardId: undefined });
    }
  }

  /** Retarget ADD -> CUT links when a CUT row is merged into another row. */
  async retargetReplacements(
    fromDeckCardId: string,
    toDeckCardId: string,
  ): Promise<void> {
    const all = await this.database.deckCards.toArray();
    const linked = all.filter(
      (row) => row.replacesDeckCardId === fromDeckCardId,
    );
    for (const row of linked) {
      await this.update(row.id, { replacesDeckCardId: toDeckCardId });
    }
  }

  async delete(id: string): Promise<void> {
    await this.database.deckCards.delete(id);
  }

  /** Re-insert a previously deleted row with the same id (undo). */
  async restore(deckCard: DeckCard): Promise<DeckCard> {
    await this.database.deckCards.put(deckCard);
    return deckCard;
  }

  async restoreMany(deckCards: DeckCard[]): Promise<void> {
    if (deckCards.length === 0) return;
    await this.database.deckCards.bulkPut(deckCards);
  }

  async bulkDeleteByDeck(deckId: string): Promise<number> {
    return this.deleteByDeckId(deckId);
  }

  async deleteByDeckId(deckId: string): Promise<number> {
    return this.database.deckCards.where("deckId").equals(deckId).delete();
  }

  async bulkUpdateStatus(ids: string[], status: DeckCardStatus): Promise<void> {
    const timestamp = nowIso();
    await this.database.transaction("rw", this.database.deckCards, async () => {
      for (const id of ids) {
        const existing = await this.database.deckCards.get(id);
        if (!existing) continue;
        await this.database.deckCards.put({
          ...existing,
          status,
          updatedAt: timestamp,
        });
      }
    });
  }

  async bulkDelete(ids: string[]): Promise<void> {
    await this.database.deckCards.bulkDelete(ids);
  }

  /** Copy all cards from one deck onto another with new ids. */
  async duplicateForDeck(
    sourceDeckId: string,
    targetDeckId: string,
  ): Promise<DeckCard[]> {
    const source = await this.listByDeck(sourceDeckId);
    const timestamp = nowIso();
    const copies: DeckCard[] = source.map((card) => ({
      ...card,
      id: createId(),
      deckId: targetDeckId,
      addedAt: timestamp,
      updatedAt: timestamp,
    }));
    if (copies.length > 0) {
      await this.database.deckCards.bulkAdd(copies);
    }
    return copies;
  }
}
