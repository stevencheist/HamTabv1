# HamTabV1 Recommendations — Detailed Snapshot

> **For:** Claude (via developer)  
> **From:** Codex  
> **Date:** 2026-03-01  
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Summary
This snapshot converts the HamTabV1 review into implementation-ready recommendations with priorities and concrete rollout paths. The strongest immediate wins are API modularization, polling/fetch orchestration hardening, accessibility pass, and security hardening of config/admin surfaces. Medium-term differentiation should focus on intelligence and workflow acceleration (band opportunity scoring, alert center). Roadmap summary bullets were appended to `HamTabV1/ROADMAP.md` separately.

## Recommendation 1
- **Title**: Extract API domains from `server.js`
- **Category**: Architecture
- **Priority**: P1 (do now)
- **Current state**: The Express app defines most middleware, caching, and API routes in one very large file (`/home/fpeebles/coding/HamTabV1/server.js:21-140`, `/home/fpeebles/coding/HamTabV1/server.js:143-151`, `/home/fpeebles/coding/HamTabV1/server.js:362-703`, `/home/fpeebles/coding/HamTabV1/server.js:779-3082`).
- **Problem**: A monolithic route file increases regression risk, slows review velocity, and makes feature ownership ambiguous. It also makes test isolation difficult when changing one feed integration.
- **Proposed solution**: Split into domain routers and shared utilities:
  - `routes/spots.js` (POTA/SOTA/DXC/WWFF/PSK/WSPR)
  - `routes/weather.js`, `routes/solar.js`, `routes/satellites.js`, `routes/voacap.js`, `routes/meta.js`
  - `services/cache-store.js`, `services/http-fetch.js`, `services/callsign.js`
  - Keep `server.js` as composition root only (security middleware + router registration + startup).
  - Add per-router unit tests and smoke integration tests.
- **Effort estimate**: L
- **Roadmap placement**: `Planned -> UI/UX` (temporary fit) and `Planned -> Data & Propagation`; suggest new section: **Platform & Architecture**.
- **Dependencies**: None.

## Recommendation 2
- **Title**: Build a centralized fetch scheduler with backoff and freshness metadata
- **Category**: Performance
- **Priority**: P1 (do now)
- **Current state**: Polling and refresh are distributed across many `setInterval` calls and widget checks (`/home/fpeebles/coding/HamTabV1/src/main.js:68-143`, `/home/fpeebles/coding/HamTabV1/src/refresh.js:46-65`, `/home/fpeebles/coding/HamTabV1/src/refresh.js:82-105`). Server-side has many independent TTL caches (`/home/fpeebles/coding/HamTabV1/server.js:153-206`, `/home/fpeebles/coding/HamTabV1/server.js:646-652`, `/home/fpeebles/coding/HamTabV1/server.js:3510-3516`).
- **Problem**: Independent timers can create bursty traffic, stale-data ambiguity, and inconsistent recovery behavior after upstream errors.
- **Proposed solution**:
  - Add a client-side scheduler service with per-source job config (`interval`, `jitter`, `maxBackoff`, `visibilityGate`).
  - Add server response metadata for each feed: `{ fetchedAt, sourceAgeSec, cacheHit, stale }`.
  - Implement exponential backoff on repeated fetch failures and auto-recovery reset after success.
  - Show freshness badges in widgets using returned metadata.
- **Effort estimate**: M
- **Roadmap placement**: `Planned -> Data & Propagation`.
- **Dependencies**: Recommendation 1 preferred but not required.

## Recommendation 3
- **Title**: Add SSE feed channel for lanmode low-latency updates
- **Category**: Data/API
- **Priority**: P2 (next cycle)
- **Current state**: High-frequency data is mostly polling-based (`/home/fpeebles/coding/HamTabV1/src/main.js:72-74`, `/home/fpeebles/coding/HamTabV1/src/main.js:136-143`, `/home/fpeebles/coding/HamTabV1/src/update.js:29-33`).
- **Problem**: Frequent polling scales poorly on weak LAN hardware and increases client/network overhead when many dashboards are open.
- **Proposed solution**:
  - Add `GET /api/stream` SSE endpoint in lanmode.
  - Push compact event types (`spots:update`, `status:update`, `alerts:update`, `beacons:tick`) from server cache refreshes.
  - Keep HTTP polling as fallback for hostedmode and unsupported clients.
  - Gate SSE behind config flag for phased rollout.
- **Effort estimate**: L
- **Roadmap placement**: `Next Up` (as extension of “DX Cluster Live TCP + RBN”) and `Planned -> Data & Propagation`.
- **Dependencies**: Recommendation 2.

