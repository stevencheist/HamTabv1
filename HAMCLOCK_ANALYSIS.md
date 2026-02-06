# HamClock (ESPHamClock) Source Code Analysis

**Source:** ESPHamClock v4.22 by Elwood Downey (WB0OEW)
**License:** MIT (code only — `clearskyinstitute.com` backend is proprietary)
**Analyzed:** 2026-02-05 from `ESPHamClock.zip`
**Purpose:** Guide HamTabV1 development — authentic HamClock theme, widget improvements, feature parity

---

## Architecture Overview

- ~120 C++ files, procedural style, originally for ESP8266 + RA8875 TFT display
- Ported to UNIX/Linux/RPi via Arduino compatibility layer
- Monolithic header (`HamClock.h`, ~3,670 lines) declares all globals
- 4 fixed resolutions: 800x480 (1x), 1600x960 (2x), 2400x1440 (3x), 3200x1920 (4x)
- Map area: 660x330 pixels at 1x scale
- All data fetched from single backend: `clearskyinstitute.com:80`
- EEPROM-emulated NV storage (241 named entries)
- 4 display panes with bitmask-based content rotation

---

## Layout & Pane System

### Screen Layout (800x480 at 1x)

```
+------------------+--------+--------+--------+
|   DE Info (left)  | PANE_1 | PANE_2 | PANE_3 |  <- Top row (148px high)
+------------------+--------+--------+--------+
| PANE_0 |                                      |
| (left) |           MAP (660x330)              |  <- Map area
|        |                                      |
+--------+--------------------------------------+
|              RSS Banner (full width)           |  <- Bottom
+-----------------------------------------------+
```

- **PANE_0:** Position (0, 148) — Left side, below DE info, overlaps map left edge
- **PANE_1:** Position (235, 0) — Top row, second
- **PANE_2:** Position (405, 0) — Top row, third
- **PANE_3:** Position (575, 0) — Top row, fourth
- **DE Info:** Top-left area showing callsign, grid, lat/lng, sunrise/sunset
- **DX Info:** Shown in PANE_0 area or map overlay
- **Map:** Lower-right, 660x330 pixels
- **RSS:** Scrolling banner at bottom of map

### Pane Content Options (27 choices)

BC (VOACAP), DEWX, DXCLUSTER, DXWX, FLUX (Solar Flux), KP, MOON, NOAASPW, SSN, XRAY, GIMBAL, TEMPERATURE, PRESSURE, HUMIDITY, DEWPOINT, SDO, SOLWIND, DRAP, COUNTDOWN, CONTESTS, PSK, BZBT, ONTA (POTA/SOTA), ADIF, AURORA, DXPEDS, DST

### Pane Rotation

- Each pane has a rotation bitmask (`uint32_t`) — bit N = PlotChoice N
- Auto-cycles through assigned choices on timer
- "Hold" freezes rotation on current choice
- Border flashes white/gray when rotation is imminent
- Same choice cannot appear in multiple panes simultaneously

---

## Space Weather System

### Data Sources (all via `clearskyinstitute.com`)

| Data | Path | Refresh | Array Size | Coverage |
|------|------|---------|-----------|----------|
| Bz/Bt | `/Bz/Bz.txt` | 180s | 150 pts | 25 hrs @ 10 min |
| Solar Wind | `/solar-wind/swind-24hr.txt` | 340s | 144 pts | 24 hrs @ 10 min |
| SSN | `/ssn/ssn-31.txt` | 2400s | 31 pts | 31 days |
| Solar Flux | `/solar-flux/solarflux-99.txt` | 2300s | 99 pts | 33 days (3/day) |
| DRAP | `/drap/stats.txt` | ~305s | 144 pts | 24 hrs @ 10 min |
| X-Ray | `/xray/xray.txt` | 610s | 150 pts | 25 hrs @ 10 min |
| Kp | `/geomag/kindex.txt` | 2500s | 72 pts | 9 days (8/day) |
| NOAA R/S/G | `/NOAASpaceWX/noaaswx.txt` | 2400s | 3x4 table | Now + 3 days |
| Aurora | `/aurora/aurora.txt` | 1700s | 48 pts | 24 hrs @ 30 min |
| DST | `/dst/dst.txt` | 1900s | 24 pts | 24 hours |

### Space Weather Ranking Algorithm

Each parameter scored via polynomial: `rank = round(a * value^2 + b * value + c)`
Coefficients downloaded from `/NOAASpaceWX/rank2_coeffs.txt` (server-tunable).
Parameters auto-sorted by impact score — highest first.

### Kp Bar Color Scheme

