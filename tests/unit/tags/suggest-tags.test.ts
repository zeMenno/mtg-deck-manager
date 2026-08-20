import { describe, expect, it } from "vitest";

import { suggestTags } from "@/lib/tags/suggest-tags";
import type { Card } from "@/types/card";

function card(
  name: string,
  typeLine: string,
  oracleText = "",
  keywords: string[] = [],
): Card {
  return {
    id: `card-${name}`,
    oracleId: `oracle-${name}`,
    name,
    manaValue: 1,
    typeLine,
    oracleText,
    colors: [],
    colorIdentity: [],
    keywords,
    updatedAt: "2026-08-20T00:00:00.000Z",
  };
}

describe("suggestTags", () => {
  it("suggests ramp and artifact for Sol Ring without a network lookup", () => {
    const result = suggestTags(
      card("Sol Ring", "Artifact", "{T}: Add {C}{C}."),
    );
    expect(result.roles).toContain("role.ramp");
    expect(result.synergies).toContain("synergy.artifact");
  });

  it("suggests removal for Swords to Plowshares", () => {
    const result = suggestTags(
      card(
        "Swords to Plowshares",
        "Instant",
        "Exile target creature. Its controller gains life equal to its power.",
      ),
    );
    expect(result.roles).toContain("role.removal");
  });

  it("suggests counterspell for Counterspell", () => {
    const result = suggestTags(
      card("Counterspell", "Instant", "Counter target spell."),
    );
    expect(result.roles).toContain("role.counterspell");
    expect(result.roles).not.toContain("role.other");
  });

  it("suggests ramp, not card draw, for Cultivate", () => {
    const result = suggestTags(
      card(
        "Cultivate",
        "Sorcery",
        "Search your library for up to two basic land cards, reveal those cards, put one onto the battlefield tapped and the other into your hand, then shuffle.",
      ),
    );
    expect(result.roles).toContain("role.ramp");
    expect(result.roles).not.toContain("role.card-draw");
  });

  it("suggests card draw and equipment for Skullclamp, not combo", () => {
    const result = suggestTags(
      card(
        "Skullclamp",
        "Artifact — Equipment",
        "Equipped creature gets +1/-1. Whenever equipped creature dies, draw two cards.",
        ["Equip"],
      ),
    );
    expect(result.roles).toContain("role.card-draw");
    expect(result.synergies).toContain("synergy.equipment");
    expect(result.roles).not.toContain("role.combo-piece");
  });

  it("suggests Soldier kindred but not strategy tags for a vanilla Soldier", () => {
    const result = suggestTags(
      card("Glory Seeker", "Creature — Human Soldier"),
    );
    expect(result.synergies).toEqual(
      expect.arrayContaining(["synergy.human", "synergy.soldier"]),
    );
    expect(result.synergies).not.toContain("synergy.aggro");
    expect(result.synergies).not.toContain("synergy.tribal");
  });

  it("deliberately avoids guessing Craterhoof and a basic land", () => {
    const craterhoof = suggestTags(
      card(
        "Craterhoof Behemoth",
        "Creature — Beast",
        "Creatures you control gain trample and get +X/+X until end of turn.",
        ["Haste"],
      ),
    );
    const plains = suggestTags(card("Plains", "Basic Land — Plains"));
    expect(craterhoof.roles).not.toContain("role.finisher");
    expect(craterhoof.roles).not.toContain("role.win-condition");
    expect(plains.roles).toEqual([]);
    expect(plains.synergies).toEqual([]);
  });

  it("preserves imported category suggestions as the first layer", () => {
    const result = suggestTags(card("Sol Ring", "Artifact"), {
      importedRoles: ["role.ramp"],
    });
    expect(result.roles).toContain("role.ramp");
    expect(result.reasons[0]?.source).toBe("import");
  });
});
