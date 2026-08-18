# Phase 08 — Pricing

## Agent Handoff Prompt

```
You are implementing Phase 8 (Pricing) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first: plans/mtg-deck-builder-web-app-build-plan.md (sections 23, 14, 34, 38, 43)
Prior phases assumed complete: Dexie schema, Scryfall card cache, deck CRUD, dashboard stats, ADD/CUT/CONSIDER workflow.

Deliverables:
1. PricingProvider interface + ScryfallPricingProvider as first implementation
2. CardPrice snapshots persisted in Dexie cardPrices table
3. PricingService with refresh, batch fetch, staleness checks
4. Deck valuation (current deck value) and upgrade cost (ADD cards, optionally net of CUT)
5. CardPrice UI component with source, timestamp, fallback when unavailable
6. TCGplayer outbound links (never scrape; use stored tcgplayerUri from Scryfall)
7. NEVER display $0.00 when a price fetch fails — show "Price unavailable" + last known if cached
8. Wire prices into Need-to-Add screen, deck dashboard, card rows, card detail sheet
9. Unit tests for valuation math and fallback behavior

Constraints:
- Local-first: prices are cached snapshots, not live-only
- Provider-agnostic: UI reads CardPrice records, not Scryfall directly
- Mobile-first Neo Brutalism theme
- Respect Scryfall rate limits (batch via /cards/collection where possible)

Exit: Need-to-Add shows accurate totals with timestamps; failed fetches never show misleading $0.
```

## Overview

Phase 8 introduces a **provider-agnostic pricing layer** that caches price snapshots locally and surfaces transparent deck valuations and upgrade costs throughout the app. Scryfall reference prices serve as the first provider because they require no authenticated API key and are already integrated for card metadata. TCGplayer remains an **outbound purchase link**, not a pricing dependency.

This phase transforms placeholder upgrade-cost UI from Phase 7 into real, timestamped financial summaries users can trust — or clearly see when data is stale or unavailable.

## Goal

Enable users to:

- See per-card prices with source and freshness (`Updated 3h ago`)
- View estimated **current deck value** on the deck dashboard
- View **upgrade cost** for cards marked `ADD` on the Need-to-Add screen
- Open **TCGplayer product pages** per card in an external browser tab
- Continue using the app offline with **last-known cached prices**
- Never be misled by `$0.00` when pricing fails

## Prerequisites

- Phase 3 complete: Dexie `cardPrices` table exists in schema
- Phase 4 complete: Scryfall client, card normalization, `tcgplayerUri` stored on `Card`
- Phase 5 complete: deck cards with quantity, foil flag, status
- Phase 6 complete: dashboard metrics placeholders for deck value
- Phase 7 complete: Need-to-Add screen, upgrade summary bar, projected deck
- `Card` records include `oracleId` and printing-specific `id` (Scryfall UUID)

## Dependencies on Previous Phases

| Prior Phase | Dependency                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------ |
| Phase 3     | `cardPrices` Dexie table, repository pattern, migrations                                   |
| Phase 4     | Scryfall card objects include `prices` object (USD/EUR/TIX), `tcgplayer_id`, purchase URIs |
| Phase 5     | `DeckCard.quantity`, `DeckCard.foil`, `DeckCard.status`                                    |
| Phase 6     | Dashboard widgets expecting `estimatedValue`, `projectedValue`                             |
| Phase 7     | Need-to-Add list, upgrade summary (`Cards to add`, `Estimated cost`)                       |

Phase 7 may have stubbed upgrade cost with `"—"` or `0`; Phase 8 replaces all stubs with real pricing service calls.

## Duration Estimate

**3–5 days** for a single developer, including tests and iPhone verification of external links.

| Sub-task                          | Estimate  |
| --------------------------------- | --------- |
| Types + PricingProvider interface | 0.5 day   |
| ScryfallPricingProvider           | 1 day     |
| PricingService + repository       | 1 day     |
| Valuation + upgrade calculators   | 0.5 day   |
| UI components + wiring            | 1 day     |
| Tests + polish                    | 0.5–1 day |

## Architecture & Key Decisions

### Layering

