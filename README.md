# HamTab

A real-time amateur radio dashboard for [Parks on the Air (POTA)](https://pota.app) and [Summits on the Air (SOTA)](https://www.sota.org.uk/) activations. Displays live spots on an interactive map with solar propagation data, HF band conditions, ISS tracking, weather, and lunar/EME conditions — all in a customizable widget layout.

**Live at [hamtab.net](https://hamtab.net)** — sign in with Google, GitHub, or email.

![Node.js](https://img.shields.io/badge/Node.js-20-green) ![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers%20%2B%20Containers-orange) ![License](https://img.shields.io/badge/license-MIT-lightgrey)

## Features

- **On the Air** — Real-time POTA and SOTA spots with source tabs, filtering by band, mode, country, US state, and Maidenhead grid square, and a spot age column
- **Interactive Map** — Leaflet map with clustered markers for both POTA and SOTA activations, dark tiles, and clickable popups with QRZ callsign links
- **Map Center Controls** — Quick buttons to center on your QTH, prime meridian, or selected spot
- **Day/Night Terminator** — Gray line overlay showing the solar terminator with a subtle daylight tint on the illuminated hemisphere
- **Propagation Contours** — MUF and foF2 HF propagation overlays on the map from prop.kc2g.com
- **ISS Tracking** — Real-time ISS position, orbital ground track, radio footprint circle, and ARISS amateur radio frequencies
- **Solar Indices** — Solar flux, sunspot number, A/K indices, X-ray flux, and signal noise level with 18 configurable fields
- **HF Band Conditions** — Day/night conditions for 80m through 10m displayed in the header
- **Lunar / EME** — Moon phase, illumination, declination, distance, and relative path loss for EME operators with 9 configurable fields
- **Weather Conditions** — Local weather display from Weather Underground (PWS key) or NWS as automatic fallback
- **Weather Backgrounds** — Clock widget background gradient changes to reflect current conditions with day/night variants
- **NWS Weather Alerts** — Severity-colored alert badge on local clock; click to view active alerts
- **Clock Styles** — Digital or analog clock face for both Local Time and UTC widgets
- **License Privilege Filter** — For US callsigns, filter spots to only show frequencies and modes your license class allows
- **Band Reference** — Built-in band plan reference popup showing frequency privileges by license class
- **Widget Layout** — All panels are draggable and resizable with snap-to-edge, persisted across sessions
- **Settings Sync** — Your configuration syncs across devices via Cloudflare Workers KV
- **Operator Identity** — Callsign prompt at startup with geolocation and Maidenhead grid square display

---

## Architecture

```
User → Cloudflare Access (auth) → Worker (settings KV + proxy) → Container (Node.js Express :8080)
```

| Component | Role |
|-----------|------|
| **Cloudflare Access** | Authentication gate — Google, GitHub, or email OTP. Verifies identity before any request reaches the app. |
| **Cloudflare Worker** (`worker.js`) | Routes `/api/settings` GET/PUT to Workers KV (keyed by user email). Proxies everything else to the container. |
| **Container** (`server.js`) | Node.js Express server on port 8080. Stateless API proxy — fetches external amateur radio APIs and serves the static frontend. No database, no sessions. |
| **Workers KV** | Stores per-user settings (callsign, location, preferences). Enables settings sync across devices. |
| **Client** (`public/app.js`) | IIFE bundle built from ES modules in `src/`. User state lives in localStorage; synced to/from KV on startup and config save. |

Cloudflare handles TLS termination, DDoS protection, and CDN caching. The container runs behind the Worker and sleeps after 5 minutes of inactivity.

---

## Branch Strategy

This repo uses three branches:

```
main ──────────────────────── shared codebase
 ├── lanmode                  LAN/self-hosted variant
 └── hostedmode               Cloudflare/cloud variant
```

| Branch | Purpose | Target |
|--------|---------|--------|
| **`main`** | Shared features — full client feature parity | Base for both variants |
| **`lanmode`** | Adds self-signed TLS, CORS for RFC 1918, auto-update system, local admin endpoints | Raspberry Pi, home server |
| **`hostedmode`** | Adds Cloudflare Worker/Container, settings sync via KV, CI/CD, Dockerfile | hamtab.net |

New shared features go on `main`. Both variant branches merge from `main` to stay current. Never merge between `lanmode` and `hostedmode` directly.

> **Looking for the self-hosted version?** Switch to the [`lanmode`](../../tree/lanmode) branch for installation instructions on Raspberry Pi, Linux, macOS, and Windows.

---

## Development Setup

**Prerequisites:** Node.js 20+

```bash
git clone https://github.com/stevencheist/HamTabv1.git
cd HamTabv1
git checkout hostedmode
npm install
npm run build
node server.js
```

The server starts on **http://localhost:8080**. The `.env` file is optional for local development:

```
PORT=8080
HOST=0.0.0.0
WU_API_KEY=your_key_here
```

### Build

```bash
npm run build        # one-time bundle
npm run dev          # watch mode (rebuilds on file changes)
npm start            # build + start server
```

The build step bundles `src/*.js` into `public/app.js` via esbuild. The version from `package.json` is injected as `__APP_VERSION__` at build time.

---

## Deployment

Deployment is automatic via GitHub Actions. Pushing to the `hostedmode` branch triggers the CI/CD workflow (`.github/workflows/deploy.yml`), which:

1. Checks out the code
2. Installs dependencies and builds the client bundle
3. Deploys to Cloudflare via `wrangler`

### Initial Setup (one-time)

1. **Create KV namespace:**
   ```bash
   wrangler kv namespace create SETTINGS_KV
   ```
   Paste the returned ID into `wrangler.jsonc` under `kv_namespaces`.

2. **Configure Cloudflare Access:**
   In the Cloudflare Zero Trust dashboard, add an Access application for `hamtab.net` with your chosen identity providers (Google, GitHub, email OTP).

3. **Add GitHub secret:**
   In the repo Settings → Secrets → Actions, add `CLOUDFLARE_API_TOKEN` — a Cloudflare API token with Workers Scripts Edit and Account Containers permissions.

4. **DNS:**
   Point `hamtab.net` to Cloudflare (likely already configured if purchased through CF).

5. **Deploy:**
   ```bash
   wrangler deploy
   ```
   Or just push to `hostedmode` and let CI/CD handle it.

### Secrets

Use `wrangler secret put SECRET_NAME` for any server-side secrets (e.g. API keys). These are encrypted at rest and injected as environment variables at runtime. Never store secrets in `wrangler.jsonc` or commit them to git.

---

## Project Structure

```
HamTabv1/
  server.js              Express server — API proxy, lunar math, health check
  worker.js              Cloudflare Worker — settings KV + container proxy
  wrangler.jsonc         Cloudflare deployment config
  Dockerfile             Container image for Cloudflare Containers
  package.json           Node.js project config
  esbuild.mjs            Build config (ES modules → IIFE bundle)
  .env                   Environment variables (gitignored)
  src/
    main.js              Client entry point
    state.js             Application state object
    settings-sync.js     Settings pull/push via Workers KV
    update.js            Static version display
    splash.js            Configuration dialog
    ...                  Other client modules
  public/
    index.html           Main HTML page
    style.css            Dark theme, widgets, map, tables
    app.js               Bundled client output (don't edit directly)
    vendor/              Leaflet and marker clustering (bundled locally)
  .github/
    workflows/
      deploy.yml         CI/CD — auto-deploy on push to hostedmode
```

---

## Configuration

On first visit (or any time you click **Config** in the header), a dialog appears:

| Setting | Description |
|---------|-------------|
| **Callsign** | Your amateur radio callsign. Displayed in the header and on the map marker. |
| **Location** | Lat/lon, grid square, or GPS. Used for map centering, distance/bearing, weather, and sunrise/sunset. |
| **Time Format** | 12-hour or 24-hour display. |
| **Weather Station** | Optional Weather Underground station ID and API key. Falls back to NWS if blank (US only). |
| **Widgets** | Toggle individual widgets on/off. |
| **Layout** | Save or reset widget positions and sizes. |

All settings are saved to localStorage and synced to Workers KV so they follow you across devices.

---

## Dependencies

| Package | Purpose |
|---------|---------|
| [Express](https://expressjs.com/) | HTTP server and API proxy |
| [helmet](https://helmetjs.github.io/) | Security headers, CSP, HSTS |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | API rate limiting (60 req/min) |
| [fast-xml-parser](https://github.com/NaturalIntelligence/fast-xml-parser) | Solar XML data parsing |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variable configuration |
| [esbuild](https://esbuild.github.io/) | Client JS bundler (dev dependency) |

Leaflet maps and marker clustering are bundled locally in `public/vendor/`.

### External APIs

| API | Purpose | Auth |
|-----|---------|------|
| [POTA API](https://api.pota.app/) | Live activator spots | None |
| [SOTA API](https://api2.sota.org.uk/) | Summit spots and coordinates | None |
| [HamQSL Solar XML](https://www.hamqsl.com/solarxml.php) | Solar indices and band conditions | None |
| [Propagation Contours](https://prop.kc2g.com/) | MUF and foF2 HF propagation overlays | None |
| [Where the ISS at?](https://wheretheiss.at/w/developer) | ISS position and orbit data | None |
| [NWS API](https://www.weather.gov/documentation/services-web-api) | Weather conditions, forecasts, and alerts | None (US only) |
| [Weather Underground](https://www.wunderground.com/member/api-keys) | Personal weather station observations | Free API key (optional) |
| [Callook.info](https://callook.info/) | US callsign license class lookup | None |
| [NASA SDO](https://sdo.gsfc.nasa.gov/) | Solar images and time-lapse frames | None |
| [NASA SVS](https://svs.gsfc.nasa.gov/) | Lunar phase images | None |

Lunar/EME data is computed server-side using Meeus astronomical algorithms — no external API needed.

---

## License

MIT
