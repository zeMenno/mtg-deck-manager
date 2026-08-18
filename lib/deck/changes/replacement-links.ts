/**
 * Replacement links: ADD deck card → CUT deck card (replacesDeckCardId).
 */

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { getDatabase } from "@/lib/db/database";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";
import type { DeckCard } from "@/types/deck";
import type { ReplacementPair } from "@/lib/deck/changes/types";

export class ReplacementLinkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReplacementLinkError";
  }
}

export class ReplacementLinkService {
  constructor(
    private readonly database: DeckBuilderDatabase = getDatabase(),
    private readonly deckCards = new DeckCardRepository(database),
    private readonly decks = new DeckRepository(database),
  ) {}

  async linkReplacement(
    addDeckCardId: string,
    cutDeckCardId: string,
  ): Promise<DeckCard> {
    const add = await this.deckCards.getById(addDeckCardId);
    const cut = await this.deckCards.getById(cutDeckCardId);

    if (!add) {
      throw new ReplacementLinkError(
        `ADD deck card not found: ${addDeckCardId}`,
      );
    }
    if (!cut) {
      throw new ReplacementLinkError(
        `CUT deck card not found: ${cutDeckCardId}`,
      );
    }
    if (add.status !== "add") {
      throw new ReplacementLinkError("Replacement source must have status ADD");
    }
    if (cut.status !== "cut") {
      throw new ReplacementLinkError("Replacement target must have status CUT");
    }
    if (add.deckId !== cut.deckId) {
      throw new ReplacementLinkError(
        "ADD and CUT cards must be in the same deck",
      );
    }
    if (add.id === cut.id) {
      throw new ReplacementLinkError("A card cannot replace itself");
    }

    const updated = await this.deckCards.update(add.id, {
      replacesDeckCardId: cut.id,
    });
    await this.decks.update(add.deckId, {});
    return updated;
  }

  async unlinkReplacement(addDeckCardId: string): Promise<DeckCard> {
    const add = await this.deckCards.getById(addDeckCardId);
    if (!add) {
      throw new ReplacementLinkError(`Deck card not found: ${addDeckCardId}`);
    }
    const updated = await this.deckCards.update(add.id, {
      replacesDeckCardId: undefined,
    });
    await this.decks.update(add.deckId, {});
    return updated;
  }

  getReplacementForCut<T extends DeckCard>(
    cutDeckCardId: string,
    deckCards: T[],
  ): T | undefined {
    return deckCards.find(
      (c) => c.status === "add" && c.replacesDeckCardId === cutDeckCardId,
    );
  }

  getReplacementsForCut<T extends DeckCard>(
    cutDeckCardId: string,
    deckCards: T[],
  ): T[] {
    return deckCards.filter(
      (c) => c.status === "add" && c.replacesDeckCardId === cutDeckCardId,
    );
  }

  getReplacementForAdd<T extends DeckCard>(
    addDeckCardId: string,
    deckCards: T[],
  ): T | undefined {
    const add = deckCards.find((c) => c.id === addDeckCardId);
    if (!add?.replacesDeckCardId) return undefined;
    return deckCards.find((c) => c.id === add.replacesDeckCardId);
  }

  getReplacementPairs<T extends DeckCard>(deckCards: T[]): ReplacementPair[] {
    const byId = new Map(deckCards.map((c) => [c.id, c]));
    const pairs: ReplacementPair[] = [];
    for (const add of deckCards) {
      if (add.status !== "add" || !add.replacesDeckCardId) continue;
      const cut = byId.get(add.replacesDeckCardId);
      if (cut && cut.status === "cut") {
        pairs.push({ add, cut });
      }
    }
    return pairs;
  }

  /**
   * Clear invalid links after status changes or deletes.
   * - If ADD leaves `add` status → clear its replacesDeckCardId
   * - If CUT leaves `cut` status or is deleted → clear ADDs pointing at it
   */
  async clearInvalidLinksForCard(
    deckCard: DeckCard,
    previousStatus?: DeckCard["status"],
  ): Promise<void> {
    if (deckCard.status !== "add" && deckCard.replacesDeckCardId) {
      await this.deckCards.update(deckCard.id, {
        replacesDeckCardId: undefined,
      });
    }

    const wasCut = previousStatus === "cut" || deckCard.status === "cut";
    if (wasCut && deckCard.status !== "cut") {
      await this.deckCards.clearReplacementsPointingTo([deckCard.id]);
    }
  }

  async clearLinksPointingToDeleted(cutDeckCardIds: string[]): Promise<void> {
    await this.deckCards.clearReplacementsPointingTo(cutDeckCardIds);
  }
}

export const replacementLinkService = new ReplacementLinkService();

export async function linkReplacement(
  addDeckCardId: string,
  cutDeckCardId: string,
): Promise<DeckCard> {
  return replacementLinkService.linkReplacement(addDeckCardId, cutDeckCardId);
}

export async function unlinkReplacement(
  addDeckCardId: string,
): Promise<DeckCard> {
  return replacementLinkService.unlinkReplacement(addDeckCardId);
}

export function getReplacementForCut<T extends DeckCard>(
  cutDeckCardId: string,
  deckCards: T[],
): T | undefined {
  return replacementLinkService.getReplacementForCut(cutDeckCardId, deckCards);
}

export function getReplacementForAdd<T extends DeckCard>(
  addDeckCardId: string,
  deckCards: T[],
): T | undefined {
  return replacementLinkService.getReplacementForAdd(addDeckCardId, deckCards);
}
