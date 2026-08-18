# Phase 14 — UX Polish

## Agent Handoff Prompt

```
You are implementing Phase 14 (UX Polish) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-14-ux-polish.md (this document — follow every section)
- build-plan/README.md (context and dependencies)
- plans/mtg-deck-builder-web-app-build-plan.md (master reference, sections 5, 32, 33, 68)

Prerequisites: Phases 0–13 complete. All core features functional — this phase is polish only, not new features.

Goal: Elevate the app from functional to intentionally designed. Improve transitions, loading skeletons, offline indicator, undo snackbars, safe-area insets, bottom sheet tuning, Neo Brutalism consistency review, and desktop sidebar enhancement.

Deliverables:
1. Consistent page/view transitions (mobile-appropriate)
2. Skeleton loading states for all major data-fetching views
3. Global offline indicator component
4. Undo snackbar system for destructive/reversible actions
5. iPhone safe-area inset handling throughout
6. Bottom sheet height, drag, and snap point tuning
7. Neo Brutalism design audit and fixes
8. Enhanced desktop sidebar with deck context

Constraints:
- Do NOT add new product features — polish existing ones only
- Maintain iPhone-first design; desktop enhancements must not break mobile
- Respect prefers-reduced-motion
- Keep Neo Brutalism identity — no softening into generic SaaS UI
- Performance: animations must not drop frames on iPhone SE class devices

When done, walk through the Definition of Done workflow from master plan section 70 on a real iPhone.
```

## Overview

Phase 14 is a **design and interaction quality pass** across the entire application. Phases 0–13 built functional features; this phase makes the app feel like a deliberate, cohesive product — especially on iPhone where first impressions and micro-interactions matter most.

Focus areas:

1. **Motion** — purposeful transitions, not decorative animation
2. **Loading** — skeleton screens instead of spinners where layout is known
3. **Feedback** — offline state, undo actions, save confirmations
4. **Mobile ergonomics** — safe areas, bottom sheets, tap targets
5. **Visual consistency** — Neo Brutalism audit across every screen
6. **Desktop enhancement** — richer sidebar without redesigning mobile

This phase has no new data models or routes. It touches many files lightly.

## Goal

Transform the app from "works correctly" to "feels great" by:

1. Adding smooth, reduced-motion-respecting transitions between views.
2. Replacing blank loading states with themed skeleton components.
3. Showing a persistent but unobtrusive offline indicator when network is unavailable.
4. Implementing undo snackbars for card removal, status changes, and wishlist actions.
5. Fixing all safe-area inset issues on notched iPhones in standalone PWA mode.
6. Tuning bottom sheets for one-handed use.
7. Completing a Neo Brutalism visual audit with documented fixes.
8. Enhancing desktop navigation with deck context and wider layouts.

## Prerequisites

- **Phases 0–13** complete — all screens exist to polish.
- **Phase 2** — PWA standalone mode for safe-area testing.
- **Phase 9** — Display modes established (compact/comfortable/image).
- Theme tokens from Phase 1 applied globally.

## Dependencies on Previous Phases

| Phase | Dependency                                              |
| ----- | ------------------------------------------------------- |
| 1     | Neo Brutalism theme tokens, shadcn/ui base              |
| 2     | Standalone PWA, service worker offline shell            |
| 5–12  | All feature screens to polish                           |
| 13    | Deck Check panel to include in skeleton/transition pass |
| 7     | Apply changes flow needs undo snackbar                  |

## Duration Estimate

**5–7 days** for a single developer ( broad touch across codebase).

| Sub-area                              | Estimate  |
| ------------------------------------- | --------- |
| Skeleton components + integration     | 1.5 days  |
| Transitions + motion system           | 1 day     |
| Offline indicator + connectivity hook | 0.5 day   |
| Undo snackbar system                  | 1 day     |
| Safe-area + bottom sheet tuning       | 1 day     |
| Neo Brutalism audit + fixes           | 1 day     |
| Desktop sidebar enhancement           | 0.5–1 day |
| Cross-device QA                       | 1 day     |

## Architecture & Key Decisions

### Motion system

**Decision:** Use CSS transitions + Framer Motion (if already in project) or View Transitions API sparingly. Avoid heavy animation libraries if not present.

Principles:

- Page transitions: 200–300ms ease-out
- Sheet open/close: spring or ease, max 350ms
- List item enter: stagger optional, max 30ms delay per item
- `prefers-reduced-motion: reduce` → instant or opacity-only

