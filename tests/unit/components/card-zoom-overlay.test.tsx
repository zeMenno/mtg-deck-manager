// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CardZoomOverlay } from "@/components/cards/card-zoom-overlay";
import type { Card } from "@/types/card";

const sol: Card = {
  id: "sol",
  oracleId: "oracle-sol",
  name: "Sol Ring",
  manaCost: "{1}",
  manaValue: 1,
  typeLine: "Artifact",
  oracleText: "{T}: Add {C}{C}.",
  colors: [],
  colorIdentity: [],
  keywords: [],
  imageNormal: "https://cards.scryfall.io/normal/front/s.jpg",
  imageLarge: "https://cards.scryfall.io/large/front/s.jpg",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const delver: Card = {
  ...sol,
  id: "delver",
  name: "Delver of Secrets",
  faces: [
    {
      name: "Delver of Secrets",
      oracleText: "At the beginning of your upkeep, look at the top card.",
      imageLarge: "https://cards.scryfall.io/large/front/delver.jpg",
      imageNormal: "https://cards.scryfall.io/normal/front/delver.jpg",
    },
    {
      name: "Insectile Aberration",
      oracleText: "Flying",
      imageLarge: "https://cards.scryfall.io/large/back/insect.jpg",
      imageNormal: "https://cards.scryfall.io/normal/back/insect.jpg",
    },
  ],
};

describe("CardZoomOverlay", () => {
  it("exposes a modal dialog and closes on the close button", () => {
    const onOpenChange = vi.fn();
    render(<CardZoomOverlay card={sol} open onOpenChange={onOpenChange} />);

    const dialog = screen.getByTestId("card-zoom-overlay");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    fireEvent.click(screen.getByTestId("card-zoom-close"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("shows a flip control only for two-faced cards", () => {
    const { rerender } = render(
      <CardZoomOverlay card={sol} open onOpenChange={vi.fn()} />,
    );
    expect(screen.queryByTestId("card-zoom-flip")).toBeNull();

    rerender(<CardZoomOverlay card={delver} open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId("card-zoom-flip"));
    expect(screen.getByAltText("Insectile Aberration")).toBeDefined();
  });

  it("falls back to readable text when no art URLs exist", () => {
    const blank: Card = {
      ...sol,
      imageLarge: undefined,
      imageNormal: undefined,
    };
    render(<CardZoomOverlay card={blank} open onOpenChange={vi.fn()} />);
    expect(screen.getByTestId("card-zoom-text-fallback").textContent).toContain(
      "Add {C}{C}",
    );
  });

  it("still changes scale under reduced motion via zoom buttons", () => {
    render(<CardZoomOverlay card={sol} open onOpenChange={vi.fn()} />);
    fireEvent.click(screen.getByTestId("card-zoom-in"));
    const image = screen.getByTestId("card-zoom-image");
    expect(image.getAttribute("style")).toContain("scale(1.25)");
  });

  it("shows text when images are disabled", () => {
    render(
      <CardZoomOverlay
        card={sol}
        open
        imagesEnabled={false}
        onOpenChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId("card-zoom-text-fallback")).toBeDefined();
  });
});
