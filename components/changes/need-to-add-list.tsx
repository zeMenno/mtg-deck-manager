"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CardPriceDisplay } from "@/components/cards/card-price";
import { TcgplayerLink } from "@/components/cards/tcgplayer-link";
import { ChangeEmptyState } from "@/components/changes/change-empty-state";
import { NeedToAddSummary } from "@/components/changes/need-to-add-summary";
import { ReplacementLinkPicker } from "@/components/changes/replacement-link-picker";
import { ReplacementLinkBadge } from "@/components/changes/replacement-link-badge";
import { DeckCardRow } from "@/components/deck/deck-card-row";
import { Button } from "@/components/ui/button";
import { computeChangeSummary, getReplacementForAdd } from "@/lib/deck/changes";
import {
  useDemoteAdd,
  useLinkReplacement,
  useUnlinkReplacement,
} from "@/lib/hooks/use-apply-changes";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useDeckValuation } from "@/lib/hooks/use-deck-valuation";
import { useDisplayPreferences } from "@/lib/hooks/use-display-preferences";
import { useRemoveCard } from "@/lib/hooks/use-deck-mutations";
import { useRefreshPrices } from "@/lib/hooks/use-refresh-prices";
import { selectUnitPrice } from "@/lib/pricing/valuation";
import type { DeckCardWithCard } from "@/types/deck";

type NeedToAddListProps = {
  deckId: string;
  onOpenActions?: (item: DeckCardWithCard) => void;
};

type PriceSort = "default" | "price-asc" | "price-desc";

export function NeedToAddList({ deckId, onOpenActions }: NeedToAddListProps) {
  const { cards, isLoading } = useDeckCards(deckId);
  const { valuation, prices } = useDeckValuation(deckId);
  const { refresh, isPending, isOnline } = useRefreshPrices(deckId);
  const { imagesEnabled, effectiveDensity } = useDisplayPreferences();
  const [priceSort, setPriceSort] = useState<PriceSort>("default");

  const addCards = useMemo(
    () => cards.filter((c) => c.status === "add"),
    [cards],
  );
  const cutCards = useMemo(
    () => cards.filter((c) => c.status === "cut"),
    [cards],
  );
  const summary = useMemo(() => computeChangeSummary(cards), [cards]);

  const sortedAdds = useMemo(() => {
    if (priceSort === "default") return addCards;
    const withPrice = [...addCards];
    withPrice.sort((a, b) => {
      const pa = selectUnitPrice(prices.get(a.cardId), a);
      const pb = selectUnitPrice(prices.get(b.cardId), b);
      const aVal = pa ?? Number.POSITIVE_INFINITY;
      const bVal = pb ?? Number.POSITIVE_INFINITY;
      return priceSort === "price-asc" ? aVal - bVal : bVal - aVal;
    });
    return withPrice;
  }, [addCards, priceSort, prices]);

  const demote = useDemoteAdd(deckId);
  const remove = useRemoveCard();
  const link = useLinkReplacement(deckId);
  const unlink = useUnlinkReplacement(deckId);

  const [linkForAddId, setLinkForAddId] = useState<string | null>(null);

  if (isLoading) {
    return <p className="font-mono text-sm uppercase">Loading…</p>;
  }

  return (
    <div className="flex flex-col gap-4" data-testid="need-to-add-list">
      <NeedToAddSummary
        summary={summary}
        upgradeCost={valuation?.upgradeCost}
        currency={valuation?.currency}
        onRefreshPrices={refresh}
        refreshing={isPending}
        online={isOnline}
      />

      {addCards.length > 0 ? (
        <div className="flex gap-2">
          <label className="sr-only" htmlFor="need-to-add-sort">
            Sort by price
          </label>
          <select
            id="need-to-add-sort"
            data-testid="need-to-add-price-sort"
            value={priceSort}
            onChange={(e) => setPriceSort(e.target.value as PriceSort)}
            className="border-border bg-background h-11 flex-1 border-2 px-3 font-bold uppercase"
          >
            <option value="default">Sort: name</option>
            <option value="price-asc">Price ↑</option>
            <option value="price-desc">Price ↓</option>
          </select>
        </div>
      ) : null}

      {addCards.length === 0 ? (
        <ChangeEmptyState
          title="No cards marked to add."
          description="Mark candidates as ADD from the card list or consider queue."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {sortedAdds.map((item) => {
            const linkedCut = getReplacementForAdd(item.id, cards);
            return (
              <li
                key={item.id}
                className="border-border flex flex-col gap-2 border-2 p-2"
                data-testid={`need-to-add-row-${item.id}`}
              >
                <DeckCardRow
                  item={item}
                  density={effectiveDensity}
                  imagesEnabled={imagesEnabled}
                  showPrice
                  onPress={() => onOpenActions?.(item)}
                />
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-muted-foreground font-mono text-[0.625rem] uppercase">
                      Unit
                    </span>
                    <CardPriceDisplay
                      cardId={item.cardId}
                      foil={item.foil}
                      showTimestamp
                      showSource
                    />
                  </div>
                  <div className="flex flex-col gap-0.5 text-right">
                    <span className="text-muted-foreground font-mono text-[0.625rem] uppercase">
                      Total ×{item.quantity}
                    </span>
                    <CardPriceDisplay
                      cardId={item.cardId}
                      foil={item.foil}
                      quantity={item.quantity}
                      showTimestamp={false}
                      showSource={false}
                    />
                  </div>
                  <TcgplayerLink
                    tcgplayerUri={item.card.tcgplayerUri}
                    cardName={item.card.name}
                  />
                </div>
                <ReplacementLinkBadge
                  replacementName={
                    linkedCut
                      ? (cards.find((c) => c.id === linkedCut.id)?.card.name ??
                        "Linked CUT")
                      : undefined
                  }
                  emptyLabel="Link to CUT"
                  onPick={() => setLinkForAddId(item.id)}
                  onClear={
                    item.replacesDeckCardId
                      ? () => {
                          void unlink.mutateAsync(item.id).then(() => {
                            toast.success("Replacement unlinked");
                          });
                        }
                      : undefined
                  }
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    data-testid={`demote-add-${item.id}`}
                    onClick={() => {
                      void demote.mutateAsync(item.id).then(() => {
                        toast.success("Demoted to CONSIDER");
                      });
                    }}
                  >
                    Demote to consider
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    data-testid={`remove-add-${item.id}`}
                    onClick={() => {
                      void remove.mutateAsync(item.id).then(() => {
                        toast.success("Removed");
                      });
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ReplacementLinkPicker
        open={Boolean(linkForAddId)}
        onOpenChange={(open) => {
          if (!open) setLinkForAddId(null);
        }}
        mode="pick-cut"
        addCards={addCards}
        cutCards={cutCards}
        onSelect={(cutId) => {
          if (!linkForAddId) return;
          void link
            .mutateAsync({ addDeckCardId: linkForAddId, cutDeckCardId: cutId })
            .then(() => toast.success("Replacement linked"));
        }}
      />
    </div>
  );
}
