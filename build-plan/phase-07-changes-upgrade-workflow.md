# Phase 07 — Changes & Upgrade Workflow

## Agent Handoff Prompt

```
You are implementing Phase 7 (Changes & Upgrade Workflow) of the MTG Deck Builder web app.

Workspace: mtg-deck-manager
Read first:
- plans/mtg-deck-builder-web-app-build-plan.md (sections 8, 9, 14, 15, 16, 68)
- build-plan/phase-05-deck-management.md (DeckCard statuses, services)
- build-plan/phase-06-deck-dashboard-statistics.md (projected stats, getProjectedDeckCards)
- build-plan/phase-07-changes-upgrade-workflow.md (this document — follow it completely)

Prerequisites: Phases 0–6 complete.

Your mission:
1. Build /decks/[deckId]/changes hub with ADD/CUT/CONSIDER views.
2. Implement Need-to-Add screen (all status=add cards with summary bar).
3. Implement Cards-to-Cut screen (all status=cut cards).
4. Implement Projected Deck view: CURRENT + ADD - CUT with count validation.
5. Implement replacement relationships (link CUT card → ADD replacement).
6. Implement Apply Changes workflow with review/confirm step (promote ADD→current, remove CUT).
7. Add sticky upgrade summary bar during editing.

Do NOT implement live pricing/upgrade cost totals (Phase 8) — show placeholders or card counts only.
Do NOT implement version snapshots on apply (Phase 11) — optional hook stub OK.

Exit criteria: User can build a full upgrade proposal (ADD/CUT/CONSIDER), preview projected deck, review, and apply changes atomically.

When done, verify against the Testing Checklist and Exit Criteria in this document.
```

## Overview

Phase 7 delivers the **core product differentiator**: tracking deck upgrades as a structured workflow rather than scattered notes. Users mark candidates CONSIDER, promote to ADD, mark existing cards CUT, link replacements, preview the projected 100-card deck, and **apply changes** in one atomic operation that promotes ADD → CURRENT and removes CUT cards.

All state lives in the existing `deckCards` table with `status` field — no parallel "upgrade list" database. Views are filters; the projected deck is a computed view using the same logic as Phase 6's `getProjectedDeckCards()`.

## Goal

Implement the complete ADD / CUT / CONSIDER upgrade workflow with dedicated screens, projected deck preview, replacement relationships, and a safe apply-changes operation.

## Prerequisites

- **Phase 5:** Status marking, deck card services, `/decks/[deckId]/cards` with status filters.
- **Phase 6:** Projected deck card filter, status counts, deck warnings for projected mode.
- **Phase 4:** Card metadata for display rows.
- **Phase 3:** Dexie transactions for atomic apply.

## Dependencies on Previous Phases

| Prior Phase | What Phase 7 Consumes                                                                        |
| ----------- | -------------------------------------------------------------------------------------------- |
| Phase 5     | `DeckCard.status`, `setStatus`, `bulkSetStatus`, `removeCardFromDeck`                        |
| Phase 5     | `DeckCardRow`, `DeckCardActionsSheet`, mobile bottom sheets                                  |
| Phase 6     | `getProjectedDeckCards()`, `computeDeckStats(..., 'projected')`, `getDeckWarnings` projected |
| Phase 6     | `DeckStatusSummary`, dashboard links                                                         |
| Phase 1     | Confirm dialog, toast with undo                                                              |

## Duration Estimate

| Skill Level | Estimate  |
| ----------- | --------- |
| Experienced | 5–7 days  |
| Moderate    | 7–10 days |

Breakdown:

- Changes hub + routing: 0.5 day
- Need-to-add + cards-to-cut screens: 1.5–2 days
- Projected deck view: 1–1.5 days
- Replacement relationships data + UI: 1–1.5 days
- Apply changes transaction + review: 1.5–2 days
- Sticky summary + polish: 0.5–1 day

## Architecture & Key Decisions

### Status workflow (state machine)

```text
                    ┌─────────────┐
                    │  consider   │
                    └──────┬──────┘
              promote      │      dismiss
                    ┌──────▼──────┐
         ┌──────────│     add     │──────────┐
         │          └─────────────┘          │
    demote to                           apply changes
    consider                                  │
         │          ┌─────────────┐            │
         └──────────│   current   │◄─────────┘
                    └──────┬──────┘
                      mark cut
                    ┌──────▼──────┐
                    │     cut     │─── apply ──► removed from deck
                    └─────────────┘
```

