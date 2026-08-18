# Phase 16 — Production Launch

## Agent Handoff Prompt

```
You are implementing Phase 16 (Production Launch) of the MTG Deck Builder PWA.

Workspace: mtg-deck-manager
Read first:
- build-plan/phase-16-production-launch.md (this document — follow every section)
- build-plan/README.md (context and dependencies)
- plans/mtg-deck-builder-web-app-build-plan.md (master reference, sections 43–45, 62, 63, 70)

Prerequisites: Phases 0–15 complete. All tests passing. iPhone manual checklist signed off.

Goal: Deploy the application to production on Vercel, complete the full launch checklist, configure domain/HTTPS, document error tracking and analytics decisions, and perform final QA on iPhone before announcing ready for personal use.

Deliverables:
1. Production Vercel project configured and deployed from main
2. HTTPS verified with optional custom domain
3. Full launch checklist completed (every item from master plan §62)
4. Error tracking decision documented and implemented (or explicitly deferred with rationale)
5. Analytics decision documented and implemented (or explicitly deferred with rationale)
6. Production environment variables secured
7. Final QA pass on physical iPhone
8. Release notes / version tag v1.0.0

This is the final phase. Do not add new features — launch only.

When done, the Definition of Done workflow (master plan §70) passes flawlessly on iPhone against production URL.
```

## Overview

Phase 16 is **production launch** — transitioning from preview deployments and development builds to a stable, HTTPS-hosted PWA that users install on their iPhone Home Screen for daily deck-building use.

This phase is primarily **operational**: Vercel configuration, domain setup, security review, monitoring decisions, and a disciplined walkthrough of the master plan's launch checklist (§62). No new product features unless a P0 bug is discovered during final QA.

Success criterion: the complete workflow in master plan §70 (Definition of Done) works flawlessly against the **production URL** on a physical iPhone installed as a standalone Home Screen web app.

## Goal

1. Deploy production build to Vercel from `main` branch.
2. Verify HTTPS, PWA manifest, icons, and service worker in production.
3. Complete every item on the launch checklist.
4. Make and document error tracking decision (Sentry, Vercel, or none).
5. Make and document analytics decision (Vercel Analytics, Plausible, or none).
6. Confirm no secrets exposed client-side.
7. Execute final iPhone QA against production.
8. Tag release v1.0.0 and publish release notes.

## Prerequisites

- **Phases 0–15** complete.
- **Phase 15** — all CI tests green; iPhone manual checklist signed off on preview.
- GitHub repository connected to Vercel.
- Domain registrar access (if custom domain desired).
- Physical iPhone for final QA.

## Dependencies on Previous Phases

| Phase | Launch dependency                        |
| ----- | ---------------------------------------- |
| 1     | Vercel project exists; build succeeds    |
| 2     | PWA manifest, SW, icons production-ready |
| 3     | IndexedDB persistence verified           |
| 10    | Export/import tested for user onboarding |
| 15    | Full test suite passing                  |
| 14    | UX polish complete for first impression  |

## Duration Estimate

**2–4 days** (includes QA buffer and DNS propagation wait).

| Sub-area                   | Estimate                     |
| -------------------------- | ---------------------------- |
| Vercel production config   | 0.5 day                      |
| Domain + DNS               | 0.5–1 day (propagation wait) |
| Error tracking setup       | 0.5 day                      |
| Analytics setup            | 0.5 day                      |
| Launch checklist execution | 1 day                        |
| Final iPhone QA + hotfixes | 0.5–1 day                    |
| Release notes + tag        | 0.5 day                      |

## Architecture & Key Decisions

### Production deployment model

**Decision:** Git-based Vercel deployment:

```text
feature branches → Preview deployments (QA)
main branch      → Production deployment (auto)
```

Protect `main` with required CI checks (Phase 15).

### Environment separation

**Decision:**

| Environment | Branch      | URL                                          |
| ----------- | ----------- | -------------------------------------------- |
| Production  | `main`      | `https://deck.example.com` or `*.vercel.app` |
| Preview     | PR branches | `*.vercel.app`                               |

