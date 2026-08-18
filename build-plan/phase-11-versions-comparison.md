# Phase 11 — Versions & Comparison

## Agent Handoff Prompt

```
You are implementing Phase 11 (Versions & Comparison) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first: plans/mtg-deck-builder-web-app-build-plan.md (sections 18, 38, 9 deck lifecycle step 14)
Prior phases assumed complete: deck CRUD, deck cards with status/roles/synergies, dashboard, changes workflow (Phase 7), pricing (Phase 8), import/export includes deckVersions (Phase 10).

Deliverables:
1. DeckVersion model with full DeckSnapshot (not diff-only)
2. Save version: name + optional notes from deck dashboard
3. Version list UI per deck with timestamps
4. Restore version: replace current deck state with confirmation
5. Compare any two versions (or version vs current): additions, removals, quantity changes
6. Diff view component with Neo Brutalism styling (+ green additions, - red removals, ~ qty changes)
7. deck.activeVersionId tracking optional
8. Version service behind repository layer; no direct Dexie in UI
9. Unit tests for snapshot serialization and diff algorithm

Constraints:
- Snapshot must capture ALL deck-relevant state: deck metadata, all deckCards (incl. status, roles, notes)
- Restore is destructive to current list — confirm before apply
- Do not auto-version on every edit — explicit user action only
- Limit stored versions per deck (e.g. 50) with oldest prune warning

Exit: User saves "v2 — Added ramp", edits deck, compares v1 vs v2, sees +/- cards, restores v1 successfully.
```

## Overview

Phase 11 makes **deck iteration safe** by storing immutable point-in-time snapshots users can restore or compare. Deck-building is experimental — users try ADD/CUT proposals, playtest, and revert. Full snapshots (not diffs) simplify restore and allow arbitrary two-version comparison.

This phase completes the core workflow from the product vision: build → propose changes → review cost → apply → **save version**.

## Goal

Enable users to:

- **Save a named version** of the current deck with optional notes
- **View version history** for each deck chronologically
- **Restore** a previous version (replacing current deck cards)
- **Compare** two versions or version vs live deck
- See **additions**, **removals**, and **quantity changes** in a clear diff view
- Retain versions through **export/import** (Phase 10)

## Prerequisites

- Phase 3 complete: `deckVersions` Dexie table, migrations
- Phase 5 complete: full deck card model (status, zone, quantity, roles, synergies, notes, foil, owned)
- Phase 7 complete: apply changes workflow — users understand current vs proposed
- Phase 10 complete: backup includes `deckVersions`
- Phase 8–9 (soft): diff view may show price delta optional enhancement

## Dependencies on Previous Phases

| Prior Phase | Dependency                                                          |
| ----------- | ------------------------------------------------------------------- |
| Phase 3     | `deckVersions` table, `DeckVersion` type stub                       |
| Phase 5     | Deck + deckCards CRUD, deck metadata                                |
| Phase 7     | User workflow expects version save after apply changes              |
| Phase 8     | Optional: price comparison between versions (out of scope MVP diff) |
| Phase 9     | CardImage in diff rows follows display preferences                  |
| Phase 10    | Export/import preserves versions                                    |

## Duration Estimate

**4–5 days** for a single developer.

| Sub-task                       | Estimate  |
| ------------------------------ | --------- |
| Snapshot model + serialization | 0.5 day   |
| Version service + repository   | 1 day     |
| Save/list/restore UI           | 1 day     |
| Diff algorithm + compare UI    | 1.5 days  |
| Tests + integration            | 0.5–1 day |

## Architecture & Key Decisions

### Full snapshot vs diff storage

**Store full snapshot** in each `DeckVersion`:

```ts
interface DeckSnapshot {
  deck: Pick<Deck, "name" | "format" | "description" | "commanderId">;
  deckCards: DeckCardSnapshot[];
  capturedAt: string;
}

interface DeckCardSnapshot {
  cardId: string;
  quantity: number;
  zone: DeckCard["zone"];
  status: DeckCard["status"];
  foil?: boolean;
  owned?: boolean;
  notes?: string;
  roles: string[];
  synergies: string[];
}
```

**Exclude** from snapshot:

