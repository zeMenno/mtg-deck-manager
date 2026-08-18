# Phase 04 — Scryfall Integration

## Agent Handoff Prompt

```
You are implementing Phase 4 (Scryfall Integration) of the MTG Deck Builder web app.

Workspace: mtg-deck-manager
Read first:
- plans/mtg-deck-builder-web-app-build-plan.md (sections 4, 7, 21, 25, 28, 38, 50)
- build-plan/phase-04-scryfall-integration.md (this document — follow it completely)

Prerequisites: Phases 0–3 must be complete (Next.js app, PWA shell, Dexie local DB with cards table and repositories).

Your mission:
1. Build lib/scryfall/ client with rate limiting, retries, and DFC handling.
2. Distinguish oracleId (card identity) vs printingId (specific printing) throughout.
3. Normalize Scryfall responses into the local Card interface and persist to Dexie cards table.
4. Wire TanStack Query for remote card search/lookup with offline fallback to Dexie cache.
5. Optionally add app/api/cards/* proxy routes if CORS or rate-limit concerns require server-side mediation.
6. Create card search UI (/cards) and card detail sheet with mobile bottom-sheet UX.

Do NOT implement deck CRUD (Phase 5), pricing (Phase 8), or import/export beyond what Phase 3 already provides.

Exit criteria: User can search Scryfall online, results are cached locally, offline search works against cache, DFC cards display correctly, and rate limits are respected.

When done, verify against the Testing Checklist and Exit Criteria in this document.
```

## Overview

Phase 4 connects the local-first application to **Scryfall**, the authoritative MTG card metadata source. This phase establishes the card data pipeline: remote fetch → normalization → Dexie cache → TanStack Query hooks → UI components. The integration must respect Scryfall's rate limits (documented as ~10 requests per second with a recommended 50–100 ms delay between sequential requests), handle double-faced and split cards gracefully, and maintain a clear separation between **oracle identity** (what the card _is_) and **printing identity** (which physical version the user selected).

Because the app is local-first, every card fetched from Scryfall should be written to the local `cards` table so deck editing and offline search remain usable without network access.

## Goal

Enable fast, mobile-friendly MTG card search and lookup backed by Scryfall, with local caching in IndexedDB and resilient offline behavior.

## Prerequisites

- **Phase 0:** Product model locked (Card interface, oracle vs printing distinction acknowledged).
- **Phase 1:** Next.js + TypeScript + Tailwind + shadcn/ui + Neo Brutalism theme deployed.
- **Phase 2:** PWA manifest and service worker operational (optional but recommended for image caching strategy).
- **Phase 3:** Dexie schema with `cards` table, `CardRepository`, DB migrations, app initialization on startup.

### Required packages (install if missing)

```bash
npm install @tanstack/react-query
```

Optional for advanced rate limiting:

```bash
npm install p-queue
```

## Dependencies on Previous Phases

| Prior Phase | What Phase 4 Consumes                                                                                                   |
| ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| Phase 3     | `Card` type, `cards` Dexie table, `CardRepository.upsert()`, `CardRepository.getById()`, `CardRepository.searchLocal()` |
| Phase 3     | App shell, bottom navigation, settings persistence                                                                      |
| Phase 2     | Offline indicator component (reuse for search offline state)                                                            |
| Phase 1     | shadcn/ui primitives (Input, Sheet, Skeleton, Badge)                                                                    |

Phase 4 does **not** depend on decks, deckCards, or pricing tables beyond reading/writing `cards`.

## Duration Estimate

| Skill Level             | Estimate |
| ----------------------- | -------- |
| Experienced Next.js dev | 3–5 days |
| Moderate familiarity    | 5–8 days |

Breakdown:

- Scryfall client + normalization: 1–2 days
- TanStack Query + cache strategy: 0.5–1 day
- Search UI + card detail sheet: 1–2 days
- DFC/edge cases + testing: 1 day

## Architecture & Key Decisions

### oracleId vs printingId

Scryfall exposes:

- `oracle_id` — stable identity across all printings of the same card face.
- `id` — unique Scryfall UUID for a **specific printing**.

**Decision:**

