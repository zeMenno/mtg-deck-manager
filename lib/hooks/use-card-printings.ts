"use client";

import { useQuery } from "@tanstack/react-query";

import { CardPriceRepository } from "@/lib/db/repositories/card-price-repository";
import { CardRepository } from "@/lib/db/repositories/card-repository";
import { mapScryfallPrices } from "@/lib/pricing/providers/scryfall-pricing-provider";
import { getPricingService } from "@/lib/pricing/pricing-service";
import { listPrintings, type PrintingFilters } from "@/lib/scryfall/prints";
import { normalizeScryfallCards } from "@/lib/scryfall/normalize";
import type { ScryfallCard } from "@/lib/scryfall/types";
import type { Currency } from "@/types";
import type { Card, CardPrice } from "@/types/card";

export const printingKeys = {
  all: ["card-printings"] as const,
  oracle: (oracleId: string, filters: PrintingFilters) =>
    [...printingKeys.all, oracleId, filters] as const,
};

function cachedPrinting(
  card: Card,
  price: CardPrice | undefined,
): ScryfallCard {
  return {
    object: "card",
    id: card.id,
    oracle_id: card.oracleId,
    name: card.name,
    set: card.setCode,
    set_name: card.setName,
    collector_number: card.collectorNumber,
    rarity: card.rarity,
    image_uris: {
      small: card.imageSmall,
      normal: card.imageNormal,
      large: card.imageLarge,
    },
    prices:
      price?.currency === "EUR"
        ? {
            eur: price.normal?.toString(),
            eur_foil: price.foil?.toString(),
          }
        : {
            usd: price?.normal?.toString(),
            usd_foil: price?.foil?.toString(),
          },
  };
}

export async function fetchCardPrintings(
  oracleId: string,
  filters: PrintingFilters = {},
  online = true,
): Promise<{
  printings: ScryfallCard[];
  currency: Currency;
  offline: boolean;
}> {
  const currency =
    filters.currency ?? (await getPricingService().getCurrency());
  const cards = new CardRepository();
  const prices = new CardPriceRepository();

  if (!online) {
    const cached = await cards.getByOracleId(oracleId);
    const priceMap = await prices.getByCardIds(cached.map((card) => card.id));
    return {
      printings: cached.map((card) =>
        cachedPrinting(card, priceMap.get(card.id)),
      ),
      currency,
      offline: true,
    };
  }

  const printings = await listPrintings(oracleId, { ...filters, currency });
  await cards.bulkUpsert(normalizeScryfallCards(printings));
  const fetchedAt = new Date().toISOString();
  const snapshots = printings
    .map((printing) => mapScryfallPrices(printing, currency, fetchedAt))
    .filter((price): price is NonNullable<typeof price> => price !== null);
  await prices.upsertMany(snapshots);
  return { printings, currency, offline: false };
}

export function useCardPrintings(
  oracleId: string | undefined,
  filters: PrintingFilters,
  enabled = true,
) {
  const online = typeof navigator === "undefined" || navigator.onLine;
  return useQuery({
    queryKey: printingKeys.oracle(oracleId ?? "", filters),
    queryFn: () => fetchCardPrintings(oracleId!, filters, online),
    enabled: enabled && Boolean(oracleId),
    staleTime: 5 * 60 * 1000,
  });
}
