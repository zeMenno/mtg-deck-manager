# Phase 16 — Production Launch

> **Status: In-repo complete; device/ops sign-off blocked** (2026-08-19).
> Production HTTPS URL exists: **https://mtg-deck-manager-two.vercel.app**.
> Decision docs, CHANGELOG v1.0.0, env examples, security headers, and launch checklist are in-repo.
> **Not done:** iPhone §70 / Home Screen persistence, git tag `v1.0.0`, push of local Phase 14–16 changes + redeploy, optional custom domain, `NEXT_PUBLIC_APP_URL` confirm in Vercel.

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

- [x] Confirm GitHub repo connected to Vercel project
- [x] Set production branch to `main` (verified via deployment meta `githubCommitRef: main`)
- [ ] Configure production environment variables:
  - [ ] `NEXT_PUBLIC_APP_URL` → production URL (**human:** set to `https://mtg-deck-manager-two.vercel.app`)
  - [x] `PRICE_PROVIDER_API_KEY` (if used, server-only) — N/A for MVP Scryfall pricing
  - [x] `PRICE_PROVIDER_ENDPOINT` (if used) — N/A
  - [x] Sentry DSN (if Sentry chosen) — N/A (deferred)
- [ ] Verify preview env vars separate from production (**human**)
- [x] Confirm build command: `npm run build` (or `next build`)
- [x] Confirm output directory default (Next.js)
- [ ] Enable Vercel deployment protection if desired (password for previews) — optional
- [x] Configure Node.js version to match local dev (project reports Node 24.x on Vercel)
- [x] Review Vercel function regions (default OK for MVP)

### 16.2 — Production Build Verification

- [x] Run `npm run build` locally — zero errors (prior phases; re-run before tag)
- [ ] Run `npm run start` locally — smoke test production build (**optional before push**)
- [x] Deploy to production from `main` (existing READY deployment)
- [x] Verify deployment URL loads (HTTPS 200)
- [ ] Check Vercel build logs for warnings (**human**)
- [ ] Verify static assets served with cache headers (**human**)
- [ ] Verify API routes work (Scryfall proxy, pricing if server-side) (**human** / after push)

### 16.3 — HTTPS & Domain

- [x] HTTPS working on default Vercel URL (automatic)
- [ ] Add custom domain in Vercel dashboard (if desired) — **deferred**
- [ ] Configure DNS records (A/CNAME per Vercel instructions) — N/A until domain chosen
- [ ] Wait for DNS propagation — N/A
- [x] Verify SSL certificate active (HSTS present)
- [ ] Set `NEXT_PUBLIC_APP_URL` to custom domain — N/A until custom domain
- [ ] Redirect www → apex or vice versa (choose one) — N/A
- [x] Update PWA manifest `start_url` if domain changed — `start_url: "/"` (origin-relative; OK)
- [x] Document final production URL in README

### 16.4 — PWA Production Verification

- [x] Manifest accessible at `/manifest.webmanifest` or equivalent (linked from production HTML)
- [x] Manifest `start_url` points to production origin (`/`)
- [x] Manifest `scope` covers app routes
- [ ] Icons 192×192 and 512×512 load (no 404) — confirm on device
- [x] Apple touch icon configured (layout metadata)
- [x] `theme_color` and `background_color` correct
- [x] `display: standalone` set
- [ ] Service worker registers on production HTTPS — **device**
- [ ] Offline app shell works on production — **device**
- [ ] "Add to Home Screen" flow tested on iPhone Safari (production URL) — **device**
- [ ] Installed app opens in standalone mode — **device**
- [x] iOS meta tags: `apple-mobile-web-app-capable`, status bar style

### 16.5 — Launch Checklist (from master plan §62)

Execute and sign off each item: see [`docs/launch-checklist.md`](../docs/launch-checklist.md).

- [x] Production Vercel project created
- [x] HTTPS working
- [ ] Custom domain configured if desired — deferred
- [ ] PWA manifest verified — partial (URL exists; device pending)
- [ ] Icons verified — partial
- [ ] Service Worker verified — blocked (device)
- [ ] iPhone Home Screen installation tested (production URL)
- [ ] IndexedDB persistence tested (production, Home Screen app)
- [ ] Data export tested (production)
- [ ] Data restore tested (production)
- [ ] Scryfall rate/request handling tested (production)
- [ ] Price provider behavior tested (production)
- [ ] TCGplayer links tested (production, open externally)
- [x] No secrets exposed client-side (audit complete in-repo)
- [x] Production build succeeds
- [x] Error tracking configured (or defer documented)
- [x] Analytics decision documented