| Field                       | Maps To                                   | Usage                                                                   |
| --------------------------- | ----------------------------------------- | ----------------------------------------------------------------------- |
| `Card.id`                   | Scryfall printing UUID (`id`)             | Primary key in Dexie; image URLs, set, rarity, TCGplayer link           |
| `Card.oracleId`             | Scryfall `oracle_id`                      | Deck legality, duplicate detection, "same card" grouping                |
| Deck commander / deck cards | Reference `Card.id` (printing) by default | User sees the printing they chose; can add "prefer oracle" lookup later |

When adding a card to a deck (Phase 5), store `deckCard.cardId = Card.id` (printing). For commander color identity and duplicate checks, resolve via `Card.oracleId`.

### Scryfall client location

All Scryfall HTTP logic lives in `lib/scryfall/` — never inline `fetch('https://api.scryfall.com/...')` in React components.

```
lib/scryfall/
  client.ts          # Low-level fetch with rate limit + retry
  normalize.ts       # ScryfallCard → Card
  types.ts           # Scryfall API response types
  endpoints.ts       # URL builders
  rate-limiter.ts    # Token bucket or queue
  index.ts           # Public exports
```

### TanStack Query for remote state

- **Query keys:** `['cards', 'search', query]`, `['cards', 'detail', cardId]`, `['cards', 'collection', ids.join(',')]`
- **Stale time:** 24 hours for card metadata (Scryfall data changes infrequently).
- **gcTime:** 7 days.
- On successful fetch, always upsert to Dexie via `CardRepository`.
- On query failure, fall back to `CardRepository.searchLocal()` / `getById()`.

### Rate limiting

Scryfall asks clients to stay under ~10 req/s and include a descriptive `User-Agent`.

Implement a singleton rate limiter:

```ts
// Minimum 75ms between requests (≈13 req/s max, conservative buffer)
const MIN_INTERVAL_MS = 75;
```

Use a queue (`p-queue` concurrency 1) or manual `lastRequestAt` + `setTimeout` chaining.

On HTTP 429, read `Retry-After` header if present, otherwise exponential backoff starting at 500ms (max 3 retries).

### API route proxy (optional)

**Default:** Client-side fetch directly to `api.scryfall.com` (Scryfall supports CORS for browser requests).

**Use server proxy** (`app/api/cards/search/route.ts`) if:

- You need to hide a custom User-Agent string consistently.
- You want centralized rate limiting across users (single-user local app makes this low priority).
- Future server-side caching on Vercel Edge is desired.

For MVP local-first single-user app, **client-side is acceptable**. Document the proxy as an optional enhancement in `lib/scryfall/client.ts` via a `baseUrl` config flag.

### Double-faced cards (DFC) handling

Scryfall represents DFCs, MDFCs, split cards, and adventure cards with:

- `card_faces[]` array when `layout` is `transform`, `modal_dfc`, `split`, `adventure`, etc.
- Top-level fields may be absent; use `card_faces[0]` as default display face.

**Normalization rules:**

1. Store primary face name, mana cost, type line, oracle text on `Card` root fields.
2. Add optional `Card.faces?: CardFace[]` extension OR store JSON in a `facesJson` field if schema allows (prefer typed extension in `types/card.ts`).
3. Image URLs: use `image_uris` on front face; store `imageSmall`, `imageNormal`, `imageLarge`.
4. For search results, display front face; card detail sheet offers face toggle tabs.
5. `oracleId` comes from `oracle_id` on the card object (shared across faces for DFCs).

### Local cache strategy

```
Search flow:
  1. Debounce input (300ms)
  2. If offline → CardRepository.searchLocal(query)
  3. If online → TanStack Query → Scryfall /cards/search
  4. Normalize each result → CardRepository.bulkUpsert()
  5. Return merged results (remote order, enriched from cache)

Lookup flow:
  1. Check Dexie by id
  2. If stale (>7 days updatedAt) or missing → fetch /cards/{id}
  3. Upsert → return Card
```

Do **not** download the entire Scryfall bulk data file in Phase 4 (defer to optional background sync in post-MVP).

### Image URLs

Persist Scryfall CDN URLs only. Do not store image binaries in IndexedDB. Browser cache + service worker (Phase 2/9) handle image offline use.

Use `small` for list thumbnails, `normal` for detail, `large` for zoom.

## Data Model Impact

### Card interface (confirm / extend from Phase 3)

