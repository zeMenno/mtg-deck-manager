import { describe, expect, it } from "vitest";

import {
  canApply,
  computeChangeSummary,
} from "@/lib/deck/changes/change-summary";
import type { DeckCard } from "@/types/deck";

function card(
  overrides: Partial<DeckCard> & Pick<DeckCard, "id" | "status">,
): DeckCard {
  return {
    deckId: "d1",
    cardId: `c-${overrides.id}`,
    quantity: 1,
    zone: "mainboard",
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeChangeSummary", () => {
  it("counts rows and quantities for mixed statuses", () => {
    const cards = [
      card({ id: "1", status: "current" }),
      card({ id: "2", status: "add", quantity: 2 }),
      card({ id: "3", status: "add" }),
      card({ id: "4", status: "cut", quantity: 3 }),
      card({ id: "5", status: "cut" }),
      card({ id: "6", status: "consider" }),
      card({ id: "7", status: "consider", quantity: 2 }),
    ];

    const summary = computeChangeSummary(cards);
    expect(summary.addCount).toBe(2);
    expect(summary.addQuantity).toBe(3);
    expect(summary.cutCount).toBe(2);
    expect(summary.cutQuantity).toBe(4);
    expect(summary.considerCount).toBe(2);
    expect(summary.considerQuantity).toBe(3);
    expect(summary.hasPendingChanges).toBe(true);
  });

  it("canApply is false when no add/cut", () => {
    const cards = [
      card({ id: "1", status: "current" }),
      card({ id: "2", status: "consider" }),
    ];
    expect(canApply(cards)).toBe(false);
    expect(computeChangeSummary(cards).hasPendingChanges).toBe(false);
  });

  it("canApply is true with only ADD or only CUT", () => {
    expect(canApply([card({ id: "1", status: "add" })])).toBe(true);
    expect(canApply([card({ id: "1", status: "cut" })])).toBe(true);
  });
});
