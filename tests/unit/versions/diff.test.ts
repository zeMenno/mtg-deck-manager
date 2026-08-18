import { describe, expect, it } from "vitest";

import { SNAPSHOT_VERSION } from "@/lib/versions/constants";
import {
  deckCardKey,
  diffSnapshots,
  emptyVersionDiff,
  isEmptyDiff,
} from "@/lib/versions/diff";
import type { DeckCardSnapshot, DeckSnapshot } from "@/types/deck";

function snap(
  deckCards: DeckCardSnapshot[],
  capturedAt = "2026-01-01T00:00:00.000Z",
): DeckSnapshot {
  return {
    snapshotVersion: SNAPSHOT_VERSION,
    deck: { name: "Test", format: "commander" },
    deckCards,
    capturedAt,
  };
}

function card(
  overrides: Partial<DeckCardSnapshot> & Pick<DeckCardSnapshot, "cardId">,
): DeckCardSnapshot {
  return {
    quantity: 1,
    zone: "mainboard",
    status: "current",
    roles: [],
    synergies: [],
    ...overrides,
  };
}

describe("deckCardKey", () => {
  it("keys by cardId:zone", () => {
    expect(deckCardKey(card({ cardId: "a", zone: "sideboard" }))).toBe(
      "a:sideboard",
    );
  });
});

describe("diffSnapshots", () => {
  it("returns empty diff for identical snapshots", () => {
    const a = snap([card({ cardId: "sol" })]);
    const diff = diffSnapshots(a, structuredClone(a));
    expect(isEmptyDiff(diff)).toBe(true);
    expect(diff).toEqual(emptyVersionDiff());
  });

  it("detects one card added", () => {
    const a = snap([]);
    const b = snap([card({ cardId: "sol", quantity: 1 })]);
    const diff = diffSnapshots(a, b);
    expect(diff.added).toHaveLength(1);
    expect(diff.added[0]?.cardId).toBe("sol");
    expect(diff.summary.addedCount).toBe(1);
  });

  it("detects one card removed", () => {
    const a = snap([card({ cardId: "sol" })]);
    const b = snap([]);
    const diff = diffSnapshots(a, b);
    expect(diff.removed).toHaveLength(1);
    expect(diff.removed[0]?.cardId).toBe("sol");
  });

  it("detects quantity change only", () => {
    const a = snap([card({ cardId: "sol", quantity: 2 })]);
    const b = snap([card({ cardId: "sol", quantity: 1 })]);
    const diff = diffSnapshots(a, b);
    expect(diff.quantityChanges).toEqual([
      {
        cardId: "sol",
        zone: "mainboard",
        fromQuantity: 2,
        toQuantity: 1,
        status: "current",
      },
    ]);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it("treats zone move as remove + add", () => {
    const a = snap([card({ cardId: "sol", zone: "mainboard" })]);
    const b = snap([card({ cardId: "sol", zone: "sideboard" })]);
    const diff = diffSnapshots(a, b);
    expect(diff.removed).toHaveLength(1);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed[0]?.zone).toBe("mainboard");
    expect(diff.added[0]?.zone).toBe("sideboard");
  });

  it("detects status-only change", () => {
    const a = snap([card({ cardId: "sol", status: "current" })]);
    const b = snap([card({ cardId: "sol", status: "add" })]);
    const diff = diffSnapshots(a, b);
    expect(diff.statusChanges).toEqual([
      {
        cardId: "sol",
        zone: "mainboard",
        quantity: 1,
        fromStatus: "current",
        toStatus: "add",
      },
    ]);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it("detects empty to populated", () => {
    const a = snap([]);
    const b = snap([
      card({ cardId: "a" }),
      card({ cardId: "b", zone: "commander" }),
    ]);
    const diff = diffSnapshots(a, b);
    expect(diff.summary.addedCount).toBe(2);
  });
});
