# HamTab Roadmap

A high-level overview of where HamTab is headed. For feature requests or feedback, [open an issue](https://github.com/stevencheist/HamTabv1/issues).

## Completed

- POTA, SOTA, DX Cluster, and PSKReporter spot integration
- Interactive map with gray line, geodesic paths, and satellite tracking
- Solar/lunar data, space weather, and propagation indices
- VOACAP propagation predictions with reliability heatmap
- Space weather history graphs (SFI, Kp, X-ray, solar wind, Bz)
- Filter system with band, mode, distance, and preset support
- Watch list modes (highlight, filter, exclude)
- Theme engine with 8 built-in themes
- Grid layout engine with 5 permutations and drag-drop widget swapping
- Mobile-responsive layout with progressive scaling
- Weather integration (NWS + Weather Underground)
- DE/DX operator widget with sunrise/sunset countdowns
- Reference tables (RST, NATO phonetic, band chart)
- Contest calendar and DXpedition tracker with map markers
- NCDXF beacon widget with rotation schedule
- Analog clock with 6 faces and 4 complications
- Stopwatch and countdown timer
- DRAP storm overlay (auto-triggers on Kp >= 5)
- In-app feedback system
- Two deployment modes: self-hosted (lanmode) and cloud (hamtab.net)

## Next Up

### ADIF Log Integration (In Progress)
Import and view contact logs from any logging software. Sortable table with band/mode/date filters, QSO markers on the map, and drag-and-drop file import. Client-side only — your log stays in your browser.

### WSPR Propagation Data
Real-time WSPR beacon reception reports via wspr.live API. Automated propagation measurement — see which bands are actually open right now, not just what VOACAP predicts. Works in both deployment modes (HTTP polling).

### DX Cluster Live TCP + RBN
Replace HTTP polling with a direct telnet connection to DX cluster nodes for real-time spot flow. Same architecture extends to Reverse Beacon Network (automated CW/digital skimmer spots). Lanmode first, hostedmode with HTTP fallback.

### WSJT-X and Logger UDP Integration (Lanmode)
Live FT8/FT4 decodes and logged QSOs from WSJT-X, N1MM+, and other logging software via UDP. Scrolling decode widget with CQ highlighting. Lanmode only — requires same-network access to logging software.

## Planned

### Data & Propagation
- Real-time SSN + K-index correction for VOACAP predictions
- Effective SSN from live foF2 ionosonde measurements
- WSPR/PSK observation vs. VOACAP prediction comparison
- PSKReporter MQTT real-time feed (lower latency than polling)
- RSS feed widget with configurable sources
- DX news ticker
- BOTA (Beaches on the Air) spot source
- Band Opportunity Score widget — composite score (0-100) per band combining VOACAP reliability, PSK/WSPR heard density, and space weather penalties, with "Top 3 bands now" display
- Centralized fetch scheduler with jitter, exponential backoff, and freshness metadata to reduce burst polling and improve stale-data UX
- SSE feed channel for lanmode low-latency push updates (`spots:update`, `status:update`, `alerts:update`) with HTTP polling fallback for hostedmode

### Map & Visualization
- Azimuthal map projection (DE-centered) with bearing rings
- Aurora map overlay (NOAA OVATION)
- Earthquake overlay (USGS live data)
- Satellite sky plot visualization
- Lunar/EME planning tools
- CQ/ITU zone overlays

### Hardware Integration
- CAT rig control via WebSerial (Yaesu, Icom, Kenwood, Elecraft)
- Click-to-tune from spot table
- Panadapter / spectrum scope for connected rigs (IC-7300, FT-DX10)
- hamlib/flrig rig control (lanmode)

### UI/UX
- Named layout profiles with activity presets (POTA Hunter, DX Contest, EME)
- Configuration export/import
- Custom theme builder with live preview
- HamClock compatibility mode (one-click layout preset)
- Multi-language support (i18n)
- Unified Alert Center — in-app alert queue (watchlist hits, stale feeds, NWS weather, update events) with severity levels and per-type suppression windows
- Accessibility pass — keyboard navigation, ARIA labels, sort-state announcements, focus-trapped overlays, Escape-close standardization, reduced-motion mode
- Optimize heavy widget rendering — virtualized row rendering for logbook/spots tables, spatial indexing for float-mode overlap resolution, requestAnimationFrame batching
- Visual density modes — Simple / Operator / Power-user presets controlling default widget visibility, spacing, and typography scale; includes HamClock transition preset

### Platform & Architecture
- Decompose monolithic `server.js` into domain routers (`routes/spots.js`, `routes/weather.js`, `routes/solar.js`, etc.) and shared services (`services/cache-store.js`, `services/http-fetch.js`)
- Version and migrate client state schema — `stateSchemaVersion` with declarative migration registry, validation layer, per-subsystem safe reset

### Security Hardening
- Harden config/admin endpoints — require `CONFIG_ADMIN_TOKEN` for write operations (no IP-only fallback), add request audit log with value redaction, anti-CSRF tokens, endpoint-level strict rate limits

## Contributing

We welcome feature requests and bug reports via [GitHub Issues](https://github.com/stevencheist/HamTabv1/issues). See README.md for setup instructions.
