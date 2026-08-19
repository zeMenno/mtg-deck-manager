# Phase 18 — Solar Dusk Theme & Dark-Default Appearance

## Agent Handoff Prompt

```
You are implementing Phase 18 (Solar Dusk Theme & Dark-Default Appearance) of
the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-18-solar-dusk-theme.md (this document — follow every section)
- build-plan/README.md (phase order and architectural context)
- build-plan/phase-14-ux-polish.md (visual and iPhone audit baseline)
- build-plan/phase-17-legality-symbols-search-filters.md (new surfaces to include)
- docs/decisions.md (ADR-010 must be superseded, not deleted)
- docs/product-spec.md (S-24 theme requirement)
- plans/mtg-deck-builder-web-app-build-plan.md (master reference)
- https://tweakcn.com/r/themes/solar-dusk.json (authoritative theme payload)

Prerequisites: Phases 0–17 complete. This is a post-launch visual-system
migration; it must not change deck data, business rules, routes, or offline
behaviour.

Goal: Replace the tweakcn Neo Brutalism design system with the exact tweakcn
Solar Dusk theme, make dark mode the default for every new and existing user,
and migrate every shared primitive and feature surface without leaving a
hybrid of the two themes.

Constraints:
- Treat Solar Dusk's registry JSON as the authoritative palette, radius,
  typography, tracking, spacing, and shadow source. Do not invent a second
  colour system.
- Dark is the deterministic default. Do not default to the operating-system
  theme and do not show a light flash before hydration.
- Preserve Solar Dusk's light tokens for an explicit user-selected light mode.
- Supersede ADR-010 with a new ADR; retain ADR-010 as historical context.
- Preserve semantic status meaning (CURRENT / ADD / CUT / CONSIDER /
  COMMANDER / warning) and never communicate status by colour alone.
- Remove Neo Brutalism-specific hard borders, zero-radius overrides, hard
  offset shadows, press translations, and comments. Do not alias
  shadow-brutal utilities to soft shadows and leave misleading names behind.
- Use CSS theme tokens in components; no page-level raw colour values.
- Include Phase 17 tabs, legality badges, filter sheets/chips, and fallback
  mana pips in the visual audit.
- Preserve all data-testid values and interaction behaviour.
- Mobile-first: >= 44px touch targets, safe areas, reduced motion, iPhone
  standalone mode, and offline behaviour must not regress.
- Add focused tests with the migration and verify all existing quality gates.

When done, verify every Exit Criteria item and confirm CI is green.
```

## Overview

