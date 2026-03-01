# WSPR + RBN Integration Findings — Research

> **For:** Claude (via Francisco)
> **From:** Codex
> **Date:** 2026-03-01
> **Operating under:** coordination.md v2.0, codex-prompt v1.0, STATE-v3

## Summary
WSPR and RBN are both practical additions for HamTab, but they should be integrated in a staged order: WSPR first (HTTP polling, lower complexity), then RBN (telnet streaming, higher volume/operational complexity). For WSPR, `wspr.live` provides modern JSON APIs with clear parameterization, while classic WSPRnet web/query endpoints remain useful but less API-structured. For RBN, the established model is telnet-compatible streaming (including `telnet.reversebeacon.net:7000`) plus ecosystem tools that consume cluster-formatted lines. Integration should be source-tagged, heavily filterable, and bounded in-memory to avoid overwhelming current map/table UX.

## 1. WSPR Data Access

### wsprnet.org
- WSPRnet exposes web query surfaces for spots and maps; these are usable for fetch/proxy workflows but are not presented as a modern versioned REST API.
- Data is available historically through query interfaces and community tooling.

### wspr.live (recommended API source)
- Public HTTP JSON endpoints documented in `wspr.live` docs, e.g.:
  - `/api/v1/spots`
  - `/api/v1/bands`
  - `/api/v1/receivers`
  - `/api/v1/transmitters`
- Rich filtering options (`band`, `reporter`, `tx_sign`, `timestamp`, etc.) make it suitable for HamTab server proxy/polling.

### Local WSPR from WSJT-X
- WSJT-X protocol includes `WSPRDecode`/related message types, so lanmode can optionally ingest local WSPR decode traffic directly as a future enhancement.

### Alternative sources
- Community services and analysis tools exist (e.g., WSPR Rocks ecosystem), but API stability varies.

### WSPR spot record fields (practical)
- Time
- TX callsign / RX callsign
- TX grid / RX grid
- Frequency (band)
- SNR
- Drift
- TX power (dBm)

## 2. RBN Data Access

### Telnet feed
- RBN is commonly consumed via telnet-compatible cluster feed.
- Common endpoint reference: `telnet.reversebeacon.net:7000`.
- Data is line-oriented and cluster-like (`DX de ...`) with skimmer metadata.

### HTTP/API availability
- Reverse Beacon Network provides developer-facing pages/data references, but I did not find a single canonical, broadly documented, stable REST API comparable to modern JSON APIs.
- Practical production path remains telnet stream + parser.

### Third-party aggregators
- Third-party dashboards/aggregators exist; treat as optional secondary sources unless ToS and API stability are explicitly verified.

### RBN spot record fields (practical)
- Spotter (skimmer) callsign
- Spotted station callsign
- Frequency
- Mode (often inferred/annotated)
- Signal quality (db)
- CW speed/WPM (where present)
- UTC timestamp

## 3. Data Volume and Performance

### Relative volumes (practical planning)
- **WSPR**: timestamp windows naturally align with ~2-minute cadence, suitable for periodic polling.
- **RBN**: continuous, potentially high burst rates during contests.
- **PSKReporter** (already used) is also high-volume but query-scoped by callsign; global RBN feed can exceed that if unfiltered.

### Recommended defaults
- WSPR polling: every 120-180 seconds.
- RBN streaming: continuous ingest, but strict server-side filters and downsampling before UI emit.

### Memory budget strategy (no DB)
- Use ring buffers per source:
  - WSPR: last 10,000 spots
  - RBN: last 50,000 spots
- Store compact normalized object shape and precomputed keys for dedup.
- Drop oldest first (time-ordered ring buffers).

## 4. Propagation Analysis Use Cases

### Band opening detection
- Signal: sharp rise in spot count + improving median SNR on a band between two regions over rolling window.
- Can be implemented as derived metrics widget (counts + percentile SNR per band per 15 min bucket).

### Path analysis
- Draw TX->RX geodesic paths color-coded by SNR bucket.
- For WSPR this is especially informative due beacon consistency.

### Historical comparison
- “Today vs yesterday” band activity curves are feasible with WSPR due regular cadence and density.

