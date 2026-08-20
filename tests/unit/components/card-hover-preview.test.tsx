// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CardHoverPreview } from "@/components/cards/card-hover-preview";
import type { Card } from "@/types/card";

const card: Card = {
  id: "sol",
  oracleId: "oracle-sol",
  name: "Sol Ring",
  manaValue: 1,
  typeLine: "Artifact",
  colors: [],
  colorIdentity: [],
  keywords: [],
  imageLarge: "https://cards.scryfall.io/large/front/s.jpg",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("CardHoverPreview", () => {
  it("renders nothing without an anchor", () => {
    const { container } = render(
      <CardHoverPreview card={card} anchor={null} />,
    );
    expect(
      container.querySelector("[data-testid=card-hover-preview]"),
    ).toBeNull();
  });

  it("portals a decorative preview when anchored", () => {
    render(
      <CardHoverPreview card={card} anchor={new DOMRect(10, 10, 80, 110)} />,
    );
    const preview = screen.getByTestId("card-hover-preview");
    expect(preview.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not render when images are disabled", () => {
    render(
      <CardHoverPreview
        card={card}
        imagesEnabled={false}
        anchor={new DOMRect(10, 10, 80, 110)}
      />,
    );
    expect(screen.queryByTestId("card-hover-preview")).toBeNull();
  });
});
