# Phase 03 — Local Database

## Agent Handoff Prompt

```
You are implementing Phase 3 (Local Database) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- plans/mtg-deck-builder-web-app-build-plan.md (sections 2, 28, 29, 30, 38, 49)
- docs/data-model.md (Phase 0)
- build-plan/phase-03-local-database.md (this document)

Prerequisites: Phase 1 complete (Next.js app). Phase 2 recommended (PWA shell).

Deliverables:
1. Dexie database class with all MVP tables and indexes
2. Schema version 1 + migration framework for future versions
3. Repository layer (Deck, DeckCard, Card, Tag, Settings, etc.) — UI never touches Dexie directly
4. Service layer stubs for deck and settings operations
5. DB initialization on app startup (client component provider)
6. CRUD: create/rename deck, add local card record, update card status
7. Settings persistence (image toggle, density mode placeholders)
8. Export/import foundation: serialize all tables to JSON, import with validation stub
9. Test utilities: in-memory/fake IndexedDB for unit tests

Exit (network disabled):
  Create deck → Rename deck → Add local card → Update status → Reload → Data remains

Read build-plan/automation-strategy.md — implement Phase 3 automation (Vitest + fake-indexeddb + CI test:unit).

Do NOT build Scryfall integration (Phase 4) or full deck UI (Phase 5).
```

## Overview

Phase 3 builds the **local persistence layer** — the foundation of the local-first architecture. All deck data lives in IndexedDB via Dexie, accessed only through repositories and services.

Getting the schema right here prevents painful migrations later. Include versioned migrations from day one.

## Goal

Dexie schema, repositories, migrations, and CRUD operations so deck data persists offline across page reloads.

## Prerequisites

- **Phase 0:** Data model interfaces in `docs/data-model.md`
- **Phase 1:** Next.js app with client-side rendering capability

## Dependencies on Previous Phases

| Phase   | Requirement                                          |
| ------- | ---------------------------------------------------- |
| Phase 0 | `Deck`, `DeckCard`, `Card`, `Tag`, etc. interfaces   |
| Phase 1 | App layout, `lib/` folder structure                  |
| Phase 2 | Optional — offline shell for testing without network |

## Duration Estimate

| Skill Level | Estimate |
| ----------- | -------- |
| Experienced | 3–5 days |
| Moderate    | 5–7 days |

## Architecture & Key Decisions

### Layering (mandatory)

```text
React UI
  ↓ hooks (useDecks, useDeckCards)
Application Services (lib/deck/, lib/settings/)
  ↓
Repositories (lib/db/repositories/)
  ↓
Dexie (lib/db/database.ts)
  ↓
IndexedDB
```

**Rule:** No `db.decks` calls from components or pages.

### Dexie schema (version 1)

```ts
class DeckBuilderDatabase extends Dexie {
  cards!: Table<Card, string>;
  cardPrices!: Table<CardPrice, string>;
  decks!: Table<Deck, string>;
  deckCards!: Table<DeckCard, string>;
  deckVersions!: Table<DeckVersion, string>;
  tags!: Table<Tag, string>;
  wishlistItems!: Table<WishlistItem, string>;
  settings!: Table<AppSetting, string>;
  appMeta!: Table<AppMeta, string>;

  constructor() {
    super("DeckBuilderDB");
    this.version(1).stores({
      cards: "id, oracleId, name, updatedAt",
      cardPrices: "cardId, fetchedAt",
      decks: "id, name, format, updatedAt, createdAt",
      deckCards: "id, deckId, cardId, status, [deckId+status], [deckId+zone]",
      deckVersions: "id, deckId, createdAt",
      tags: "id, category, name",
      wishlistItems: "id, cardId, priority",
      settings: "key",
      appMeta: "key",
    });
  }
}
```

### ID generation

Use `crypto.randomUUID()` for all entity IDs.

### Migrations

```ts
this.version(2)
  .stores({/* changes */})
  .upgrade((tx) => {
    /* data migration */
  });
```

Document migration policy in `lib/db/migrations/README.md`.

### AppSetting key-value store

```ts
interface AppSetting {
  key: string;
  value: unknown;
  updatedAt: string;
}
// Keys: 'imageDisplay', 'densityMode', 'lastBackupAt', 'installBannerDismissed'
```

### Export format (foundation)

```ts
interface AppBackup {
  version: 1;
  exportedAt: string;
  decks: Deck[];
  deckCards: DeckCard[];
  deckVersions: DeckVersion[];
  cards: Card[];
  cardPrices: CardPrice[];
  tags: Tag[];
  wishlistItems: WishlistItem[];
  settings: AppSetting[];
}
```

Full validation in Phase 10; Phase 3 implements serialize/deserialize.

## Data Model Impact

Implements all interfaces from Phase 0. Seed default tags (roles + synergies) on first init.

## Routes / Screens

Minimal debug UI (optional, dev-only) or wire to existing `/decks` placeholder:

- [ ] `/decks` — list decks from Dexie (basic list, no polish)
- [ ] Dev-only: `/dev/db-test` — CRUD smoke test (remove before Phase 16 or gate behind env)

## File Structure

```text
lib/db/
  database.ts
  migrations/
    README.md
  repositories/
    deck-repository.ts
    deck-card-repository.ts
    card-repository.ts
    tag-repository.ts
    settings-repository.ts
    wishlist-repository.ts
    index.ts
  seed/
    default-tags.ts
  export-import/
    backup-serializer.ts
    backup-importer.ts
  test/
    test-database.ts
lib/deck/
  deck-service.ts
  deck-card-service.ts
lib/hooks/
  use-decks.ts
  use-deck-cards.ts
components/providers/
  database-provider.tsx
types/
  deck.ts
  card.ts
  backup.ts
```