## Recommendation 4
- **Title**: Introduce a Band Opportunity Score widget
- **Category**: UX
- **Priority**: P2 (next cycle)
- **Current state**: HamTab already has VOACAP matrices, live PSK/WSPR, and propagation sources (`/home/fpeebles/coding/HamTabV1/src/main.js:43-45`, `/home/fpeebles/coding/HamTabV1/src/main.js:125-140`, `/home/fpeebles/coding/HamTabV1/server.js:645-703`, `/home/fpeebles/coding/HamTabV1/server.js:2881-3082`).
- **Problem**: Users must manually correlate multiple widgets to answer “what band should I use now?”, which increases cognitive load and slows decision-making.
- **Proposed solution**:
  - Build scoring service combining:
    - VOACAP reliability by band/time
    - recent PSK/WSPR heard density
    - solar/K-index penalties
  - Output per-band score (0-100) with reason tags.
  - Add widget with “Top 3 bands now” and “best next hour” lane.
- **Effort estimate**: L
- **Roadmap placement**: `Planned -> Data & Propagation`.
- **Dependencies**: Recommendation 2 metadata normalization.

## Recommendation 5
- **Title**: Add a unified Alert Center with suppression controls
- **Category**: UX
- **Priority**: P2 (next cycle)
- **Current state**: Watch lists exist and update status is shown, but event surfacing is fragmented (`/home/fpeebles/coding/HamTabV1/src/state.js:22-34`, `/home/fpeebles/coding/HamTabV1/src/update.js:11-21`, `/home/fpeebles/coding/HamTabV1/src/refresh.js:41-43`).
- **Problem**: High-value events (wanted calls, severe weather, update failures, feed outages) are easy to miss or overwhelm users without prioritization.
- **Proposed solution**:
  - Add in-app alert queue with severities (`info/warn/critical`) and per-type mute windows.
  - Sources: watchlist hits, NWS alerts, stale feed conditions, update availability/failure.
  - Persist alert preferences in settings export/import.
- **Effort estimate**: M
- **Roadmap placement**: `Planned -> UI/UX`.
- **Dependencies**: Recommendation 2 freshness metadata.

## Recommendation 6
- **Title**: Harden config and admin-side endpoints
- **Category**: Security
- **Priority**: P1 (do now)
- **Current state**: `/api/config/env` is gated by private IP or admin token and key allowlist (`/home/fpeebles/coding/HamTabV1/server.js:1599-1651`). Feedback endpoint has spam/rate controls (`/home/fpeebles/coding/HamTabV1/server.js:1659-1813`).
- **Problem**: Private-IP trust can be insufficient in proxied/misconfigured networks, and runtime `.env` mutation should have stronger authentication and observability.
- **Proposed solution**:
  - Require explicit `CONFIG_ADMIN_TOKEN` in lanmode for write endpoints (no IP-only fallback).
  - Add request audit log (`who/when/what key changed`) with value redaction.
  - Add anti-CSRF token for browser-origin write operations.
  - Add endpoint-level strict rate limits for admin write routes.
- **Effort estimate**: M
- **Roadmap placement**: `Planned` with suggested section: **Security Hardening**.
- **Dependencies**: None.

## Recommendation 7
- **Title**: Complete keyboard and ARIA accessibility pass
- **Category**: Accessibility
- **Priority**: P1 (do now)
- **Current state**: UI wiring is click-driven across many controls/modals (`/home/fpeebles/coding/HamTabV1/src/config.js:15-39`, `/home/fpeebles/coding/HamTabV1/src/config.js:73-119`, `/home/fpeebles/coding/HamTabV1/src/logbook.js:188-205`, `/home/fpeebles/coding/HamTabV1/src/update.js:66-83`).
- **Problem**: Keyboard-only and assistive-tech users have reduced operability and discoverability, especially in modal and sortable-table flows.
- **Proposed solution**:
  - Add semantic buttons/roles, focus traps in overlays, Escape-close behavior standardization.
  - Add keyboard shortcuts for tab/widget navigation.
  - Add ARIA labels and sort-state announcements for tables.
  - Add reduced-motion mode for rapidly updating widgets.
- **Effort estimate**: M
- **Roadmap placement**: `Planned -> UI/UX`.
- **Dependencies**: None.

## Recommendation 8
- **Title**: Version and migrate client state schema
- **Category**: Architecture
- **Priority**: P2 (next cycle)
- **Current state**: Large mutable state object with many localStorage keys (`/home/fpeebles/coding/HamTabV1/src/state.js:14-20`, `/home/fpeebles/coding/HamTabV1/src/state.js:35-48`, `/home/fpeebles/coding/HamTabV1/src/state.js:157-167`) and migration bootstrap in main (`/home/fpeebles/coding/HamTabV1/src/main.js:1-5`).
- **Problem**: As settings grow, ad-hoc key management increases risk of corrupt or stale client config after releases.
- **Proposed solution**:
  - Introduce `stateSchemaVersion` and a declarative migration registry.
  - Add validation layer for loaded persisted state.
  - Add “safe reset to defaults” per subsystem (layout, filters, rig, overlays).
