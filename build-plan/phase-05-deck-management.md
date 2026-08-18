# Phase 05 — Deck Management

## Agent Handoff Prompt

```
You are implementing Phase 5 (Deck Management) of the MTG Deck Builder web app.

Workspace: mtg-deck-manager
Read first:
- plans/mtg-deck-builder-web-app-build-plan.md (sections 7, 8, 9, 11, 12, 13, 19, 32, 33, 36, 51)
- build-plan/phase-04-scryfall-integration.md (Card id conventions, hooks, CardDetailSheet)
- build-plan/phase-05-deck-management.md (this document — follow it completely)

Prerequisites: Phases 0–4 complete (local DB, Scryfall search, Card caching).

Your mission:
1. Build /decks routes: list, create, detail dashboard stub, card list.
2. Implement deck CRUD via repository/service layer (create, rename, duplicate, archive, delete).
3. Implement deck card operations: add, remove, quantity, zone (commander/mainboard/sideboard/maybeboard).
4. Implement status marking: current, add, cut, consider.
5. Implement roles and synergies (multi-select from Tag catalog + custom tags).
6. Build mobile-first deck card rows and bottom sheets for card actions.
7. Wire commander selection with color identity awareness (basic validation stub for Phase 13).

Do NOT build full statistics dashboard (Phase 6), changes workflow screens (Phase 7), pricing (Phase 8), or version snapshots (Phase 11).

Exit criteria: A complete Commander deck can be created and edited entirely from an iPhone, persisting across reload.

When done, verify against the Testing Checklist and Exit Criteria in this document.
```

## Overview

Phase 5 is the **core deck-building workflow** — the reason the app exists. Users create decks, assign a format and commander, search for cards (Phase 4), add them to the deck, and annotate each `DeckCard` with status, roles, synergies, ownership, foil, and notes. All data persists locally via Dexie through a service/repository layer; the UI never writes to IndexedDB directly.

This phase prioritizes **mobile-first interaction patterns**: bottom sheets for card actions, large tap targets, sticky action bars, and compact card rows with optional image mode. Desktop layouts are enhancements, not the primary design target.

## Goal

Enable full create-read-update-delete operations on decks and deck cards, including status marking and tag assignment, on mobile devices with local-first persistence.

## Prerequisites

- **Phase 3:** `decks`, `deckCards`, `tags` Dexie tables; `DeckRepository`, `DeckCardRepository`, `TagRepository`.
- **Phase 4:** Card search, `CardDetailSheet`, `CardRepository`, `getCardsByIdsBatched()`.
- **Phase 1–2:** App shell, bottom navigation, Neo Brutalism theme, PWA shell.

### Required packages (install if missing)

```bash
npm install @tanstack/react-query zustand
npm install @tanstack/react-virtual   # optional, for long deck lists
```

## Dependencies on Previous Phases

| Prior Phase | What Phase 5 Consumes                                               |
| ----------- | ------------------------------------------------------------------- |
| Phase 3     | `Deck`, `DeckCard`, `Tag` interfaces; all deck-related repositories |
| Phase 4     | Card search, card lookup, `Card.id` / `oracleId` conventions        |
| Phase 4     | `CardDetailSheet` — extend with "Add to Deck"                       |
| Phase 1     | shadcn Dialog, Sheet, Select, Checkbox, Badge, DropdownMenu         |
| Phase 2     | Offline indicator                                                   |

## Duration Estimate

| Skill Level | Estimate  |
| ----------- | --------- |
| Experienced | 5–8 days  |
| Moderate    | 8–12 days |

Breakdown:

- Deck service + repositories: 1–2 days
- Deck list + create flow: 1 day
- Deck detail + card list: 2–3 days
- Card row + bottom sheets + status/roles: 2–3 days
- Duplicate/archive/delete + polish: 1 day

## Architecture & Key Decisions

### Service layer pattern

UI → **DeckService** / **DeckCardService** → Repositories → Dexie

