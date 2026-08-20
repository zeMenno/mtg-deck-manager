/**
 * Scryfall HTTP client — rate-limited fetch with retries.
 *
 * Components must never call api.scryfall.com directly; use these methods.
 */

import {
  SCRYFALL_BASE,
  USER_AGENT,
  autocompleteUrl,
  cardByIdUrl,
  cardsCollectionUrl,
  namedCardUrl,
  searchCardsUrl,
  type SearchCardsOptions,
} from "@/lib/scryfall/endpoints";
import { schedule } from "@/lib/scryfall/rate-limiter";
import type {
  ScryfallCard,
  ScryfallCatalog,
  ScryfallCollectionResponse,
  ScryfallErrorBody,
  ScryfallSearchResult,
} from "@/lib/scryfall/types";

const MAX_RETRIES = 3;
const COLLECTION_BATCH_SIZE = 75;

export class ScryfallError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details: string;

  constructor(status: number, code: string, details: string) {
    super(details || `Scryfall error ${status}`);
    this.name = "ScryfallError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export class ScryfallNotFoundError extends ScryfallError {
  constructor(details = "Card not found.") {
    super(404, "not_found", details);
    this.name = "ScryfallNotFoundError";
  }
}

export class ScryfallRateLimitError extends ScryfallError {
  readonly retryAfterMs: number;

  constructor(details: string, retryAfterMs: number) {
    super(429, "rate_limit", details);
    this.name = "ScryfallRateLimitError";
    this.retryAfterMs = retryAfterMs;
  }
}

export type ScryfallClientConfig = {
  /** Override API base (e.g. same-origin proxy `/api/scryfall`). */
  baseUrl?: string;
  /** Inject fetch for tests. */
  fetchImpl?: typeof fetch;
};

let clientConfig: ScryfallClientConfig = {};

export function configureScryfallClient(config: ScryfallClientConfig): void {
  clientConfig = { ...clientConfig, ...config };
}

export function resetScryfallClientConfig(): void {
  clientConfig = {};
}

