# HamClock Feature Parity Roadmap

This document tracks HamTab's progress toward full HamClock feature parity, plus the planned "HamClock Compatibility Mode" that replicates the classic visual layout.

**Background:** HamClock's creator passed away, and all existing HamClock installations will stop functioning in June 2026. HamTab aims to preserve this functionality for the amateur radio community.

---

## Feature Comparison Matrix

### Legend
- ✅ Implemented in HamTab
- 🟡 Partially implemented
- ❌ Not yet implemented
- 🔵 HamTab has alternative/different approach
- ➖ Not applicable to web-based app

---

## 1. Map Features

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| **Projections** |
| Mercator | ✅ | ✅ | HamTab uses Leaflet |
| Azimuthal (DE-centered) | ✅ | ❌ | Need custom projection |
| Azimuthal One Globe | ✅ | ❌ | Need custom projection |
| Robinson | ✅ | ❌ | Need custom projection |
| **Map Styles** |
| Countries (political) | ✅ | 🟡 | HamTab uses CARTO Dark |
| Terrain | ✅ | ❌ | Can add tile layer |
| DRAP overlay | ✅ | ❌ | Need NOAA DRAP API |
| MUF-VOACAP | ✅ | ❌ | Need VOACAP integration |
| MUF-RT (ionosonde) | ✅ | ✅ | Via kc2g.com |
| Aurora overlay | ✅ | ❌ | Need NOAA aurora API |
| Weather overlay | ✅ | ❌ | Temperature/isobars/wind |
| Clouds (IR satellite) | ✅ | ❌ | Need NOAA GOES imagery |
| **Grid Overlays** |
| Lat/Long grid | ✅ | ✅ | |
| Maidenhead grid | ✅ | ✅ | Multi-resolution |
| Tropics lines | ✅ | ❌ | Simple ±23.5° lines |
| Azimuthal bearing rings | ✅ | ❌ | Requires azimuthal projection |
| CQ Zones | ✅ | ❌ | Need zone boundary GeoJSON |
| ITU Zones | ✅ | ❌ | Need zone boundary GeoJSON |
| **Map Features** |
| Night/day terminator | ✅ | ✅ | Gray line overlay |
| RSS feed overlay | ✅ | ❌ | Scrolling news ticker |
| City labels | ✅ | ❌ | Population-based display |
| Zoom/pan (Mercator) | ✅ | ✅ | |
| DE marker | ✅ | ✅ | User QTH |
| DX marker | ✅ | ✅ | Selected spot |
| Short path line | ✅ | ✅ | Great circle arc |
| Long path line | ✅ | ❌ | Need opposite direction arc |
| Sun sub-earth position | ✅ | ❌ | Solar noon point |
| Moon sub-earth position | ✅ | ❌ | Lunar sub-point |
| NCDXF beacon markers | ✅ | ❌ | 18 beacon locations |
| DXpedition markers | ✅ | ❌ | From NG3K/DXNews |
| Satellite ground track | ✅ | 🟡 | Have positions, not full orbit line |
| Satellite footprint circles | ✅ | ✅ | Horizon visibility zone |
| Map info table (cursor hover) | ✅ | 🟡 | Have spot detail panel |

---

## 2. DE/DX Location Panels

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| Local time display | ✅ | ✅ | Digital/analog clock |
| UTC time display | ✅ | ✅ | Separate widget |
| Lat/Long/Grid display | ✅ | ✅ | In settings |
| Sun rise/set times | ✅ | ✅ | On local clock widget |
| Rise/set "at" vs "in" toggle | ✅ | ❌ | Show time or countdown |
| Weather at DE | ✅ | ✅ | NWS + Weather Underground |
| Weather at DX | ✅ | ✅ | In spot detail panel |
| Short/Long path toggle | ✅ | ❌ | Only short path currently |
| Bearing to DX | ✅ | ✅ | In spot detail |
| Distance to DX | ✅ | ✅ | In spot detail |
| Timezone management | ✅ | 🟡 | Auto-detect only |
| Click-to-edit location | ✅ | ✅ | Settings modal |

---

## 3. Data Panes / Widgets

