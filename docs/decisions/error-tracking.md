# Decision: Error tracking (Phase 16)

**Status:** Accepted (MVP)  
**Date:** 2026-08-19

## Context

Phase 16 requires an explicit choice among Sentry, Vercel Runtime Logs, or deferred tracking with a lightweight fallback. The app is local-first: deck data never leaves the device, and the only networked surfaces are Scryfall (and optional pricing) proxies.

## Decision

**Defer Sentry for v1.0.0.** Use:

1. **Vercel Runtime Logs** for server/API failures (already available on the production project).
2. A **minimal production console logger** (`lib/observability/production-error-logger.ts`) that attaches `window.onerror` and `unhandledrejection` handlers, logs message + stack only, and never includes deck names, card lists, or IndexedDB payloads.
3. A **GitHub bug report template** (`.github/ISSUE_TEMPLATE/bug_report.md`) for human-reported issues.

## Rationale

- Personal-use MVP does not justify Sentry bundle size, source-map upload, or another SaaS secret.
- Client errors that matter most (Dexie open/migration, import validation) already surface through existing error UI (Phase 14).
- Revisit Sentry free tier if post-launch usage reveals silent client failures that Runtime Logs cannot catch.

## Consequences

- No `SENTRY_DSN` env var required for launch.
- Operators must check Vercel → Project → Logs during the first 48 hours after promote.
- PII scrubbing is trivial because we do not ship an error SDK that serializes React state.

## Alternatives rejected

| Option | Why not for MVP |
| ------ | --------------- |
| Sentry client SDK | Bundle + config overhead for a single-user PWA |
| Third-party RUM | Conflicts with privacy-first / local-first stance |
