import {
  USER_AGENT,
  searchCardsUrl,
  cardByIdUrl,
  namedCardUrl,
} from "@/lib/scryfall/endpoints";
import { schedule } from "@/lib/scryfall/rate-limiter";
import type { SearchUniqueMode } from "@/lib/scryfall/endpoints";

/**
 * Server-side Scryfall forwarder with the shared rate limiter.
 * Used by optional `/api/cards/*` proxy routes.
 */
export async function proxyScryfallGet(url: string): Promise<Response> {
  return schedule(async () => {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      // Avoid Next caching Scryfall errors/stale search pages aggressively.
      cache: "no-store",
    });
    return response;
  });
}

export function buildSearchUpstream(
  q: string,
  options?: { page?: number; unique?: SearchUniqueMode },
): string {
  return searchCardsUrl(q, {
    unique: options?.unique ?? "cards",
    page: options?.page,
  });
}

export function buildCardUpstream(id: string): string {
  return cardByIdUrl(id);
}

export function buildNamedUpstream(
  name: string,
  options?: { fuzzy?: boolean; set?: string },
): string {
  return namedCardUrl(name, options);
}
