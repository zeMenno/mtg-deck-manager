import { afterEach, describe, expect, it } from "vitest";

import {
  ApplyChangesService,
  computeChangeSummary,
  getProjectedDeckCards,
  ReplacementLinkService,
  validateBeforeApply,
} from "@/lib/deck/changes";
import type { DeckBuilderDatabase } from "@/lib/db/database";
import { DeckCardRepository } from "@/lib/db/repositories";
import { DeckCardService } from "@/lib/deck/deck-service";
import { withResolvedCards } from "@/lib/deck/stats/filters";
import { getCardsByIdsBatched } from "@/lib/cards/get-cards-by-ids-batched";
import { closeAndDelete, resetDatabase } from "@/tests/helpers/db-test-utils";
import { seedUpgradeDeck } from "@/tests/helpers/seed-upgrade-deck";
import { CardRepository } from "@/lib/db/repositories/card-repository";
import { DeckRepository } from "@/lib/db/repositories/deck-repository";

describe("apply changes integration", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("summary shows 5 ADD / 3 CUT / 4 CONSIDER from fixture", async () => {
    const fixture = await seedUpgradeDeck();
    database = fixture.database;
    const rows = await new DeckCardRepository(database).listByDeck(
      fixture.deck.id,
    );
    const summary = computeChangeSummary(rows);
    expect(summary.addCount).toBe(5);
    expect(summary.cutCount).toBe(3);
    expect(summary.considerCount).toBe(4);
    expect(summary.hasPendingChanges).toBe(true);
  });

  it("projected view count = current remaining + add", async () => {
    const fixture = await seedUpgradeDeck();
    database = fixture.database;
    const rows = await new DeckCardRepository(database).listByDeck(
      fixture.deck.id,
    );
    // 7 current left + 5 add = 12 projected (3 of 10 were cut)
    const projected = getProjectedDeckCards(rows);
    expect(projected).toHaveLength(12);
  });

  it("link replacement displays relationship", async () => {
    const fixture = await seedUpgradeDeck();
    database = fixture.database;
    const links = new ReplacementLinkService(database);
    const add = fixture.add[0]!;
    const cut = fixture.cut[0]!;
    await links.linkReplacement(add.id, cut.id);
    const reloaded = await new DeckCardRepository(database).getById(add.id);
    expect(reloaded?.replacesDeckCardId).toBe(cut.id);
  });

  it("apply promotes ADD, removes CUT, leaves CONSIDER", async () => {
    const fixture = await seedUpgradeDeck();
    database = fixture.database;
    const apply = new ApplyChangesService(database);

    const result = await apply.applyChanges(fixture.deck.id, {
      skipValidation: true,
    });
    expect(result.errors).toBeUndefined();
    expect(result.promotedCount).toBe(5);
    expect(result.removedCount).toBe(3);

    const rows = await new DeckCardRepository(database).listByDeck(
      fixture.deck.id,
    );
    expect(rows.filter((r) => r.status === "add")).toHaveLength(0);
    expect(rows.filter((r) => r.status === "cut")).toHaveLength(0);
    expect(rows.filter((r) => r.status === "consider")).toHaveLength(4);
    expect(rows.filter((r) => r.status === "current").length).toBeGreaterThan(
      0,
    );

    const summary = computeChangeSummary(rows);
    expect(summary.hasPendingChanges).toBe(false);
  });

  it("apply blocked when projected deck > 100", async () => {
    database = await resetDatabase();
    const decks = new DeckRepository(database);
    const cards = new CardRepository(database);
    const deckCards = new DeckCardService(database);
    const apply = new ApplyChangesService(database);

    const deck = await decks.create({
      name: "Oversize",
      format: "commander",
    });

    for (let i = 0; i < 98; i += 1) {
      const card = await cards.upsert({
        id: `c-${i}`,
        oracleId: `o-${i}`,
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
    for (let i = 0; i < 5; i += 1) {
      const card = await cards.upsert({
        id: `a-${i}`,
        oracleId: `ao-${i}`,
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
      deck,
      deckCards: rows,
      cards: joined,
    });
    expect(validation.canApply).toBe(false);

    const result = await apply.applyChanges(deck.id);
    expect(result.errors?.length).toBeGreaterThan(0);
    expect(result.promotedCount).toBe(0);
  });

  it("apply with only ADD is allowed when size ok", async () => {
    database = await resetDatabase();
    const decks = new DeckRepository(database);
    const cards = new CardRepository(database);
    const deckCards = new DeckCardService(database);
    const apply = new ApplyChangesService(database);

    const deck = await decks.create({
      name: "Adds Only",
      format: "commander",
    });

    const commander = await cards.upsert({
      id: "cmd-only",
      oracleId: "cmd-only-o",
      name: "Commander",
      manaValue: 2,
      typeLine: "Legendary Creature",
      colors: ["W"],
      colorIdentity: ["W"],
      keywords: [],
      legalities: { commander: "legal" },
    });
    await deckCards.addCardToDeck({
      deckId: deck.id,
      cardId: commander.id,
      zone: "commander",
      status: "current",
    });
    await decks.update(deck.id, { commanderId: commander.id });

    for (let i = 0; i < 98; i += 1) {
      const card = await cards.upsert({
        id: `cur-${i}`,
        oracleId: `or-${i}`,
        name: `Cur ${i}`,
        manaValue: 1,
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
    const addCard = await cards.upsert({
      id: "only-add",
      oracleId: "only-add-o",
      name: "Only Add",
      manaValue: 1,
      typeLine: "Sorcery",
      colors: ["W"],
      colorIdentity: ["W"],
      keywords: [],
      legalities: { commander: "legal" },
    });
    await deckCards.addCardToDeck({
      deckId: deck.id,
      cardId: addCard.id,
      status: "add",
    });

    const result = await apply.applyChanges(deck.id);
    expect(result.errors).toBeUndefined();
    expect(result.promotedCount).toBe(1);
    expect(result.removedCount).toBe(0);
  });
});
