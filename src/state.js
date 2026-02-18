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
  propagationFilterEnabled: false, // session-only — filter spots by predicted band reliability (≥30%)

  // Filter presets per source
  filterPresets: { pota: {}, sota: {}, dxc: {} },

  // Watch list rules per source — Red (highlight), Only (include), Not (exclude)
  watchLists: (() => {
    const def = { pota: [], sota: [], dxc: [], wwff: [], psk: [] };
    try {
      const s = JSON.parse(localStorage.getItem('hamtab_watchlists'));
      if (s && typeof s === 'object' && !Array.isArray(s)) {
        for (const k of Object.keys(def)) { if (Array.isArray(s[k])) def[k] = s[k]; }
      }
    } catch (e) {}
    return def;
  })(),
  watchRedSpotIds: new Set(), // spot IDs matching "red" rules — rebuilt each filter pass

  // Auto-refresh — defaults to on, persisted in localStorage
  autoRefreshEnabled: localStorage.getItem('hamtab_auto_refresh') !== 'false',
  countdownSeconds: 60,
  countdownTimer: null,

  // Preferences
  slimHeader: localStorage.getItem('hamtab_slim_header') === 'true',
  grayscale: localStorage.getItem('hamtab_grayscale') === 'true',
  disableWxBackgrounds: localStorage.getItem('hamtab_disable_wx_bg') === 'true',
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
  mapOverlays: { latLonGrid: false, maidenheadGrid: false, timezoneGrid: false, mufImageOverlay: false, drapOverlay: false, bandPaths: false, dxpedMarkers: true, tropicsLines: false, weatherRadar: false, cloudCover: false, symbolLegend: false },

  // DXpedition time filter — 'active', '7d', '30d', '180d', 'all'
  dxpedTimeFilter: localStorage.getItem('hamtab_dxped_time_filter') || 'all',

  // Hidden DXpedition callsigns — Set of callsign strings persisted in localStorage
  hiddenDxpeditions: (() => {
    try {
      const s = JSON.parse(localStorage.getItem('hamtab_dxped_hidden'));
      if (Array.isArray(s)) return new Set(s.filter(v => typeof v === 'string'));
    } catch (e) {}
    return new Set();
  })(),

  // Source
  currentSource: localStorage.getItem('hamtab_spot_source') || 'pota',
  sourceData: { pota: [], sota: [], dxc: [], wwff: [] },
  sourceFiltered: { pota: [], sota: [], dxc: [], wwff: [] },

  // Widget visibility
  widgetVisibility: null, // loaded in widgets.js

  // Solar/Lunar field visibility
  solarFieldVisibility: null, // loaded in solar.js
  lunarFieldVisibility: null, // loaded in lunar.js

  // Spot column visibility — which columns are shown in the On the Air table
  spotColumnVisibility: null, // loaded in spots.js

  // Spot table sorting
  spotSortColumn: null, // current sort column key (null = default spotTime)
  spotSortDirection: 'desc', // 'asc' or 'desc'

  // Cached data for re-render
  lastSolarData: null,
  lastLunarData: null,
  spacewxData: null,   // { kp: [], xray: [], sfi: [], wind: [], mag: [] }
  spacewxTab: 'kp',    // active graph tab

  // Operator
  myCallsign: localStorage.getItem('hamtab_callsign') || '',
  myLat: null,
  myLon: null,
  manualLoc: false,
  syncingFields: false, // true while lat/lon ↔ grid sync is in progress (prevents re-entrant updates)
  gridHighlightIdx: -1, // currently highlighted index in the grid-square autocomplete dropdown (-1 = none)

  // Map
  map: null,
  tileLayer: null, // L.tileLayer reference for dynamic tile swaps (e.g. HamClock political map)
  clusterGroup: null,
  grayLinePolygon: null,
  dayPolygon: null,
  userMarker: null,

  // Satellites (multi-satellite tracking via N2YO)
  satellites: {
    tracked: [], // NORAD IDs of satellites to track (loaded from localStorage)
    available: [], // list of available amateur radio satellites from N2YO
    positions: {}, // { satId: { lat, lon, alt, azimuth, elevation, ... } }
    passes: {}, // { satId: { passes: [...], expires: timestamp } }
    markers: {}, // { satId: L.marker }
    circles: {}, // { satId: L.circle (footprint) }
    orbitLines: {}, // { satId: L.polyline }
    issOrbitPath: [], // ISS orbit ground track from SGP4 [{lat, lon}, ...]
    selectedSatId: null, // currently selected satellite for pass display
  },
  n2yoApiKey: localStorage.getItem('hamtab_n2yo_apikey') || '',
  maxTleAge: parseInt(localStorage.getItem('hamtab_max_tle_age'), 10) || 7, // days — warn when TLE exceeds this

  // Geodesic
  geodesicLine: null, // L.polyline for short path great circle from QTH to selected spot
  geodesicLineLong: null, // L.polyline for long path great circle from QTH to selected spot

  // Weather
  wxStation: localStorage.getItem('hamtab_wx_station') || '',
  wxApiKey: localStorage.getItem('hamtab_wx_apikey') || '',
  owmApiKey: localStorage.getItem('hamtab_owm_apikey') || '',
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
  zCounter: 10, // next z-index to assign when a widget is focused (increments on each click)

  // Free-float snap settings
  snapToGrid: localStorage.getItem('hamtab_snap_grid') !== 'false', // snap widget positions to grid (default: on)
  allowOverlap: localStorage.getItem('hamtab_allow_overlap') === 'true', // skip overlap resolution (default: off)
  customLayout: false, // true when user has customized widget positions — prevents redistributeRightColumn() from overwriting

  // Grid layout mode
  gridMode: localStorage.getItem('hamtab_grid_mode') || 'grid', // 'float' or 'grid'
  gridPermutation: localStorage.getItem('hamtab_grid_permutation') || '3L-3R', // active permutation ID
  gridAssignments: null, // loaded at grid activation — maps cell names to widget IDs
  gridSpans: null, // loaded at grid activation — per-permutation spans { cellName: spanCount }

  // Reference widget
  currentReferenceTab: 'rst', // active reference tab (rst, phonetic, etc.)

  // Update
  updateStatusPolling: null,
  updateReleaseUrl: null,

  // Live Spots (PSKReporter "heard" data)
  liveSpots: {
    data: [],
    summary: {},
    lastFetch: null,
    error: false, // true when fetch fails — shows retry message instead of eternal "Loading..."
    displayMode: localStorage.getItem('hamtab_livespots_mode') || 'count', // 'count' or 'distance'
    maxAge: parseInt(localStorage.getItem('hamtab_livespots_maxage'), 10) || 60, // minutes
    visibleBands: new Set(),
  },
  liveSpotsMarkers: {},
  liveSpotsLines: null,

  // HF Propagation (VOACAP DE→DX)
  hfPropOverlayBand: null, // currently displayed band overlay on map
  voacapPower: localStorage.getItem('hamtab_voacap_power') || '100', // watts: '5','100','1000'
  voacapMode: localStorage.getItem('hamtab_voacap_mode') || 'SSB',   // 'CW','SSB','FT8'
  voacapToa: localStorage.getItem('hamtab_voacap_toa') || '5',       // takeoff angle degrees: '3','5','10','15'
  voacapPath: localStorage.getItem('hamtab_voacap_path') || 'SP',    // 'SP' (short path), 'LP' (long path)

  // VOACAP server data
  voacapServerData: null,       // latest /api/voacap response (matrix from server)
  voacapEngine: 'simplified',   // 'dvoacap' or 'simplified' — which engine produced the data
  voacapTarget: localStorage.getItem('hamtab_voacap_target') || 'overview', // 'overview' or 'spot'
  voacapAutoSpot: localStorage.getItem('hamtab_voacap_auto_spot') === 'true', // auto-switch to SPOT on selection
  voacapSensitivity: parseInt(localStorage.getItem('hamtab_voacap_sensitivity'), 10) || 3, // 1-5 SNR sensitivity (3=default)
  voacapLastFetch: 0,           // timestamp of last successful /api/voacap fetch

  // Heatmap overlay (REL mode for VOACAP)
  heatmapOverlayMode: localStorage.getItem('hamtab_heatmap_mode') || 'circles', // 'circles' or 'heatmap'
  heatmapLayer: null,       // L.imageOverlay instance
  heatmapRenderTimer: null, // debounce timer for pan/zoom re-render
  voacapParamTimer: null,   // debounce timer for power/mode/TOA/path button clicks

  // Beacons / DXpeditions / Contests
  beaconTimer: null,          // setInterval ID for 1-second beacon updates
  dedxTimer: null,            // setInterval ID for 1-second DE/DX Info clock updates
  stopwatchTimer: null,       // setInterval ID for 100ms stopwatch/countdown updates
  lastDxpeditionData: null,   // cached /api/dxpeditions response
  lastContestData: null,      // cached /api/contests response

  // Mobile tab bar
  activeTab: localStorage.getItem('hamtab_active_tab') || 'widget-map',

  // Progressive scaling
  reflowActive: false, // true when viewport < SCALE_REFLOW_WIDTH (Zone C columnar layout)

  // Init flag
  appInitialized: false,

  // Sun/Moon sub-point positions
  sunLat: null,         // sub-solar latitude (degrees) — declination
  sunLon: null,         // sub-solar longitude (degrees)
  moonLat: null,        // sub-lunar latitude (degrees) — declination
  moonLon: null,        // sub-lunar longitude (degrees)
  sunMarker: null,      // L.marker for sun position on map
  moonMarker: null,     // L.marker for moon position on map
  beaconMarkers: {},    // { freq: L.circleMarker } for active NCDXF beacon map markers
  dxpedMarkers: [],     // L.circleMarker[] for DXpedition map markers
  dxPathLines: [],      // L.polyline[] for band-colored DX contact paths

  // Clock face config
  clockFace: localStorage.getItem('hamtab_clock_face') || 'classic',
  clockComplications: (() => {
    try {
      const s = JSON.parse(localStorage.getItem('hamtab_clock_complications'));
      if (s && typeof s === 'object' && !Array.isArray(s)) return s;
    } catch (e) {}
    return {}; // all off by default — user opts in
  })(),

  // Day/night
  lastLocalDay: null,
  lastUtcDay: null,
};

