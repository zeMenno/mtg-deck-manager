/**
 * Pricing layer — provider-agnostic card prices with local Dexie cache.
 *
 * Chosen field: Scryfall `prices.usd` / `prices.eur` mapped to `normal`
 * (and foil variants). `low` / `market` mirror `normal` for MVP labeling.
 */

export * from "@/lib/pricing/types";
export * from "@/lib/pricing/constants";
export * from "@/lib/pricing/format-price";
export * from "@/lib/pricing/valuation";
export {
  PricingService,
  getPricingService,
  resetPricingServiceSingleton,
  pricingService,
} from "@/lib/pricing/pricing-service";
export type {
  GetPriceOptions,
  PricingServiceOptions,
} from "@/lib/pricing/pricing-service";
export {
  getActiveProvider,
  ScryfallPricingProvider,
  mapScryfallPrices,
} from "@/lib/pricing/providers";
