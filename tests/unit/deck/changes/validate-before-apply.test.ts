import { describe, expect, it } from "vitest";

import { validateBeforeApply } from "@/lib/deck/changes/apply-changes";
import type { Card } from "@/types/card";
import type { Deck, DeckCardWithCard } from "@/types/deck";

function makeCard(
  id: string,
  name: string,
  overrides: Partial<Card> = {},
): Card {
  return {
    id,
    oracleId: overrides.oracleId ?? `oracle-${id}`,
    name,
    manaValue: 1,
    typeLine: overrides.typeLine ?? "Creature",
    colors: overrides.colors ?? [],
    colorIdentity: overrides.colorIdentity ?? [],
    keywords: [],
    legalities: overrides.legalities ?? { commander: "legal" },
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function row(
  id: string,
  status: DeckCardWithCard["status"],
  card: Card,
  quantity = 1,
  zone: DeckCardWithCard["zone"] = "mainboard",
): DeckCardWithCard {
  return {
    id,
    deckId: "d1",
    cardId: card.id,
    quantity,
    zone,
    status,
    roles: [],
    synergies: [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    card,
  };
}

const deck: Deck = {
  id: "d1",
  name: "Validate",
  format: "commander",
  commanderId: "cmd",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function padLegalDeck(extra: DeckCardWithCard[]): DeckCardWithCard[] {
  const cmd = makeCard("cmd", "Commander", {
    typeLine: "Legendary Creature",
    colorIdentity: [],
  });
  const cards: DeckCardWithCard[] = [
    row("cmd-row", "current", cmd, 1, "commander"),
  ];
  const needed =
    99 -
    extra.filter((c) => c.zone !== "commander" && c.status === "current")
      .length;
  for (let i = 0; i < needed; i += 1) {
    cards.push(
      row(
        `pad-${i}`,
        "current",
        makeCard(`pad-${i}`, `Pad ${i}`, {
          typeLine: "Basic Land — Plains",
          colorIdentity: ["W"],
        }),
      ),
    );
  }
  cards.push(...extra);
  return cards;
}

describe("validateBeforeApply", () => {
  it("blocks commander projected deck over 100", () => {
    const cards: DeckCardWithCard[] = [];
    const cmd = makeCard("cmd", "Cmd", {
      typeLine: "Legendary Creature",
      colorIdentity: [],
    });
    cards.push(row("cmd-row", "current", cmd, 1, "commander"));
    for (let i = 0; i < 94; i += 1) {
      const c = makeCard(`cur-${i}`, `Current ${i}`);
      cards.push(row(`r-${i}`, "current", c));
    }
    for (let i = 0; i < 7; i += 1) {
      const c = makeCard(`add-${i}`, `Add ${i}`);
      cards.push(row(`a-${i}`, "add", c));
    }
    // 1 cmd + 94 current + 7 add = 102 projected
    const validation = validateBeforeApply({ deck, deckCards: cards, cards });
    expect(validation.ok).toBe(false);
    expect(validation.canApply).toBe(false);
    expect(validation.issues.some((i) => i.id === "projected-over-size")).toBe(
      true,
    );
  });

  it("allows apply when size is ok and pending changes exist", () => {
    const cmd = makeCard("cmd", "Cmd", {
      typeLine: "Legendary Creature",
      colorIdentity: ["W"],
      colors: ["W"],
    });
    const cards: DeckCardWithCard[] = [
      row("cmd-row", "current", cmd, 1, "commander"),
    ];
    for (let i = 0; i < 98; i += 1) {
      const c = makeCard(`cur-${i}`, `Current ${i}`, {
        typeLine: "Basic Land — Plains",
        colorIdentity: ["W"],
      });
      cards.push(row(`r-${i}`, "current", c));
    }
    const addCard = makeCard("add-1", "Incoming", {
      colorIdentity: ["W"],
      colors: ["W"],
    });
    cards.push(row("a-1", "add", addCard));
    // 1 + 98 + 1 = 100
    const validation = validateBeforeApply({ deck, deckCards: cards, cards });
    expect(validation.ok).toBe(true);
    expect(validation.canApply).toBe(true);
  });

  it("blocks on projected duplicates (LEGALITY)", () => {
    const shared = makeCard("dup", "Duplicate");
    const cards = padLegalDeck([
      row("1", "current", shared),
      row("2", "add", {
        ...makeCard("dup-print-2", "Duplicate"),
        oracleId: shared.oracleId,
      }),
    ]);

    const validation = validateBeforeApply({ deck, deckCards: cards, cards });
    expect(validation.issues.some((i) => i.id.startsWith("duplicate-"))).toBe(
      true,
    );
    expect(
      validation.issues.find((i) => i.id.startsWith("duplicate-"))?.severity,
    ).toBe("error");
    expect(validation.canApply).toBe(false);
  });
});
