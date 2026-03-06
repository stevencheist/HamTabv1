# Excerpts Pack — HamTabV1 (Copilot Open Questions)

Generated in response to Copilot's Open Questions checklist from tasks A-D.

```
EXCERPTS_MANIFEST
  repo: stevencheist/HamTabv1
  ref: c56d8b4d3808f45fa7f57e75ef8a244d4420ef58
  generated_at: 2026-02-07T16:00:00Z
  lens: full
  purpose: Resolve Copilot Open Questions for architecture docs A-D
```

---

## 1. `src/state.js` — Full File (246 lines)

```javascript
const state = {
  // Markers & selection
  markers: {},
  selectedSpotId: null,

  // Filters — multi-select bands/modes stored as Sets
  activeBands: new Set(),
  activeModes: new Set(),
  activeCountry: null,
  activeState: null,
  activeGrid: null,
  activeContinent: null,
  activeMaxDistance: null, // miles (null = no filter)
  distanceUnit: localStorage.getItem('hamtab_distance_unit') || 'mi',
  temperatureUnit: localStorage.getItem('hamtab_temperature_unit') || 'F', // F or C
  activeMaxAge: null, // minutes (null = no filter)

  // Filter presets per source
  filterPresets: { pota: {}, sota: {}, dxc: {} },

  // Auto-refresh — defaults to on, persisted in localStorage
  autoRefreshEnabled: localStorage.getItem('hamtab_auto_refresh') !== 'false',
  countdownSeconds: 60,
  countdownTimer: null,

  // Preferences
  slimHeader: localStorage.getItem('hamtab_slim_header') === 'true',
  use24h: localStorage.getItem('hamtab_time24') !== 'false',
  privilegeFilterEnabled: localStorage.getItem('hamtab_privilege_filter') === 'true',
  licenseClass: localStorage.getItem('hamtab_license_class') || '',
  propMetric: localStorage.getItem('hamtab_prop_metric') || 'mufd',
  mapCenterMode: localStorage.getItem('hamtab_map_center') || 'qth',

  // Map layers
  propLayer: null,
  propLabelLayer: null,
  latLonLayer: null,
  maidenheadLayer: null,
  timezoneLayer: null,
  maidenheadDebounceTimer: null,

  // Map overlay config
  mapOverlays: { latLonGrid: false, maidenheadGrid: false, timezoneGrid: false },

  // Source
  currentSource: localStorage.getItem('hamtab_spot_source') || 'pota',
  sourceData: { pota: [], sota: [], dxc: [] },
  sourceFiltered: { pota: [], sota: [], dxc: [] },

  // Widget visibility
  widgetVisibility: null, // loaded in widgets.js

  // Solar/Lunar field visibility
  solarFieldVisibility: null, // loaded in solar.js
  lunarFieldVisibility: null, // loaded in lunar.js

  // Spot column visibility
  spotColumnVisibility: null, // loaded in spots.js

  // Spot table sorting
  spotSortColumn: null,
  spotSortDirection: 'desc',

  // Cached data for re-render
  lastSolarData: null,
  lastLunarData: null,
  spacewxData: null,
  spacewxTab: 'kp',

  // Operator
  myCallsign: localStorage.getItem('hamtab_callsign') || '',
  myLat: null,
  myLon: null,
  manualLoc: false,
  syncingFields: false,
  gridHighlightIdx: -1,

  // Map
  map: null,
  tileLayer: null,
  clusterGroup: null,
  grayLinePolygon: null,
  dayPolygon: null,
  userMarker: null,

  // Satellites
  satellites: {
    tracked: [],
    available: [],
    positions: {},
    passes: {},
    markers: {},
    circles: {},
    orbitLines: {},
    issOrbitPath: [],
    selectedSatId: null,
  },
  n2yoApiKey: localStorage.getItem('hamtab_n2yo_apikey') || '',

  // Geodesic
  geodesicLine: null,
  geodesicLineLong: null,

  // Weather
  wxStation: localStorage.getItem('hamtab_wx_station') || '',
  wxApiKey: localStorage.getItem('hamtab_wx_apikey') || '',
  nwsAlerts: [],
  weatherTimer: null,
  nwsCondTimer: null,
  nwsAlertTimer: null,

  // Callsign cache
  callsignCache: {},

  // Tooltip
  tooltipHideTimer: null,
  currentHoverTd: null,

  // Widgets
  zCounter: 10,

  // Grid layout mode
  gridMode: localStorage.getItem('hamtab_grid_mode') || 'float',
  gridPermutation: localStorage.getItem('hamtab_grid_permutation') || '3L-3R',
  gridAssignments: null,

  // Reference widget
  currentReferenceTab: 'rst',

  // Update
  updateStatusPolling: null,
  updateReleaseUrl: null,

  // Live Spots
  liveSpots: {
    data: [],
    summary: {},
    lastFetch: null,
    displayMode: localStorage.getItem('hamtab_livespots_mode') || 'count',
    maxAge: parseInt(localStorage.getItem('hamtab_livespots_maxage'), 10) || 60,
    visibleBands: new Set(),
  },
  liveSpotsMarkers: {},
  liveSpotsLines: null,

  // HF Propagation (VOACAP)
  hfPropOverlayBand: null,
  voacapPower: localStorage.getItem('hamtab_voacap_power') || '100',
  voacapMode: localStorage.getItem('hamtab_voacap_mode') || 'SSB',
  voacapToa: localStorage.getItem('hamtab_voacap_toa') || '5',
  voacapPath: localStorage.getItem('hamtab_voacap_path') || 'SP',

  // VOACAP server data
  voacapServerData: null,
  voacapEngine: 'simplified',
  voacapTarget: localStorage.getItem('hamtab_voacap_target') || 'overview',
  voacapLastFetch: 0,

  // Heatmap overlay
  heatmapOverlayMode: localStorage.getItem('hamtab_heatmap_mode') || 'circles',
  heatmapLayer: null,
  heatmapRenderTimer: null,

  // Beacons / DXpeditions / Contests
  beaconTimer: null,
  lastDxpeditionData: null,
  lastContestData: null,

  // Init flag
  appInitialized: false,

  // Sun/Moon sub-point positions
  sunLat: null, sunLon: null,
  moonLat: null, moonLon: null,
  sunMarker: null, moonMarker: null,
  beaconMarkers: {},

  // Day/night
  lastLocalDay: null,
  lastUtcDay: null,
};

// Post-init: migrate old prop metric, load overlays, load location, load satellites, load presets
// (see full file for initialization logic after the state object)

export default state;
```

