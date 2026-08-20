import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import {
  DeckCardRepository,
  DeckRepository,
  type CreateDeckInput,
} from "@/lib/db/repositories";
import { CardRepository } from "@/lib/db/repositories/card-repository";
import { SettingsRepository } from "@/lib/db/repositories/settings-repository";
import {
  DEFAULT_FORMAT,
  MAX_QUANTITY,
  MIN_QUANTITY,
} from "@/lib/deck/constants";
import {
  getDuplicateWarnings,
  type DuplicateWarning,
} from "@/lib/deck/duplicate-detection";
import {
  switchDeckCardPrinting,
  type SwitchPrintingInput,
  type SwitchPrintingResult,
} from "@/lib/deck/switch-printing";
import { getCardById, normalizeScryfallCard } from "@/lib/scryfall";
import { suggestTags } from "@/lib/tags/suggest-tags";
import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { Card } from "@/types/card";
import type { Deck, DeckCard } from "@/types/deck";

export type { CreateDeckInput };

export type AddCardToDeckInput = {
  deckId: string;
  cardId: string;
  quantity?: number;
  zone?: DeckCardZone;
  status?: DeckCardStatus;
  foil?: boolean;
  owned?: boolean;
  notes?: string;
  roles?: string[];
  synergies?: string[];
};

export type AddCardToDeckResult = {
  deckCard: DeckCard;
  warnings: DuplicateWarning[];
  /** True when quantity was incremented on an existing row. */
  merged: boolean;
  /** Local deterministic tags applied to a newly created row. */
  suggestedTagIds: string[];
};

export class DeckService {
  constructor(
    private readonly database: DeckBuilderDatabase = getDatabase(),
    private readonly decks = new DeckRepository(database),
    private readonly deckCards = new DeckCardRepository(database),
  ) {}

  async createDeck(input: CreateDeckInput): Promise<Deck> {
    if (!input.name.trim()) {
      throw new Error("Deck name is required");
    }
    return this.decks.create({
      ...input,
      format: input.format ?? DEFAULT_FORMAT,
    });
  }