Production env vars separate from preview.

### Error tracking decision matrix

**Decision:** Document choice in `docs/decisions/error-tracking.md` or README:

| Option                     | Pros                                   | Cons                   |
| -------------------------- | -------------------------------------- | ---------------------- |
| **Sentry**                 | Rich client error capture, source maps | Cost, bundle size      |
| **Vercel Runtime Logs**    | Already integrated                     | Server-side only       |
| **Console + user reports** | Zero overhead                          | No proactive detection |

**Recommendation for MVP:** Sentry client-side (free tier) for unhandled exceptions + DB migration failures, OR explicit defer with GitHub Issues template for bug reports.

If deferred, implement minimal `window.onerror` logger to console in production (no PII).

### Analytics decision matrix

**Decision:** Document in `docs/decisions/analytics.md`:

| Option                 | Pros                                   | Cons             |
| ---------------------- | -------------------------------------- | ---------------- |
| **None**               | Privacy-first, aligns with local-first | No usage insight |
| **Vercel Analytics**   | Zero config, privacy-friendly          | Page views only  |
| **Plausible / Fathom** | Privacy-focused                        | Extra cost/setup |

**Recommendation for MVP:** Vercel Analytics (web analytics) if desired, OR none — local-first app may not need analytics for personal use launch.

Must not collect deck contents or card lists in analytics events.

### Custom domain

**Decision:** Optional for MVP but recommended before serious iPhone use (master plan §45). HTTPS required for PWA.

If no custom domain initially, use stable `*.vercel.app` URL — **note:** reinstall Home Screen app if production URL changes.

### Secrets management

**Decision:**

- Price provider API keys: Vercel env vars, server routes only
- No secrets in `NEXT_PUBLIC_*` except app URL
- Audit `git log` for leaked secrets before launch

### Release versioning

**Decision:** Tag `v1.0.0` on launch commit. Semantic versioning thereafter.

## Data Model Impact

**None.**

Optional: set `appMeta` record on first production launch:

```ts
{ key: 'lastSeenVersion', value: '1.0.0' }
```

Used for future "what's new" prompts (post-MVP).

## Routes / Screens

No new routes. Verify all existing routes work on production URL:

```text
/
/decks
/decks/[deckId]
/decks/[deckId]/cards
/decks/[deckId]/changes
/decks/[deckId]/stats
/cards
/cards/[cardId]
/wishlist
/settings
/settings/data
/settings/about
```

## File Structure (files to create/modify)

### Create

```text
docs/decisions/error-tracking.md
docs/decisions/analytics.md
docs/launch-checklist.md              — copy of checklist with sign-off dates
CHANGELOG.md                          — v1.0.0 release notes
.env.production.example               — document required env vars (no values)
vercel.json                           — if custom headers/redirects needed
```

### Modify

```text
README.md                             — production URL, install instructions
package.json                          — version 1.0.0
app/layout.tsx                        — error tracking init (if Sentry)
next.config.ts                        — Sentry webpack plugin (if Sentry)
.github/workflows/ci.yml              — production deploy verification
```

## Detailed Task List

### 16.1 — Vercel Production Configuration

- [ ] Confirm GitHub repo connected to Vercel project
- [ ] Set production branch to `main`
- [ ] Configure production environment variables:
  - [ ] `NEXT_PUBLIC_APP_URL` → production URL
  - [ ] `PRICE_PROVIDER_API_KEY` (if used, server-only)
  - [ ] `PRICE_PROVIDER_ENDPOINT` (if used)
  - [ ] Sentry DSN (if Sentry chosen)
- [ ] Verify preview env vars separate from production
- [ ] Confirm build command: `npm run build` (or `next build`)
- [ ] Confirm output directory default (Next.js)
- [ ] Enable Vercel deployment protection if desired (password for previews)
- [ ] Configure Node.js version to match local dev
- [ ] Review Vercel function regions (default OK for MVP)

