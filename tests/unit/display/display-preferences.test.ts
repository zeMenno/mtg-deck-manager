import { afterEach, describe, expect, it, vi } from "vitest";

import { getEffectiveDensity } from "@/lib/display/get-effective-density";
import {
  getCardImageUrl,
  isAllowedCardImageUrl,
} from "@/lib/display/get-card-image-url";
import {
  estimateRowHeight,
  getDensityRowClass,
} from "@/lib/display/density-classes";
import type { Card } from "@/types/card";

function baseCard(overrides: Partial<Card> = {}): Card {
  return {
    id: "card-1",
    oracleId: "oracle-1",
    name: "Sol Ring",
    manaValue: 1,
    typeLine: "Artifact",
    colors: [],
    colorIdentity: [],
    keywords: [],
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("getEffectiveDensity", () => {
  it("returns compact when images are disabled even if density is image", () => {
    expect(
      getEffectiveDensity({ imagesEnabled: false, density: "image" }),
    ).toBe("compact");
  });

  it("returns the preferred density when images are enabled", () => {
    expect(
      getEffectiveDensity({ imagesEnabled: true, density: "comfortable" }),
    ).toBe("comfortable");
    expect(getEffectiveDensity({ imagesEnabled: true, density: "image" })).toBe(
      "image",
    );
  });
});

describe("getCardImageUrl", () => {
  it("maps size to the correct URL field", () => {
    const card = baseCard({
      imageSmall: "https://cards.scryfall.io/small/front/s.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/s.jpg",
      imageLarge: "https://cards.scryfall.io/large/front/s.jpg",
    });

    expect(getCardImageUrl(card, "xs")).toContain("/small/");
    expect(getCardImageUrl(card, "sm")).toContain("/small/");
    expect(getCardImageUrl(card, "md")).toContain("/normal/");
    expect(getCardImageUrl(card, "lg")).toContain("/large/");
    expect(getCardImageUrl(card, "full")).toContain("/large/");
  });

  it("returns the front face image for a DFC", () => {
    const card = baseCard({
      name: "Delver of Secrets",
      faces: [
        {
          name: "Delver of Secrets",
          imageSmall: "https://cards.scryfall.io/small/front/delver.jpg",
          imageNormal: "https://cards.scryfall.io/normal/front/delver.jpg",
        },
        {
          name: "Insectile Aberration",
          imageSmall: "https://cards.scryfall.io/small/back/insect.jpg",
          imageNormal: "https://cards.scryfall.io/normal/back/insect.jpg",
        },
      ],
    });

    expect(getCardImageUrl(card, "sm")).toContain("delver");
    expect(getCardImageUrl(card, "sm", 1)).toContain("insect");
  });

  it("falls back when a preferred size is missing", () => {
    const card = baseCard({
      imageNormal: "https://cards.scryfall.io/normal/front/only.jpg",
    });
    expect(getCardImageUrl(card, "xs")).toContain("only.jpg");
  });

  it("returns undefined when no images exist", () => {
    expect(getCardImageUrl(baseCard(), "sm")).toBeUndefined();
  });
});

describe("isAllowedCardImageUrl", () => {
  it("accepts Scryfall CDN hosts", () => {
    expect(
      isAllowedCardImageUrl("https://cards.scryfall.io/small/front/x.jpg"),
    ).toBe(true);
    expect(
      isAllowedCardImageUrl(
        "https://c1.scryfall.com/file/scryfall-cards/x.jpg",
      ),
    ).toBe(true);
  });

  it("rejects arbitrary hosts", () => {
    expect(isAllowedCardImageUrl("https://evil.example/card.jpg")).toBe(false);
    expect(isAllowedCardImageUrl(undefined)).toBe(false);
  });
});

describe("density class mapping", () => {
  it("maps compact/comfortable/image to distinct row classes", () => {
    expect(getDensityRowClass("compact")).toContain("py-2");
    expect(getDensityRowClass("comfortable")).toContain("p-3");
    expect(getDensityRowClass("image")).toContain("p-2");
    expect(estimateRowHeight("compact")).toBeLessThan(
      estimateRowHeight("image"),
    );
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
