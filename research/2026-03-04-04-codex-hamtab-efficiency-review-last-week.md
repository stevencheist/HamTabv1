# HamTab Efficiency Review — Last-Week Changes (Research)

> **For:** Claude (via developer)
> **From:** Codex
> **Date:** 2026-03-04
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE: check needed

## Summary
This review focused on high-churn areas from the last 7 days and looked for runtime inefficiencies likely to impact responsiveness, CPU, battery, and network use. The largest gains are available in three places: global timer consolidation, map overlay redraw strategy, and high-frequency rig-widget rendering paths. The codebase already has good patterns in some areas (e.g., teardown logic in cross-tab and selective spot-age updates), so this is mostly optimization, not rearchitecture. Recommended next step is a small “perf pass” with instrumentation first, then 3-5 targeted refactors.

## Scope + Method
- Reviewed highest-churn files in last 7 days (`public/app.js`, `src/main.js`, `src/state.js`, `src/on-air-rig.js`, `src/cross-tab.js`, `src/cat/*`, `src/map-*`, `src/spots.js`, `src/live-spots.js`).
- Traced timer setup, event-listener lifecycle, polling loops, and redraw paths.
- Focused on user-visible runtime efficiency (not bundle-size build optimization).

## Findings (Prioritized)

### 1) Global polling/timer fan-out is high and mostly unmanaged
**Impact:** High (CPU wakeups, battery, hidden-tab waste, duplicated work)

`src/main.js` sets many independent intervals at startup, including 1s, 10s, 30s, 60s, and 5m loops. Some are visibility-gated, several are not.

- Always-running timers include clock updates and spot age updates: `setInterval(..., 1000)` and `setInterval(updateSpotAges, 30000)` at [src/main.js:83](/home/fpeebles/coding/HamTabV1/src/main.js:83) and [src/main.js:84](/home/fpeebles/coding/HamTabV1/src/main.js:84).
- Additional recurring loops are distributed across the module (grayline/sun, satellites, live spots, VOACAP, beacons) at [src/main.js:74](/home/fpeebles/coding/HamTabV1/src/main.js:74), [src/main.js:78](/home/fpeebles/coding/HamTabV1/src/main.js:78), [src/main.js:79](/home/fpeebles/coding/HamTabV1/src/main.js:79), [src/main.js:174](/home/fpeebles/coding/HamTabV1/src/main.js:174), [src/main.js:177](/home/fpeebles/coding/HamTabV1/src/main.js:177), [src/main.js:178](/home/fpeebles/coding/HamTabV1/src/main.js:178), [src/main.js:181](/home/fpeebles/coding/HamTabV1/src/main.js:181).
- `refreshAll()` triggers multi-source fetch fan-out (`pota/sota/dxc/wwff/psk/wspr` + overlays/widgets) at [src/refresh.js:57](/home/fpeebles/coding/HamTabV1/src/refresh.js:57) through [src/refresh.js:69](/home/fpeebles/coding/HamTabV1/src/refresh.js:69), then auto-refresh ticks every second for countdown at [src/refresh.js:93](/home/fpeebles/coding/HamTabV1/src/refresh.js:93).

**Recommendation:** route to Claude
- Add a centralized scheduler service that can pause noncritical intervals on `document.hidden`.
- Coalesce related 1s updates into a single frame/tick with lightweight subscribers.
- Introduce per-task jitter for non-UI network polls (reduces synchronized bursts).

### 2) Map overlay redraw strategy does full rebuilds on `moveend` and `zoomend`
**Impact:** High (UI jank and map interaction latency on lower-end devices)

`map-init` duplicates largely identical handlers for `zoomend` and `moveend`, each triggering overlay redraw logic and heatmap debounced rerenders.

- Duplicate redraw blocks at [src/map-init.js:69](/home/fpeebles/coding/HamTabV1/src/map-init.js:69) and [src/map-init.js:95](/home/fpeebles/coding/HamTabV1/src/map-init.js:95).
- Grid renderers remove and recreate entire layer groups every call (`lat/lon`, `maidenhead`, `timezone`) at [src/map-overlays.js:21](/home/fpeebles/coding/HamTabV1/src/map-overlays.js:21), [src/map-overlays.js:63](/home/fpeebles/coding/HamTabV1/src/map-overlays.js:63), [src/map-overlays.js:140](/home/fpeebles/coding/HamTabV1/src/map-overlays.js:140).
- DRAP render path creates a canvas and converts to data URL on each refresh: [src/map-overlays.js:259](/home/fpeebles/coding/HamTabV1/src/map-overlays.js:259) and [src/map-overlays.js:285](/home/fpeebles/coding/HamTabV1/src/map-overlays.js:285).

**Recommendation:** route to Claude
- Unify `zoomend/moveend` into one debounced handler.
- Add view-state memoization (zoom bucket + tile bounds hash) to skip no-op rebuilds.
- Prefer `canvas.toBlob()` + object URL lifecycle over repeated large data URLs for raster overlays.

### 3) Rig widget render path performs high-frequency DOM querying and global selection
**Impact:** Medium-High (unnecessary main-thread work when connected)

`on-air-rig` render does repeated DOM lookups each store update, plus repeated `querySelectorAll` scans for band buttons.

- Per-render repeated element lookups at [src/on-air-rig.js:261](/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:261) through [src/on-air-rig.js:272](/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:272).
- Per-render button scan/toggle at [src/on-air-rig.js:288](/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:288).
- Manager polling/meter cadence can drive frequent store updates: polling every 500ms and meters every 200ms by default at [src/cat/rig-manager.js:9](/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:9) through [src/cat/rig-manager.js:11](/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:11), [src/cat/rig-manager.js:174](/home/fpeebles/coding/HamTabV1/src/cat/rig-manager.js:174).

