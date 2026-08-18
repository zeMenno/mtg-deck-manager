/**
 * Remap entity IDs when importing a deck into an existing database
 * so imported rows never collide with local primary keys.
 */

import { createId } from "@/lib/db/ids";
import type { Deck, DeckCard, DeckVersion } from "@/types/deck";
import type { WishlistItem } from "@/types/card";

export type RemapDeckPackageInput = {
  deck: Deck;
  deckCards: DeckCard[];
  deckVersions?: DeckVersion[];
  wishlistItems?: WishlistItem[];
  /** When set, use this name instead of the original (e.g. collision rename). */
  newName?: string;
};

export type RemapDeckPackageResult = {
  deck: Deck;
  deckCards: DeckCard[];
  deckVersions: DeckVersion[];
  wishlistItems: WishlistItem[];
  idMap: {
    deckId: string;
    deckCardIds: Map<string, string>;
    deckVersionIds: Map<string, string>;
    wishlistItemIds: Map<string, string>;
  };
};

/**
 * Allocate fresh UUIDs for deck / deckCard / deckVersion / wishlist rows.
 * `cardId` values are preserved (Scryfall printing ids are global).
 */
export function remapDeckPackage(
  input: RemapDeckPackageInput,
): RemapDeckPackageResult {
  const newDeckId = createId();
  const deckCardIds = new Map<string, string>();
  const deckVersionIds = new Map<string, string>();
  const wishlistItemIds = new Map<string, string>();

  for (const dc of input.deckCards) {
    deckCardIds.set(dc.id, createId());
  }
  for (const version of input.deckVersions ?? []) {
    deckVersionIds.set(version.id, createId());
  }
  for (const item of input.wishlistItems ?? []) {
    wishlistItemIds.set(item.id, createId());
  }

  const deck: Deck = {
    ...input.deck,
    id: newDeckId,
    name: input.newName?.trim() || input.deck.name,
    activeVersionId: undefined,
  };

  const deckCards: DeckCard[] = input.deckCards.map((dc) => {
    const next: DeckCard = {
      ...dc,
      id: deckCardIds.get(dc.id)!,
      deckId: newDeckId,
    };
    if (dc.replacesDeckCardId && deckCardIds.has(dc.replacesDeckCardId)) {
      next.replacesDeckCardId = deckCardIds.get(dc.replacesDeckCardId);
    } else {
      delete next.replacesDeckCardId;
    }
    return next;
  });

  const deckVersions: DeckVersion[] = (input.deckVersions ?? []).map((v) => ({
    ...v,
    id: deckVersionIds.get(v.id)!,
    deckId: newDeckId,
  }));

  const wishlistItems: WishlistItem[] = (input.wishlistItems ?? []).map(
    (item) => ({
      ...item,
      id: wishlistItemIds.get(item.id)!,
      targetDeckId:
        item.targetDeckId === input.deck.id ? newDeckId : item.targetDeckId,
    }),
  );

  return {
    deck,
    deckCards,
    deckVersions,
    wishlistItems,
    idMap: {
      deckId: newDeckId,
      deckCardIds,
      deckVersionIds,
      wishlistItemIds,
    },
  };
}

/** Ensure remapped ids are unique within the package. */
export function assertUniqueRemappedIds(result: RemapDeckPackageResult): void {
  const ids = [
    result.deck.id,
    ...result.deckCards.map((d) => d.id),
    ...result.deckVersions.map((d) => d.id),
    ...result.wishlistItems.map((d) => d.id),
  ];
  if (new Set(ids).size !== ids.length) {
    throw new Error("ID remap produced duplicate ids");
  }
}