- **CONSIDER** — evaluation queue; not counted in projected deck.
- **ADD** — committed intent to acquire; included in projected deck.
- **CUT** — committed intent to remove; excluded from projected deck; still `current` until apply (still in physical deck until user buys/sleeps changes).
- **Apply** — ADD → CURRENT; CUT rows deleted (or archived — **decision: delete**); CONSIDER unchanged.

### Projected deck formula

```text
PROJECTED = { cards where status ∈ {current, add} AND status ≠ cut }
           = getProjectedDeckCards(deckCards)
```

Equivalent set logic:

- Include: `current`, `add`
- Exclude: `cut`
- Exclude: `consider`

After apply:

- Former ADD → `current`
- CUT rows removed entirely

### Replacement relationships

Link a CUT card to its intended ADD replacement for UX clarity ("cutting X for Y").

**Option A — field on DeckCard (recommended):**

```ts
interface DeckCard {
  // ... existing
  replacementDeckCardId?: string; // CUT card points to ADD deckCard id
  // OR bidirectional:
  replacesDeckCardId?: string; // ADD card points to CUT deckCard id
}
```

Use **ADD → CUT** direction (`replacesDeckCardId` on ADD row): one ADD replaces at most one CUT; CUT can have multiple ADD candidates (user picks).

**Option B — separate `deckCardLinks` table** — overkill for MVP.

UI on Cards-to-Cut screen:

```text
Lightning Greaves  [CUT]
  � replace with →  Stoneforge Mystic [ADD]
```

Picker: select from current ADD list or search new card.

### Apply changes — atomic transaction

```ts
async function applyChanges(deckId: string): Promise<ApplyChangesResult> {
  return db.transaction("rw", db.deckCards, db.decks, async () => {
    const cards = await DeckCardRepository.listByDeck(deckId);
    const toPromote = cards.filter((c) => c.status === "add");
    const toRemove = cards.filter((c) => c.status === "cut");

    // 1. Promote ADD → current (clear replacesDeckCardId optional)
    for (const card of toPromote) {
      await DeckCardRepository.update(card.id, {
        status: "current",
        replacesDeckCardId: undefined,
      });
    }

    // 2. Delete CUT rows
    for (const card of toRemove) {
      await DeckCardRepository.delete(card.id);
    }

    // 3. Clear replacement links pointing to deleted ids

    // 4. Touch deck.updatedAt
    await DeckRepository.update(deckId, { updatedAt: now() });

    return { promoted: toPromote.length, removed: toRemove.length };
  });
}
```

Pre-apply validation:

- Projected deck size = format target (100 Commander).
- Warn on duplicates in projected deck.
- Warn if ADD cards have no replacement link (optional, not blocking).

### Review before apply

Modal or full-screen **Review Changes** step:

```text
APPLY CHANGES?

+ 8 cards will be added (ADD → CURRENT)
- 8 cards will be removed (CUT deleted)

Projected: 100 cards ✓

[Cancel]  [Apply Changes]
```

Optional checkbox: "Save version snapshot after apply" (disabled until Phase 11; stub callback).

Post-apply toast:

```text
Changes applied
+8 added · -8 removed
[Undo]  (complex — defer full undo to Phase 14; offer "View deck" only for MVP)
```

### Sticky upgrade summary

When deck has any ADD or CUT cards, show sticky bar on deck pages:

```text
┌─────────────────────────────────────┐
│ 8 adds · 8 cuts · 5 consider       │
│           [Review Changes]          │
└─────────────────────────────────────┘
```

Component: `UpgradeSummaryBar` — visible on `/decks/[deckId]/*` routes except during apply review.

Price segment stub: `· €—` until Phase 8.

### Need-to-add screen (Phase 14 in parent plan)

Dedicated route or tab: `/decks/[deckId]/changes/add`

Columns (mobile: stacked card rows):

- Card image (optional, density setting)
- Name, quantity, type
- Roles, synergies
- Owned toggle
- Price placeholder ("—")
- TCGplayer link stub (Phase 8)
- Total line cost placeholder

Summary bar:

```text
Cards to add: 8    Qty: 8    Est. cost: —
```

### Cards-to-cut screen

Route: `/decks/[deckId]/changes/cut`