- `Deck.id`, `DeckCard.id` (regenerated on restore)
- Timestamps on individual deck cards (use version `createdAt`)
- Cached `Card` metadata (resolved live from `cards` table on display)
- Prices (always live/cached at view time)

**Rationale:** Restore = delete current deckCards + insert new from snapshot. Compare = diff two snapshot arrays.

### DeckVersion record

```ts
interface DeckVersion {
  id: string;
  deckId: string;
  name: string; // user label: "v2 — Added ramp"
  createdAt: string;
  snapshot: DeckSnapshot;
  notes?: string; // freeform playtest notes
}
```

Optional on `Deck`:

```ts
activeVersionId?: string;   // last restored or saved — informational badge only
```

### Version naming UX

Quick-save suggests auto-name:

```text
v{count + 1} — {date}
```

User can edit before save. Examples:

```text
v1 — Original
v2 — Added stronger ramp
v3 — Post-FNM update
```

### Restore behavior

1. User selects version → "Restore this version"
2. Confirmation modal:

```text
Replace current deck with "v2 — Added stronger ramp"?

Current unsaved changes will be lost.
Consider saving a version first.

[Cancel] [Save Current First] [Restore]
```

3. On confirm:
   - Optionally auto-save current state as "Auto-save before restore {timestamp}" (configurable setting — default OFF for MVP)
   - Delete all `deckCards` for `deckId`
   - Insert new deckCards from snapshot (new UUIDs)
   - Update `deck` metadata fields from snapshot.deck
   - Set `deck.activeVersionId = version.id`
   - Update `deck.updatedAt`

**Decision:** Restore does NOT delete other versions.

### Diff algorithm

Compare **set A** (baseline) vs **set B** (target) using composite key:

```ts
function deckCardKey(row: DeckCardSnapshot): string {
  return `${row.cardId}:${row.zone}`;
}
```

For each key:

| A       | B                                  | Diff type                                             |
| ------- | ---------------------------------- | ----------------------------------------------------- |
| absent  | present                            | **added**                                             |
| present | absent                             | **removed**                                           |
| present | present, qty differs               | **quantity_changed**                                  |
| present | present, status/roles/notes differ | **modified** (optional MVP: group as metadata change) |

**MVP diff categories:**

1. `added` — in B not A
2. `removed` — in A not B
3. `quantity_changed` — same card+zone, different qty
4. `status_changed` — same card+zone, different status (important for upgrade workflow)

Output:

```ts
interface VersionDiff {
  added: DiffEntry[];
  removed: DiffEntry[];
  quantityChanges: QuantityChangeEntry[];
  statusChanges: StatusChangeEntry[];
  summary: {
    addedCount: number;
    removedCount: number;
    quantityChangeCount: number;
    statusChangeCount: number;
  };
}

interface DiffEntry {
  cardId: string;
  zone: string;
  quantity: number;
  status?: string;
  // hydrated at UI: card name, image
}
```

Compare modes:

- Version A vs Version B
- Version A vs **current live deck** (snapshot taken at compare time from DB)
- Current vs saved "working copy" — not in MVP

### Version limit

- Max **50 versions per deck** (constant)
- On save #51: prompt to delete oldest or cancel
- Alternative: auto-prune oldest with toast warning (document choice — recommend prompt)

### Service API

```ts
interface VersionService {
  listVersions(deckId: string): Promise<DeckVersion[]>;
  getVersion(versionId: string): Promise<DeckVersion | undefined>;
  saveVersion(
    deckId: string,
    input: { name: string; notes?: string },
  ): Promise<DeckVersion>;
  restoreVersion(deckId: string, versionId: string): Promise<void>;
  compareVersions(aId: string, bId: string): Promise<VersionDiff>;
  compareVersionToCurrent(
    deckId: string,
    versionId: string,
  ): Promise<VersionDiff>;
  deleteVersion(versionId: string): Promise<void>;
  renameVersion(versionId: string, name: string, notes?: string): Promise<void>;
}
```

## Data Model Impact

### deckVersions table (finalize)

```ts
// Dexie
deckVersions: "id, deckId, createdAt";
```

### Deck table

Ensure `activeVersionId?: string` on Deck model — migration if missing.

### No new tables

Snapshots stored as JSON in `DeckVersion.snapshot` — ensure IndexedDB can handle ~100 cards × ~50 versions max across all decks (well within limits).