```ts
// lib/deck/deck-service.ts
createDeck(input: CreateDeckInput): Promise<Deck>
updateDeck(id: string, patch: Partial<Deck>): Promise<Deck>
duplicateDeck(id: string, newName?: string): Promise<Deck>
archiveDeck(id: string): Promise<void>
deleteDeck(id: string): Promise<void>

// lib/deck/deck-card-service.ts
addCardToDeck(input: AddCardInput): Promise<DeckCard>
removeCardFromDeck(deckCardId: string): Promise<void>
updateDeckCard(id: string, patch: Partial<DeckCard>): Promise<DeckCard>
setCardStatus(deckCardId: string, status: DeckCardStatus): Promise<DeckCard>
setCardQuantity(deckCardId: string, quantity: number): Promise<DeckCard>
bulkUpdateStatus(deckCardIds: string[], status: DeckCardStatus): Promise<void>
```

Never call Dexie from React components.

### Single deck-card model with statuses

Do **not** create separate tables or arrays for ADD/CUT lists. One `deckCards` table; filter by `status` for views (Phase 7 builds dedicated screens).

Default status for newly added cards: `current`.

### Commander handling

- `Deck.commanderId` stores the **printing id** (`Card.id`) of the commander card.
- When setting commander, also ensure a `DeckCard` exists with `zone: 'commander'`, `quantity: 1`, `status: 'current'`.
- If user changes commander, update previous commander zone to `mainboard` or remove (product decision: **move old commander to mainboard as current** unless user deletes).

### Duplicate detection (basic)

When adding a card, check `oracleId` across non-basic lands in `mainboard` + `commander` zones with `status !== 'cut'`. Warn but allow override for non-Commander formats later.

Basic lands exempt: names matching `/^Basic/` or oracle names: Plains, Island, Swamp, Mountain, Forest, Wastes, Snow-Covered variants.

Full validation deferred to Phase 13; implement `getDuplicateWarnings()` stub returning warnings array.

### Roles and synergies

Stored on `DeckCard.roles: string[]` and `DeckCard.synergies: string[]` as **tag name strings** (denormalized) OR tag ids — **recommend tag ids** for renames, with display names resolved from `tags` table.

Seed `tags` table on first launch with default role and synergy catalogs (from parent plan sections 12–13).

User can create custom tags via `TagRepository.create({ category: 'custom' })`.

### Archive vs delete

| Action  | Behavior                                                                                                    |
| ------- | ----------------------------------------------------------------------------------------------------------- |
| Archive | Set `deck.archived = true` (add field) or move to `status: 'archived'`; hide from default list, recoverable |
| Delete  | Hard delete deck + all deckCards; confirm dialog; irreversible                                              |

Add to `Deck` interface:

```ts
interface Deck {
  // ... existing fields
  archived?: boolean;
  favorite?: boolean;
}
```

Migration v3 if needed.

### Mobile card row

Implement three density modes (global setting from Phase 3 settings, default `compact`):

1. **Compact** — text only, no image.
2. **Comfortable** — small metadata, optional tiny thumb.
3. **Image** — thumbnail column + text.

Status badge always visible with color + text label (accessibility).

### Bottom sheets for actions

Use shadcn Sheet (`side="bottom"`) for:

- Card quick actions (status, roles, remove).
- Add card flow (search embedded or link to search with deck context).
- Deck actions (rename, duplicate, delete).

Avoid hover-only menus on mobile; use explicit tap → sheet.

### TanStack Query for deck data

```ts
["decks", "list"][("decks", "detail", deckId)][("decks", deckId, "cards")][
  ("decks", deckId, "cards", { status, zone, sort })
];
```

Mutations invalidate relevant queries. Optimistic updates optional for status changes (recommended for snappy mobile UX).

### Zustand for ephemeral UI state

```ts
// store/deck-ui-store.ts
selectedDeckCardIds: string[]
multiSelectMode: boolean
activeDeckIdForSearch: string | null
openSheet: 'none' | 'card-actions' | 'add-card' | 'deck-settings'
```

Do not persist UI store to IndexedDB.

## Data Model Impact

### Deck (extend)