  async updateDeck(
    id: string,
    patch: Partial<Omit<Deck, "id" | "createdAt">>,
  ): Promise<Deck> {
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new Error("Deck name is required");
    }
    const normalized =
      patch.name !== undefined ? { ...patch, name: patch.name.trim() } : patch;
    return this.decks.update(id, normalized);
  }

  async renameDeck(id: string, name: string): Promise<Deck> {
    return this.updateDeck(id, { name });
  }

  async duplicateDeck(id: string, newName?: string): Promise<Deck> {
    return this.database.transaction(
      "rw",
      this.database.decks,
      this.database.deckCards,
      async () => {
        const copy = await this.decks.duplicate(id, newName);
        await this.deckCards.duplicateForDeck(id, copy.id);
        return copy;
      },
    );
  }

  async archiveDeck(id: string): Promise<Deck> {
    return this.decks.update(id, { archived: true });
  }

  async unarchiveDeck(id: string): Promise<Deck> {
    return this.decks.update(id, { archived: false });
  }

  async setFavorite(id: string, favorite: boolean): Promise<Deck> {
    return this.decks.update(id, { favorite });
  }

  async deleteDeck(id: string): Promise<void> {
    await this.database.transaction(
      "rw",
      this.database.decks,
      this.database.deckCards,
      async () => {
        await this.deckCards.bulkDeleteByDeck(id);
        await this.decks.delete(id);
      },
    );
  }

  async listDecks(includeArchived = false): Promise<Deck[]> {
    return this.decks.list({ includeArchived });
  }

  async getDeck(id: string): Promise<Deck | undefined> {
    return this.decks.getById(id);
  }

  /**
   * Set commander printing. Upserts commander-zone DeckCard, moves previous
   * commander to mainboard as current, updates deck.commanderId.
   */
  async setCommander(deckId: string, cardId: string): Promise<Deck> {
    const deck = await this.decks.getById(deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${deckId}`);
    }

    const card = await this.ensureCardInCache(cardId);
    const suggestOnAdd = await new SettingsRepository(this.database).get(
      "tags.suggestOnAdd",
    );
    const suggestion = suggestOnAdd
      ? suggestTags(card)
      : { roles: [], synergies: [] };

    return this.database.transaction(
      "rw",
      this.database.decks,
      this.database.deckCards,
      async () => {
        // Move previous commander zone cards to mainboard.
        const previous = await this.deckCards.listByDeck(deckId, {
          zone: "commander",
        });
        for (const row of previous) {
          if (row.cardId === cardId) continue;
          await this.deckCards.update(row.id, {
            zone: "mainboard",
            status: "current",
          });
        }

        const existingCommander = previous.find((r) => r.cardId === cardId);
        if (existingCommander) {
          await this.deckCards.update(existingCommander.id, {
            zone: "commander",
            quantity: 1,
            status: "current",
          });
        } else {
          // Merge if same printing already in mainboard as current.
          const existing = await this.deckCards.findByDeckCardZoneStatus(
            deckId,
            cardId,
            "mainboard",
            "current",
          );
          if (existing) {
            await this.deckCards.update(existing.id, {
              zone: "commander",
              quantity: 1,
              status: "current",
            });
          } else {
            await this.deckCards.add({
              deckId,
              cardId,
              zone: "commander",
              quantity: 1,
              status: "current",
              roles: suggestion.roles,
              synergies: suggestion.synergies,
            });
          }
        }

        return this.decks.update(deckId, { commanderId: cardId });
      },
    );
  }

  private async ensureCardInCache(cardId: string): Promise<Card> {
    const repo = new CardRepository(this.database);
    const local = await repo.getById(cardId);
    if (local) return local;
    const remote = await getCardById(cardId);
    const normalized = normalizeScryfallCard(remote);
    return repo.upsert(normalized);
  }
}

export class DeckCardService {
  constructor(
    private readonly database: DeckBuilderDatabase = getDatabase(),
    private readonly deckCards = new DeckCardRepository(database),
    private readonly decks = new DeckRepository(database),
    private readonly cards = new CardRepository(database),
  ) {}

  async addCardToDeck(input: AddCardToDeckInput): Promise<AddCardToDeckResult> {
    const deck = await this.decks.getById(input.deckId);
    if (!deck) {
      throw new Error(`Deck not found: ${input.deckId}`);
    }

    const zone = input.zone ?? "mainboard";
    const status = input.status ?? "current";
    const quantity = input.quantity ?? 1;

    if (quantity < MIN_QUANTITY) {
      throw new Error(`quantity must be >= ${MIN_QUANTITY}`);
    }

    const card = await this.ensureCard(input.cardId);
    const existingRows = await this.deckCards.listByDeck(input.deckId);
    const cardsById = await this.buildCardMap(existingRows);
    cardsById.set(card.id, card);

    const warnings = getDuplicateWarnings({
      existingDeckCards: existingRows,
      cardsById,
      candidate: card,
    });

    const match = await this.deckCards.findByDeckCardZoneStatus(
      input.deckId,
      input.cardId,
      zone,
      status,
    );

    let deckCard: DeckCard;
    let merged = false;
    let suggestedTagIds: string[] = [];

    if (match) {
      const nextQty = Math.min(MAX_QUANTITY, match.quantity + quantity);
      deckCard = await this.deckCards.update(match.id, { quantity: nextQty });
      merged = true;
    } else {
      let roles = input.roles ?? [];
      let synergies = input.synergies ?? [];
      if (roles.length === 0 && synergies.length === 0) {
        const suggestOnAdd = await new SettingsRepository(this.database).get(
          "tags.suggestOnAdd",
        );
        if (suggestOnAdd) {
          const suggestion = suggestTags(card);
          roles = suggestion.roles;
          synergies = suggestion.synergies;
          suggestedTagIds = [...roles, ...synergies];
        }
      }
      const qty = zone === "commander" ? 1 : Math.min(MAX_QUANTITY, quantity);
      deckCard = await this.deckCards.add({
        deckId: input.deckId,
        cardId: input.cardId,
        zone,
        status,
        quantity: qty,
        foil: input.foil,
        owned: input.owned,
        notes: input.notes,
        roles,
        synergies,
      });
    }

    await this.decks.update(input.deckId, {});
    return { deckCard, warnings, merged, suggestedTagIds };
  }

  /** Alias used by older call sites / tests. */
  async addCard(input: AddCardToDeckInput & { zone: DeckCardZone }) {
    const result = await this.addCardToDeck(input);
    return result.deckCard;
  }

  async removeCardFromDeck(deckCardId: string): Promise<DeckCard | undefined> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) return undefined;
    if (existing.status === "cut") {
      await this.deckCards.clearReplacementsPointingTo([existing.id]);
    }
    await this.deckCards.delete(deckCardId);
    await this.decks.update(existing.deckId, {});
    return existing;
  }

  /** Undo helper: put a deleted DeckCard row back with the same id. */
  async restoreDeckCard(deckCard: DeckCard): Promise<DeckCard> {
    const restored = await this.deckCards.restore(deckCard);
    await this.decks.update(restored.deckId, {});
    return restored;
  }

  async restoreDeckCards(deckCards: DeckCard[]): Promise<void> {
    if (deckCards.length === 0) return;
    await this.deckCards.restoreMany(deckCards);
    const deckId = deckCards[0]?.deckId;
    if (deckId) {
      await this.decks.update(deckId, {});
    }
  }

  async updateDeckCard(
    id: string,
    patch: Partial<Omit<DeckCard, "id" | "deckId" | "addedAt">>,
  ): Promise<DeckCard> {
    const existing = await this.deckCards.getById(id);
    if (!existing) {
      throw new Error(`DeckCard not found: ${id}`);
    }
    const updated = await this.deckCards.update(id, patch);

    // Clear replacement links when status leaves ADD/CUT.
    if (patch.status !== undefined && patch.status !== existing.status) {
      if (existing.status === "add" || updated.status !== "add") {
        if (updated.replacesDeckCardId && updated.status !== "add") {
          await this.deckCards.update(updated.id, {
            replacesDeckCardId: undefined,
          });
        }
      }
      if (existing.status === "cut" && updated.status !== "cut") {
        await this.deckCards.clearReplacementsPointingTo([updated.id]);
      }
    }

    await this.decks.update(updated.deckId, {});
    return (await this.deckCards.getById(updated.id)) ?? updated;
  }

  async setStatus(
    deckCardId: string,
    status: DeckCardStatus,
  ): Promise<DeckCard> {
    return this.updateDeckCard(deckCardId, { status });
  }

  async setCardStatus(
    deckCardId: string,
    status: DeckCardStatus,
  ): Promise<DeckCard> {
    return this.setStatus(deckCardId, status);
  }

  async setQuantity(deckCardId: string, quantity: number): Promise<DeckCard> {
    return this.updateQuantity(deckCardId, quantity);
  }

  async updateQuantity(
    deckCardId: string,
    quantity: number,
  ): Promise<DeckCard> {
    if (quantity < MIN_QUANTITY || quantity > MAX_QUANTITY) {
      throw new Error(
        `quantity must be between ${MIN_QUANTITY} and ${MAX_QUANTITY}`,
      );
    }
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    if (existing.zone === "commander" && quantity !== 1) {
      throw new Error("commander zone quantity must be 1");
    }
    return this.updateDeckCard(deckCardId, { quantity });
  }

  async setZone(deckCardId: string, zone: DeckCardZone): Promise<DeckCard> {
    const patch: Partial<DeckCard> = { zone };
    if (zone === "commander") {
      patch.quantity = 1;
    }
    return this.updateDeckCard(deckCardId, patch);
  }

  async setRoles(deckCardId: string, roleIds: string[]): Promise<DeckCard> {
    return this.updateDeckCard(deckCardId, { roles: roleIds });
  }

  async setSynergies(
    deckCardId: string,
    synergyIds: string[],
  ): Promise<DeckCard> {
    return this.updateDeckCard(deckCardId, { synergies: synergyIds });
  }

  async updateNotes(deckCardId: string, notes: string): Promise<DeckCard> {
    return this.updateDeckCard(deckCardId, { notes });
  }

  async toggleOwned(deckCardId: string): Promise<DeckCard> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    return this.updateDeckCard(deckCardId, { owned: !existing.owned });
  }

  async toggleFoil(deckCardId: string): Promise<DeckCard> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    return this.updateDeckCard(deckCardId, { foil: !existing.foil });
  }

  async switchPrinting(
    input: SwitchPrintingInput,
  ): Promise<SwitchPrintingResult> {
    const currency = await new SettingsRepository(this.database).get(
      "currency",
    );
    return switchDeckCardPrinting(input, {
      database: this.database,
      currency,
    });
  }

  async bulkSetStatus(
    deckCardIds: string[],
    status: DeckCardStatus,
  ): Promise<void> {
    if (deckCardIds.length === 0) return;
    const before = await Promise.all(
      deckCardIds.map((id) => this.deckCards.getById(id)),
    );
    await this.deckCards.bulkUpdateStatus(deckCardIds, status);
    for (const row of before) {
      if (!row) continue;
      if (row.status === "cut" && status !== "cut") {
        await this.deckCards.clearReplacementsPointingTo([row.id]);
      }
      if (row.status === "add" && status !== "add" && row.replacesDeckCardId) {
        await this.deckCards.update(row.id, { replacesDeckCardId: undefined });
      }
    }
    const first = await this.deckCards.getById(deckCardIds[0]!);
    if (first) {
      await this.decks.update(first.deckId, {});
    }
  }

  async bulkRemove(deckCardIds: string[]): Promise<DeckCard[]> {
    if (deckCardIds.length === 0) return [];
    const first = await this.deckCards.getById(deckCardIds[0]!);
    const rows = await Promise.all(
      deckCardIds.map((id) => this.deckCards.getById(id)),
    );
    const existing = rows.filter((r): r is DeckCard => Boolean(r));
    const cutIds = existing.filter((r) => r.status === "cut").map((r) => r.id);
    if (cutIds.length > 0) {
      await this.deckCards.clearReplacementsPointingTo(cutIds);
    }
    await this.deckCards.bulkDelete(deckCardIds);
    if (first) {
      await this.decks.update(first.deckId, {});
    }
    return existing;
  }

  async listByDeck(
    deckId: string,
    status?: DeckCardStatus,
  ): Promise<DeckCard[]> {
    if (status) {
      return this.deckCards.listByDeckAndStatus(deckId, status);
    }
    return this.deckCards.listByDeck(deckId);
  }

  private async ensureCard(cardId: string): Promise<Card> {
    const local = await this.cards.getById(cardId);
    if (local) return local;
    try {
      const remote = await getCardById(cardId);
      return this.cards.upsert(normalizeScryfallCard(remote));
    } catch {
      const batched = await getCardsByIdsBatched([cardId]);
      const found = batched[0];
      if (!found) {
        throw new Error(`Card not found: ${cardId}`);
      }
      return found;
    }
  }

  private async buildCardMap(
    deckCards: DeckCard[],
  ): Promise<Map<string, Card>> {
    const ids = deckCards.map((c) => c.cardId);
    const cards = await getCardsByIdsBatched(ids);
    return new Map(cards.map((c) => [c.id, c]));
  }
}

export const deckService = new DeckService();
export const deckCardService = new DeckCardService();
