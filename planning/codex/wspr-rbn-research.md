# Research: WSPR and Reverse Beacon Network Integration for HamTab

> **Purpose:** Research prompt for Codex. Findings go to `planning/codex/wspr-rbn-findings.md`.

## Context

HamTab is an amateur radio dashboard (Node.js/Express backend, vanilla JS frontend). It already integrates PSKReporter (digital mode spots) and DX Cluster (human-reported spots). Adding WSPR and RBN would complete the propagation picture — WSPR provides automated propagation beacon data, and RBN provides automated CW/RTTY/FT8 skimmer spots.

Together, these four sources (DX Cluster, PSKReporter, WSPR, RBN) cover nearly all band activity and propagation paths. The data is complementary: DX Cluster is human-curated, PSKReporter is automated digital decodes, WSPR is dedicated low-power propagation beacons, and RBN is automated CW/RTTY skimming.

HamTab has two modes: **lanmode** (self-hosted) and **hostedmode** (Cloudflare Containers). Both use the server as an API proxy. The frontend uses vanilla JS, Leaflet for maps, and `localStorage` for state.

## Research Questions

### 1. WSPR Data Access

- **wsprnet.org** — What APIs or data access methods exist?
  - Is there a REST API? Document endpoints, query parameters (band, callsign, time range, reporter), response format.
  - Rate limits? Authentication requirements?
  - Is there a bulk download option (CSV/database dumps)?
  - Historical data availability — how far back?
- **WSPRnet database** — Is there a PostgreSQL/MySQL dump available? How large is it?
- **WSPR-daemon / wsprd** — Can HamTab receive WSPR decodes directly from a local WSJT-X instance via UDP? (Same WSJT-X UDP protocol as FT8?)
- **Alternative WSPR aggregators** — Are there other sources for WSPR data besides wsprnet.org? (e.g., WSPR Rocks, Philip Gladstone's tools)
- What does a WSPR spot record contain? (timestamp, TX call, TX grid, TX power dBm, RX call, RX grid, frequency, SNR, drift)

### 2. Reverse Beacon Network (RBN) Data Access

- **RBN Telnet feed** — What is the connection protocol?
  - Host/port for the RBN telnet aggregator?
  - Login procedure (callsign-based like DX clusters?)
  - Spot line format — document fields and positions
  - Is it the same protocol as DX clusters (AR-Cluster compatible)?
  - Volume — how many spots per minute on a busy day?
- **RBN HTTP API** — Does reversebeacon.net have a REST API?
  - If so: endpoints, query parameters, response format, rate limits
  - Authentication?
- **RBN WebSocket** — Any real-time streaming API?
- **Third-party RBN aggregators** — Are there services that pre-aggregate RBN data with filtering? (rbn.telegraphy.de, etc.)
- What does an RBN spot record contain? (de callsign, dx callsign, frequency, mode, SNR, speed/WPM, timestamp)

### 3. Data Volume and Performance

- WSPR: How many spots per hour/day globally? What's the data rate if polling vs. streaming?
- RBN: How many spots per minute? This is potentially very high volume — what filtering is needed server-side?
- How do PSKReporter, WSPR, and RBN spot volumes compare?
- What's a reasonable poll interval for each? (WSPR spots are timestamped every 2 minutes; RBN is continuous)
- Memory budget — if holding last N minutes of spots in memory (no database), what's the footprint for 10,000 WSPR spots and 50,000 RBN spots?

### 4. Propagation Analysis Use Cases

Beyond just displaying spots, WSPR and RBN data enable propagation analysis:
- **Band openings detection** — How to detect a band opening from WSPR/RBN data? (sudden increase in spot count + SNR on a band between two regions)
- **Path analysis** — Given TX grid + RX grid + SNR, can we draw propagation paths on the map with signal quality?
- **Historical comparison** — "How is 20m doing today vs. yesterday?" — is there enough data density from WSPR for this?
- **Correlation with solar data** — HamTab already has SFI, Kp, Bz. Can we overlay WSPR/RBN spot counts against these indices?
- How do tools like **WSPR Rocks**, **DXMaps**, and **VK7JJ's WSPR analysis** present this data?

### 5. Integration Architecture

Given HamTab's constraints:
- **Polling vs. streaming** — WSPR is probably best as periodic HTTP polling (data arrives in 2-min windows). RBN might benefit from a telnet connection (like DX Cluster research).
- **Spot merging** — HamTab already has DX Cluster and PSKReporter spots on the map. How to merge WSPR/RBN spots into the same UI without overwhelming it?
- **Source attribution** — Each spot should show its source (DX, PSK, WSPR, RBN). How to visually distinguish them? (color coding? icon variation? filter toggles?)
- **Deduplication** — The same station may appear in PSKReporter, RBN, and DX Cluster simultaneously. Strategy for dedup across sources?
- **Hostedmode feasibility** — Can the Cloudflare Container make outbound HTTP to wsprnet.org and telnet to RBN? Or do we need HTTP-only APIs for hostedmode?

### 6. Existing Libraries

- Search npm/GitHub for WSPR and RBN client libraries in JavaScript/Node.js.
- Any existing WSPR spot parsers?
- Any existing RBN telnet clients?
- How does GridTracker handle WSPR/RBN data?

### 7. Legal and Attribution

- wsprnet.org terms of use — any restrictions on displaying their data in a third-party tool?
- RBN data usage policy — any attribution requirements?
- PSKReporter already has usage terms that HamTab follows — are WSPR/RBN similar?

## Output Format

Deliver findings as `planning/codex/wspr-rbn-findings.md` with:
- Section per research question
- API documentation with example requests/responses
- Spot format documentation with field definitions
- Volume estimates with performance recommendations
- Code snippets for API clients and parsers
- A "Recommended Implementation Path" section with phased approach (suggest which to add first and why)
- Links to primary sources and documentation
