/** Default staleness TTL — overridden by `priceFreshnessHours` setting when available. */
export const DEFAULT_STALE_HOURS = 24;

export const PROVIDER_IDS = {
  scryfall: "scryfall",
} as const;

export const PROVIDER_DISPLAY_NAMES = {
  scryfall: "Scryfall",
} as const;

/** Scryfall `/cards/collection` max identifiers per request. */
export const PRICING_COLLECTION_BATCH_SIZE = 75;
