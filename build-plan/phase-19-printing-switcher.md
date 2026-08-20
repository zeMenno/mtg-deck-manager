# Phase 19 — Printing Switcher & Cheapest Print

> **Status: Implemented** (2026-08-20). Shipped in-repo as **v1.2.0**.

## Agent Handoff Prompt

```
You are implementing Phase 19 (Printing Switcher & Cheapest Print) of the
MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-19-printing-switcher.md (this document — follow every section)
- build-plan/README.md (phase order; Phase 18 is the visual system)
- build-plan/phase-18-solar-dusk-theme.md (Solar Dusk tokens and primitives)
- build-plan/phase-04-scryfall-integration.md (client, unique=prints, rate limit)
- build-plan/phase-08-pricing.md (currency, never treat missing price as $0)
- docs/data-model.md (Card.id = printing, Card.oracleId = identity)
- docs/decisions.md (ADR-003, ADR-005, ADR-023, ADR-024)

Prerequisites: Phases 0–18 complete. This is a post-launch feature phase.

Goal:
1. Let the user switch a deck card (and optionally a wishlist item) to another
   printing of the same oracle card, preserving quantity, status, zone, roles,
   synergies, notes, owned, foil, and replacement links.
2. Offer "use cheapest paper printing" for one card and as a preview-then-apply
   bulk action on a deck.
3. Fetch printings through the existing Scryfall client (unique=prints), cache
   chosen printings in Dexie, and refresh prices for the newly selected ids.

Constraints:
- Follow Solar Dusk (Phase 18). Do not reintroduce Neo Brutalism.
- Do not invent a second identity model. DeckCard.cardId remains a printing id.
- Never treat a missing Scryfall price as $0.00.
- Honour existing 75ms rate limiting; bulk cheapest must show progress and be
  cancellable.
- Default cheapest query is English paper, matching the user's foil flag and
  currency. Do not silently include digital, oversized, or foreign printings.
- Skip owned cards in bulk cheapest unless the user opts in.
- Add tests with the feature. CI must stay green.

When done, verify every Exit Criteria item and confirm CI is green.
```

## Overview

The data model already treats `Card.id` as a **specific printing** (ADR-003). Search currently returns Scryfall's rolled-up `unique=cards` result, so a deck's Sol Ring is whatever default printing Scryfall chose the day it was added. Prices, art, set codes, and shop links then sit on that printing even when a $0.50 reprint exists.

This phase is **not** deck version snapshots (Phase 11). It is oracle-identity-preserving printing swaps.

It is also **not** "make the deck as cheap as possible in the real world." Scryfall USD/EUR are reference prices. Serialized, gold-bordered, non-English, and damaged copies exist; we only optimize among **filtered paper printings with a known price**.

## Goal

Enable the user to:

- Open a printing picker from a deck card (and card detail when the card is in a deck).
- See set, collector number, rarity, foil/nonfoil prices, and a thumbnail.
- Switch the `DeckCard.cardId` without losing tags, status, or notes.
- Apply **cheapest English paper printing** to one card or, after a preview, to a whole deck (or the shopping-list subset).
- Keep deck totals and TCGplayer links pointing at the selected printing.

## Prerequisites

- Phase 4 — Scryfall client, `searchCardsUrl(..., { unique: "prints" })`, normalize, Dexie `cards`.
- Phase 5 — `DeckService` uniqueness is `(deckId, cardId, zone, status)`.
- Phase 8 — `CardPrice` keyed by printing; currency setting.
- Phase 12 — wishlist also keys on printing (optional switch; deck is required).
- Phase 18 — Solar Dusk UI.

## Dependencies on Previous Phases

| Phase | Dependency |
| ----- | ---------- |
| 4 | Prints search, named lookup, collection endpoint, 75ms limiter |
| 5 | `DeckCard.cardId` swap must go through the service, not Dexie in UI |
| 8 | Price refresh after swap; currency `USD` / `EUR` |
| 9 | Thumbnails in the picker follow `imagesEnabled` |
| 12 | Optional wishlist printing swap uses the same helper |
| 18 | Bottom sheet, tokens, 44px targets |

## Duration Estimate

**3–4 days** for a single developer.