```ts
interface Card {
  id: string; // Scryfall printing UUID
  oracleId: string; // Scryfall oracle_id
  name: string;
  manaCost?: string;
  manaValue: number;
  typeLine: string;
  oracleText?: string;
  colors: string[];
  colorIdentity: string[];
  keywords: string[];
  setCode?: string;
  setName?: string;
  collectorNumber?: string;
  rarity?: string;
  imageSmall?: string;
  imageNormal?: string;
  imageLarge?: string;
  scryfallUri?: string;
  tcgplayerUri?: string;
  layout?: string; // NEW: transform, normal, split, etc.
  faces?: CardFace[]; // NEW: optional multi-face data
  updatedAt: string;
}

interface CardFace {
  name: string;
  manaCost?: string;
  typeLine: string;
  oracleText?: string;
  imageSmall?: string;
  imageNormal?: string;
  imageLarge?: string;
}
```

### Dexie schema changes (if not present from Phase 3)

Add indexes:

```ts
cards: "id, oracleId, name, manaValue, updatedAt";
```

Optional migration v2: add `layout`, `faces` fields; existing rows remain valid.

### New appMeta keys

| Key                       | Purpose                                    |
| ------------------------- | ------------------------------------------ |
| `scryfall.lastSyncAt`     | Last successful bulk or search cache write |
| `scryfall.rateLimitState` | Optional persisted backoff state           |

## Routes / Screens

| Route               | Purpose                                                         |
| ------------------- | --------------------------------------------------------------- |
| `/cards`            | Global card search page                                         |
| `/cards/[cardId]`   | Card detail (desktop / deep link); mobile may use sheet instead |
| `/api/cards/search` | Optional GET proxy: `?q=`                                       |
| `/api/cards/[id]`   | Optional GET proxy for single card                              |

### Mobile UX

- `/cards` — sticky search input, virtualized result list.
- Tap result → `CardDetailSheet` (bottom sheet), not full navigation on mobile.
- Long-press → quick actions stub (wire fully in Phase 5: "Add to deck").

## File Structure (files to create/modify)

```text
lib/
  scryfall/
    client.ts
    normalize.ts
    types.ts
    endpoints.ts
    rate-limiter.ts
    index.ts
  db/
    repositories/
      card-repository.ts    # extend: searchLocal, bulkUpsert, getByOracleId
  hooks/
    use-card-search.ts
    use-card-detail.ts
    use-online-status.ts    # if not from Phase 2

types/
  card.ts                   # extend Card, CardFace

app/
  cards/
    page.tsx
    [cardId]/
      page.tsx
  api/
    cards/
      search/
        route.ts            # optional
      [id]/
        route.ts            # optional
  providers.tsx             # add QueryClientProvider

components/
  cards/
    card-search-input.tsx
    card-search-results.tsx
    card-result-row.tsx
    card-detail-sheet.tsx
    card-image.tsx
    card-metadata.tsx
    card-face-tabs.tsx      # DFC toggle
  shared/
    offline-search-banner.tsx
```

## Detailed Task List

### 4.1 — Scryfall types and endpoints

- [ ] Create `lib/scryfall/types.ts` with TypeScript interfaces mirroring Scryfall card object (at minimum: `id`, `oracle_id`, `name`, `mana_cost`, `cmc`, `type_line`, `oracle_text`, `colors`, `color_identity`, `keywords`, `set`, `set_name`, `collector_number`, `rarity`, `image_uris`, `card_faces`, `layout`, `scryfall_uri`, `purchase_uris`, `prices`).
- [ ] Create `lib/scryfall/endpoints.ts`:
  - [ ] `searchCardsUrl(q: string): string` → `/cards/search?q=...&unique=prints` or `unique=cards` (document choice: `unique=cards` for deduplicated oracle results in search; allow printing-specific via autocomplete).
  - [ ] `cardByIdUrl(id: string): string` → `/cards/{id}`
  - [ ] `cardsCollectionUrl(ids: string[]): string` → `/cards/collection` (POST body)
  - [ ] `autocompleteUrl(q: string): string` → `/cards/autocomplete?q=...`
- [ ] Export constants: `SCRYFALL_BASE = 'https://api.scryfall.com'`, `USER_AGENT = 'MTGDeckBuilder/1.0 (+https://your-domain.com)'`.

**Implementation note:** URL-encode all query parameters. Scryfall search syntax is documented at https://scryfall.com/docs/api/cards/search.

### 4.2 — Rate limiter