### 3.1 Spot Sources

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| DX Cluster (live TCP) | ✅ | 🔵 | HamTab uses HamQTH CSV |
| DX Cluster commands | ✅ | ❌ | Native cluster syntax |
| POTA spots | ✅ | ✅ | api.pota.app |
| SOTA spots | ✅ | ✅ | api2.sota.org.uk |
| WWFF spots | ✅ | ❌ | Need WWFF API |
| Live Spots (WSPR) | ✅ | ❌ | wsprnet.org |
| Live Spots (PSKReporter) | ✅ | ❌ | pskreporter.info |
| Live Spots (RBN) | ✅ | ❌ | reversebeacon.net |
| DXpeditions list | ✅ | ❌ | NG3K + DXNews |
| Contests calendar | ✅ | ❌ | WA7BNM calendar |
| ADIF log display | ✅ | ❌ | File-based QSO log |
| UDP spot input | ✅ | ❌ | WSJT-X, N1MM, etc. |

### 3.2 Solar/Space Weather

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| SDO images (multi-wavelength) | ✅ | ✅ | 4 wavelengths, animated |
| Sunspot number + history | ✅ | 🟡 | Have number, not 30-day graph |
| Solar flux + history | ✅ | 🟡 | Have SFI, not 30-day graph |
| X-Ray flux + history | ✅ | 🟡 | Have class, not 24h graph |
| DRAP plot (24h history) | ✅ | ❌ | Max attenuated frequency |
| Bz/Bt (IMF) + history | ✅ | 🟡 | Have value, not graph |
| Planetary Kp + 7-day history | ✅ | 🟡 | Have Kp, not graph |
| Solar wind + history | ✅ | 🟡 | Have value, not graph |
| Aurora % + history | ✅ | 🟡 | Have value, not graph |
| DST (disturbance storm time) | ✅ | ❌ | Kyoto DST index |
| NOAA Space Weather Scales | ✅ | ❌ | R/S/G 3-day forecast |
| HF band conditions | ✅ | ✅ | Good/Fair/Poor |
| VHF phenomena | ✅ | ✅ | Sporadic E, Tropo, Aurora |
| Grayline planning tool | ✅ | ❌ | DE/DX twilight overlap |

### 3.3 Lunar/EME

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| Moon phase image | ✅ | ✅ | NASA SVS imagery |
| Moon Az/El from DE | ✅ | ❌ | Need calculation |
| Moon rise/set times | ✅ | ❌ | Need calculation |
| Moon radial velocity | ✅ | ❌ | Doppler relevance |
| EME planning tool | ✅ | 🟡 | Have path loss, not DE/DX tool |
| Moon rotation movie | ✅ | ❌ | NASA animation link |
| Path loss indicator | ✅ | ✅ | Color-coded dB value |

### 3.4 Satellite Tracking

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| Satellite selection | ✅ | ✅ | Pre-configured + API |
| Up to 2 simultaneous sats | ✅ | ✅ | HamTab supports more |
| Real-time position | ✅ | ✅ | Az/El/Lat/Lon |
| Pass predictions | ✅ | ✅ | Rise/Max/Set times |
| Sky plot visualization | ✅ | ❌ | Pass on polar plot |
| Ground track orbit line | ✅ | 🟡 | Footprint only |
| TLE age display | ✅ | ❌ | Element freshness |
| User TLE file support | ✅ | ❌ | ~/.hamclock/user-esats.txt |
| Satellite planning tool | ✅ | ❌ | DE/DX mutual visibility |
| Track on map toggle | ✅ | ✅ | Show/hide option |

### 3.5 Propagation

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| VOACAP reliability graph | ✅ | ❌ | 24h × band grid |
| VOACAP map overlay | ✅ | ❌ | Path reliability from DE |
| TOA (take-off angle) map | ✅ | ❌ | Best angle from DE |
| MUF-RT map (ionosonde) | ✅ | ✅ | kc2g.com GeoJSON |
| foF2 map | ✅ | ✅ | kc2g.com GeoJSON |

### 3.6 Hardware Integration

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| Rotator control (rotctld) | ✅ | ❌ | hamlib integration |
| Rig control (rigctld/flrig) | ✅ | ❌ | Frequency setting |
| KX3 serial control | ✅ | ➖ | RPi GPIO only |
| BME280 sensor | ✅ | ➖ | Hardware sensor |
| Light sensor (LTR329) | ✅ | ➖ | Auto-dimming |
| GPIO switches/LEDs | ✅ | ➖ | RPi hardware |
| NMEA GPS input | ✅ | ❌ | Serial GPS |
| gpsd support | ✅ | ❌ | Network GPS daemon |

