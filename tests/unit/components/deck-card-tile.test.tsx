// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { DeckCardRow } from "@/components/deck/deck-card-row";
import { DeckCardTile } from "@/components/deck/deck-card-tile";
import type { Card } from "@/types/card";
import type { DeckCardWithCard } from "@/types/deck";

vi.mock("@/components/cards/card-price", () => ({
  CardPriceDisplay: ({ cardId }: { cardId: string }) => (
    <span data-testid={`price-${cardId}`}>$1.51</span>
  ),
}));

vi.mock("@/components/cards/mana-cost", () => ({
  ManaCost: () => <span data-testid="mana-cost">{"{1}"}</span>,
}));

vi.mock("@/lib/hooks/use-fine-pointer", () => ({
  useFinePointer: () => false,
}));

const card: Card = {
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

function item(overrides: Partial<DeckCardWithCard> = {}): DeckCardWithCard {
  return {
    id: "dc-1",
    deckId: "deck-1",
    cardId: card.id,
    quantity: 2,
    zone: "mainboard",
    status: "add",
    roles: ["role.ramp"],
    synergies: [],
    addedAt: card.updatedAt,
    updatedAt: card.updatedAt,
    card,
    ...overrides,
  };
}

const ramp = { id: "role.ramp", name: "Ramp", category: "role" as const };

describe("DeckCardTile", () => {
  it("renders quantity, status, MV, and price without $0.00", () => {
    render(
      <DeckCardTile
        item={item()}
        roleTags={[ramp]}
        onPress={vi.fn()}
        onLongPress={vi.fn()}
        onZoom={vi.fn()}
      />,
    );

    expect(screen.getByText("2×")).toBeDefined();
    expect(screen.getByText("Sol Ring")).toBeDefined();
    expect(screen.getByText(/MV 1/)).toBeDefined();
    expect(screen.getByTestId("price-sol").textContent).not.toContain("$0.00");
    expect(screen.getByText("Ramp")).toBeDefined();
  });

  it("opens zoom from art and calls onPress from the meta strip", () => {
    const onPress = vi.fn();
    const onZoom = vi.fn();
    render(
      <DeckCardTile
        item={item()}
        onPress={onPress}
        onLongPress={vi.fn()}
        onZoom={onZoom}
      />,
    );

    fireEvent.click(screen.getByTestId("deck-card-tile-art-dc-1"));
    expect(onZoom).toHaveBeenCalledOnce();
    expect(onPress).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("deck-card-tile-meta-dc-1"));
    expect(onPress).toHaveBeenCalledOnce();
    expect(onZoom).toHaveBeenCalledOnce();
  });

  it("cancels pending zoom on long-press", () => {
    vi.useFakeTimers();
    const onPress = vi.fn();
    const onZoom = vi.fn();
    const onLongPress = vi.fn();
    render(
      <DeckCardTile
        item={item()}
        onPress={onPress}
        onLongPress={onLongPress}
        onZoom={onZoom}
      />,
    );

    const art = screen.getByTestId("deck-card-tile-art-dc-1");
    fireEvent.pointerDown(art);
    vi.advanceTimersByTime(450);
    fireEvent.pointerUp(art);
    fireEvent.click(art);

    expect(onLongPress).toHaveBeenCalledOnce();
    expect(onZoom).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("toggles selection in multi-select and hides the magnifier", () => {
    const onPress = vi.fn();
    const onZoom = vi.fn();
    render(
      <DeckCardTile
        item={item()}
        selected
        multiSelectMode
        onPress={onPress}
        onLongPress={vi.fn()}
        onZoom={onZoom}
      />,
    );

    expect(screen.queryByTestId("deck-card-tile-zoom-dc-1")).toBeNull();
    expect(
      screen
        .getByTestId("deck-card-tile-meta-dc-1")
        .getAttribute("aria-pressed"),
    ).toBe("true");
    fireEvent.click(screen.getByTestId("deck-card-tile-art-dc-1"));
    expect(onPress).toHaveBeenCalledOnce();
    expect(onZoom).not.toHaveBeenCalled();
  });

  it("does not nest buttons inside buttons", () => {
    const { container } = render(
      <DeckCardTile
        item={item()}
        onPress={vi.fn()}
        onLongPress={vi.fn()}
        onZoom={vi.fn()}
      />,
    );
    expect(container.querySelector("button button")).toBeNull();
  });

  it("does not show a hover preview when the pointer is not fine", () => {
    render(
      <DeckCardTile
        item={item()}
        hoverPreviewEnabled
        onPress={vi.fn()}
        onLongPress={vi.fn()}
        onZoom={vi.fn()}
      />,
    );
    fireEvent.pointerEnter(screen.getByTestId("deck-card-tile-art-dc-1"));
    expect(screen.queryByTestId("card-hover-preview")).toBeNull();
  });
});

describe("DeckCardRow grid density", () => {
  it("renders as a comfortable row and does not throw", () => {
    render(
      <DeckCardRow
        item={item({ quantity: 1, status: "current" })}
        density="grid"
        imagesEnabled
        onPress={vi.fn()}
      />,
    );
    const row = screen.getByTestId("deck-card-row-dc-1");
    expect(row.getAttribute("data-density")).toBe("comfortable");
    expect(row.textContent).toContain("Sol Ring");
  });
});