- CUT status cards only
- Notes field prominent ("reason for cut")
- Replacement link UI
- Current price placeholder

### CONSIDER queue

Route: `/decks/[deckId]/changes/consider`

- Bulk promote to ADD
- Bulk dismiss (delete row or revert to current if was current before — **decision: CONSIDER cards are new additions only; dismiss = delete row**)
- If CONSIDER was demoted from ADD, dismiss → delete

### Changes hub

Route: `/decks/[deckId]/changes`

Landing with navigation cards:

```text
CHANGES

┌ Need to Add (8)      →
┌ Cards to Cut (3)     →
┌ Considering (5)      →
┌ Projected Deck       →
```

Summary + Apply button (disabled if no ADD and no CUT).

## Data Model Impact

### DeckCard extension

```ts
interface DeckCard {
  // ... existing fields from Phase 5
  replacesDeckCardId?: string; // ADD card replaces this CUT deckCard id
  cutReason?: string; // optional notes specific to cut (or use notes field)
}
```

Dexie migration v4:

- Add index on `replacesDeckCardId` optional (sparse).
- Backfill not required.

### Optional ApplyHistory (defer)

Do not create new table in Phase 7. Phase 11 versions capture post-apply snapshots.

### ApplyChangesResult type

```ts
interface ApplyChangesResult {
  promotedCount: number;
  removedCount: number;
  appliedAt: string;
  errors?: string[];
}
```

## Routes / Screens

| Route                               | Purpose                             |
| ----------------------------------- | ----------------------------------- |
| `/decks/[deckId]/changes`           | Changes hub / overview              |
| `/decks/[deckId]/changes/add`       | Need-to-add list                    |
| `/decks/[deckId]/changes/cut`       | Cards-to-cut list                   |
| `/decks/[deckId]/changes/consider`  | Consider queue                      |
| `/decks/[deckId]/changes/projected` | Projected deck view                 |
| `/decks/[deckId]/changes/review`    | Pre-apply review (modal OK instead) |

Enable **Changes** sub-nav tab from Phase 5 stub.

### Mobile navigation pattern

Use segmented control or vertical link list on hub; each sub-screen has back to hub. Apply button accessible from hub and review screen.

## File Structure (files to create/modify)

```text
lib/
  deck/
    changes/
      index.ts
      apply-changes.ts
      projected-deck.ts
      replacement-links.ts
      change-summary.ts
      promote-demote.ts
    changes/types.ts
  hooks/
    use-deck-changes.ts
    use-projected-deck.ts
    use-apply-changes.ts

types/
  deck-card.ts              # extend replacesDeckCardId

components/
  changes/
    changes-hub.tsx
    changes-nav-card.tsx
    need-to-add-list.tsx
    need-to-add-summary.tsx
    cards-to-cut-list.tsx
    consider-list.tsx
    projected-deck-view.tsx
    projected-deck-header.tsx
    apply-changes-dialog.tsx
    apply-changes-review.tsx
    replacement-link-picker.tsx
    replacement-link-badge.tsx
    upgrade-summary-bar.tsx
    change-empty-state.tsx
  deck/
    deck-card-row.tsx         # show replacement badge when linked

app/
  decks/
    [deckId]/
      changes/
        page.tsx
        add/
          page.tsx
        cut/
          page.tsx
        consider/
          page.tsx
        projected/
          page.tsx
      layout.tsx              # include UpgradeSummaryBar
```

## Detailed Task List

### 7.1 — Types and migration

- [ ] Extend `DeckCard` with `replacesDeckCardId?: string`.
- [ ] Dexie migration v4 adding field (nullable).
- [ ] Create `lib/deck/changes/types.ts` with summary types:

```ts
interface DeckChangeSummary {
  addCount: number;
  addQuantity: number;
  cutCount: number;
  cutQuantity: number;
  considerCount: number;
  hasPendingChanges: boolean;
}
```

### 7.2 — Change summary computation

- [ ] Create `lib/deck/changes/change-summary.ts`:
  - [ ] `computeChangeSummary(deckCards): DeckChangeSummary`
  - [ ] Count distinct rows and total quantities separately.
- [ ] Unit tests for mixed statuses.

### 7.3 — Projected deck logic