- [ ] Create `lib/scryfall/rate-limiter.ts` singleton.
- [ ] Implement `schedule<T>(fn: () => Promise<T>): Promise<T>` that enforces minimum interval between requests.
- [ ] Track in-flight count; reject or queue if concurrency > 1.
- [ ] Export `resetRateLimiter()` for tests.

### 4.3 — HTTP client with retry

- [ ] Create `lib/scryfall/client.ts`:
  - [ ] `scryfallFetch<T>(path: string, init?: RequestInit): Promise<T>`
  - [ ] Attach `Accept: application/json` and User-Agent.
  - [ ] Wrap all calls in rate limiter.
  - [ ] Handle non-OK responses:
    - [ ] 404 → throw `ScryfallNotFoundError`
    - [ ] 429 → backoff + retry (max 3)
    - [ ] 5xx → retry with exponential backoff
  - [ ] Parse Scryfall error body `{ object: 'error', code, details, status }`.
- [ ] Implement high-level methods:
  - [ ] `searchCards(query: string, options?: { page?: number }): Promise<ScryfallSearchResult>`
  - [ ] `getCardById(id: string): Promise<ScryfallCard>`
  - [ ] `getCardsByIds(ids: string[]): Promise<ScryfallCard[]>` (batch via collection endpoint, max 75 ids per Scryfall docs)
  - [ ] `autocomplete(query: string): Promise<string[]>`

### 4.4 — Normalization layer

- [ ] Create `lib/scryfall/normalize.ts`:
  - [ ] `normalizeScryfallCard(raw: ScryfallCard): Card`
  - [ ] Extract `manaValue` from `cmc` (handle missing → 0).
  - [ ] Map `purchase_uris.tcgplayer` → `tcgplayerUri`.
  - [ ] Handle `image_uris` vs `card_faces[0].image_uris`.
  - [ ] Build `faces[]` when `card_faces.length > 1`.
  - [ ] Set `updatedAt` to ISO timestamp of normalization time.
- [ ] Add unit tests for:
  - [ ] Normal single-face creature.
  - [ ] Transform DFC (e.g., `"//"` in name).
  - [ ] Modal DFC.
  - [ ] Adventure card.
  - [ ] Card with no image (placeholder handling).
  - [ ] Missing optional fields.

### 4.5 — Card repository extensions

- [ ] Add `CardRepository.bulkUpsert(cards: Card[]): Promise<void>` using Dexie `bulkPut`.
- [ ] Add `CardRepository.searchLocal(query: string, limit?: number): Promise<Card[]>` — simple case-insensitive name/oracleText substring match on indexed `name` field.
- [ ] Add `CardRepository.getByOracleId(oracleId: string): Promise<Card[]>` — returns all cached printings.
- [ ] Add `CardRepository.getStaleIds(olderThanDays: number): Promise<string[]>` for future refresh jobs.
- [ ] Ensure upsert does not wipe user-unrelated data (cards table is Scryfall-owned metadata only).

### 4.6 — TanStack Query setup

- [ ] Create `app/providers.tsx` with `QueryClientProvider` and sensible defaults:
  - [ ] `queries.retry: 1` for card queries (client already retries).
  - [ ] `queries.refetchOnWindowFocus: false` (mobile-friendly).
- [ ] Wrap root layout with providers.
- [ ] Create `lib/hooks/use-card-search.ts`:
  - [ ] Accept `query: string`, enabled when `query.length >= 2`.
  - [ ] `queryFn`: fetch Scryfall → normalize → bulkUpsert → return cards.
  - [ ] `placeholderData`: previous results while fetching.
  - [ ] Integrate offline detection: swap to local search when `!navigator.onLine`.
- [ ] Create `lib/hooks/use-card-detail.ts`:
  - [ ] `queryKey: ['cards', 'detail', id]`
  - [ ] `initialData` from Dexie if available.
  - [ ] Background refetch if stale.

### 4.7 — Optional API proxy routes

- [ ] Create `app/api/cards/search/route.ts` — forwards to Scryfall, returns JSON.
- [ ] Create `app/api/cards/[id]/route.ts` — single card proxy.
- [ ] Add same rate limiting on server (in-memory; sufficient for single user).
- [ ] Feature flag `USE_SCRYFALL_PROXY` in env to switch client base URL.

**Skip if** direct client access works in Safari iOS testing.

### 4.8 — Card search UI

