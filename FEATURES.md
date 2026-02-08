# HamTabv1 Feature Inventory

> **Version:** 0.29.0 | **Last updated:** 2026-02-07
> **Purpose:** Single source of truth for what HamTab can do. Referenced by research prompts, Reddit posts, competitive analysis, and snapshot artifacts. Update this file when features ship.

## Quick Facts

- **Try it:** https://hamtab.net (no install, any browser)
- **Self-host:** Linux, Raspberry Pi, Windows, macOS
- **License:** MIT, open source
- **Repo:** https://github.com/stevencheist/HamTabv1

## Widgets (16)

| Widget | What It Does |
|--------|-------------|
| On the Air | POTA, SOTA, DX Cluster, PSKReporter live spots with source tabs |
| HamMap | Interactive Leaflet map — satellite tracks, propagation overlays, gray line terminator, geodesic paths |
| Filters | Band, mode, distance, age, country, state, grid, license class |
| Solar | Real-time solar flux, sunspot number, A/K indices, X-ray, signal noise (18 configurable fields) |
| Space Weather History | 7–90 day graphs: Kp, X-Ray, SFI, Solar Wind, Bz |
| Band Conditions | Day/night HF conditions by region |
| VOACAP DE→DX | 24-hour propagation predictions with power/mode/path controls |
| Live Spots | Where your signal is being received (PSKReporter heard query) |
| Lunar / EME | Moon phase, illumination, declination, distance, path loss |
| Satellites | Real-time ISS + ham satellite tracking (N2YO + SGP4 keyless fallback) |
| Reference | RST codes, NATO phonetic, Morse code, Q-codes, US band privileges |
| DX Detail | Selected spot details — callsign, frequency, mode, distance, bearing |
| Contests | Active/upcoming contests from WA7BNM calendar with mode badges |
| DXpeditions | NG3K tracker — callsign, location, dates, QSL info |
| NCDXF Beacons | 18 worldwide beacons on 5 HF frequencies, 3-minute cycle countdown |
| DE/DX Info | Side-by-side station comparison with sunrise/sunset, bearing, distance |

## Themes (4)

| Theme | Description |
|-------|-------------|
| Default | Modern dark theme |
| LCARS | Star Trek TNG inspired (Arial Narrow, colored bars) |
| Terminal | Retro green CRT (Courier New, scanlines) |
| HamClock | WB0OEW tribute — matches original HamClock aesthetic (CARTO Voyager map tiles) |

## Data Sources

### No API Key Required
- POTA API (spots + park info)
- SOTA API (spots + summit info)
- DX Cluster (telnet-sourced)
- PSKReporter (heard query)
- HamQSL Solar XML
- prop.kc2g.com (MUF/foF2 propagation maps)
- wheretheiss.at (ISS position)
- NWS API (US weather)
- Callook.info (US license lookup)
- NOAA SWPC (space weather history)
- NG3K (DXpeditions)
- WA7BNM (contest calendar)
- Celestrak (satellite TLE data)

### Optional API Key
- Weather Underground (personal weather station data)
- N2YO (satellite tracking beyond ISS)

### Computed Server-Side
- Lunar/EME data (Meeus algorithms)
- VOACAP propagation (Python dvoacap or simplified fallback)
- K-index geomagnetic corrections for VOACAP

## Layout & Customization

- Drag-and-resize widgets (free-float or grid snap)
- 5 grid permutations (2L-2R through 2T-3L-3R-2B)
- Theme swapping with live preview
- Clock style toggle (digital/analog)
- Compact header mode
- Configuration export/import
- Progressive responsive scaling (CSS clamp + container queries)

## Deployment Modes

| Mode | How It Works |
|------|-------------|
| **Hosted** (hamtab.net) | Cloudflare Containers, zero install, auto-deployed on push |
| **Self-hosted** (lanmode) | Native Node.js — install.sh for Linux/Pi (systemd), install.ps1 for Windows (NSSM) |

### Self-Hosted Features (lanmode only)
- Self-signed TLS auto-generation
- Auto-update checker (compares against GitHub Releases)
- In-app update apply (downloads, extracts, restarts)
- CORS locked to RFC 1918 private networks

### Hosted Features (hostedmode only)
- Cloudflare Access authentication
- Workers KV settings sync (planned)
- SEO (sitemap, robots.txt, Open Graph, JSON-LD)

## Help System

Every widget has a **?** button with plain-English help text explaining:
- What the widget shows
- Why it's useful
- How to use it
- Data source and refresh rate

## Security

- Helmet CSP headers
- Rate limiting on all API endpoints
- SSRF prevention via secureFetch (DNS pinning, HTTPS-only, redirect depth limits)
- HTML escaping via esc() for all user/API data
- Input validation on all endpoints (callsigns, coordinates, satellite IDs, etc.)
- Encrypted feedback email (RSA-2048, client-side encryption)
- No cookies, no analytics, no tracking

## What's Planned but Not Shipped

| Feature | Status |
|---------|--------|
| WSJT-X UDP integration | Planned (lanmode) |
| Widget auto-rotation / panel cycling | Planned |
| Docker container for lanmode | Not planned (native install preferred) |
| Workers KV settings sync | Planned (hostedmode) |
| ADIF logging | Planned |
