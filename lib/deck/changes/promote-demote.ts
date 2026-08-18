/**
 * Status transitions for the upgrade workflow.
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";
import { ReplacementLinkService } from "@/lib/deck/changes/replacement-links";
import type { DeckCard } from "@/types/deck";

export class PromoteDemoteService {
  constructor(
    private readonly database: DeckBuilderDatabase = getDatabase(),
    private readonly deckCards = new DeckCardRepository(database),
    private readonly decks = new DeckRepository(database),
    private readonly links = new ReplacementLinkService(database),
  ) {}

  private async setStatusWithCleanup(
    deckCardId: string,
    status: DeckCard["status"],
  ): Promise<DeckCard> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    const previousStatus = existing.status;
    const updated = await this.deckCards.update(deckCardId, { status });
    await this.links.clearInvalidLinksForCard(updated, previousStatus);
    await this.decks.update(updated.deckId, {});
    return updated;
  }

  async promoteConsiderToAdd(deckCardId: string): Promise<DeckCard> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    if (existing.status !== "consider") {
      throw new Error("Only CONSIDER cards can be promoted to ADD");
    }
    return this.setStatusWithCleanup(deckCardId, "add");
  }

  async demoteAddToConsider(deckCardId: string): Promise<DeckCard> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    if (existing.status !== "add") {
      throw new Error("Only ADD cards can be demoted to CONSIDER");
    }
    return this.setStatusWithCleanup(deckCardId, "consider");
  }

  async markCurrentAsCut(deckCardId: string): Promise<DeckCard> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    if (existing.status !== "current") {
      throw new Error("Only CURRENT cards can be marked CUT");
    }
    return this.setStatusWithCleanup(deckCardId, "cut");
  }

  /** Revert CUT → CURRENT before apply. */
  async revertCutToCurrent(deckCardId: string): Promise<DeckCard> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) {
      throw new Error(`DeckCard not found: ${deckCardId}`);
    }
    if (existing.status !== "cut") {
      throw new Error("Only CUT cards can be reverted to CURRENT");
    }
    return this.setStatusWithCleanup(deckCardId, "current");
  }

  /** Dismiss CONSIDER — delete the row (CONSIDER cards are new candidates). */
  async dismissConsider(deckCardId: string): Promise<void> {
    const existing = await this.deckCards.getById(deckCardId);
    if (!existing) return;
    if (existing.status !== "consider") {
      throw new Error("Only CONSIDER cards can be dismissed");
    }
    await this.deckCards.delete(deckCardId);
    await this.decks.update(existing.deckId, {});
  }

  async bulkPromoteConsiderToAdd(deckCardIds: string[]): Promise<void> {
    for (const id of deckCardIds) {
      const row = await this.deckCards.getById(id);
      if (!row || row.status !== "consider") continue;
      await this.promoteConsiderToAdd(id);
    }
  }

  async bulkDismissConsider(deckCardIds: string[]): Promise<void> {
    for (const id of deckCardIds) {
      const row = await this.deckCards.getById(id);
      if (!row || row.status !== "consider") continue;
      await this.dismissConsider(id);
    }
  }
}

export const promoteDemoteService = new PromoteDemoteService();

export async function promoteConsiderToAdd(deckCardId: string) {
  return promoteDemoteService.promoteConsiderToAdd(deckCardId);
}

export async function demoteAddToConsider(deckCardId: string) {
  return promoteDemoteService.demoteAddToConsider(deckCardId);
}

export async function markCurrentAsCut(deckCardId: string) {
  return promoteDemoteService.markCurrentAsCut(deckCardId);
}

export async function revertCutToCurrent(deckCardId: string) {
  return promoteDemoteService.revertCutToCurrent(deckCardId);
}

export async function dismissConsider(deckCardId: string) {
  return promoteDemoteService.dismissConsider(deckCardId);
}
