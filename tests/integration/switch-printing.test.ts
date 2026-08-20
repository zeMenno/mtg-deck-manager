import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import {
  CardRepository,
  DeckCardRepository,
  DeckRepository,
} from "@/lib/db/repositories";
import { applyBulkCheapest, planBulkCheapest } from "@/lib/deck/bulk-cheapest";
import { switchDeckCardPrinting } from "@/lib/deck/switch-printing";
import type { ScryfallCard } from "@/lib/scryfall/types";
import {
  closeAndDelete,
  MOCK_SOL_RING,
  resetDatabase,
} from "@/tests/helpers/db-test-utils";

const CHEAP_ID = "cheap-printing";

const currentRaw: ScryfallCard = {
  object: "card",
  id: MOCK_SOL_RING.id,
  oracle_id: MOCK_SOL_RING.oracleId,
  name: MOCK_SOL_RING.name,
  type_line: "Artifact",
  set: "exp",
  collector_number: "1",
  prices: { usd: "4.00" },
};

const cheapRaw: ScryfallCard = {
  ...currentRaw,
  id: CHEAP_ID,
  set: "cmm",
  collector_number: "390",
  prices: { usd: "0.80" },
};

describe("printing switch integration", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("upserts metadata and price while merging a target row", async () => {
    database = await resetDatabase();
    const deck = await new DeckRepository(database).create({
      name: "Integration",
      format: "commander",
    });
    await new CardRepository(database).upsert(MOCK_SOL_RING);
    const rows = new DeckCardRepository(database);
    const source = await rows.add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "mainboard",
      status: "current",
      quantity: 2,
    });
    await new CardRepository(database).upsert({
      ...MOCK_SOL_RING,
      id: CHEAP_ID,
    });
    const target = await rows.add({
      deckId: deck.id,
      cardId: CHEAP_ID,
      zone: "mainboard",
      status: "current",
      quantity: 1,
    });

    const result = await switchDeckCardPrinting(
      { deckCardId: source.id, newCardId: CHEAP_ID },
      { database, fetchCard: async () => cheapRaw },
    );
    expect(result.deckCard.id).toBe(target.id);
    expect(result.deckCard.quantity).toBe(3);
    expect(await database.cards.get(CHEAP_ID)).toMatchObject({
      setCode: "cmm",
    });
    expect(await database.cardPrices.get(CHEAP_ID)).toMatchObject({
      normal: 0.8,
    });
  });

  it("defaults bulk planning to ADD and skips owned rows before apply", async () => {
    database = await resetDatabase();
    const deck = await new DeckRepository(database).create({
      name: "Bulk",
      format: "commander",
    });
    const cards = new CardRepository(database);
    await cards.upsert(MOCK_SOL_RING);
    const rows = new DeckCardRepository(database);
    const eligible = await rows.add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "mainboard",
      status: "add",
    });
    await rows.add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "sideboard",
      status: "add",
      owned: true,
    });
    await rows.add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "maybeboard",
      status: "current",
    });

    const preview = await planBulkCheapest(
      { deckId: deck.id, currency: "USD" },
      {
        database,
        listPrintingsFn: async () => [currentRaw, cheapRaw],
      },
    );
    expect(preview).toHaveLength(1);
    expect(preview[0]?.deckCard.id).toBe(eligible.id);

    const result = await applyBulkCheapest(preview, {
      database,
      currency: "USD",
    });
    expect(result).toEqual({ applied: 1, cancelled: false });
    expect((await rows.getById(eligible.id))?.cardId).toBe(CHEAP_ID);
    expect(
      (await rows.listByDeck(deck.id)).filter((row) => row.cardId === CHEAP_ID),
    ).toHaveLength(1);
  });
});