Phase 18 is the second post-launch improvement phase. It replaces the original
Neo Brutalism visual system with
[tweakcn Solar Dusk](https://tweakcn.com/r/themes/solar-dusk.json) and makes the
dark variant the product default.

This is a design-system migration, not a token-only colour swap. Neo Brutalism
is currently encoded in global variables, shared shadcn primitives, utility
names, feature-level classes, typography, motion, PWA metadata, generated
icons, documentation, and ADR-010. Changing only `app/globals.css` would leave
the application in an inconsistent hybrid state.

Phase 18 intentionally follows Phase 17. Phase 17 adds tabs, legality badges,
search filter sheets/chips, and mana-symbol fallbacks under the previous visual
rules. Completing it first ensures the migration audits those surfaces once
and avoids styling the same components twice.

## Goal

1. Apply the exact Solar Dusk light and dark token sets from the registry JSON.
2. Render dark mode on the first response and make it the persisted default.
3. Offer explicit Dark and Light choices in Settings → Appearance; do not add
   system-following mode in this phase.
4. Load Solar Dusk's Oxanium, Fira Code, and Merriweather fonts through
   `next/font`.
5. Migrate shared UI primitives from hard, square Neo Brutalism treatments to
   token-driven Solar Dusk radius, border, shadow, and interaction treatments.
6. Remove Neo Brutalism-specific utilities and sweep every consumer.
7. Preserve and contrast-test app-specific semantic status tokens.
8. Align PWA metadata, browser chrome, splash background, and generated icons
   with the dark-default theme.
9. Supersede the old design-system decision and update all current product and
   planning documentation without rewriting historical phase records.
10. Complete automated and manual visual, accessibility, responsive, and PWA
    regression testing.

## Prerequisites

- **Phase 14** — transition, skeleton, safe-area, reduced-motion, and UX audit
  patterns are the migration baseline.
- **Phase 15** — automated regression suite and iPhone manual checklist exist.
- **Phase 16** — production baseline and release process exist.
- **Phase 17** — tabs, legality badges, filter sheets/chips, and mana pips are
  present and must be included in the migration.

Phase 18 is not an MVP prerequisite. It runs after the Phase 17 `v1.1.0`
release. Phase numbers are execution order, not product version numbers; select
the release version during implementation without displacing the master plan's
cloud-sync roadmap.

## Dependencies on Previous Phases

| Phase | Dependency |
| ----- | ---------- |
| 1 | Tailwind v4, shadcn CSS variables, root layout, fonts, ADR-010 |
| 2 | Manifest metadata, icons, iPhone standalone presentation |
| 5–13 | Status tokens and feature surfaces that consume shared primitives |
| 14 | Motion, skeleton, safe-area, responsive, and accessibility audit |
| 15 | Unit/integration/E2E gates and iPhone checklist |
| 16 | Production release and rollback process |
| 17 | Tabs, legality UI, filters, sheets, chips, mana-symbol fallbacks |

## Duration Estimate

**4–6 days** for a single developer.

| Sub-area | Estimate |
| -------- | -------- |
| ADR, source inventory, baseline screenshots | 0.5 day |
| Theme tokens, fonts, dark-default provider | 1 day |
| Shared primitive migration | 1 day |
| Feature-level class and chart sweep | 1–1.5 days |
| PWA metadata/icons and documentation | 0.5 day |
| Automated + iPhone visual/accessibility QA | 1–1.5 days |

## Architecture & Key Decisions

### 18.A — The registry payload is authoritative

Use `https://tweakcn.com/r/themes/solar-dusk.json` as a build-time reference.
Copy its values into `app/globals.css`; the application must never fetch the
theme at runtime.

The payload defines:

- light and dark shadcn colour variables
- `--radius: 0.3rem`
- Oxanium sans, Merriweather serif, and Fira Code mono
- soft, blurred elevation shadows
- tracking and spacing variables
- body letter spacing

Keep the existing Tailwind v4 `@theme inline` colour mappings and add/repair
font, radius, tracking, and shadow mappings as needed. Remove the current
`--radius: 0px`, hard-shadow overrides, and ADR-010 comments.

Do not use the shadcn CLI with `--force` or reinitialize the project: that can
overwrite customized primitives and regress fonts. Apply and review the theme
as an explicit code change.

### 18.B — Dark is the deterministic default

Install `next-themes` and add a small client `ThemeProvider`:

```tsx
<ThemeProvider
  attribute="class"
  defaultTheme="dark"
  enableSystem={false}
  disableTransitionOnChange
>
  {children}
</ThemeProvider>
```

Root-layout rules:

- Render `<html className="dark" suppressHydrationWarning>` so the server
  response and pre-hydration paint are dark.
- Put the `next/font` variable classes on `<html>`, not `<body>`.
- Nest the provider with the existing app providers without changing their
  ownership of Query Client or database state.
- Use `storageKey="mtg-deck-builder-theme"` (or document an equivalent stable
  key) so the preference is isolated and persistent.
- Expose only `dark` and `light` choices. A system mode is out of scope because
  it makes first-run appearance dependent on the device instead of the stated
  dark default.
- Delay the settings control's selected-state rendering until mounted to avoid
  hydration mismatch. The page itself must remain dark and usable meanwhile.

An existing user with no theme key receives dark. An explicit light preference
survives reload, offline launch, and installed-PWA relaunch.

### 18.C — Fonts follow Solar Dusk

Replace DM Sans and Space Mono in `app/layout.tsx` with:

- `Oxanium` for sans and headings
- `Fira_Code` for mono
- `Merriweather` for serif

Load only the weights actually used by the app, use `display: "swap"`, and keep
all three as `next/font/google` variable fonts where supported. Map the runtime
font variables from `:root` / `.dark`; avoid circular `@theme inline`
declarations such as `--font-sans: var(--font-sans)`.

The migration does not require every label to remain uppercase or monospace.
Audit those usages: retain mono for numeric/card metadata and technical values;
use Oxanium for navigation, controls, and headings where the old all-caps mono
voice was purely Neo Brutalist.

### 18.D — Shared primitives own visual consistency

Migrate `components/ui/*` before feature files:

- `Button`: token border, Solar Dusk radius and shadow; remove hard-offset
  shadow and translate-on-press. Keep focus, disabled, destructive, size, and
  44px touch-target behaviour.
- `Card`: token radius, one-pixel border, theme elevation.
- `Input`: token radius/border/shadow; preserve visible focus and invalid state.
- `Badge`: token radius and border; status text remains visible.
- `Sheet`: theme surface, border, radius, shadow, safe-area padding, drag and
  close behaviour unchanged.
- `Skeleton`: token radius with no decorative hard border.
- `Tabs` from Phase 17: clear selected, hover, focus, and disabled states.
- `Separator`: verify contrast in both modes.

Feature components should compose these primitives or use semantic utilities
(`bg-card`, `border-border`, `shadow-sm`, `rounded-lg`) rather than reproduce a
local design system.

### 18.E — Remove, do not disguise, Neo Brutalism

Delete `shadow-brutal`, `shadow-brutal-sm`, and `shadow-brutal-lg` after every
consumer is migrated. Replace each use based on elevation:

| Old use | Solar Dusk replacement intent |
| ------- | ----------------------------- |
| Inline control / input | `shadow-xs` or no shadow |
| Card / panel | `shadow-sm` |
| Popover / sticky elevated surface | `shadow-md` |
| Sheet / modal | `shadow-lg` |

Audit and remove theme-driven occurrences of:

- `rounded-none`
- decorative `border-2` / `border-4`
- `border-black`
- hard-coded black/white surface colours
- hard offset box shadows
- press translation classes
- Neo Brutalism comments and motion descriptions

Do not mechanically remove borders used for layout, focus, chart readability,
or accessibility. Review each occurrence in context.

### 18.F — Semantic app tokens remain semantic

The Solar Dusk registry does not know the app's CURRENT, ADD, CUT, CONSIDER,
COMMANDER, warning, legality, or mana-pip meanings. Keep those variables as an
app-owned semantic extension derived from Solar Dusk tokens.

Requirements:

- define foreground and background pairs for light and dark mode
- meet WCAG AA contrast for text at the rendered size
- preserve text/icon labels so colour is never the only signal
- verify charts, legends, legality badges, warning banners, and fallback mana
  pips separately
- do not introduce raw palette classes in feature components

If the five chart colours cannot safely represent every status in both modes,
derive semantic colours from the Solar Dusk palette in `globals.css` and record
that exception in the new ADR.

### 18.G — PWA chrome and icons use dark-default colours

Update:

- `app/manifest.ts` `background_color` and `theme_color`
- `app/layout.tsx` viewport `themeColor`
- `scripts/generate-icons.mjs`
- generated PNG icons under `public/icons/`

Use verified sRGB hex equivalents of the Solar Dusk dark background and primary
tokens for manifest/icon tooling that does not reliably support OKLCH. Record
the mapping beside the values so future token updates keep PWA assets aligned.

The static manifest represents the default theme and therefore remains dark
even when a user selects light. Add a client-side theme-colour sync only if it
can be tested without introducing hydration or standalone-mode regressions;
otherwise document that browser chrome follows the dark product default.

### 18.H — Governance is supersession, not history rewriting

Add a new ADR after the latest existing ADR:

**"tweakcn Solar Dusk supersedes Neo Brutalism; dark is the default."**

The ADR must explain:

- why the visual system changed
- why the registry payload is authoritative
- why dark is deterministic rather than system-derived
- why semantic app tokens remain extensions
- migration and rollback consequences
- that ADR-010 is superseded, not deleted

Update current-state documentation (`README.md`, `docs/product-spec.md`, master
plan visual-design section and roadmap) to Solar Dusk. Keep completed Phase
0–17 documents historically accurate; do not bulk-edit their handoff prompts.
Phase 18 and the phase index establish the new rule for subsequent phases.

## Data Model Impact

No deck, card, wishlist, version, or IndexedDB schema changes.

Theme preference is presentation-only and stored by `next-themes` under its
dedicated local-storage key. Do not add it to exported `AppSettings`; backup and
restore remain domain-data operations and must not overwrite device appearance.

## Routes / Screens

No new routes. Audit every current route and overlay, including:

```text
/                         — app shell, navigation, empty/loading states
/cards                    — search, results, Phase 17 filters/chips
/cards/[cardId]           — tabs, legality, pricing, mana symbols
/decks                    — list, create/edit forms
/decks/[deckId]           — details, card rows, warnings
/decks/[deckId]/stats     — charts and legends
/decks/[deckId]/changes   — ADD/CUT/CONSIDER workflow
/wishlist                 — priorities, targets, actions
/settings                 — appearance selector and previews
all sheets/dialogs/toasts — focus, overlay, safe area, elevation
```

## File Structure (files to create/modify)

### Create

```text
components/providers/theme-provider.tsx      — next-themes wrapper
components/settings/theme-picker.tsx         — explicit Dark / Light selector
tests/unit/components/theme-picker.test.tsx  — mounted state and selection
tests/e2e/theme-appearance.test.ts            — default + persistence coverage
```

### Modify

```text
package.json / package-lock.json              — add next-themes
app/globals.css                               — exact Solar Dusk token sets
app/layout.tsx                                — fonts, dark SSR class, provider
app/manifest.ts                               — dark-default PWA colours
components/providers/app-providers.tsx        — provider composition if needed
components/settings/appearance-settings.tsx   — add theme picker
components/ui/*.tsx                           — primitive migration
components/shared/app-toaster.tsx             — Solar Dusk toast treatment
components/shared/sheet-drag-handle.tsx       — token-driven handle
lib/ui/motion-config.ts                       — neutral motion rationale
scripts/generate-icons.mjs                    — Solar Dusk icon palette
public/icons/*.png                            — regenerated assets
feature components using shadow-brutal,
rounded-none, border-4, or raw black/white     — contextual migration
README.md                                     — current theme description
docs/decisions.md                             — new ADR superseding ADR-010
docs/product-spec.md                          — revise S-24
plans/mtg-deck-builder-web-app-build-plan.md  — current design system + roadmap
build-plan/README.md                           — Phase 18 index/order/principle
build-plan/checklists/iphone-safari-manual.md — dark/light PWA checks
```

## Detailed Task List

### 18.1 — Baseline, inventory, and governance

- [ ] Confirm Phase 17 is complete and CI is green before theme work starts
- [ ] Capture desktop and iPhone-width screenshots of every route and overlay
- [ ] Inventory `shadow-brutal*`, `rounded-none`, `border-[24]`, `border-black`,
      raw black/white colours, font-mono uppercase labels, and theme comments
- [ ] Add the new Solar Dusk ADR and mark ADR-010 superseded
- [ ] Record the fetched registry URL and values used; no runtime dependency
- [ ] Define a rollback boundary: token/provider/primitives/PWA changes revert
      together, never as partial visual rollback

### 18.2 — Solar Dusk tokens

- [ ] Copy the registry's complete light variables into `:root`
- [ ] Copy the registry's complete dark variables into `.dark`
- [ ] Apply `--radius: 0.3rem`, tracking, spacing, and exact shadow scales
- [ ] Preserve safe-area and reduced-motion utilities unchanged
- [ ] Remove hard-shadow override comments and `--radius: 0px`
- [ ] Repair `@theme inline` mappings for colours, fonts, radius, and shadows
- [ ] Add/verify body `letter-spacing: var(--tracking-normal)`
- [ ] Keep semantic app tokens in both modes and contrast-test them

### 18.3 — Dark-default provider and appearance control

- [ ] Install `next-themes` through npm and commit its lockfile change
- [ ] Add `components/providers/theme-provider.tsx`
- [ ] Render `<html className="dark" suppressHydrationWarning>`
- [ ] Configure class-based theme, `defaultTheme="dark"`,
      `enableSystem={false}`, and a stable storage key
- [ ] Add Dark / Light controls to Settings → Appearance
- [ ] Disable or skeleton the selected-state UI until mounted
- [ ] Verify first visit, no-key migration, explicit light, reload, offline
      relaunch, and installed-PWA relaunch
- [ ] Verify there is no white flash or React hydration warning

### 18.4 — Typography

- [ ] Replace DM Sans with Oxanium
- [ ] Replace Space Mono with Fira Code
- [ ] Add Merriweather and map `font-serif`
- [ ] Move font variable classes to `<html>`
- [ ] Load only used weights/subsets and retain `display: "swap"`
- [ ] Audit heading, navigation, button, metadata, and uppercase mono usage
- [ ] Verify no layout overflow at 320px and 375px widths

### 18.5 — Shared UI primitives

- [ ] Migrate Button, Card, Input, Badge, Sheet, Skeleton, Separator, and Tabs
- [ ] Remove zero-radius, hard-border, and hard-shadow assumptions
- [ ] Preserve variants, sizes, focus states, disabled states, and test IDs
- [ ] Verify destructive and outline variants in light and dark
- [ ] Verify sheets/dialogs retain focus trap, close gestures, and safe areas
- [ ] Verify tab selection and legality badge meanings from Phase 17

### 18.6 — Feature and utility sweep

- [ ] Replace every `shadow-brutal*` consumer contextually
- [ ] Delete all three `shadow-brutal*` utilities only after search reaches zero
- [ ] Review every decorative `border-2`, `border-4`, and `rounded-none`
- [ ] Remove raw `border-black` and hard-coded surface black/white
- [ ] Update app toaster, sheet drag handle, app shell, forms, banners, cards,
      empty states, and loading states
- [ ] Update chart bars, chart legends, warning panels, and density previews
- [ ] Include Phase 17 filters, chips, tabs, legality UI, and fallback mana pips
- [ ] Update Neo Brutalism-specific motion comments/behaviour
- [ ] Re-run searches and document intentional remaining thick/square borders

### 18.7 — PWA and icons

- [ ] Convert the dark background and primary OKLCH tokens to verified sRGB hex
- [ ] Update manifest background/theme colours and viewport theme colour
- [ ] Update icon-generation palette and comments
- [ ] Regenerate all icons with `npm run icons:generate`
- [ ] Inspect normal, maskable, and Apple touch icons at actual rendered sizes
- [ ] Verify iOS splash/startup does not flash white
- [ ] Verify light preference does not make content unreadable under dark
      static browser/PWA chrome

### 18.8 — Documentation

- [ ] Update README theme description and screenshots if present
- [ ] Revise product spec S-24 to Solar Dusk, dark-default
- [ ] Update the master plan's visual design section and post-MVP roadmap
- [ ] Update the phase index, graph, order, principles, and theme reference
- [ ] Extend the iPhone manual checklist for both themes and relaunch
- [ ] Keep Phase 0–17 documents unchanged as historical records
- [ ] Remove current-state claims that Neo Brutalism is still the active system

### 18.9 — Automated and manual verification

- [ ] Add unit coverage for theme picker mounted state and theme selection
- [ ] Add E2E: empty storage starts dark
- [ ] Add E2E: select light → reload → remains light
- [ ] Add E2E: return to dark → reload → remains dark
- [ ] Assert via class/computed style, not screenshots or exact pixel colours
- [ ] Run existing E2E to prove interaction/test IDs are unchanged
- [ ] Run automated accessibility checks already available in the repository
- [ ] Complete desktop, mobile-width, and installed iPhone visual audits

## Implementation Notes

### Do not use `:root` as dark mode

Keep Solar Dusk light values in `:root` and dark values in `.dark`. Dark should
be selected by the root class/provider. Reversing the token blocks would make
standard shadcn dark semantics misleading and complicate future maintenance.

### Avoid theme hydration mismatch

`useTheme()` cannot know the persisted client choice during server rendering.
The document can safely render dark by default, while controls that display the
current choice wait until mounted. Do not gate or hide the whole application.

### Token migration before class sweep

The safe order is:

```text
ADR + baseline
  → tokens and fonts
  → dark-default provider
  → shared primitives
  → feature sweep
  → remove old utilities
  → PWA assets
  → docs and full QA
```

Do not delete `shadow-brutal*` before consumers are migrated, and do not ship
with temporary compatibility aliases.

### Historical plans

Completed phase documents describe the constraints under which those phases
were built. Their Neo Brutalism references are not current product guidance
after Phase 18, but rewriting them would make the project history inaccurate.
Only the phase index/current docs and future phase prompts should state the new
rule.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md).

