import { describe, expect, it } from "vitest";

import {
  getPrintingPrice,
  pickCheapest,
} from "@/lib/pricing/cheapest-printing";
import type { ScryfallCard } from "@/lib/scryfall/types";

function printing(
  id: string,
  prices: ScryfallCard["prices"],
  overrides: Partial<ScryfallCard> = {},
): ScryfallCard {
  return {
    object: "card",
    id,
    oracle_id: "oracle",
    name: "Sol Ring",
    set: "set",
    collector_number: id,
    released_at: "2020-01-01",
    prices,
    ...overrides,
  };
}

describe("pickCheapest", () => {
  it("skips null and empty prices instead of ranking them as zero", () => {
    const missing = printing("missing", { usd: null });
    const empty = printing("empty", { usd: "" });
    const priced = printing("priced", { usd: "1.25" });
    expect(pickCheapest([missing, empty, priced], false, "USD")?.id).toBe(
      "priced",
    );
    expect(getPrintingPrice(missing, false, "USD")).toBeNull();
  });

  it("chooses foil independently from nonfoil", () => {
    const a = printing("a", { usd: "1", usd_foil: "10" });
    const b = printing("b", { usd: "2", usd_foil: "3" });
    expect(pickCheapest([a, b], false, "USD")?.id).toBe("a");
    expect(pickCheapest([a, b], true, "USD")?.id).toBe("b");
  });

  it("uses EUR fields and foil etched fallback", () => {
    const a = printing("a", { usd: "1", eur: "4", eur_etched: "2" });
    const b = printing("b", { usd: "9", eur: "3", eur_foil: "5" });
    expect(pickCheapest([a, b], false, "EUR")?.id).toBe("b");
    expect(pickCheapest([a, b], true, "EUR")?.id).toBe("a");
  });

  it("ties prefer current, then earlier release, then set and collector", () => {
    const current = printing("current", { usd: "1" }, { released_at: "2024" });
    const oldB = printing(
      "old-b",
      { usd: "1" },
      { released_at: "1998", set: "b" },
    );
    const oldA2 = printing(
      "old-a2",
      { usd: "1" },
      {
        released_at: "1998",
        set: "a",
        collector_number: "2",
      },
    );
    const oldA1 = printing(
      "old-a1",
      { usd: "1" },
      {
        released_at: "1998",
        set: "a",
        collector_number: "1",
      },
    );
    expect(
      pickCheapest([oldB, oldA2, current, oldA1], false, "USD", "current")?.id,
    ).toBe("current");
    expect(pickCheapest([oldB, oldA2, oldA1], false, "USD")?.id).toBe("old-a1");
  });
});
