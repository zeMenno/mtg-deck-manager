# Phase 10 — Import/Export & Recovery

## Agent Handoff Prompt

```
You are implementing Phase 10 (Import/Export & Recovery) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first: plans/mtg-deck-builder-web-app-build-plan.md (sections 3, 30, 31, 67)
Prior phases assumed complete: full Dexie schema with migrations, deck CRUD, Scryfall card resolution, settings (display, pricing), deck versions table (schema exists; population may be Phase 11).

Deliverables:
1. Full application JSON backup export/import with schema version and metadata
2. Single-deck export: JSON, human-readable text list, CSV
3. Single-deck import: JSON, text decklist (Arena/MTGO/Moxfield-style name lists), CSV
4. Import validation with clear error messages (never silently corrupt data)
5. Settings → Data page: export, import, clear all, storage info, last backup timestamp
6. Destructive action confirmation UX (export-first flow for clear data)
7. iOS Home Screen storage warning (Safari vs installed app separate storage)
8. Wire export/import into deck dashboard and deck list actions

Constraints:
- Local-first: export is the user's disaster recovery — must be reliable
- Do NOT include binary images in JSON backups
- Validate backup version; reject or migrate unsupported versions with user message
- Max import file size guard (e.g. 50MB) with readable error
- Use Web Share API / download blob on mobile where supported

Exit: User exports all data, clears app, imports backup, all decks/settings restored identically.
```

## Overview

Phase 10 makes **local-only storage safe for real use** by treating export/import as a first-class product feature. Users on iPhone must understand that data lives on-device, that Home Screen app storage is separate from Safari, and that regular backups are their responsibility.

This phase builds on Phase 3's export/import foundations and delivers the complete **Settings → Data** management surface.

## Goal

Enable users to:

- Export **all application data** as a portable JSON file
- Export/import a **single deck** in multiple formats
- Import text decklists when creating or updating a deck
- See **last backup date** and approximate storage usage
- **Clear all data** only after explicit confirmation (with export-first prompt)
- Understand **iOS storage isolation** between Safari and installed PWA
- Recover from device loss via backup file on iCloud Files / email / computer

## Prerequisites

- Phase 3 complete: Dexie schema, migrations, repository layer, `appMeta` table
- Phase 4 complete: Scryfall card resolution for import name → card ID
- Phase 5 complete: deck CRUD, deck cards, duplicate deck
- Phase 8 complete: pricing settings in export
- Phase 9 complete: display preferences in export
- Migration system with version number in `appMeta`

## Dependencies on Previous Phases

| Prior Phase     | Dependency                                            |
| --------------- | ----------------------------------------------------- |
| Phase 3         | All Dexie tables, migration runner, repositories      |
| Phase 4         | Resolve imported card names to Scryfall IDs           |
| Phase 5         | Deck/deckCard creation during import                  |
| Phase 8         | `pricing.currency` in settings export                 |
| Phase 9         | `display.*` in settings export                        |
| Phase 11 (soft) | `deckVersions` table included in backup even if empty |

## Duration Estimate

**4–6 days** for a single developer.

| Sub-task                                  | Estimate |
| ----------------------------------------- | -------- |
| Backup schema + full export               | 1 day    |
| Full import + validation + merge strategy | 1.5 days |
| Single-deck formats (JSON/text/CSV)       | 1 day    |
| Text decklist parser                      | 1 day    |
| Settings/Data UI + destructive UX         | 1 day    |
| iOS testing + edge cases                  | 0.5 day  |

## Architecture & Key Decisions

### Backup file format

```ts
interface AppBackup {
  backupVersion: 1; // increment on breaking backup schema changes
  appSchemaVersion: number; // Dexie migration version from appMeta
  exportedAt: string; // ISO 8601
  exportedFrom: {
    userAgent?: string;
    appUrl?: string;
    displayMode?: "browser" | "standalone";
  };
  metadata: {
    deckCount: number;
    cardCount: number;
    versionCount: number;
    wishlistItemCount: number;
  };
  data: {
    decks: Deck[];
    deckCards: DeckCard[];
    deckVersions: DeckVersion[];
    cards: Card[]; // locally cached metadata only
    cardPrices: CardPrice[];
    tags: Tag[];
    wishlistItems: WishlistItem[];
    settings: AppSetting[];
    appMeta: AppMeta[];
  };
}
```

