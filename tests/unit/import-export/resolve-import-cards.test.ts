import { describe, expect, it } from "vitest";

import {
  importCardKey,
  resolveImportCards,
} from "@/lib/import-export/resolve-import-cards";
import { getCardBySetCollector } from "@/lib/scryfall/client";
import { normalizeScryfallCard } from "@/lib/scryfall/normalize";
import {
  FIXTURE_SOL_RING,
  FIXTURE_SOL_RING_CHEAP,
} from "@/tests/fixtures/scryfall-cards";
import { closeAndDelete, resetDatabase } from "@/tests/helpers/db-test-utils";

describe("resolveImportCards collector numbers", () => {
  it("keeps two printings of the same name as distinct keys", async () => {
    const database = await resetDatabase();
    try {
      const cheap = normalizeScryfallCard(FIXTURE_SOL_RING_CHEAP);
      const original = normalizeScryfallCard(FIXTURE_SOL_RING);
      const result = await resolveImportCards(
        [
          { name: "Sol Ring", setCode: "c21", collectorNumber: "263" },
          { name: "Sol Ring", setCode: "cmm", collectorNumber: "396" },
        ],
        {
          database,
          lookup: async (_name, opts) => {
            if (opts?.set === "cmm" && opts.collectorNumber === "396") {
              return cheap;
            }
            if (opts?.set === "c21" && opts.collectorNumber === "263") {
              return original;
            }
            return null;
          },
        },
      );

      expect(
        result.byKey.get(
          importCardKey({
            name: "Sol Ring",
            setCode: "c21",
            collectorNumber: "263",
          }),
        )?.id,
      ).toBe(original.id);
      expect(
        result.byKey.get(
          importCardKey({
            name: "Sol Ring",
            setCode: "cmm",
            collectorNumber: "396",
          }),
        )?.id,
      ).toBe(cheap.id);
    } finally {
      await closeAndDelete(database);
    }
  });
});

describe("getCardBySetCollector", () => {
  it("returns the printing matching set and collector number", async () => {
    const card = await getCardBySetCollector("cmm", "396");
    expect(card.id).toBe(FIXTURE_SOL_RING_CHEAP.id);
    expect(card.set).toBe("cmm");
    expect(card.collector_number).toBe("396");
  });
});
