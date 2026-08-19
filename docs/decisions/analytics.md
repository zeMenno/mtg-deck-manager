# Decision: Analytics (Phase 16)

**Status:** Accepted (MVP)  
**Date:** 2026-08-19

## Context

Phase 16 requires documenting whether to enable Vercel Analytics, a privacy-focused third party (Plausible/Fathom), or none.

## Decision

**None for v1.0.0.** No analytics scripts, no `@vercel/analytics`, no custom page-view events.

## Rationale

- The product is a personal local-first deck manager; usage metrics do not improve the Definition of Done workflow.
- Avoids any risk of accidentally attaching deck/card identifiers to events.
- Keeps the client bundle free of tracking code and matches ADR-001 (local-first, no account).

## Consequences

- Operators rely on Vercel deployment health and manual dogfooding, not dashboards.
- Enabling Vercel Analytics later is a one-line dependency + dashboard toggle; no schema migration required.
- Must not add custom events that include deck names, oracle IDs, or wishlist contents.

## Alternatives rejected

| Option | Why not for MVP |
| ------ | --------------- |
| Vercel Analytics | Fine later; zero user value at personal launch |
| Plausible / Fathom | Extra cost and DNS/script work for no product need |