---

## 2. `src/constants.js` — Widget IDs + HELP_TEXT (excerpts)

### WIDGET_DEFS (lines 4-21)

```javascript
export const WIDGET_DEFS = [
  { id: 'widget-filters',     name: 'Filters' },
  { id: 'widget-activations', name: 'On the Air' },
  { id: 'widget-map',         name: 'HamMap' },
  { id: 'widget-solar',       name: 'Solar' },
  { id: 'widget-spacewx',     name: 'Space Wx' },
  { id: 'widget-propagation', name: 'Band Conditions' },
  { id: 'widget-voacap',      name: 'VOACAP DE→DX' },
  { id: 'widget-live-spots',  name: 'Live Spots' },
  { id: 'widget-lunar',       name: 'Lunar / EME' },
  { id: 'widget-satellites',  name: 'Satellites' },
  { id: 'widget-rst',          name: 'Reference' },
  { id: 'widget-spot-detail', name: 'DX Detail' },
  { id: 'widget-contests',     name: 'Contests' },
  { id: 'widget-dxpeditions',  name: 'DXpeditions' },
  { id: 'widget-beacons',      name: 'NCDXF Beacons' },
  { id: 'widget-dedx',         name: 'DE/DX Info' },
];
```

### WIDGET_HELP keys (lines 257-487)

16 primary widgets + 4 Reference subtabs:
- `widget-filters`, `widget-activations`, `widget-map`, `widget-solar`
- `widget-spacewx`, `widget-propagation`, `widget-lunar`, `widget-satellites`
- `widget-rst`, `widget-spot-detail`, `widget-contests`, `widget-dxpeditions`
- `widget-beacons`, `widget-dedx`, `widget-live-spots`, `widget-voacap`
- Subtabs: `widget-rst:phonetic`, `widget-rst:morse`, `widget-rst:qcodes`, `widget-rst:bands`

