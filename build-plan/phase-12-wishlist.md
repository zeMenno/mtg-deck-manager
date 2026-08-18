# Phase 12 — Wishlist

## Agent Handoff Prompt

```
You are implementing Phase 12 (Wishlist) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-12-wishlist.md (this document — follow every section)
- build-plan/README.md (context and dependencies)
- plans/mtg-deck-builder-web-app-build-plan.md (master reference, sections 20, 28, 30, 36)

Prerequisites: Phases 0–11 complete (especially Phase 3 local DB, Phase 5 deck management, Phase 7 CONSIDER/ADD workflow, Phase 8 pricing, Phase 10 import/export).

Goal: Build a global wishlist separate from individual decks with priority levels, target deck/role assignment, price display, and a workflow to move items into deck CONSIDER or ADD status.

Deliverables:
1. WishlistItem data model + Dexie tables (wishlists, wishlistItems) with migrations
2. Wishlist repository and service layer
3. /wishlist route with full mobile-first UI
4. Add-to-wishlist from card search and card detail
5. Move-to-CONSIDER and Move-to-ADD workflows with deck selection
6. Wishlist included in full backup export/import
7. Offline-capable wishlist CRUD
8. Bottom nav entry for Wishlist

Constraints:
- Local-first: all wishlist data in IndexedDB via Dexie
- UI must use Neo Brutalism theme (zero-radius, hard borders, offset shadows)
- iPhone-first: bottom sheets, large tap targets, safe-area aware
- Do not create a separate "consider database" — moving to CONSIDER creates/updates a DeckCard with status 'consider'
- Pricing uses existing CardPrice cache; never show $0.00 on failure

When done, verify exit criteria in this document and update build-plan/README.md phase status if applicable.
```

## Overview

Phase 12 introduces a **global wishlist** — a persistent, deck-agnostic collection of cards the user wants to acquire or evaluate later. Unlike deck cards marked `CONSIDER`, wishlist items exist independently and carry metadata about **why** the user wants a card (priority, target deck, intended role, notes) without requiring immediate deck association.

The wishlist bridges the gap between casual card discovery ("I saw this at the LGS") and structured deck upgrade planning. Users can capture cards quickly, prioritize purchases, and later promote items into a specific deck's `CONSIDER` or `ADD` workflow when ready.

This phase completes a major navigation item (`Wishlist` in bottom nav) defined in the master plan's information architecture and makes the upgrade pipeline fully connected:

```text
Card Search / Detail
        ↓
    Wishlist (global)
        ↓
Deck CONSIDER → Deck ADD → Apply Changes
```

## Goal

Deliver a production-quality wishlist feature that:

1. Stores wishlist items locally in IndexedDB with full offline support.
2. Supports four priority levels: Essential, High, Medium, Low.
3. Allows optional assignment of target deck and target role.
4. Displays cached price data with freshness indicators.
5. Provides one-tap paths to move an item into a deck as `CONSIDER` or `ADD`.
6. Integrates with import/export so wishlist data survives device migration.
7. Feels native on iPhone with Neo Brutalism styling.

## Prerequisites

- **Phase 3** — Dexie schema, migrations, repository pattern established.
- **Phase 4** — Scryfall card lookup; card metadata cached locally.
- **Phase 5** — Deck CRUD; `DeckCard` model with status field.
- **Phase 7** — CONSIDER/ADD status workflow understood and working.
- **Phase 8** — `CardPrice` snapshots and pricing display components.
- **Phase 10** — Full backup export/import format includes extensibility for new tables.
- **Phase 9** — Card image component and density modes (reuse on wishlist rows).

## Dependencies on Previous Phases

