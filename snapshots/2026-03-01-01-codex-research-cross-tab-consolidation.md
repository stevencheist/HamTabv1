# HamTabV1 Cross-Tab API Call Consolidation (Implementation Spec)

Date: March 1, 2026

## 1) Current polling architecture (from code)

Scope reviewed:
- `HamTabv1/src/main.js`
- `HamTabv1/src/refresh.js`
- `HamTabv1/src/weather.js`
- `HamTabv1/src/satellites.js`
- `HamTabv1/src/live-spots.js`
- `HamTabv1/src/voacap.js`
- `HamTabv1/src/state.js`

### A. Timer-driven API fetches

| Source | Timer | Effective cadence | Triggered fetch(es) | Conditional? |
|---|---:|---:|---|---|
| `main.js:72` | `setInterval(..., 10000)` | 10s | `fetchIssPosition()` -> `/api/iss/position?lat&lon` | Yes: `isWidgetVisible('widget-satellites')` |
| `main.js:73` | `setInterval(..., 10000)` | 10s | `fetchSatellitePositions()` -> `/api/satellites/positions?...` | Yes: `isWidgetVisible('widget-satellites')` |
| `main.js:136` | `setInterval(..., 5*60*1000)` | 5m | `fetchLiveSpots()` -> `/api/spots/psk/heard?callsign=...` | Yes: `isWidgetVisible('widget-live-spots')` |
| `main.js:140` | `setInterval(..., 60*1000)` | 1m | `fetchVoacapMatrixThrottled()` -> `/api/voacap?...` only when internal throttle passes | Yes: `isWidgetVisible('widget-voacap') || state.hfPropOverlayBand` |
| `refresh.js:87` | `setInterval(..., 1000)` | 1s tick, 60s cycle | countdown calls `refreshAll()` every 60s | Indirect, when `autoRefreshEnabled` |
| `weather.js:57` | `setInterval(doFetchWeather, 5*60*1000)` | 5m | `/api/weather?station=...` (WU) | Yes: only if `useWU()` (station + API key) |
| `weather.js:184` | `setInterval(fetchNwsConditions, 15*60*1000)` | 15m | `/api/weather/conditions?lat&lon` or fallback `/api/weather/owm?lat&lon` | Yes: lat/lon set; NWS-coverage gate; OWM API-key gate |
| `weather.js:185` | `setInterval(fetchNwsAlerts, 5*60*1000)` | 5m | `/api/weather/alerts?lat&lon` | Yes: lat/lon set and NWS coverage |
| `voacap.js:114/127/163` | `setTimeout(..., 300)` debounced | User-driven | `fetchVoacapMatrix()` -> `/api/voacap?...` | Only after VOACAP param changes |
| `voacap.js:239` | `setTimeout(..., 25000)` | per-request watchdog | aborts in-flight VOACAP fetch | N/A |
| `voacap.js:270` | `setTimeout(..., 30000)` | transient retry | retries `/api/voacap?...` | Only after fetch error and retry budget |

### B. `refreshAll()` fan-out (indirect polling every 60s)

`refresh.js:46-64` triggers:
- `fetchSourceData('pota')` -> `/api/spots`
- `fetchSourceData('sota')` -> `/api/spots/sota`
- `fetchSourceData('dxc')` -> `/api/spots/dxc`
- `fetchSourceData('wwff')` -> `/api/spots/wwff`
- `fetchSourceData('psk')` -> `/api/spots/psk`
- `fetchSourceData('wspr')` -> `/api/spots/wspr`
- plus conditional widget fetches (`fetchSolar`, `fetchLunar`, `fetchVoacapMatrixThrottled`, etc.)

So when 3 tabs are open and auto-refresh is enabled, spot-source endpoints are multiplied ~3x by default.

### C. State fields already useful for this feature

`state.js` already centralizes timers + endpoint state that can be shared:
- `countdownTimer`, `weatherTimer`, `nwsCondTimer`, `nwsAlertTimer`
- `sourceData`, `liveSpots`, `satellites`, VOACAP state (`voacap*` fields)