```ts
type DeckFormat =
  | "commander"
  | "standard"
  | "modern"
  | "pioneer"
  | "legacy"
  | "vintage"
  | "pauper"
  | "other";

interface Deck {
  id: string;
  name: string;
  format: DeckFormat;
  description?: string;
  commanderId?: string;
  createdAt: string;
  updatedAt: string;
  activeVersionId?: string;
  archived?: boolean;
  favorite?: boolean;
}
```

MVP default format: `commander`.

### DeckCard (confirm)

```ts
type DeckCardZone = "commander" | "mainboard" | "sideboard" | "maybeboard";
type DeckCardStatus = "current" | "add" | "cut" | "consider";

interface DeckCard {
  id: string;
  deckId: string;
  cardId: string; // Card.id (printing)
  quantity: number;
  zone: DeckCardZone;
  status: DeckCardStatus;
  foil?: boolean;
  owned?: boolean;
  notes?: string;
  roles: string[]; // tag ids or names — pick one convention and stick to it
  synergies: string[];
  addedAt: string;
  updatedAt: string;
}
```

### Tag (seed data)

Seed ~25 roles and ~23 synergies from parent plan. Example:

```ts
{ id: 'role-ramp', name: 'Ramp', category: 'role', color: '#22c55e' }
{ id: 'syn-soldier', name: 'Soldier', category: 'synergy' }
```

### Dexie indexes

```ts
decks: "id, name, format, updatedAt, archived, favorite";
deckCards: "id, deckId, cardId, status, zone, [deckId+status], [deckId+zone]";
tags: "id, category, name";
```

Compound index `[deckId+status]` critical for Phase 7 filtered views.

## Routes / Screens

| Route                              | Purpose                                                       |
| ---------------------------------- | ------------------------------------------------------------- |
| `/decks`                           | Deck list (all non-archived)                                  |
| `/decks/new`                       | Create deck form (or modal from list)                         |
| `/decks/[deckId]`                  | Deck dashboard (header + summary stub; full stats in Phase 6) |
| `/decks/[deckId]/cards`            | Primary card working surface                                  |
| `/decks/[deckId]/cards?status=add` | Query-param filter (optional; full UI in Phase 7)             |

### Deck list screen

```
MY DECKS                    [+ New]

┌─────────────────────────────┐
│ ★ Soldier Swarm             │
│ Commander · 100 cards       │
│ Updated 2h ago              │
└─────────────────────────────┘

┌─────────────────────────────┐
│ Artifacts                   │
│ Commander · 98 cards        │
└─────────────────────────────┘
```

Actions per deck (sheet): Open, Rename, Duplicate, Archive, Delete, Export (stub Phase 10).

### Deck dashboard (`/decks/[deckId]`)

Minimal in Phase 5 — expand in Phase 6:

- Deck name, format, commander image/name.
- Card count (current status only).
- Primary actions: Edit Cards, Add Card, Settings.
- Stub buttons disabled: Review Changes, View Stats (Phase 6/7).

### Deck cards screen (`/decks/[deckId]/cards`)

Primary working surface:

- Sticky header: deck name, search/filter icon, add button.
- Filter chips: All | Current | Add | Cut | Consider (Phase 7 enhances).
- Sort dropdown: Name, MV, Type, Status.
- Virtualized card list.
- Multi-select mode (long-press to enter on mobile).

## File Structure (files to create/modify)

