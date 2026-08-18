"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import { useDeckCards } from "@/lib/hooks/use-deck-cards";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { priceKeys } from "@/lib/hooks/use-card-price";
import {
  calculateCutValue,
  calculateDeckValue,
  calculateNetUpgrade,
  calculateUpgradeCost,
} from "@/lib/pricing/valuation";
import { getPricingService } from "@/lib/pricing/pricing-service";
import type {
  CardPriceSnapshot,
  DeckValuationBundle,
} from "@/lib/pricing/types";
import type { Currency } from "@/types";

export function useDeckValuation(deckId: string | undefined): {
  valuation: DeckValuationBundle | undefined;
  prices: Map<string, CardPriceSnapshot>;
  isLoading: boolean;
  currency: Currency;
  refetch: () => void;
} {
  const { ready } = useDatabase();
  const online = useOnlineStatus();
  const { cards, isLoading: cardsLoading } = useDeckCards(deckId);
  const enabled = ready && Boolean(deckId);

  const currencyQuery = useQuery({
    queryKey: ["settings", "currency"],
    queryFn: () => getPricingService().getCurrency(),
    enabled: ready,
    staleTime: 60_000,
  });

  const currency = currencyQuery.data ?? "USD";

  const pricesQuery = useQuery({
    queryKey: priceKeys.deck(deckId ?? "", currency),
    queryFn: () =>
      getPricingService().getPricesForDeck(deckId!, {
        currency,
        online,
      }),
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const valuation = useMemo((): DeckValuationBundle | undefined => {
    if (!pricesQuery.data) return undefined;
    const prices = pricesQuery.data;
    const currentValue = calculateDeckValue(cards, prices);
    const upgradeCost = calculateUpgradeCost(cards, prices);
    const cutValue = calculateCutValue(cards, prices);
    const netUpgrade = calculateNetUpgrade(upgradeCost, cutValue);
    return {
      currentValue,
      upgradeCost,
      cutValue,
      netUpgrade,
      currency,
    };
  }, [cards, pricesQuery.data, currency]);

  return {
    valuation,
    prices: pricesQuery.data ?? new Map(),
    isLoading:
      !ready ||
      cardsLoading ||
      currencyQuery.isLoading ||
      pricesQuery.isLoading,
    currency,
    refetch: () => {
      void pricesQuery.refetch();
    },
  };
}
