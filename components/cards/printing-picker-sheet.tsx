"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CardImage } from "@/components/cards/card-image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCardPrintings } from "@/lib/hooks/use-card-printings";
import { useSwitchPrinting } from "@/lib/hooks/use-deck-mutations";
import { useSwitchWishlistPrinting } from "@/lib/hooks/use-wishlist";
import {
  getPrintingPrice,
  pickCheapest,
  sortPrintingsByPrice,
} from "@/lib/pricing/cheapest-printing";
import { formatPrice } from "@/lib/pricing/format-price";
import { normalizeScryfallCard } from "@/lib/scryfall/normalize";
import type { ScryfallCard } from "@/lib/scryfall/types";
import type { Card } from "@/types/card";

type PrintingPickerSheetProps = {
  card: Card | null;
  deckCardId?: string;
  wishlistItemId?: string;
  foil?: boolean;
  imagesEnabled?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPrintingSelected?: (card: Card) => void;
};

export function PrintingPickerSheet({
  card,
  deckCardId,
  wishlistItemId,
  foil = false,
  imagesEnabled = true,
  open,
  onOpenChange,
  onPrintingSelected,
}: PrintingPickerSheetProps) {
  const [anyLanguage, setAnyLanguage] = useState(false);
  const [includeExtras, setIncludeExtras] = useState(false);
  const query = useCardPrintings(
    card?.oracleId,
    { anyLanguage, includeExtras },
    open,
  );
  const switchPrinting = useSwitchPrinting();
  const switchWishlistPrinting = useSwitchWishlistPrinting();
  const currency = query.data?.currency ?? "USD";
  const printings = useMemo(
    () =>
      sortPrintingsByPrice(
        query.data?.printings ?? [],
        foil,
        currency,
        card?.id,
      ),
    [card?.id, currency, foil, query.data?.printings],
  );

  if (!card) return null;

  async function selectPrinting(printing: ScryfallCard) {
    if (printing.id === card!.id) return;
    try {
      if (deckCardId) {
        await switchPrinting.mutateAsync({
          deckCardId,
          newCardId: printing.id,
        });
      } else if (wishlistItemId) {
        await switchWishlistPrinting.mutateAsync({
          itemId: wishlistItemId,
          newCardId: printing.id,
        });
      }
      const selected = normalizeScryfallCard(printing);
      onPrintingSelected?.(selected);
      toast.success(
        deckCardId || wishlistItemId
          ? "Printing changed"
          : "Showing selected printing",
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not change printing",
      );
    }
  }

  const cheapest = pickCheapest(printings, foil, currency, card.id);
  const insufficientOffline =
    query.data?.offline === true && printings.length < 2;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        snap="tall"
        className="overflow-hidden"
        data-testid="printing-picker-sheet"
      >
        <SheetHeader>
          <SheetTitle>Choose printing</SheetTitle>
          <SheetDescription>
            English paper printings by {currency} reference price.
          </SheetDescription>
        </SheetHeader>

        <div className="border-border bg-background sticky top-0 z-10 mx-4 flex min-h-11 items-center justify-between border px-3 py-2">
          <div>
            <p className="font-bold">{card.name}</p>
            <p className="text-muted-foreground font-mono text-xs uppercase">
              Current · {card.setCode ?? "—"} #{card.collectorNumber ?? "—"}
            </p>
          </div>
          <Badge>Current</Badge>
        </div>

        <div className="flex flex-wrap gap-2 px-4">
          <Button
            type="button"
            size="sm"
            variant={anyLanguage ? "default" : "outline"}
            onClick={() => setAnyLanguage((value) => !value)}
          >
            Any language
          </Button>
          <Button
            type="button"
            size="sm"
            variant={includeExtras ? "default" : "outline"}
            onClick={() => setIncludeExtras((value) => !value)}
          >
            Include extras/promos
          </Button>
          <Button
            type="button"
            size="sm"
            data-testid="use-cheapest-btn"
            disabled={
              !cheapest ||
              cheapest.id === card.id ||
              switchPrinting.isPending ||
              switchWishlistPrinting.isPending ||
              insufficientOffline
            }
            onClick={() => cheapest && void selectPrinting(cheapest)}
          >
            {cheapest?.id === card.id ? "Already cheapest" : "Use cheapest"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-6">
          {query.isLoading ? (
            <p className="text-muted-foreground py-6 text-sm">
              Loading printings…
            </p>
          ) : query.isError ? (
            <p className="text-destructive py-6 text-sm">
              Could not load printings.
            </p>
          ) : insufficientOffline ? (
            <p className="text-muted-foreground py-6 text-sm">
              Connect to load other printings.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {printings.map((printing) => {
                const current = printing.id === card.id;
                const price = getPrintingPrice(printing, foil, currency);
                return (
                  <button
                    key={printing.id}
                    type="button"
                    data-testid={`printing-option-${printing.id}`}
                    className="border-border hover:bg-accent focus-visible:ring-ring flex min-h-11 w-full items-center gap-3 rounded-md border p-2 text-left focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60"
                    disabled={
                      current ||
                      switchPrinting.isPending ||
                      switchWishlistPrinting.isPending
                    }
                    onClick={() => void selectPrinting(printing)}
                  >
                    {imagesEnabled ? (
                      <CardImage
                        src={
                          printing.image_uris?.small ??
                          printing.card_faces?.[0]?.image_uris?.small
                        }
                        alt={printing.name}
                        size="xs"
                        imagesEnabled
                      />
                    ) : null}
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">
                        {(printing.set ?? "—").toUpperCase()} #
                        {printing.collector_number ?? "—"}
                      </span>
                      <span className="text-muted-foreground block text-xs">
                        {printing.rarity ?? "Unknown rarity"}
                      </span>
                    </span>
                    <span className="text-right font-mono text-sm">
                      {formatPrice(price, currency)}
                    </span>
                    {current ? <Badge>Current</Badge> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