- [ ] `npm run format:check`
- [ ] `npm run lint`
- [ ] `npm run typecheck`
- [ ] `npm run test:unit`
- [ ] `npm run test:integration`
- [ ] `npm run test:e2e`
- [ ] `npm run build`
- [ ] Knip clean after dependency/provider changes
- [ ] No `shadow-brutal` matches remain
- [ ] No unintended `rounded-none`, `border-black`, or decorative `border-4`
      matches remain
- [ ] No hydration warning in development or production build
- [ ] No network request to tweakcn at runtime

## Testing Checklist

### Unit / component

- [ ] Theme picker renders safely before mount
- [ ] Dark and Light actions call the expected theme change
- [ ] Accessible labels and `aria-pressed` / selected state are correct
- [ ] Existing primitive/component tests pass after class changes

### E2E

- [ ] Fresh browser storage renders `<html class="dark">`
- [ ] First visible paint uses dark background
- [ ] Explicit light selection persists after hard reload
- [ ] Explicit dark selection persists after hard reload
- [ ] Card/deck/wishlist/change workflows are unchanged
- [ ] Phase 17 tabs, legality, filters, and mana symbols remain usable
- [ ] Sheets, dialogs, toasts, and bottom navigation remain usable

### Visual / accessibility

- [ ] Every route audited at 320px, 375px, 768px, and desktop widths
- [ ] Light and dark text/background pairs meet WCAG AA
- [ ] Status and legality meanings remain text/icon-labelled
- [ ] Focus rings are visible on all interactive surfaces in both modes
- [ ] Charts and legends remain distinguishable without relying on colour alone
- [ ] Long card/deck names and Fira Code metadata do not overflow
- [ ] Reduced-motion preference remains respected