This makes `state.js` the right place to store cross-tab runtime metadata.

---

## 2) Cross-tab communication API comparison

### Recommendation summary

Use **BroadcastChannel as primary**, with **`storage`-event fallback** for older/limited browsers.

Do not use SharedWorker or Service Worker for v1 consolidation.
Do not use `postMessage + SharedArrayBuffer` for this use case.

### Comparison matrix

| API | Browser support | Complexity | Failure modes | Survives tab crash/close? | Large JSON suitability |
|---|---|---|---|---|---|
| **BroadcastChannel** | Strong modern support. Safari/iOS support starts at 15.4+; broadly available in current desktop/mobile browsers. | Low | Messages are ephemeral (no replay if listener not active). `messageerror` for clone failures. | Yes, if at least one tab remains; no global singleton process required. | Good for 500+ spot arrays; structured clone handles objects directly. Cost is clone/GC overhead. |
| **SharedWorker** | Patchy mobile support (notably weak Android browser support profile; limited baseline). | Medium-high | Worker startup/connect race; lifecycle differs by browser; harder debugging. | Survives individual tab closes while any client port remains connected. | Good (single in-memory authority), but compatibility risk outweighs benefit. |
| **Service Worker + `clients.matchAll()`** | Broad support in secure contexts, but requires SW registration/lifecycle model. | High | SW can be terminated when idle and restarted with empty global state; activation/control edge cases; HTTPS requirement. | Yes-ish, but process is event-driven and can be culled when idle. | Good, but message routing and state persistence complexity is high for this problem. |
| **`localStorage` + `storage` event** | Very broad support (baseline). | Low-medium | Synchronous API blocks main thread; write-size quotas; no same-tab event; racey as lock primitive. | N/A (data persists), but events are best-effort signaling only. | Poor for large frequent payloads; better as lease/heartbeat metadata channel than data plane. |
| **`window.postMessage` + SharedArrayBuffer** | `postMessage` itself is broad; SAB usage is gated by cross-origin isolation headers (`COOP/COEP`) and isolation constraints. | High | Requires header/cross-origin hardening; SAB transfer restrictions across agent clusters; security deployment risk. | Not applicable as tab-to-tab bus by itself. | Technically high-throughput, but overkill and operationally risky here. |

### Why BroadcastChannel wins for HamTab

- Minimal code disruption in existing SPA modules.
- Natural same-origin tab bus with structured clone objects.
- Works with leader-election heartbeat pattern.
- Easy fallback to current behavior if unavailable.
- Keeps single-tab behavior unchanged.

### Why others were rejected

- SharedWorker: not baseline enough for HamTab audience/device mix.
- Service Worker: unnecessary lifecycle complexity for live polling arbitration.
- localStorage-only: too brittle/perf-heavy for large payload broadcast plane.
- SAB/postMessage: requires cross-origin-isolated deployment and more security headers than this feature needs.

---

## 3) Leader election pattern

## Algorithm: lease + heartbeat + jittered contention

Use **localStorage lease record** as source of truth, and **BroadcastChannel heartbeat** for low-latency liveness.

### State

- `tabId`: random UUID per tab session.
- `leaderLease` in localStorage key `hamtab_xtab_leader_v1`:
  - `{ leaderId, epoch, leaseUntil, updatedAt }`
- `heartbeat` message on channel `hamtab_xtab_v1` every 2s by leader.

### Timing constants

- `HEARTBEAT_MS = 2000`
- `LEASE_MS = 8000`
- `ELECTION_JITTER_MS = 150..500`
- `LEADER_MISS_GRACE_MS = 3000`

### Election flow

1. On startup, tab reads lease.
2. If lease valid and not self, become follower.
3. If lease missing/expired, wait random jitter and attempt claim.
4. Claim attempt:
   - Write lease with own `tabId` and `leaseUntil = now + LEASE_MS`.
   - Immediately read back key.
   - If readback `leaderId === tabId`, tab is leader.
   - Else follower (another contender won).
