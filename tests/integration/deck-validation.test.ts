import { afterEach, describe, expect, it } from "vitest";

import { closeAndDelete, resetDatabase } from "@/tests/helpers/db-test-utils";
import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardRepository, DeckRepository } from "@/lib/db/repositories";
import { DeckCardService } from "@/lib/deck/deck-card-service";
import { deckValidationService } from "@/lib/services/deck-validation-service";
import { recommendationConfigService } from "@/lib/services/recommendation-config-service";
import { validateBeforeApply } from "@/lib/deck/changes/apply-changes";
import { withResolvedCards } from "@/lib/deck/stats/filters";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import { DeckCardRepository } from "@/lib/db/repositories/deck-card-repository";

describe("deck validation integration", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("projected warnings update when card status changes to ADD", async () => {
    database = await resetDatabase();
    const decks = new DeckRepository(database);
    const cards = new CardRepository(database);
    const deckCards = new DeckCardService(database);

    const deck = await decks.create({ name: "Val", format: "commander" });
    const cmd = await cards.upsert({
      id: "cmd",
      oracleId: "cmd-o",
      name: "Cmd",
      manaValue: 2,
      typeLine: "Legendary Creature",
      colors: ["W"],
      colorIdentity: ["W"],
      keywords: [],
      legalities: { commander: "legal" },
    });
    await deckCards.addCardToDeck({
      deckId: deck.id,
      cardId: cmd.id,
      zone: "commander",
      status: "current",
    });
    await decks.update(deck.id, { commanderId: cmd.id });

    for (let i = 0; i < 99; i += 1) {
      const card = await cards.upsert({
        id: `c${i}`,
        oracleId: `o${i}`,
        name: `Card ${i}`,
        manaValue: 0,
        typeLine: "Basic Land — Plains",
        colors: [],
        colorIdentity: ["W"],
        keywords: [],
        legalities: { commander: "legal" },
      });
      await deckCards.addCardToDeck({
        deckId: deck.id,
        cardId: card.id,
        status: "current",
      });
    }

    const before = await deckValidationService.validateProjected(deck.id);
    expect(before.some((w) => w.id === "deck-size-ok")).toBe(true);

    const extra = await cards.upsert({
      id: "extra",
      oracleId: "extra-o",
      name: "Extra",
      manaValue: 1,
      typeLine: "Creature",
      colors: ["W"],
      colorIdentity: ["W"],
      keywords: [],
      legalities: { commander: "legal" },
    });
    await deckCards.addCardToDeck({
      deckId: deck.id,
      cardId: extra.id,
      status: "add",
    });

    const after = await deckValidationService.validateProjected(deck.id);
    expect(after.some((w) => w.id === "deck-size")).toBe(true);
    expect(deckValidationService.hasLegalityErrors(after)).toBe(true);
  });

  it("blocks apply when projected deck is illegal", async () => {
    database = await resetDatabase();
    const decks = new DeckRepository(database);
    const cards = new CardRepository(database);
    const deckCards = new DeckCardService(database);

    const deck = await decks.create({ name: "Block", format: "commander" });
    for (let i = 0; i < 95; i += 1) {
      const card = await cards.upsert({
        id: `c${i}`,
        oracleId: `o${i}`,
        name: `Card ${i}`,
        manaValue: 1,
        typeLine: "Creature",
        colors: [],
        colorIdentity: [],
        keywords: [],
      });
      await deckCards.addCardToDeck({
        deckId: deck.id,
        cardId: card.id,
        status: "current",
      });
    }
    for (let i = 0; i < 7; i += 1) {
      const card = await cards.upsert({
        id: `a${i}`,
        oracleId: `ao${i}`,
        name: `Add ${i}`,
        manaValue: 1,
        typeLine: "Instant",
        colors: [],
        colorIdentity: [],
        keywords: [],
      });
      await deckCards.addCardToDeck({
        deckId: deck.id,
        cardId: card.id,
        status: "add",
      });
    }

    const rows = await new DeckCardRepository(database).listByDeck(deck.id);
    const meta = await getCardsByIdsBatched(rows.map((r) => r.cardId));
    const joined = withResolvedCards(rows, new Map(meta.map((c) => [c.id, c])));
    const validation = validateBeforeApply({
      deck: (await decks.getById(deck.id))!,
      deckCards: rows,
      cards: joined,
    });
    expect(validation.canApply).toBe(false);
  });

  it("settings threshold change reflects in warnings", async () => {
    database = await resetDatabase();
    const decks = new DeckRepository(database);
    const cards = new CardRepository(database);
    const deckCards = new DeckCardService(database);

    const deck = await decks.create({ name: "Thresh", format: "commander" });
    const cmd = await cards.upsert({
      id: "cmd2",
      oracleId: "cmd2-o",
      name: "Cmd",
      manaValue: 2,
      typeLine: "Legendary Creature",
      colors: ["U"],
      colorIdentity: ["U"],
      keywords: [],
      legalities: { commander: "legal" },
    });
    await deckCards.addCardToDeck({
      deckId: deck.id,
      cardId: cmd.id,
      zone: "commander",
      status: "current",
    });
    await decks.update(deck.id, { commanderId: cmd.id });

    for (let i = 0; i < 25; i += 1) {
      const card = await cards.upsert({
        id: `land${i}`,
        oracleId: `lo${i}`,
        name: `Land ${i}`,
        manaValue: 0,
        typeLine: "Basic Land — Island",
        colors: [],
        colorIdentity: ["U"],
        keywords: [],
        legalities: { commander: "legal" },
      });
      await deckCards.addCardToDeck({
        deckId: deck.id,
        cardId: card.id,
        status: "current",
      });
    }

    const defaultWarnings = await deckValidationService.validateCurrent(
      deck.id,
    );
    expect(defaultWarnings.some((w) => w.id === "low-lands")).toBe(true);

    await recommendationConfigService.update({ minLands: 20 });
    const updated = await deckValidationService.validateCurrent(deck.id);
    expect(updated.some((w) => w.id === "low-lands")).toBe(false);
    expect(updated.some((w) => w.id === "lands-ok")).toBe(true);
  });
});