### 3.7 Other Panes

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| NCDXF beacons display | ✅ | ❌ | Frequency rotation |
| DE/DX weather | ✅ | ✅ | Different presentation |
| Countdown timer | ✅ | ❌ | With LED indicator |
| Display brightness control | ✅ | ➖ | Hardware dependent |
| Display on/off timer | ✅ | ➖ | Hardware dependent |
| Stopwatch/timer | ✅ | ❌ | With alarms |
| Big Clock mode | ✅ | ❌ | Full-screen clock |

---

## 4. Time Features

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| UTC display (large) | ✅ | ✅ | UTC clock widget |
| Time shift (planning) | ✅ | ❌ | View future/past |
| Stopwatch | ✅ | ❌ | With lap function |
| Countdown timer | ✅ | ❌ | Configurable duration |
| Daily alarm | ✅ | ❌ | Repeating |
| One-time alarm | ✅ | ❌ | Single occurrence |
| Big Clock mode | ✅ | ❌ | Dedicated display |
| NTP configuration | ✅ | ➖ | Browser uses system time |

---

## 5. Watch Lists & Filtering

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| Band filter | ✅ | ✅ | Dynamic buttons |
| Mode filter | ✅ | ✅ | FT8/SSB/CW/etc. |
| Prefix filter | ✅ | ❌ | Call prefix matching |
| Frequency range filter | ✅ | ❌ | Min-max MHz |
| ADIF-based filters | ✅ | ❌ | NADXCC/NAPREF/etc. |
| Watch list Red/Only/Not modes | ✅ | ❌ | Highlight vs filter |
| Country filter | ✅ | ✅ | POTA reference prefix |
| State filter | ✅ | ✅ | US SOTA locations |
| Grid filter | ✅ | ✅ | 4-char prefix |
| Continent filter | ✅ | ✅ | DXC data |
| License privilege filter | ✅ | ✅ | FCC Part 97 |

---

## 6. Setup & Configuration

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| Callsign entry | ✅ | ✅ | |
| DE location (lat/long/grid) | ✅ | ✅ | |
| IP geolocation | ✅ | ✅ | Browser geolocation |
| Map center longitude | ✅ | 🟡 | Have center modes |
| Units (Metric/Imperial) | ✅ | ❌ | Currently miles only |
| Bearings (True/Magnetic) | ✅ | ❌ | Currently true only |
| Date format | ✅ | ❌ | 3 format options |
| Week start day | ✅ | ➖ | No calendar view |
| Scroll direction | ✅ | ❌ | Top-down vs bottom-up |
| Color customization | ✅ | ❌ | Path/band colors |
| Pane rotation period | ✅ | ❌ | Auto-cycle panes |
| Map rotation period | ✅ | ❌ | Auto-cycle styles |
| Demo mode | ✅ | ❌ | Auto-changing display |
| Configuration save/load | ✅ | ✅ | localStorage |
| Multiple config profiles | ✅ | ❌ | A/B save slots |

---

## 7. External Integrations

| Feature | HamClock | HamTab | Notes |
|---------|----------|--------|-------|
| DX Cluster TCP | ✅ | ❌ | Spider/AR/CC clusters |
| UDP spots (WSJT-X/N1MM) | ✅ | ❌ | Local network |
| hamlib rotctld | ✅ | ❌ | Rotator control |
| hamlib rigctld | ✅ | ❌ | Radio control |
| flrig | ✅ | ❌ | Radio control |
| ADIF file monitoring | ✅ | ❌ | QSO log |
| Callsign bio lookup | ✅ | 🟡 | Have QRZ link |
| NTP server config | ✅ | ➖ | Browser uses system |
| gpsd daemon | ✅ | ❌ | Network GPS |

---

## 8. HamClock Compatibility Mode

This special mode will replicate HamClock's visual layout and behavior for users who want the familiar experience.

### Layout Requirements

HamClock uses a fixed 800×480 or 1600×960 pixel layout with:
- **Top left:** Call sign box with title
- **Top center:** Large UTC time + date
- **Top right:** Narrow rotating pane (NCDXF/brightness/etc.)
- **Middle left:** DE panel (location, rise/set)
- **Middle center-left:** DX panel (or satellite pass)
- **Main area:** Map (lower 60% of screen)
- **Bottom overlay:** RSS ticker on map