### Manual (iPhone Safari, installed PWA)

- [ ] Fresh install opens dark with matching splash and status-bar chrome
- [ ] No white flash on cold start, route navigation, or offline relaunch
- [ ] Light selection persists after fully closing and reopening the PWA
- [ ] Safe areas and home-indicator clearance are unchanged
- [ ] Sheets, filter controls, and tabs remain one-hand usable
- [ ] Keyboard focus/zoom behaviour in inputs is unchanged
- [ ] Airplane-mode launch is fully styled; no theme depends on the network

## Exit Criteria

- [ ] Exact Solar Dusk light and dark registry tokens are the only base theme
- [ ] Dark is the deterministic first-run and no-preference default
- [ ] Explicit Dark and Light settings persist across reload and PWA relaunch
- [ ] No first-paint flash or hydration warning
- [ ] Oxanium, Fira Code, and Merriweather load through `next/font`
- [ ] Shared primitives and every route use Solar Dusk radius/shadow/borders
- [ ] Zero `shadow-brutal*` utilities or consumers remain
- [ ] Semantic statuses, legality badges, charts, and mana pips are accessible
- [ ] PWA metadata and generated icons match the dark-default palette
- [ ] ADR-010 is superseded by a new Solar Dusk decision
- [ ] Current docs and roadmap identify Solar Dusk as the active design system
- [ ] Historical Phase 0–17 documents remain intact
- [ ] Full CI, production build, E2E, and iPhone manual checklist are green
- [ ] Release notes identify the visual migration and rollback boundary

