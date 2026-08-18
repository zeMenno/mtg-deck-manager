/**
 * TanStack Query keys and fetchers for deck data.
 */

import { CardRepository } from "@/lib/db/repositories/card-repository";
import { CardPriceRepository } from "@/lib/db/repositories/card-price-repository";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import type { DeckCardStatus, DeckCardZone } from "@/types";
import type { Deck, DeckCard, DeckCardWithCard } from "@/types/deck";

export type DeckCardFilters = {
  status?: DeckCardStatus | "all";
  zone?: DeckCardZone;
  sort?: "name" | "mv" | "type" | "status" | "price";
};

export const deckKeys = {
  all: ["decks"] as const,
  lists: () => [...deckKeys.all, "list"] as const,
  list: (includeArchived = false) =>
    [...deckKeys.lists(), { includeArchived }] as const,
  details: () => [...deckKeys.all, "detail"] as const,
  detail: (deckId: string) => [...deckKeys.details(), deckId] as const,
  cards: (deckId: string) => [...deckKeys.all, deckId, "cards"] as const,
  cardsFiltered: (deckId: string, filters: DeckCardFilters) =>
    [...deckKeys.cards(deckId), filters] as const,
  stats: (deckId: string, mode: "current" | "projected" = "current") =>
    [...deckKeys.all, deckId, "stats", mode] as const,
  warnings: (deckId: string) => [...deckKeys.all, deckId, "warnings"] as const,
  changes: (deckId: string) => [...deckKeys.all, deckId, "changes"] as const,
  projected: (deckId: string) =>
    [...deckKeys.all, deckId, "projected"] as const,
};

export async function fetchDecks(includeArchived = false): Promise<Deck[]> {
  return new DeckRepository().list({ includeArchived });
}

export async function fetchDeck(deckId: string): Promise<Deck | undefined> {
  return new DeckRepository().getById(deckId);
}

export async function fetchDeckCards(
  deckId: string,
  filters: DeckCardFilters = {},
): Promise<DeckCardWithCard[]> {
  const repo = new DeckCardRepository();
  let cards: DeckCard[];

  if (filters.status && filters.status !== "all") {
    cards = await repo.listByDeckAndStatus(deckId, filters.status);
  } else {
    cards = await repo.listByDeck(deckId, {
      zone: filters.zone,
    });
  }

  if (filters.zone) {
    cards = cards.filter((c) => c.zone === filters.zone);
  }

  const cardIds = cards.map((c) => c.cardId);
  const metadata = await getCardsByIdsBatched(cardIds);
  const byId = new Map(metadata.map((c) => [c.id, c]));
  const priceMap = await new CardPriceRepository().getByCardIds(cardIds);

  const joined: DeckCardWithCard[] = cards.map((deckCard) => {
    const card = byId.get(deckCard.cardId);
    const price = priceMap.get(deckCard.cardId);
    if (!card) {
      // Placeholder for orphan deck cards — UI can offer refresh.
      return {
        ...deckCard,
        card: {
          id: deckCard.cardId,
          oracleId: "",
          name: "Unknown card",
          manaValue: 0,
          typeLine: "",
          colors: [],
          colorIdentity: [],
          keywords: [],
          updatedAt: deckCard.updatedAt,
        },
        price,
      };
    }
    return { ...deckCard, card, price };
  });

  return sortDeckCards(joined, filters.sort ?? "name");
}

function sortDeckCards(
  cards: DeckCardWithCard[],
  sort: NonNullable<DeckCardFilters["sort"]>,
): DeckCardWithCard[] {
  const copy = [...cards];
  switch (sort) {
    case "mv":
      return copy.sort(
        (a, b) =>
          a.card.manaValue - b.card.manaValue ||
          a.card.name.localeCompare(b.card.name),
      );
    case "type":
      return copy.sort(
        (a, b) =>
          a.card.typeLine.localeCompare(b.card.typeLine) ||
          a.card.name.localeCompare(b.card.name),
      );
    case "status":
      return copy.sort(
        (a, b) =>
          a.status.localeCompare(b.status) ||
          a.card.name.localeCompare(b.card.name),
      );
    case "price": {
      // Prices may be attached asynchronously; unpriced sort last.
      const unit = (item: DeckCardWithCard): number => {
        const p = item.price;
        if (!p) return Number.POSITIVE_INFINITY;
        if (item.foil && p.foil != null) return p.foil;
        if (p.normal != null) return p.normal;
        if (p.market != null) return p.market;
        if (p.low != null) return p.low;
        return Number.POSITIVE_INFINITY;
      };
      return copy.sort(
        (a, b) => unit(a) - unit(b) || a.card.name.localeCompare(b.card.name),
      );
    }
    case "name":
    default:
      return copy.sort((a, b) => a.card.name.localeCompare(b.card.name));
  }
}

/** Card count for current-status mainboard + commander (dashboard stub). */
export async function fetchCurrentCardCount(deckId: string): Promise<number> {
  const repo = new DeckCardRepository();
  const cards = await repo.listByDeck(deckId);
  return cards
    .filter(
      (c) =>
        c.status === "current" &&
        (c.zone === "mainboard" || c.zone === "commander"),
    )
    .reduce((sum, c) => sum + c.quantity, 0);
}

export async function ensureCardCached(cardId: string): Promise<void> {
  const existing = await new CardRepository().getById(cardId);
  if (existing) return;
  await getCardsByIdsBatched([cardId]);
}