```text
UI (CardPrice, deck dashboard, Need-to-Add)
        ↓
PricingService (orchestration, staleness, batch refresh)
        ↓
PricingProvider (interface) ← ScryfallPricingProvider (v1)
        ↓
CardPriceRepository → Dexie cardPrices
        ↓
CardRepository (for tcgplayerUri, foil context)
```

### PricingProvider interface

Define in `lib/pricing/types.ts`:

```ts
export interface CardIdentity {
  cardId: string; // Scryfall UUID for this printing
  oracleId?: string; // For future oracle-level pricing
  name: string;
  foil?: boolean;
}

export interface CardPriceSnapshot {
  cardId: string;
  currency: "USD" | "EUR"; // MVP: user-selectable in settings (default USD)
  low?: number; // Scryfall: prices.usd / prices.eur (treated as market ref)
  market?: number; // Same or derived; document chosen field
  normal?: number; // Non-foil price
  foil?: number; // Foil price
  source: string; // e.g. 'scryfall'
  fetchedAt: string; // ISO 8601
  isStale?: boolean; // Computed, not persisted
}

export interface PricingProvider {
  readonly id: string; // 'scryfall'
  readonly displayName: string;

  /** Fetch fresh price for one card. Returns null if unavailable (NOT zero). */
  getPrice(identity: CardIdentity): Promise<CardPriceSnapshot | null>;

  /** Batch fetch for deck refresh. Provider may chunk internally. */
  getPrices(
    identities: CardIdentity[],
  ): Promise<Map<string, CardPriceSnapshot>>;
}
```

**Decision:** Persist `CardPrice` (Dexie) separately from `CardPriceSnapshot` (runtime). Map snapshot → DB record on save. Primary key: `cardId` (one snapshot per printing per currency — extend with composite key if multi-currency rows needed).

### Scryfall as first provider

Scryfall card objects include:

```json
"prices": {
  "usd": "0.25",
  "usd_foil": "1.50",
  "usd_etched": null,
  "eur": "0.20",
  "eur_foil": "1.10",
  "tix": "0.03"
}
```

**Mapping rules:**

| Field    | Scryfall source                        | Notes                                                       |
| -------- | -------------------------------------- | ----------------------------------------------------------- |
| `normal` | `prices.usd` or `prices.eur`           | Parse string → number; `null` → undefined                   |
| `foil`   | `prices.usd_foil` or `prices.eur_foil` |                                                             |
| `low`    | Same as `normal` for MVP               | Scryfall doesn't expose TCGplayer low; label honestly in UI |
| `market` | Same as `normal` for MVP               | Future providers can differentiate                          |
| `source` | `'scryfall'`                           | Always show provider name                                   |

**Batch strategy:** Use Scryfall `POST /cards/collection` with `{ identifiers: [{ id }] }` — max 75 per request. Queue with existing Scryfall throttle (10 req/s, respect 429 Retry-After).

**Decision:** Do NOT add a Vercel server route for Scryfall prices in MVP — Scryfall allows client-side requests with proper User-Agent. Revisit if CORS or rate-limit issues arise on production domain.

### Price selection for deck cards

When calculating line item cost:

```ts
function selectUnitPrice(
  price: CardPrice,
  deckCard: DeckCard,
): number | undefined {
  if (deckCard.foil && price.foil != null) return price.foil;
  if (price.normal != null) return price.normal;
  if (price.market != null) return price.market;
  if (price.low != null) return price.low;
  return undefined; // NOT 0
}
```

### Staleness policy

- Default TTL: **24 hours** (configurable in settings later; hardcode constant for MVP)
- `isStale = Date.now() - fetchedAt > TTL`
- UI shows relative time always; add `(stale)` badge if beyond TTL
- Offline: always use cache regardless of staleness; show "Last known price"

### Never show $0 on failure

| Scenario                       | UI behavior                                                       |
| ------------------------------ | ----------------------------------------------------------------- |
| No cache, fetch failed         | `"Price unavailable"`                                             |
| Cache exists, fetch failed     | `"Price unavailable"` + `"Last known: $X.XX · 2d ago"`            |
| Scryfall returns `null` price  | Treat as unavailable, not zero                                    |
| Price is legitimately `"0.01"` | Show `$0.01` — distinguish from missing via `undefined` vs number |

