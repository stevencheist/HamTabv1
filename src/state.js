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
  activeMaxAge: null, // minutes (null = no filter)

  // Filter presets per source
  filterPresets: { pota: {}, sota: {}, dxc: {} },

  // Auto-refresh
  autoRefreshEnabled: true,
  countdownSeconds: 60,
  countdownTimer: null,

  // Preferences
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

  // Spot column visibility — which columns are shown in the On the Air table
  spotColumnVisibility: null, // loaded in spots.js

  // Cached data for re-render
  lastSolarData: null,
  lastLunarData: null,

  // Operator
  myCallsign: localStorage.getItem('hamtab_callsign') || '',
  myLat: null,
  myLon: null,
  manualLoc: false,
  syncingFields: false, // true while lat/lon ↔ grid sync is in progress (prevents re-entrant updates)
  gridHighlightIdx: -1, // currently highlighted index in the grid-square autocomplete dropdown (-1 = none)

  // Map
  map: null,
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
    selectedSatId: null, // currently selected satellite for pass display
  },
  n2yoApiKey: localStorage.getItem('hamtab_n2yo_apikey') || '',

  // Geodesic
  geodesicLine: null, // L.polyline for great circle path from QTH to selected spot

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
  zCounter: 10, // next z-index to assign when a widget is focused (increments on each click)

  // Reference widget
  currentReferenceTab: 'rst', // active reference tab (rst, phonetic, etc.)

  // Live Spots (PSKReporter "heard" data)
  liveSpots: {
    data: [],
    summary: {},
    lastFetch: null,
    displayMode: localStorage.getItem('hamtab_livespots_mode') || 'count', // 'count' or 'distance'
    maxAge: parseInt(localStorage.getItem('hamtab_livespots_maxage'), 10) || 60, // minutes
    visibleBands: new Set(),
  },
  liveSpotsMarkers: {},
  liveSpotsLines: null,

  // HF Propagation (24-hour matrix)
  hfPropOverlayBand: null, // currently displayed band overlay on map

  // Init flag
  appInitialized: false,

  // Day/night
  lastLocalDay: null,
  lastUtcDay: null,
};

// Migrate old SVG metric values
if (state.propMetric === 'mof_sp' || state.propMetric === 'lof_sp') {
  state.propMetric = 'mufd';
  localStorage.setItem('hamtab_prop_metric', state.propMetric);
}

// Load saved map overlays
try {
  const saved = JSON.parse(localStorage.getItem('hamtab_map_overlays'));
  if (saved) Object.assign(state.mapOverlays, saved);
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

// Load saved filter presets
try {
  const savedPresets = JSON.parse(localStorage.getItem('hamtab_filter_presets'));
  if (savedPresets) {
    state.filterPresets = { pota: {}, sota: {}, dxc: {}, ...savedPresets };
  }
} catch (e) {}

export default state;
