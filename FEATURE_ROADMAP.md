# HamTab Feature Roadmap

This document tracks advanced features and enhancements planned for HamTabV1.

**Last updated:** 2026-02-03

---

## Legend
- ✅ Implemented in HamTab
- 🟡 Partially implemented
- ❌ Not yet implemented
- 🔵 Different approach in HamTab
- ➖ Not applicable

---

## 1. DX Spot Sources

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| DX Spider cluster (telnet) | ✅ | ❌ | Via proxy microservice |
| HamQTH spot source | ✅ | 🔵 | HamTab uses HamQTH CSV |
| DXWatch fallback | ✅ | ❌ | Alternative spot source |
| Multi-source fallback | ✅ | ❌ | DX Spider → HamQTH → DXWatch |
| "My Spots" highlighting | ✅ | ❌ | When user callsign is spotted |
| Spot retention window | ✅ | ❌ | 5-30 minute configurable |
| 6-category filtering | ✅ | 🟡 | Zones/bands/modes/watchlist/exclude |

---

## 2. Digital Mode Integration

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| PSKReporter MQTT (real-time) | ✅ | ❌ | WebSocket integration |
| PSKReporter HTTP (fallback) | ✅ | ❌ | 2-minute polling |
| WSJT-X/JTDX UDP listener | ✅ | ❌ | Port 2237, local network |
| WSJT-X cloud relay agent | ✅ | ❌ | Bridge local UDP to cloud |
| FT8/FT4/JT65/JT9/WSPR decode | ✅ | ❌ | Multi-mode support |
| PSK filter manager | ✅ | ❌ | Band/mode/time/callsign filters |

---

## 3. Propagation & Space Weather

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| Solar indices (SFI/Kp/SSN) | ✅ | ✅ | Both use NOAA |
| 30-day history graphs | ✅ | 🟡 | HamTab has values, not graphs |
| Per-band reliability | ✅ | ❌ | Open/marginal/closed indicators |
| ITU-R P.533 integration | ✅ | ❌ | Optional microservice |
| KC2G ionosonde data | ✅ | ✅ | Real-time measurements |
| X-ray flux from GOES | ✅ | ✅ | Both implemented |
| HamQSL band conditions | ✅ | ✅ | XML feed |
| Aurora oval overlay | ✅ | ❌ | NOAA OVATION model |

---

## 4. Contests & DXpeditions

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| Contest calendar | ✅ | ❌ | 30-minute refresh |
| Active DXpeditions list | ✅ | ❌ | NG3K integration |
| DX news ticker | ✅ | ❌ | DXNews.com scraping |
| DXpedition map markers | ✅ | ❌ | Visual map overlay |

---

## 5. UI/UX & Theming

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| Dark theme | ✅ | ✅ | Both have |
| Light theme | ✅ | ❌ | OpenHamClock only |
| Legacy theme (green-on-black) | ✅ | ❌ | OpenHamClock only |
| Retro theme (90s GUI) | ✅ | ❌ | OpenHamClock only |
| Modern responsive layout | ✅ | ✅ | Both have |
| Classic fixed layout | ✅ | ❌ | HamClock-inspired |
| Multi-language support | ✅ | ❌ | 8 languages in OpenHamClock |
| Fullscreen mode | ✅ | ❌ | Dedicated shack display |
| Theme-based tile switching | ✅ | ❌ | OSM/OpenTopoMap/satellite |

---

## 6. Map Features & Overlays

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| Interactive world map | ✅ | ✅ | Both use Leaflet |
| Great-circle paths | ✅ | ✅ | Haversine calculations |
| Day/night terminator | ✅ | ✅ | Gray line |
| Satellite orbits | ✅ | 🟡 | HamTab has footprint, not full orbit |
| Plugin system for overlays | ✅ | ❌ | Custom layer architecture |
| Aurora overlay | ✅ | ❌ | NOAA model |
| Earthquake markers | ✅ | ❌ | USGS data |
| Weather radar overlay | ✅ | ❌ | Precipitation layer |
| Symbol legend | ✅ | ❌ | Band colors, sun/moon icons |
| Hover-to-highlight spots | ✅ | ✅ | Both have |

---

## 7. Satellite Tracking

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| 40+ amateur satellites | ✅ | 🟡 | HamTab has fewer |
| SGP4 calculations | ✅ | 🔵 | HamTab uses N2YO API |
| Ground track orbit line | ✅ | ❌ | Full orbit visualization |
| Footprint circles | ✅ | ✅ | Visibility zones |
| TLE from CelesTrak | ✅ | ❌ | HamTab uses N2YO |
| 6-hour TLE refresh | ✅ | ❌ | Auto-update |