**Implementation guard:**

```ts
function formatPrice(amount: number | undefined | null): string {
  if (amount == null || Number.isNaN(amount)) return "Price unavailable";
  return formatCurrency(amount);
}
```

Never coerce `null` → `0`.

### Deck valuation formulas

**Current deck value** (cards with `status === 'current'` + commander):

```text
sum(selectUnitPrice(price, deckCard) * deckCard.quantity)
  for all deckCards where status in ['current'] and zone !== 'maybeboard' (configurable)
```

**Upgrade cost** (Need-to-Add):

```text
sum(selectUnitPrice(price, deckCard) * deckCard.quantity)
  for all deckCards where status === 'add'
```

**Optional CUT credit** (display only, dashboard):

```text
cutValue = sum(...) for status === 'cut'
netUpgradeCost = addCost - cutValue  // label clearly as "Net est. upgrade"
```

Cards without price data are **excluded from totals** but counted in summary:

```text
Estimated cost: $37.42 (6 of 8 priced)
```

### TCGplayer links

- Use `Card.tcgplayerUri` from Scryfall (`purchase_uris.tcgplayer` or constructed from `tcgplayer_id`)
- Render as external link button: `[View on TCGplayer ↗]`
- `target="_blank"` + `rel="noopener noreferrer"`
- If URI missing: hide button or show disabled state with tooltip — never block card row
- **Never** scrape TCGplayer in browser

### Currency