## Risks & Mitigations

| Risk | Impact | Mitigation |
| ---- | ------ | ---------- |
| Token-only swap leaves a hybrid UI | Inconsistent product | Primitive-first migration plus zero-match sweep |
| Theme provider causes hydration flash | Poor first paint | Server `dark` class, suppressed root mismatch, mounted control |
| Persisted light conflicts with root dark | Warning or flicker | `next-themes` owns class after hydration; E2E both states |
| Status colours lose contrast | Accessibility regression | Per-mode semantic pairs and contrast audit |
| Font swap causes overflow/layout shift | Broken mobile rows | Restricted weights, `next/font`, 320/375px audit |
| Removing thick borders harms hierarchy | Flat/confusing surfaces | Use Solar Dusk elevation and token borders contextually |
| PWA splash remains white | Jarring cold start | Manifest, viewport, icons, real-device cold-start test |
| Phase 17 surfaces are missed | Old styling survives | Explicit prerequisite and route/component checklist |
| Bulk edits change interactions/test IDs | Functional regressions | Classes only where possible; existing E2E remains authoritative |
| Registry URL changes later | Unreproducible design | Record URL/values in ADR; app contains copied tokens |
| Old plans conflict with new agents | Future styling mistakes | Current phase index marks supersession; future prompts cite Phase 18 |

## Out of Scope

- New deck-building, card-search, pricing, sync, or AI features
- Changes to IndexedDB schemas, repositories, backup format, or domain models
- A system-following theme mode
- User-created themes, accent pickers, or arbitrary palettes
- Runtime download of tweakcn themes
- Replacing shadcn/Radix primitives with another component system
- Rewriting completed Phase 0–17 documents
- Pixel-perfect screenshot tests with brittle colour assertions
- Broad layout redesign unrelated to removing Neo Brutalism
- Cloud synchronization of appearance preferences

## Handoff to Next Phase

Phase 18 leaves:

1. Solar Dusk light/dark tokens as the only base visual system.
2. Dark-first theme infrastructure with an explicit local preference.
3. Token-driven shared primitives suitable for future feature phases.
4. A superseding ADR that future agents must follow.

Every future phase must read Phase 18 and use Solar Dusk tokens and shared
primitives. It must not reintroduce hard-offset shadows, zero-radius overrides,
or Neo Brutalism-specific utility classes.