```text
lib/
  deck/
    deck-service.ts
    deck-card-service.ts
    deck-queries.ts          # TanStack query keys + fetchers
    duplicate-detection.ts
    constants.ts             # default formats, basic land names
  db/
    repositories/
      deck-repository.ts
      deck-card-repository.ts
      tag-repository.ts
    seed/
      default-tags.ts
  hooks/
    use-decks.ts
    use-deck.ts
    use-deck-cards.ts
    use-deck-mutations.ts

types/
  deck.ts
  deck-card.ts
  tag.ts

store/
  deck-ui-store.ts

app/
  decks/
    page.tsx
    new/
      page.tsx               # or use dialog-only
    [deckId]/
      page.tsx
      cards/
        page.tsx
      layout.tsx             # deck sub-nav tabs optional

components/
  deck/
    deck-list.tsx
    deck-list-item.tsx
    deck-header.tsx
    deck-actions-sheet.tsx
    deck-create-form.tsx
    deck-empty-state.tsx
    deck-card-list.tsx
    deck-card-row.tsx
    deck-card-actions-sheet.tsx
    deck-add-card-sheet.tsx
    deck-status-badge.tsx
    deck-zone-group.tsx
    role-synergy-picker.tsx
    commander-picker.tsx
    deck-format-select.tsx
  cards/
    card-detail-sheet.tsx    # extend: Add to Deck flow
  shared/
    confirm-dialog.tsx
    multi-select-bar.tsx

components/navigation/
  deck-tabs.tsx              # Cards | Changes | Stats sub-nav (Changes/Stats stub)
```

## Detailed Task List

### 5.1 — Types and constants

- [ ] Create/update `types/deck.ts`, `types/deck-card.ts`, `types/tag.ts`.
- [ ] Define `DeckFormat` enum/union with Commander as default.
- [ ] Create `lib/deck/constants.ts`:
  - [ ] `DEFAULT_FORMAT = 'commander'`
  - [ ] `BASIC_LAND_ORACLE_NAMES` set
  - [ ] `DECK_CARD_STATUSES`, `DECK_CARD_ZONES`
- [ ] Document id convention: `DeckCard.cardId` → `Card.id` (printing).

### 5.2 — Tag seeding

- [ ] Create `lib/db/seed/default-tags.ts` with full role and synergy catalogs from parent plan.
- [ ] On app init (Phase 3 hook), if `tags` table empty → bulk insert defaults.
- [ ] `TagRepository.listByCategory('role' | 'synergy' | 'custom')`.

### 5.3 — Repository layer

- [ ] **DeckRepository:**
  - [ ] `create(deck)`, `getById(id)`, `list({ includeArchived })`, `update(id, patch)`, `delete(id)`
  - [ ] `duplicate(id, newName)` — copy deck row + all deckCards with new ids
- [ ] **DeckCardRepository:**
  - [ ] `create`, `getById`, `listByDeck(deckId, filters?)`, `update`, `delete`
  - [ ] `listByDeckAndStatus(deckId, status)`
  - [ ] `bulkDeleteByDeck(deckId)` — for deck delete cascade
  - [ ] `findByDeckAndCardId(deckId, cardId)` — prevent duplicate rows or merge quantity
- [ ] Ensure all writes update `updatedAt` on both DeckCard and parent Deck.

### 5.4 — Deck service

- [ ] `createDeck({ name, format, description? })`:
  - [ ] Generate cuid/uuid for id.
  - [ ] Set timestamps.
- [ ] `updateDeck(id, patch)` — validate name non-empty.
- [ ] `duplicateDeck(id, newName?)` — default name `"${name} (Copy)"`.
- [ ] `archiveDeck(id)` — set `archived: true`.
- [ ] `unarchiveDeck(id)`.
- [ ] `deleteDeck(id)` — confirm cascade delete deckCards in transaction.
- [ ] `setCommander(deckId, cardId)`:
  - [ ] Upsert commander DeckCard in `commander` zone.
  - [ ] Update `deck.commanderId`.
  - [ ] Fetch Card for color identity (store nothing yet; Phase 13 validates).

### 5.5 — Deck card service

- [ ] `addCardToDeck({ deckId, cardId, quantity?, zone?, status? })`:
  - [ ] Default zone `mainboard`, status `current`, quantity `1`.
  - [ ] If card already in same zone with same status → increment quantity (configurable: or separate rows — **recommend single row per cardId+zone+status**).
  - [ ] Ensure Card exists in Dexie; if not, fetch from Scryfall via Phase 4 client.
  - [ ] Run duplicate warning (non-blocking toast).
