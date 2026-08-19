# Neo Brutalism Design Audit — Phase 14

Audit date: 2026-08-19. Goal: keep zero-radius, hard borders, offset shadows, DM Sans / Space Mono, and semantic status tokens.

## Checklist

| Surface | Zero radius | Hard borders | Offset shadows | Fonts | Status tokens | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Home / install banner | Pass | Pass | Pass | Pass | n/a | |
| Deck list | Pass | Pass | `shadow-brutal-sm` | Pass | n/a | Skeleton matches row layout |
| Deck dashboard | Pass | Pass | Pass | Pass | Pass | Wider `md:` grid already present |
| Deck card list (all densities) | Pass | Pass | Pass | Pass | Pass | Selected rows use thick `border-4` |
| Card search + detail | Pass | Pass | Pass | Pass | n/a | Detail sheet `snap="detail"` (~70%) |
| Changes / projected / add / cut | Pass | Pass | Pass | Pass | Pass | Upgrade bar respects safe-area |
| Wishlist | Pass | Pass | Pass | Pass | n/a | Priority badges use theme tokens |
| Settings + data | Pass | Pass | Pass | Pass | n/a | |
| Version compare | Pass | Pass | Pass | Pass | Pass | |
| Deck Check / warnings | Pass | Pass | Pass | Pass | Pass | Warning token used |

## Fixes applied in Phase 14

1. Removed `backdrop-blur` from sticky search/toolbar headers (`cards-page-client`, `deck-list-toolbar`).
2. Standardized bottom sheet snap heights (`half` / `detail` / `tall`) on primary sheets.
3. Confirmed interactive controls use `rounded-none` and `shadow-brutal*` (no soft blur shadows).
4. Status badges use semantic `bg-status-*` tokens only.

## Known limitations

- Sheet drag handle is visual; Radix Dialog does not provide Vaul-style swipe-to-snap. Backdrop tap + close button remain the dismissal paths.
- Apply-changes undo is deferred (restore snapshot is Phase 15+ hardening if needed).