### Solar correlation
- HamTab already has SFI/Kp/Bz; overlaying WSPR/RBN spot counts in same timeline is straightforward and valuable.

## 5. Integration Architecture

### Polling vs streaming
- **WSPR**: HTTP polling via server proxy (hostedmode + lanmode).
- **RBN**: telnet stream in lanmode first; hostedmode gated by TCP capability.

### Spot merging and attribution
- Add source tags in normalized schema: `source: 'dxc' | 'psk' | 'wspr' | 'rbn'`.
- UI differentiation:
  - source color/icon
  - per-source toggles
  - per-source filters retained in state

### Dedup strategy across sources
- Fingerprint key: `normCall + band/freq bucket + time bucket + source`.
- Cross-source “possible same station” association should be heuristic only (not hard dedup) to preserve provenance.

### Hostedmode feasibility
- HTTP WSPR is straightforward in hostedmode.
- RBN telnet should be runtime-tested; if unavailable, feature-disable RBN stream and keep WSPR only.

## 6. Existing Libraries

### WSPR
- `wspr.live` docs and API shape reduce need for specialized Node SDK.
- Plain `fetch` + schema validation is sufficient.

### RBN
- No clearly dominant Node RBN client package surfaced as standard.
- Build a focused in-repo telnet line parser similar to DX cluster path.

### GridTracker precedent
- GridTracker demonstrates value of combining multiple automated spot sources and map overlays.

## 7. Legal and Attribution

### WSPR / RBN usage
- I did not find a single explicit API ToS page in the retrieved primary docs equivalent to PSKReporter’s well-known policy style.
- Recommendation:
  - Add explicit attribution in UI/help panel.
  - Respect source/operator load (poll interval limits, caching).
  - Keep provider adapters easy to disable if policy changes.

## Recommended Implementation Path

### Phase 1 (WSPR first)
1. Add `/api/spots/wspr` server proxy using `wspr.live` endpoint(s).
2. Poll every 2-3 minutes; cache server-side for short TTL.
3. Add source tab + map markers/paths (off by default initially).
4. Add per-source filtering and source attribution badges.

### Phase 2 (RBN lanmode)
1. Implement `RbnTelnetClient` (similar to DX TCP client).
2. Parse and normalize RBN lines to spot schema.
3. Add ring buffer + dedup + burst batching to UI.
4. Add config panel for enable/disable and filter presets.

### Phase 3 (analysis overlays)
1. Add band opening detector metrics widget.
2. Add history view (today vs yesterday) for WSPR/RBN counts + median SNR.
3. Add optional combined propagation score blending SFI/Kp/Bz with spot density.

## Suggested Integration Order
1. **WSPR HTTP (both modes)**: lowest risk, immediate value.
2. **RBN telnet (lanmode)**: high value, medium complexity.
3. **Hostedmode RBN**: only if runtime TCP capability and operational cost are acceptable.

## HamTab Codebase Fit Notes
- Existing spot source endpoint patterns can be extended with WSPR source route: `/home/fpeebles/coding/HamTabV1/server.js:361`.
- Existing source-state architecture is already multi-source and can absorb two new source keys: `/home/fpeebles/coding/HamTabV1/src/state.js:77`.
- Existing live spot map rendering logic demonstrates source-specific marker/path workflows that can be reused: `/home/fpeebles/coding/HamTabV1/src/live-spots.js:190`.

## Sources

### External
- WSPRnet main site: https://www.wsprnet.org/drupal/
- WSPRnet spots/query surface: https://www.wsprnet.org/drupal/wsprnet/spots
- wspr.live API docs: https://wspr.live/gui/d/6kg8r7x4mqv0ga/wspr-live-api
- Reverse Beacon Network developer page: https://reversebeacon.net/pages/For+Developers+7
- RBN Telnet how-to reference (endpoint usage examples): https://www.qsl.net/pa3gcu/rbn.html
- Node TCP sockets (`net`): https://nodejs.org/api/net.html

### Repo references
- `/home/fpeebles/coding/HamTabV1/server.js:361`
- `/home/fpeebles/coding/HamTabV1/src/state.js:77`
- `/home/fpeebles/coding/HamTabV1/src/live-spots.js:190`