### Skeleton strategy

**Decision:** One `Skeleton` primitive (shadcn) themed with Neo Brutalism (square, bordered). Composite skeletons per view:

- `DeckListSkeleton`
- `DeckCardListSkeleton`
- `CardSearchSkeleton`
- `WishlistSkeleton`
- `DashboardSkeleton`

Match skeleton layout to loaded layout exactly — no layout shift on load.

### Offline indicator

**Decision:** Global banner below app header / above content:

```text
[wifi-off icon] You're offline — saved decks still available
```

- Visible when `navigator.onLine === false` OR failed network request with local fallback
- Dismiss not allowed (persistent while offline)
- Auto-hide when back online with brief "Back online" toast
- Use `useOnlineStatus` hook wrapping `online`/`offline` events

### Undo snackbar system

**Decision:** Central `UndoProvider` + `useUndoAction` hook:

```ts
interface UndoAction {
  id: string;
  message: string;
  undo: () => Promise<void>;
  duration?: number; // default 5000ms
}
```

Queue one snackbar at a time (mobile screen space). Actions supporting undo:

- Remove card from deck
- Mark status change (ADD/CUT/CONSIDER/CURRENT)
- Remove wishlist item
- Delete deck (before confirm dialog completes? no — confirm first)
- Apply changes (undo = restore previous snapshot — complex, optional)

Store pre-action state in closure for undo callback.

### Safe-area handling

**Decision:** CSS env variables globally:

```css
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);
```

Apply to:

- Bottom navigation bar
- Bottom sheets
- Sticky action bars
- Fixed footers

Add `viewport-fit=cover` in meta viewport (Phase 2 should have this).

### Bottom sheet tuning

**Decision:** Use existing sheet component (shadcn Sheet or Vaul drawer):

- Default snap: 60% viewport for card detail, 90% for search results
- Drag handle visible (Neo Brutalism: thick horizontal bar)
- Backdrop tap to close
- Prevent body scroll when open
- Max height respects safe-area-inset-bottom

### Neo Brutalism audit

**Decision:** Create checklist document (in PR description or `docs/design-audit.md` optional) covering:

- Zero border-radius on all interactive elements
- 2px+ black borders on cards/panels
- Offset shadows (not blur shadows)
- DM Sans body, Space Mono for stats/numbers
- Status colors use semantic tokens only
- No rogue gray SaaS backgrounds

Fix deviations file-by-file.

### Desktop sidebar

**Decision:** On `md:` breakpoint and up:

- Persistent left sidebar (240px) replacing bottom nav
- Show deck list in sidebar when inside `/decks/[deckId]/*`
- Wider max-width container (1280px)
- Multi-column dashboard on deck page

Mobile layout unchanged.

## Data Model Impact

**None.** Phase 14 is UI/UX only.

Optional: persist `reducedMotion` override in settings (low priority — system preference sufficient).

## Routes / Screens

All existing routes receive polish. No new routes.

### Screens requiring skeletons (priority order)

1. `/decks` — deck list
2. `/decks/[deckId]` — dashboard
3. `/decks/[deckId]/cards` — card list
4. `/cards` — search
5. `/wishlist`
6. `/decks/[deckId]/changes`
7. `/settings`

### Screens requiring transition polish

- Deck list → deck dashboard
- Card search → card detail sheet
- Changes → apply confirmation
- Settings sub-pages

## File Structure (files to create/modify)

### Create

```text
components/shared/skeletons/deck-list-skeleton.tsx
components/shared/skeletons/deck-dashboard-skeleton.tsx
components/shared/skeletons/deck-card-list-skeleton.tsx
components/shared/skeletons/card-search-skeleton.tsx
components/shared/skeletons/wishlist-skeleton.tsx
components/shared/skeletons/settings-skeleton.tsx
components/shared/offline-indicator.tsx
components/shared/undo-snackbar.tsx
components/shared/undo-provider.tsx
components/shared/page-transition.tsx
components/shared/safe-area-wrapper.tsx
hooks/use-online-status.ts
hooks/use-undo-action.ts
hooks/use-reduced-motion.ts
lib/ui/motion-config.ts
styles/safe-area.css
```

### Modify