Each entry has: `title`, `description`, `sections[]` (heading + content), optional `links[]`.

### Storage Keys (lines 605-606)

```javascript
export const WIDGET_STORAGE_KEY = 'hamtab_widgets';
export const USER_LAYOUT_KEY = 'hamtab_widgets_user';
```

### GRID_DEFAULT_ASSIGNMENTS (lines 707-752)

5 permutations: `2L-2R`, `3L-3R`, `1T-2L-2R-1B`, `1T-3L-3R-1B`, `2T-3L-3R-2B`
Each maps cell names (L1, R1, T1, B1, etc.) to widget IDs.

---

## 3. `server.js` — secureFetch() + Helpers (lines 2439-2550)

### Constants
```javascript
const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
```

### isPrivateIP(ip) — lines 2445-2468
```javascript
function isPrivateIP(ip) {
  if (ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true;
  if (ip.startsWith('fe80')) return true;
  if (ip === '::') return true;
  if (ip.startsWith('::ffff:')) return isPrivateIP(ip.substring(7));

  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}
```

### resolveHost(hostname) — lines 2470-2477
```javascript
async function resolveHost(hostname) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) return hostname;
  const { address } = await dns.promises.lookup(hostname);
  return address;
}
```

### secureFetch(url, redirectCount) — lines 2479-2541
```javascript
function secureFetch(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) return reject(new Error('Too many redirects'));

    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return reject(new Error('Only HTTPS URLs are allowed'));

    resolveHost(parsed.hostname).then((resolvedIP) => {
      if (isPrivateIP(resolvedIP)) return reject(new Error('Requests to private addresses are blocked'));

      const options = {
        hostname: resolvedIP,
        path: parsed.pathname + parsed.search,
        port: parsed.port || 443,
        headers: { 'User-Agent': 'HamTab/1.0', 'Host': parsed.hostname },
        servername: parsed.hostname,
      };

      const req = https.get(options, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          resp.resume();
          return secureFetch(resp.headers.location, redirectCount + 1).then(resolve).catch(reject);
        }
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          resp.resume();
          return reject(new Error(`HTTP ${resp.statusCode}`));
        }

        let data = '', bytes = 0;
        resp.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) { resp.destroy(); return reject(new Error('Response too large')); }
          data += chunk;
        });
        resp.on('end', () => resolve(data));
        resp.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(REQUEST_TIMEOUT_MS, () => { req.destroy(); reject(new Error('Request timed out')); });
    }).catch(reject);
  });
}
```

### Wrappers — lines 2543-2550
```javascript
async function fetchJSON(url) { const data = await secureFetch(url); return JSON.parse(data); }
async function fetchText(url) { return secureFetch(url); }
```

### Validation Pipeline (pseudocode)
```
1. Reject non-HTTPS URLs
2. DNS resolve hostname → IP address
3. Check IP against isPrivateIP() → reject RFC 1918, loopback, link-local, IPv6 mapped
4. Pin resolved IP in request options (prevents TOCTOU/DNS rebinding)
5. Set Host header to original hostname (for virtual hosting + TLS SNI)
6. Follow redirects (max 5), re-validating each hop
7. Enforce 10s timeout
8. Enforce 5MB response size limit
9. Return response body as string
```

---

## 4. `voacap-bridge.js` — Full IPC Protocol (310 lines)

### Protocol: JSON-RPC over stdin/stdout (newline-delimited)

**Request format** (Node → Python):
```json
{"id": 1, "action": "ping"}
{"id": 2, "action": "predict", "params": {...}}
{"id": 3, "action": "predict_matrix", "params": {...}}
```

**Response format** (Python → Node):
```json
{"id": 1, "ok": true, "engine": "dvoacap"}
{"id": 2, "ok": true, "results": {...}}
{"ok": false, "error": "dvoacap-python not installed: ..."}
```

### Actions

| Action | Timeout | Purpose |
|--------|---------|---------|
| `ping` | 5s | Startup health check — confirms dvoacap engine loaded |
| `predict` | 5s | Single point-to-point prediction |
| `predict_matrix` | 180s | Batch: all hours × all targets in one call |