- [ ] `removeCardFromDeck(deckCardId)`.
- [ ] `updateQuantity(deckCardId, quantity)` — min 1, max 99 (basic lands excepted).
- [ ] `setStatus(deckCardId, status)`.
- [ ] `setZone(deckCardId, zone)` — moving to commander forces quantity 1.
- [ ] `setRoles(deckCardId, roleIds: string[])`.
- [ ] `setSynergies(deckCardId, synergyIds: string[])`.
- [ ] `updateNotes(deckCardId, notes)`.
- [ ] `toggleOwned(deckCardId)`, `toggleFoil(deckCardId)`.
- [ ] `bulkSetStatus(deckCardIds, status)`.
- [ ] `bulkRemove(deckCardIds)`.

### 5.6 — TanStack Query hooks

- [ ] `useDecks()` — list non-archived, sorted by `updatedAt` desc.
- [ ] `useDeck(deckId)`.
- [ ] `useDeckCards(deckId, filters)` — joins Card metadata via `getCardsByIdsBatched`.
- [ ] Mutations with `onSuccess` invalidation:
  - [ ] `useCreateDeck`, `useUpdateDeck`, `useDeleteDeck`, `useDuplicateDeck`
  - [ ] `useAddCard`, `useRemoveCard`, `useUpdateDeckCard`, `useSetStatus`
- [ ] Optional optimistic updates for status toggle.

### 5.7 — Deck list UI (`/decks`)

- [ ] `app/decks/page.tsx` with page header + New button.
- [ ] `DeckList` — map decks to `DeckListItem`.
- [ ] `DeckListItem` — name, format badge, card count, favorite star, updated relative time.
- [ ] Tap → navigate to `/decks/[deckId]`.
- [ ] Long-press or ⋮ button → `DeckActionsSheet`.
- [ ] Empty state with CTA "Create your first deck".
- [ ] Toggle show archived (Settings link or filter chip).

### 5.8 — Create deck flow

- [ ] `DeckCreateForm` — name (required), format select, optional description.
- [ ] Route `/decks/new` OR dialog from list (pick one; dialog preferred on mobile).
- [ ] On success → navigate to new deck dashboard.
- [ ] Prompt to add commander (optional skip).

### 5.9 — Commander picker

- [ ] `CommanderPicker` component — embeds card search filtered `is:commander` or format-legal (Scryfall query `is:commander`).
- [ ] On select → `setCommander(deckId, cardId)`.
- [ ] Show commander in `DeckHeader` with image (if image mode on).

### 5.10 — Deck dashboard (`/decks/[deckId]`)

- [ ] `DeckHeader` — name, format, commander, card count.
- [ ] Action buttons: **Edit Cards** → `/cards`, **Add Card** → opens add sheet.
- [ ] Sub-nav tabs: Overview | Cards | Changes (disabled) | Stats (disabled).
- [ ] Show recent activity or last updated (optional).

### 5.11 — Deck cards page (`/decks/[deckId]/cards`)

- [ ] `DeckCardList` — groups by zone optional (Commander section, Mainboard, Sideboard).
- [ ] Integrate sort and filter state (URL search params or Zustand).
- [ ] Filter chips for status (all/current/add/cut/consider).
- [ ] Sticky bottom bar when multi-select active.

### 5.12 — Deck card row component

- [ ] `DeckCardRow` props: `deckCard`, `card`, `density`, `selected`, `onPress`, `onLongPress`.
- [ ] Display: name, type line, MV, status badge, role/synergy chips (max 2 + "+N").
- [ ] Compact / Comfortable / Image layouts per parent plan section 33.
- [ ] Neo Brutalism: hard border, offset shadow, semantic status colors:
  - [ ] `current` → neutral/primary
  - [ ] `add` → green
  - [ ] `cut` → red
  - [ ] `consider` → yellow
- [ ] Accessibility: status text label, not color alone.

### 5.13 — Card actions bottom sheet

