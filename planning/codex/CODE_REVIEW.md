# Code Review — HamTabV1

> **Date:** 2026-03-01
> **Reviewer:** Codex
> **Scope:** Full repository

## Summary

The codebase is feature-rich and generally validates many user inputs, but a few trust-boundary and resource-lifecycle issues remain. The most important risks are credential leakage through query-string API key support and unbounded in-memory caches in server hot paths. Frontend XSS defenses are present in several modules, though some DOM-heavy render paths can still become expensive under high update frequency.

## Findings

### Critical

- [ ] None found.

### High

- [ ] **API keys accepted via query parameters** — server.js:860 — Accepting secrets via `?apikey=` makes them leak into logs, browser history, reverse proxies, and analytics referrers.
- [ ] **Unbounded satellite pass cache growth** — server.js:851 — `satPassCache` is a process-global object with no size cap/eviction, so varied coordinates/satellites can grow memory until restart.
- [ ] **Unbounded satellite TLE cache growth** — server.js:855 — `satTleCache` has TTL but no cardinality limit, so long-running servers can accumulate stale keyspace and memory pressure.

### Medium

- [ ] **VOACAP token allowed in query string** — server.js:2851 — `req.query.token` has the same leakage channel risk as API keys in URLs.

### Low

- [ ] **Frequent full HTML replacement in live spots panel** — src/live-spots.js:166 — Rebuilding large `innerHTML` payloads on updates can cause avoidable layout/paint churn when spot volume is high.

## Dependency Audit

- [ ] None found via static code review (automated dependency vulnerability scan not run in this pass).

## Positive Observations

- Input bounds checks are implemented for many geo/query parameters before upstream API calls.
- Several frontend render paths use explicit escaping helpers before HTML injection.