```text
app/layout.tsx                           — SafeAreaWrapper, OfflineIndicator, UndoProvider
app/globals.css                          — safe-area CSS, motion utilities
components/navigation/bottom-nav.tsx     — safe-area padding
components/navigation/sidebar-nav.tsx    — desktop enhancement
components/navigation/app-shell.tsx      — responsive layout
components/cards/card-detail-sheet.tsx   — sheet snap points
components/cards/card-search.tsx         — search skeleton
components/deck/deck-card-list.tsx       — list skeleton, undo on remove
components/deck/deck-card-row.tsx        — transition on status change
components/deck/deck-dashboard.tsx       — dashboard skeleton
components/wishlist/wishlist-page.tsx    — wishlist skeleton, undo
components/changes/apply-changes-dialog.tsx — confirmation polish
app/decks/loading.tsx                    — route-level skeleton
app/decks/[deckId]/loading.tsx
app/wishlist/loading.tsx
app/cards/loading.tsx
All page.tsx files                       — wrap with PageTransition where appropriate
```

## Detailed Task List

### 14.1 — Motion & Transitions

- [ ] Create `lib/ui/motion-config.ts` with duration/easing tokens
- [ ] Create `useReducedMotion` hook reading `prefers-reduced-motion`
- [ ] Create `PageTransition` wrapper component
- [ ] Apply fade/slide transition to deck list → deck detail navigation
- [ ] Apply sheet slide-up animation (respect reduced motion)
- [ ] Status badge change: brief scale pulse on update
- [ ] Tab switch within deck (cards/changes/stats): crossfade or none (instant preferred)
- [ ] Verify no animation jank on iPhone SE / older devices
- [ ] Document motion tokens in component comments

### 14.2 — Skeleton Loading States

- [ ] Theme shadcn `Skeleton` with square corners, visible border
- [ ] Build `DeckListSkeleton` (6 placeholder rows)
- [ ] Build `DeckDashboardSkeleton` (header + stat widgets + chart placeholders)
- [ ] Build `DeckCardListSkeleton` (10 card rows matching compact mode)
- [ ] Build `CardSearchSkeleton` (search bar + 5 result rows)
- [ ] Build `WishlistSkeleton`
- [ ] Build `SettingsSkeleton`
- [ ] Replace spinner/blank states in all priority screens
- [ ] Add `loading.tsx` for Next.js route suspense where missing
- [ ] Ensure skeleton → content transition has no cumulative layout shift (CLS)
- [ ] Skeleton visible for minimum 200ms to avoid flash (optional)

### 14.3 — Offline Indicator

- [ ] Implement `useOnlineStatus` hook
- [ ] Create `OfflineIndicator` banner component (Neo Brutalism: yellow/black)
- [ ] Mount in root layout above main content
- [ ] Show when offline; hide when online
- [ ] "Back online" toast on reconnect (3s auto-dismiss)
- [ ] Verify indicator visible in standalone PWA mode
- [ ] Do not duplicate offline messaging in every screen (global banner sufficient)
- [ ] Card search shows additional inline hint when offline + no cache (keep existing)

### 14.4 — Undo Snackbar System

- [ ] Create `UndoProvider` context
- [ ] Create `UndoSnackbar` fixed above bottom nav (respect safe-area)
- [ ] Implement `useUndoAction({ message, undo, duration })`
- [ ] Wire undo: remove card from deck
- [ ] Wire undo: status change (ADD/CUT/CONSIDER/CURRENT)
- [ ] Wire undo: remove wishlist item
- [ ] Wire undo: bulk status change
- [ ] Wire undo: add to wishlist (from Phase 12)
- [ ] Snackbar stacks: show one at a time, queue if needed
- [ ] Undo button: large tap target, monospace "UNDO" label
- [ ] Timeout: 5 seconds default, pause on hover (desktop)
- [ ] Ensure undo restores IndexedDB state correctly

### 14.5 — Save Confirmations

- [ ] Toast on deck rename success
- [ ] Toast on settings save
- [ ] Toast on version saved (may exist — unify toast system)
- [ ] Avoid redundant toasts on auto-save actions
- [ ] Unify on one toast/snackbar component (sonner or custom Neo Brutalism toast)

### 14.6 — Safe-Area Insets

- [ ] Verify `viewport-fit=cover` in layout metadata
- [ ] Create `SafeAreaWrapper` or global CSS utilities
- [ ] Bottom nav: `padding-bottom: env(safe-area-inset-bottom)`
- [ ] Bottom sheets: content padding for home indicator
- [ ] Sticky upgrade summary bar on changes screen
- [ ] Fixed FABs or action buttons
- [ ] Top header: `safe-area-inset-top` for notch
- [ ] Test on iPhone 14/15/16 simulator and real device
- [ ] Test landscape orientation (safe-area left/right)