**Recommendation:** route to Claude
- Cache widget DOM refs once on init.
- Diff update subsets (frequency-only, meter-only, mode-only) to avoid full render writes each state event.
- Consider throttling meter visual updates to animation frame (`requestAnimationFrame`) while preserving backend sampling.

### 4) Modal/listener lifecycle bug can accumulate listeners
**Impact:** Medium (memory + duplicate handler execution risk)

`showNewWidgetPopup()` binds click/key handlers each invocation with no removal/`once` protection.

- Repeated listener attachment at [src/main.js:132](/home/fpeebles/coding/HamTabV1/src/main.js:132), [src/main.js:136](/home/fpeebles/coding/HamTabV1/src/main.js:136), [src/main.js:140](/home/fpeebles/coding/HamTabV1/src/main.js:140).

**Recommendation:** route to Claude
- Move to one-time listener registration or use `{ once: true }` where appropriate.
- Add guard flag for modal listener initialization.

### 5) Cross-tab foundation exists but is not yet used to suppress duplicate fetch work
**Impact:** Medium (network and compute duplication across tabs)

Cross-tab election and heartbeat are present, with cleanup and role transitions implemented well.

- Election/heartbeat core at [src/cross-tab.js:119](/home/fpeebles/coding/HamTabV1/src/cross-tab.js:119), [src/cross-tab.js:155](/home/fpeebles/coding/HamTabV1/src/cross-tab.js:155), [src/cross-tab.js:210](/home/fpeebles/coding/HamTabV1/src/cross-tab.js:210).
- Proper teardown at [src/cross-tab.js:439](/home/fpeebles/coding/HamTabV1/src/cross-tab.js:439).
- Comment confirms “scaffolding only — no fetch behavior changes yet” at [src/main.js:24](/home/fpeebles/coding/HamTabV1/src/main.js:24).

**Recommendation:** route to Claude
- Gate periodic network fetches to leader tab; followers consume shared cache/broadcast updates.
- Start with high-cost sources first (`psk/wspr/voacap/weather`).

### 6) Command queue sorting approach is acceptable now, but scales poorly under bursts
**Impact:** Low-Medium (future-proofing)

Each push re-sorts full queue (`O(n log n)`), plus secondary sort when dropping low-priority items.

- Sort points at [src/cat/command-queue.js:41](/home/fpeebles/coding/HamTabV1/src/cat/command-queue.js:41) and [src/cat/command-queue.js:48](/home/fpeebles/coding/HamTabV1/src/cat/command-queue.js:48).

**Recommendation:** route to Claude
- Keep current implementation for now unless telemetry shows queue pressure.
- If pressure appears: switch to bucketed deques by priority + coalescing map.

## Efficiency Gains Already Present (Keep)
- Spot age updates are incremental, avoiding full table rebuild every 30s at [src/spots.js:173](/home/fpeebles/coding/HamTabV1/src/spots.js:173).
- Rig widget avoids repeated listener registration during show/hide cycles with `listenersAttached` guard at [src/on-air-rig.js:20](/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:20) and [src/on-air-rig.js:783](/home/fpeebles/coding/HamTabV1/src/on-air-rig.js:783).
- Cross-tab teardown path is complete and explicit at [src/cross-tab.js:439](/home/fpeebles/coding/HamTabV1/src/cross-tab.js:439).

## Suggested Implementation Order (Highest ROI)
1. **Timer governance pass** (pause on hidden tab + scheduler consolidation).
2. **Map redraw pass** (dedupe handlers + no-op skip + raster URL strategy).
3. **Rig render pass** (DOM ref caching + partial diff updates).
4. **Listener hygiene pass** (modal event dedupe).
5. **Cross-tab fetch leadership** (network duplication reduction).

## Acceptance Metrics (What to Measure Before/After)
- Main thread:
  - Fewer long tasks and lower scripting time during 30s idle + map pan/zoom interaction.
- Network:
  - Request count/minute reduced when multiple HamTab tabs are open.
- Battery/CPU:
  - Lower CPU while tab is backgrounded for 5 minutes.
- Rig widget:
  - Lower render/update cost under active CAT polling.

## Notes on Risk
- Most recommendations are low behavioral risk if gated behind existing feature flags.
- Cross-tab leader-only fetching introduces correctness risk if leader/follower transitions are not hardened; add fallback refresh on follower lease-expiry/election transitions.

## Sources
- `src/main.js:24` — cross-tab scaffolding note
- `src/main.js:74` — grayline/sun periodic timer
- `src/main.js:83` — 1s clock update timer
- `src/main.js:132` — modal listener attachment pattern
- `src/refresh.js:57` — refresh fan-out across sources
- `src/map-init.js:69` — zoomend redraw handler
- `src/map-init.js:95` — moveend redraw handler
- `src/map-overlays.js:21` — grid full layer rebuild pattern
- `src/map-overlays.js:285` — DRAP dataURL overlay render
- `src/on-air-rig.js:261` — high-frequency render lookup path
- `src/on-air-rig.js:288` — per-render global button query
- `src/cat/rig-manager.js:9` — default poll cadence
- `src/cat/command-queue.js:48` — queue sort on push
- `src/spots.js:173` — incremental age patching optimization
- `src/cross-tab.js:439` — cross-tab teardown completeness