| Phase | Dependency                                            |
| ----- | ----------------------------------------------------- |
| 3     | Dexie tables, migration framework, repository layer   |
| 4     | Card metadata resolution by `cardId`                  |
| 5     | `addCardToDeck()`, deck list for target deck picker   |
| 7     | `setCardStatus('consider' \| 'add')` service methods  |
| 8     | `CardPrice` lookup, price display, TCGplayer links    |
| 10    | Backup JSON schema must include `wishlistItems` array |
| 2     | PWA shell; wishlist route cached offline              |

## Duration Estimate

**3–5 days** for a single developer, assuming Phases 0–11 are complete and stable.

| Sub-area                        | Estimate  |
| ------------------------------- | --------- |
| Data model + migration          | 0.5 day   |
| Repository + service            | 0.5 day   |
| /wishlist page UI               | 1 day     |
| Card detail/search integration  | 0.5 day   |
| Move to CONSIDER/ADD workflow   | 1 day     |
| Import/export + offline testing | 0.5 day   |
| iPhone QA + polish              | 0.5–1 day |

## Architecture & Key Decisions

### Single global wishlist vs. multiple lists

**Decision:** One global wishlist per device (MVP). The master plan defines `wishlists` and `wishlistItems` tables — use a single default wishlist record (`id: 'default'`) created on first app init. This avoids UI complexity of managing multiple named lists while keeping the schema extensible for future "Shopping List" / "Trade Binder" lists.

### Wishlist item vs. deck CONSIDER card

**Decision:** These are distinct entities:

- **WishlistItem** — global, may have no deck association, has priority/notes/target metadata.
- **DeckCard (status: consider)** — tied to a specific deck, participates in projected deck views.

Moving wishlist → CONSIDER **creates or updates** a `DeckCard` and optionally removes or marks the wishlist item as "promoted" (see workflow below).

### Promotion workflow

**Decision:** When moving to CONSIDER or ADD:

1. Show deck picker (pre-select `targetDeckId` if set).
2. Create/update `DeckCard` with appropriate status, quantity, roles (copy `targetRole` if set).
3. Prompt user: "Remove from wishlist?" with options: Remove / Keep on wishlist.
4. Default: Remove from wishlist after successful promotion (reduces clutter).

### Priority ordering

**Decision:** Sort default order: Essential → High → Medium → Low, then by `addedAt` descending within same priority. Allow user override via manual sort (future) — MVP uses fixed priority weight.

### Price display

**Decision:** Reuse existing `CardPrice` table keyed by `cardId`. Wishlist does not duplicate price data. Show "Price unavailable" with last-known fallback per Phase 8 rules.

## Data Model Impact

### New types (`types/wishlist.ts`)

```ts
export type WishlistPriority = "essential" | "high" | "medium" | "low";

export interface Wishlist {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface WishlistItem {
  id: string;
  wishlistId: string;
  cardId: string;
  quantity: number;
  priority: WishlistPriority;
  targetDeckId?: string;
  targetRole?: string;
  notes?: string;
  addedAt: string;
  updatedAt: string;
}
```

### Dexie schema migration

Add to `lib/db/schema.ts` (or equivalent):

```ts
// Version N (increment from current)
wishlists: 'id, name, updatedAt',
wishlistItems: 'id, wishlistId, cardId, priority, targetDeckId, addedAt, updatedAt',
```

**Indexes rationale:**

