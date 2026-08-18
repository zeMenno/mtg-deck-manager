/**
 * MSW handlers for Scryfall API — used in unit/integration tests.
 * Import `scryfallHandlers` into the Vitest setup server.
 */

import { http, HttpResponse } from "msw";

import { SCRYFALL_BASE } from "@/lib/scryfall/endpoints";
import {
  FIXTURE_CARDS,
  FIXTURE_CORRUPT_SEARCH,
  FIXTURE_EMPTY_SEARCH,
  FIXTURE_SOL_RING,
} from "@/tests/fixtures/scryfall-cards";

let forceCorruptSearch = false;
let forceEmptySearch = false;
let force429Count = 0;
let force5xxCount = 0;

export function resetScryfallMockState(): void {
  forceCorruptSearch = false;
  forceEmptySearch = false;
  force429Count = 0;
  force5xxCount = 0;
}

export function mockCorruptSearchOnce(): void {
  forceCorruptSearch = true;
}

export function mockEmptySearchOnce(): void {
  forceEmptySearch = true;
}

/** Next N search requests return 429. */
export function mockRateLimitTimes(times: number): void {
  force429Count = times;
}

/** Next N search requests return 503. */
export function mockServerErrorTimes(times: number): void {
  force5xxCount = times;
}

function matchQuery(q: string) {
  const needle = q.toLowerCase();
  return FIXTURE_CARDS.filter(
    (card) =>
      card.name.toLowerCase().includes(needle) ||
      card.card_faces?.some((f) => f.name.toLowerCase().includes(needle)),
  );
}

export const scryfallHandlers = [
  http.get(`${SCRYFALL_BASE}/cards/search`, ({ request }) => {
    if (force429Count > 0) {
      force429Count -= 1;
      return HttpResponse.json(
        {
          object: "error",
          code: "rate_limit",
          status: 429,
          details: "Slow down",
        },
        { status: 429, headers: { "Retry-After": "0" } },
      );
    }
    if (force5xxCount > 0) {
      force5xxCount -= 1;
      return HttpResponse.json(
        {
          object: "error",
          code: "server_error",
          status: 503,
          details: "Unavailable",
        },
        { status: 503 },
      );
    }
    if (forceCorruptSearch) {
      forceCorruptSearch = false;
      return HttpResponse.json(FIXTURE_CORRUPT_SEARCH);
    }
    if (forceEmptySearch) {
      forceEmptySearch = false;
      return HttpResponse.json(FIXTURE_EMPTY_SEARCH);
    }

    const url = new URL(request.url);
    const q = url.searchParams.get("q") ?? "";
    if (!q.trim()) {
      return HttpResponse.json(
        {
          object: "error",
          code: "bad_request",
          status: 400,
          details: "Missing q",
        },
        { status: 400 },
      );
    }

    const data = matchQuery(q);
    if (data.length === 0) {
      return HttpResponse.json(
        {
          object: "error",
          code: "not_found",
          status: 404,
          details: "Your query didn’t match any cards.",
        },
        { status: 404 },
      );
    }

    return HttpResponse.json({
      object: "list",
      total_cards: data.length,
      has_more: false,
      data,
    });
  }),

  http.get(`${SCRYFALL_BASE}/cards/:id`, ({ params }) => {
    const id = String(params.id);
    const card =
      FIXTURE_CARDS.find((c) => c.id === id) ??
      (id === FIXTURE_SOL_RING.id ? FIXTURE_SOL_RING : undefined);
    if (!card) {
      return HttpResponse.json(
        {
          object: "error",
          code: "not_found",
          status: 404,
          details: "Card not found.",
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(card);
  }),

  http.post(`${SCRYFALL_BASE}/cards/collection`, async ({ request }) => {
    const body = (await request.json()) as {
      identifiers?: Array<{ id?: string }>;
    };
    const ids = (body.identifiers ?? [])
      .map((i) => i.id)
      .filter((id): id is string => Boolean(id));
    const data = FIXTURE_CARDS.filter((c) => ids.includes(c.id));
    const not_found = ids
      .filter((id) => !data.some((c) => c.id === id))
      .map((id) => ({ id }));
    return HttpResponse.json({
      object: "list",
      data,
      not_found,
    });
  }),

  http.get(`${SCRYFALL_BASE}/cards/autocomplete`, ({ request }) => {
    const url = new URL(request.url);
    const q = (url.searchParams.get("q") ?? "").toLowerCase();
    const data = FIXTURE_CARDS.map((c) => c.name).filter((n) =>
      n.toLowerCase().includes(q),
    );
    return HttpResponse.json({
      object: "catalog",
      total_values: data.length,
      data,
    });
  }),

  http.get(`${SCRYFALL_BASE}/cards/named`, ({ request }) => {
    const url = new URL(request.url);
    const fuzzy = (url.searchParams.get("fuzzy") ?? "").toLowerCase();
    const exact = (url.searchParams.get("exact") ?? "").toLowerCase();
    const needle = fuzzy || exact;
    if (!needle) {
      return HttpResponse.json(
        {
          object: "error",
          code: "bad_request",
          status: 400,
          details: "Missing fuzzy or exact",
        },
        { status: 400 },
      );
    }
    const card = FIXTURE_CARDS.find((c) => {
      const name = c.name.toLowerCase();
      if (exact) return name === exact;
      return name === needle || name.includes(needle) || needle.includes(name);
    });
    if (!card) {
      return HttpResponse.json(
        {
          object: "error",
          code: "not_found",
          status: 404,
          details: "No cards found matching your query.",
        },
        { status: 404 },
      );
    }
    return HttpResponse.json(card);
  }),
];