// Migrate old SVG metric values
if (state.propMetric === 'mof_sp' || state.propMetric === 'lof_sp') {
  state.propMetric = 'mufd';
  localStorage.setItem('hamtab_prop_metric', state.propMetric);
}

// Load saved map overlays (filter prototype pollution keys)
try {
  const saved = JSON.parse(localStorage.getItem('hamtab_map_overlays'));
  if (saved && typeof saved === 'object') {
    for (const key of Object.keys(saved)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
      if (key in state.mapOverlays) state.mapOverlays[key] = !!saved[key];
    }
  }
} catch (e) {}

// Load saved manual location
const savedLat = localStorage.getItem('hamtab_lat');
const savedLon = localStorage.getItem('hamtab_lon');
if (savedLat !== null && savedLon !== null) {
  state.myLat = parseFloat(savedLat);
  state.myLon = parseFloat(savedLon);
  if (!isNaN(state.myLat) && !isNaN(state.myLon)) {
    state.manualLoc = true;
  } else {
    state.myLat = null;
    state.myLon = null;
  }
}

// Fall back to cached GPS location if no manual override
if (!state.manualLoc) {
  const gpsLat = localStorage.getItem('hamtab_gps_lat');
  const gpsLon = localStorage.getItem('hamtab_gps_lon');
  if (gpsLat !== null && gpsLon !== null) {
    const lat = parseFloat(gpsLat);
    const lon = parseFloat(gpsLon);
    if (!isNaN(lat) && !isNaN(lon)) {
      state.myLat = lat;
      state.myLon = lon;
    }
  }
}

// Load tracked satellites from localStorage (default to ISS if empty)
try {
  const savedTracked = JSON.parse(localStorage.getItem('hamtab_sat_tracked'));
  if (Array.isArray(savedTracked) && savedTracked.length > 0) {
    state.satellites.tracked = savedTracked;
  } else {
    state.satellites.tracked = [25544]; // ISS default
  }
} catch {
  state.satellites.tracked = [25544];
}

// Load saved filter presets (validate shape — only known source keys)
try {
  const savedPresets = JSON.parse(localStorage.getItem('hamtab_filter_presets'));
  if (savedPresets && typeof savedPresets === 'object' && !Array.isArray(savedPresets)) {
    const validSources = ['pota', 'sota', 'dxc', 'wwff', 'psk'];
    for (const k of validSources) {
      if (savedPresets[k] && typeof savedPresets[k] === 'object') state.filterPresets[k] = savedPresets[k];
    }
  }
} catch (e) {}

export default state;
