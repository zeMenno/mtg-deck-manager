import { afterEach, describe, expect, it } from "vitest";

import type { DeckBuilderDatabase } from "@/lib/db/database";
import {
  CSV_HEADERS,
  buildDeckCsv,
  parseDeckCsv,
} from "@/lib/import-export/csv-deck-parser";
import {
  exportDeckCsv,
  exportDeckJson,
  exportDeckText,
} from "@/lib/import-export/export-deck";
import {
  closeAndDelete,
  resetDatabase,
  seedDeck,
} from "@/tests/helpers/db-test-utils";

describe("exportDeck", () => {
  let database: DeckBuilderDatabase;

  afterEach(async () => {
    if (database) await closeAndDelete(database);
  });

  it("exports JSON with deck, cards, and deckCards", async () => {
    database = await resetDatabase();
    const seeded = await seedDeck(database, { deckName: "Export JSON" });
    const pack = await exportDeckJson(seeded.deck.id, database);
    expect(pack.exportVersion).toBe(1);
    expect(pack.deck.name).toBe("Export JSON");
    expect(pack.deckCards).toHaveLength(1);
    expect(pack.cards[0]?.name).toBe("Sol Ring");
  });

  it("exports text with name header and card lines", async () => {
    database = await resetDatabase();
    const seeded = await seedDeck(database, { deckName: "Export Text" });
    const text = await exportDeckText(seeded.deck.id, database);
    expect(text).toContain("// Export Text");
    expect(text).toContain("1 Sol Ring");
  });

  it("exports CSV with required headers", async () => {
    database = await resetDatabase();
    const seeded = await seedDeck(database, { deckName: "Export CSV" });
    const csv = await exportDeckCsv(seeded.deck.id, database);
    const header = csv.split("\n")[0];
    for (const col of CSV_HEADERS) {
      expect(header).toContain(col);
    }
    expect(csv).toContain("Sol Ring");
  });

  it("round-trips CSV quoted names with commas", () => {
    const csv = buildDeckCsv([
      {
        deckCard: {
          id: "1",
          deckId: "d",
          cardId: "c",
          quantity: 1,
          zone: "mainboard",
          status: "current",
          roles: ["role.ramp"],
          synergies: [],
          addedAt: "t",
          updatedAt: "t",
        },
        card: {
          id: "c",
          oracleId: "o",
          name: "Jace, the Mind Sculptor",
          manaValue: 4,
          typeLine: "Legendary Planeswalker — Jace",
          colors: ["U"],
          colorIdentity: ["U"],
          keywords: [],
          updatedAt: "t",
        },
      },
    ]);
    const rows = parseDeckCsv(csv);
    expect(rows[0]?.name).toBe("Jace, the Mind Sculptor");
    expect(rows[0]?.roles).toEqual(["role.ramp"]);
  });
});