### 14.7 — Bottom Sheet Tuning

- [ ] Audit all bottom sheets: card detail, add to deck, add to wishlist, filters, move to deck
- [ ] Consistent drag handle component
- [ ] Snap points: 50%, 90% where appropriate
- [ ] Card detail default: ~70% showing image + actions
- [ ] Prevent overscroll bounce conflicting with sheet drag
- [ ] Focus trap and scroll containment
- [ ] Close on swipe down threshold
- [ ] Sheet background: theme background with hard top border

### 14.8 — Neo Brutalism Design Audit

- [ ] Audit Home / Dashboard
- [ ] Audit Deck List + Deck Dashboard
- [ ] Audit Deck Card List (all density modes)
- [ ] Audit Card Search + Detail
- [ ] Audit Changes / Projected / Need to Add / Cut
- [ ] Audit Wishlist
- [ ] Audit Settings + Data Management
- [ ] Audit Version comparison
- [ ] Audit Deck Check / warnings (Phase 13)
- [ ] Fix: any rounded corners (`rounded-*` → `rounded-none`)
- [ ] Fix: soft shadows → offset hard shadows
- [ ] Fix: inconsistent border widths → standardize 2px black
- [ ] Fix: font usage (DM Sans / Space Mono)
- [ ] Fix: button variants match theme
- [ ] Fix: status colors use semantic tokens (current/add/cut/consider)
- [ ] Screenshot before/after for key screens (optional, for PR)

### 14.9 — Desktop Sidebar Enhancement

- [ ] Breakpoint: show sidebar at `md:` (768px) or `lg:` (1024px)
- [ ] Sidebar contents:
  - [ ] App logo/name
  - [ ] Primary nav links (Home, Decks, Cards, Wishlist, Settings)
  - [ ] When in deck context: deck sub-nav (Overview, Cards, Changes, Stats, Versions)
  - [ ] Optional: compact deck switcher dropdown
- [ ] Main content: left margin equal sidebar width
- [ ] Hide bottom nav on desktop
- [ ] Wider deck dashboard: 2-column stat grid
- [ ] Card list: optional table view with more columns (name, MV, type, status, price, roles)
- [ ] Hover states for desktop (not touch-only)
- [ ] Keyboard navigation between sidebar links

### 14.10 — Micro-Interactions

- [ ] Button press: subtle translate shadow effect (Neo Brutalism press)
- [ ] Checkbox/toggle: instant state change, no slow animation
- [ ] Multi-select: selected row highlight with thick border
- [ ] Empty states: consistent illustration/icon + CTA styling
- [ ] Error states: consistent alert component
- [ ] Pull-to-refresh indicator themed (if implemented)

### 14.11 — Performance Pass

- [ ] Profile list scroll on 100-card deck with images
- [ ] Ensure skeleton unmount doesn't trigger unnecessary re-fetch
- [ ] Lazy load Framer Motion if used (dynamic import)
- [ ] Verify no memory leaks from undo timers
- [ ] Lighthouse performance audit baseline (document score)

## Implementation Notes

### Undo implementation pattern

```ts
async function handleRemoveCard(deckCardId: string) {
  const snapshot = await deckCardRepo.getById(deckCardId);
  await deckCardRepo.delete(deckCardId);

  showUndo({
    message: `Removed ${cardName}`,
    undo: async () => {
      await deckCardRepo.insert(snapshot);
    },
  });
}
```

### Offline indicator styling

```tsx
<div className="flex items-center gap-2 border-b-2 border-black bg-[var(--consider)] px-4 py-2">
  <WifiOff className="h-4 w-4" />
  <span className="text-sm font-bold">You're offline</span>
  <span className="text-sm">Saved decks still available</span>
</div>
```

### Safe-area bottom nav

```tsx
<nav className="fixed bottom-0 inset-x-0 pb-[env(safe-area-inset-bottom)] border-t-2 border-black bg-background">
```

### Reduced motion

```tsx
const prefersReducedMotion = useReducedMotion();
const transition = prefersReducedMotion ? { duration: 0 } : { duration: 0.25 };
```

### Do not over-animate

