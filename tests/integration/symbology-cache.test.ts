import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  DeckBuilderDatabase,
  deleteDatabase,
  resetDatabaseSingleton,
} from "@/lib/db/database";
import { SymbolRepository } from "@/lib/db/repositories/symbol-repository";
import {
  ensureSymbologyCached,
  normalizeSymbologySymbol,
} from "@/lib/scryfall/symbology";
import * as client from "@/lib/scryfall/client";

const DB = "DeckBuilderSymbologyTest";

describe("symbology cache", () => {
  beforeEach(async () => {
    await deleteDatabase(DB);
    await resetDatabaseSingleton(new DeckBuilderDatabase(DB));
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await deleteDatabase(DB);
    await resetDatabaseSingleton();
  });

  it("normalizes and round-trips through Dexie", async () => {
    const symbol = normalizeSymbologySymbol({
      symbol: "{W}",
      svg_uri: "https://svgs.scryfall.io/card-symbols/W.svg",
      english: "one white mana",
      represents_mana: true,
      colors: ["W"],
    });
    expect(symbol?.symbol).toBe("{W}");

    const repo = new SymbolRepository();
    await repo.bulkUpsert([symbol!]);
    expect(await repo.getBySymbol("{W}")).toMatchObject({
      symbol: "{W}",
      english: "one white mana",
    });
    expect(await repo.isStale()).toBe(false);
  });

  it("refreshes when empty via ensureSymbologyCached", async () => {
    vi.spyOn(client, "scryfallFetch").mockResolvedValue({
      object: "list",
      data: [
        {
          symbol: "{U}",
          svg_uri: "https://svgs.scryfall.io/card-symbols/U.svg",
          english: "one blue mana",
          represents_mana: true,
          colors: ["U"],
        },
      ],
    });

    const result = await ensureSymbologyCached(new SymbolRepository());
    expect(result.refreshed).toBe(true);
    expect(result.count).toBe(1);
    expect(await new SymbolRepository().getBySymbol("{U}")).toBeTruthy();
  });

  it("treats old cache as stale", async () => {
    const repo = new SymbolRepository();
    await repo.bulkUpsert([
      {
        symbol: "{R}",
        svgUri: "https://svgs.scryfall.io/card-symbols/R.svg",
        english: "one red mana",
        representsMana: true,
        colors: ["R"],
        updatedAt: new Date(
          Date.now() - 40 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    ]);
    expect(await repo.isStale()).toBe(true);
  });
});
