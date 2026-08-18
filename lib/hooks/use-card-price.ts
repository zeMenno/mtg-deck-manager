"use client";

import { useQuery } from "@tanstack/react-query";

import { useDatabase } from "@/components/providers/database-provider";
import { useOnlineStatus } from "@/lib/hooks/use-online-status";
import { getPricingService } from "@/lib/pricing/pricing-service";
import type { CardPriceSnapshot } from "@/lib/pricing/types";
import { selectUnitPrice } from "@/lib/pricing/valuation";
import type { Currency } from "@/types";

export const priceKeys = {
  all: ["price"] as const,
  card: (cardId: string, currency: Currency) =>
    [...priceKeys.all, cardId, currency] as const,
  deck: (deckId: string, currency: Currency) =>
    ["deck-prices", deckId, currency] as const,
  valuation: (deckId: string, currency: Currency) =>
    ["deck-valuation", deckId, currency] as const,
};

export function useCardPrice(
  cardId: string | undefined,
  options: { foil?: boolean; currency?: Currency; refresh?: boolean } = {},
): {
  snapshot: CardPriceSnapshot | null | undefined;
  unitPrice: number | undefined;
  isLoading: boolean;
  isError: boolean;
  currency: Currency;
  refetch: () => void;
} {
  const { ready } = useDatabase();
  const online = useOnlineStatus();
  const enabled = ready && Boolean(cardId);

  const currencyQuery = useQuery({
    queryKey: ["settings", "currency"],
    queryFn: () => getPricingService().getCurrency(),
    enabled: ready && options.currency === undefined,
    staleTime: 60_000,
  });

  const currency = options.currency ?? currencyQuery.data ?? "USD";

  const query = useQuery({
    queryKey: priceKeys.card(cardId ?? "", currency),
    queryFn: async () => {
      return getPricingService().getPrice(cardId!, {
        currency,
        online,
        refresh: options.refresh,
      });
    },
    enabled:
      enabled && (options.currency !== undefined || currencyQuery.isSuccess),
    staleTime: 5 * 60 * 1000,
  });

  const snapshot = query.data;
  const unitPrice = selectUnitPrice(snapshot ?? undefined, {
    foil: options.foil,
  });

  return {
    snapshot,
    unitPrice,
    isLoading:
      !ready ||
      (options.currency === undefined && currencyQuery.isLoading) ||
      query.isLoading,
    isError: query.isError,
    currency,
    refetch: () => {
      void query.refetch();
    },
  };
}