5. Leader renews lease every heartbeat and broadcasts `leader-heartbeat`.
6. Followers monitor both:
   - storage-event updates of lease key
   - heartbeat timestamp on BroadcastChannel
7. If lease expired and no heartbeat within grace, follower re-enters election.

### Leader death/close/crash handling

- On `beforeunload/pagehide`, leader sends `leader-resign` and clears lease if still owner.
- Crash path: no resign; followers detect missing heartbeat + expired lease and elect new leader.

### Race conditions and mitigation

- Multiple tabs can claim simultaneously due no atomic CAS in localStorage.
- Read-after-write verification + random jitter greatly reduces dual leadership.
- Add `epoch` monotonic timestamp to ignore stale leadership messages.

### Gap between death and re-election

- During gap, followers continue rendering last known data.
- If gap exceeds `LEADER_MISS_GRACE_MS + jitter`, follower may do **temporary self-fetch** for high-priority tasks (spots/sat/live-spots), then return to follower mode once leader exists.

---

## 4) Data sharing architecture

## Recommended interception point

Use a **cross-tab polling coordinator layer** between timer triggers and existing fetch functions.

- Do **not** globally wrap `window.fetch()` first; too broad and high regression risk.
- Do **not** centralize in `state.js` alone; it stores data but doesn’t control API intent.
- Best fit: per-feature fetch entrypoints (existing functions) call a shared coordinator API.

### Proposed module

New file: `src/cross-tab-poller.js`

Core API:
- `initCrossTabPolling()`
- `runSharedTask(taskSpec)` for periodic calls
- `publishTaskResult(taskKey, payload, meta)`
- `subscribeTask(taskKey, onPayload)`

`taskSpec` includes:
- `taskKey` (stable key with params, e.g. `liveSpots:callsign=K1ABC`)
- `intervalMs`
- `isEnabled()`
- `fetcher()` (leader-only)
- `apply(payload)` (all tabs)
- `maxStalenessMs`
- `priority`

### Per-tab differences handling

Use **parameterized task keys**, not one global task per widget.

Examples:
- Weather conditions key includes `lat,lon,source-capability`.
- Live spots key includes `callsign,maxAge`.
- VOACAP key includes `txLat,txLon,power,mode,toa,path,target,selectedSpot`.
- Satellite positions key includes `trackedIds,lat,lon`.

Leader fetches **union of active task keys announced by tabs**:
- Tabs broadcast `interest-upsert` periodically and on config/widget changes.
- Leader keeps in-memory `interestByTab` with TTL.
- Scheduler runs tasks for union(active interests).

### Share raw API responses vs processed state

Share **raw API responses + minimal metadata**.

Why:
- Preserves per-tab rendering differences (`distanceUnit`, visible bands, filters, selected spot).
- Reuses existing local transformation/render code.
- Avoids tight coupling between tabs’ UI assumptions.

Payload envelope:
- `{ taskKey, fetchedAt, sourceTabId, requestHash, payload }`

### Payload size strategy

- BroadcastChannel has no tiny fixed payload limit, but clone cost matters.
- Use guardrails:
  - `MAX_BROADCAST_BYTES = 1_000_000` (approx serialized)
  - If payload exceeds cap: send `payload-too-large` notice, followers self-fetch for that task.
- Prefer sending latest full snapshot (not diffs) in v1 for correctness.
- Optional v2 optimization: delta patches for spot arrays.

### Data flow diagram (ASCII)

```text
+-------------------+            BroadcastChannel/storage             +-------------------+
| Tab A (Leader)    | <---------------------------------------------> | Tab B (Follower)  |
|                   |                                                 |                   |
| scheduler ticks   |                                                 | scheduler passive |
| runSharedTask()   |                                                 | runSharedTask()   |
|   -> fetch /api/* |                                                 |   -> no network   |
|   -> publish data |-------------------- task-result --------------> | apply(payload)    |
| heartbeat+lease   |-------------------- heartbeat -----------------> | monitor leader    |
+---------+---------+                                                 +---------+---------+
          |                                                                     |
          | HTTP                                                                |
          v                                                                     |
      HamTab server                                                             |
          ^                                                                     |
          |                                                                     |
+---------+---------+            BroadcastChannel/storage             +---------+---------+
| Tab C (Follower)  | <---------------------------------------------> | localStorage lease |
| apply(payload)    |                                                 | + interest records |
+-------------------+                                                 +-------------------+
```