**Filename convention:**

```text
mtg-deck-builder-backup-2026-08-18.json
```

**Decision:** Full replace on import (not merge) for MVP — simpler and predictable. Offer "Import as new decks" vs "Replace all data" modes.

### Import modes

| Mode                 | Behavior                                                    |
| -------------------- | ----------------------------------------------------------- |
| **Replace all**      | Clear all tables → import backup → run migrations if needed |
| **Import deck only** | Add deck with new IDs if name collision, or prompt rename   |
| **Merge settings**   | Optional checkbox on full import — default off              |

### Schema version handling

1. Read `backupVersion` — if > supported, show "Backup from newer app version, please update"
2. Read `appSchemaVersion` — if backup older, run forward migrations on imported data in memory before write
3. Store `backupVersion` history in `appMeta.lastImport`

### Validation pipeline

```text
File selected
  → parse JSON (catch syntax error)
  → validate shape (Zod schema)
  → validate referential integrity (deckCard.deckId exists in decks)
  → validate card references (optional: queue Scryfall resolution for missing cards)
  → preview summary UI
  → user confirms
  → transactional write (Dexie transaction)
```

**Never** partially import decks without user acknowledgment.

### Single deck export formats

#### JSON

```ts
interface DeckExport {
  exportVersion: 1;
  exportedAt: string;
  deck: Deck;
  deckCards: DeckCard[];
  cards: Card[]; // referenced printings only
}
```

#### Text (human-readable)

```text
// Soldier Swarm
// Commander: Adeline, Resplendent Cathar
// Format: Commander

1 Adeline, Resplendent Cathar *CMDR*
1 Adeline's Token
...

SIDEBOARD:
1 Rest in Peace

// ADD
1 Skullclamp
```

Support common conventions: `*CMDR*`, `//`, `#`, `SB:` section headers.

#### CSV

```csv
quantity,name,set,code,status,zone,foil,owned,notes,roles,synergies
1,"Adeline, Resplendent Cathar",,,current,commander,false,true,,"Anthem","Soldier,Token"
```

### Text decklist import parser

Create `lib/import-export/text-decklist-parser.ts`:

- [ ] Split mainboard / sideboard / maybeboard / commander
- [ ] Parse lines: `1 Card Name (SET) 123` Moxfield style optional
- [ ] Parse `1x Card Name`
- [ ] Skip blank lines and comments
- [ ] Return `{ zone, quantity, name, setCode?, collectorNumber? }[]`
- [ ] Unresolved names → import report with "12 cards not found"

Resolve via Scryfall fuzzy search (`/cards/named?fuzzy=`) with rate limiting.

### Destructive clear flow

```text
[ Clear All Data ]

Modal:
  This permanently removes all decks on this device.

  Export a backup first.

  [ Cancel ]  [ Export & Continue ]  [ Delete Without Export ]
```

**Delete Without Export** requires typing `DELETE` or second confirmation checkbox.

### iOS storage warning

Persistent banner or callout on Settings → Data:

```text
⚠ iPhone Storage Note

If you use Safari and also install this app to your Home Screen,
they store data separately. Build decks in one place, or export before switching.

Install to Home Screen before importing large collections.
```

Link to install help from Phase 2.

### Last backup tracking

On successful export:

```ts
await appMetaRepository.set("lastBackupAt", new Date().toISOString());
await appMetaRepository.set("lastBackupDeckCount", deckCount);
```

Display:

```text
Last backup: Aug 18, 2026 · 5 decks
Never backed up  ← warning styling if > 7 days or never
```

### Storage size estimate

Use `navigator.storage.estimate()` when available:

```text
Local storage: ~2.4 MB used
```

Fallback: sum JSON serialized table sizes (approximate).

## Data Model Impact

### appMeta additions

```ts
'lastBackupAt': string
'lastBackupDeckCount': number
'lastImportAt': string
'dbSchemaVersion': number
```