- MVP: single currency from app setting `pricing.currency` (`USD` | `EUR`)
- All snapshots stored with explicit `currency` field
- Changing currency triggers re-fetch (don't convert)

## Data Model Impact

### CardPrice (Dexie — already defined, finalize)

```ts
interface CardPrice {
  cardId: string; // PK — Scryfall printing UUID
  currency: string; // 'USD' | 'EUR'
  low?: number;
  market?: number;
  normal?: number;
  foil?: number;
  source: string; // 'scryfall'
  fetchedAt: string; // ISO 8601
}
```

### App settings additions

```ts
// settings table keys
'pricing.currency'        → 'USD' | 'EUR'  (default 'USD')
'pricing.preferredField'  → 'normal' | 'low' | 'market'  (default 'normal')
'pricing.staleAfterHours' → number  (default 24)
```

### Optional: price refresh queue (in-memory)

No new Dexie table. Use TanStack Query cache + in-flight dedup for refresh operations.

## Routes / Screens

No new routes. Enhance existing surfaces:

| Route / Component               | Pricing additions                                                              |
| ------------------------------- | ------------------------------------------------------------------------------ |
| `/decks/[deckId]`               | Current value, upgrade cost, "Refresh prices" action                           |
| `/decks/[deckId]/changes`       | Need-to-Add price columns, summary bar totals                                  |
| `/decks/[deckId]/cards`         | Price column (comfortable/image modes), sort by price                          |
| Card detail sheet               | Price summary block, TCGplayer link, refresh button                            |
| `/settings` or `/settings/data` | Currency preference (optional this phase; can defer to Phase 10 settings page) |

## File Structure (files to create/modify)

### Create

```text
lib/pricing/
  types.ts                      # CardIdentity, CardPriceSnapshot, PricingProvider
  providers/
    scryfall-pricing-provider.ts
    index.ts                    # getActiveProvider()
  pricing-service.ts            # orchestration
  valuation.ts                  # deck value, upgrade cost, net calc
  format-price.ts               # formatCurrency, formatRelativeTime, formatPrice
  constants.ts                  # STALE_HOURS, PROVIDER_IDS

lib/db/repositories/
  card-price-repository.ts      # getByCardId, upsert, getByCardIds, deleteOlderThan

components/cards/
  card-price.tsx                # displays price + staleness + unavailable state
  tcgplayer-link.tsx            # external link button

hooks/
  use-card-price.ts             # TanStack Query wrapper
  use-deck-valuation.ts         # computed totals for a deck
  use-refresh-prices.ts         # mutation for deck-wide refresh

tests/
  lib/pricing/valuation.test.ts
  lib/pricing/format-price.test.ts
  lib/pricing/scryfall-pricing-provider.test.ts
```

### Modify

```text
lib/db/schema.ts                # ensure cardPrices indexes: cardId, fetchedAt
lib/db/database.ts              # cardPrices table wiring
lib/scryfall/client.ts          # expose getCardsCollection(ids) if not present
components/deck/deck-header.tsx # value metrics
components/changes/change-summary.tsx
components/changes/change-list.tsx
components/deck/deck-card-row.tsx
components/cards/card-detail-sheet.tsx
app/decks/[deckId]/page.tsx
app/decks/[deckId]/changes/page.tsx
types/card.ts                   # align CardPrice export
```

## Detailed Task List

### 8.1 — Types & Interface

- [ ] Create `lib/pricing/types.ts` with `CardIdentity`, `CardPriceSnapshot`, `PricingProvider`
- [ ] Export `PricingProviderError` class with codes: `UNAVAILABLE`, `RATE_LIMITED`, `NETWORK`, `PARSE_ERROR`
- [ ] Define `PriceDisplayState`: `'available' | 'unavailable' | 'cached_fallback' | 'loading'`
- [ ] Add JSDoc explaining null vs zero semantics

### 8.2 — Scryfall Pricing Provider

- [ ] Create `ScryfallPricingProvider` implementing `PricingProvider`
- [ ] Implement `getPrice()` via Scryfall `GET /cards/{id}` or local card cache if prices embedded
- [ ] Implement `getPrices()` via `POST /cards/collection` with 75-id chunking
- [ ] Parse price strings safely: `parsePrice("0.25") → 0.25`, `parsePrice(null) → undefined`
- [ ] Map USD vs EUR based on settings/currency param
- [ ] Handle double-faced cards: price on `card.face_index === 0` or root object
- [ ] Respect Scryfall User-Agent requirement
- [ ] Integrate with existing rate limiter from Phase 4
- [ ] Unit test: null prices, foil prices, missing card, batch chunking

### 8.3 — Card Price Repository

- [ ] Create `CardPriceRepository` with methods:
  - [ ] `getByCardId(cardId: string): Promise<CardPrice | undefined>`
  - [ ] `getByCardIds(cardIds: string[]): Promise<Map<string, CardPrice>>`
  - [ ] `upsert(price: CardPrice): Promise<void>`
  - [ ] `upsertMany(prices: CardPrice[]): Promise<void>`
- [ ] Add Dexie index on `fetchedAt` for optional cleanup job
- [ ] Migration: ensure `cardPrices` table version matches schema

### 8.4 — Pricing Service

- [ ] Create `PricingService` class:
  - [ ] `getCachedPrice(cardId): Promise<CardPrice | undefined>`
  - [ ] `getPrice(cardId, { refresh?: boolean }): Promise<CardPriceSnapshot | null>`
  - [ ] `getPricesForDeck(deckId, { refresh?: boolean }): Promise<Map<string, CardPriceSnapshot>>`
  - [ ] `refreshDeckPrices(deckId): Promise<RefreshResult>` with `{ refreshed, failed, skipped }`
- [ ] On successful fetch: upsert to Dexie before returning
- [ ] On fetch failure: return cached snapshot with `isStale: true` flag (don't throw to UI)
- [ ] Deduplicate concurrent requests for same cardId (in-flight map)
- [ ] Log failures to console in dev; no Sentry required for MVP

### 8.5 — Valuation Calculators

- [ ] Create `lib/pricing/valuation.ts`:
  - [ ] `calculateDeckValue(deckCards, prices, options): ValuationResult`
  - [ ] `calculateUpgradeCost(deckCards, prices, options): ValuationResult`
  - [ ] `calculateCutValue(deckCards, prices): ValuationResult`
  - [ ] `calculateNetUpgrade(add, cut): { net: number | undefined, pricedAddCount, totalAddCount }`
- [ ] `ValuationResult` includes: `total`, `pricedCount`, `totalCount`, `unpricedCardIds[]`
- [ ] Filter by status and zone per product rules
- [ ] Unit tests: multi-qty, foil vs non-foil, partial pricing, all unpriced → total undefined not 0

### 8.6 — Formatting Utilities

- [ ] Create `formatCurrency(amount, currency)` using `Intl.NumberFormat`
- [ ] Create `formatRelativeTime(isoDate)` → "3h ago", "Yesterday"
- [ ] Create `formatPriceWithMeta(price)` → "$0.25 · Scryfall · 3h ago"
- [ ] Create `formatPriceUnavailable(lastKnown?)` composite string
- [ ] Unit tests for edge cases

### 8.7 — UI: CardPrice Component

- [ ] Create `components/cards/card-price.tsx`
- [ ] Props: `cardId`, `foil?`, `variant?: 'inline' | 'stacked'`, `showSource?`, `showTimestamp?`
- [ ] States: loading skeleton, available, unavailable, cached fallback
- [ ] Never render `$0.00` unless actual price is zero
- [ ] Include `(stale)` indicator when beyond TTL
- [ ] Neo Brutalism: monospace price, bold label

### 8.8 — UI: TCGplayer Link

- [ ] Create `components/cards/tcgplayer-link.tsx`
- [ ] Accept `tcgplayerUri?: string`, `cardName` for aria-label
- [ ] Hide when URI absent
- [ ] Icon + "TCGplayer ↗" label
- [ ] Touch target ≥ 44px height on mobile

### 8.9 — Hooks

- [ ] `useCardPrice(cardId, foil)` — TanStack Query, staleTime from settings
- [ ] `useDeckValuation(deckId)` — derives from deck cards + cached prices
- [ ] `useRefreshPrices(deckId)` — mutation with loading toast

### 8.10 — Wire Need-to-Add Screen

- [ ] Add columns: Unit price, Total, TCGplayer link
- [ ] Summary bar: `Cards to add: N`, `Quantity: Q`, `Estimated cost: $X.XX`
- [ ] Show `(N of M priced)` when partial
- [ ] Show `Prices updated: {mostRecentFetchedAt}` across priced cards
- [ ] Pull-to-refresh or "Refresh prices" button
- [ ] Sort by price column (Phase 11 list infra may exist from Phase 5)

### 8.11 — Wire Deck Dashboard

- [ ] Replace stub `estimatedValue` with `useDeckValuation`
- [ ] Show `Upgrade cost` for ADD cards
- [ ] Optional: `Net upgrade` line (add − cut)
- [ ] Deck list cards on `/decks`: show estimated value per deck

### 8.12 — Wire Card Rows & Detail

- [ ] Add price to `deck-card-row` in comfortable mode
- [ ] Add price block to `card-detail-sheet`
- [ ] Sort/filter by price on deck cards page (filter: price range min/max)

### 8.13 — Refresh UX

- [ ] Deck dashboard action: "Refresh prices"
- [ ] Show progress: "Refreshing 34/100..."
- [ ] Completion toast: "Updated 34 prices, 2 unavailable"
- [ ] Disable button while in-flight

### 8.14 — Offline Behavior

- [ ] When offline: skip fetch, use cache only
- [ ] Show offline badge near price: "Offline · cached price"
- [ ] Refresh button disabled with explanation

### 8.15 — Settings (minimal)

- [ ] Add currency toggle USD/EUR in settings (or defer full UI to Phase 10)
- [ ] Persist to Dexie settings table
- [ ] Changing currency does not auto-convert old snapshots

## Implementation Notes

### Scryfall price fetch optimization

Prefer reading prices from already-cached `Card` records when `updatedAt` is recent and Scryfall response included prices during card import. Only hit pricing API when:

1. No `CardPrice` row exists
2. User explicitly refreshes
3. Snapshot is stale AND device is online

### TanStack Query keys

```ts
["price", cardId, currency][("deck-valuation", deckId, currency)][
  ("deck-prices", deckId, currency)
];
```

### Error boundaries

Pricing failures must not crash deck views. Wrap `CardPrice` in error boundary that renders "Price unavailable".

### Accessibility

- Price unavailable must be text, not empty cell
- TCGplayer link: `aria-label="View {cardName} on TCGplayer (opens in new tab)"`
- Don't convey price freshness by color alone — include text

### Performance

- Batch-fetch prices when opening Need-to-Add (not N sequential requests)
- Memoize valuation per deck revision (`deck.updatedAt` + price cache hash)
- Don't refetch all deck prices on every card row render

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 8 matrix.

- [ ] **Unit tests:** price fallback — null/undefined never renders as `$0.00`
- [ ] **Unit tests:** deck valuation sum, upgrade cost sum, mixed available/unavailable prices
- [ ] **Unit tests:** staleness timestamp formatting
- [ ] **Integration tests:** price snapshot write/read from Dexie `cardPrices`
- [ ] MSW mock for pricing API; no live price calls in CI
- [ ] **TestCafe:** Need-to-Add screen shows cost with timestamp (mocked prices)

## Testing Checklist

### Unit tests

- [ ] `parsePrice(null)` → `undefined`
- [ ] `parsePrice("0.00")` → `0` (valid zero)
- [ ] `selectUnitPrice` prefers foil when `deckCard.foil`
- [ ] `calculateUpgradeCost` excludes unpriced cards from total
- [ ] `calculateUpgradeCost` with zero priced cards → `total: undefined`
- [ ] `formatPrice(undefined)` → `"Price unavailable"`
- [ ] Batch chunking splits 150 ids into 2 requests

### Integration tests

- [ ] Fetch price → persists to Dexie → second read from cache
- [ ] Failed fetch → returns cached price with fallback state
- [ ] Failed fetch, no cache → UI shows unavailable, not $0
- [ ] Refresh deck prices updates all ADD card rows

### Manual / iPhone

- [ ] Need-to-Add totals match manual spreadsheet calculation
- [ ] TCGplayer link opens Safari correctly from standalone PWA
- [ ] Prices display in airplane mode (cached)
- [ ] Timestamp updates after refresh
- [ ] Foil deck card shows foil price when available

## Exit Criteria

- [ ] `PricingProvider` interface exists with `ScryfallPricingProvider` implementation
- [ ] `CardPrice` snapshots persist in Dexie with `fetchedAt` and `source`
- [ ] Deck dashboard shows current deck value (with partial pricing caveat when applicable)
- [ ] Need-to-Add screen shows upgrade cost total with timestamp
- [ ] Per-card TCGplayer links work externally
- [ ] **No code path displays `$0.00` when price is missing or fetch failed**
- [ ] Offline mode shows last-known prices with clear labeling
- [ ] Unit tests pass for valuation and format helpers
- [ ] Provider name visible in price UI ("Scryfall")

## Risks & Mitigations

| Risk                                             | Mitigation                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------ |
| Scryfall prices are reference, not TCGplayer low | Label source honestly; link to TCGplayer for purchase                    |
| Rate limiting on large deck refresh              | Batch collection endpoint; throttle; refresh on demand not on every view |
| Stale prices mislead users                       | Always show timestamp; stale badge after 24h                             |
| `$0` vs unavailable confusion                    | Strict `undefined` handling; code review checklist                       |
| Multi-currency mixed snapshots                   | Store currency on each snapshot; filter by active setting                |
| Foil price missing                               | Fall back to normal with "(foil price unavailable)" note                 |

## Out of Scope

- TCGplayer authenticated API integration
- Cardmarket / MTGGoldfish providers
- Price history charts
- Wishlist price alerts
- User-entered custom prices
- Server-side price proxy (unless CORS blocks production)
- Automatic background price sync on app launch
- Tax/shipping in upgrade cost

## Handoff to Next Phase

**Phase 9 (Images & Display Modes)** will add `CardImage` and density modes. Pricing columns in card rows must respect density:

- **Compact:** hide price column or show abbreviated `€X`
- **Comfortable:** full price + timestamp
- **Image:** price below card name

Ensure `deck-card-row` accepts a `density` prop so Phase 9 can toggle layouts without rewriting pricing logic. Export `useDeckValuation` for dashboard widgets that Phase 9 may reposition.

Deliverables for handoff:

- `PricingService` singleton accessible from services layer
- `CardPrice` component ready for reuse in all list densities
- Document chosen price field (`normal` vs `low`) in `lib/pricing/README.md` (optional one-pager)