---

## 5) File-level implementation plan (before/after sketches)

## New files

1. `src/cross-tab-poller.js`
- leader election, lease heartbeat, task routing, fallback logic.

2. `src/cross-tab-tasks.js`
- task registration helpers for weather/sat/live-spots/voacap/refresh sources.

## Existing files to modify

### `src/state.js`

Before:
```js
const state = {
  // ...existing...
};
```

After (additions):
```js
const state = {
  // ...existing...
  crossTab: {
    enabled: true,
    available: false,
    tabId: null,
    role: 'solo', // 'leader' | 'follower' | 'solo'
    leaderId: null,
    lastHeartbeatAt: 0,
    leaseUntil: 0,
    channelName: 'hamtab_xtab_v1',
    interests: {},
    featureFlags: {
      consolidateSpots: true,
      consolidateWeather: true,
      consolidateSatellites: true,
      consolidateLiveSpots: true,
      consolidateVoacap: false,
    },
  },
};
```

### `src/main.js`

Before:
```js
setInterval(() => { if (isWidgetVisible('widget-live-spots')) fetchLiveSpots(); }, 5 * 60 * 1000);
```

After:
```js
import { initCrossTabPolling, registerDefaultCrossTabTasks } from './cross-tab-poller.js';

initCrossTabPolling();
registerDefaultCrossTabTasks();

setInterval(() => {
  runSharedTask({
    taskKey: `liveSpots:callsign=${state.myCallsign}`,
    intervalMs: 5 * 60 * 1000,
    isEnabled: () => isWidgetVisible('widget-live-spots'),
    fetcher: fetchLiveSpotsRaw,
    apply: applyLiveSpotsRaw,
  });
}, 5 * 60 * 1000);
```

### `src/refresh.js`

Before:
```js
fetchSourceData('pota');
fetchSourceData('sota');
// ...
```

After:
```js
runSharedTask(makeSourceTask('pota'));
runSharedTask(makeSourceTask('sota'));
// ...
```

### `src/weather.js`

Before:
```js
state.nwsCondTimer = setInterval(fetchNwsConditions, 15 * 60 * 1000);
```

After:
```js
state.nwsCondTimer = setInterval(() => {
  runSharedTask(makeNwsConditionsTask());
}, 15 * 60 * 1000);
```

### `src/satellites.js`

Before:
```js
export async function fetchSatellitePositions() { ... }
```

After:
```js
export async function fetchSatellitePositionsRaw() { ... return data; }
export function applySatellitePositionsRaw(data) { ...existing state/render update... }
```

Same split pattern for:
- `live-spots.js` (`fetchLiveSpotsRaw` + `applyLiveSpotsRaw`)
- `voacap.js` (`fetchVoacapRaw` + `applyVoacapRaw`)

This keeps business logic stable while enabling network dedupe.

---

## 6) Edge cases and expected behavior

### Tab crash / abrupt close
- Followers detect stale heartbeat + expired lease.
- Re-election within ~2-4 seconds.
- Optional temporary self-fetch if no leader after grace.

### Different widgets visible per tab
- Interest model tracks each tab’s active needs.
- Leader fetches union of task keys.
- Followers ignore task results they did not subscribe to.

### Different callsign/location/filter settings
- Task keys include params; only truly identical calls consolidate.
- Different params run as separate shared tasks.

### Mobile Safari / background limits
- Background tabs may throttle/freeze timers.
- Expect active foreground tab to naturally become/retain leader.
- Heartbeat/lease durations are long enough to tolerate timer drift.

### BroadcastChannel unavailable/failing
- `crossTab.available = false`.
- Every tab falls back to existing independent polling.
- No single-tab behavior change.

