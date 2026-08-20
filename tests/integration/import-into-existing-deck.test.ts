import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import { CardRepository } from "@/lib/db/repositories";
import { DeckCardService, DeckService } from "@/lib/deck/deck-service";
import { importTextDecklist } from "@/lib/import-export/import-deck";
import {
  applyImportIntoDeck,
  previewImportIntoDeck,
} from "@/lib/import-export/import-into-deck";
import { normalizeScryfallCard } from "@/lib/scryfall/normalize";
import {
  FIXTURE_NO_IMAGE,
  FIXTURE_SOL_RING,
  FIXTURE_SOL_RING_CHEAP,
} from "@/tests/fixtures/scryfall-cards";
import {
  closeAndDelete,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";
import type { Card } from "@/types/card";

const solRing = normalizeScryfallCard(FIXTURE_SOL_RING);
const solRingCheap = normalizeScryfallCard(FIXTURE_SOL_RING_CHEAP);
const nameless = normalizeScryfallCard(FIXTURE_NO_IMAGE);

const lookup: (
  name: string,
  opts?: { set?: string; collectorNumber?: string },
) => Promise<Card | null> = async (name, opts) => {
  if (
    opts?.set === solRingCheap.setCode &&
    opts?.collectorNumber === solRingCheap.collectorNumber
  ) {
    return solRingCheap;
  }
  if (name.toLowerCase() === "sol ring") return solRing;
  if (name.toLowerCase() === "nameless race") return nameless;
  return null;
};

describe("import into existing deck", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("skips duplicate oracles by default and adds new cards as consider", async () => {
    const seeded = await seedDeck(undefined, { card: solRing });
    database = seeded.database;
    await new CardRepository(database).upsert(nameless);

    const list = `
1 Sol Ring (c21) 263 *F* [Ramp] [Buy] ^Buy,#0066ff^
1 Nameless Race [Creatures]
`;

    const preview = await previewImportIntoDeck(list, seeded.deck.id, {
      database,
      lookup,
    });

    expect(preview.skipped).toHaveLength(1);
    expect(preview.skipped[0]?.name).toBe("Sol Ring");
    expect(preview.newRows).toHaveLength(1);
    expect(preview.newRows[0]?.name).toBe("Nameless Race");
    expect(preview.newRows[0]?.roles).toEqual(["role.evasion"]);
    expect(preview.ignoredCategories).toEqual(
      expect.arrayContaining(["Buy", "Creatures"]),
    );

    const result = await applyImportIntoDeck(list, seeded.deck.id, {
      database,
      lookup,
    });

    expect(result.added).toBe(1);
    expect(await database.decks.count()).toBe(1);

    const rows = await new DeckCardService(database).listByDeck(seeded.deck.id);
    const namelessRow = rows.find((row) => row.cardId === nameless.id);
    expect(namelessRow?.status).toBe("consider");
    expect(rows.filter((row) => row.cardId === solRing.id)).toHaveLength(1);
  });

  it("does not overwrite an existing commander", async () => {
    database = await resetDatabase();
    const decks = new DeckService(database);
    const cards = new CardRepository(database);
    await cards.upsert(solRing);
    await cards.upsert(nameless);
    const deck = await decks.createDeck({
      name: "Has Commander",
      format: "commander",
    });
    await decks.setCommander(deck.id, solRing.id);

    const preview = await previewImportIntoDeck(
      `1 Nameless Race *CMDR*`,
      deck.id,
      { database, lookup },
    );
    expect(preview.skipped[0]?.reason).toMatch(/Commander already set/i);

    await applyImportIntoDeck(`1 Nameless Race *CMDR*`, deck.id, {
      database,
      lookup,
    });
    const reloaded = await decks.getDeck(deck.id);
    expect(reloaded?.commanderId).toBe(solRing.id);
  });

  it("replaces printing when policy is replace-printing", async () => {
    const seeded = await seedDeck(undefined, { card: solRing });
    database = seeded.database;
    await new CardRepository(database).upsert(solRingCheap);

    const list = `1 Sol Ring (cmm) 396`;
    const preview = await previewImportIntoDeck(list, seeded.deck.id, {
      database,
      lookup,
      policy: "replace-printing",
    });
    expect(preview.replaceRows).toHaveLength(1);

    await applyImportIntoDeck(list, seeded.deck.id, {
      database,
      lookup,
      policy: "replace-printing",
    });

    const rows = await new DeckCardService(database).listByDeck(seeded.deck.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.cardId).toBe(solRingCheap.id);
  });

  it("still creates a new deck from Arena-style lists", async () => {
    database = await resetDatabase();
    await new CardRepository(database).upsert(solRing);
    const result = await importTextDecklist(`1 Sol Ring (M21) 239`, {
      database,
      lookup,
    });
    expect(result.deckId).toBeTruthy();
    expect(result.added).toBe(1);
    expect(await database.decks.count()).toBe(1);
  });

  it("errors clearly on an empty parse", async () => {
    database = await resetDatabase();
    const deck = await new DeckService(database).createDeck({
      name: "Empty import",
      format: "commander",
    });
    await expect(
      previewImportIntoDeck("// just a comment", deck.id, { database }),
    ).rejects.toThrow(/empty/i);
  });
});