---

## 8. Weather Integration

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| Local weather display | ✅ | ✅ | Both have |
| Open-Meteo (no API key) | ✅ | ❌ | Default source |
| OpenWeatherMap (optional) | ✅ | ❌ | Requires key |
| Temperature/humidity/wind | ✅ | ✅ | Both display |
| NWS integration | ❌ | ✅ | HamTab only |
| Weather Underground | ❌ | ✅ | HamTab only |

---

## 9. Configuration & Persistence

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| localStorage settings | ✅ | ✅ | Both use |
| .env server config | ✅ | ✅ | Both use |
| Settings modal | ✅ | ✅ | Both have |
| Filter persistence | ✅ | ✅ | Both save filters |
| Theme persistence | ✅ | ✅ | Both remember theme |
| Layout persistence | ✅ | ✅ | Widget positions |

---

## 10. Deployment & Installation

| Feature | Target | Status | Notes |
|---------|--------|--------|-------|
| Git clone + npm | ✅ | ✅ | Both support |
| Raspberry Pi installer | ✅ | ✅ | Both have |
| Docker support | ✅ | ❌ | OpenHamClock only |
| Kiosk mode (Pi) | ✅ | ❌ | Fullscreen Chromium |
| systemd service | ✅ | ✅ | Both support |
| Cloud deployment | ✅ | ✅ | Railway vs Cloudflare |
| Windows installer | ❌ | ✅ | HamTab only |

---

## Implementation Priorities

### High Value, Moderate Effort
1. ✅ **DX Cluster integration** — Multi-source spot management (implemented in `src/source.js`)
2. ✅ **Enhanced satellite tracking** — Multi-satellite tracking with N2YO API, Doppler, passes (implemented in `src/satellites.js`)
3. ✅ **Richer filter system** — 9-category filtering with presets and persistence (implemented in `src/filters.js`)
4. ❌ **Per-band propagation predictions** — Open/marginal/closed indicators with reliability %

### High Value, Higher Effort
5. ❌ **PSKReporter integration** — Digital mode reception reports (MQTT real-time + HTTP fallback)
6. ❌ **WSJT-X integration** — UDP listener for FT8/FT4/JT65/JT9/WSPR (local + cloud relay)
7. ❌ **Multi-language support** — Internationalization (8+ languages like OpenHamClock)

### Additional Features (Lower Priority)
8. ❌ **Contest calendar** — Active contest display and filtering
9. ❌ **DXpeditions list** — NG3K integration with map markers
10. ❌ **Aurora overlay** — NOAA OVATION model map layer
11. ❌ **Multiple themes** — Light/legacy/retro options
12. ❌ **DX news ticker** — Scrolling headlines
13. ❌ **Fullscreen mode** — Dedicated shack display
14. ❌ **Plugin system** — Custom map overlay architecture
15. ❌ **ITU-R P.533 propagation** — Production-grade modeling
16. ❌ **Earthquake overlay** — USGS integration
17. ❌ **Weather radar overlay** — Precipitation layer
18. ❌ **Docker deployment** — Container support
19. ❌ **Kiosk mode** — Auto-launch fullscreen

---

## Technical Notes

### Architecture Considerations

**Current HamTab Architecture:**
- Vanilla JS + ES modules → esbuild IIFE
- Express backend (stateless)
- No framework dependencies
- Direct API integrations (no microservices)
- Two deployment modes (lanmode/hostedmode)

**Potential Enhancements:**
- Optional proxy microservices for persistent connections (DX cluster, propagation modeling)
- WebSocket integration for real-time data streams
- Plugin/overlay system for extensibility

### Integration Opportunities

1. **DX Cluster** — Implement telnet proxy microservice for persistent Spider connections
2. **PSKReporter** — MQTT WebSocket for real-time, HTTP fallback for reliability
3. **WSJT-X** — UDP listener on port 2237, optional cloud relay for hostedmode
4. **Map Overlays** — Plugin architecture could integrate with existing widget system
5. **Themes** — CSS custom properties already in use, easy to add more

### Security Considerations

- DX Spider proxy must validate telnet connections
- WSJT-X UDP listener needs LAN-only binding in lanmode
- PSKReporter MQTT requires WebSocket CSP updates
- Map overlay plugins need SSRF prevention
- DXNews scraping must sanitize HTML content

---
