import { describe, expect, it, vi } from "vitest";

import { listPrintings } from "@/lib/scryfall/prints";
import { MIN_INTERVAL_MS } from "@/lib/scryfall/rate-limiter";
import type { ScryfallCard } from "@/lib/scryfall/types";
import {
  FIXTURE_SOL_RING,
  FIXTURE_SOL_RING_PRINT_PAGES,
} from "@/tests/fixtures/scryfall-cards";

const card = (id: string): ScryfallCard => ({
  object: "card",
  id,
  oracle_id: "oracle-1",
  name: "Sol Ring",
});

describe("listPrintings", () => {
  it("uses locked filters and paginates all pages", async () => {
    const search = vi
      .fn()
      .mockResolvedValueOnce({
        object: "list",
        has_more: true,
        data: [card("one")],
      })
      .mockResolvedValueOnce({
        object: "list",
        has_more: false,
        data: [card("two")],
      });

    const result = await listPrintings("oracle-1", {
      currency: "EUR",
      searchFn: search,
    });

    expect(result.map((item) => item.id)).toEqual(["one", "two"]);
    expect(search).toHaveBeenNthCalledWith(
      1,
      "oracleid:oracle-1 game:paper lang:en -is:oversized",
      {
        page: 1,
        unique: "prints",
        order: "eur",
        dir: "asc",
        includeExtras: false,
      },
    );
    expect(search).toHaveBeenNthCalledWith(
      2,
      expect.any(String),
      expect.objectContaining({ page: 2 }),
    );
  });

  it("supports any language and extras without relaxing paper filters", async () => {
    const search = vi.fn().mockResolvedValue({
      object: "list",
      has_more: false,
      data: [],
    });
    await listPrintings("oracle-1", {
      anyLanguage: true,
      includeExtras: true,
      searchFn: search,
    });
    expect(search.mock.calls[0]?.[0]).toBe(
      "oracleid:oracle-1 game:paper -is:oversized",
    );
    expect(search.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({ includeExtras: true }),
    );
  });

  it("continues to use the shared 75ms limiter", () => {
    expect(MIN_INTERVAL_MS).toBe(75);
  });

  it("loads the two-page MSW fixture without contacting real Scryfall", async () => {
    const result = await listPrintings(FIXTURE_SOL_RING.oracle_id!);
    expect(result).toHaveLength(FIXTURE_SOL_RING_PRINT_PAGES.flat().length);
    expect(result.at(-1)?.id).toBe(FIXTURE_SOL_RING_PRINT_PAGES[1][0].id);
  });
});