function resolveUrl(pathOrUrl: string): string {
  // Same-origin proxy routes — leave as relative paths for the browser.
  if (pathOrUrl.startsWith("/api/")) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = clientConfig.baseUrl?.replace(/\/$/, "") ?? SCRYFALL_BASE;
  // If base is a proxy mount like `/api/cards`, do not double-prefix Scryfall paths;
  // high-level methods already choose absolute proxy URLs when the flag is on.
  if (base.startsWith("/")) {
    const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
    return `${base}${path}`;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(header: string | null, attempt: number): number {
  if (header) {
    const asInt = Number.parseInt(header, 10);
    if (!Number.isNaN(asInt)) {
      return asInt * 1000;
    }
    const asDate = Date.parse(header);
    if (!Number.isNaN(asDate)) {
      return Math.max(0, asDate - Date.now());
    }
  }
  return Math.min(8000, 500 * 2 ** attempt);
}

async function parseErrorBody(
  response: Response,
): Promise<ScryfallErrorBody | null> {
  try {
    const json: unknown = await response.json();
    if (
      json &&
      typeof json === "object" &&
      "object" in json &&
      (json as ScryfallErrorBody).object === "error"
    ) {
      return json as ScryfallErrorBody;
    }
  } catch {
    // ignore parse failures
  }
  return null;
}

/**
 * Low-level rate-limited fetch against Scryfall (or configured proxy).
 */
export async function scryfallFetch<T>(
  pathOrUrl: string,
  init?: RequestInit,
): Promise<T> {
  const fetchImpl = clientConfig.fetchImpl ?? fetch;
  const url = resolveUrl(pathOrUrl);

  let attempt = 0;
  // Outer loop: retries for 429 / 5xx. Each attempt goes through the rate limiter.
  while (true) {
    try {
      return await schedule(async () => {
        const headers = new Headers(init?.headers);
        if (!headers.has("Accept")) {
          headers.set("Accept", "application/json");
        }
        // Browsers forbid setting User-Agent; Node / proxy can send it.
        if (typeof window === "undefined" && !headers.has("User-Agent")) {
          headers.set("User-Agent", USER_AGENT);
        }

        const response = await fetchImpl(url, {
          ...init,
          headers,
        });

        if (response.ok) {
          return (await response.json()) as T;
        }

        const body = await parseErrorBody(response);
        const details =
          body?.details ?? response.statusText ?? `HTTP ${response.status}`;

        if (response.status === 404) {
          throw new ScryfallNotFoundError(details);
        }

        if (response.status === 429) {
          const retryAfterMs = parseRetryAfterMs(
            response.headers.get("Retry-After"),
            attempt,
          );
          throw new ScryfallRateLimitError(details, retryAfterMs);
        }

        if (response.status >= 500) {
          const err = new ScryfallError(
            response.status,
            body?.code ?? "server_error",
            details,
          );
          (err as ScryfallError & { retryable?: boolean }).retryable = true;
          throw err;
        }

        throw new ScryfallError(
          response.status,
          body?.code ?? "unknown",
          details,
        );
      });
    } catch (err) {
      const is429 = err instanceof ScryfallRateLimitError;
      const is5xx =
        err instanceof ScryfallError &&
        err.status >= 500 &&
        (err as ScryfallError & { retryable?: boolean }).retryable === true;

      if ((is429 || is5xx) && attempt < MAX_RETRIES) {
        const waitMs = is429
          ? err.retryAfterMs
          : Math.min(8000, 500 * 2 ** attempt);
        attempt += 1;
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
}

function isProxyEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_USE_SCRYFALL_PROXY === "true" ||
    clientConfig.baseUrl === "/api/cards"
  );
}

export async function searchCards(
  query: string,
  options?: SearchCardsOptions,
): Promise<ScryfallSearchResult> {
  if (isProxyEnabled()) {
    const params = new URLSearchParams();
    params.set("q", query);
    if (options?.page !== undefined) {
      params.set("page", String(options.page));
    }
    if (options?.unique) {
      params.set("unique", options.unique);
    }
    if (options?.order) {
      params.set("order", options.order);
    }
    if (options?.dir) {
      params.set("dir", options.dir);
    }
    if (options?.includeExtras !== undefined) {
      params.set("include_extras", String(options.includeExtras));
    }
    return scryfallFetch<ScryfallSearchResult>(
      `/api/cards/search?${params.toString()}`,
    );
  }
  const url = searchCardsUrl(query, options);
  return scryfallFetch<ScryfallSearchResult>(url);
}

export async function getCardById(id: string): Promise<ScryfallCard> {
  if (isProxyEnabled()) {
    return scryfallFetch<ScryfallCard>(`/api/cards/${encodeURIComponent(id)}`);
  }
  return scryfallFetch<ScryfallCard>(cardByIdUrl(id));
}

/**
 * Fetch cards by Scryfall printing ids via `/cards/collection`.
 * Batches of 75 run sequentially through the rate limiter.
 */
export async function getCardsByIds(ids: string[]): Promise<ScryfallCard[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];

  const results: ScryfallCard[] = [];
  for (let i = 0; i < unique.length; i += COLLECTION_BATCH_SIZE) {
    const chunk = unique.slice(i, i + COLLECTION_BATCH_SIZE);
    const body = {
      identifiers: chunk.map((id) => ({ id })),
    };
    const response = await scryfallFetch<ScryfallCollectionResponse>(
      cardsCollectionUrl(),
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    results.push(...response.data);
  }
  return results;
}

export async function autocomplete(query: string): Promise<string[]> {
  const catalog = await scryfallFetch<ScryfallCatalog>(autocompleteUrl(query));
  return catalog.data;
}

export type NamedCardOptions = {
  fuzzy?: boolean;
  set?: string;
};

/**
 * Resolve a card by name via `/cards/named` (fuzzy by default).
 * Used by text/CSV decklist import.
 */
export async function getCardNamed(
  name: string,
  options: NamedCardOptions = {},
): Promise<ScryfallCard> {
  const fuzzy = options.fuzzy !== false;
  if (isProxyEnabled()) {
    const params = new URLSearchParams();
    params.set(fuzzy ? "fuzzy" : "exact", name);
    if (options.set) params.set("set", options.set);
    return scryfallFetch<ScryfallCard>(`/api/cards/named?${params.toString()}`);
  }
  return scryfallFetch<ScryfallCard>(
    namedCardUrl(name, { fuzzy, set: options.set }),
  );
}

/** Max ids per collection request (Scryfall docs). */
export { COLLECTION_BATCH_SIZE };
