# HamTab Performance Efficiencies — Codebase Review + Roadmap Adds

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-01
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE v3

## Scope

Review focused on runtime efficiency in client render loops, map overlays, polling cadence, and network/cache usage. This is not a feature-gap review.

## Findings and Recommendations

### 1) Stop Forcing Cache Misses on Every Poll
- **Current state**:
  - Source refresh always appends `_t=${Date.now()}`: `HamTabV1/src/refresh.js:19`
  - Live-spots fetch does the same: `HamTabV1/src/live-spots.js:69`
  - MUF image overlay refresh adds timestamp cache-bust every cycle: `HamTabV1/src/map-overlays.js:170`, `HamTabV1/src/map-overlays.js:182`
  - Server already emits Cache-Control for these endpoints: `HamTabV1/server.js:106`, `HamTabV1/server.js:108`
- **Impact**:
  - Defeats browser and edge cache reuse, increases backend and upstream traffic, and amplifies refresh bursts.
- **Recommendation**:
  - Remove default cache-busting query params for endpoints that already have cache semantics.
  - Keep explicit bypass only for manual hard refresh/debug mode.

### 2) Replace Full Spot Table Rebuilds with Incremental Age Updates
- **Current state**:
  - Re-renders spot table every 30s globally: `HamTabV1/src/main.js:78`
  - `renderSpots()` clears body, rebuilds headers, sorts clone, and rebinds per-row listeners each render: `HamTabV1/src/spots.js:70`, `HamTabV1/src/spots.js:74`, `HamTabV1/src/spots.js:83`, `HamTabV1/src/spots.js:99`, `HamTabV1/src/spots.js:162`
- **Impact**:
  - O(n log n + DOM rebuild) every cycle, even when only age text changes.
- **Recommendation**:
  - Separate "age tick" from full render: update `.age` cells in place every 30s.
  - Trigger full table rebuild only on data/filter/sort/schema changes.
  - Preserve row nodes keyed by `spotId` and patch changed rows.

### 3) Move Marker Rendering to Diff/Patch Instead of Clear-and-Recreate
- **Current state**:
  - Every marker render clears all layers and repopulates: `HamTabV1/src/markers.js:181`, `HamTabV1/src/markers.js:188`, `HamTabV1/src/markers.js:225`
  - Band path lines also clear/rebuild wholesale: `HamTabV1/src/markers.js:119`, `HamTabV1/src/markers.js:126`
- **Impact**:
  - High GC churn and map-layer churn when spot sets update frequently.
- **Recommendation**:
  - Track marker/line maps by stable `spotId`; add/update/remove by diff set.
  - Recompute geodesics only for new/changed spots and on relevant setting changes.

### 4) Cap/Adaptive-Quality Live Spots Geodesics
- **Current state**:
  - Live-spots map fully clears and redraws all markers/lines on each toggle/render: `HamTabV1/src/live-spots.js:193`, `HamTabV1/src/live-spots.js:211`, `HamTabV1/src/live-spots.js:277`
  - Each line uses 50 geodesic segments regardless of zoom or density: `HamTabV1/src/live-spots.js:217`
- **Impact**:
  - Large point counts become expensive quickly when many receivers are present.
- **Recommendation**:
  - Adaptive segment count by zoom (e.g., 12/24/50), plus per-band max-line cap and sampling.
  - Render nearest/strongest N lines first; progressively add more when idle.

### 5) Offload Heatmap Rasterization from Main Thread
- **Current state**:
  - WSPR heatmap loops over endpoints, buckets grid, builds imageData, then `toDataURL()` each render: `HamTabV1/src/wspr-heatmap.js:110`, `HamTabV1/src/wspr-heatmap.js:157`, `HamTabV1/src/wspr-heatmap.js:193`
  - Render is triggered on map interactions and data refresh via timers/debounces: `HamTabV1/src/map-init.js:90`, `HamTabV1/src/refresh.js:34`
- **Impact**:
  - Main-thread spikes and UI hitching during pan/zoom and heavy-data bands.