### Visual Elements to Match

| Element | Description |
|---------|-------------|
| Font | Monospace/digital style |
| Colors | Black background, colored text (orange/cyan/white/red) |
| Pane borders | Thin colored lines |
| Map style | Dark with colored overlays |
| Path lines | Dashed great circles with arrow heads |
| Markers | Simple colored symbols (●■⊕) |

### Implementation Plan

1. **Create HamClock theme CSS**
   - Match color palette exactly
   - Monospace font throughout
   - Fixed aspect ratio container

2. **Create HamClock layout preset**
   - Widget positions matching original
   - Lock widgets from drag/resize
   - Hide non-HamClock widgets

3. **Add missing visual elements**
   - NCDXF beacon rotating display
   - RSS ticker overlay
   - Info table hover popup
   - Satellite sky plot in DX pane

4. **Match interaction patterns**
   - Click behaviors (set DE, set DX, etc.)
   - Ctrl-click/middle-click shortcuts
   - Pane rotation on timer

---

## Implementation Priority

### Phase 1: Core Feature Parity (High Priority)
1. ❌ Long path line display
2. ❌ WWFF spot integration
3. ❌ VOACAP propagation predictions
4. ❌ DXpeditions list/map
5. ❌ Contests calendar
6. ❌ Solar/space weather history graphs
7. ❌ NCDXF beacon display
8. ❌ Moon Az/El/rise/set calculations
9. ❌ Stopwatch/countdown timer
10. ❌ Units toggle (metric/imperial)

### Phase 2: Advanced Features (Medium Priority)
1. ❌ Live DX Cluster TCP connection
2. ❌ PSKReporter/WSPR/RBN integration
3. ❌ ADIF log display
4. ❌ Watch list system (Red/Only/Not)
5. ❌ Satellite sky plot
6. ❌ EME planning tool (full)
7. ❌ Grayline planning tool
8. ❌ CQ/ITU zone overlays
9. ❌ Aurora map overlay
10. ❌ DRAP map overlay

### Phase 3: Hardware Integration (Lower Priority for Web)
1. ❌ hamlib rotctld integration
2. ❌ hamlib rigctld integration
3. ❌ UDP spot receiver
4. ❌ gpsd integration

### Phase 4: HamClock Compatibility Mode
1. ❌ Fixed-layout theme
2. ❌ Color palette matching
3. ❌ Azimuthal map projection
4. ❌ RSS ticker overlay
5. ❌ Info table popup
6. ❌ Click behavior matching

---

## Data Source Mapping

| HamClock Source | HamTab Equivalent | Status |
|-----------------|-------------------|--------|
| clearskyinstitute.com | Self-hosted | ❌ Need alternative |
| NOAA SWPC | hamqsl.com | ✅ Working |
| Celestrak (TLE) | N2YO API | ✅ Working |
| NASA SDO | sdo.gsfc.nasa.gov | ✅ Working |
| NASA SVS (Moon) | svs.gsfc.nasa.gov | ✅ Working |
| OpenWeatherMap | NWS + Weather Underground | ✅ Working |
| GIRO (ionosonde) | kc2g.com | ✅ Working |
| AD1C cty file | callook.info | ✅ Working |
| WA7BNM contests | Need API/scrape | ❌ |
| NG3K expeditions | Need API/scrape | ❌ |
| DXNews expeditions | Need API/scrape | ❌ |
| DX Spider/AR/CC | HamQTH CSV | 🔵 Different approach |
| wspr.live | Need API | ❌ |
| PSKReporter | Need API | ❌ |
| RBN | Need API | ❌ |
| WWFF | Need API | ❌ |
| Kyoto DST | Need API | ❌ |

---

## Notes

- HamTab is web-based, so some hardware features (GPIO, I2C sensors, display brightness) are not applicable
- HamTab uses a flexible widget layout; HamClock uses fixed pixel positions
- Some HamClock features depend on their server (clearskyinstitute.com) which will shut down
- Priority should be given to features that use publicly available APIs
- Consider community API contributions for missing data sources

---

*Last updated: 2026-02-03*
