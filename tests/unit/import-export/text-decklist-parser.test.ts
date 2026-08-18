import { describe, expect, it } from "vitest";

import { parseTextDecklist } from "@/lib/import-export/text-decklist-parser";

describe("parseTextDecklist", () => {
  it("parses quantity variants and commander marker", () => {
    const result = parseTextDecklist(`
// Soldier Swarm
// Commander: Adeline, Resplendent Cathar
// Format: Commander

1 Adeline, Resplendent Cathar *CMDR*
1x Sol Ring
2 x Arcane Signet
1 Lightning Greaves (C21) 123
`);

    expect(result.deckName).toBe("Soldier Swarm");
    expect(result.format).toBe("commander");
    expect(result.commanderName).toBe("Adeline, Resplendent Cathar");
    expect(result.lines).toHaveLength(4);
    expect(result.lines[0]).toMatchObject({
      quantity: 1,
      name: "Adeline, Resplendent Cathar",
      zone: "commander",
    });
    expect(result.lines[1]).toMatchObject({
      quantity: 1,
      name: "Sol Ring",
      zone: "mainboard",
    });
    expect(result.lines[2]).toMatchObject({
      quantity: 2,
      name: "Arcane Signet",
    });
    expect(result.lines[3]).toMatchObject({
      name: "Lightning Greaves",
      setCode: "c21",
      collectorNumber: "123",
    });
  });

  it("parses sideboard and ADD sections", () => {
    const result = parseTextDecklist(`
1 Sol Ring

SIDEBOARD:
1 Rest in Peace

// ADD
1 Skullclamp
`);

    expect(result.lines.find((l) => l.name === "Rest in Peace")?.zone).toBe(
      "sideboard",
    );
    expect(result.lines.find((l) => l.name === "Skullclamp")).toMatchObject({
      status: "add",
      zone: "mainboard",
    });
  });

  it("skips blank lines and comments", () => {
    const result = parseTextDecklist(`
# comment
// another

1 Sol Ring
`);
    expect(result.lines).toHaveLength(1);
  });

  it("normalizes smart quotes in names", () => {
    const result = parseTextDecklist(`1 Jace\u2019s Ingenuity`);
    expect(result.lines[0]?.name).toBe("Jace's Ingenuity");
  });
});