### No new Dexie tables

Import/export uses existing tables. Ensure `deckVersions` and `wishlistItems` included even if Phase 11/12 not fully UI-complete.

## Routes / Screens

| Route            | Purpose                              |
| ---------------- | ------------------------------------ |
| `/settings/data` | Primary data management page         |
| `/settings`      | Link to Data + summary (last backup) |
| Deck dashboard   | Export deck action                   |
| `/decks`         | Import deck action (file picker)     |
| Create deck flow | "Import from text" option            |

## File Structure (files to create/modify)

### Create

```text
lib/import-export/
  types.ts                      # AppBackup, DeckExport, ImportResult
  backup-schema.ts              # Zod schemas
  backup-version.ts             # CURRENT_BACKUP_VERSION constant
  export-full-backup.ts
  import-full-backup.ts
  export-deck.ts                # json, text, csv generators
  import-deck.ts
  text-decklist-parser.ts
  csv-deck-parser.ts
  validate-backup.ts
  resolve-import-cards.ts       # Scryfall fuzzy resolution queue
  id-remap.ts                   # regenerate IDs on import-as-new
  download-file.ts              # blob download + Web Share API
  read-file.ts                  # FileReader wrapper

components/settings/
  data-management.tsx           # main settings data page
  backup-export-button.tsx
  backup-import-button.tsx
  clear-data-dialog.tsx
  import-preview-dialog.tsx
  ios-storage-warning.tsx
  storage-usage-card.tsx
  last-backup-status.tsx

components/deck/
  deck-export-menu.tsx          # JSON / Text / CSV dropdown
  deck-import-dialog.tsx
  text-decklist-import.tsx

tests/
  lib/import-export/text-decklist-parser.test.ts
  lib/import-export/validate-backup.test.ts
  lib/import-export/export-deck.test.ts
  lib/import-export/id-remap.test.ts
```

### Modify

```text
lib/db/database.ts              # transaction helpers for bulk import
lib/db/repositories/*           # bulkPut methods if missing
app/settings/data/page.tsx
app/settings/page.tsx
app/decks/[deckId]/page.tsx     # export action
app/decks/page.tsx              # import deck
components/settings/data-management.tsx (from Phase 3 stub)
```

## Detailed Task List

### 10.1 — Backup Schema & Validation

- [ ] Define `AppBackup` TypeScript interface
- [ ] Create Zod schema `AppBackupSchema` with strict unknown key rejection optional
- [ ] Define `CURRENT_BACKUP_VERSION = 1`
- [ ] Create `validateBackup(data): ValidationResult` with field-level errors
- [ ] Validate referential integrity: every `deckCard.deckId` ∈ decks
- [ ] Validate every `deckCard.cardId` has matching `Card` in backup OR flag for resolution
- [ ] Unit tests: valid backup, missing decks, malformed JSON, wrong version

### 10.2 — Full Export

- [ ] Implement `exportFullBackup(): Promise<AppBackup>`
- [ ] Read all tables from repositories
- [ ] Compute metadata counts
- [ ] Capture `exportedFrom.displayMode` via `window.matchMedia('(display-mode: standalone)')`
- [ ] Serialize to JSON string (pretty-print optional toggle)
- [ ] Exclude large/transient fields if any identified
- [ ] **Do not** embed image binary or base64
- [ ] Update `lastBackupAt` on successful download/share

### 10.3 — Download & Share

- [ ] Implement `downloadJson(filename, data)` via Blob + anchor click
- [ ] Implement Web Share API fallback for iOS: `navigator.share({ files: [file] })`
- [ ] Handle share cancellation gracefully
- [ ] Filename includes date: `mtg-deck-builder-backup-YYYY-MM-DD.json`

### 10.4 — Full Import

- [ ] File picker input (`accept=".json,application/json"`)
- [ ] Parse and validate before any write
- [ ] Preview dialog: deck names, counts, export date, schema version
- [ ] Import mode selector: Replace all (default)
- [ ] Dexie transaction: clear tables → bulkPut all entities
- [ ] Run migration normalizer if `appSchemaVersion` < current
- [ ] On success: update `lastImportAt`, toast confirmation
- [ ] On failure: rollback transaction, show error, data unchanged

