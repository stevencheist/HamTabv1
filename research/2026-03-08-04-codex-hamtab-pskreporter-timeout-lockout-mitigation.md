# PSKReporter Timeout/Lockout Mitigation For HamTab Live Spots — Research / Spec

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-08
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Summary
Yes, there is a better way than the current polling/caching pattern. HamTab already has useful protection layers (server-side 5-minute cache, token bucket, in-flight dedup), but several implementation details are still creating unnecessary pressure and weak failure behavior. The biggest immediate issue is a stale-fallback bug in `/api/spots/psk/heard` that can break graceful degradation during upstream failures. After that, cache-key busting (`_t`) is preventing Cloudflare edge cache reuse, and the retrieval model is not yet aligned to PSKReporter’s recommended cadence strategy. Recommended path: fix fallback bug first, normalize cache keys for PSK endpoints, then move to adaptive/event-driven retrieval with circuit-breaker behavior.

## What PSKReporter Itself Recommends

From PSKReporter developer guidance:
- Retrieval should be no more often than every 5 minutes.
- If integrated with a transmitter app, retrieval should be timed for 5 minutes after transmission (not constant periodic hammering).
- Frequent users may be blocked or rate-limited; `appcontact` is recommended.

This matches HamTab’s intent (5m cache + `appcontact`) but not all call paths currently benefit from edge-cache reuse and robust stale handling.

## Findings (Ordered By Severity)

### 1) High: Live Spots stale fallback has a scope bug during errors
In `/api/spots/psk/heard`, `callsign` is declared inside `try`, then referenced in `catch`.

Impact:
- On upstream failure/timeout, the stale fallback path can throw `ReferenceError` instead of returning cached data.
- This makes outages look worse and can surface as repeated failures/timeouts in the UI.

Evidence:
- `server.js:594` declares `const callsign` inside `try`.
- `server.js:704` reads `pskHeardCache[callsign]` in `catch`.

### 2) High: Cache-busting `_t` defeats edge cache for PSK endpoints
Client requests append `_t=${Date.now()}` for Live Spots and spot sources.

Impact:
- Cloudflare Worker cache keys include query params (except a small strip list).
- Unique `_t` means each request becomes a cache miss at edge.
- Container-side cache still helps, but edge protection is lost and cold-start burst risk rises.

Evidence:
- `live-spots.js:78` appends `_t` to `/api/spots/psk/heard`.
- `refresh.js:20` appends `_t` to all source endpoints including `/api/spots/psk`.
- `worker.js:87-89` strips only `userId/apikey/token` (not `_t`).
- `worker.js:111-134` query params shape the cache key.
- `worker.js:211-221` edge cache HIT/MISS flow.

### 3) Medium-High: Global token bucket is too coarse for per-callsign “heard” load
Server has a single global PSK token bucket (`10 req / 60s`) shared by `/api/spots/psk` and all `/api/spots/psk/heard` callsigns.

Impact:
- In multi-user hosted mode, different callsigns can exhaust shared tokens even when each user behaves reasonably.
- Appears as random lockout (`429`) to end users.

Evidence:
- `server.js:223-239` global token bucket.
- `server.js:495-499` and `server.js:607-611` shared limiter used by both endpoints.
- Hosted container sleeps after 5 minutes, which can increase burst pressure after wake.
- `worker.js:10` `sleepAfter = '5m'`.

### 4) Medium: Retrieval payload may be larger/slower than needed for UI goals
Both PSK endpoints request `rrlimit=500` and 1-hour windows.

Impact:
- Larger XML payloads increase parse time and timeout risk under poor upstream conditions.
- Live Spots summary cards likely do not need 500 full records each refresh.

Evidence:
- `server.js:503-507` and `server.js:614-620` query params with `rrlimit=500` and `flowStartSeconds=-3600`.

### 5) Medium: Live Spots is mostly leader-only periodic, but still has extra fetch triggers
Main loop refresh is leader-only, but there are non-leader fetch paths on init/widget visibility transitions.

Impact:
- More duplicate requests than necessary in multi-tab cases.

Evidence:
- Leader-only interval in `main.js:184`.
- Initial fetch in `main.js:169` not leader-gated.
- Duplicate `justShown('widget-live-spots') fetchLiveSpots()` blocks in `splash.js:1241` and `splash.js:1318`.

### 6) Low-Medium: API contract drift in OpenAPI for `/api/spots/psk`
OpenAPI says `/api/spots/psk` requires `callsign` and supports `band`, but server implementation ignores both and returns global spots.

Impact:
- Misleading contract for clients and future maintainers.

Evidence:
- OpenAPI requirement: `openapi.yaml:96-108`.
- Server endpoint has no callsign/band handling: `server.js:488-565`.

## Recommended Better Architecture

