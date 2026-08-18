/**
 * Optional MSW helpers for pricing-focused tests.
 * Core Scryfall handlers in `scryfall-handlers.ts` already cover
 * GET /cards/:id and POST /cards/collection with `prices` on fixtures.
 */

import { http, HttpResponse } from "msw";

import { SCRYFALL_BASE } from "@/lib/scryfall/endpoints";

/** Force next card-by-id request to return null prices. */
export function pricingNullPricesHandler(cardId: string) {
  return http.get(`${SCRYFALL_BASE}/cards/${cardId}`, () =>
    HttpResponse.json({
      object: "card",
      id: cardId,
      name: "No Price",
      prices: { usd: null, usd_foil: null, eur: null, eur_foil: null },
    }),
  );
}

/** Force network failure for collection endpoint. */
export function pricingCollectionErrorHandler() {
  return http.post(`${SCRYFALL_BASE}/cards/collection`, () =>
    HttpResponse.json(
      {
        object: "error",
        code: "server_error",
        status: 503,
        details: "Unavailable",
      },
      { status: 503 },
    ),
  );
}