### 10.5 — Single Deck Export

- [ ] `exportDeckJson(deckId): Promise<DeckExport>`
- [ ] `exportDeckText(deckId): string` — grouped by zone, commander first
- [ ] `exportDeckCsv(deckId): string`
- [ ] Include ADD/CUT/CONSIDER status in exports (comment or column)
- [ ] Deck dashboard menu: Export → JSON / Text / CSV

### 10.6 — Single Deck Import

- [ ] Import deck JSON: validate `DeckExport` schema
- [ ] Remap IDs when importing into existing app (`id-remap.ts`)
- [ ] Name collision: append " (imported)" or prompt user
- [ ] Import text decklist into new or existing deck
- [ ] Import CSV with header row validation
- [ ] Return `ImportResult`: `{ added, updated, unresolved: { name, line }[] }`

### 10.7 — Text Decklist Parser

- [ ] Parse commander indicators: `*CMDR*`, `CMDR:`, `[Commander]`
- [ ] Parse sideboard: `Sideboard:`, `SB:`, `// Sideboard`
- [ ] Parse quantity prefixes: `1`, `1x`, `1 x`
- [ ] Handle UTF-8 and smart quotes in card names
- [ ] Unit tests with Arena export sample, simple list, commented list

### 10.8 — Card Resolution on Import

- [ ] Queue unresolved card names to Scryfall fuzzy search
- [ ] Throttle requests; show progress in import dialog
- [ ] Allow user to skip unresolved cards or pick printing from disambiguation
- [ ] Cache resolved cards to local `cards` table

### 10.9 — Settings Data Page UI

- [ ] Create `/settings/data` page with sections:
  - [ ] iOS storage warning (top)
  - [ ] Last backup status
  - [ ] Storage usage estimate
  - [ ] Export All Data button
  - [ ] Import Backup button
  - [ ] Clear All Data button (destructive styling)
- [ ] Neo Brutalism: yellow warning box for iOS note, red for destructive

### 10.10 — Destructive Confirmation UX

- [ ] Clear data dialog with three paths: Cancel, Export & Continue, Delete Without Export
- [ ] Export & Continue triggers download then clear on success
- [ ] Delete Without Export: require confirmation checkbox "I understand this cannot be undone"
- [ ] Log clear event to appMeta (not PII)

### 10.11 — Import Preview Dialog

- [ ] Show backup metadata before confirm
- [ ] Warning if Replace all: "This replaces X existing decks"
- [ ] List deck names in scrollable area
- [ ] Confirm / Cancel buttons

### 10.12 — Wire Deck List & Dashboard

- [ ] `/decks` overflow menu: Import deck
- [ ] Deck dashboard: Export deck submenu
- [ ] Create deck wizard: "Paste decklist" textarea + import button

### 10.13 — Error Handling

- [ ] Invalid JSON: "Backup file is not valid JSON"
- [ ] Wrong backupVersion: version-specific message
- [ ] Storage quota exceeded on import: catch QuotaExceededError, advise export cleanup
- [ ] Partial Scryfall failure: complete import with unresolved report

### 10.14 — Security

- [ ] Reject backup with unexpected binary fields
- [ ] Limit JSON depth/size before parse (50MB max)
- [ ] Sanitize deck names for XSS on display (React default escaping)
- [ ] No eval() on import

## Implementation Notes

### Dexie bulk import transaction

```ts
await db.transaction('rw', [db.decks, db.deckCards, ...], async () => {
  await db.decks.clear();
  await db.decks.bulkPut(backup.data.decks);
  // ...
});
```

Ensure order: decks before deckCards, cards before deckCards if FK-like validation.

### ID remapping on deck-only import

When importing deck JSON into app with potential ID collisions:

```text
oldDeckId → newDeckId (uuid)
oldDeckCardId → newDeckCardId
deckId references updated
cardId preserved if card exists globally else import card row
```

### CSV escaping

