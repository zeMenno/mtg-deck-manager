# Content Security Policy (Phase 16)

**Status:** Deferred for v1.0.0

A strict CSP is optional hardening. The app loads Scryfall images/API, Google fonts via `next/font` (self-hosted at build), and a Serwist service worker. Shipping a CSP without careful `connect-src` / `img-src` / `worker-src` allowlists risks breaking search, images, or offline updates.

Revisit after production iPhone QA if XSS concerns appear. Current mitigations: no `dangerouslySetInnerHTML` for user deck data, import validates JSON via Zod/parsers (no `eval`), API routes are NetworkOnly in the SW.
