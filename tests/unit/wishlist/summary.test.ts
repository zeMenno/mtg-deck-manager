import { describe, expect, it } from "vitest";

import {
  calculateWishlistCost,
  sortWishlistByPriority,
} from "@/lib/wishlist/summary";
import { PRIORITY_WEIGHT } from "@/types/wishlist";

describe("wishlist priority sort", () => {
  it("orders Essential → High → Medium → Low, then newest first", () => {
    const items = [
      {
        priority: "low" as const,
        addedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        priority: "essential" as const,
        addedAt: "2024-01-01T00:00:00.000Z",
      },
      {
        priority: "essential" as const,
        addedAt: "2024-06-01T00:00:00.000Z",
      },
      {
        priority: "medium" as const,
        addedAt: "2024-03-01T00:00:00.000Z",
      },
      {
        priority: "high" as const,
        addedAt: "2024-02-01T00:00:00.000Z",
      },
    ];

    const sorted = sortWishlistByPriority(items);
    expect(sorted.map((i) => i.priority)).toEqual([
      "essential",
      "essential",
      "high",
      "medium",
      "low",
    ]);
    expect(sorted[0]!.addedAt).toBe("2024-06-01T00:00:00.000Z");
    expect(PRIORITY_WEIGHT.essential).toBeLessThan(PRIORITY_WEIGHT.low);
  });
});

describe("calculateWishlistCost", () => {
  it("skips null prices and never treats them as zero", () => {
    const result = calculateWishlistCost(
      [
        { cardId: "a", quantity: 2, priority: "high" },
        { cardId: "b", quantity: 1, priority: "low" },
        { cardId: "c", quantity: 3, priority: "medium" },
      ],
      {
        a: {
          cardId: "a",
          normal: 1.5,
          fetchedAt: "2024-01-01T00:00:00.000Z",
        },
        b: undefined,
        c: {
          cardId: "c",
          market: 2,
          fetchedAt: "2024-02-01T00:00:00.000Z",
        },
      },
    );

    expect(result.estimatedCost).toBe(2 * 1.5 + 3 * 2);
    expect(result.pricedCount).toBe(2);
    expect(result.totalCount).toBe(3);
    expect(result.byPriority.high).toBe(1);
    expect(result.mostRecentFetchedAt).toBe("2024-02-01T00:00:00.000Z");
  });

  it("returns undefined estimatedCost when nothing is priced", () => {
    const result = calculateWishlistCost(
      [{ cardId: "x", quantity: 1, priority: "essential" }],
      {},
    );
    expect(result.estimatedCost).toBeUndefined();
    expect(result.pricedCount).toBe(0);
  });
});