### 16.2 — Production Build Verification

- [ ] Run `npm run build` locally — zero errors
- [ ] Run `npm run start` locally — smoke test production build
- [ ] Deploy to production from `main`
- [ ] Verify deployment URL loads
- [ ] Check Vercel build logs for warnings
- [ ] Verify static assets served with cache headers
- [ ] Verify API routes work (Scryfall proxy, pricing if server-side)

### 16.3 — HTTPS & Domain

- [ ] HTTPS working on default Vercel URL (automatic)
- [ ] Add custom domain in Vercel dashboard (if desired)
- [ ] Configure DNS records (A/CNAME per Vercel instructions)
- [ ] Wait for DNS propagation
- [ ] Verify SSL certificate active
- [ ] Set `NEXT_PUBLIC_APP_URL` to custom domain
- [ ] Redirect www → apex or vice versa (choose one)
- [ ] Update PWA manifest `start_url` if domain changed
- [ ] Document final production URL in README

### 16.4 — PWA Production Verification

- [ ] Manifest accessible at `/manifest.webmanifest` or equivalent
- [ ] Manifest `start_url` points to production origin
- [ ] Manifest `scope` covers app routes
- [ ] Icons 192×192 and 512×512 load (no 404)
- [ ] Apple touch icon configured
- [ ] `theme_color` and `background_color` correct
- [ ] `display: standalone` set
- [ ] Service worker registers on production HTTPS
- [ ] Offline app shell works on production
- [ ] "Add to Home Screen" flow tested on iPhone Safari (production URL)
- [ ] Installed app opens in standalone mode
- [ ] iOS meta tags: `apple-mobile-web-app-capable`, status bar style

### 16.5 — Launch Checklist (from master plan §62)

Execute and sign off each item:

- [ ] Production Vercel project created
- [ ] HTTPS working
- [ ] Custom domain configured if desired
- [ ] PWA manifest verified
- [ ] Icons verified
- [ ] Service Worker verified
- [ ] iPhone Home Screen installation tested (production URL)
- [ ] IndexedDB persistence tested (production, Home Screen app)
- [ ] Data export tested (production)
- [ ] Data restore tested (production)
- [ ] Scryfall rate/request handling tested (production)
- [ ] Price provider behavior tested (production)
- [ ] TCGplayer links tested (production, open externally)
- [ ] No secrets exposed client-side (audit complete)
- [ ] Production build succeeds
- [ ] Error tracking configured (or defer documented)
- [ ] Analytics decision documented

### 16.6 — Security Audit

- [ ] Run `npm audit` — fix critical/high or document accepted risk
- [ ] Review all `NEXT_PUBLIC_*` env vars — no secrets
- [ ] Review API routes — rate limiting on expensive endpoints
- [ ] Confirm no API keys in client bundle (`next build` + grep)
- [ ] Confirm import validates JSON — no eval or dangerouslySetInnerHTML
- [ ] CORS headers on API routes restrictive
- [ ] Content Security Policy (optional, document if deferred)
- [ ] Dependencies pinned or lockfile committed

### 16.7 — Error Tracking Implementation

- [ ] Document decision in `docs/decisions/error-tracking.md`
- [ ] If Sentry:
  - [ ] Install `@sentry/nextjs`
  - [ ] Configure client + server
  - [ ] Upload source maps (Vercel integration)
  - [ ] Test error capture (throw test error in staging, verify dashboard)
  - [ ] Scrub PII from error reports (no deck names required)
  - [ ] Filter benign errors (network offline, cancelled fetch)
- [ ] If deferred:
  - [ ] Document rationale
  - [ ] Add GitHub bug report template
  - [ ] Ensure error UI surfaces are user-friendly (Phase 14/39)

### 16.8 — Analytics Implementation

- [ ] Document decision in `docs/decisions/analytics.md`
- [ ] If Vercel Analytics:
  - [ ] Enable in Vercel dashboard
  - [ ] Add `@vercel/analytics` if required
  - [ ] Verify page views recorded
  - [ ] Confirm no deck/card data in custom events
