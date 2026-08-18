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
  cardsCollectionUrl,
  autocompleteUrl,
  namedCardUrl,
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
} from "@/lib/scryfall/normalize";

export type {
  ScryfallCard,
  ScryfallCardFace,
  ScryfallSearchResult,
  ScryfallErrorBody,
  ScryfallList,
  ScryfallCatalog,
  ScryfallImageUris,
} from "@/lib/scryfall/types";