- **Effort estimate**: M
- **Roadmap placement**: `Planned -> UI/UX` (settings quality) with suggested section: **Platform & Architecture**.
- **Dependencies**: None.

## Recommendation 9
- **Title**: Optimize heavy widget rendering paths
- **Category**: Performance
- **Priority**: P2 (next cycle)
- **Current state**: Widget layout and collision resolution iterate over many DOM nodes (`/home/fpeebles/coding/HamTabV1/src/widgets.js:176-253`, `/home/fpeebles/coding/HamTabV1/src/widgets.js:256-311`). Logbook render caps rows at 500 to avoid major slowdown (`/home/fpeebles/coding/HamTabV1/src/logbook.js:212-216`).
- **Problem**: As visible widgets and rows increase, layout and re-render cost can spike on Pi-class hardware.
- **Proposed solution**:
  - Add virtualized row rendering for logbook and spots tables.
  - Replace brute-force overlap resolution with spatial indexing or occupancy grid in float mode.
  - Batch DOM writes via `requestAnimationFrame` in layout operations.
- **Effort estimate**: L
- **Roadmap placement**: `Planned -> UI/UX` and `Planned -> Data & Propagation`.
- **Dependencies**: Recommendation 8 helps state-safe rollout.

## Recommendation 10
- **Title**: Add visual density modes and hierarchy presets
- **Category**: Visual/Style
- **Priority**: P3 (backlog)
- **Current state**: HamTab supports rich themes and many widgets, with high information density (`/home/fpeebles/coding/HamTabV1/README.md:54-60`, `/home/fpeebles/coding/HamTabV1/src/main.js:80-113`, `/home/fpeebles/coding/HamTabV1/src/widgets.js:93-133`).
- **Problem**: New users can be overloaded by simultaneous data surfaces and mixed visual priority.
- **Proposed solution**:
  - Add “Simple / Operator / Power-user” density presets controlling default widget visibility, spacing, and typography scale.
  - Add consistent severity color grammar across widgets (alerts, stale, risk, active TX).
  - Ship one “HamClock transition” preset optimized for migration users.
- **Effort estimate**: M
- **Roadmap placement**: `Planned -> UI/UX`.
- **Dependencies**: Recommendation 7 for accessible defaults.

## Prioritized rollout
1. P1 now: Recommendations 1, 2, 6, 7.  
2. P2 next cycle: Recommendations 3, 4, 5, 8, 9.  
3. P3 backlog: Recommendation 10.

## Sources
- `/home/fpeebles/coding/HamTabV1/server.js:21-140` — app bootstrap, security middleware, cache headers
- `/home/fpeebles/coding/HamTabV1/server.js:143-151` — core spots proxy endpoint
- `/home/fpeebles/coding/HamTabV1/server.js:153-206` — DXC/PSK cache state
- `/home/fpeebles/coding/HamTabV1/server.js:645-703` — WSPR endpoint implementation
- `/home/fpeebles/coding/HamTabV1/server.js:1599-1651` — config write endpoint auth/sanitization
- `/home/fpeebles/coding/HamTabV1/server.js:1659-1813` — feedback endpoint controls
- `/home/fpeebles/coding/HamTabV1/server.js:2881-3082` — VOACAP endpoint + caching
- `/home/fpeebles/coding/HamTabV1/server.js:3510-3516` — cache eviction timer
- `/home/fpeebles/coding/HamTabV1/src/main.js:1-5` — migration startup
- `/home/fpeebles/coding/HamTabV1/src/main.js:68-143` — interval-based refresh orchestration
- `/home/fpeebles/coding/HamTabV1/src/refresh.js:46-65` — refresh fan-out
- `/home/fpeebles/coding/HamTabV1/src/refresh.js:82-105` — auto-refresh timer
- `/home/fpeebles/coding/HamTabV1/src/state.js:14-20` — persisted filter prefs
- `/home/fpeebles/coding/HamTabV1/src/state.js:157-167` — layout mode persistence
- `/home/fpeebles/coding/HamTabV1/src/widgets.js:176-253` — overlap resolution loop
- `/home/fpeebles/coding/HamTabV1/src/widgets.js:256-311` — global overlap pass
- `/home/fpeebles/coding/HamTabV1/src/config.js:15-39` — config modal event flow
- `/home/fpeebles/coding/HamTabV1/src/config.js:73-119` — map overlay config wiring
- `/home/fpeebles/coding/HamTabV1/src/logbook.js:212-216` — capped row rendering
- `/home/fpeebles/coding/HamTabV1/src/update.js:29-33` — update polling interval
- `/home/fpeebles/coding/HamTabV1/ROADMAP.md:28-73` — roadmap sections and planned categories
