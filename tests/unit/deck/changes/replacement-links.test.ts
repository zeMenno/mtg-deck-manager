import { afterEach, describe, expect, it } from "vitest";

import {
  ReplacementLinkError,
  ReplacementLinkService,
} from "@/lib/deck/changes/replacement-links";
import type { DeckBuilderDatabase } from "@/lib/db/database";
import { DeckCardRepository } from "@/lib/db/repositories";
import { closeAndDelete, seedDeck } from "@/tests/helpers/db-test-utils";
import { CardRepository } from "@/lib/db/repositories/card-repository";

describe("replacement links", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("links ADD → CUT and unlinks", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const links = new ReplacementLinkService(database);
    const cards = new CardRepository(database);
    const deckCards = new DeckCardRepository(database);

    const addMeta = await cards.upsert({
      id: "add-card",
      oracleId: "add-oracle",
      name: "New Toy",
      manaValue: 2,
      typeLine: "Artifact",
      colors: [],
      colorIdentity: [],
      keywords: [],
    });
    const add = await deckCards.add({
      deckId: seeded.deck.id,
      cardId: addMeta.id,
      zone: "mainboard",
      status: "add",
    });
    const cut = await deckCards.update(seeded.deckCard.id, { status: "cut" });

    const linked = await links.linkReplacement(add.id, cut.id);
    expect(linked.replacesDeckCardId).toBe(cut.id);

    const cleared = await links.unlinkReplacement(add.id);
    expect(cleared.replacesDeckCardId).toBeUndefined();
  });

  it("rejects invalid status pairs", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const links = new ReplacementLinkService(database);
    const deckCards = new DeckCardRepository(database);
    const cards = new CardRepository(database);

    const other = await cards.upsert({
      id: "other",
      oracleId: "other-o",
      name: "Other",
      manaValue: 1,
      typeLine: "Creature",
      colors: [],
      colorIdentity: [],
      keywords: [],
    });
    const consider = await deckCards.add({
      deckId: seeded.deck.id,
      cardId: other.id,
      zone: "mainboard",
      status: "consider",
    });

    await expect(
      links.linkReplacement(consider.id, seeded.deckCard.id),
    ).rejects.toBeInstanceOf(ReplacementLinkError);
  });

  it("clears orphan links when CUT is deleted", async () => {
    const seeded = await seedDeck();
    database = seeded.database;
    const links = new ReplacementLinkService(database);
    const deckCards = new DeckCardRepository(database);
    const cards = new CardRepository(database);

    const addMeta = await cards.upsert({
      id: "add-2",
      oracleId: "add-2-o",
      name: "Add Two",
      manaValue: 1,
      typeLine: "Instant",
      colors: [],
      colorIdentity: [],
      keywords: [],
    });
    const add = await deckCards.add({
      deckId: seeded.deck.id,
      cardId: addMeta.id,
      zone: "mainboard",
      status: "add",
    });
    const cut = await deckCards.update(seeded.deckCard.id, { status: "cut" });
    await links.linkReplacement(add.id, cut.id);

    await deckCards.clearReplacementsPointingTo([cut.id]);
    await deckCards.delete(cut.id);

    const reloaded = await deckCards.getById(add.id);
    expect(reloaded?.replacesDeckCardId).toBeUndefined();
  });
});
