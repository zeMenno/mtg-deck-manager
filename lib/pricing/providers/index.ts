import type { Currency } from "@/types";
import { ScryfallPricingProvider } from "@/lib/pricing/providers/scryfall-pricing-provider";
import type { PricingProvider } from "@/lib/pricing/types";

export type GetActiveProviderOptions = {
  currency?: Currency;
};

/** Resolve the active pricing provider (Scryfall for MVP). */
export function getActiveProvider(
  options: GetActiveProviderOptions = {},
): PricingProvider {
  return new ScryfallPricingProvider({
    currency: options.currency ?? "USD",
  });
}

export { ScryfallPricingProvider } from "@/lib/pricing/providers/scryfall-pricing-provider";
export { mapScryfallPrices } from "@/lib/pricing/providers/scryfall-pricing-provider";