### Phase 0 (Immediate hardening)
1. Fix `callsign` scope in `/api/spots/psk/heard` catch path so stale-if-error always works.
2. Stop cache-busting PSK endpoints with `_t` on client requests.
3. In Worker, strip `_t` from cache key normalization as defense-in-depth.

Expected result:
- Fewer visible outages.
- Higher edge cache hit ratio.
- Reduced container/upstream request pressure.

### Phase 1 (Rate stability)
1. Split PSK rate budgets by endpoint class:
- `/api/spots/psk`: low-frequency global feed budget.
- `/api/spots/psk/heard`: per-callsign budget + global ceiling.
2. Add short circuit-breaker on upstream 429/5xx/timeouts:
- trip for N minutes,
- serve stale cached data with metadata (`stale=true`, `ageSeconds`),
- probe recovery gradually.
3. Add jitter to refresh cadence so clients do not synchronize on 5-minute boundaries.

### Phase 2 (Smarter retrieval)
1. Adaptive query sizing:
- Default smaller `rrlimit` (e.g., 150-250),
- widen only when user expands detail view.
2. Optional event-driven retrieval for Live Spots:
- schedule query 5 minutes after detected transmit activity (CAT/PTT or WSJT-X signals),
- fallback to low-rate periodic refresh when no TX telemetry is available.

This follows PSKReporter’s own “retrieve after transmit” guidance and should reduce unnecessary polling while improving relevance.

## Concrete Changes To Ask Claude For

1. `server.js`
- Fix `callsign` scope in `/api/spots/psk/heard` error handling.
- Add endpoint-specific limiter state (`pskGlobal`, `pskHeardPerCallsign`).
- Add upstream failure classifier + circuit-breaker metadata in response.
- Consider reducing default `rrlimit`.

2. `src/live-spots.js`
- Remove `_t` parameter from `/api/spots/psk/heard` fetch.
- Surface stale/circuit-breaker status in widget text rather than generic unavailable state.

3. `src/refresh.js`
- Avoid `_t` for cacheable endpoints (especially PSK/WSPR).
- Keep `_t` only where truly needed for no-cache diagnostics.

4. `worker.js`
- Add `_t` to `STRIP_PARAMS` so accidental client cache-busters do not poison edge keys.

5. `openapi.yaml`
- Align `/api/spots/psk` contract with real behavior or implement the documented filters.

## Acceptance Criteria

1. During simulated PSKReporter timeout, `/api/spots/psk/heard` returns stale cached payload (if available) without throwing server-side errors.
2. Repeated Live Spots refreshes for same callsign hit edge cache (verify `X-Cache: HIT`) when within TTL.
3. Shared hostedmode traffic no longer produces burst 429s under normal multi-user load.
4. Live Spots remains updated within expected latency while total upstream PSKReporter queries per user/session drop materially.
5. API docs for PSK endpoints match server behavior.

## Sources

### External
- https://www.pskreporter.info/pskdev.html — official developer guidance: 5-minute retrieval cadence, delayed retrieval after transmission, and possible block/rate-limit for heavy users.
- https://status.pskreporter.info/ — current service status and recent uptime/downtime history.

### HamTab Code
- `/home/fpeebles/coding/HamTabV1/server.js:215` — PSK cache TTL (5 minutes)
- `/home/fpeebles/coding/HamTabV1/server.js:223` — global PSK token-bucket limits
- `/home/fpeebles/coding/HamTabV1/server.js:245` — in-flight dedup map for identical URL
- `/home/fpeebles/coding/HamTabV1/server.js:488` — `/api/spots/psk` handler
- `/home/fpeebles/coding/HamTabV1/server.js:592` — `/api/spots/psk/heard` handler
- `/home/fpeebles/coding/HamTabV1/server.js:594` — `callsign` scope location inside `try`
- `/home/fpeebles/coding/HamTabV1/server.js:704` — stale fallback references `callsign` in `catch`
- `/home/fpeebles/coding/HamTabV1/src/live-spots.js:78` — `_t` cache-busting query param on Live Spots fetch
- `/home/fpeebles/coding/HamTabV1/src/main.js:184` — leader-only periodic Live Spots refresh
- `/home/fpeebles/coding/HamTabV1/src/main.js:169` — initial Live Spots fetch
- `/home/fpeebles/coding/HamTabV1/src/refresh.js:20` — global `_t` cache-busting for source fetches
- `/home/fpeebles/coding/HamTabV1/worker.js:87` — cache-key strip param list
- `/home/fpeebles/coding/HamTabV1/worker.js:111` — cache key generation includes query params
- `/home/fpeebles/coding/HamTabV1/worker.js:211` — edge cache lookup path
- `/home/fpeebles/coding/HamTabV1/worker.js:10` — hosted container `sleepAfter = '5m'`
- `/home/fpeebles/coding/HamTabV1/openapi.yaml:92` — `/api/spots/psk` contract
- `/home/fpeebles/coding/HamTabV1/openapi.yaml:123` — `/api/spots/psk/heard` contract
