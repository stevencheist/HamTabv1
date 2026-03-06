# HamTab Outbound HTTP Calls Audit

**Generated:** 2026-03-06

Every outbound HTTP request from HamTab's server (`server.js`) goes through `secureFetch()`, which enforces SSRF prevention, DNS pinning, timeouts, size limits, and HTTPS-only. Client-side code only calls local `/api/` endpoints (the server proxies all external requests).

---

## Server-Side Outbound Calls (server.js)

### Amateur Radio Spot Aggregators

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| POTA Activator Spots | `api.pota.app` | Fetch active Parks on the Air spots | 145 |
| SOTA Spots | `api2.sota.org.uk` | Fetch Summits on the Air spots | 705 |
| SOTA Summit Detail | `api2.sota.org.uk` | Fetch summit metadata by code | 3428 |
| WWFF Spots | `spots.wwff.co` | Fetch World Flora & Fauna spots | 759 |

### Callsign Lookups

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| Callook (FCC) | `callook.info` | US callsign lookup (name, location, license class) | 168, 1544 |
| HamQTH Login | `www.hamqth.com` | Authenticate for callsign lookup session | 284 |
| HamQTH Callsign | `www.hamqth.com` | International callsign lookup | 342 |
| HamQTH DX Cluster | `www.hamqth.com` | Fetch DX cluster spots (CSV) | 369 |

### Geocoding

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| Nominatim Geocoding | `nominatim.openstreetmap.org` | Convert US address/grid to lat/lon for callsign lookups | 1554 |

### PSK Reporter

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| PSKReporter Query (RX) | `retrieve.pskreporter.info` | Fetch received spots for a callsign | 455 |
| PSKReporter Query (TX) | `retrieve.pskreporter.info` | Fetch transmitted spots for a callsign | 560 |

### WSPR

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| WSPR Live Query | `db1.wspr.live` | Query WSPR propagation reports | 662 |

### Space Weather & Solar

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| HamQSL Solar XML | `www.hamqsl.com` | Solar flux, A/K index, band conditions | 781, 2627 |
| NOAA Kp Index | `services.swpc.noaa.gov` | Planetary K-index history | 797 |
| NOAA X-Ray Flux | `services.swpc.noaa.gov` | GOES X-ray flux (7-day) | 798 |
| NOAA Solar Flux (F10.7) | `services.swpc.noaa.gov` | 10.7cm radio flux | 799 |
| NOAA Solar Wind Plasma | `services.swpc.noaa.gov` | Solar wind speed/density (7-day) | 800 |
| NOAA Solar Wind Mag | `services.swpc.noaa.gov` | Interplanetary magnetic field (7-day) | 801 |
| NOAA D-RAP Image | `services.swpc.noaa.gov` | HF absorption map (PNG) | 2398 |
| NOAA D-RAP Frequencies | `services.swpc.noaa.gov` | Degraded frequency data (text) | 2440 |
| NOAA Sunspot Predictions | `services.swpc.noaa.gov` | Predicted monthly sunspot numbers | 2561 |

### SDO Solar Imagery

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| SDO Browse Index | `sdo.gsfc.nasa.gov` | List available SDO image frames for a date | 1828 |
| SDO Frame Image | `sdo.gsfc.nasa.gov` | Fetch a specific SDO image frame | 1883 |
| SDO Latest Image | `sdo.gsfc.nasa.gov` | Fetch latest 512px solar image by wavelength | 1918 |

### Lunar Imagery

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| NASA Moon Visualization | `svs.gsfc.nasa.gov` | Moon phase frame images (SVS/Dial-a-Moon) | 1958 |

### Satellite Tracking

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| N2YO Satellites Above | `api.n2yo.com` | List amateur satellites currently above horizon | 931 |
| N2YO Satellite Positions | `api.n2yo.com` | Real-time position for tracked satellites | 988 |
| N2YO Radio Passes | `api.n2yo.com` | Predict upcoming radio passes | 1047 |
| N2YO TLE Data | `api.n2yo.com` | Fetch TLE orbital elements | 1103 |
| CelesTrak ISS TLE | `celestrak.org` | ISS two-line element set (fallback/direct) | 1142 |