- [ ] Create `components/cards/card-search-input.tsx`:
  - [ ] Debounced controlled input (300ms).
  - [ ] Clear button.
  - [ ] Loading spinner in trailing icon slot.
- [ ] Create `components/cards/card-result-row.tsx`:
  - [ ] Compact row: optional thumbnail, name, type line, mana value badge.
  - [ ] Neo Brutalism border/shadow styling.
  - [ ] Tap target ≥ 44px height.
- [ ] Create `components/cards/card-search-results.tsx`:
  - [ ] Empty state: "Type at least 2 characters".
  - [ ] No results state.
  - [ ] Offline banner when searching local cache only.
  - [ ] Virtualized list if > 50 results (`@tanstack/react-virtual` optional).
- [ ] Implement `app/cards/page.tsx`:
  - [ ] Page title "Search Cards".
  - [ ] Wire search hook + results.
  - [ ] On result tap → open detail sheet.

### 4.9 — Card detail sheet

- [ ] Create `components/cards/card-image.tsx`:
  - [ ] Lazy load with `loading="lazy"`.
  - [ ] Fallback placeholder (missing image).
  - [ ] Respect global image toggle from settings if available (stub OK).
- [ ] Create `components/cards/card-face-tabs.tsx` for multi-face cards.
- [ ] Create `components/cards/card-detail-sheet.tsx`:
  - [ ] shadcn Sheet sliding from bottom on mobile.
  - [ ] Display: image, name, mana cost, type line, oracle text, set, rarity, collector number.
  - [ ] External link: "View on Scryfall ↗".
  - [ ] Stub buttons: "Add to Deck", "Add to Wishlist" (disabled with tooltip "Coming in Phase 5").
- [ ] Create `app/cards/[cardId]/page.tsx` for direct links / desktop.

### 4.10 — Offline and error UX

- [ ] Create `components/shared/offline-search-banner.tsx`.
- [ ] Distinguish errors in UI:
  - [ ] Offline → "Searching cached cards only."
  - [ ] Rate limited → "Too many requests. Try again in a moment."
  - [ ] Not found → "Card not found."
- [ ] Never block UI on network failure if local cache has data.

### 4.11 — Navigation integration

- [ ] Ensure bottom nav "Cards" tab routes to `/cards`.
- [ ] Add keyboard shortcut `/` to focus search on desktop (optional).

### 4.12 — Testing and documentation

- [ ] Unit tests: normalize, rate limiter, endpoint builders.
- [ ] Integration test: search → upsert → read from Dexie.
- [ ] Manual test checklist (see below).
- [ ] Add `lib/scryfall/README.md` documenting oracleId vs printingId policy.

## Implementation Notes

### Search query UX

Start with simple name search: user types `"Lightning Bolt"`, pass as `q=lightning+bolt`. Later phases can add advanced syntax hints (`t:creature`, `c:ur`).

Use Scryfall autocomplete for typeahead suggestions (optional enhancement):

```ts
// Debounced autocomplete for search input dropdown
useQuery({ queryKey: ['cards', 'autocomplete', q], ... })
```

### unique=cards vs unique=prints

| Mode            | Behavior              | When to use                      |
| --------------- | --------------------- | -------------------------------- |
| `unique=cards`  | One result per oracle | Default search — less clutter    |
| `unique=prints` | Every printing        | When user picks specific art/set |

Default to `unique=cards` in search. Card detail can offer "Other printings" list via `getByOracleId` (future enhancement).

### Collection endpoint batching

When loading many deck cards (Phase 5+), batch ids in groups of 75:

```ts
async function getCardsByIdsBatched(ids: string[]): Promise<Card[]> {
  const chunks = chunk(ids, 75);
  const results = await Promise.all(chunks.map((c) => getCardsCollection(c)));
  return results.flat().map(normalizeScryfallCard);
}
```

Still respect rate limiter — run chunks sequentially, not parallel.

### Caching invalidation

Card metadata rarely changes. Refresh policy:

- On explicit user "Refresh card data" action (Settings, later).
- Auto-refresh if `updatedAt` > 30 days when card is viewed.

### Security

Scryfall requires no API key. Do not send user deck data to Scryfall. Search queries are card names only.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 4 matrix.

