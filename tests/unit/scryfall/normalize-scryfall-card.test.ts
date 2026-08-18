import { describe, expect, it } from "vitest";

import { normalizeScryfallCard } from "@/lib/scryfall/normalize";
import {
  FIXTURE_ADVENTURE,
  FIXTURE_MINIMAL,
  FIXTURE_MODAL_DFC,
  FIXTURE_NO_IMAGE,
  FIXTURE_SOL_RING,
  FIXTURE_TRANSFORM_DFC,
} from "@/tests/fixtures/scryfall-cards";

describe("normalizeScryfallCard", () => {
  it("maps a normal single-face creature/artifact with printing + oracle ids", () => {
    const card = normalizeScryfallCard(FIXTURE_SOL_RING);

    expect(card.id).toBe(FIXTURE_SOL_RING.id);
    expect(card.oracleId).toBe(FIXTURE_SOL_RING.oracle_id);
    expect(card.id).not.toBe(card.oracleId);
    expect(card.name).toBe("Sol Ring");
    expect(card.manaCost).toBe("{1}");
    expect(card.manaValue).toBe(1);
    expect(card.typeLine).toBe("Artifact");
    expect(card.oracleText).toContain("Add {C}{C}");
    expect(card.imageSmall).toContain("sol-ring");
    expect(card.tcgplayerUri).toContain("tcgplayer");
    expect(card.layout).toBe("normal");
    expect(card.faces).toBeUndefined();
    expect(card.updatedAt).toMatch(/^\d{4}-/);
  });

  it("normalizes transform DFCs with face images and dual oracle text", () => {
    const card = normalizeScryfallCard(FIXTURE_TRANSFORM_DFC);

    expect(card.name).toContain("//");
    expect(card.layout).toBe("transform");
    expect(card.faces).toHaveLength(2);
    expect(card.faces![0].name).toBe("Delver of Secrets");
    expect(card.faces![1].name).toBe("Insectile Aberration");
    expect(card.faces![0].oracleText).toContain("transform");
    expect(card.faces![1].oracleText).toBe("Flying");
    expect(card.imageSmall).toContain("delver");
    expect(card.faces![1].imageNormal).toContain("insectile");
    expect(card.oracleId).toBe(FIXTURE_TRANSFORM_DFC.oracle_id);
  });

  it("normalizes modal DFCs from card_faces when top-level fields are sparse", () => {
    const card = normalizeScryfallCard(FIXTURE_MODAL_DFC);

    expect(card.layout).toBe("modal_dfc");
    expect(card.manaCost).toBe("{1}{U}");
    expect(card.typeLine).toContain("Instant");
    expect(card.oracleText).toContain("Counter target spell");
    expect(card.faces).toHaveLength(2);
    expect(card.faces![1].name).toBe("Jwari Ruins");
    expect(card.imageSmall).toContain("jwari");
  });

  it("normalizes adventure cards with shared top-level image_uris", () => {
    const card = normalizeScryfallCard(FIXTURE_ADVENTURE);

    expect(card.layout).toBe("adventure");
    expect(card.faces).toHaveLength(2);
    expect(card.faces![0].name).toBe("Bonecrusher Giant");
    expect(card.faces![1].name).toBe("Stomp");
    expect(card.imageNormal).toContain("bonecrusher");
    expect(card.manaValue).toBe(3);
  });

  it("handles missing images without throwing", () => {
    const card = normalizeScryfallCard(FIXTURE_NO_IMAGE);

    expect(card.imageSmall).toBeUndefined();
    expect(card.imageNormal).toBeUndefined();
    expect(card.imageLarge).toBeUndefined();
    expect(card.name).toBe("Nameless Race");
  });

  it("fills defaults for missing optional fields", () => {
    const card = normalizeScryfallCard(FIXTURE_MINIMAL);

    expect(card.id).toBe(FIXTURE_MINIMAL.id);
    expect(card.oracleId).toBe(FIXTURE_MINIMAL.id);
    expect(card.name).toBe("Bare Bones");
    expect(card.manaValue).toBe(0);
    expect(card.typeLine).toBe("");
    expect(card.colors).toEqual([]);
    expect(card.colorIdentity).toEqual([]);
    expect(card.keywords).toEqual([]);
  });
});