- [ ] `DeckCardActionsSheet` — opened on row tap (or chevron).
- [ ] Sections:
  - [ ] Status selector (4 segmented buttons)
  - [ ] Quantity stepper
  - [ ] Zone selector (if not commander-only slot)
  - [ ] Owned / Foil toggles
  - [ ] Notes textarea
  - [ ] Roles multi-select (`RoleSynergyPicker`)
  - [ ] Synergies multi-select
  - [ ] View card details (opens CardDetailSheet)
  - [ ] Remove from deck (destructive, confirm)
- [ ] Save on each change (immediate persist) OR explicit Save button (recommend immediate for mobile simplicity).

### 5.14 — Role / synergy picker

- [ ] `RoleSynergyPicker` — searchable multi-select checklist grouped by category.
- [ ] "Create custom tag" inline input for `category: 'custom'`.
- [ ] Show colored chips from Tag.color where defined.

### 5.15 — Add card flow

- [ ] `DeckAddCardSheet` — embed `CardSearchInput` + results.
- [ ] Pass `deckId` context; on select → `addCardToDeck`.
- [ ] Quick-add button on each search result row (`+ Add`).
- [ ] After add → toast "Added {name}" with Undo (5s window calling `removeCardFromDeck`).
- [ ] Extend global `/cards` page: if `?deckId=` param, show Add button wired to deck.

### 5.16 — Duplicate, archive, delete

- [ ] `DeckActionsSheet` actions with confirm dialogs.
- [ ] Duplicate → navigate to new deck.
- [ ] Archive → remove from list, toast with Undo.
- [ ] Delete → strong confirm: "Type deck name to confirm" OR simple confirm for MVP.
- [ ] Cascade delete all deckCards in transaction.

### 5.17 — Multi-select and bulk actions

- [ ] Long-press row → enter multi-select mode.
- [ ] `MultiSelectBar` sticky footer: count + Mark ADD / Mark CUT / Remove.
- [ ] Tap outside or Done to exit.

### 5.18 — Card detail sheet integration

- [ ] Update `CardDetailSheet`:
  - [ ] Deck selector dropdown if multiple decks (or current deck from context).
  - [ ] "Add to Deck" → quantity + zone + initial status.
  - [ ] "Mark as Consider" shortcut if deck context set.

### 5.19 — Navigation and layout

- [ ] Bottom nav "Decks" → `/decks`.
- [ ] `app/decks/[deckId]/layout.tsx` — optional shared header/tabs.
- [ ] Breadcrumb/back navigation on mobile.

### 5.20 — Error handling

- [ ] Handle missing Card metadata (orphan deckCard.cardId) — show placeholder row + "Refresh card" action.
- [ ] Storage quota errors on write — user-friendly message.
- [ ] Offline: all deck ops work; add card still works if Card cached.

## Implementation Notes

### Merging vs separate rows for duplicates

When user adds same printing twice, **increment quantity** on existing `DeckCard` rather than creating duplicate rows. Exception: different statuses create separate logical entries — e.g., one `current` Sol Ring and one `consider` Sol Ring should be **two rows** because status differs.

Rule: unique constraint on `(deckId, cardId, zone, status)`.

### Quantity and Commander

Commander always `quantity: 1`, `zone: 'commander'`. Disable quantity stepper in UI for commander zone.

### Favorite decks

`favorite: true` sorts to top of deck list. Toggle via star icon on list item.

### Performance

Deck with 100 cards + 100 Card lookups:

- Batch fetch cards via `getCardsByIdsBatched`.
- Memoize `DeckCardRow` with `React.memo`.
- Virtualize list when > 30 rows.

### Undo pattern

```ts
// After destructive action, keep snapshot for 5s
const undoRemove = async () => {
  await DeckCardRepository.create(previousSnapshot);
};
```

Use shadcn Sonner toast with action button.

### Format selection

MVP implements Commander completely enough for daily use. Other formats stored but validation minimal until Phase 13.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 5 matrix.

- [ ] Install **TestCafe**; create `.testcaferc.js` and `tests/e2e/deck-create.test.ts` (smoke)
- [ ] Add `data-testid` to all new interactive elements (see automation-strategy.md table)
- [ ] **Integration tests:** deck create/rename/delete, add card, status change, duplicate deck
- [ ] **Integration tests:** cascade delete removes deckCards
- [ ] Optional CI job `e2e-smoke` (non-blocking until Phase 15)
- [ ] `npm run test:e2e:smoke` — create deck + reload persistence

