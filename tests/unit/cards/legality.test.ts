import { describe, expect, it } from "vitest";

import {
  getLegalityCalloutText,
  getLegalityWarning,
  isPlayableIn,
} from "@/lib/cards/legality";
import { mapLegalities } from "@/lib/scryfall/normalize";
import type { Card } from "@/types/card";

function cardWith(
  legalities: Card["legalities"],
  name = "Test Card",
): Pick<Card, "name" | "legalities"> {
  return { name, legalities };
}

describe("mapLegalities", () => {
  it("retains known formats and drops unknown keys/values", () => {
    const mapped = mapLegalities({
      commander: "legal",
      brawl: "banned",
      not_a_format: "legal",
      modern: "maybe",
      standard: "not_legal",
    } as Record<string, string>);

    expect(mapped).toEqual({
      commander: "legal",
      brawl: "banned",
      standard: "not_legal",
    });
  });
});

describe("getLegalityWarning", () => {
  it("skips other format and legal / undefined", () => {
    expect(
      getLegalityWarning(cardWith({ commander: "banned" }), "other"),
    ).toBeNull();
    expect(
      getLegalityWarning(cardWith({ commander: "legal" }), "commander"),
    ).toBeNull();
    expect(getLegalityWarning(cardWith(undefined), "commander")).toBeNull();
  });

  it("warns for banned, restricted, not_legal", () => {
    expect(
      getLegalityWarning(cardWith({ commander: "banned" }), "commander")?.kind,
    ).toBe("banned");
    expect(
      getLegalityWarning(cardWith({ modern: "restricted" }), "modern")?.kind,
    ).toBe("restricted");
    expect(
      getLegalityWarning(cardWith({ standard: "not_legal" }), "standard")?.kind,
    ).toBe("not_legal");
  });

  it("isPlayableIn and callout helpers", () => {
    const banned = cardWith({ commander: "banned" }, "Dockside Extortionist");
    expect(isPlayableIn(banned, "commander")).toBe(false);
    expect(isPlayableIn(banned, "other")).toBe(true);
    expect(getLegalityCalloutText(banned, "commander")).toMatch(/banned/i);
  });
});