| Kp Range | Color | RGB |
|----------|-------|-----|
| < 4.5 | Green | (0x91, 0xD0, 0x51) |
| < 5.5 | Yellow | (0xF6, 0xEB, 0x16) |
| < 6.5 | Orange | (0xFE, 0xC8, 0x04) |
| < 7.5 | Dark Orange | (0xFF, 0x96, 0x02) |
| < 8.5 | Red | (0xFF, 0x00, 0x00) |
| >= 8.5 | Dark Red | (0xC7, 0x01, 0x00) |

### X-Ray Plot

Y-axis uses log10(flux) with GOES classification letters: A, B, C, M, X

### VOACAP Band Conditions Heat Map

24 columns (hours starting at current DE hour) x 8 rows (bands 80m-10m):
- reliability < 10%: Black
- 10-33%: Red (hue=0)
- 33-66%: Yellow (hue=43)
- 66-100%: Green (hue=85)

### NOAA R/S/G Scales Display

Table: R (Radio), S (Solar), G (Geomagnetic) — each with Now, D+1, D+2, D+3
Color: 0=green, 1-3=yellow, 4-5=red

---

## Map System

### Projections (4)

1. **Mercator** — Standard equirectangular
2. **Azimuthal (dual)** — Two hemispheres centered on DE
3. **Azimuthal (single)** — Fisheye centered on DE (`AZIM1_FISHEYE=2.0`, `AZIM1_ZOOM=1.1`)
4. **Robinson** — Pseudo-cylindrical, polynomial fit (13 coefficients)

### Grid Overlays (7)

None, Tropics (±23.5°), Lat/Long (15°), Maidenhead (10°x20°), Azimuthal (from DE), CQ Zones, ITU Zones

### Map Styles (11)

Countries, Terrain, DRAP, MUF-VOACAP, MUF-RT, Aurora, Weather, TOA, REL, Clouds, User

### Grayline (Day/Night Terminator)

Core formula:
```
cos_t = sin(sun_dec) * sin(lat) + cos(sun_dec) * cos(lat) * cos(sun_lng - lng)
```

Three-zone shading:
- `cos_t > 0`: Full daylight
- `GRAYLINE_COS < cos_t <= 0`: Twilight (blended with `pow(cos_t/GRAYLINE_COS, GRAYLINE_POW)`)
- `cos_t <= GRAYLINE_COS`: Full night

Constants: `GRAYLINE_COS = -0.208` (cos(102°) = 12° past sunset = nautical twilight), `GRAYLINE_POW = 0.75`

Subsolar point: `lat = sun_declination`, `lng = -Greenwich_Hour_Angle`

### Spot Markers on Map

- **TX end:** Colored circle (expanding wave metaphor)
- **RX end:** Colored square (receiving array metaphor)
- Colors per band
- Paths: great circle arcs via `solveSphere`
- Dithering: ±2px randomization for overlapping marker separation

---

## Astronomy (from XEphem's libastro)

### Sun Position

Low-precision solar theory with Kepler equation (Newton-Raphson). Returns RA, Dec, GHA, distance (AU).

### Moon Position

Extensive trigonometric series (~dozen terms) based on 6 lunar orbital periods. Returns RA, Dec, GHA, distance (km), phase (elongation).

Key periods: sidereal month (27.32d), tropical year (365.26d), anomalistic month (27.55d), synodic month (29.53d)

### Rise/Set Calculation

Iterative (up to 10 loops, 30s convergence):
```
cos(w) = (sin(a) - sin(phi)*sin(dec)) / (cos(phi)*cos(dec))
```
Handles polar cases (never-rises, never-sets).

### Moon Phase Rendering

Pixel-by-pixel on circular disk:
1. Compute circle half-width: `Ry = sqrt(r^2 - y^2)`
2. Angle from right limb: `a = acos(dx / Ry)`
3. Shadow test against elongation angle
4. Shadow pixels darkened to 1/3 brightness
5. Southern hemisphere: flip both axes

### Annual Grayline Chart

365-day plot of sunrise/sunset times for both DE and DX — reveals gray-line propagation windows where curves overlap.

---

## Satellite Tracking (Plan13)

### Algorithm

Plan13 by James Miller G3RUH — simplified orbital mechanics for LEO satellites.

Key constants (2014 epoch):
- `RE = 6378.137 km`, `FL = 1/298.257224`, `GM = 3.986E5 km^3/s^2`
- `J2 = 1.08263E-3` (oblateness perturbation)

Core flow: Parse TLE → derive orbital elements → propagate mean anomaly → solve Kepler (Newton-Raphson) → compute position/velocity → transform to topocentric

### TLE Sources

1. User local file (`user-esats.txt`)
2. Backend server (`/esats/esats.txt`, cache 2.8 hours)

### Pass Prediction

Two-phase: coarse forward scan (90s steps) → fine backward scan (2s steps). Searches up to 2 days ahead.

### Mutual Visibility Tool (sattool)

24-hour dual-trace elevation plot for DE and DX. Finds "both up" windows at 30s resolution. Critical for satellite QSO planning.