## Routes / Screens

| Route                                  | Purpose                                             |
| -------------------------------------- | --------------------------------------------------- |
| `/decks/[deckId]/versions`             | Version list + compare entry                        |
| `/decks/[deckId]/versions/[versionId]` | Version detail (read-only card list)                |
| `/decks/[deckId]/versions/compare`     | Compare picker + diff view                          |
| `/decks/[deckId]`                      | "Save Version" primary action; latest version badge |

Use query params for compare: `?a={versionId}&b={versionId}` or `?a={versionId}&b=current`.

## File Structure (files to create/modify)

### Create

```text
lib/versions/
  types.ts                    # DeckSnapshot, DeckCardSnapshot, VersionDiff
  snapshot.ts                 # captureSnapshot(deckId), applySnapshot(deckId, snapshot)
  diff.ts                     # diffSnapshots(a, b), diffSnapshotToCurrent
  version-service.ts
  constants.ts                # MAX_VERSIONS_PER_DECK

lib/db/repositories/
  deck-version-repository.ts  # CRUD, listByDeckId, countByDeckId

components/deck/
  deck-version-list.tsx
  deck-version-row.tsx
  save-version-dialog.tsx
  restore-version-dialog.tsx
  version-detail-view.tsx   # read-only card list from snapshot

components/deck/versions/
  version-compare-picker.tsx
  version-diff-view.tsx
  version-diff-summary.tsx
  version-diff-entry.tsx    # single +/- row with CardImage

hooks/
  use-deck-versions.ts
  use-version-diff.ts
  use-save-version.ts
  use-restore-version.ts

app/decks/[deckId]/versions/
  page.tsx
  compare/page.tsx
  [versionId]/page.tsx

tests/
  lib/versions/snapshot.test.ts
  lib/versions/diff.test.ts
  lib/versions/version-service.test.ts
```

### Modify

```text
types/deck.ts                 # DeckSnapshot types, activeVersionId
lib/db/schema.ts              # deckVersions indexes
components/deck/deck-header.tsx  # Save Version button
app/decks/[deckId]/page.tsx      # link to versions
lib/import-export/export-full-backup.ts  # verify deckVersions included
lib/import-export/import-full-backup.ts    # remap deckId on versions
```

## Detailed Task List

### 11.1 — Snapshot Types & Capture

- [ ] Define `DeckSnapshot`, `DeckCardSnapshot` in `lib/versions/types.ts`
- [ ] Implement `captureSnapshot(deckId): Promise<DeckSnapshot>`
  - [ ] Load deck + all deckCards
  - [ ] Strip runtime IDs from card rows in snapshot copy
  - [ ] Include commander in deckCards if zone commander
  - [ ] Set `capturedAt` ISO timestamp
- [ ] Unit test: snapshot includes all zones and statuses

### 11.2 — Apply Snapshot (Restore)

- [ ] Implement `applySnapshot(deckId, snapshot): Promise<void>` in transaction
  - [ ] Update deck metadata fields
  - [ ] Delete existing deckCards for deckId
  - [ ] Bulk insert new deckCards with fresh UUIDs
  - [ ] Preserve cardId references to global cards table
- [ ] Unit test: restore round-trip equals original deck state

### 11.3 — Deck Version Repository

- [ ] `create(version: DeckVersion): Promise<string>`
- [ ] `getById(id): Promise<DeckVersion | undefined>`
- [ ] `listByDeckId(deckId, { order: 'desc' }): Promise<DeckVersion[]>`
- [ ] `countByDeckId(deckId): Promise<number>`
- [ ] `update(id, partial): Promise<void>` — rename, notes
- [ ] `delete(id): Promise<void>`
- [ ] Index by deckId + createdAt

### 11.4 — Version Service

- [ ] Implement `saveVersion(deckId, { name, notes })`:
  - [ ] Check MAX_VERSIONS limit
  - [ ] captureSnapshot → create DeckVersion
  - [ ] Update deck.activeVersionId
- [ ] Implement `restoreVersion(deckId, versionId)` with confirmation delegated to UI
- [ ] Implement `listVersions`, `getVersion`, `deleteVersion`, `renameVersion`
- [ ] Implement `compareVersions(aId, bId)`
- [ ] Implement `compareVersionToCurrent(deckId, versionId)`

