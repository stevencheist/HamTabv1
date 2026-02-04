# HamTab Feature Roadmap

Comprehensive roadmap tracking HamTab's feature development and implementation priorities.

**Background:** HamClock's creator passed away, and all existing HamClock installations will stop functioning in June 2026. HamTab aims to preserve this functionality for the amateur radio community while modernizing the platform as a web-based dashboard.

**Last updated:** 2026-02-04

---

## Legend
- ✅ Implemented
- 🟡 Partially implemented
- ❌ Not yet implemented
- 🔵 Alternative approach used
- ➖ Not applicable to web-based app

---

## 1. Map Features & Projections

| Feature | Status | Notes |
|---------|--------|-------|
| **Projections** |
| Mercator | ✅ | Leaflet default |
| Azimuthal (DE-centered) | ❌ | Custom projection needed |
| Azimuthal One Globe | ❌ | Custom projection needed |
| Robinson | ❌ | Custom projection needed |
| **Map Styles** |
| Political boundaries | 🟡 | CARTO Dark tiles |
| Terrain | ❌ | Additional tile layer |
| DRAP overlay | ❌ | NOAA DRAP API |
| MUF-VOACAP | ❌ | VOACAP integration ([#91](https://github.com/stevencheist/HamTabv1/issues/91)) |
| MUF-RT (ionosonde) | ✅ | kc2g.com GeoJSON |
| foF2 map | ✅ | kc2g.com GeoJSON |
| Aurora overlay | ❌ | NOAA OVATION model |
| Weather overlay | ❌ | Temperature/isobars/wind |
| Clouds (IR satellite) | ❌ | NOAA GOES imagery |
| **Grid Overlays** |
| Lat/Long grid | ✅ | Toggleable |
| Maidenhead grid | ✅ | Multi-resolution |
| Timezone grid | ✅ | Timezone boundaries |
| Tropics lines | ❌ | ±23.5° latitude lines |
| Azimuthal bearing rings | ❌ | Requires azimuthal projection |
| CQ Zones | ❌ | Zone boundary GeoJSON |
| ITU Zones | ❌ | Zone boundary GeoJSON |
| **Map Features** |
| Interactive world map | ✅ | Leaflet-based |
| Night/day terminator | ✅ | Gray line overlay |
| Great-circle paths | ✅ | Short path only |
| Long path line | ❌ | Opposite direction arc |
| Zoom/pan | ✅ | Full Leaflet controls |
| DE marker | ✅ | User QTH |
| DX marker | ✅ | Selected spot |
| Sun sub-earth position | ❌ | Solar noon point |
| Moon sub-earth position | ❌ | Lunar sub-point |
| NCDXF beacon markers | ❌ | 18 beacon locations |
| DXpedition markers | ❌ | NG3K/DXNews integration |
| Satellite ground track | 🟡 | Footprint only, not full orbit |
| Satellite footprint circles | ✅ | Horizon visibility zone |
| Map info table (cursor hover) | 🟡 | Spot detail panel |
| RSS feed overlay | ❌ | Scrolling news ticker |
| City labels | ❌ | Population-based display |
| Earthquake markers | ❌ | USGS data |
| Weather radar overlay | ❌ | Precipitation layer |
| Symbol legend | ❌ | Band colors, sun/moon icons |

---

## 2. Spot Sources & Integration

| Feature | Status | Notes |
|---------|--------|-------|
| **POTA/SOTA** |
| POTA spots | ✅ | api.pota.app |
| SOTA spots | ✅ | api2.sota.org.uk |
| WWFF spots | ❌ | WWFF API integration |
| **DX Cluster** |
| DX Cluster (live TCP) | 🔵 | HamQTH CSV (HTTP fallback) |
| DX Cluster commands | ❌ | Native cluster syntax |
| DXWatch fallback | ❌ | Alternative spot source |
| Multi-source fallback | ❌ | DX Spider → HamQTH → DXWatch |
| Telnet proxy microservice | ❌ | Persistent connections |
| **Digital Modes** |
| PSKReporter | ✅ | HTTP API integration |
| PSKReporter MQTT | ❌ | Real-time WebSocket |
| WSPR | ❌ | wsprnet.org API |
| RBN (Reverse Beacon) | ❌ | reversebeacon.net API |
| WSJT-X UDP listener | ❌ | Port 2237, local network |
| WSJT-X cloud relay | ❌ | Bridge local UDP to cloud |
| UDP spot input (N1MM) | ❌ | Local network integration |
| **Other Sources** |
| DXpeditions list | ❌ | NG3K + DXNews |
| Contests calendar | ❌ | WA7BNM calendar |
| ADIF log display | ❌ | File-based QSO log |
| DX news ticker | ❌ | DXNews.com scraping |
| **Spot Features** |
| "My Spots" highlighting | ❌ | When user callsign spotted |
| Spot retention window | ❌ | 5-30 minute configurable |
| Click row to select | ✅ | Map and detail integration |
| Hover-to-highlight | ✅ | Table and map sync |

---

## 3. Filtering & Watch Lists

| Feature | Status | Notes |
|---------|--------|-------|
| Band filter (multi-select) | ✅ | Dynamic buttons |
| Mode filter (multi-select) | ✅ | FT8/SSB/CW/etc. |
| Distance filter | ✅ | Miles/km from QTH |
| Age filter | ✅ | Minutes since spotted |
| Country filter | ✅ | POTA/DXC integration |
| State filter | ✅ | US locations |
| Grid filter | ✅ | 4-char Maidenhead prefix |
| Continent filter | ✅ | DXC data |
| License privilege filter | ✅ | FCC Part 97 bands |
| Filter presets | ✅ | Save/load combinations |
| Prefix filter | ❌ | Call prefix matching |
| Frequency range filter | ❌ | Min-max MHz |
| ADIF-based filters | ❌ | NADXCC/NAPREF/etc. |
| Watch list (Red/Only/Not) | ❌ | Highlight vs filter modes |

---

## 4. Solar & Space Weather

| Feature | Status | Notes |
|---------|--------|-------|
| **Solar Data** |
| Solar Flux Index (SFI) | ✅ | NOAA/HamQSL |
| Sunspot number | ✅ | Current value |
| Sunspot 30-day history | ❌ | Historical graph |
| X-Ray flux | ✅ | GOES satellite |
| X-Ray 24h history | ❌ | Time-series graph |
| SDO images (multi-wavelength) | ✅ | 4 wavelengths, animated |
| **Geomagnetic** |
| K-Index | ✅ | Current + forecast |
| K-Index 7-day history | ❌ | Historical graph |
| A-Index | ✅ | Current value |
| Solar wind speed | ✅ | Current value |
| Solar wind history | ❌ | Time-series graph |
| Bz/Bt (IMF) | ✅ | Current value |
| Bz/Bt history | ❌ | Time-series graph |
| DST index | ❌ | Kyoto DST |
| **Aurora & Propagation** |
| Aurora percentage | ✅ | Current value |
| Aurora history | ❌ | Time-series graph |
| Aurora latitude | ✅ | Current value |
| NOAA Space Weather Scales | ❌ | R/S/G 3-day forecast |
| DRAP plot | ❌ | 24h max attenuated frequency |
| Proton flux | ✅ | Current value |
| Electron flux | ✅ | Current value |
| Helium line | ✅ | He 10830Å |
| Geomag field | ✅ | Current value |
| Signal noise | ✅ | Current value |
| **HF Conditions** |
| Band conditions | ✅ | Good/Fair/Poor per band |
| Day/night toggle | ✅ | 12-hour forecast |
| Per-band reliability | ✅ | Color-coded grid |
| VHF phenomena | ✅ | Sporadic E, Tropo, Aurora |
| Grayline planning tool | ❌ | DE/DX twilight overlap |

---

## 5. Propagation Modeling

| Feature | Status | Notes |
|---------|--------|-------|
| MUF-RT map (ionosonde) | ✅ | kc2g.com real-time |
| foF2 map | ✅ | kc2g.com critical frequency |
| VOACAP reliability graph | ❌ | 24h × band grid ([#91](https://github.com/stevencheist/HamTabv1/issues/91)) |
| VOACAP map overlay | ❌ | Path reliability from DE ([#91](https://github.com/stevencheist/HamTabv1/issues/91)) |
| TOA (take-off angle) map | ❌ | Best angle from DE |
| ITU-R P.533 integration | ❌ | Production-grade modeling |

---

## 6. Lunar & EME

| Feature | Status | Notes |
|---------|--------|-------|
| Moon phase image | ✅ | NASA SVS imagery |
| Moon phase name | ✅ | New/Waxing/Full/etc. |
| Illumination percentage | ✅ | 0-100% |
| Declination | ✅ | ±28° range |
| Distance | ✅ | km from Earth |
| Path loss (144 MHz) | ✅ | Color-coded dB value |
| Moon Az/El from DE | ❌ | Observer position |
| Moon rise/set times | ❌ | Local calculations |
| Moon radial velocity | ❌ | Doppler relevance |
| EME planning tool | 🟡 | Have path loss, not DE/DX mutual visibility |
| Moon rotation movie | ❌ | NASA animation link |
| Elongation | ✅ | Hidden by default |
| Ecliptic coordinates | ✅ | Hidden by default |
| Right ascension | ✅ | Hidden by default |

---

## 7. Satellite Tracking

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-satellite tracking | ✅ | Unlimited via N2YO |
| Amateur satellite database | ✅ | Pre-configured list |
| Real-time position | ✅ | Az/El/Lat/Lon/Alt |
| Doppler shift | ✅ | Uplink/downlink |
| Pass predictions | ✅ | Rise/Max/Set times |
| Footprint circles | ✅ | Horizon visibility zone |
| Ground track orbit line | 🟡 | Footprint only, not full orbit |
| Map markers | ✅ | Real-time position |
| Satellite selection | ✅ | Add/remove from list |
| Frequency display | ✅ | Uplinks/downlinks with modes |
| Sky plot visualization | ❌ | Pass on polar plot |
| TLE age display | ❌ | Element freshness |
| User TLE file support | ❌ | Custom satellite definitions |
| Satellite planning tool | ❌ | DE/DX mutual visibility |
| SGP4 calculations | 🔵 | N2YO API handles this |
| TLE from CelesTrak | 🔵 | N2YO API handles this |

---

## 8. Weather Integration

| Feature | Status | Notes |
|---------|--------|-------|
| Local weather display | ✅ | Header clock widget |
| Weather at DX | ✅ | In spot detail panel |
| Temperature/humidity/wind | ✅ | Current conditions |
| NWS integration | ✅ | National Weather Service |
| Weather Underground | ✅ | PWS station support |
| Weather alerts | ✅ | NWS alert badges |
| Forecast | ✅ | Short description |
| Weather backgrounds | ✅ | Contextual header styling |
| Open-Meteo | ❌ | No API key alternative |
| OpenWeatherMap | ❌ | Optional API key source |

---

## 9. Time & Location

| Feature | Status | Notes |
|---------|--------|-------|
| **Time Display** |
| Local time | ✅ | Digital clock widget |
| UTC time | ✅ | Separate widget |
| 12/24 hour toggle | ✅ | User preference |
| Sun rise/set times | ✅ | On local clock |
| Rise/set "at" vs "in" toggle | ❌ | Time or countdown |
| Time shift (planning) | ❌ | View future/past |
| Stopwatch | ❌ | With lap function |
| Countdown timer | ❌ | Configurable duration |
| Daily alarm | ❌ | Repeating |
| One-time alarm | ❌ | Single occurrence |
| Big Clock mode | ❌ | Full-screen display |
| **Location** |
| Callsign entry | ✅ | Settings modal |
| Lat/Long entry | ✅ | Manual input |
| Grid square entry | ✅ | Autocomplete |
| IP geolocation | ✅ | Browser geolocation API |
| GPS geolocation | ✅ | Browser geolocation API |
| QRZ lookup | ✅ | Callsign data |
| Timezone management | 🟡 | Auto-detect only |
| **Distance & Bearing** |
| Distance to DX | ✅ | Great circle |
| Bearing to DX | ✅ | True bearing |
| Short/Long path toggle | ❌ | Path selection |
| Bearings (True/Magnetic) | ❌ | Magnetic declination |

---

## 10. UI/UX & Theming

| Feature | Status | Notes |
|---------|--------|-------|
| Dark theme | ✅ | Default |
| Light theme | ❌ | Not implemented |
| Legacy theme (green-on-black) | ❌ | Not implemented |
| Retro theme (90s GUI) | ❌ | Not implemented |
| Modern responsive layout | ✅ | Flexbox widgets |
| Classic fixed layout | ❌ | HamClock-inspired |
| Widget drag & drop | ✅ | Persistent positions |
| Widget resize | ✅ | Persistent sizes |
| Widget visibility toggle | ✅ | Show/hide widgets |
| Fullscreen mode | ✅ | F11 browser fullscreen |
| Help system | ✅ | Per-widget help modals |
| Multi-language support | ❌ | 8+ languages |
| Theme-based map tiles | ❌ | OSM/OpenTopoMap/satellite |
| Feedback/bug report button | ❌ | GitHub issues link ([#88](https://github.com/stevencheist/HamTabv1/issues/88)) |
| Units toggle (Metric/Imperial) | ❌ | Currently miles/Fahrenheit only |
| Date format | ❌ | 3 format options |
| Scroll direction | ❌ | Top-down vs bottom-up |
| Color customization | ❌ | Path/band colors |
| Pane rotation period | ❌ | Auto-cycle widgets |
| Map rotation period | ❌ | Auto-cycle styles |
| Demo mode | ❌ | Auto-changing display |
| Multiple config profiles | ❌ | A/B save slots |

---

## 11. Configuration & Persistence

| Feature | Status | Notes |
|---------|--------|-------|
| localStorage settings | ✅ | Browser-based |
| .env server config | ✅ | Backend secrets |
| Settings modal | ✅ | Comprehensive config UI |
| Filter persistence | ✅ | Per-source presets |
| Theme persistence | ✅ | Remembers dark mode |
| Layout persistence | ✅ | Widget positions/sizes |
| Spot column visibility | ✅ | Per-source column config |
| Solar field visibility | ✅ | Configurable metrics |
| Lunar field visibility | ✅ | Configurable metrics |
| Map overlay persistence | ✅ | Grid preferences |
| Reference tab persistence | ✅ | RST vs Phonetic |
| Configuration save/load | ✅ | localStorage |
| Configuration export/import | ❌ | JSON file backup |

---

## 12. Hardware Integration

| Feature | Status | Notes |
|---------|--------|-------|
| Rotator control (rotctld) | ❌ | hamlib integration |
| Rig control (rigctld/flrig) | ❌ | Radio frequency setting |
| KX3 serial control | ➖ | Hardware-specific |
| BME280 sensor | ➖ | I2C hardware sensor |
| Light sensor (LTR329) | ➖ | Auto-dimming |
| GPIO switches/LEDs | ➖ | Raspberry Pi GPIO |
| NMEA GPS input | ❌ | Serial GPS |
| gpsd support | ❌ | Network GPS daemon |
| Display brightness control | ➖ | Hardware-dependent |
| Display on/off timer | ➖ | Hardware-dependent |

---

## 13. Reference Materials

| Feature | Status | Notes |
|---------|--------|-------|
| RST code reference | ✅ | Tabbed widget |
| NATO phonetic alphabet | ✅ | Tabbed widget |
| Band privilege reference | ✅ | FCC Part 97 overlay |
| Q-codes | ❌ | Planned tab |
| Common abbreviations | ❌ | Planned tab |
| Band plan | ❌ | Planned tab |
| CW abbreviations | ❌ | Planned tab |

---

## 14. Deployment & Installation

| Feature | Status | Notes |
|---------|--------|-------|
| Git clone + npm | ✅ | Standard Node.js |
| Raspberry Pi installer | ✅ | install.sh with systemd |
| Windows installer | ✅ | install.ps1 with service |
| Docker support | ❌ | Containerization |
| Kiosk mode (Pi) | ❌ | Fullscreen Chromium |
| systemd service | ✅ | lanmode |
| Cloud deployment | ✅ | Cloudflare Containers (hostedmode) |
| Self-signed TLS | ✅ | lanmode HTTPS |
| Update checker | ✅ | GitHub Releases (lanmode) |
| Configurable port | ❌ | Via .env or CLI ([#90](https://github.com/stevencheist/HamTabv1/issues/90)) |
| Uninstall script | ❌ | Service + files cleanup ([#90](https://github.com/stevencheist/HamTabv1/issues/90)) |

---

## 15. Other Features

| Feature | Status | Notes |
|---------|--------|-------|
| NCDXF beacons display | ❌ | Frequency rotation |
| Callsign bio lookup | 🟡 | QRZ link in detail panel |
| NTP configuration | ➖ | Browser uses system time |
| Symbol legend | ❌ | Band colors, icons |

---

## Implementation Priorities

### User-Requested (Active GitHub Issues)
These items have been requested by users and are prioritized for implementation.

1. ❌ **VOACAP propagation views** — Band condition charts and predictions ([#91](https://github.com/stevencheist/HamTabv1/issues/91))
2. ❌ **Configurable port** — Allow changing web UI port via .env or CLI ([#90](https://github.com/stevencheist/HamTabv1/issues/90))
3. ❌ **Uninstall script** — Clean removal of service and files ([#90](https://github.com/stevencheist/HamTabv1/issues/90))
4. ❌ **Feedback button** — In-app link to GitHub issues for bug reports ([#88](https://github.com/stevencheist/HamTabv1/issues/88))

### Recently Completed
- ✅ **Help system** — Per-widget help modals with sections and links (2026-02-04)
- ✅ **Reference widget redesign** — Tabbed RST + NATO Phonetic with persistence (2026-02-04)
- ✅ **PSKReporter integration** — Digital mode reception reports with SNR levels
- ✅ **DX Cluster integration** — Multi-source spot management
- ✅ **Enhanced satellite tracking** — Multi-satellite tracking with N2YO API, Doppler, passes
- ✅ **Richer filter system** — 9-category filtering with presets and persistence
- ✅ **Per-band propagation predictions** — Individual band reliability with MUF-based calculations

### Phase 1: Core Feature Parity (High Priority)
1. ❌ **Long path line display** — Opposite direction great circle
2. ❌ **WWFF spot integration** — World Wide Flora & Fauna API
3. ❌ **VOACAP propagation predictions** — Professional propagation modeling ([#91](https://github.com/stevencheist/HamTabv1/issues/91))
4. ❌ **DXpeditions list/map** — NG3K + DXNews integration
5. ❌ **Contests calendar** — WA7BNM calendar integration
6. ❌ **Solar/space weather history graphs** — 30-day SFI, 7-day Kp, 24h X-ray
7. ❌ **NCDXF beacon display** — 18 beacon stations, frequency rotation
8. ❌ **Moon Az/El/rise/set calculations** — Observer-relative lunar position
9. ❌ **Stopwatch/countdown timer** — Shack utility tools
10. ❌ **Units toggle** — Metric/Imperial preference

### Phase 2: Advanced Features (Medium Priority)
1. ❌ **Live DX Cluster TCP** — Telnet proxy microservice for persistent connections
2. ❌ **PSKReporter MQTT** — Real-time WebSocket integration
3. ❌ **WSPR integration** — wsprnet.org API
4. ❌ **RBN integration** — Reverse Beacon Network API
5. ❌ **WSJT-X UDP listener** — Port 2237, local network + cloud relay
6. ❌ **ADIF log display** — QSO log viewer
7. ❌ **Watch list system** — Red/Only/Not filter modes
8. ❌ **Satellite sky plot** — Polar pass visualization
9. ❌ **EME planning tool** — DE/DX mutual moon visibility
10. ❌ **Grayline planning tool** — DE/DX twilight overlap calculator
11. ❌ **CQ/ITU zone overlays** — Zone boundary GeoJSON
12. ❌ **Aurora map overlay** — NOAA OVATION model
13. ❌ **DRAP map overlay** — D-Region Absorption Prediction

### Phase 3: Hardware Integration (Lower Priority for Web)
1. ❌ **hamlib rotctld** — Rotator control integration
2. ❌ **hamlib rigctld** — Radio control integration
3. ❌ **flrig** — Alternative radio control
4. ❌ **UDP spot receiver** — N1MM+ and other logger integration
5. ❌ **gpsd** — Network GPS daemon integration

### Phase 4: UI/UX Enhancements
1. ❌ **Multi-language support** — 8+ languages (Spanish, French, German, Japanese, etc.)
2. ❌ **Light theme** — Day mode color palette
3. ❌ **Multiple themes** — Legacy/retro options
4. ❌ **Azimuthal map projection** — DE-centered view
5. ❌ **RSS ticker overlay** — Scrolling DX news
6. ❌ **Map info table popup** — Cursor hover details
7. ❌ **Fixed layout mode** — Classic HamClock visual layout
8. ❌ **Plugin system** — Custom map overlay architecture
9. ❌ **Color customization** — User-defined palette
10. ❌ **Demo mode** — Auto-rotating display

### Phase 5: Additional Features (Lower Priority)
1. ❌ **Earthquake overlay** — USGS integration
2. ❌ **Weather radar overlay** — Precipitation layer
3. ❌ **Docker deployment** — Container support
4. ❌ **Kiosk mode** — Auto-launch fullscreen for dedicated displays
5. ❌ **ITU-R P.533 propagation** — Production-grade modeling microservice
6. ❌ **Configuration export/import** — JSON backup/restore

---

## Data Source Mapping

| Data Type | Current Source | Status |
|-----------|---------------|--------|
| Solar indices | hamqsl.com | ✅ Working |
| X-ray flux | NOAA SWPC | ✅ Working |
| TLE/satellite data | N2YO API | ✅ Working |
| Solar images | sdo.gsfc.nasa.gov | ✅ Working |
| Moon images | svs.gsfc.nasa.gov | ✅ Working |
| Weather (US) | NWS + Weather Underground | ✅ Working |
| Ionosonde data | kc2g.com | ✅ Working |
| Callsign lookup | callook.info / QRZ | ✅ Working |
| POTA spots | api.pota.app | ✅ Working |
| SOTA spots | api2.sota.org.uk | ✅ Working |
| DXC spots | HamQTH CSV | ✅ Working |
| PSKReporter | pskreporter.info | ✅ Working |
| Contests | WA7BNM | ❌ Need API/scrape |
| DXpeditions | NG3K / DXNews | ❌ Need API/scrape |
| VOACAP | voacap.com | ❌ Need integration ([#91](https://github.com/stevencheist/HamTabv1/issues/91)) |
| WSPR | wspr.live | ❌ Need API |
| RBN | reversebeacon.net | ❌ Need API |
| WWFF | wwff.co | ❌ Need API |
| DST index | Kyoto University | ❌ Need API |
| DRAP | NOAA SWPC | ❌ Need API |

---

## Technical Notes

### Architecture Considerations

**Current HamTab Architecture:**
- Vanilla JS + ES modules → esbuild IIFE bundle
- Express backend (stateless, no database)
- No framework dependencies
- Direct API integrations (no microservices)
- Two deployment modes (lanmode/hostedmode)

**Potential Enhancements:**
- Optional proxy microservices for persistent connections (DX cluster, propagation modeling)
- WebSocket integration for real-time data streams (PSKReporter MQTT, live clusters)
- Plugin/overlay system for extensibility
- Service worker for offline capability

### Integration Opportunities

1. **DX Cluster** — Implement telnet proxy microservice for persistent Spider connections
2. **PSKReporter** — MQTT WebSocket for real-time, HTTP fallback for reliability
3. **WSJT-X** — UDP listener on port 2237, optional cloud relay for hostedmode
4. **Map Overlays** — Plugin architecture could integrate with existing widget system
5. **Themes** — CSS custom properties already in use, easy to add more

### Security Considerations

- DX Spider proxy must validate telnet connections and prevent abuse
- WSJT-X UDP listener needs LAN-only binding in lanmode
- PSKReporter MQTT requires WebSocket CSP updates
- Map overlay plugins need SSRF prevention for user-provided URLs
- DXNews/contest scraping must sanitize HTML content
- All external API calls proxied through server (no client-side external requests)

### Web vs Hardware Limitations

HamTab is web-based, so some hardware features are not applicable:
- ➖ GPIO switches/LEDs (Raspberry Pi hardware)
- ➖ I2C sensors (BME280, LTR329)
- ➖ Display brightness control (hardware-dependent)
- ➖ KX3 serial control (hardware-specific)

These features can be implemented for lanmode deployments with optional hardware integration scripts, but are not core to the web dashboard.

---

## Notes

- Priority should be given to features that use publicly available APIs
- Consider community API contributions for missing data sources
- HamTab uses a flexible widget layout vs fixed pixel positions
- User-requested features (GitHub issues) take highest priority
- Recent work focuses on user experience improvements (help system, reference materials)

---

*Last updated: 2026-02-04*