- [ ] If none:
  - [ ] Document privacy-first rationale
  - [ ] No tracking scripts in bundle

### 16.9 — Final iPhone QA (Production)

Re-run on **production URL**, installed as Home Screen app:

- [ ] **Definition of Done workflow (§70)** — complete end-to-end:
  - [ ] Open app from Home Screen
  - [ ] Select deck
  - [ ] View current deck
  - [ ] Toggle card images off
  - [ ] Search card
  - [ ] Open card detail
  - [ ] See image + metadata + price
  - [ ] Mark CONSIDER
  - [ ] Assign tags
  - [ ] Promote to ADD
  - [ ] Mark existing card CUT
  - [ ] Open Need to Add → see upgrade price
  - [ ] Open TCGplayer link
  - [ ] Apply changes
  - [ ] Save version
  - [ ] Force close app
  - [ ] Reopen from Home Screen
  - [ ] Everything remains
- [ ] Fresh install test: new user onboarding → create deck → export backup
- [ ] Update test: if SW update deployed during QA, verify update flow
- [ ] Performance: initial load <3s on LTE
- [ ] No console errors during normal use

### 16.10 — Documentation & Release

- [ ] Update README with:
  - [ ] Production URL
  - [ ] Install instructions (iPhone)
  - [ ] Local-first / backup reminder
  - [ ] Development setup
  - [ ] Link to master plan and build-plan
- [ ] Write CHANGELOG.md v1.0.0 entry:
  - [ ] MVP feature list
  - [ ] Known limitations
  - [ ] Supported formats (Commander)
- [ ] Git tag `v1.0.0`
- [ ] GitHub Release with notes
- [ ] Archive launch checklist with sign-off date in `docs/launch-checklist.md`

### 16.11 — Post-Launch Monitoring (first 48 hours)

- [ ] Monitor Vercel deployment dashboard for errors
- [ ] Monitor Sentry (if configured) for new issues
- [ ] Check Scryfall API usage not hitting rate limits
- [ ] Respond to any user-reported issues
- [ ] Hotfix process documented: branch → PR → CI → merge → auto-deploy

### 16.12 — Optional Production Hardening

- [ ] Vercel Firewall rules (if needed)
- [ ] Rate limit on `/api/*` routes
- [ ] `robots.txt` — allow or disallow per preference
- [ ] Favicon + OG meta tags for link sharing
- [ ] 404 page themed (Neo Brutalism)
- [ ] 500 error page themed

## Implementation Notes

### Vercel environment variables

```text
# Production only — set in Vercel dashboard
NEXT_PUBLIC_APP_URL=https://your-domain.com
PRICE_PROVIDER_API_KEY=sk_...        # server-only, NO NEXT_PUBLIC prefix
SENTRY_DSN=https://...@sentry.io/... # if using Sentry
```

### vercel.json headers (optional)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" }
      ]
    }
  ]
}
```

### PWA start_url

Ensure manifest `start_url` is `/` on production domain. Changing domain after users install breaks their installed app shortcut — communicate URL stability.

### iPhone storage reminder (onboarding)

Production onboarding must include (master plan §3):

> Install Deck Builder to your Home Screen before you start building decks. This keeps your deck data inside the installed app's local storage.

Safari browsing and Home Screen app have **separate storage** — verify onboarding displays on production.

### Hotfix workflow

```text
hotfix/description branch
  → PR to main
  → CI passes
  → Merge
  → Vercel auto-deploys production
  → Verify on iPhone
  → Tag v1.0.1 if needed