### Predict params (from server.js /api/voacap endpoint):
```json
{
  "tx_lat": 33.0, "tx_lon": -98.0,
  "rx_lat": 48.0, "rx_lon": 2.0,
  "ssn": 150, "month": 2, "utc_hour": 14,
  "power": 100, "min_angle_deg": 5,
  "long_path": false,
  "required_snr": -10,
  "bandwidth_hz": 2500,
  "frequencies": [3.5, 7.0, 10.1, 14.0, 18.068, 21.0, 24.89, 28.0]
}
```

### Lifecycle
1. `init()` — spawns Python, tries candidates (python3.13 → python3.12 → ... → python)
2. Retries pings every 2s for up to 30s (Python + numpy + dvoacap is slow to load)
3. If all candidates fail, retries full spawn every 30s for 5 minutes
4. On crash post-init: respawns after 30s
5. `shutdown()` — closes stdin, force-kills after 1s

### Error Handling
- Individual request timeouts (5s single / 180s batch)
- All pending requests rejected on worker death
- `lastError` captured from stderr for `/api/voacap/status` diagnostics
- `getStatus()` returns: available, fullyInitialized, spawnAttempts, lastError, uptime, childRunning

---

## 5. `public/index.html` — Structure Summary (760 lines)

### Head
- SEO meta tags (title, description, keywords, author, theme-color)
- Open Graph + Twitter Card meta tags
- JSON-LD structured data (SoftwareApplication schema)
- Canonical URL: https://hamtab.net
- Vendor CSS: Leaflet, MarkerCluster
- App CSS: style.css

### Body Structure
- `<noscript>` — SEO-visible fallback content (features, deployment options, HamClock alternative pitch)
- `#splash` — Config modal (5 tabs: Station, Display, Appearance, Services, About)
- Config overlays: `#solarCfgSplash`, `#lunarCfgSplash`, `#spotColCfgSplash`
- `<header>` — Op info (call/name/loc), clocks (local + UTC + weather), buttons (refresh/reset/fullscreen/feedback/coffee/update)
- `#widgetArea` — 16 widgets, each with `.widget-header` (title + help btn + optional cfg btn) + `.widget-body` + `.widget-resize`
- Post-widget overlays: map overlay config, live spots config, satellite config, weather alerts, help modal, feedback modal
- Scripts: leaflet.js, leaflet.markercluster.js, app.js

### Widget DOM IDs (in order)
`widget-filters`, `widget-activations`, `widget-map`, `widget-solar`, `widget-spacewx`, `widget-propagation`, `widget-voacap`, `widget-live-spots`, `widget-lunar`, `widget-satellites`, `widget-rst`, `widget-spot-detail`, `widget-contests`, `widget-dxpeditions`, `widget-beacons`, `widget-dedx`

---

## 6. `src/grid-layout.js` — Key Function Signatures (763 lines)

**Note:** `getDefaultLayout()` and `redistributeRightColumn()` are in `src/widgets.js`, not grid-layout.js.

### Exported Functions

| Function | Line | Purpose |
|----------|------|---------|
| `repositionGridHandles()` | 164 | Reposition track resize handles after layout changes |
| `isGridMode()` | 508 | Returns true if grid layout is active |
| `getGridPermutation(permId)` | 512 | Look up permutation config by ID |
| `loadGridAssignments()` | 516 | Load widget-to-cell assignments from localStorage or defaults |
| `saveGridAssignments()` | 529 | Persist current assignments to localStorage |
| `saveGridMode()` | 533 | Persist grid/float mode to localStorage |
| `saveGridPermutation()` | 537 | Persist active permutation ID |
| `activateGridMode(permId)` | 541 | Switch to grid layout — applies CSS Grid, creates flex wrappers, populates cells |
| `deactivateGridMode()` | 577 | Switch back to float layout — removes grid CSS, restores saved positions |
| `applyGridAssignments(customSizes)` | 626 | Populate flex wrappers with widgets per current assignments |
| `resetGridAssignments()` | 665 | Reset to default widget assignments for current permutation |
| `handleGridDragStart(widget, e)` | 686 | Initiate drag-to-swap between grid cells |