### Doppler Calculation

`doppler_kHz = -range_rate_m_s * frequency_kHz / 3e8`
Shown at 144, 440, 1296, 10368 MHz.

### Footprint

Viewing circles at 0°, 30°, 60° elevation using `viewingRadius(alt) = acos(RE/h * cos(alt)) - alt`

---

## Spots & DX System

### DX Cluster (`dxcluster.cpp`)

- **Direct TCP connection** to Spider/AR/VE7CC cluster (not HTTP API)
- Also accepts WSJT-X UDP, N1MM XML, ADIF UDP
- **Band-level dedup:** same call + same band = duplicate
- Age menu: 10, 20, 40, 60 minutes
- Heartbeat: 60s keepalive
- Lost connection rate limiting: max 10/hour
- Mode inference from frequency (narrowest sub-band match)

### PSK Reporter / WSPR / RBN (`pskreporter.cpp`)

URLs (via backend):
- `/fetchPSKReporter.pl?{of|by}{call|grid}=VALUE&maxage=SECONDS`
- `/fetchWSPR.pl?...` (same pattern)
- `/fetchRBN.pl?...` (same pattern)

Response CSV: `posting_time,tx_grid,tx_call,rx_grid,rx_call,mode,Hz,snr`

Features: max-distance-per-band tracking, "of DE" vs "by DE", band filter bitmask, grid-based queries

### POTA/SOTA (`ontheair.cpp`)

URL: `/ONTA/onta.txt`
CSV: `CALL,Hz,unix_time,MODE,GRID,lat,lng,REFERENCE_ID,PROGRAM`
Organization rotation (auto-cycle POTA→SOTA→etc.) or merge mode with `+`
Hash-based change detection (djb2) to avoid unnecessary redraws

### Contests (`contests.cpp`)

URL: `/contests/contests311.txt`
Format: pairs of lines — `unix_start unix_end Title` + `URL`
Active contests highlighted green. Alarms for start times.

### DXpeditions (`dxpeds.cpp`)

URL: `/dxpeds/dxpeditions.txt`
Cross-references with DX cluster (red = spotted). ADIF worked-before tracking.
Per-expedition: hide, alarm, set DX, open webpage.

### Watch List (`watchlist.cpp`)

Compiled filter language: comma-separated groups (OR'd), space-separated conditions (AND'd):
- Prefixes: `VK`, `JA/`, `W6`
- Bands: `20-10m`, `20CW`, `14.0-14.1MHz`
- ADIF: `NADXCC` (not worked DXCC), `NAPref`, `NABand`, `NAGrid`
- States: Off / Flag (highlight) / Only (include) / Not (exclude)

### NCDXF Beacons (`ncdxf.cpp`)

18 hardcoded beacons, 5 frequencies (14.10, 18.11, 21.15, 24.93, 28.20 MHz).
Schedule: `beacon_index = (seconds_past_hour / 10 + freq_offset) % 18`

### ADIF Log (`adif.cpp`)

Local file monitoring with modification time detection.
Cross-referenced with DXpeditions and watch lists.
Contact paths drawn on map.

---

## SDO Solar Images

### 7 Image Types

| Type | Wavelength | Shows |
|------|-----------|-------|
| Composite | 211+193+171 A | Multi-temperature corona |
| Magnetogram | HMI-B | Magnetic field polarity |
| 6173A | HMI IC | Photosphere (sunspots) |
| 131A | 131 A | Flare plasma (10M K) |
| 193A | 193 A | Corona + coronal holes (1.2M K) |
| 211A | 211 A | Active regions (2M K) |
| 304A | 304 A | Chromosphere + prominences (50K K) |

Update: 30 minutes. Auto-rotation through all types. Movie links to NASA mp4s.

---

## Weather

### Sources

- Exact: `/wx.pl?is_de=X&lat=X&lng=X` (55 min cache)
- Grid: `/worldwx/wx.txt` (45 min cache) — fast hover-over weather anywhere

### Fields

Temperature (C/F), humidity, dew point, pressure (hPa/inHg) with trend arrow, wind speed/direction, conditions, city, attribution

---

## Web Server REST API (50+ endpoints)

### GET (data retrieval)

`get_capture.bmp`, `get_config.txt`, `get_contests.txt`, `get_de.txt`, `get_dx.txt`, `get_dxpeds.txt`, `get_dxspots.txt`, `get_livespots.txt`, `get_livestats.txt`, `get_ontheair.txt`, `get_satellite.txt`, `get_satellites.txt`, `get_spacewx.txt`, `get_sys.txt`, `get_time.txt`, `get_voacap.txt`

### SET (commands)

