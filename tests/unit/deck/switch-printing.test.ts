import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import {
  CardRepository,
  DeckCardRepository,
  DeckRepository,
} from "@/lib/db/repositories";
import { switchDeckCardPrinting } from "@/lib/deck/switch-printing";
import type { ScryfallCard } from "@/lib/scryfall/types";
import {
  closeAndDelete,
  MOCK_SOL_RING,
  resetDatabase,
} from "@/tests/helpers/db-test-utils";

const ALT_ID = "33333333-3333-4333-8333-333333333333";

function altPrinting(): ScryfallCard {
  return {
    object: "card",
    id: ALT_ID,
    oracle_id: MOCK_SOL_RING.oracleId,
    name: MOCK_SOL_RING.name,
    cmc: 1,
    type_line: "Artifact",
    set: "cmr",
    collector_number: "330",
    prices: { usd: "0.75", usd_foil: "2.00" },
  };
}

describe("switchDeckCardPrinting", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("preserves deck metadata and upserts target card and price", async () => {
    database = await resetDatabase();
    const deck = await new DeckRepository(database).create({
      name: "Swap",
      format: "commander",
    });
    await new CardRepository(database).upsert(MOCK_SOL_RING);
    const source = await new DeckCardRepository(database).add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "mainboard",
      status: "add",
      quantity: 3,
      roles: ["role.ramp"],
      synergies: ["synergy.artifact"],
      notes: "preferred",
      owned: true,
      foil: true,
    });

    const result = await switchDeckCardPrinting(
      { deckCardId: source.id, newCardId: ALT_ID },
      { database, currency: "USD", fetchCard: async () => altPrinting() },
    );

    expect(result.deckCard).toMatchObject({
      id: source.id,
      cardId: ALT_ID,
      quantity: 3,
      status: "add",
      roles: ["role.ramp"],
      synergies: ["synergy.artifact"],
      notes: "preferred",
      owned: true,
      foil: true,
    });
    expect(await database.cards.get(ALT_ID)).toBeDefined();
    expect(await database.cardPrices.get(ALT_ID)).toMatchObject({
      normal: 0.75,
      foil: 2,
    });
  });

  it("merges same zone/status and fills only empty survivor tags and notes", async () => {
    database = await resetDatabase();
    const decks = new DeckRepository(database);
    const deck = await decks.create({ name: "Merge", format: "commander" });
    const cards = new CardRepository(database);
    await cards.upsert(MOCK_SOL_RING);
    await cards.upsert({ ...MOCK_SOL_RING, id: ALT_ID });
    const rows = new DeckCardRepository(database);
    const source = await rows.add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "mainboard",
      status: "add",
      quantity: 2,
      roles: ["role.ramp"],
      synergies: ["synergy.artifact"],
      notes: "source note",
    });
    const survivor = await rows.add({
      deckId: deck.id,
      cardId: ALT_ID,
      zone: "mainboard",
      status: "add",
      quantity: 4,
    });

    const result = await switchDeckCardPrinting(
      { deckCardId: source.id, newCardId: ALT_ID },
      { database, fetchCard: async () => altPrinting() },
    );

    expect(result.merged).toBe(true);
    expect(result.deckCard).toMatchObject({
      id: survivor.id,
      quantity: 6,
      roles: ["role.ramp"],
      synergies: ["synergy.artifact"],
      notes: "source note",
    });
    expect(await rows.getById(source.id)).toBeUndefined();
  });

  it("keeps commander quantity one and updates printing commanderId", async () => {
    database = await resetDatabase();
    const decks = new DeckRepository(database);
    const deck = await decks.create({ name: "Commander", format: "commander" });
    await new CardRepository(database).upsert(MOCK_SOL_RING);
    const source = await new DeckCardRepository(database).add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "commander",
      status: "current",
      quantity: 1,
    });
    await decks.update(deck.id, { commanderId: MOCK_SOL_RING.id });

    const result = await switchDeckCardPrinting(
      { deckCardId: source.id, newCardId: ALT_ID },
      { database, fetchCard: async () => altPrinting() },
    );
    expect(result.deckCard.quantity).toBe(1);
    expect((await decks.getById(deck.id))?.commanderId).toBe(ALT_ID);
  });

  it("retargets ADD links when the deleted merged row was a CUT target", async () => {
    database = await resetDatabase();
    const deck = await new DeckRepository(database).create({
      name: "Links",
      format: "commander",
    });
    const cards = new CardRepository(database);
    await cards.upsert(MOCK_SOL_RING);
    await cards.upsert({ ...MOCK_SOL_RING, id: ALT_ID });
    const replacementCard = await cards.upsert({
      ...MOCK_SOL_RING,
      id: "replacement",
      oracleId: "replacement-oracle",
      name: "Replacement",
    });
    const rows = new DeckCardRepository(database);
    const source = await rows.add({
      deckId: deck.id,
      cardId: MOCK_SOL_RING.id,
      zone: "mainboard",
      status: "cut",
    });
    const survivor = await rows.add({
      deckId: deck.id,
      cardId: ALT_ID,
      zone: "mainboard",
      status: "cut",
    });
    const add = await rows.add({
      deckId: deck.id,
      cardId: replacementCard.id,
      zone: "mainboard",
      status: "add",
      replacesDeckCardId: source.id,
    });

    await switchDeckCardPrinting(
      { deckCardId: source.id, newCardId: ALT_ID },
      { database, fetchCard: async () => altPrinting() },
    );
    expect((await rows.getById(add.id))?.replacesDeckCardId).toBe(survivor.id);
  });
});