- [ ] Create `lib/deck/changes/projected-deck.ts`:
  - [ ] Re-export/wrap Phase 6 `getProjectedDeckCards()`.
  - [ ] `buildProjectedDeckList(deck, deckCards, cards): ProjectedDeckViewModel[]`
  - [ ] Annotate rows: `incoming` (add), `staying` (current), show badge.
- [ ] `useProjectedDeck(deckId)` hook.

### 7.4 — Replacement link service

- [ ] Create `lib/deck/changes/replacement-links.ts`:
  - [ ] `linkReplacement(addDeckCardId, cutDeckCardId): Promise<void>`
  - [ ] `unlinkReplacement(addDeckCardId): Promise<void>`
  - [ ] `getReplacementForCut(cutDeckCardId, deckCards): DeckCard | undefined`
  - [ ] `getReplacementForAdd(addDeckCardId): DeckCard | undefined`
  - [ ] Validate: add status must be `add`, cut must be `cut`, same deckId.
  - [ ] Clear link if either card changes status or is deleted.
- [ ] Unit tests for link/unlink validation.

### 7.5 — Promote / demote helpers

- [ ] Create `lib/deck/changes/promote-demote.ts`:
  - [ ] `promoteConsiderToAdd(deckCardId)`
  - [ ] `demoteAddToConsider(deckCardId)`
  - [ ] `markCurrentAsCut(deckCardId)`
  - [ ] `revertCutToCurrent(deckCardId)` — before apply only
  - [ ] Bulk variants for consider queue.
- [ ] Wire to existing `DeckCardService.setStatus` with side effects (clear invalid links).

### 7.6 — Apply changes core

- [ ] Create `lib/deck/changes/apply-changes.ts`:
  - [ ] `validateBeforeApply(deck, projectedCards, warnings): ApplyValidation`
  - [ ] `applyChanges(deckId): Promise<ApplyChangesResult>` in Dexie transaction.
  - [ ] `canApply(deckCards): boolean` — true if any add or cut exists.
- [ ] Pre-apply checks:
  - [ ] Projected size vs format target.
  - [ ] Return blocking errors vs warnings.
- [ ] `useApplyChanges` mutation with query invalidation for deck, cards, stats, changes.

### 7.7 — Changes hub UI

- [ ] Create `app/decks/[deckId]/changes/page.tsx`.
- [ ] `ChangesHub` — four nav cards with counts.
- [ ] Prominent **Apply Changes** button → opens review dialog.
- [ ] Disabled state when `!hasPendingChanges`.
- [ ] Show projected size badge from Phase 6.

### 7.8 — Need-to-add screen

- [ ] Create `app/decks/[deckId]/changes/add/page.tsx`.
- [ ] `NeedToAddList` — filter `status === 'add'`.
- [ ] Reuse `DeckCardRow` with ADD styling.
- [ ] `NeedToAddSummary` sticky header:
  - [ ] Cards to add count, quantity sum, cost placeholders.
- [ ] Row actions: demote to CONSIDER, remove, edit roles, link to CUT (replacement picker reversed).
- [ ] Empty state: "No cards marked to add."

### 7.9 — Cards-to-cut screen

- [ ] Create `app/decks/[deckId]/changes/cut/page.tsx`.
- [ ] `CardsToCutList` — filter `status === 'cut'`.
- [ ] Show `cutReason` or `notes` field inline editable.
- [ ] `ReplacementLinkBadge` — shows linked ADD card or "Pick replacement".
- [ ] `ReplacementLinkPicker` bottom sheet — list ADD cards + search.
- [ ] Revert action: CUT → CURRENT.
- [ ] Empty state.

### 7.10 — Consider queue screen

- [ ] Create `app/decks/[deckId]/changes/consider/page.tsx`.
- [ ] `ConsiderList` — filter `status === 'consider'`.
- [ ] Row actions: Promote to ADD, Remove from list.
- [ ] Bulk: Select all → Promote selected.
- [ ] Empty state.

### 7.11 — Projected deck view

- [ ] Create `app/decks/[deckId]/changes/projected/page.tsx`.
- [ ] `ProjectedDeckView`:
  - [ ] Header: CURRENT + ADD - CUT = PROJECTED counts.
  - [ ] List projected cards grouped by zone.
  - [ ] Badges: NEW (was add), STAYING (current).
  - [ ] Toggle show only changes vs full list.
- [ ] Embed mini deck warnings (projected mode) from Phase 6.
- [ ] Commander format: show 100/100 projected count.

### 7.12 — Apply changes review UI