Neo Brutalism aesthetic favors **snappy, decisive** interactions. Avoid slow fades, parallax, or bounce effects that feel playful rather than utilitarian.

### Toast vs snackbar

- **Snackbar with undo** — reversible actions
- **Toast** — informational (saved, back online, export complete)
- One system, two variants

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 14 matrix.

- [ ] Audit all E2E `data-testid` attributes — add missing IDs from automation-strategy.md table
- [ ] Optional: `eslint-plugin-jsx-a11y` added to ESLint config
- [ ] **Component tests (selective):** OfflineIndicator, UndoSnackbar render states
- [ ] Manual: iPhone safe-area screenshot checklist
- [ ] Run full `npm run test:e2e:smoke` after UI changes — fix flaky selectors
- [ ] Knip: remove unused components/exports introduced during polish

## Testing Checklist

### Visual regression

- [ ] All screens match Neo Brutalism checklist
- [ ] No rounded corners on primary UI
- [ ] Dark/light mode if supported — both audited

### Skeleton

- [ ] Each major route shows skeleton before content
- [ ] No layout shift when content loads (CLS ≈ 0)

### Offline

- [ ] Enable airplane mode → banner appears
- [ ] Disable airplane mode → banner hides, "Back online" toast
- [ ] Offline indicator visible in standalone PWA

### Undo

- [ ] Remove card → undo → card restored
- [ ] Status change → undo → previous status
- [ ] Undo timeout expires → action permanent
- [ ] Rapid actions → snackbar queues correctly

### Safe-area

- [ ] Bottom nav not obscured by home indicator (iPhone)
- [ ] Bottom sheet actions reachable one-handed
- [ ] Notch does not overlap header text

### Bottom sheets

- [ ] Drag to close works
- [ ] Backdrop tap closes
- [ ] Scroll inside sheet doesn't scroll page behind

### Desktop

- [ ] Sidebar visible ≥768px
- [ ] Bottom nav hidden on desktop
- [ ] Deck sub-nav works in sidebar
- [ ] Keyboard Tab through nav links

### Reduced motion

- [ ] OS reduced motion enabled → animations disabled/minimal

### Performance

- [ ] 60fps scroll on deck card list (compact mode)
- [ ] No jank opening card detail sheet

### Definition of Done workflow (master plan §70)

- [ ] Complete full workflow on real iPhone without UI friction

## Exit Criteria

- [ ] All major views have skeleton loading states
- [ ] Page/sheet transitions smooth and respect reduced motion
- [ ] Global offline indicator functional in PWA mode
- [ ] Undo snackbars work for card remove, status change, wishlist remove
- [ ] Safe-area insets correct on notched iPhones (standalone mode)
- [ ] Bottom sheets tuned for one-handed mobile use
- [ ] Neo Brutalism audit complete with all deviations fixed
- [ ] Desktop sidebar with deck sub-navigation at wide breakpoints
- [ ] No new features added — polish only
- [ ] Definition of Done workflow (§70) feels smooth on iPhone

## Risks & Mitigations

| Risk                              | Impact              | Mitigation                                    |
| --------------------------------- | ------------------- | --------------------------------------------- |
| Animation hurts performance       | Jank on old iPhones | Reduced motion; CSS-only; profile early       |
| Undo complexity for apply changes | Bugs                | Defer apply-changes undo; document limitation |
| Over-polish delays launch         | Schedule slip       | Prioritize skeleton, safe-area, offline first |
| Desktop changes break mobile      | Regression          | Mobile-first CSS; test both breakpoints       |
| Inconsistent toast systems        | UX noise            | Consolidate to one provider in this phase     |

## Out of Scope

- New features (tags, filters, formats)
- Custom theme / dark mode (unless already planned)
- Haptic feedback
- Gesture navigation (swipe back)
- Animated chart transitions
- Lottie illustrations
- Onboarding tutorial / coach marks
- Accessibility audit beyond existing requirements (Phase 15 covers testing)
- Internationalization

## Handoff to Next Phase

**Next: Phase 15 — Testing & Hardening**

Phase 14 improves perceived quality; Phase 15 ensures reliability through automated tests and device hardening. The undo system and offline indicator built here should receive dedicated test coverage in Phase 15.

Before handoff:

1. Document any known animation performance issues on specific devices.
2. Ensure toast/snackbar components are exported for E2E test selectors (`data-testid`).
3. Confirm all user-visible strings stable for test assertions.
