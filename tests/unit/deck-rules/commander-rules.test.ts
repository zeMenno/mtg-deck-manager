import { describe, expect, it } from "vitest";

import {
  findColorIdentityViolations,
  isWithinColorIdentity,
} from "@/lib/deck-rules/color-identity";
import { findDuplicateOracleNames } from "@/lib/deck-rules/duplicate-detection";
import { getDeckWarnings } from "@/lib/deck-rules/commander-rules";
import type { Card } from "@/types/card";
import type { Deck, DeckCardWithCard } from "@/types/deck";

function makeCard(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    oracleId: overrides.oracleId ?? `oracle-${id}`,
    name: overrides.name ?? id,
    manaValue: overrides.manaValue ?? 1,
    typeLine: overrides.typeLine ?? "Creature",
    colors: overrides.colors ?? ["W"],
    colorIdentity: overrides.colorIdentity ?? ["W"],
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeEntry(
  card: Card,
  overrides: Partial<DeckCardWithCard> = {},
): DeckCardWithCard {
  return {
    id: overrides.id ?? `dc-${card.id}`,
    deckId: "d1",
    cardId: card.id,
    quantity: overrides.quantity ?? 1,
    zone: overrides.zone ?? "mainboard",
    status: overrides.status ?? "current",
    roles: overrides.roles ?? [],
    synergies: overrides.synergies ?? [],
    addedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    card,
  };
}

describe("deck-rules (compat)", () => {
  it("detects duplicate non-basics and allows basic lands", () => {
    const sol = makeCard("sol", {
      name: "Sol Ring",
      oracleId: "sol-oracle",
      typeLine: "Artifact",
      colorIdentity: [],
      colors: [],
    });
    const plains = makeCard("plains", {
      name: "Plains",
      oracleId: "plains-oracle",
      typeLine: "Basic Land — Plains",
      colors: [],
      colorIdentity: ["W"],
    });

    const warnings = findDuplicateOracleNames([
      makeEntry(sol, { quantity: 2 }),
      makeEntry(plains, { quantity: 10 }),
    ]);

    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.severity).toBe("error");
    expect(warnings[0]?.category).toBe("LEGALITY");
    expect(warnings[0]?.message).toContain("Sol Ring");
  });

  it("detects color identity violations", () => {
    const identity = ["W"];
    const ok = makeCard("ok", { colorIdentity: ["W"] });
    const bad = makeCard("bad", {
      name: "Counterspell",
      colorIdentity: ["U"],
      colors: ["U"],
    });
    expect(isWithinColorIdentity(ok, identity)).toBe(true);
    expect(isWithinColorIdentity(bad, identity)).toBe(false);

    const violations = findColorIdentityViolations(
      [makeEntry(ok), makeEntry(bad)],
      identity,
    );
    expect(violations).toHaveLength(1);
    expect(violations[0]?.name).toBe("Counterspell");
  });

  it("emits legality vs recommendation categories", () => {
    const deck: Deck = {
      id: "d1",
      name: "Tiny",
      format: "commander",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const cards = [
      makeEntry(
        makeCard("creature", {
          typeLine: "Creature — Soldier",
          manaValue: 2,
        }),
        { roles: [] },
      ),
    ];

    const warnings = getDeckWarnings({ deck, deckCards: cards });
    const legality = warnings.filter(
      (w) => w.category === "LEGALITY" && w.severity === "error",
    );
    const recommendations = warnings.filter(
      (w) => w.category === "RECOMMENDATION",
    );

    expect(legality.some((w) => w.id === "no-commander")).toBe(true);
    expect(legality.some((w) => w.id === "deck-size")).toBe(true);
    expect(recommendations.some((w) => w.id === "low-lands")).toBe(true);
    expect(recommendations.some((w) => w.id === "low-ramp")).toBe(true);
  });

  it("passes commander size check at exactly 100", () => {
    const commander = makeCard("cmd", {
      name: "Adeline",
      typeLine: "Legendary Creature — Human Knight",
      colorIdentity: ["W"],
      legalities: { commander: "legal" },
    });
    const deck: Deck = {
      id: "d1",
      name: "Full",
      format: "commander",
      commanderId: commander.id,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const cards: DeckCardWithCard[] = [
      makeEntry(commander, { zone: "commander" }),
      ...Array.from({ length: 99 }, (_, i) =>
        makeEntry(
          makeCard(`c${i}`, {
            name: `Card ${i}`,
            oracleId: `oracle-${i}`,
            typeLine: i < 40 ? "Basic Land — Plains" : "Creature — Soldier",
            manaValue: i < 40 ? 0 : 2,
            colors: i < 40 ? [] : ["W"],
            colorIdentity: ["W"],
            legalities: { commander: "legal" },
          }),
        ),
      ),
    ];

    const warnings = getDeckWarnings({ deck, deckCards: cards });
    expect(warnings.some((w) => w.id === "deck-size-ok")).toBe(true);
    expect(warnings.some((w) => w.id === "deck-size")).toBe(false);
    expect(warnings.some((w) => w.id === "commander-set")).toBe(true);
  });

  it("increases ramp recommendation satisfaction when Ramp role assigned", () => {
    const deck: Deck = {
      id: "d1",
      name: "Rampy",
      format: "commander",
      commanderId: "cmd",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const commander = makeCard("cmd", {
      name: "Cmd",
      colorIdentity: [],
      colors: [],
      typeLine: "Legendary Creature",
      legalities: { commander: "legal" },
    });
    const withRamp = Array.from({ length: 8 }, (_, i) =>
      makeEntry(
        makeCard(`r${i}`, {
          typeLine: "Artifact",
          colors: [],
          colorIdentity: [],
          legalities: { commander: "legal" },
        }),
        {
          roles: ["role.ramp"],
        },
      ),
    );
    const warnings = getDeckWarnings({
      deck,
      deckCards: [makeEntry(commander, { zone: "commander" }), ...withRamp],
    });
    expect(warnings.some((w) => w.id === "low-ramp")).toBe(false);
  });
});
