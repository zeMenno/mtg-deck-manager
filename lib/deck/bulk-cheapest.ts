import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories/card-repository";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";
import { switchDeckCardPrinting } from "@/lib/deck/switch-printing";
import {
  getPrintingPrice,
  pickCheapest,
} from "@/lib/pricing/cheapest-printing";
import { listPrintings } from "@/lib/scryfall/prints";
import type { ScryfallCard } from "@/lib/scryfall/types";
import type { Currency } from "@/types";
import type { Card } from "@/types/card";
import type { DeckCard } from "@/types/deck";

export type BulkCheapestScope = "add" | "current-add" | "all";

export type BulkCheapestPlanRow = {
  deckCard: DeckCard;
  card: Card;
  fromPrinting: ScryfallCard;
  toPrinting: ScryfallCard;
  fromPrice: number | null;
  toPrice: number;
  delta: number | null;
};

export type BulkCheapestProgress = {
  completed: number;
  total: number;
};

export type PlanBulkCheapestInput = {
  deckId: string;
  scope?: BulkCheapestScope;
  includeOwned?: boolean;
  currency: Currency;
  signal?: AbortSignal;
  onProgress?: (progress: BulkCheapestProgress) => void;
};

export type BulkCheapestDependencies = {
  database: DeckBuilderDatabase;
  listPrintingsFn?: typeof listPrintings;
};

function inScope(card: DeckCard, scope: BulkCheapestScope): boolean {
  if (scope === "add") return card.status === "add";
  if (scope === "current-add") {
    return card.status === "current" || card.status === "add";
  }
  return card.status !== "cut";
}

function cachedAsPrinting(card: Card): ScryfallCard {
  return {
    object: "card",
    id: card.id,
    oracle_id: card.oracleId,
    name: card.name,
    set: card.setCode,
    set_name: card.setName,
    collector_number: card.collectorNumber,
    rarity: card.rarity,
  };
}

export async function planBulkCheapest(
  input: PlanBulkCheapestInput,
  dependencies: BulkCheapestDependencies,
): Promise<BulkCheapestPlanRow[]> {
  const deckCards = new DeckCardRepository(dependencies.database);
  const cards = new CardRepository(dependencies.database);
  const scope = input.scope ?? "add";
  const candidates = (await deckCards.listByDeck(input.deckId)).filter(
    (row) =>
      inScope(row, scope) &&
      (input.includeOwned === true || row.owned !== true),
  );
  const cardRows = await cards.getByIds(candidates.map((row) => row.cardId));
  const cardsById = new Map(cardRows.map((card) => [card.id, card]));
  const printingCache = new Map<string, Promise<ScryfallCard[]>>();
  const rows: BulkCheapestPlanRow[] = [];

  for (let index = 0; index < candidates.length; index += 1) {
    if (input.signal?.aborted) break;
    const deckCard = candidates[index]!;
    const card = cardsById.get(deckCard.cardId);
    if (card) {
      let pending = printingCache.get(card.oracleId);
      if (!pending) {
        pending = (dependencies.listPrintingsFn ?? listPrintings)(
          card.oracleId,
          { currency: input.currency },
        );
        printingCache.set(card.oracleId, pending);
      }
      const printings = await pending;
      const cheapest = pickCheapest(
        printings,
        deckCard.foil === true,
        input.currency,
        card.id,
      );
      if (cheapest && cheapest.id !== card.id) {
        const current =
          printings.find((printing) => printing.id === card.id) ??
          cachedAsPrinting(card);
        const fromPrice = getPrintingPrice(
          current,
          deckCard.foil === true,
          input.currency,
        );
        const toPrice = getPrintingPrice(
          cheapest,
          deckCard.foil === true,
          input.currency,
        );
        if (toPrice != null) {
          rows.push({
            deckCard,
            card,
            fromPrinting: current,
            toPrinting: cheapest,
            fromPrice,
            toPrice,
            delta:
              fromPrice == null
                ? null
                : (toPrice - fromPrice) * deckCard.quantity,
          });
        }
      }
    }
    input.onProgress?.({ completed: index + 1, total: candidates.length });
  }
  return rows;
}

export async function applyBulkCheapest(
  rows: BulkCheapestPlanRow[],
  options: {
    database: DeckBuilderDatabase;
    currency: Currency;
    signal?: AbortSignal;
    onProgress?: (progress: BulkCheapestProgress) => void;
  },
): Promise<{ applied: number; cancelled: boolean }> {
  let applied = 0;
  for (let index = 0; index < rows.length; index += 1) {
    if (options.signal?.aborted) {
      return { applied, cancelled: true };
    }
    const row = rows[index]!;
    await switchDeckCardPrinting(
      { deckCardId: row.deckCard.id, newCardId: row.toPrinting.id },
      {
        database: options.database,
        currency: options.currency,
        fetchCard: async () => row.toPrinting,
      },
    );
    applied += 1;
    options.onProgress?.({ completed: applied, total: rows.length });
  }
  return { applied, cancelled: false };
}
