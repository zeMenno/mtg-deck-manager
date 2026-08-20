import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardPriceRepository } from "@/lib/db/repositories/card-price-repository";
import { CardRepository } from "@/lib/db/repositories/card-repository";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";
import { mapScryfallPrices } from "@/lib/pricing/providers/scryfall-pricing-provider";
import { getCardById } from "@/lib/scryfall/client";
import { normalizeScryfallCard } from "@/lib/scryfall/normalize";
import type { ScryfallCard } from "@/lib/scryfall/types";
import type { Currency } from "@/types";
import type { DeckCard } from "@/types/deck";

export type SwitchPrintingInput = {
  deckCardId: string;
  newCardId: string;
};

export type SwitchPrintingResult = {
  deckCard: DeckCard;
  merged: boolean;
  removedDeckCardId?: string;
};

export type SwitchPrintingDependencies = {
  database: DeckBuilderDatabase;
  fetchCard?: (id: string) => Promise<ScryfallCard>;
  currency?: Currency;
};

export async function switchDeckCardPrinting(
  input: SwitchPrintingInput,
  dependencies: SwitchPrintingDependencies,
): Promise<SwitchPrintingResult> {
  const { database } = dependencies;
  const deckCards = new DeckCardRepository(database);
  const decks = new DeckRepository(database);
  const cards = new CardRepository(database);
  const prices = new CardPriceRepository(database);

  const source = await deckCards.getById(input.deckCardId);
  if (!source) throw new Error(`DeckCard not found: ${input.deckCardId}`);

  const currentCard = await cards.getById(source.cardId);
  if (!currentCard) throw new Error(`Card not found: ${source.cardId}`);

  const raw = await (dependencies.fetchCard ?? getCardById)(input.newCardId);
  const targetCard = normalizeScryfallCard(raw);
  if (targetCard.oracleId !== currentCard.oracleId) {
    throw new Error("Printing must have the same oracle identity");
  }

  await cards.upsert(targetCard);
  const price = mapScryfallPrices(
    raw,
    dependencies.currency ?? "USD",
    new Date().toISOString(),
  );
  if (price) await prices.upsert(price);

  if (source.cardId === targetCard.id) {
    return { deckCard: source, merged: false };
  }

  return database.transaction(
    "rw",
    database.decks,
    database.deckCards,
    async () => {
      const survivor = await deckCards.findByDeckCardZoneStatus(
        source.deckId,
        targetCard.id,
        source.zone,
        source.status,
      );
      const deck = await decks.getById(source.deckId);

      if (!survivor || survivor.id === source.id) {
        const updated = await deckCards.update(source.id, {
          cardId: targetCard.id,
          quantity: source.zone === "commander" ? 1 : source.quantity,
        });
        if (deck?.commanderId === source.cardId) {
          await decks.update(source.deckId, { commanderId: targetCard.id });
        } else {
          await decks.update(source.deckId, {});
        }
        return { deckCard: updated, merged: false };
      }

      if (
        source.replacesDeckCardId &&
        survivor.replacesDeckCardId &&
        source.replacesDeckCardId !== survivor.replacesDeckCardId
      ) {
        throw new Error(
          "Cannot merge printings with different replacement links",
        );
      }

      const patch: Partial<DeckCard> = {
        quantity:
          source.zone === "commander" ? 1 : survivor.quantity + source.quantity,
      };
      if (survivor.roles.length === 0 && source.roles.length > 0) {
        patch.roles = source.roles;
      }
      if (survivor.synergies.length === 0 && source.synergies.length > 0) {
        patch.synergies = source.synergies;
      }
      if (!(survivor.notes ?? "").trim() && (source.notes ?? "").trim()) {
        patch.notes = source.notes;
      }
      if (!survivor.replacesDeckCardId && source.replacesDeckCardId) {
        patch.replacesDeckCardId = source.replacesDeckCardId;
      }

      const updated = await deckCards.update(survivor.id, patch);
      if (source.status === "cut") {
        await deckCards.retargetReplacements(source.id, survivor.id);
      }
      await deckCards.delete(source.id);
      if (deck?.commanderId === source.cardId) {
        await decks.update(source.deckId, { commanderId: targetCard.id });
      } else {
        await decks.update(source.deckId, {});
      }
      return {
        deckCard: updated,
        merged: true,
        removedDeckCardId: source.id,
      };
    },
  );
}