### 11.5 — Diff Engine

- [ ] Implement `diffSnapshots(a: DeckSnapshot, b: DeckSnapshot): VersionDiff`
- [ ] Key by `cardId:zone`
- [ ] Detect added, removed, quantity changes
- [ ] Detect status changes (current → add, etc.)
- [ ] Optional: detect role/synergy array changes as `metadataChanges`
- [ ] Summary counts
- [ ] Unit tests:
  - [ ] Identical snapshots → empty diff
  - [ ] One card added
  - [ ] One card removed
  - [ ] Quantity 2 → 1
  - [ ] Same card mainboard vs sideboard → removed + added (zone change)
  - [ ] Status-only change

### 11.6 — Save Version Dialog

- [ ] Trigger from deck dashboard "Save Version" button
- [ ] Fields: name (required), notes (optional textarea)
- [ ] Default name suggestion: `v{N} — {Mon DD, YYYY}`
- [ ] Show snapshot summary: "{N} cards · {format}"
- [ ] Save → toast "Version saved"
- [ ] Error when at version limit

### 11.7 — Version List Page

- [ ] Route `/decks/[deckId]/versions`
- [ ] List sorted newest first
- [ ] Row: name, createdAt relative, card count, notes preview
- [ ] Actions per row: View, Compare, Restore, Rename, Delete
- [ ] Empty state: "No saved versions yet"
- [ ] Compare button → navigate to compare picker

### 11.8 — Version Detail Page

- [ ] Route `/decks/[deckId]/versions/[versionId]`
- [ ] Read-only card list from snapshot (reuse deck-card-row in read-only mode)
- [ ] Header: version name, date, notes
- [ ] Actions: Restore, Compare to current, Delete

### 11.9 — Compare UI

- [ ] Compare picker: dropdown Version A, dropdown Version B (or "Current deck")
- [ ] Route `/decks/[deckId]/versions/compare?a=&b=`
- [ ] Summary bar: `+ 7 cards · - 7 cards · 2 qty changes`
- [ ] Sections: Added (green), Removed (red), Quantity changes (yellow), Status changes (blue)
- [ ] Each entry: CardImage thumbnail, name, qty, zone, status badge
- [ ] Tap entry → card detail sheet

### 11.10 — Restore Confirmation

- [ ] Modal with version name and warning
- [ ] Optional link "Save current version first" opens save dialog
- [ ] On success: navigate to deck dashboard, toast "Restored v2"
- [ ] Invalidate all deck-related queries

### 11.11 — Deck Dashboard Integration

- [ ] "Save Version" in primary actions
- [ ] Badge: "Based on v3" if activeVersionId set and deck modified since (compare updatedAt > version.createdAt)
- [ ] Link "Version history" → versions list
- [ ] Post-apply changes prompt (Phase 7): "Save a version?" after successful apply

### 11.12 — Import/Export Compatibility

- [ ] Verify full backup includes deckVersions
- [ ] On deck-only import: remap version deckIds and version ids
- [ ] On full import: versions linked to imported deck ids
- [ ] Test: export with versions → import → versions accessible

### 11.13 — Delete Version

- [ ] Confirm dialog: "Delete v2 permanently?"
- [ ] If activeVersionId matches, clear activeVersionId on deck
- [ ] No cascade to deck cards

### 11.14 — Rename & Notes Edit

- [ ] Inline edit or dialog for version name/notes
- [ ] Does not create new snapshot — metadata only

## Implementation Notes

### Snapshot size

Average Commander deck ~100 cards × ~200 bytes JSON ≈ 20KB per version. 50 versions ≈ 1MB per deck — acceptable.

### Diff display: zone changes

Moving card mainboard → sideboard appears as remove + add. Optionally detect as "moved" in v1.1 — document as known limitation in UI footnote.

### Status changes in diff

Critical for upgrade workflow comparison:

```text
v3 → v4 (current)

Status changes:
  Skullclamp: consider → add
  Sol Ring: current → cut
```

### Read-only deck list from snapshot

Map `DeckCardSnapshot` → pseudo `DeckCard` for row component:

