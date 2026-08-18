import { describe, expect, it } from "vitest";

import { validateCommanderCount } from "@/lib/format/validators/commander-count";
import { validateDeckSize } from "@/lib/format/validators/deck-size";
import { validateDuplicates } from "@/lib/format/validators/duplicate-detection";
import {
  isWithinIdentity,
  validateColorIdentity,
} from "@/lib/format/validators/color-identity";
import { validateCardLegality } from "@/lib/format/validators/card-legality";
import { validateLandCount } from "@/lib/format/validators/land-count";
import { validateRoleCoverage } from "@/lib/format/validators/role-coverage";
import { buildProjectedDeck } from "@/lib/format/projected-deck-builder";
import {
  getCommanderCurrentWarnings,
  getCommanderProjectedWarnings,
} from "@/lib/format/commander-rules";
import {
  hasLegalityErrors,
  summarizeWarnings,
} from "@/lib/format/warning-utils";
import {
  DEFAULT_RECOMMENDATION_CONFIG,
  type RecommendationConfig,
} from "@/types/deck-validation";
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

function lookupFrom(cards: DeckCardWithCard[]) {
  const map = new Map(cards.map((c) => [c.cardId, c.card]));
  return (id: string) => map.get(id);
}

const emptyDeck: Deck = {
  id: "d1",
  name: "Test",
  format: "commander",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("commander-count", () => {
  it("errors on 0 commanders", () => {
    const warnings = validateCommanderCount(emptyDeck, [
      makeEntry(makeCard("c1")),
    ]);
    expect(warnings.some((w) => w.severity === "error")).toBe(true);
    expect(warnings[0]?.code).toBe("COMMANDER_COUNT");
  });

  it("passes on exactly 1 commander", () => {
    const cmd = makeCard("cmd");
    const warnings = validateCommanderCount(
      { ...emptyDeck, commanderId: cmd.id },
      [makeEntry(cmd, { zone: "commander" })],
    );
    expect(warnings.some((w) => w.severity === "success")).toBe(true);
  });

  it("errors on 2+ commanders", () => {
    const a = makeCard("a");
    const b = makeCard("b");
    const warnings = validateCommanderCount(emptyDeck, [
      makeEntry(a, { zone: "commander" }),
      makeEntry(b, { zone: "commander" }),
    ]);
    expect(warnings.some((w) => w.id === "multi-commander")).toBe(true);
  });
});

describe("deck-size", () => {
  it("errors under 100", () => {
    const cmd = makeCard("cmd");
    const cards = [
      makeEntry(cmd, { zone: "commander" }),
      ...Array.from({ length: 98 }, (_, i) =>
        makeEntry(makeCard(`c${i}`, { oracleId: `o${i}` })),
      ),
    ];
    const warnings = validateDeckSize(cards);
    expect(warnings[0]?.severity).toBe("error");
    expect(warnings[0]?.actual).toBe(99);
  });

  it("passes at 100 including commander", () => {
    const cmd = makeCard("cmd");
    const cards = [
      makeEntry(cmd, { zone: "commander" }),
      ...Array.from({ length: 99 }, (_, i) =>
        makeEntry(makeCard(`c${i}`, { oracleId: `o${i}` })),
      ),
    ];
    const warnings = validateDeckSize(cards);
    expect(warnings[0]?.severity).toBe("success");
    expect(warnings[0]?.actual).toBe(100);
  });

  it("errors over 100", () => {
    const cmd = makeCard("cmd");
    const cards = [
      makeEntry(cmd, { zone: "commander" }),
      ...Array.from({ length: 100 }, (_, i) =>
        makeEntry(makeCard(`c${i}`, { oracleId: `o${i}` })),
      ),
    ];
    const warnings = validateDeckSize(cards);
    expect(warnings[0]?.severity).toBe("error");
    expect(warnings[0]?.actual).toBe(101);
  });
});

describe("duplicates", () => {
  it("errors on 2x Sol Ring", () => {
    const sol = makeCard("sol", {
      name: "Sol Ring",
      oracleId: "sol-oracle",
      typeLine: "Artifact",
      colorIdentity: [],
      colors: [],
    });
    const warnings = validateDuplicates([makeEntry(sol, { quantity: 2 })]);
    expect(warnings.some((w) => w.severity === "error")).toBe(true);
  });

  it("allows 2x basic Forest", () => {
    const forest = makeCard("forest", {
      name: "Forest",
      oracleId: "forest-oracle",
      typeLine: "Basic Land — Forest",
      colors: [],
      colorIdentity: ["G"],
    });
    const warnings = validateDuplicates([makeEntry(forest, { quantity: 2 })]);
    expect(warnings.every((w) => w.severity === "success")).toBe(true);
  });

  it("errors on same oracleId different printings", () => {
    const a = makeCard("a", { name: "Sol Ring", oracleId: "sol" });
    const b = makeCard("b", { name: "Sol Ring", oracleId: "sol" });
    const warnings = validateDuplicates([makeEntry(a), makeEntry(b)]);
    expect(warnings.some((w) => w.code === "DUPLICATE_NON_BASIC")).toBe(true);
  });
});

describe("color-identity", () => {
  it("errors white commander + black card", () => {
    const cmd = makeCard("cmd", { colorIdentity: ["W"] });
    const bad = makeCard("bad", {
      name: "Doom Blade",
      colorIdentity: ["B"],
      colors: ["B"],
    });
    const deck = { ...emptyDeck, commanderId: cmd.id };
    const warnings = validateColorIdentity(deck, [
      makeEntry(cmd, { zone: "commander" }),
      makeEntry(bad),
    ]);
    expect(warnings.some((w) => w.severity === "error")).toBe(true);
  });

  it("passes mardu cards in mardu deck", () => {
    const cmd = makeCard("cmd", { colorIdentity: ["W", "B", "R"] });
    const ok = makeCard("ok", { colorIdentity: ["W", "R"] });
    const deck = { ...emptyDeck, commanderId: cmd.id };
    const warnings = validateColorIdentity(deck, [
      makeEntry(cmd, { zone: "commander" }),
      makeEntry(ok),
    ]);
    expect(warnings.some((w) => w.severity === "success")).toBe(true);
  });

  it("allows colorless in any deck", () => {
    expect(isWithinIdentity(makeCard("c", { colorIdentity: [] }), ["W"])).toBe(
      true,
    );
  });
});

describe("card-legality", () => {
  it("errors on banned when legality present", () => {
    const banned = makeCard("ban", {
      name: "Banned",
      legalities: { commander: "banned" },
    });
    const warnings = validateCardLegality([makeEntry(banned)]);
    expect(
      warnings.some((w) => w.category === "LEGALITY" && w.severity === "error"),
    ).toBe(true);
  });

  it("warns (not error) when legality missing", () => {
    const unknown = makeCard("u", { name: "Unknown" });
    const warnings = validateCardLegality([makeEntry(unknown)]);
    expect(warnings.some((w) => w.code === "CARD_LEGALITY_UNKNOWN")).toBe(true);
    expect(
      warnings.every(
        (w) => w.category !== "LEGALITY" || w.severity !== "error",
      ),
    ).toBe(true);
  });

  it("treats restricted as not legal", () => {
    const restricted = makeCard("r", {
      legalities: { commander: "restricted" },
    });
    const warnings = validateCardLegality([makeEntry(restricted)]);
    expect(warnings.some((w) => w.severity === "error")).toBe(true);
  });
});

describe("recommendations", () => {
  it("recommends more lands below min", () => {
    const lands = Array.from({ length: 30 }, (_, i) =>
      makeEntry(
        makeCard(`l${i}`, {
          typeLine: "Basic Land — Plains",
          oracleId: `l${i}`,
          colorIdentity: ["W"],
          colors: [],
        }),
      ),
    );
    const warnings = validateLandCount(lands, DEFAULT_RECOMMENDATION_CONFIG);
    expect(warnings.some((w) => w.id === "low-lands")).toBe(true);
    expect(warnings[0]?.category).toBe("RECOMMENDATION");
  });

  it("recommends more ramp below min", () => {
    const cards = Array.from({ length: 7 }, (_, i) =>
      makeEntry(makeCard(`r${i}`, { oracleId: `r${i}` }), {
        roles: ["role.ramp"],
      }),
    );
    const warnings = validateRoleCoverage(cards, DEFAULT_RECOMMENDATION_CONFIG);
    expect(warnings.some((w) => w.id === "low-ramp")).toBe(true);
  });

  it("respects config threshold changes", () => {
    const config: RecommendationConfig = {
      ...DEFAULT_RECOMMENDATION_CONFIG,
      minLands: 20,
    };
    const lands = Array.from({ length: 25 }, (_, i) =>
      makeEntry(
        makeCard(`l${i}`, {
          typeLine: "Land",
          oracleId: `l${i}`,
          colorIdentity: [],
          colors: [],
        }),
      ),
    );
    const warnings = validateLandCount(lands, config);
    expect(warnings.some((w) => w.severity === "success")).toBe(true);
  });
});

describe("projected-deck", () => {
  it("CURRENT 98 + ADD 2 = 100 projected size", () => {
    const cmd = makeCard("cmd");
    const cards = [
      makeEntry(cmd, { zone: "commander", status: "current" }),
      ...Array.from({ length: 97 }, (_, i) =>
        makeEntry(makeCard(`c${i}`, { oracleId: `o${i}` }), {
          status: "current",
        }),
      ),
      makeEntry(makeCard("a1", { oracleId: "oa1" }), { status: "add" }),
      makeEntry(makeCard("a2", { oracleId: "oa2" }), { status: "add" }),
    ];
    const projected = buildProjectedDeck(cards);
    expect(projected.totalCount).toBe(100);

    const warnings = getCommanderProjectedWarnings(
      { ...emptyDeck, commanderId: cmd.id },
      cards,
      lookupFrom(cards),
    );
    expect(warnings.some((w) => w.id === "deck-size-ok")).toBe(true);
  });

  it("CURRENT 100 + ADD 1 = 101 projected error", () => {
    const cmd = makeCard("cmd");
    const cards = [
      makeEntry(cmd, { zone: "commander", status: "current" }),
      ...Array.from({ length: 99 }, (_, i) =>
        makeEntry(makeCard(`c${i}`, { oracleId: `o${i}` }), {
          status: "current",
        }),
      ),
      makeEntry(makeCard("a1", { oracleId: "oa1" }), { status: "add" }),
    ];
    const projected = buildProjectedDeck(cards);
    expect(projected.totalCount).toBe(101);
    const warnings = getCommanderProjectedWarnings(
      { ...emptyDeck, commanderId: cmd.id },
      cards,
      lookupFrom(cards),
    );
    expect(warnings.some((w) => w.id === "deck-size")).toBe(true);
  });
});

describe("warning categories", () => {
  it("never labels land recommendations as LEGALITY", () => {
    const warnings = getCommanderCurrentWarnings(
      emptyDeck,
      [makeEntry(makeCard("c1"))],
      lookupFrom([makeEntry(makeCard("c1"))]),
    );
    const landRecs = warnings.filter((w) => w.code === "LAND_COUNT");
    expect(landRecs.every((w) => w.category === "RECOMMENDATION")).toBe(true);
  });

  it("summarizes and detects legality errors", () => {
    const warnings = getCommanderCurrentWarnings(
      emptyDeck,
      [makeEntry(makeCard("c1"))],
      lookupFrom([makeEntry(makeCard("c1"))]),
    );
    expect(hasLegalityErrors(warnings)).toBe(true);
    const summary = summarizeWarnings(warnings);
    expect(summary.errors).toBeGreaterThan(0);
  });
});

describe("performance", () => {
  it("validates 100-card deck in under 50ms", () => {
    const cmd = makeCard("cmd", {
      typeLine: "Legendary Creature",
      legalities: { commander: "legal" },
    });
    const cards = [
      makeEntry(cmd, { zone: "commander" }),
      ...Array.from({ length: 99 }, (_, i) =>
        makeEntry(
          makeCard(`c${i}`, {
            oracleId: `o${i}`,
            typeLine: i < 36 ? "Basic Land — Plains" : "Creature — Soldier",
            colorIdentity: ["W"],
            colors: i < 36 ? [] : ["W"],
            legalities: { commander: "legal" },
            manaValue: i < 36 ? 0 : 2,
          }),
          { roles: i < 10 ? ["role.ramp"] : [] },
        ),
      ),
    ];
    const lookup = lookupFrom(cards);
    const start = performance.now();
    for (let i = 0; i < 5; i += 1) {
      getCommanderCurrentWarnings(
        { ...emptyDeck, commanderId: cmd.id },
        cards,
        lookup,
      );
    }
    const elapsed = (performance.now() - start) / 5;
    expect(elapsed).toBeLessThan(50);
  });
});
