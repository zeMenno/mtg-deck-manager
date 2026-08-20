// @vitest-environment jsdom
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PrintingPickerSheet } from "@/components/cards/printing-picker-sheet";
import type { Card } from "@/types/card";

const mocks = vi.hoisted(() => ({
  switchPrinting: vi.fn().mockResolvedValue({}),
  switchWishlist: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/hooks/use-card-printings", () => ({
  useCardPrintings: () => ({
    data: {
      currency: "USD",
      offline: false,
      printings: [
        {
          object: "card",
          id: "current",
          oracle_id: "oracle",
          name: "Sol Ring",
          set: "exp",
          collector_number: "1",
          prices: { usd: "5.00" },
        },
        {
          object: "card",
          id: "cheap",
          oracle_id: "oracle",
          name: "Sol Ring",
          type_line: "Artifact",
          set: "cmm",
          collector_number: "390",
          prices: { usd: "0.80" },
        },
      ],
    },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/lib/hooks/use-deck-mutations", () => ({
  useSwitchPrinting: () => ({
    mutateAsync: mocks.switchPrinting,
    isPending: false,
  }),
}));

vi.mock("@/lib/hooks/use-wishlist", () => ({
  useSwitchWishlistPrinting: () => ({
    mutateAsync: mocks.switchWishlist,
    isPending: false,
  }),
}));

const currentCard: Card = {
  id: "current",
  oracleId: "oracle",
  name: "Sol Ring",
  manaValue: 1,
  typeLine: "Artifact",
  colors: [],
  colorIdentity: [],
  keywords: [],
  setCode: "exp",
  collectorNumber: "1",
  updatedAt: "",
};

describe("PrintingPickerSheet", () => {
  it("shows set and price then selects a fixture printing", async () => {
    const selected = vi.fn();
    render(
      <PrintingPickerSheet
        card={currentCard}
        deckCardId="deck-card"
        imagesEnabled={false}
        open
        onOpenChange={vi.fn()}
        onPrintingSelected={selected}
      />,
    );

    expect(screen.getByText(/CMM/)).toBeDefined();
    expect(screen.getByTestId("printing-option-cheap").textContent).toContain(
      "0.80",
    );
    fireEvent.click(screen.getByTestId("printing-option-cheap"));

    await waitFor(() => {
      expect(mocks.switchPrinting).toHaveBeenCalledWith({
        deckCardId: "deck-card",
        newCardId: "cheap",
      });
      expect(selected).toHaveBeenCalledWith(
        expect.objectContaining({ id: "cheap", setCode: "cmm" }),
      );
    });
  });
});
