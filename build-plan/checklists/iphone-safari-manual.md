# iPhone Safari — Manual Test Checklist

**Required before Phase 16 production launch.** These tests cannot be fully automated in CI (Home Screen storage, standalone mode, Share sheet).

Sign-off: _________________ Date: _________

Device: iPhone model ______ iOS version ______ Production URL: ______

---

## Status log

| Phase | Sections in play                                          | State                                                                                                                                                                |
| ----- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2     | Installation & Standalone, Offline (shell only), Service Worker | **Not run — blocked on hosting.** Ready to execute against first HTTPS/Vercel URL. |
| 16    | Full checklist below (persistence #1, offline, import/export, SW update, safe-area) **on production URL** | **Not signed off.** Production: `https://mtg-deck-manager-two.vercel.app`. In-repo Phase 16 docs ready; physical Home Screen persistence + §70 still required. |

Do not tick boxes below without a device. Rows above record what is ready to test, not what passed.

---

## Installation & Standalone

- [ ] Open production/preview URL in Safari
- [ ] Follow `/settings/install` instructions
- [ ] Add to Home Screen
- [ ] Launch from Home Screen icon — no Safari URL bar (standalone)
- [ ] App title and icon correct on Home Screen

## Persistence (Highest Priority)

- [ ] Create a deck with 3+ cards while in **installed** app (not Safari tab)
- [ ] Force-close app (app switcher swipe up)
- [ ] Reopen from Home Screen
- [ ] **Deck and cards still present**

## Storage Isolation

- [ ] Understand: Safari tab data ≠ installed app data
- [ ] Onboarding/install warning was shown before first deck

## Offline

- [ ] Enable Airplane Mode
- [ ] Open installed app — app shell loads
- [ ] Edit deck (rename or change status)
- [ ] Reload app offline — changes persist
- [ ] Offline indicator visible
- [ ] Card search limited to cache (expected message)

## Import / Export

- [ ] Export full backup via Settings → Data
- [ ] Share/save JSON file
- [ ] Clear all data (with confirmation)
- [ ] Import backup from Files
- [ ] All decks restored

## Service Worker

- [ ] After new deploy, open installed app
- [ ] Update prompt appears (if applicable)
- [ ] Reload applies update; app still works

## Layout & UX

- [ ] Bottom nav not clipped by home indicator (safe area)
- [ ] Bottom sheet actions reachable one-handed
- [ ] Search keyboard does not break layout
- [ ] Portrait mode primary experience acceptable

## External Links

- [ ] TCGplayer link opens in Safari/external browser
- [ ] Return to app works

## Performance

- [ ] Scroll 100-card deck in compact mode — responsive
- [ ] Image mode scroll — no crash (lazy load working)

## Notes / Failures

```text
(record any failures here)
```