| Sub-task | Estimate |
| -------- | -------- |
| Prints fetch + cheapest selector (pure) | 1 day |
| `switchPrinting` service + merge rules | 0.75 day |
| Picker UI + card-detail / row entry | 1 day |
| Bulk cheapest preview | 0.75 day |
| Tests | 0.5 day |

## Architecture & Key Decisions

### Identity

Keep ADR-003. Switching a printing is:

1. Fetch/normalize the target Scryfall printing → upsert `cards`.
2. Fetch/upsert `cardPrices` for that printing.
3. Update `DeckCard.cardId` (and `updatedAt`).
4. If another row already has `(deckId, newCardId, zone, status)`, **merge quantities** onto that row and delete the source row, copying tags/notes only when the survivor has empty arrays / empty notes. Do not silently drop CUT/ADD replacement links: retarget `replacesDeckCardId` if the deleted row was the CUT target.

Do **not** create a second Sol Ring row when the user is switching printings. Duplicate-oracle warnings remain for *adding* a new card, not for this swap.

### Fetching printings

Preferred query (paginate until `has_more` is false):

```text
GET /cards/search
  q      = oracleid:{oracleId} game:paper lang:en -is:oversized
  unique = prints
  order  = usd   # or eur when settings.currency === "EUR"
  dir    = asc
```

Use `card.prints_search_uri` only after applying the same extra filters; do not dump every language and digital product into the picker by default.

**Default filters (locked unless a later ADR):**

| Include | Exclude by default |
| ------- | ------------------ |
| Paper (`game:paper`) | Arena / MTGO-only (`-is:digital` is not enough; prefer `game:paper`) |
| English (`lang:en`) | Other languages |
| Normal and showcase/borderless paper | Oversized (`-is:oversized`) |

**Optional toggles in the picker (not on by default):** "Any language", "Include extras/promos" (`include_extras`).

### What "cheapest" means

For **one card**:

1. Take the filtered print list.
2. Read the price that matches the deck card's foil flag:
   - `foil !== true` → `prices.usd` or `prices.eur`
   - `foil === true` → `prices.usd_foil` (fallback `usd_etched`) or EUR equivalents
3. Ignore printings whose chosen price field is null/empty. **Never** rank them as $0.
4. Choose the minimum. Ties: prefer the currently selected printing; then earlier `released_at`; then lexicographic `set` + `collector_number`.
5. If the current printing is already cheapest, no-op.

For **bulk**:

- Scope options: entire deck (non-cut), **Need to add** (`status === "add"`) as the recommended default, or current + add.
- **Skip `owned === true`** unless "Include owned" is checked. Owned means "I already have *this* copy"; swapping it for a cheaper printing is usually wrong.
- Always show a preview: card name, from set/# / price, to set/# / price, delta. Apply is a second tap.
- Respect rate limits. Estimate: ~1 request per unique `oracleId` plus pagination for high-reprint staples. Show `N / M` and allow cancel (already-applied rows stay; do not roll back on cancel unless the user asks — document that).
- Cap concurrent work at 1 Scryfall request (existing limiter). Do not fire 99 parallel searches.

### Where the UI lives

1. **Deck card overflow / row action** — "Change printing" (required).
2. **Card detail sheet** when opened from a deck card — a Printings control on Overview or Price (required). Passing only a `Card` without a `DeckCard.id` can still *browse* printings but must not mutate a deck.
3. **Deck dashboard** — "Cheapest printings…" opens the bulk preview sheet (required).
4. **Wishlist item** — same picker (should-have). If skipped, document in Out of Scope leftover.

Picker is a **bottom sheet** on mobile: sticky current printing at top, list sorted by price, filter chips, "Use cheapest" button.

### Offline

If `navigator.onLine === false`, picker uses locally cached printings for that `oracleId` (any `cards` rows already stored). If fewer than two printings are cached, show "Connect to load other printings" rather than a fake singleton list.

### Settings

No new Dexie table required. Optional setting keys (document in `docs/data-model.md`):

| Key | Type | Default |
| --- | ---- | ------- |
| `printingPicker.includeOwnedInBulkCheapest` | `boolean` | `false` |
| `printingPicker.anyLanguage` | `boolean` | `false` |

These can also live as ephemeral sheet checkboxes for v1.2.0. Prefer **not** persisting "any language" globally so a one-off search cannot poison later bulk cheapest.

## File Structure

Create / modify:

