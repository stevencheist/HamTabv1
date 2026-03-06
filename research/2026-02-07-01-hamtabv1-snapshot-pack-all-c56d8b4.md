# Snapshot Pack — HamTabV1

```
SNAPSHOT_PACK
================================================================================

SNAPSHOT_MANIFEST
  repo: stevencheist/HamTabv1
  ref: c56d8b4d3808f45fa7f57e75ef8a244d4420ef58
  generated_at: 2026-02-07T15:30:00Z
  lens: full

  top_level:
    server-side:    server.js (2671 LOC), server-config.js, server-startup.js, server-tls.js
    client src:     src/ (41 modules, 12,686 LOC total)
    build output:   public/app.js (IIFE bundle), public/index.html, public/style.css
    build config:   esbuild.mjs, package.json (v0.28.2)
    docs:           docs/user-guide/ (10 content files, build.mjs, screenshots/, template/)
    project docs:   CLAUDE.md, BRANCH_STRATEGY.md, ROADMAP.md, README.md, openapi.yaml
    installers:     install.sh (Linux/RPi), install.ps1 (Windows), start.bat/.sh/.ps1
    voacap:         voacap-bridge.js (Node IPC), voacap-worker.py (Python/numpy/dvoacap)
    feedback:       decrypt-feedback-email.js, generate-feedback-keypair.js
    vendor:         public/vendor/ (Leaflet 1.x, MarkerCluster plugin)

  entry_points:
    server:         server.js
    client:         src/main.js → bundled to public/app.js
    build:          esbuild.mjs (npm run build)
    docs build:     docs/user-guide/build.mjs (npm run build:docs)
    config:         server-config.js (getConfig() — mode detection)
    startup:        server-startup.js (HTTP/HTTPS listener)
    tls:            server-tls.js (self-signed cert generation, lanmode only)

  build_system:
    bundler:        esbuild (ES modules → IIFE)
    scripts:        build, build:docs, dev, start, start:direct
    docs:           marked + puppeteer → PDF (public/HamTab-User-Guide.pdf)

  external_apis:
    - POTA:         api.pota.app (activator spots)
    - SOTA:         api2.sota.org.uk (spots + summit details)
    - HamQTH:       www.hamqth.com (DX cluster CSV)
    - PSKReporter:  retrieve.pskreporter.info (decoded spots)
    - callook.info: callook.info (FCC callsign lookup)
    - HamQSL:       www.hamqsl.com (solar data XML)
    - NOAA SWPC:    services.swpc.noaa.gov (Kp, X-ray, F10.7, solar wind, magnetosphere, sunspot predictions)
    - N2YO:         api.n2yo.com (satellite positions, passes, TLE, amateur sat list)
    - Celestrak:    celestrak.org (ISS TLE)
    - Weather Underground: api.weather.com (PWS observations)
    - NWS:          api.weather.gov (conditions, alerts)
    - NASA SDO:     sdo.gsfc.nasa.gov (solar imagery — 0193, 0171, 0304, HMIIC)
    - NASA SVS:     svs.gsfc.nasa.gov (lunar imagery frames)
    - NG3K:         www.ng3k.com (DXpedition calendar XML)
    - ContestCal:   www.contestcalendar.com (contest calendar RSS)
    - KC2G:         prop.kc2g.com (HF propagation contours — MUF/foF2)
    - VOACAP:       Local Python bridge via IPC (dvoacap — HF circuit reliability)

  config:
    env_vars:
      - PORT (default 3000; 8080 = hostedmode)
      - HTTPS_PORT (default 3443)
      - HOST (default 0.0.0.0)
      - N2YO_API_KEY (satellite tracking)
      - WU_API_KEY (Weather Underground)
      - GITHUB_FEEDBACK_TOKEN (feedback issue creation)
      - VOACAP_API_TOKENS (optional rate-limit tokens)
    localStorage_keys: 45+ keys with hamtab_ prefix — full list includes:
      - Identity:     hamtab_callsign, hamtab_lat, hamtab_lon, hamtab_license_class
      - Appearance:   hamtab_theme, hamtab_slim_header, hamtab_distance_unit, hamtab_temperature_unit, hamtab_time24
      - Spot config:  hamtab_spot_source, hamtab_spot_columns, hamtab_filter_<source>, hamtab_filter_presets, hamtab_privilege_filter
      - API keys:     hamtab_n2yo_apikey, hamtab_wx_apikey, hamtab_wx_station
      - Widgets:      hamtab_widgets, hamtab_widgets_user, hamtab_widget_vis, hamtab_grid_mode, hamtab_grid_permutation, hamtab_grid_assignments, hamtab_grid_sizes
      - Widget state: hamtab_band_time, hamtab_solar_fields, hamtab_lunar_fields, hamtab_sdo_type, hamtab_prop_metric, hamtab_sat_tracked
      - VOACAP:       hamtab_voacap_power, hamtab_voacap_mode, hamtab_voacap_toa, hamtab_voacap_path, hamtab_voacap_target
      - Map:          hamtab_map_center, hamtab_map_overlays, hamtab_livespots_mode, hamtab_livespots_maxage, hamtab_heatmap_mode
      - Migration:    hamtab_migrated, hamtab_migration_v2

  deploy:
    modes: [lanmode, hostedmode]
    branches: [main (shared), lanmode (self-hosted), hostedmode (Cloudflare)]
    merge_direction: main → lanmode, main → hostedmode (never between deployment branches)
    hostedmode_stack: Cloudflare Worker + Container, Workers KV, GitHub Actions CI/CD
    lanmode_stack: Self-signed TLS, CORS restricted to RFC 1918, GitHub Releases update checker

  dependencies:
    runtime: cors, dotenv, express, express-rate-limit, fast-xml-parser, helmet, satellite.js, selfsigned, swagger-ui-express, yamljs
    dev: esbuild, marked, puppeteer
    client vendor: Leaflet, MarkerCluster (vendored in public/vendor/)

  docs_paths:
    - docs/user-guide/content/00-cover.md through 09-troubleshooting.md
    - docs/user-guide/screenshots/
    - docs/user-guide/template/ (HTML template for PDF)
    - public/HamTab-User-Guide.pdf (build output)
    - README.md, CLAUDE.md, BRANCH_STRATEGY.md, ROADMAP.md
    - openapi.yaml (API documentation)

  known_large_files:
    - public/app.js (bundled IIFE — do not edit directly)
    - public/HamTab-User-Guide.pdf (build artifact)
    - package-lock.json

  api_routes: 28 endpoints
    GET  /api/health, /api/spots, /api/spots/dxc, /api/spots/psk,
         /api/spots/psk/heard, /api/spots/sota, /api/solar,
         /api/spacewx/history, /api/satellites/list, /api/satellites/positions,
         /api/satellites/passes, /api/satellites/tle, /api/iss/position,
         /api/lunar, /api/weather, /api/weather/conditions, /api/weather/alerts,
         /api/callsign/:call, /api/solar/frames, /api/solar/frame/:filename,
         /api/solar/image, /api/lunar/image, /api/dxpeditions, /api/contests,
         /api/propagation, /api/voacap/ssn, /api/voacap/status, /api/voacap
    POST /api/config/env, /api/feedback

================================================================================

ORIENTATION_SUMMARY

- HamTab is a full-featured amateur radio dashboard targeting POTA/SOTA operators
  and displaced HamClock users (HamClock ceases June 2026). Free, web-based, no
  install for hostedmode (hamtab.net) or simple installer for lanmode (LAN).

- Architecture: Stateless Express server proxies 17+ external APIs through
  secureFetch() (SSRF prevention, DNS pinning, timeouts, size limits). No database,
  no sessions. All user state lives client-side in localStorage (45+ keys).

- Client is 41 ES modules in src/ bundled to a single IIFE (public/app.js) via
  esbuild. Vanilla JS, no framework. Leaflet for maps with MarkerCluster.

- 4 switchable themes (Default dark, LCARS, Terminal, HamClock) via CSS custom
  properties — no rebuild needed. HamClock theme uses political basemap tiles.

- Widget system: ~15 widgets (spots table, solar, lunar, satellites, weather,
  band conditions, VOACAP, SDO imagery, DX cluster, propagation map, contests,
  DXpeditions, beacon monitor, reference tables, DE/DX info). Drag/resize layout
  with grid and float modes.

- Two deployment modes from shared codebase: hostedmode (Cloudflare Worker +
  Container, CI/CD auto-deploy) and lanmode (self-signed TLS, CORS locked to
  RFC 1918, GitHub Releases update checker).

- Mode detection: server-config.js getConfig() checks PORT env var — 8080 means
  Cloudflare container (hostedmode), anything else is lanmode. Security config
  (Helmet CSP, HSTS, trust proxy) adapts automatically.

- VOACAP integration: Python subprocess (voacap-worker.py + dvoacap + numpy)
  communicates via JSON IPC through voacap-bridge.js. Batched predictions to
  avoid sequential round-trips. Falls back to simplified model if bridge unavailable.

- Security: Helmet CSP, rate limiting on all endpoints, input validation
  (whitelists for enums, regex for callsigns/IDs, range checks for lat/lon),
  SSRF prevention, XSS prevention via esc() utility, encrypted feedback emails
  (RSA-2048), no analytics/tracking.

- Current version: 0.28.2. Active development by Francisco and Steven.

================================================================================

HIGH-SIGNAL EXCERPTS

--- Excerpt 1: Client Initialization Order ---
File: src/main.js:1-22

  // Migration must run first, before state.js reads localStorage
  import { migrate, migrateV2 } from './migration.js';
  migrate();
  migrateV2();

  // Theme must apply before any rendering to avoid flash of unstyled content
  import { initTheme } from './themes.js';
  initTheme();

  import state from './state.js';
  import { $ } from './dom.js';
  import { loadSolarFieldVisibility } from './solar.js';
  import { loadLunarFieldVisibility } from './lunar.js';
  import { loadWidgetVisibility } from './widgets.js';
  import { loadSpotColumnVisibility } from './spots.js';

  // Initialize visibility state
  state.solarFieldVisibility = loadSolarFieldVisibility();
  state.lunarFieldVisibility = loadLunarFieldVisibility();
  state.widgetVisibility = loadWidgetVisibility();
  state.spotColumnVisibility = loadSpotColumnVisibility();

Why: Strict boot order — migrations fix localStorage schema before state reads it,
theme applies before DOM renders to prevent flash, then visibility flags load before
any widget initializes. Breaking this order causes visual glitches or data corruption.

--- Excerpt 2: Mode Detection ---
File: server-config.js:8-37

  function getConfig() {
    const port = parseInt(process.env.PORT, 10) || 3000;
    const isHostedmode = port === HOSTEDMODE_PORT;

    return {
      port,
      httpsPort: parseInt(process.env.HTTPS_PORT, 10) || 3443,
      host: process.env.HOST || '0.0.0.0',
      isHostedmode,
      trustProxy: isHostedmode,
      helmetOptions: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https://*.basemaps.cartocdn.com"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
            ...(isHostedmode ? {} : { upgradeInsecureRequests: null }),
          },
        },
        strictTransportSecurity: isHostedmode
          ? { maxAge: 31536000 }
          : false,
      },
    };
  }

Why: Single function drives the entire lanmode/hostedmode split. PORT=8080
(Cloudflare container) triggers cloud security config (HSTS, trust proxy).
All other ports get LAN-safe defaults (no HSTS for self-signed certs,
no upgrade-insecure-requests). No feature flags needed.

--- Excerpt 3: Theme Engine ---
File: src/themes.js:136-158

  export function applyTheme(themeId) {
    const theme = THEMES[themeId];
    if (!theme) return;

    const root = document.documentElement;

    for (const [prop, value] of Object.entries(theme.vars)) {
      root.style.setProperty(prop, value);
    }

    for (const t of Object.values(THEMES)) {
      if (t.bodyClass) document.body.classList.remove(t.bodyClass);
    }
    if (theme.bodyClass) document.body.classList.add(theme.bodyClass);

    activeThemeId = themeId;
    localStorage.setItem(STORAGE_KEY, themeId);

    import('./map-init.js').then(m => m.swapMapTiles(themeId)).catch(() => {});
  }

Why: Runtime theme switching without rebuild. Sets 30+ CSS vars on :root,
swaps body class for structural overrides (LCARS pill shapes, Terminal monospace),
persists choice, and triggers map tile swap (HamClock = political basemap,
others = dark). Dynamic import avoids circular dependency with map-init.

================================================================================

OPEN QUESTIONS
  - [ ] `src/state.js` — full state object shape (all fields with defaults and comments)
  - [ ] `src/constants.js` — HELP_TEXT entries and widget ID constants (752 LOC, largest src file)
  - [ ] `src/widgets.js` — getDefaultLayout() and redistributeRightColumn() for widget positioning
  - [ ] `src/grid-layout.js` — grid permutation system (763 LOC)
  - [ ] `src/splash.js` — onboarding/first-run flow (675 LOC)
  - [ ] `src/filters.js` — filter system architecture (713 LOC)
  - [ ] `server.js:secureFetch` — full implementation of SSRF prevention + DNS pinning
  - [ ] `voacap-bridge.js` — IPC protocol between Node and Python worker
  - [ ] `public/index.html` — HTML structure, meta tags, widget DOM IDs
  - [ ] `ROADMAP.md` — current feature priorities and planned work
```
