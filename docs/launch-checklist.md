# Launch checklist (§62) — sign-off log

Copied from master plan §62 / Phase 16. Mark items only when verified. **Do not invent device QA.**

**Production project:** `mtg-deck-manager` (Vercel team `zemennos-projects`)  
**Stable production URL (current):** `https://mtg-deck-manager-two.vercel.app`  
**Also aliases:** `https://mtg-deck-manager-zemennos-projects.vercel.app`, git-main alias  

| # | Item | Status | Notes |
| - | ---- | ------ | ----- |
| 1 | Production Vercel project created | **Done** | Project ID `prj_zUveJT1ilOLdUPyaf38NrwNxFnpQ`; GitHub `zeMenno/mtg-deck-manager` connected; production branch `main` |
| 2 | HTTPS working | **Done** | Verified 200 + HSTS on production URL (2026-08-19) |
| 3 | Custom domain configured if desired | **Deferred** | Optional for MVP; stabilize `*.vercel.app` before Home Screen install. Reinstall if URL changes. |
| 4 | PWA manifest verified | **Partial** | `/manifest.webmanifest` present on production; full device install still open |
| 5 | Icons verified | **Partial** | Icons referenced in HTML/manifest; confirm 192/512 on device |
| 6 | Service Worker verified | **Blocked** | Needs HTTPS device session + SW register check on iPhone |
| 7 | iPhone Home Screen installation tested | **Blocked** | Physical device — see [`build-plan/checklists/iphone-safari-manual.md`](../build-plan/checklists/iphone-safari-manual.md) |
| 8 | IndexedDB persistence tested (Home Screen) | **Blocked** | Highest-priority §70 step |
| 9 | Data export tested (production) | **Blocked** | Device / production smoke |
| 10 | Data restore tested (production) | **Blocked** | Device / production smoke |
| 11 | Scryfall rate/request handling tested | **Blocked** | Production smoke |
| 12 | Price provider behavior tested | **Blocked** | Scryfall prices; no paid price API key required for MVP |
| 13 | TCGplayer links tested | **Blocked** | Must open externally on iPhone |
| 14 | No secrets exposed client-side | **Done (in-repo)** | Only `NEXT_PUBLIC_APP_URL` / optional `NEXT_PUBLIC_USE_SCRYFALL_PROXY`; pricing uses Scryfall public data. Re-audit after each deploy. |
| 15 | Production build succeeds | **Done** | Latest production deployment `READY` (commit on `main` at last deploy). Local Phase 14–16 changes still need push → redeploy. |
| 16 | Error tracking configured (or defer documented) | **Done** | Deferred — [`docs/decisions/error-tracking.md`](./decisions/error-tracking.md) |
| 17 | Analytics decision documented | **Done** | None — [`docs/decisions/analytics.md`](./decisions/analytics.md) |

**Sign-off:** _________________ **Date:** _________  
**iPhone model / iOS:** _________________

## Post-launch monitoring (first 48 hours)

- [ ] Watch Vercel deployment dashboard / Runtime Logs
- [ ] Confirm Scryfall search still works under normal use
- [ ] Hotfix path: branch → PR → CI → merge `main` → auto-deploy → verify on iPhone