`set_adif`, `set_alarm`, `set_auxtime`, `set_bmp`, `set_cluster`, `set_defmt`, `set_displayOnOff`, `set_livespots`, `set_mapcenter`, `set_mapcolor`, `set_mapview`, `set_newde`, `set_newdx`, `set_pane`, `set_panzoom`, `set_rotator`, `set_rss`, `set_satname`, `set_sattle`, `set_stopwatch`, `set_time`, `set_title`, `set_touch`, `set_voacap`

---

## Callsign Lookup

Browser-based — opens URL in external browser:
- qrz.com: `https://www.qrz.com/db/<CALL>`
- hamcall.net: `https://hamcall.net/call?callsign=<CALL>`
- cqqrz.com: `https://www.qrzcq.com/call/<CALL>`

Compound callsign splitting handles `VP2E/W1AW` format.

---

## Key Algorithms Worth Porting to JavaScript

1. **Grayline** — `cos_t` formula + 3-zone shading (GRAYLINE_COS=-0.208, POW=0.75)
2. **Plan13** — ~500 lines, pure math, no dependencies — client-side satellite prediction
3. **solveSphere** — Spherical triangle solver for bearing/distance/projection
4. **Sun/Moon ephemeris** — From XEphem, iterative rise/set with polar case handling
5. **Moon phase rendering** — `acos(dx/Ry)` terminator on circular disk
6. **Narrowest sub-band mode detection** — Frequency → mode lookup
7. **"Nice numbers" tick marks** — Heckbert algorithm for chart axes
8. **NCDXF beacon schedule** — Pure time-based computation, no API needed
9. **Watch list compiler** — Prefix + band + ADIF filter language
10. **Doppler calculation** — `doppler = -range_rate * freq / c`

---

## Feature Gap Analysis: HamClock vs HamTabV1

### HamClock Has, HamTabV1 Doesn't

| Feature | Priority | Effort |
|---------|----------|--------|
| Client-side satellite prediction (Plan13) | HIGH | Medium |
| Watch list / filter system | HIGH | Medium |
| WSPR integration | HIGH | Low |
| RBN integration | HIGH | Low |
| Clickable callsign lookups | HIGH | Low |
| ADIF log integration | HIGH | Medium |
| Satellite pass prediction | HIGH | Medium |
| Additional SDO types (Composite, Magnetogram, 131A, 211A) | MEDIUM | Low |
| Annual grayline chart widget | MEDIUM | Medium |
| Space weather auto-ranking | MEDIUM | Low |
| Band-level spot dedup | MEDIUM | Low |
| Organization rotation (POTA/SOTA) | MEDIUM | Low |
| Satellite mutual visibility tool | MEDIUM | High |
| World weather grid (hover) | MEDIUM | Medium |
| DRAP + DST indices | MEDIUM | Low |
| Satellite footprint visualization | MEDIUM | Medium |
| Sky dome / polar pass plot | LOW | Medium |
| Antenna rotator control | LOW | Medium |
| ON THE AIR indicator | LOW | Low |

### HamTabV1 Does Better Than HamClock

- Web-first architecture (no install, any browser)
- Responsive layout vs fixed pixel coordinates
- Modular ES modules vs monolithic header
- Server-side caching/proxying vs single-backend dependency
- Leaflet maps vs pixel-by-pixel rendering
- Multi-source resilience vs `clearskyinstitute.com` dependency
- Theme system with multiple presets
- Drag-and-drop widget arrangement
- Mobile-responsive layout

---

## Backend URL Reference (clearskyinstitute.com)

NOTE: These are proprietary backend URLs. HamTabV1 must find public equivalents.

### Space Weather → NOAA/SWPC direct
### WSPR → wsprnet.org API
### RBN → reversebeacon.net API
### TLEs → CelesTrak (free, no API key)
### Contest calendar → contestcalendar.com
### SDO images → sdo.gsfc.nasa.gov direct
### Weather → Weather Underground (existing) or Open-Meteo (free)

---

## HamClock Theme Replication Notes

To authentically replicate the HamClock look and feel in HamTabV1:

### Color Palette (from HamClock source)

- Background: Black (#000000)
- Primary text: White
- DE color: Green
- DX color: Red/Orange
- Map: Custom pixel-rendered (dark ocean, country-colored land)
- Pane borders: Subtle gray
- Chart colors: Band-specific (each ham band has an assigned color)

### Typography

- Germano Bold/Regular fonts (custom) — closest web equivalent: system sans-serif
- Courier Prime Sans (monospace for data)

### Layout Characteristics

- Fixed 4-pane system (not draggable)
- Information density: maximum data per pixel
- Charts embedded in panes, not separate widgets
- Large current-value overlay on charts
- Band-colored frequency backgrounds
- Compact data tables (abbreviations, no whitespace)
- RSS ticker at bottom of map

### Interaction Model

- Single-tap cycling (tap to rotate content)
- Touch zones within panes (left/center/right do different things)
- Long-press for menus
- No scrollbars (pane rotation instead)
