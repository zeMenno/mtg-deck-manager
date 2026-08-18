import { describe, expect, it } from "vitest";

import { SNAPSHOT_VERSION } from "@/lib/versions/constants";
import {
  deckCardsMatchSnapshot,
  suggestVersionName,
  toDeckCardSnapshot,
  snapshotRowToDeckCard,
} from "@/lib/versions/snapshot";
import type { DeckCard, DeckSnapshot } from "@/types/deck";

function makeDeckCard(overrides: Partial<DeckCard> = {}): DeckCard {
  return {
    id: "dc-1",
    deckId: "deck-1",
    cardId: "card-1",
    quantity: 1,
    zone: "mainboard",
    status: "current",
    roles: ["role-a"],
    synergies: ["syn-a"],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("toDeckCardSnapshot", () => {
  it("strips runtime ids and timestamps", () => {
    const row = makeDeckCard({
      foil: true,
      owned: false,
      notes: "ramp",
    });
    const snap = toDeckCardSnapshot(row);
    expect(snap).toEqual({
      cardId: "card-1",
      quantity: 1,
      zone: "mainboard",
      status: "current",
      roles: ["role-a"],
      synergies: ["syn-a"],
      foil: true,
      owned: false,
      notes: "ramp",
    });
    expect(snap).not.toHaveProperty("id");
    expect(snap).not.toHaveProperty("deckId");
    expect(snap).not.toHaveProperty("addedAt");
  });
});

describe("snapshotRowToDeckCard", () => {
  it("creates ephemeral deck cards for UI", () => {
    const row = toDeckCardSnapshot(makeDeckCard());
    const deckCard = snapshotRowToDeckCard(row, "deck-1", 0);
    expect(deckCard.deckId).toBe("deck-1");
    expect(deckCard.cardId).toBe("card-1");
    expect(deckCard.id).toContain("snapshot-");
  });
});

describe("suggestVersionName", () => {
  it("uses count + 1 and locale date", () => {
    const name = suggestVersionName(2, new Date("2026-08-19T12:00:00.000Z"));
    expect(name.startsWith("v3 — ")).toBe(true);
  });
});

describe("deckCardsMatchSnapshot", () => {
  it("matches ignoring ephemeral ids", () => {
    const live = [
      makeDeckCard({ id: "a", roles: ["b", "a"], synergies: [] }),
      makeDeckCard({
        id: "b",
        cardId: "card-2",
        quantity: 2,
        roles: [],
        synergies: [],
      }),
    ];
    const snapshot: DeckSnapshot = {
      snapshotVersion: SNAPSHOT_VERSION,
      deck: { name: "Test", format: "commander" },
      capturedAt: "2026-01-01T00:00:00.000Z",
      deckCards: live.map(toDeckCardSnapshot),
    };
    expect(deckCardsMatchSnapshot(live, snapshot)).toBe(true);
  });

  it("fails when quantity differs", () => {
    const live = [makeDeckCard({ quantity: 2 })];
    const snapshot: DeckSnapshot = {
      snapshotVersion: SNAPSHOT_VERSION,
      deck: { name: "Test", format: "commander" },
      capturedAt: "2026-01-01T00:00:00.000Z",
      deckCards: [toDeckCardSnapshot(makeDeckCard({ quantity: 1 }))],
    };
    expect(deckCardsMatchSnapshot(live, snapshot)).toBe(false);
  });
});
