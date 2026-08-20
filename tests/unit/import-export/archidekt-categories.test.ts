import { describe, expect, it } from "vitest";

import {
  isArchidektTypeBucket,
  mapArchidektCategories,
  mapArchidektCategory,
} from "@/lib/import-export/archidekt-categories";

describe("archidekt category mapping", () => {
  it("maps seeded names and aliases onto tag ids", () => {
    expect(mapArchidektCategory("Ramp")).toBe("role.ramp");
    expect(mapArchidektCategory("Draw")).toBe("role.card-draw");
    expect(mapArchidektCategory("Card Draw")).toBe("role.card-draw");
    expect(mapArchidektCategory("Wrath")).toBe("role.board-wipe");
    expect(mapArchidektCategory("Soldier")).toBe("synergy.soldier");
    expect(mapArchidektCategory("Tokens")).toBe("synergy.token");
  });

  it("skips type buckets even when a synergy with the same name exists", () => {
    expect(isArchidektTypeBucket("Creatures")).toBe(true);
    expect(mapArchidektCategory("Artifact")).toBeUndefined();
    expect(mapArchidektCategory("Enchantment")).toBeUndefined();
  });

  it("does not create custom tags for unmapped names like Buy", () => {
    const mapped = mapArchidektCategories(["Buy", "Ramp", "Goldfish"]);
    expect(mapped.roleIds).toEqual(["role.ramp"]);
    expect(mapped.synergyIds).toEqual([]);
    expect(mapped.ignored).toEqual(["Buy", "Goldfish"]);
  });
});