```text
lib/scryfall/prints.ts              — listPrintings(oracleId, filters)
lib/pricing/cheapest-printing.ts    — pickCheapest(printings, foil, currency)
lib/deck/switch-printing.ts         — service-level swap + merge
lib/deck/bulk-cheapest.ts           — plan + apply with progress
lib/hooks/use-card-printings.ts     — TanStack Query wrapper
components/cards/printing-picker-sheet.tsx
components/deck/bulk-cheapest-sheet.tsx
components/cards/card-detail-sheet.tsx          — wire picker when deckCardId present
components/deck/deck-card-list.tsx (or row)     — action
app/decks/[deckId]/... dashboard actions        — bulk cheapest
tests/unit/pricing/cheapest-printing.test.ts
tests/unit/deck/switch-printing.test.ts
tests/unit/scryfall/prints.test.ts
tests/integration/switch-printing.test.ts
```

Reuse `lib/scryfall/client.ts` pagination. Do not call Scryfall from components.

## Detailed Task List

- [x] Document ADR-024 in decisions if this phase lands it; do not contradict ADR-003.
- [x] Add `listPrintings` with pagination, filters, and MSW fixtures (include a card with 2+ pages).
- [x] Add `pickCheapest` unit tests: null prices skipped, foil vs nonfoil, EUR vs USD, tie-break.
- [x] Implement `DeckService.switchPrinting({ deckCardId, newCardId })` with merge + replacement retarget.
- [x] Upsert card + price inside the switch path.
- [x] Printing picker sheet: 44px rows, set code, collector #, price, current badge.
- [x] Wire deck row + card detail (deck context).
- [x] Bulk cheapest: default scope ADD, skip owned, preview deltas, apply, progress, cancel.
- [x] Recalculate deck cost after apply (existing pricing service).
- [x] Offline component test switches a fixture printing and asserts set code / price; TestCafe smoke covers the dashboard entry without live Scryfall.
- [x] Update `docs/data-model.md` identity rule with a pointer to this phase (no schema bump unless you persist picker settings).
- [x] CHANGELOG `1.2.0` Added section when implementation ships (not in this planning commit unless the user asks).

## Testing Checklist

- [x] Switching printing keeps `roles`, `synergies`, `status`, `notes`, `foil`, `owned`.
- [x] Merge when target printing already exists in the same zone+status.
- [x] Commander zone stays quantity 1.
- [x] Cheapest ignores null prices and digital/oversized when filters on.
- [x] Bulk skip owned.
- [x] Offline: cached printings only; no thrown Scryfall errors.
- [x] Rate limiter still 75ms (spy in unit test).
- [x] No `$0.00` for missing price after swap.

## Automation & Quality Gates

- [x] `npm run format:check`
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test:unit`
- [x] `npm run test:integration`
- [ ] `npm run test:e2e`
- [x] `npm run build`

## Exit Criteria

- [x] From a deck card, the user can pick a different printing and see art/price/set update.
- [x] "Use cheapest" on one card selects the minimum priced English paper printing for the foil flag.
- [x] Bulk cheapest shows a preview and can be applied to ADD cards without touching owned CURRENT cards.
- [x] Tags and upgrade links survive the swap (or retarget on merge).
- [ ] CI green.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Sol Ring-class reprint volume | Slow bulk, 429s | Paginate, limiter, progress, cancel |
| "Cheapest" is a proxy / gold-border / The List | User buys the wrong SKU | Label prices as Scryfall reference; default English paper |
| Foreign copies cheaper | Surprise at the shop | Default `lang:en` |
| Owned copies swapped | User no longer matches binder | Skip owned in bulk |
| Two rows same oracle after switch | Commander illegal / messy | Merge on same printing; do not add a second oracle copy |
| Treating missing price as cheapest | Lies | Skip nulls (ADR-005 / Phase 8) |

## Out of Scope

- Price history, alerts, or authenticated TCGplayer market prices.
- Automatically re-pricing on a schedule without user action.
- Proxy / gold-border / language as first-class product modes (toggles only).
- Changing wishlist printings in bulk (single-item is optional).
- Archidekt import (Phase 20).
- Auto roles (Phase 21).
- Downloading Scryfall bulk card data.

## Handoff to Next Phase

Phase 19 leaves a printing picker and cheapest helper keyed by `oracleId`. Phase 20 should resolve imported `SET` + collector number to that same printing id, then the user can still cheapen afterwards.