```

### What "launch" means for this product

This is a **personal-use MVP launch**, not App Store release. Success = reliable daily deck management on iPhone with safe local data and export path.

## Automation & Quality Gates

Reference: [`automation-strategy.md`](./automation-strategy.md) — Phase 16 matrix.

- [ ] **Gate:** `npm run test:all` passes on `main` before production promote
- [ ] CI required status checks on `main` branch (lint, typecheck, test:ci, test:e2e, build)
- [ ] Knip enforced (no `|| true`)
- [ ] Optional: `.github/workflows/e2e-nightly.yml` against Vercel preview URL
- [ ] Complete [`checklists/iphone-safari-manual.md`](./checklists/iphone-safari-manual.md) on production URL
- [ ] Document CI badge in README

## Testing Checklist

### Pre-launch gates (all must pass)

- [ ] Phase 15 CI fully green on `main`
- [ ] Production build deploys without error
- [ ] Launch checklist §62 — 100% complete
- [ ] Security audit — no client secrets
- [ ] Definition of Done §70 on production iPhone
- [ ] Export/import round-trip on production
- [ ] Offline editing on production installed app

### Smoke test script (production)

```text
1. Open production URL in Safari (iPhone)
2. Add to Home Screen
3. Launch installed app
4. Create "Launch Test" Commander deck
5. Add 5 cards via search
6. Mark 1 ADD, 1 CUT
7. Export all data
8. Enable airplane mode
9. Edit deck (add note)
10. Disable airplane mode
11. Apply changes
12. Force quit app
13. Reopen — verify all data
14. Delete "Launch Test" deck
```

## Exit Criteria

- [ ] Application live at production HTTPS URL
- [ ] Custom domain configured OR stable Vercel URL documented
- [ ] All 17 launch checklist items (§62) signed off
- [ ] Error tracking decision documented and implemented/deferred
- [ ] Analytics decision documented and implemented/deferred
- [ ] No secrets in client bundle (verified)
- [ ] Definition of Done workflow passes on production iPhone
- [ ] CHANGELOG v1.0.0 published
- [ ] Git tag v1.0.0 created
- [ ] README updated with production URL and install guide
- [ ] Post-launch monitoring plan active for 48 hours

## Risks & Mitigations

| Risk                            | Impact                               | Mitigation                                   |
| ------------------------------- | ------------------------------------ | -------------------------------------------- |
| DNS propagation delay           | Launch slip                          | Start DNS early; have Vercel URL fallback    |
| SW cache serves stale app       | Users on old version                 | Update prompt (Phase 2/14); cache versioning |
| Production Scryfall rate limit  | Search fails                         | Server-side throttle; cached fallback        |
| URL change breaks installed PWA | User data "lost" (different storage) | Stabilize domain before promoting install    |
| Last-minute P0 bug              | Delayed launch                       | Buffer day in estimate; hotfix process ready |
| Sentry source map leak          | Source exposure                      | Configure hidden source maps                 |

## Out of Scope

- App Store / Play Store release
- Marketing site / landing page
- User accounts / auth
- Cloud sync launch
- Paid tier / Stripe
- Social sharing features
- Public deck gallery
- SLA / uptime monitoring (beyond Vercel dashboard)
- CDN for card images (Scryfall CDN direct)
- Multi-region deployment
- Load testing at scale

## Handoff to Next Phase

Phase 16 completes the **MVP**. The first post-launch improvement phase is [`phase-17-legality-symbols-search-filters.md`](./phase-17-legality-symbols-search-filters.md) (v1.1.0) — card legality tabs with banned-card warnings, real MTG mana symbols, and faceted card search filters.

Beyond that, refer to master plan **§64 Post-MVP Roadmap** for Version 1.1+ features:

- Better deck importers (Moxfield, Archidekt)
- More format rules
- Wishlist price alerts
- Cloud backup
- AI deck analysis (v2.0)

### Recommended immediate post-launch tasks (not a formal phase)

1. Monitor errors for one week.
2. Gather personal use feedback.
3. Prioritize v1.1 backlog from real usage friction.
4. Keep exporting backups regularly (dogfood the export feature).

### Maintenance cadence

- Dependency updates: monthly
- Scryfall API changes: monitor changelog
- Banned list updates: refresh card legality cache periodically
- Vercel/Next.js security patches: apply promptly

**Congratulations — the MTG Deck Builder MVP is live.**
