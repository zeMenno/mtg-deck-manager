/**
 * Public Scryfall integration surface.
 *
 * oracleId vs printingId: see `./README.md`.
 */

export {
  SCRYFALL_BASE,
  USER_AGENT,
  searchCardsUrl,
  cardByIdUrl,
  cardBySetCollectorUrl,
  cardsCollectionUrl,
  autocompleteUrl,
  namedCardUrl,
  symbologyUrl,
  resolveScryfallUrl,
} from "@/lib/scryfall/endpoints";
export type {
  SearchUniqueMode,
  SearchCardsOptions,
} from "@/lib/scryfall/endpoints";

export {
  MIN_INTERVAL_MS,
  schedule,
  resetRateLimiter,
  getRateLimiterStats,
} from "@/lib/scryfall/rate-limiter";

export {
  scryfallFetch,
  searchCards,
  getCardById,
  getCardsByIds,
  autocomplete,
  getCardNamed,
  getCardBySetCollector,
  configureScryfallClient,
  resetScryfallClientConfig,
  ScryfallError,
  ScryfallNotFoundError,
  ScryfallRateLimitError,
  COLLECTION_BATCH_SIZE,
} from "@/lib/scryfall/client";
export type {
  ScryfallClientConfig,
  NamedCardOptions,
} from "@/lib/scryfall/client";

export {
  normalizeScryfallCard,
  normalizeScryfallCards,
  mapLegalities,
} from "@/lib/scryfall/normalize";
export { listPrintings } from "@/lib/scryfall/prints";
export type {
  PrintingFilters,
  ListPrintingsOptions,
} from "@/lib/scryfall/prints";

export {
  fetchSymbology,
  ensureSymbologyCached,
  normalizeSymbologySymbol,
} from "@/lib/scryfall/symbology";

export type {
  ScryfallCard,
  ScryfallCardFace,
  ScryfallSearchResult,
  ScryfallErrorBody,
  ScryfallList,
  ScryfallCatalog,
  ScryfallImageUris,
} from "@/lib/scryfall/types";