### 16.6 — Security Audit

- [x] Run `npm audit` — fix critical/high or document accepted risk (`docs/security-audit.md`)
- [x] Review all `NEXT_PUBLIC_*` env vars — no secrets
- [ ] Review API routes — rate limiting on expensive endpoints — deferred (Scryfall client already throttles)
- [x] Confirm no API keys in client bundle (no keys in source)
- [x] Confirm import validates JSON — no eval or dangerouslySetInnerHTML for deck data
- [ ] CORS headers on API routes restrictive — review on next API change
- [x] Content Security Policy (optional, document if deferred) — `docs/decisions/csp.md`
- [x] Dependencies pinned or lockfile committed

### 16.7 — Error Tracking Implementation

- [x] Document decision in `docs/decisions/error-tracking.md`
- [x] If deferred:
  - [x] Document rationale
  - [x] Add GitHub bug report template
  - [x] Ensure error UI surfaces are user-friendly (Phase 14/39)
  - [x] Minimal `window.onerror` logger (`lib/observability/production-error-logger.ts`)

### 16.8 — Analytics Implementation

- [x] Document decision in `docs/decisions/analytics.md`
- [x] If none:
  - [x] Document privacy-first rationale
  - [x] No tracking scripts in bundle

### 16.9 — Final iPhone QA (Production)

**Blocked — physical device.** Checklist: [`checklists/iphone-safari-manual.md`](./checklists/iphone-safari-manual.md) + §70 below.

### 16.10 — Documentation & Release

- [x] Update README with production URL, install instructions, backup reminder
- [x] Write CHANGELOG.md v1.0.0 entry
- [ ] Git tag `v1.0.0` — **human after push** (no auto-commit from agent)
- [ ] GitHub Release with notes — **human**
- [x] Archive launch checklist with sign-off fields in `docs/launch-checklist.md`

### 16.11 — Post-Launch Monitoring (first 48 hours)

- [ ] Monitor Vercel deployment dashboard for errors — **human after promote**
- [x] Monitor Sentry (if configured) — N/A
- [ ] Check Scryfall API usage not hitting rate limits — **human**
- [ ] Respond to any user-reported issues
- [x] Hotfix process documented: branch → PR → CI → merge → auto-deploy

### 16.12 — Optional Production Hardening

- [ ] Vercel Firewall rules (if needed) — skip
- [ ] Rate limit on `/api/*` routes — deferred
- [x] `robots.txt` — `app/robots.ts`
- [x] Favicon + OG/meta tags for link sharing — favicon/icons present; OG optional skip
- [ ] 404 page themed (Neo Brutalism) — default Next 404 OK for MVP
- [ ] 500 error page themed — skip

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

- [x] Application live at production HTTPS URL (`https://mtg-deck-manager-two.vercel.app`)
- [x] Custom domain configured OR stable Vercel URL documented
- [ ] All 17 launch checklist items (§62) signed off — **partial; device items open**
- [x] Error tracking decision documented and implemented/deferred
- [x] Analytics decision documented and implemented/deferred
- [x] No secrets in client bundle (verified in-repo)
- [ ] Definition of Done workflow passes on production iPhone
- [x] CHANGELOG v1.0.0 published (in-repo; tag pending)
- [ ] Git tag v1.0.0 created
- [x] README updated with production URL and install guide
- [ ] Post-launch monitoring plan active for 48 hours — **after human promote**

## Human steps to finish Phase 16

1. Commit and push local Phase 14–16 work to `main` (or open a PR and merge after CI green). Agent did **not** create a commit.
2. In Vercel → `mtg-deck-manager` → Settings → Environment Variables, set Production `NEXT_PUBLIC_APP_URL=https://mtg-deck-manager-two.vercel.app` (and Preview as needed). Redeploy.
3. Confirm the new deployment is `READY` and home page no longer shows the old “Foundation only” skeleton (after push).
4. On a physical iPhone, complete [`checklists/iphone-safari-manual.md`](./checklists/iphone-safari-manual.md) against the production URL — especially Home Screen persistence (#1) and full §70 Definition of Done.
5. Sign `docs/launch-checklist.md`.
6. Tag and release (only after CI green and you are happy with the commit):
   ```bash
   git tag -a v1.0.0 -m "v1.0.0 MVP production launch"
   git push origin v1.0.0
   gh release create v1.0.0 --title "v1.0.0" --notes-file CHANGELOG.md
   ```
7. Optional: add a custom domain before heavy Home Screen use; if you change origin later, users must reinstall (separate storage).
8. Watch Vercel Runtime Logs for 48 hours.

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