- `wishlistId` — filter items for default list
- `cardId` — detect duplicate wishlist entries (warn, don't silently merge in MVP)
- `priority` — sort queries
- `targetDeckId` — filter "for this deck" view

### Default wishlist bootstrap

On DB init or migration, ensure:

```ts
{ id: 'default', name: 'My Wishlist', createdAt: now, updatedAt: now }
```

### Backup format extension

Add to export JSON (Phase 10):

```json
{
  "schemaVersion": 3,
  "wishlists": [...],
  "wishlistItems": [...]
}
```

Import must validate and upsert wishlist data; handle missing wishlist tables in old backups gracefully (empty array).

## Routes / Screens

| Route       | Purpose                                                 |
| ----------- | ------------------------------------------------------- |
| `/wishlist` | Main wishlist screen — list, filter, sort, bulk actions |

### Bottom sheet / modal surfaces (not separate routes)

| Surface                  | Trigger                                               |
| ------------------------ | ----------------------------------------------------- |
| Add to Wishlist sheet    | Card search result, card detail, deck card long-press |
| Edit Wishlist Item sheet | Tap wishlist row                                      |
| Move to Deck sheet       | "Move to CONSIDER" / "Move to ADD" actions            |
| Deck picker              | Part of move workflow                                 |
| Priority picker          | Edit item or bulk action                              |

### Navigation

Add **Wishlist** to bottom navigation bar (between Cards and Settings per master plan IA):

```text
Home | Decks | Cards | Wishlist | Settings
```

Highlight active state when on `/wishlist`.

## File Structure (files to create/modify)

### Create

```text
types/wishlist.ts
lib/db/repositories/wishlist-repository.ts
lib/services/wishlist-service.ts
lib/services/wishlist-promotion-service.ts
components/wishlist/wishlist-page.tsx
components/wishlist/wishlist-item-row.tsx
components/wishlist/wishlist-empty-state.tsx
components/wishlist/wishlist-summary-bar.tsx
components/wishlist/wishlist-filters.tsx
components/wishlist/add-to-wishlist-sheet.tsx
components/wishlist/edit-wishlist-item-sheet.tsx
components/wishlist/move-to-deck-sheet.tsx
components/wishlist/priority-badge.tsx
components/wishlist/priority-picker.tsx
hooks/use-wishlist.ts
hooks/use-wishlist-item.ts
app/wishlist/page.tsx
app/wishlist/loading.tsx
```

### Modify

```text
lib/db/schema.ts                          — add tables + migration
lib/db/database.ts                        — register new tables
lib/db/repositories/index.ts              — export wishlist repository
lib/import-export/backup-export.ts        — include wishlist data
lib/import-export/backup-import.ts        — restore wishlist data
components/navigation/bottom-nav.tsx        — add Wishlist tab
components/navigation/sidebar-nav.tsx       — add Wishlist link (desktop)
components/cards/card-detail-sheet.tsx    — "Add to Wishlist" action
components/cards/card-search.tsx            — wishlist quick action on results
components/shared/empty-state.tsx           — wishlist variant if needed
store/ui-store.ts                           — wishlist filter state (optional)
```

## Detailed Task List

### 12.1 — Data Layer

- [ ] Define `WishlistPriority` type and priority weight map for sorting
- [ ] Define `Wishlist` and `WishlistItem` interfaces in `types/wishlist.ts`
- [ ] Increment Dexie schema version
- [ ] Add `wishlists` and `wishlistItems` table definitions
- [ ] Write migration: create tables, seed default wishlist
- [ ] Implement `WishlistRepository`:
  - [ ] `getDefaultWishlist()`
  - [ ] `getItems(wishlistId, filters?)`
  - [ ] `getItemById(id)`
  - [ ] `addItem(item)`
  - [ ] `updateItem(id, partial)`
  - [ ] `removeItem(id)`
  - [ ] `removeItems(ids[])` — bulk delete
  - [ ] `findByCardId(cardId)` — duplicate detection
  - [ ] `countByPriority(wishlistId)`
- [ ] Implement `WishlistService` (business logic layer):
  - [ ] `addCardToWishlist(cardId, options?)`
  - [ ] `updatePriority(itemId, priority)`
  - [ ] `setTargetDeck(itemId, deckId | null)`
  - [ ] `setTargetRole(itemId, role | null)`
  - [ ] `updateNotes(itemId, notes)`
  - [ ] `updateQuantity(itemId, quantity)`
  - [ ] `removeFromWishlist(itemId)`
- [ ] Implement `WishlistPromotionService`:
  - [ ] `promoteToConsider(itemId, deckId, options)`
  - [ ] `promoteToAdd(itemId, deckId, options)`
  - [ ] Handle existing deck card (increment qty vs. conflict)
  - [ ] Copy `targetRole` to deck card `roles[]` if set
  - [ ] Optional post-promotion wishlist removal

### 12.2 — Import / Export Integration

- [ ] Add `wishlists` and `wishlistItems` to full backup export
- [ ] Add validation for wishlist section in backup import
- [ ] Handle legacy backups without wishlist (default empty)
- [ ] Verify round-trip: export → clear DB → import → wishlist intact
- [ ] Include wishlist in storage size estimate (Settings → Data)

### 12.3 — Wishlist Page (`/wishlist`)

- [ ] Create `app/wishlist/page.tsx` as client or server wrapper
- [ ] Create `WishlistPage` component with:
  - [ ] Page header: "Wishlist" + item count
  - [ ] Summary bar: total items, estimated cost, priority breakdown
  - [ ] Filter chips: All / Essential / High / Medium / Low
  - [ ] Filter by target deck (dropdown)
  - [ ] Sort: Priority (default), Name, Price, Date Added
  - [ ] Search within wishlist (local filter by card name)
- [ ] Implement `WishlistItemRow`:
  - [ ] Card name, type line, mana value
  - [ ] Priority badge (color-coded: Essential=red, High=orange, Medium=yellow, Low=neutral)
  - [ ] Target deck name (if set) or "No deck"
  - [ ] Target role tag (if set)
  - [ ] Quantity stepper or display
  - [ ] Price + TCGplayer link
  - [ ] Swipe or long-press actions (mobile)
  - [ ] Compact / comfortable / image density modes (reuse global setting)
- [ ] Empty state: "Your wishlist is empty" + CTA to browse cards
- [ ] Loading skeleton for initial fetch
- [ ] Pull-to-refresh for price refresh (optional, triggers price service)

### 12.4 — Add to Wishlist Flow

- [ ] Create `AddToWishlistSheet` bottom sheet:
  - [ ] Card preview (image, name, type)
  - [ ] Quantity selector (default 1)
  - [ ] Priority picker (default Medium)
  - [ ] Target deck selector (optional, deck dropdown)
  - [ ] Target role selector (optional, role tag picker)
  - [ ] Notes textarea (optional)
  - [ ] Save / Cancel buttons
- [ ] Wire "Add to Wishlist" on `CardDetailSheet`
- [ ] Wire wishlist icon/button on card search results
- [ ] Wire long-press "Add to Wishlist" on deck card rows (optional enhancement)
- [ ] Duplicate detection: if card already on wishlist, offer "Update existing" vs. "Add another entry"
- [ ] Success toast: "Added to wishlist" with undo (remove item)

### 12.5 — Edit Wishlist Item

- [ ] Create `EditWishlistItemSheet`:
  - [ ] All fields editable: quantity, priority, target deck, target role, notes
  - [ ] "View Card" link to card detail
  - [ ] "Remove from Wishlist" destructive action with confirm
- [ ] Tap row opens edit sheet
- [ ] Optimistic UI updates with rollback on DB error

### 12.6 — Move to CONSIDER / ADD Workflow

- [ ] Create `MoveToDeckSheet`:
  - [ ] Action context: "Move to CONSIDER" or "Move to ADD"
  - [ ] Deck picker (list of active decks, pre-select targetDeckId)
  - [ ] Quantity confirmation
  - [ ] Role assignment preview (inherit targetRole)
  - [ ] Checkbox: "Remove from wishlist after moving" (default checked)
  - [ ] Confirm button
- [ ] Primary row actions: "Consider" and "Add" buttons (or overflow menu)
- [ ] Bulk select mode:
  - [ ] Multi-select wishlist items
  - [ ] Bulk "Move to CONSIDER" / "Move to ADD" (same deck picker)
  - [ ] Bulk priority change
  - [ ] Bulk remove
- [ ] After promotion:
  - [ ] Navigate to deck changes screen (optional deep link)
  - [ ] Toast: "Added to [Deck Name] as CONSIDER" with undo
- [ ] Edge case: card already in deck as CURRENT — warn before overwriting status
- [ ] Edge case: Commander deck — respect zone (mainboard default)

### 12.7 — Pricing & Links

- [ ] Display cached price per wishlist row
- [ ] Summary bar: sum of (price × quantity) for items with known prices
- [ ] Show "X of Y priced" when some prices unavailable
- [ ] Price freshness timestamp in summary
- [ ] TCGplayer outbound link per row
- [ ] "Refresh prices" action for all wishlist cardIds (batch, throttled)

### 12.8 — Navigation & Shell

- [ ] Add Wishlist to bottom nav with Lucide icon (e.g. `Heart` or `Star`)
- [ ] Add Wishlist to desktop sidebar nav
- [ ] Active state styling (Neo Brutalism accent)
- [ ] Ensure `/wishlist` in service worker app shell cache

### 12.9 — Offline Behavior

- [ ] All wishlist CRUD works offline
- [ ] Card metadata resolved from local `cards` table
- [ ] Prices show cached values with stale indicator
- [ ] Move to CONSIDER/ADD works offline (local deck mutation)
- [ ] Add new card to wishlist offline: requires card already in local cache (show message if not)

### 12.10 — Accessibility & Mobile UX

- [ ] Priority badges include text labels, not color alone
- [ ] Touch targets ≥ 44px for row actions
- [ ] Safe-area padding on bottom sheet
- [ ] Keyboard: Enter to confirm add, Escape to close sheet (desktop)
- [ ] Screen reader labels for priority, price, actions
- [ ] Focus trap in bottom sheets

## Implementation Notes

### Priority weight map

```ts
const PRIORITY_WEIGHT: Record<WishlistPriority, number> = {
  essential: 0,
  high: 1,
  medium: 2,
  low: 3,
};
```

### Promotion service pseudocode

```ts
async function promoteToConsider(
  itemId: string,
  deckId: string,
  opts: PromotionOptions,
) {
  const item = await wishlistRepo.getItemById(itemId);
  const existing = await deckCardRepo.findByDeckAndCard(deckId, item.cardId);

  if (existing && existing.status === "current") {
    throw new ConflictError("Card is already in deck as CURRENT");
  }

  await deckService.addOrUpdateCard(deckId, {
    cardId: item.cardId,
    quantity: opts.quantity ?? item.quantity,
    status: "consider",
    roles: item.targetRole
      ? [item.targetRole, ...(existing?.roles ?? [])]
      : undefined,
  });

  if (opts.removeFromWishlist !== false) {
    await wishlistRepo.removeItem(itemId);
  }
}
```

### Do not duplicate card data

WishlistItem stores only `cardId`. Always join with `cards` table for display. If card not in local cache, trigger Scryfall fetch (online) or show placeholder (offline).

### Neo Brutalism priority badges

| Priority  | Treatment                               |
| --------- | --------------------------------------- |
| Essential | Red background, black border, bold text |
| High      | Orange/accent background                |
| Medium    | Yellow (consider color token)           |
| Low       | Neutral/muted background                |

Use semantic tokens from theme; do not invent a parallel color system.

### Summary bar example

```text
12 items · 4 Essential · Est. €84.20 (9 priced) · Updated 2h ago
[Refresh Prices]
```

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 12 matrix.

- [ ] **Integration tests:** add/remove wishlist item, priority update, target deck assignment
- [ ] **Integration tests:** promote to CONSIDER → deck card created with correct status
- [ ] **Integration tests:** promote to ADD → appears on changes screen
- [ ] **TestCafe:** `tests/e2e/wishlist-flow.test.ts`
- [ ] Wishlist items in backup export/import tests (extend Phase 10 fixtures)

## Testing Checklist

### Unit tests

- [ ] Priority sort order correct
- [ ] `WishlistService.addCardToWishlist` creates item with defaults
- [ ] Duplicate card detection returns existing item
- [ ] `promoteToConsider` creates DeckCard with status `consider`
- [ ] `promoteToAdd` creates DeckCard with status `add`
- [ ] Promotion copies targetRole to roles array
- [ ] Promotion removes wishlist item when configured
- [ ] Summary cost calculation handles null prices (skip, don't zero)
- [ ] Import/export round-trip preserves all wishlist fields

### Integration tests

- [ ] Add card to wishlist → appears on /wishlist page
- [ ] Edit priority → persists after reload
- [ ] Move to CONSIDER → deck card created, wishlist item removed
- [ ] Move to ADD → appears on deck Need to Add screen
- [ ] Full backup includes wishlist → restore works
- [ ] Offline: add/edit/remove wishlist items
- [ ] Offline: promote to CONSIDER on cached deck

### Manual iPhone testing

- [ ] Navigate to Wishlist via bottom nav
- [ ] Add card from search → wishlist → move to ADD → verify on deck changes
- [ ] Long list scroll performance acceptable
- [ ] Bottom sheets respect safe area (notch, home indicator)
- [ ] Standalone PWA mode: wishlist persists after force-close and reopen

## Exit Criteria

- [ ] `/wishlist` route renders a functional wishlist with all CRUD operations
- [ ] User can add cards from card search and card detail to wishlist
- [ ] Priority levels (Essential, High, Medium, Low) can be set and filter the list
- [ ] Target deck and target role can be assigned and edited
- [ ] Prices display with correct fallback behavior
- [ ] "Move to CONSIDER" and "Move to ADD" workflows work with deck picker
- [ ] Wishlist data included in full backup export and restored on import
- [ ] All wishlist operations work offline with cached data
- [ ] Bottom navigation includes active Wishlist tab
- [ ] Neo Brutalism styling consistent with rest of app
- [ ] No direct IndexedDB access from UI components (repository layer only)

## Risks & Mitigations

| Risk                                             | Impact                    | Mitigation                                                    |
| ------------------------------------------------ | ------------------------- | ------------------------------------------------------------- |
| Duplicate wishlist entries for same card         | Clutter, confusing totals | Warn on add; optional "merge quantities" in edit sheet        |
| Promotion creates conflicting deck card statuses | Data inconsistency        | Check existing DeckCard; prompt user on conflict              |
| Large wishlist performance                       | Slow renders              | Virtualize list if >100 items; paginate price refresh         |
| Old backups missing wishlist                     | Import confusion          | Graceful default empty; document schema version bump          |
| User expects wishlist sync across devices        | Feature gap               | Document local-only; export/import is the migration path      |
| Card not cached when adding offline              | Broken row display        | Block add with clear message; queue for online (out of scope) |

## Out of Scope

- Multiple named wishlists (e.g., "High Priority" vs. "Trade Targets")
- Wishlist price drop alerts / notifications
- Sharing wishlist via URL
- Automatic "cheapest printing" selection on promotion
- Wishlist CSV export (defer to post-MVP; full JSON backup covers data)
- Sorting wishlist by price from external API live fetch (use cache only)
- Cloud sync of wishlist

## Handoff to Next Phase

**Next: Phase 13 — Format & Deck Validation**

Phase 12 completes the user's card acquisition pipeline. Phase 13 will add **FormatRules** validation so that when wishlist items are promoted to ADD and the projected deck is viewed, the app surfaces legality errors (100-card count, commander rules, color identity, duplicates) and configurable recommendations (land count, ramp targets) as distinct warning categories.

Ensure before handoff:

1. Wishlist promotion correctly sets `DeckCard.status` — Phase 13 validation reads deck composition.
2. `targetRole` on wishlist items flows into deck cards — Phase 13 recommendation checks may count roles.
3. Export schema version documented — Phase 15 migration tests will cover wishlist tables.