### Large payload handling
- If payload estimate exceeds cap, send control message and let followers self-fetch that task.
- Avoid blocking UI thread with repeated huge localStorage writes (localStorage only for lease/interest metadata).

---

## 7) Graceful degradation requirements (explicit)

- If exactly one tab is open: tab operates as leader immediately; behavior equals today.
- If cross-tab coordination initialization fails: log once, disable feature, continue normal polling.
- No user-facing UI changes required.
- Existing widget logic and render cadence remain intact.

---

## 8) Phased rollout plan

### Phase 0: Scaffolding + dark launch (no traffic reduction yet)
- Add cross-tab module, leader election, telemetry logs.
- Keep all fetches local; only exchange heartbeats/interests.

### Phase 1: Consolidate high-frequency, low-branch endpoints
- `/api/iss/position` (10s)
- `/api/satellites/positions` (10s)
- `/api/spots/psk/heard` (5m)

Expected: immediate visible API reduction in multi-tab usage.

### Phase 2: Consolidate auto-refresh spot source fan-out
- `/api/spots`, `/api/spots/sota`, `/api/spots/dxc`, `/api/spots/wwff`, `/api/spots/psk`, `/api/spots/wspr`
- Driven from `refreshAll()` tasks.

Expected: largest backend savings.

### Phase 3: Optional global filters (cross-tab UX sync)
- Add a checkbox in the Filters widget: `Apply filters to all open tabs`.
- When checked, broadcast filter state changes (band/mode/country/state/grid/continent/distance/age and watch-list mode) over the same cross-tab channel.
- Persist toggle as `hamtab_filters_global` in `localStorage` (default `false`).
- Keep per-tab behavior unchanged when unchecked (current behavior).
- Use last-write-wins with `updatedAt` timestamp to resolve simultaneous edits from different tabs.
- Scope global sync by operator identity and source context:
  - same callsign profile only
  - same source (`pota`, `sota`, `dxc`, etc.) unless explicitly expanded later

Expected: consistent multi-tab filtering while preserving opt-in control.

### Phase 4: Consolidate weather polling
- `/api/weather`, `/api/weather/conditions`, `/api/weather/alerts`, `/api/weather/owm`
- Keyed by station or lat/lon+provider.

### Phase 5: Consolidate VOACAP (complex params)
- `/api/voacap` keyed by full VOACAP parameter tuple.
- Keep retry/throttle semantics intact.

### Phase 6 (optional): perf optimization
- Payload delta encoding for large spot arrays.
- Evaluate SharedWorker only if profiling proves BroadcastChannel clone overhead is a bottleneck.

---

## 9) Decision record

Chosen:
- **Primary bus:** BroadcastChannel
- **Coordination primitive:** localStorage lease + heartbeat
- **Integration point:** shared polling coordinator called by existing feature fetch entrypoints
- **Payload form:** raw API response envelopes

Rejected:
- SharedWorker-first architecture (compatibility)
- Service-worker-first architecture (lifecycle/control complexity)
- localStorage-only payload transport (sync/perf limits)
- SAB-based shared memory (cross-origin isolation burden)

---

## 10) External references used

- BroadcastChannel API (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API
- BroadcastChannel interface (MDN): https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel
- BroadcastChannel `postMessage` (MDN): https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel/postMessage
- SharedWorker (MDN): https://developer.mozilla.org/en-US/docs/Web/API/SharedWorker
- Clients `matchAll` (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Clients/matchAll
- Client `postMessage` (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Client/postMessage
- ServiceWorkerGlobalScope lifecycle notes (MDN): https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope
- `window.postMessage` (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
- `window.crossOriginIsolated` (MDN): https://developer.mozilla.org/docs/Web/API/Window/crossOriginIsolated
- `storage` event (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- Web Storage API sync behavior (MDN): https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
- Can I use: BroadcastChannel: https://caniuse.com/broadcastchannel
- Can I use: Shared Workers: https://caniuse.com/sharedworkers
- Can I use: Service Workers: https://caniuse.com/serviceworkers
- Can I use: SharedArrayBuffer: https://caniuse.com/sharedarraybuffer