- **Recommendation**:
  - Move heatmap compute + rasterization to Web Worker (OffscreenCanvas/ImageBitmap path where supported).
  - Cache raster tiles keyed by zoom/bounds/band/source timestamp.

### 6) Spread Polling Load with Jittered Scheduler and Concurrency Budget
- **Current state**:
  - Multiple independent intervals trigger on fixed boundaries: `HamTabV1/src/main.js:68`, `HamTabV1/src/main.js:72`, `HamTabV1/src/main.js:73`, `HamTabV1/src/main.js:136`, `HamTabV1/src/main.js:139`, `HamTabV1/src/main.js:140`, `HamTabV1/src/main.js:143`
  - `refreshAll()` calls many fetches together: `HamTabV1/src/refresh.js:57`, `HamTabV1/src/refresh.js:62`, `HamTabV1/src/refresh.js:68`
- **Impact**:
  - Burst network/CPU patterns and increased contention during refresh windows.
- **Recommendation**:
  - Central scheduler with randomized phase offset, endpoint concurrency limit, and priority queues (visible widget > background).
  - Reuse existing planned scheduler direction and make it the default execution path.

### 7) Avoid Full Logbook Map Repaint on Minor UI Changes
- **Current state**:
  - Logbook map rendering starts by clearing all map layers: `HamTabV1/src/logbook.js:305`
  - Re-draws all filtered QSOs and paths every call: `HamTabV1/src/logbook.js:312`, `HamTabV1/src/logbook.js:323`, `HamTabV1/src/logbook.js:329`
- **Impact**:
  - High redraw cost on filter/sort interactions with larger ADIF imports.
- **Recommendation**:
  - Build spatial index by band/mode/grid and diff visible sets.
  - Redraw only delta markers/paths for filter changes.

## Priority Order
1. Remove forced cache-busting + incremental spot table updates.
2. Marker diff rendering + live-spots adaptive geodesics.
3. Centralized scheduler with jitter/concurrency budget.
4. Worker-based heatmap rasterization.
5. Logbook overlay diffing/spatial index.

## Sources
- `HamTabV1/src/refresh.js:19`
- `HamTabV1/src/refresh.js:57`
- `HamTabV1/src/refresh.js:62`
- `HamTabV1/src/refresh.js:68`
- `HamTabV1/src/main.js:68`
- `HamTabV1/src/main.js:72`
- `HamTabV1/src/main.js:73`
- `HamTabV1/src/main.js:78`
- `HamTabV1/src/main.js:136`
- `HamTabV1/src/main.js:139`
- `HamTabV1/src/main.js:140`
- `HamTabV1/src/main.js:143`
- `HamTabV1/src/spots.js:70`
- `HamTabV1/src/spots.js:74`
- `HamTabV1/src/spots.js:83`
- `HamTabV1/src/spots.js:99`
- `HamTabV1/src/spots.js:162`
- `HamTabV1/src/markers.js:119`
- `HamTabV1/src/markers.js:126`
- `HamTabV1/src/markers.js:181`
- `HamTabV1/src/markers.js:188`
- `HamTabV1/src/markers.js:225`
- `HamTabV1/src/live-spots.js:69`
- `HamTabV1/src/live-spots.js:193`
- `HamTabV1/src/live-spots.js:211`
- `HamTabV1/src/live-spots.js:217`
- `HamTabV1/src/live-spots.js:277`
- `HamTabV1/src/wspr-heatmap.js:110`
- `HamTabV1/src/wspr-heatmap.js:157`
- `HamTabV1/src/wspr-heatmap.js:193`
- `HamTabV1/src/map-init.js:90`
- `HamTabV1/src/map-overlays.js:170`
- `HamTabV1/src/map-overlays.js:182`
- `HamTabV1/src/logbook.js:305`
- `HamTabV1/src/logbook.js:312`
- `HamTabV1/src/logbook.js:323`
- `HamTabV1/src/logbook.js:329`
- `HamTabV1/server.js:106`
- `HamTabV1/server.js:108`