## Testing Checklist

### Unit tests

- [ ] `duplicateDeck` copies all deckCards with new ids.
- [ ] `addCardToDeck` increments quantity on duplicate cardId+zone+status.
- [ ] `setCommander` creates commander zone card.
- [ ] Basic land duplicate detection ignored.
- [ ] Non-basic duplicate detection fires warning.
- [ ] `deleteDeck` cascades deckCards.

### Integration tests

- [ ] Create deck → add 10 cards → reload → 10 cards persist.
- [ ] Change status current → add → filter shows card in add filter.
- [ ] Assign roles/synergies → persist → display on row.
- [ ] Duplicate deck → independent copy, edits don't affect original.
- [ ] Archive → hidden from list → unarchive restores.
- [ ] Offline: add cached card to deck works.

### Manual iPhone tests

- [ ] Create Commander deck end-to-end with thumb only.
- [ ] Bottom sheets open/close without layout jump.
- [ ] Long-press multi-select works.
- [ ] Undo remove works within toast window.
- [ ] Safe area insets respected on sticky bars.

## Exit Criteria

- [ ] User can create, rename, duplicate, archive, and delete decks.
- [ ] User can set a commander from Scryfall search.
- [ ] User can add/remove cards, change quantity, zone, status, owned, foil, notes.
- [ ] User can assign multiple roles and synergies per card.
- [ ] Deck card list renders in compact mode on mobile with status badges.
- [ ] All changes persist across page reload and offline use.
- [ ] No direct Dexie access from components — all via services.
- [ ] A complete 100-card Commander deck can be built on iPhone.

## Risks & Mitigations

| Risk                                   | Impact              | Mitigation                                  |
| -------------------------------------- | ------------------- | ------------------------------------------- |
| Orphan deckCards without Card metadata | Broken rows         | Fetch-on-miss from Scryfall; placeholder UI |
| Duplicate row logic complexity         | Data inconsistency  | Unique composite key; unit tests            |
| Slow 100-card load                     | Poor mobile UX      | Batch card fetch; virtualization            |
| Bottom sheet scroll vs page scroll     | iOS jank            | Fixed sheet height; tested on real device   |
| Tag id vs name drift                   | Broken role display | Standardize on tag ids everywhere           |
| Accidental deck delete                 | Data loss           | Confirm dialog; export reminder (Phase 10)  |

## Out of Scope (defer to later phases)

- Mana curve, statistics, warnings panel (Phase 6).
- Need-to-add, cards-to-cut, projected deck, apply changes (Phase 7).
- Price display and upgrade cost (Phase 8).
- Image density global toggle persistence polish (Phase 9).
- Import/export decklist (Phase 10).
- Version snapshots (Phase 11).
- Wishlist integration (Phase 12).
- Full Commander validation rules (Phase 13).
- Bulk export, Moxfield import.
- Swipe-to-cut gestures (Phase 14 polish).

## Handoff to Next Phase

**Phase 6 (Deck Dashboard & Statistics)** will consume:

- `useDeck`, `useDeckCards` with Card joins
- `DeckCard` statuses and roles/synergies for aggregations
- `/decks/[deckId]` dashboard shell — replace stubs with real widgets
- Deck header with commander image

**Phase 7 (Changes & Upgrade Workflow)** will consume:

- Status filtering on deckCards (`add`, `cut`, `consider`)
- Stable `DeckCard` service methods for bulk status changes
- Sub-nav tab "Changes" currently stubbed

Before handoff:

1. Ensure `[deckId+status]` Dexie index exists for fast filtered queries.
2. Seed tags and verify role/synergy picker works with seeded data.
3. Leave test deck with mix of CURRENT/ADD/CUT/CONSIDER cards for Phase 6–7 dev.

---

_Parent plan: `plans/mtg-deck-builder-web-app-build-plan.md`_