```ts
function snapshotRowToDeckCard(row: DeckCardSnapshot, deckId: string): DeckCard;
```

Generate temporary ids for React keys.

### TanStack Query keys

```ts
["deck-versions", deckId][("deck-version", versionId)][
  ("version-diff", aId, bId | "current")
];
```

### Neo Brutalism diff styling

- Added section: green accent border-left, `+` prefix
- Removed section: red accent, `-` prefix
- Qty change: yellow, show `1 → 3`
- Monospace quantities in summary

### Performance

Diff is O(n) with Map — fine for 200-card decks. Hydrate card names async from cards table.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 11 matrix.

- [ ] **Unit tests:** version diff engine — additions, removals, quantity changes, status changes
- [ ] **Integration tests:** save version → snapshot matches live deck
- [ ] **Integration tests:** restore version → deck cards replaced atomically
- [ ] **Integration tests:** version included in full backup export/import
- [ ] Edge case tests: restore while pending ADD/CUT changes

## Testing Checklist

### Unit tests

- [ ] captureSnapshot + applySnapshot round-trip
- [ ] diff: empty ↔ populated
- [ ] diff: quantity change only
- [ ] diff: status change ADD vs CURRENT
- [ ] diff: zone move = remove + add
- [ ] MAX_VERSIONS enforcement

### Integration tests

- [ ] saveVersion creates row in deckVersions
- [ ] restoreVersion replaces deckCards count and content
- [ ] compareVersionToCurrent after live edit shows diff
- [ ] deleteVersion removes record only

### Manual

- [ ] Save version → edit deck → compare shows changes
- [ ] Restore v1 → deck matches v1 card list and statuses
- [ ] Version list survives page reload
- [ ] Export/import preserves versions (with Phase 10)
- [ ] Save version after Apply Changes workflow (Phase 7)

### Edge cases

- [ ] Save version on empty deck
- [ ] Restore version when cards missing from local cache (show name from snapshot cardId lookup fail gracefully)
- [ ] Two versions same name allowed (discouraged but not blocked)

## Exit Criteria

- [ ] User can save named version with optional notes
- [ ] Version list shows history per deck
- [ ] Restore replaces current deck with snapshot after confirmation
- [ ] Compare two versions shows additions, removals, quantity changes
- [ ] Compare version vs current deck works
- [ ] Diff view uses CardImage + card names (hydrated from cache)
- [ ] Versions included in full backup export/import
- [ ] Version limit enforced with user-facing message
- [ ] Unit tests pass for snapshot and diff
- [ ] Deck dashboard has Save Version action

## Risks & Mitigations

| Risk                                      | Mitigation                                                   |
| ----------------------------------------- | ------------------------------------------------------------ |
| User restores without saving current work | Strong confirm modal; optional "save first" button           |
| Snapshot stale vs card reprints           | cardId is printing-specific; restore preserves printing      |
| Large version history storage             | 50 version cap per deck                                      |
| Diff noise from zone moves                | Document; future "moved" detection                           |
| activeVersionId confusion                 | Badge "Modified since v3" when updatedAt > version.createdAt |

## Out of Scope

- Automatic versioning on timer or every edit
- Branching/merging versions
- Diff of prices between versions
- Export single version as deck file (use Phase 10 deck export from snapshot view — optional nice-to-have)
- Version tags/labels beyond name and notes
- Collaborative shared versions
- Visual side-by-side dual column compare (summary diff only MVP)

## Handoff to Next Phase

**Phase 12 (Wishlist)** is independent but shares patterns:

- Reuse list row components from version detail
- Version compare diff UI patterns applicable to wishlist → ADD promotion

**Phase 13 (Validation)** should run on restored decks — hook `applySnapshot` to trigger validation refresh.

**Phase 14 (UX Polish)** may add animations to diff sections and save-version success confetti (optional).

Deliverables for handoff:

- `VersionService` exported from `lib/versions/version-service.ts`
- `captureSnapshot` / `diffSnapshots` available for future automated testing
- Document snapshot schema version inside `DeckSnapshot` if format evolves: `snapshotVersion: 1`

Recommended post-Phase-11 user flow (validate end-to-end):

```text
Edit deck → Mark ADD/CUT → Apply changes → Save version → Continue experimenting → Compare → Restore if needed
```