## Detailed Task List

### Dexie setup

- [ ] `npm install dexie`
- [ ] Create `DeckBuilderDatabase` singleton
- [ ] Define version 1 schema with all tables and indexes
- [ ] Export `db` instance; guard SSR (`typeof window !== 'undefined'`)

### Repositories

- [ ] `DeckRepository`: create, getById, getAll, update, delete
- [ ] `DeckCardRepository`: add, getByDeckId, getByStatus, update, delete, bulkUpdateStatus
- [ ] `CardRepository`: upsert, getById, getByIds, searchLocal (by name prefix)
- [ ] `TagRepository`: getAll, getByCategory, create, seedDefaults
- [ ] `SettingsRepository`: get, set, getAll
- [ ] All repos return typed promises; no UI logic

### Services

- [ ] `DeckService.createDeck({ name, format })`
- [ ] `DeckService.renameDeck(id, name)`
- [ ] `DeckService.deleteDeck(id)` — cascade delete deckCards
- [ ] `DeckCardService.addCard({ deckId, cardId, zone, status })`
- [ ] `DeckCardService.setStatus(deckCardId, status)`
- [ ] `DeckCardService.setQuantity(deckCardId, qty)`

### Initialization

- [ ] `DatabaseProvider` client component — opens DB on mount
- [ ] Seed default role/synergy tags if `tags` table empty
- [ ] Set `appMeta.schemaVersion` on first run
- [ ] Loading state while DB initializes

### React hooks

- [ ] `useDecks()` — live query or useEffect + state from Dexie
- [ ] `useDeckCards(deckId, statusFilter?)`
- [ ] Consider `dexie-react-hooks` or manual subscription pattern

### Export/import foundation

- [ ] `exportFullBackup(): Promise<AppBackup>`
- [ ] `importFullBackup(data: AppBackup): Promise<void>` — clear + bulk put (validation stub)
- [ ] `downloadBackupJson()` helper — trigger browser download

### Test utilities

- [ ] `fake-indexeddb` or Dexie test mode for Vitest
- [ ] Test: create deck, reload db instance, deck still exists
- [ ] Test: migration v1→v2 stub (empty upgrade)

### Wire minimal UI

- [ ] `/decks` page: list deck names from `useDecks()`
- [ ] "Create deck" button → prompts name → persists
- [ ] Prove reload persistence manually

## Implementation Notes

### SSR safety

Dexie runs client-only. Wrap DB access:

```tsx
"use client";
// DatabaseProvider only in client tree
```

### Cascade delete

When deleting a deck:

```ts
await db.transaction("rw", [db.decks, db.deckCards], async () => {
  await db.deckCards.where("deckId").equals(deckId).delete();
  await db.decks.delete(deckId);
});
```

### Default tag seed

Import role/synergy lists from Phase 0 product spec; insert with `category: 'role' | 'synergy'`.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 3 matrix.

- [ ] Install `fake-indexeddb`; configure `tests/setup/vitest.setup.ts`
- [ ] Create `vitest.workspace.ts` with `unit` and `integration` projects
- [ ] `tests/helpers/db-test-utils.ts`: `resetDatabase()`, `seedDeck()`
- [ ] **Unit tests:** backup serializer JSON shape, UUID format
- [ ] **Integration tests:** `deck-crud.test.ts`, `deck-card-status.test.ts`, `export-import-roundtrip.test.ts`, `migration-v1.test.ts`
- [ ] CI: `npm run test:unit` and `npm run test:integration` required on every PR
- [ ] No real network in tests

## Testing Checklist

- [ ] Create deck offline → visible in list
- [ ] Rename deck → name updated after reload
- [ ] Add `DeckCard` with mock `Card` record → persists
- [ ] Update status current → add → cut → consider → persists
- [ ] Delete deck → deckCards removed
- [ ] Export backup → valid JSON with all tables
- [ ] Import backup → data restored
- [ ] Unit tests pass with fake IndexedDB
- [ ] No Dexie calls in any `app/**/page.tsx` directly

## Exit Criteria

With network disabled:

```text
Create deck → Rename deck → Add local card record → Update card status → Reload page → Data remains
```

## Risks & Mitigations

| Risk                 | Mitigation                                            |
| -------------------- | ----------------------------------------------------- |
| Schema change later  | Migrations from v1; never edit v1 in place after ship |
| SSR hydration errors | Client-only DB provider                               |
| iOS storage quota    | Monitor size in Phase 10; don't store images in IDB   |

## Out of Scope

- Scryfall card fetch (Phase 4) — use manually inserted mock Card records for testing
- Full deck UI (Phase 5)
- Backup validation/Zod (Phase 10)
- Wishlist UI (Phase 12)

## Handoff to Next Phase

Before **Phase 4**:

1. All repositories and services exported from `lib/db/` and `lib/deck/`
2. `CardRepository.upsert()` ready for Scryfall normalization
3. `cards` table indexed by `oracleId` and `name`
4. Export foundation tested manually

Before **Phase 5**:

1. `DeckService` and `DeckCardService` CRUD complete
2. Default tags seeded
3. Hooks available for deck list and deck cards

Phase 4 agent implements Scryfall → `CardRepository.upsert()`.
Phase 5 agent builds full deck UI on top of services.