- [ ] `ApplyChangesReview` — full-screen sheet or dialog.
- [ ] Two columns/lists: Adding (ADD cards), Removing (CUT cards).
- [ ] Show replacement pairs grouped.
- [ ] Validation messages (blocking vs warnings).
- [ ] Confirm button triggers mutation.
- [ ] Loading state during transaction.
- [ ] Success → navigate to deck dashboard with toast.

### 7.13 — Upgrade summary bar

- [ ] `UpgradeSummaryBar` in `app/decks/[deckId]/layout.tsx`.
- [ ] Visible when `hasPendingChanges`.
- [ ] Tap Review → changes hub or review dialog.
- [ ] Safe area padding for iPhone home indicator.

### 7.14 — Deck card row enhancements

- [ ] Show `ReplacementLinkBadge` on ADD/CUT rows in main card list when linked.
- [ ] Quick action in `DeckCardActionsSheet`: "Link replacement" / "Mark as CUT".

### 7.15 — Dashboard integration

- [ ] Enable "Review Changes" on deck dashboard (Phase 6).
- [ ] Status summary chips link to respective change sub-routes.

### 7.16 — CONSIDER entry points

- [ ] From card search/detail: "Mark as Consider" adds with `status: 'consider'`.
- [ ] From deck card sheet: status toggle includes all four states.

### 7.17 — Edge cases

- [ ] Apply with only ADD (no CUT) — allowed.
- [ ] Apply with only CUT (no ADD) — allowed.
- [ ] Apply with empty ADD and CUT — button disabled.
- [ ] CUT card deleted manually before apply — unlink orphaned ADD.
- [ ] Duplicate oracle in projected deck — show validation warning on review.

### 7.18 — Testing utilities

- [ ] Test fixture factory: deck with 5 ADD, 3 CUT, 4 CONSIDER.
- [ ] Document manual QA flow in testing checklist.

## Implementation Notes

### CUT cards remain in "current" physical deck until apply

UX copy clarity:

> Cards marked CUT are still shown in your current deck until you apply changes. They are excluded from the projected deck.

In `/decks/[deckId]/cards` default filter "Current", decide:

- **Show CUT cards** with red badge (recommended — user sees what's leaving).
- Projected view excludes them.

### CONSIDER vs maybeboard

`maybeboard` zone is physical zone; `consider` is status. A card can be `zone: mainboard, status: consider`. Do not conflate with maybeboard zone unless user explicitly moves zone.

### Replacement pairing display

On review screen, group pairs:

```text
OUT:  Lightning Greaves
 IN:  Stoneforge Mystic
```

Unpaired ADD/CUT listed separately.

### Apply undo (MVP scope)

Full undo requires snapshot before apply — defer to Phase 11 versions. MVP success toast links to deck; user manually re-adds if mistake.

Optional lightweight undo (single session):

- Store pre-apply JSON snapshot in memory for 60s — fragile, skip unless time permits.

### Integration with wishlist (future)

"Move to wishlist" on CONSIDER card — Phase 12. Stub button disabled.

### Price placeholders

Need-to-add summary:

```tsx
<span className="text-muted-foreground">Est. cost: —</span>
<p className="text-xs">Pricing in Phase 8</p>
```

Do not compute fake zeros.

### Bulk apply validation example

Commander projected deck > 100:

```text
⚠ Projected deck has 101 cards. Remove 1 ADD or add 1 CUT before applying.
```

Block apply if legality severity errors from Phase 6 projected warnings (configurable — warnings only for MVP, block only on count > 100).

### Query invalidation after apply

Invalidate:

- `['decks', deckId, 'cards']`
- `['decks', deckId, 'stats']`
- `['decks', deckId, 'changes']`
- `['decks', deckId, 'projected']`

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 7 matrix.

- [ ] **Unit tests:** projected deck math (CURRENT + ADD − CUT), quantity edge cases, commander zone
- [ ] **Unit tests:** replacement link `replacesDeckCardId` validation
- [ ] **Integration tests:** apply-changes transaction (ADD→CURRENT, CUT removed, atomic)
- [ ] **Integration tests:** apply blocked when projected deck illegal (stub until Phase 13)
- [ ] **TestCafe:** `tests/e2e/upgrade-workflow.test.ts` — mark ADD/CUT, view changes, apply
- [ ] Add `data-testid`: `apply-changes-btn`, `status-add-btn`, `status-cut-btn`

## Testing Checklist

### Unit tests

- [ ] `computeChangeSummary` counts correctly.
- [ ] `getProjectedDeckCards` excludes cut, includes add+current.
- [ ] `linkReplacement` validates statuses.
- [ ] `applyChanges` promotes and deletes in transaction.
- [ ] Orphan link cleanup when CUT deleted.
- [ ] `validateBeforeApply` blocks 101-card Commander deck.
- [ ] `canApply` false when no pending changes.

### Integration tests

- [ ] Mark 3 cards ADD, 2 CUT → summary shows 3/2.
- [ ] Projected view shows correct count.
- [ ] Link replacement → displays on cut screen.
- [ ] Apply → ADD become current, CUT removed, CONSIDER untouched.
- [ ] After apply, summary bar hides.
- [ ] Dashboard stats reflect new current deck.

### Manual iPhone tests

- [ ] Full workflow: consider → add → cut → review → apply.
- [ ] Sticky summary bar doesn't overlap bottom nav.
- [ ] Bottom sheets for replacement picker usable.
- [ ] Reload mid-edit — changes persist (not applied until confirm).

### End-to-end flow (Definition of Done partial)

```text
Search card → Mark CONSIDER
→ Promote to ADD
→ Mark existing card CUT
→ Link replacement
→ Open Projected Deck → 100 cards
→ Review Changes → Apply
→ Deck shows new configuration
→ Reload → persists
```

## Exit Criteria

- [ ] `/decks/[deckId]/changes` hub navigates to add/cut/consider/projected sub-screens.
- [ ] Need-to-add shows all ADD cards with summary counts.
- [ ] Cards-to-cut shows CUT cards with replacement linking.
- [ ] Projected deck displays CURRENT + ADD - CUT accurately.
- [ ] Apply Changes atomically promotes ADD and removes CUT.
- [ ] Upgrade summary bar visible when pending changes exist.
- [ ] Review step requires explicit confirmation.
- [ ] CONSIDER queue supports promote and dismiss.
- [ ] No separate upgrade database — single deckCards model.
- [ ] Phase 6 projected stats align with projected deck view counts.

## Risks & Mitigations

| Risk                                          | Impact                | Mitigation                                   |
| --------------------------------------------- | --------------------- | -------------------------------------------- |
| User applies without reviewing projected deck | Bad deck state        | Review dialog; projected warnings            |
| Replacement link orphan edges                 | Confusing UI          | Cascade cleanup on status change/delete      |
| Apply transaction partial failure             | Corrupt deck          | Dexie transaction all-or-nothing             |
| CUT visibility confusion                      | User thinks card gone | Clear copy; red badge still in list          |
| Apply without price awareness                 | User surprise         | Phase 8 adds cost to review; stub notice now |
| Complex undo expectations                     | Data loss anxiety     | Phase 11 versions; export reminder           |

## Out of Scope (defer to later phases)

- Live upgrade cost calculation (Phase 8).
- TCGplayer links and price columns (Phase 8).
- Save version snapshot on apply (Phase 11).
- Compare versions diff (Phase 11).
- Wishlist promotion from CONSIDER (Phase 12).
- Full apply undo / rollback (Phase 11/14).
- Auto-suggest replacements.
- Shopping list export.
- Moxfield sync of upgrade list.
- Email/share upgrade proposal.

## Handoff to Next Phase

**Phase 8 (Pricing)** will consume:

- Need-to-add summary bar (`NeedToAddSummary`) — wire real `estimatedCost`.
- Need-to-add row price columns.
- Cards-to-cut current price display.
- Upgrade summary bar price segment (`8 adds · 8 cuts · €37.42`).
- Apply review screen total cost delta.

Ensure before handoff:

1. `NeedToAddSummary` accepts optional `estimatedCost?: number` prop — currently undefined.
2. Row components have placeholder slots for `<CardPrice />`.
3. `computeChangeSummary` exported for price aggregation extension.
4. Test deck with ADD/CUT cards ready for price QA.

**Phase 11 (Versions)** hook:

```ts
// In applyChanges optional callback
onApplyComplete?: (result: ApplyChangesResult) => void;
// Phase 11 registers: createVersionSnapshot(deckId)
```

---

_Parent plan: `plans/mtg-deck-builder-web-app-build-plan.md`_