Use proper CSV escaping for card names with commas: `"Jace, the Mind Sculptor"`.

### iOS file picker

`<input type="file" accept=".json">` works in standalone PWA on iOS 17+. Test Files app integration.

### Backup without wishlist (pre-Phase 12)

Include empty `wishlistItems: []` — schema forward-compatible.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 10 matrix.

- [ ] Create `tests/fixtures/backups/`: valid-v1.json, corrupt-*.json, truncated.json, wrong-schema.json
- [ ] **Unit tests:** export produces valid JSON with `schemaVersion` and all tables
- [ ] **Unit tests:** text decklist parser (1x, 2x, suffix/prefix quantity formats)
- [ ] **Unit tests:** CSV export column headers
- [ ] **Integration tests:** full round-trip export → import → data equality
- [ ] **Integration tests:** corrupt import fails safely with user-facing error (no partial corrupt state)
- [ ] **TestCafe:** `tests/e2e/export-import.test.ts` — export, clear, import, deck restored
- [ ] Add `data-testid`: `export-all-btn`, `import-backup-input`, `clear-all-btn`

## Testing Checklist

### Unit tests

- [ ] Text parser: commander, sideboard, comments, quantity variants
- [ ] CSV parser: quoted names, status column
- [ ] validateBackup rejects orphan deckCards
- [ ] exportDeckText round-trip name list (manual fixture)
- [ ] id-remap produces unique IDs

### Integration tests

- [ ] Export full → clear all → import → deck count matches
- [ ] Export deck → import as new → two decks exist
- [ ] Import invalid JSON → no data mutation
- [ ] Replace all import in transaction rolls back on error

### Manual / iPhone

- [ ] Export via Share sheet to Files app
- [ ] Import from Files app
- [ ] Clear all with Export & Continue flow
- [ ] iOS warning visible on data page
- [ ] lastBackupAt updates after export
- [ ] Standalone PWA: backup/restore cycle

### Corruption tests

- [ ] Truncated JSON file
- [ ] Backup with missing decks array
- [ ] Backup from fake future version

## Exit Criteria

- [ ] Full JSON backup exports all tables with `backupVersion` and metadata
- [ ] Full import restores data identically after clear
- [ ] Single deck export works in JSON, text, and CSV
- [ ] Text decklist import resolves cards via Scryfall (with unresolved report)
- [ ] `/settings/data` page complete with export, import, clear, storage info
- [ ] Destructive clear requires explicit confirmation; export-first path available
- [ ] iOS Home Screen storage warning displayed
- [ ] Last backup timestamp tracked and shown
- [ ] No image binary in backup files
- [ ] Validation prevents silent data corruption

## Risks & Mitigations

| Risk                           | Mitigation                                              |
| ------------------------------ | ------------------------------------------------------- |
| User loses data without backup | Prominent warnings, never backup nag, last backup date  |
| iOS separate storage pools     | Persistent iOS warning; install-first onboarding        |
| Large backup fails on mobile   | Stream stringify if needed; size estimate before import |
| Card name resolution failures  | Import report + manual fix in deck                      |
| Schema drift                   | backupVersion + appSchemaVersion + migration on import  |
| Accidental clear               | Multi-step confirm; Export & Continue default highlight |

## Out of Scope

- Moxfield/Archidekt URL import
- Encrypted backups
- Cloud backup (iCloud auto-sync)
- Incremental/sync merge import
- Import from clipboard without file picker (nice-to-have later)
- Automatic scheduled backups
- Email backup integration

## Handoff to Next Phase

**Phase 11 (Versions & Comparison)** depends on `deckVersions` being included in backup/export. Ensure:

- `DeckVersion` snapshots serialize fully in `AppBackup`
- Single deck JSON export optionally excludes versions (or includes if present)
- Import remaps `deckVersion.deckId` when deck IDs change

Phase 11 will add version creation UI — Phase 10 must not strip `deckVersions` table on import.

Deliverables for handoff:

- `exportFullBackup()` / `importFullBackup()` service API
- `AppBackup` type exported from `lib/import-export/types.ts`
- Document backup format in code comments for future version bumps
