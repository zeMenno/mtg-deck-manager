# Security audit notes — Phase 16

Date: 2026-08-19

| Check | Result |
| ----- | ------ |
| `npm audit --omit=dev` | 0 vulnerabilities (2026-08-19) |
| `NEXT_PUBLIC_*` secrets | Only `NEXT_PUBLIC_APP_URL` and optional `NEXT_PUBLIC_USE_SCRYFALL_PROXY` — no API keys |
| Client bundle secrets | No price-provider keys in repo; Scryfall pricing is public |
| Import path | JSON parse + schema validation; no `eval` |
| Lockfile | `package-lock.json` committed |
| Headers | `vercel.json` sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` |
| CSP | Deferred — [`docs/decisions/csp.md`](./decisions/csp.md) |

Re-run `npm audit` and a client-bundle grep for `sk_` / `api_key` after each production promote.