- [ ] Install **MSW**; `tests/mocks/scryfall-handlers.ts` with fixture cards
- [ ] **Unit tests:** `normalize-scryfall-card.test.ts` (DFC, split, adventure, missing image)
- [ ] **Unit tests:** rate limiter / queue (no burst > 10 req/s simulated)
- [ ] **Unit tests:** `oracleId` vs printing `id` mapping
- [ ] **Integration test:** search → upsert → `CardRepository.getById` (MSW, no live API)
- [ ] Never call `api.scryfall.com` in CI — MSW intercept required
- [ ] Add corrupt/empty search response fixtures

## Testing Checklist

### Unit tests

- [ ] `normalizeScryfallCard` — single face, DFC, adventure, missing images.
- [ ] Rate limiter enforces minimum delay.
- [ ] Client retries on 429 and 5xx.
- [ ] `searchLocal` finds cards by partial name.

### Integration tests

- [ ] Search "Sol Ring" → cards appear in UI → Dexie contains results.
- [ ] Reload page offline → search "Sol Ring" → local results appear.
- [ ] Fetch card by id → detail sheet shows correct metadata.
- [ ] DFC card shows face tabs and both oracle texts.

### Manual / device tests

- [ ] iPhone Safari: search responsive, bottom sheet opens smoothly.
- [ ] Airplane mode: offline banner visible, cached search works.
- [ ] Rapid typing does not exceed rate limit (no 429 storm).
- [ ] External Scryfall link opens in new tab.
- [ ] Cards with special characters (Æ, apostrophes) search correctly.

## Exit Criteria

- [ ] User can search for cards by name while online and see Scryfall results.
- [ ] Each fetched card is persisted to Dexie `cards` table with correct `oracleId` and printing `id`.
- [ ] Offline search returns previously cached cards.
- [ ] Double-faced cards render without broken images or missing oracle text.
- [ ] Rate limiting prevents sustained 429 errors during normal use.
- [ ] Card detail view shows metadata and Scryfall link.
- [ ] No React component calls Scryfall API directly — all via `lib/scryfall/`.
- [ ] TanStack Query devtools show correct cache keys (optional dev tooling).

## Risks & Mitigations

| Risk                                      | Impact                               | Mitigation                                          |
| ----------------------------------------- | ------------------------------------ | --------------------------------------------------- |
| Scryfall rate limiting / 429              | Search fails intermittently          | Client-side queue, backoff, debounced search        |
| DFC layout variations                     | Broken UI                            | Comprehensive normalize tests; face tabs component  |
| Large search result sets                  | Scroll jank on mobile                | Virtualize list; paginate Scryfall results          |
| IndexedDB quota                           | Cache growth                         | Only cache searched/viewed cards, not bulk download |
| CORS issues on some networks              | Search blocked                       | Optional API proxy route                            |
| Stale cached metadata                     | Wrong oracle text                    | Timestamp display; manual refresh in later phase    |
| Confusion between oracle and printing ids | Wrong duplicate detection in Phase 5 | Document clearly; naming conventions in code review |

## Out of Scope (defer to later phases)

- Deck card add/remove (Phase 5).
- Pricing display (Phase 8) — may show Scryfall `prices.usd` as read-only stub without formatting rules.
- Global `/cards` integration with deck builder context menu.
- Bulk Scryfall data download (daily bulk file).
- Printing picker / art preference UI.
- Advanced search filters (color, type, CMC) — basic syntax OK, dedicated filter UI is later.
- Wishlist add from card detail (Phase 12).
- Prefetch all deck images (Phase 9).
- Moxfield/Archidekt import parsing (Phase 10).

## Handoff to Next Phase

**Phase 5 (Deck Management)** will consume:

- `CardRepository.getById()`, `bulkUpsert()`, `getByOracleId()`
- `use-card-search`, `use-card-detail` hooks
- `CardDetailSheet` with "Add to Deck" wired to deck service
- `getCardsByIdsBatched()` for loading deck card lists
- Established `Card.id` = printing id convention for `DeckCard.cardId`

Ensure before handoff:

1. Sample cards cached in Dexie for offline dev/testing (e.g., import 20 Commander staples via search).
2. `Card` type is stable — Phase 5 should not require schema migration.
3. Document in code comments: **always resolve deck card → Card via printing id; use oracleId for identity checks.**

---

_Reference: [Scryfall API](https://scryfall.com/docs/api) · Parent plan: `plans/mtg-deck-builder-web-app-build-plan.md`_