### Weather

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| Weather Underground Current | `api.weather.com` | Current PWS observations | 1292 |
| Weather Underground Daily | `api.weather.com` | All-day PWS observations (hi/lo) | 1297 |
| NWS Points | `api.weather.gov` | Resolve lat/lon to NWS forecast office | 1354 |
| NWS Alerts | `api.weather.gov` | Active weather alerts for location | 1393 |
| OpenWeatherMap Current | `api.openweathermap.org` | Current weather conditions | 1426 |

### Propagation Maps

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| KC2G Propagation GeoJSON | `prop.kc2g.com` | MUF/foF2 propagation contour data | 2349 |
| KC2G Propagation Image | `prop.kc2g.com` | MUF/foF2 propagation map (JPG) | 2362 |

### Weather Radar

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| RainViewer API | `api.rainviewer.com` | Weather radar tile timestamps | 2487 |

### Cloud Cover Tiles

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| OpenWeatherMap Cloud Tiles | `tile.openweathermap.org` | Cloud cover map overlay tiles | 2516 |

### Contests & DXpeditions

| Endpoint | Domain | Purpose | Line(s) |
|----------|--------|---------|---------|
| NG3K DXpeditions | `www.ng3k.com` | Active DXpedition calendar (XML) | 2213 |
| Contest Calendar | `www.contestcalendar.com` | Upcoming contests (RSS/XML) | 2312 |

### Map Tiles (Client-Side, Not Proxied)

| Endpoint | Domain | Purpose | File |
|----------|--------|---------|------|
| CartoDB Dark Tiles | `basemaps.cartocdn.com` | Dark theme map tiles | src/map-init.js:10 |
| CartoDB Voyager Tiles | `basemaps.cartocdn.com` | Light theme map tiles | src/map-init.js:11 |

---

## Client-Side Outbound Calls (src/*.js)

All client-side `fetch()` calls go to **local `/api/` endpoints only** — the server proxies all external requests. No direct external fetches from the browser.

---

## External Links (Not Fetched — User-Clickable Only)

These are `<a href>` links in the UI that open in the user's browser. They are **not** fetched by HamTab code.

| Domain | Purpose | File(s) |
|--------|---------|---------|
| `www.qrz.com` | Callsign lookup links | src/spots.js, src/spot-detail.js, src/markers.js, src/filters.js, src/splash.js |
| `www.sota.org.uk` | Summit reference links | src/spots.js, src/spot-detail.js |
| `wwff.co` | WWFF park reference links | src/spots.js, src/spot-detail.js |
| `pota.app` | POTA park reference links | src/spots.js, src/spot-detail.js |
| `github.com/stevencheist/HamTabv1` | Feedback issue submission | src/feedback.js |
| `www.clearskyinstitute.com` | HamClock attribution link (footer) | public/index.html |
| Various educational sites | Help popup "Learn more" links | src/constants.js |

---

## Summary by Domain

| Domain | # Calls | Category |
|--------|---------|----------|
| `services.swpc.noaa.gov` | 8 | Space weather (NOAA) |
| `api.n2yo.com` | 4 | Satellite tracking |
| `sdo.gsfc.nasa.gov` | 3 | Solar imagery (NASA) |
| `www.hamqth.com` | 3 | Callsign/DX cluster |
| `api.weather.com` | 2 | Weather Underground |
| `api.weather.gov` | 2 | NWS weather |
| `callook.info` | 2 | FCC callsign lookup |
| `prop.kc2g.com` | 2 | Propagation maps |
| `retrieve.pskreporter.info` | 2 | PSK Reporter |
| `www.hamqsl.com` | 2 | Solar/band conditions |
| `basemaps.cartocdn.com` | 2 | Map tiles (client-side) |
| `api.openweathermap.org` | 1 | Weather |
| `api.pota.app` | 1 | POTA spots |
| `api.rainviewer.com` | 1 | Weather radar |
| `api2.sota.org.uk` | 2 | SOTA spots/summits |
| `celestrak.org` | 1 | ISS TLE |
| `db1.wspr.live` | 1 | WSPR data |
| `nominatim.openstreetmap.org` | 1 | Geocoding |
| `spots.wwff.co` | 1 | WWFF spots |
| `svs.gsfc.nasa.gov` | 1 | Moon imagery (NASA) |
| `tile.openweathermap.org` | 1 | Cloud tiles |
| `www.contestcalendar.com` | 1 | Contest calendar |
| `www.ng3k.com` | 1 | DXpeditions |

**Total unique external domains: 23**
**Total outbound call patterns: ~42**
