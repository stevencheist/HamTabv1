(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __esm = (fn, res) => function __init() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/state.js
  var state, savedLat, savedLon, state_default;
  var init_state = __esm({
    "src/state.js"() {
      state = {
        // Markers & selection
        markers: {},
        selectedSpotId: null,
        // Filters — multi-select bands/modes stored as Sets
        activeBands: /* @__PURE__ */ new Set(),
        activeModes: /* @__PURE__ */ new Set(),
        activeCountry: null,
        activeState: null,
        activeGrid: null,
        activeContinent: null,
        activeMaxDistance: null,
        // miles (null = no filter)
        distanceUnit: localStorage.getItem("hamtab_distance_unit") || "mi",
        temperatureUnit: localStorage.getItem("hamtab_temperature_unit") || "F",
        // F or C
        activeMaxAge: null,
        // minutes (null = no filter)
        propagationFilterEnabled: false,
        // session-only — filter spots by predicted band reliability (≥30%)
        // Filter presets per source
        filterPresets: { pota: {}, sota: {}, dxc: {} },
        // Watch list rules per source — Red (highlight), Only (include), Not (exclude)
        watchLists: (() => {
          const def = { pota: [], sota: [], dxc: [], wwff: [], psk: [] };
          try {
            const s = JSON.parse(localStorage.getItem("hamtab_watchlists"));
            if (s && typeof s === "object" && !Array.isArray(s)) {
              for (const k of Object.keys(def)) {
                if (Array.isArray(s[k])) def[k] = s[k];
              }
            }
          } catch (e) {
          }
          return def;
        })(),
        watchRedSpotIds: /* @__PURE__ */ new Set(),
        // spot IDs matching "red" rules — rebuilt each filter pass
        // Auto-refresh — defaults to on, persisted in localStorage
        autoRefreshEnabled: localStorage.getItem("hamtab_auto_refresh") !== "false",
        countdownSeconds: 60,
        countdownTimer: null,
        // Preferences
        slimHeader: localStorage.getItem("hamtab_slim_header") === "true",
        grayscale: localStorage.getItem("hamtab_grayscale") === "true",
        disableWxBackgrounds: localStorage.getItem("hamtab_disable_wx_bg") === "true",
        use24h: localStorage.getItem("hamtab_time24") !== "false",
        privilegeFilterEnabled: localStorage.getItem("hamtab_privilege_filter") === "true",
        licenseClass: localStorage.getItem("hamtab_license_class") || "",
        propMetric: localStorage.getItem("hamtab_prop_metric") || "mufd",
        mapCenterMode: localStorage.getItem("hamtab_map_center") || "qth",
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
        dxpedTimeFilter: localStorage.getItem("hamtab_dxped_time_filter") || "all",
        // Hidden DXpedition callsigns — Set of callsign strings persisted in localStorage
        hiddenDxpeditions: (() => {
          try {
            const s = JSON.parse(localStorage.getItem("hamtab_dxped_hidden"));
            if (Array.isArray(s)) return new Set(s.filter((v) => typeof v === "string"));
          } catch (e) {
          }
          return /* @__PURE__ */ new Set();
        })(),
        // Source
        currentSource: localStorage.getItem("hamtab_spot_source") || "pota",
        sourceData: { pota: [], sota: [], dxc: [], wwff: [] },
        sourceFiltered: { pota: [], sota: [], dxc: [], wwff: [] },
        // Widget visibility
        widgetVisibility: null,
        // loaded in widgets.js
        // Solar/Lunar field visibility
        solarFieldVisibility: null,
        // loaded in solar.js
        lunarFieldVisibility: null,
        // loaded in lunar.js
        // Spot column visibility — which columns are shown in the On the Air table
        spotColumnVisibility: null,
        // loaded in spots.js
        // Spot table sorting
        spotSortColumn: null,
        // current sort column key (null = default spotTime)
        spotSortDirection: "desc",
        // 'asc' or 'desc'
        // Cached data for re-render
        lastSolarData: null,
        lastLunarData: null,
        spacewxData: null,
        // { kp: [], xray: [], sfi: [], wind: [], mag: [] }
        spacewxTab: "kp",
        // active graph tab
        // Operator
        myCallsign: localStorage.getItem("hamtab_callsign") || "",
        myLat: null,
        myLon: null,
        manualLoc: false,
        syncingFields: false,
        // true while lat/lon ↔ grid sync is in progress (prevents re-entrant updates)
        gridHighlightIdx: -1,
        // currently highlighted index in the grid-square autocomplete dropdown (-1 = none)
        // Map
        map: null,
        tileLayer: null,
        // L.tileLayer reference for dynamic tile swaps (e.g. HamClock political map)
        clusterGroup: null,
        grayLinePolygon: null,
        dayPolygon: null,
        userMarker: null,
        // Satellites (multi-satellite tracking via N2YO)
        satellites: {
          tracked: [],
          // NORAD IDs of satellites to track (loaded from localStorage)
          available: [],
          // list of available amateur radio satellites from N2YO
          positions: {},
          // { satId: { lat, lon, alt, azimuth, elevation, ... } }
          passes: {},
          // { satId: { passes: [...], expires: timestamp } }
          markers: {},
          // { satId: L.marker }
          circles: {},
          // { satId: L.circle (footprint) }
          orbitLines: {},
          // { satId: L.polyline }
          issOrbitPath: [],
          // ISS orbit ground track from SGP4 [{lat, lon}, ...]
          selectedSatId: null
          // currently selected satellite for pass display
        },
        n2yoApiKey: localStorage.getItem("hamtab_n2yo_apikey") || "",
        maxTleAge: parseInt(localStorage.getItem("hamtab_max_tle_age"), 10) || 7,
        // days — warn when TLE exceeds this
        // Geodesic
        geodesicLine: null,
        // L.polyline for short path great circle from QTH to selected spot
        geodesicLineLong: null,
        // L.polyline for long path great circle from QTH to selected spot
        // Weather
        wxStation: localStorage.getItem("hamtab_wx_station") || "",
        wxApiKey: localStorage.getItem("hamtab_wx_apikey") || "",
        owmApiKey: localStorage.getItem("hamtab_owm_apikey") || "",
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
        // next z-index to assign when a widget is focused (increments on each click)
        // Grid layout mode
        gridMode: localStorage.getItem("hamtab_grid_mode") || "grid",
        // 'float' or 'grid'
        gridPermutation: localStorage.getItem("hamtab_grid_permutation") || "3L-3R",
        // active permutation ID
        gridAssignments: null,
        // loaded at grid activation — maps cell names to widget IDs
        gridSpans: null,
        // loaded at grid activation — per-permutation spans { cellName: spanCount }
        // Reference widget
        currentReferenceTab: "rst",
        // active reference tab (rst, phonetic, etc.)
        // Update
        updateStatusPolling: null,
        updateReleaseUrl: null,
        // Live Spots (PSKReporter "heard" data)
        liveSpots: {
          data: [],
          summary: {},
          lastFetch: null,
          error: false,
          // true when fetch fails — shows retry message instead of eternal "Loading..."
          displayMode: localStorage.getItem("hamtab_livespots_mode") || "count",
          // 'count' or 'distance'
          maxAge: parseInt(localStorage.getItem("hamtab_livespots_maxage"), 10) || 60,
          // minutes
          visibleBands: /* @__PURE__ */ new Set()
        },
        liveSpotsMarkers: {},
        liveSpotsLines: null,
        // HF Propagation (VOACAP DE→DX)
        hfPropOverlayBand: null,
        // currently displayed band overlay on map
        voacapPower: localStorage.getItem("hamtab_voacap_power") || "100",
        // watts: '5','100','1000'
        voacapMode: localStorage.getItem("hamtab_voacap_mode") || "SSB",
        // 'CW','SSB','FT8'
        voacapToa: localStorage.getItem("hamtab_voacap_toa") || "5",
        // takeoff angle degrees: '3','5','10','15'
        voacapPath: localStorage.getItem("hamtab_voacap_path") || "SP",
        // 'SP' (short path), 'LP' (long path)
        // VOACAP server data
        voacapServerData: null,
        // latest /api/voacap response (matrix from server)
        voacapEngine: "simplified",
        // 'dvoacap' or 'simplified' — which engine produced the data
        voacapTarget: localStorage.getItem("hamtab_voacap_target") || "overview",
        // 'overview' or 'spot'
        voacapAutoSpot: localStorage.getItem("hamtab_voacap_auto_spot") === "true",
        // auto-switch to SPOT on selection
        voacapSensitivity: parseInt(localStorage.getItem("hamtab_voacap_sensitivity"), 10) || 3,
        // 1-5 SNR sensitivity (3=default)
        voacapLastFetch: 0,
        // timestamp of last successful /api/voacap fetch
        // Heatmap overlay (REL mode for VOACAP)
        heatmapOverlayMode: localStorage.getItem("hamtab_heatmap_mode") || "circles",
        // 'circles' or 'heatmap'
        heatmapLayer: null,
        // L.imageOverlay instance
        heatmapRenderTimer: null,
        // debounce timer for pan/zoom re-render
        voacapParamTimer: null,
        // debounce timer for power/mode/TOA/path button clicks
        // Beacons / DXpeditions / Contests
        beaconTimer: null,
        // setInterval ID for 1-second beacon updates
        dedxTimer: null,
        // setInterval ID for 1-second DE/DX Info clock updates
        stopwatchTimer: null,
        // setInterval ID for 100ms stopwatch/countdown updates
        lastDxpeditionData: null,
        // cached /api/dxpeditions response
        lastContestData: null,
        // cached /api/contests response
        // Mobile tab bar
        activeTab: localStorage.getItem("hamtab_active_tab") || "widget-map",
        // Progressive scaling
        reflowActive: false,
        // true when viewport < SCALE_REFLOW_WIDTH (Zone C columnar layout)
        // Init flag
        appInitialized: false,
        // Sun/Moon sub-point positions
        sunLat: null,
        // sub-solar latitude (degrees) — declination
        sunLon: null,
        // sub-solar longitude (degrees)
        moonLat: null,
        // sub-lunar latitude (degrees) — declination
        moonLon: null,
        // sub-lunar longitude (degrees)
        sunMarker: null,
        // L.marker for sun position on map
        moonMarker: null,
        // L.marker for moon position on map
        beaconMarkers: {},
        // { freq: L.circleMarker } for active NCDXF beacon map markers
        dxpedMarkers: [],
        // L.circleMarker[] for DXpedition map markers
        dxPathLines: [],
        // L.polyline[] for band-colored DX contact paths
        // Clock face config
        clockFace: localStorage.getItem("hamtab_clock_face") || "classic",
        clockComplications: (() => {
          try {
            const s = JSON.parse(localStorage.getItem("hamtab_clock_complications"));
            if (s && typeof s === "object" && !Array.isArray(s)) return s;
          } catch (e) {
          }
          return {};
        })(),
        // Day/night
        lastLocalDay: null,
        lastUtcDay: null
      };
      if (state.propMetric === "mof_sp" || state.propMetric === "lof_sp") {
        state.propMetric = "mufd";
        localStorage.setItem("hamtab_prop_metric", state.propMetric);
      }
      try {
        const saved = JSON.parse(localStorage.getItem("hamtab_map_overlays"));
        if (saved && typeof saved === "object") {
          for (const key of Object.keys(saved)) {
            if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
            if (key in state.mapOverlays) state.mapOverlays[key] = !!saved[key];
          }
        }
      } catch (e) {
      }
      savedLat = localStorage.getItem("hamtab_lat");
      savedLon = localStorage.getItem("hamtab_lon");
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
      if (!state.manualLoc) {
        const gpsLat = localStorage.getItem("hamtab_gps_lat");
        const gpsLon = localStorage.getItem("hamtab_gps_lon");
        if (gpsLat !== null && gpsLon !== null) {
          const lat = parseFloat(gpsLat);
          const lon = parseFloat(gpsLon);
          if (!isNaN(lat) && !isNaN(lon)) {
            state.myLat = lat;
            state.myLon = lon;
          }
        }
      }
      try {
        const savedTracked = JSON.parse(localStorage.getItem("hamtab_sat_tracked"));
        if (Array.isArray(savedTracked) && savedTracked.length > 0) {
          state.satellites.tracked = savedTracked;
        } else {
          state.satellites.tracked = [25544];
        }
      } catch {
        state.satellites.tracked = [25544];
      }
      try {
        const savedPresets = JSON.parse(localStorage.getItem("hamtab_filter_presets"));
        if (savedPresets && typeof savedPresets === "object" && !Array.isArray(savedPresets)) {
          const validSources = ["pota", "sota", "dxc", "wwff", "psk"];
          for (const k of validSources) {
            if (savedPresets[k] && typeof savedPresets[k] === "object") state.filterPresets[k] = savedPresets[k];
          }
        }
      } catch (e) {
      }
      state_default = state;
    }
  });

  // src/geo.js
  var geo_exports = {};
  __export(geo_exports, {
    bearingTo: () => bearingTo,
    bearingToCardinal: () => bearingToCardinal,
    distanceMi: () => distanceMi,
    geodesicPoints: () => geodesicPoints,
    getSunTimes: () => getSunTimes,
    gridToLatLon: () => gridToLatLon,
    isDaytime: () => isDaytime,
    latLonToCardinal: () => latLonToCardinal,
    latLonToGrid: () => latLonToGrid,
    localDateAtLon: () => localDateAtLon,
    localTimeAtLon: () => localTimeAtLon,
    utcOffsetFromLon: () => utcOffsetFromLon
  });
  function latLonToGrid(lat, lon) {
    lon += 180;
    lat += 90;
    const a = String.fromCharCode(65 + Math.floor(lon / 20));
    const b = String.fromCharCode(65 + Math.floor(lat / 10));
    const c = Math.floor(lon % 20 / 2);
    const d = Math.floor(lat % 10 / 1);
    const e = String.fromCharCode(97 + Math.floor(lon % 2 * 12));
    const f = String.fromCharCode(97 + Math.floor(lat % 1 * 24));
    return a + b + c + d + e + f;
  }
  function gridToLatLon(grid) {
    if (!grid || grid.length !== 4) return null;
    const g = grid.toUpperCase();
    if (!/^[A-R]{2}[0-9]{2}$/.test(g)) return null;
    const lon = (g.charCodeAt(0) - 65) * 20 + parseInt(g[2]) * 2 + 1 - 180;
    const lat = (g.charCodeAt(1) - 65) * 10 + parseInt(g[3]) * 1 + 0.5 - 90;
    return { lat, lon };
  }
  function bearingTo(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const dLon = (lon2 - lon1) * r;
    const y = Math.sin(dLon) * Math.cos(lat2 * r);
    const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
    return (Math.atan2(y, x) / r + 360) % 360;
  }
  function bearingToCardinal(deg) {
    const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
    return dirs[Math.round(deg / 45) % 8];
  }
  function distanceMi(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const R3 = 3958.8;
    const dLat = (lat2 - lat1) * r;
    const dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return R3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function geodesicPoints(lat1, lon1, lat2, lon2, n) {
    const r = Math.PI / 180;
    const p1 = [lat1 * r, lon1 * r];
    const p2 = [lat2 * r, lon2 * r];
    const d = 2 * Math.asin(Math.sqrt(
      Math.sin((p1[0] - p2[0]) / 2) ** 2 + Math.cos(p1[0]) * Math.cos(p2[0]) * Math.sin((p1[1] - p2[1]) / 2) ** 2
    ));
    if (d < 1e-10) return [[lat1, lon1], [lat2, lon2]];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const a = Math.sin((1 - f) * d) / Math.sin(d);
      const b = Math.sin(f * d) / Math.sin(d);
      const x = a * Math.cos(p1[0]) * Math.cos(p1[1]) + b * Math.cos(p2[0]) * Math.cos(p2[1]);
      const y = a * Math.cos(p1[0]) * Math.sin(p1[1]) + b * Math.cos(p2[0]) * Math.sin(p2[1]);
      const z = a * Math.sin(p1[0]) + b * Math.sin(p2[0]);
      pts.push([Math.atan2(z, Math.sqrt(x * x + y * y)) / r, Math.atan2(y, x) / r]);
    }
    return pts;
  }
  function getSunTimes(lat, lon, date) {
    const rad = Math.PI / 180;
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 864e5);
    const zenith = 90.833;
    const lngHour = lon / 15;
    function calc(rising) {
      const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
      const M = 0.9856 * t - 3.289;
      let L2 = M + 1.916 * Math.sin(M * rad) + 0.02 * Math.sin(2 * M * rad) + 282.634;
      L2 = (L2 % 360 + 360) % 360;
      let RA = Math.atan2(Math.sin(L2 * rad), Math.cos(L2 * rad)) / rad;
      RA = (RA % 360 + 360) % 360;
      const Lquadrant = Math.floor(L2 / 90) * 90;
      const RAquadrant = Math.floor(RA / 90) * 90;
      RA = RA + (Lquadrant - RAquadrant);
      RA = RA / 15;
      const sinDec = 0.39782 * Math.sin(L2 * rad);
      const cosDec = Math.cos(Math.asin(sinDec));
      const cosH = (Math.cos(zenith * rad) - sinDec * Math.sin(lat * rad)) / (cosDec * Math.cos(lat * rad));
      if (cosH > 1 || cosH < -1) return null;
      let H = Math.acos(cosH) / rad / 15;
      if (rising) H = 24 - H;
      const T = H + RA - 0.06571 * t - 6.622;
      let UT = ((T - lngHour) % 24 + 24) % 24;
      const hours = Math.floor(UT);
      const minutes = Math.round((UT - hours) * 60);
      const result = new Date(date);
      result.setUTCHours(hours, minutes, 0, 0);
      return result;
    }
    return { sunrise: calc(true), sunset: calc(false) };
  }
  function isDaytime(lat, lon, date) {
    try {
      const times = getSunTimes(lat, lon, date);
      if (times.sunrise && times.sunset) {
        return date >= times.sunrise && date < times.sunset;
      }
    } catch (e) {
    }
    const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
    const solarNoon = 12 - lon / 15;
    const diff = Math.abs((utcHour - solarNoon + 24) % 24 - 12);
    return diff < 6;
  }
  function latLonToCardinal(lat, lon) {
    const ns = lat >= 0 ? "N" : "S";
    const ew = lon >= 0 ? "E" : "W";
    return `${Math.abs(lat).toFixed(0)}${ns} ${Math.abs(lon).toFixed(0)}${ew}`;
  }
  function utcOffsetFromLon(lon) {
    return Math.round(lon / 15);
  }
  function localDateAtLon(lon) {
    const now = /* @__PURE__ */ new Date();
    const offsetMs = utcOffsetFromLon(lon) * 36e5;
    return new Date(now.getTime() + now.getTimezoneOffset() * 6e4 + offsetMs);
  }
  function localTimeAtLon(lon, use24h) {
    const now = /* @__PURE__ */ new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 6e4;
    const offsetMs = lon / 15 * 36e5;
    const local = new Date(utcMs + offsetMs);
    return local.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !use24h });
  }
  var init_geo = __esm({
    "src/geo.js"() {
    }
  });

  // src/utils.js
  var utils_exports = {};
  __export(utils_exports, {
    cacheCallsign: () => cacheCallsign,
    esc: () => esc,
    fmtTime: () => fmtTime,
    formatAge: () => formatAge
  });
  function esc(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  }
  function fmtTime(date, options) {
    const opts = Object.assign({ hour12: !state_default.use24h }, options || {});
    return date.toLocaleTimeString([], opts);
  }
  function cacheCallsign(key, value) {
    const keys = Object.keys(state_default.callsignCache);
    if (keys.length >= CALLSIGN_CACHE_MAX) {
      const toRemove = keys.slice(0, Math.floor(keys.length / 2));
      toRemove.forEach((k) => delete state_default.callsignCache[k]);
    }
    state_default.callsignCache[key] = value;
  }
  function formatAge(spotTime) {
    if (!spotTime) return "";
    const ts = spotTime.endsWith("Z") ? spotTime : spotTime + "Z";
    const diffMs = Date.now() - new Date(ts).getTime();
    if (diffMs < 0) return "0s";
    const totalSec = Math.floor(diffMs / 1e3);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor(totalSec % 3600 / 60);
    const s = totalSec % 60;
    if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`;
    if (m > 0) return s > 0 ? `${m}m${s}s` : `${m}m`;
    return `${s}s`;
  }
  var CALLSIGN_CACHE_MAX;
  var init_utils = __esm({
    "src/utils.js"() {
      init_state();
      CALLSIGN_CACHE_MAX = 500;
    }
  });

  // src/map-overlays.js
  var map_overlays_exports = {};
  __export(map_overlays_exports, {
    renderAllMapOverlays: () => renderAllMapOverlays,
    renderCloudCover: () => renderCloudCover,
    renderDrapOverlay: () => renderDrapOverlay,
    renderLatLonGrid: () => renderLatLonGrid,
    renderMaidenheadGrid: () => renderMaidenheadGrid,
    renderMufImageOverlay: () => renderMufImageOverlay,
    renderSymbolLegend: () => renderSymbolLegend,
    renderTimezoneGrid: () => renderTimezoneGrid,
    renderTropicsLines: () => renderTropicsLines,
    renderWeatherRadar: () => renderWeatherRadar,
    saveMapOverlays: () => saveMapOverlays
  });
  function renderAllMapOverlays() {
    if (!state_default.map) return;
    renderLatLonGrid();
    renderMaidenheadGrid();
    renderTimezoneGrid();
    renderMufImageOverlay();
    renderDrapOverlay();
    renderTropicsLines();
    renderWeatherRadar();
    renderCloudCover();
    renderSymbolLegend();
  }
  function renderLatLonGrid() {
    if (state_default.latLonLayer) {
      state_default.map.removeLayer(state_default.latLonLayer);
      state_default.latLonLayer = null;
    }
    if (!state_default.mapOverlays.latLonGrid) return;
    state_default.latLonLayer = L.layerGroup().addTo(state_default.map);
    const zoom = state_default.map.getZoom();
    let spacing = 30;
    if (zoom >= 8) spacing = 1;
    else if (zoom >= 6) spacing = 5;
    else if (zoom >= 3) spacing = 10;
    const bounds = state_default.map.getBounds();
    const labelLon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * 0.01;
    const labelLat = bounds.getSouth() + (bounds.getNorth() - bounds.getSouth()) * 0.01;
    const lineStyle = { color: "#4a90e2", weight: 1, opacity: 0.3, pane: "mapOverlays", interactive: false };
    const equatorStyle = { color: "#4a90e2", weight: 3, opacity: 0.6, pane: "mapOverlays", interactive: false };
    const pmStyle = { color: "#4a90e2", weight: 2, opacity: 0.5, pane: "mapOverlays", interactive: false };
    for (let lat = -90; lat <= 90; lat += spacing) {
      const style = lat === 0 ? equatorStyle : lineStyle;
      L.polyline([[lat, -180], [lat, 180]], style).addTo(state_default.latLonLayer);
      if (lat >= bounds.getSouth() && lat <= bounds.getNorth()) {
        const ns = lat === 0 ? "EQ" : lat > 0 ? lat + "\xB0N" : Math.abs(lat) + "\xB0S";
        L.marker([lat, labelLon], {
          icon: L.divIcon({ className: "grid-label latlon-label" + (lat === 0 ? " latlon-equator" : ""), html: ns, iconSize: null }),
          pane: "mapOverlays",
          interactive: false
        }).addTo(state_default.latLonLayer);
      }
    }
    for (let lon = -180; lon <= 180; lon += spacing) {
      const style = lon === 0 ? pmStyle : lineStyle;
      L.polyline([[-85, lon], [85, lon]], style).addTo(state_default.latLonLayer);
      if (lon >= bounds.getWest() && lon <= bounds.getEast()) {
        const ew = lon === 0 ? "PM" : lon > 0 ? lon + "\xB0E" : Math.abs(lon) + "\xB0W";
        L.marker([labelLat, lon], {
          icon: L.divIcon({ className: "grid-label latlon-label", html: ew, iconSize: null }),
          pane: "mapOverlays",
          interactive: false
        }).addTo(state_default.latLonLayer);
      }
    }
  }
  function renderMaidenheadGrid() {
    if (state_default.maidenheadLayer) {
      state_default.map.removeLayer(state_default.maidenheadLayer);
      state_default.maidenheadLayer = null;
    }
    if (!state_default.mapOverlays.maidenheadGrid) return;
    state_default.maidenheadLayer = L.layerGroup().addTo(state_default.map);
    const zoom = state_default.map.getZoom();
    const bounds = state_default.map.getBounds();
    const south = bounds.getSouth(), north = bounds.getNorth();
    const west = bounds.getWest(), east = bounds.getEast();
    if (zoom <= 5) {
      const lonStep = 20, latStep = 10;
      const lonStart = Math.floor((west + 180) / lonStep) * lonStep - 180;
      const latStart = Math.floor((south + 90) / latStep) * latStep - 90;
      for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
        for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
          const fieldLon = Math.floor((lon + 180) / 20);
          const fieldLat = Math.floor((lat + 90) / 10);
          if (fieldLon < 0 || fieldLon > 17 || fieldLat < 0 || fieldLat > 17) continue;
          const label = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat);
          L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
            color: "#ff6b35",
            weight: 1.5,
            fill: false,
            pane: "mapOverlays",
            interactive: false
          }).addTo(state_default.maidenheadLayer);
          L.marker([lat + latStep / 2, lon + lonStep / 2], {
            icon: L.divIcon({ className: "grid-label maidenhead-label", html: label, iconSize: null }),
            pane: "mapOverlays",
            interactive: false
          }).addTo(state_default.maidenheadLayer);
        }
      }
    } else if (zoom <= 9) {
      const lonStep = 2, latStep = 1;
      const lonStart = Math.floor((west + 180) / lonStep) * lonStep - 180;
      const latStart = Math.floor((south + 90) / latStep) * latStep - 90;
      for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
        for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
          const fieldLon = Math.floor((lon + 180) / 20);
          const fieldLat = Math.floor((lat + 90) / 10);
          if (fieldLon < 0 || fieldLon > 17 || fieldLat < 0 || fieldLat > 17) continue;
          const sqLon = Math.floor((lon + 180) % 20 / 2);
          const sqLat = Math.floor((lat + 90) % 10 / 1);
          const label = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat) + sqLon + sqLat;
          L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
            color: "#ff6b35",
            weight: 1,
            fill: false,
            pane: "mapOverlays",
            interactive: false
          }).addTo(state_default.maidenheadLayer);
          L.marker([lat + latStep / 2, lon + lonStep / 2], {
            icon: L.divIcon({ className: "grid-label maidenhead-label-sm", html: label, iconSize: null }),
            pane: "mapOverlays",
            interactive: false
          }).addTo(state_default.maidenheadLayer);
        }
      }
    } else {
      const lonStep = 5 / 60, latStep = 2.5 / 60;
      const lonStart = Math.floor(west / lonStep) * lonStep;
      const latStart = Math.floor(south / latStep) * latStep;
      for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
        for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
          const aLon = lon + 180, aLat = lat + 90;
          if (aLon < 0 || aLon >= 360 || aLat < 0 || aLat >= 180) continue;
          const fLon = Math.floor(aLon / 20), fLat = Math.floor(aLat / 10);
          const sLon = Math.floor(aLon % 20 / 2), sLat = Math.floor(aLat % 10 / 1);
          const ssLon = Math.floor(aLon % 2 / (5 / 60)), ssLat = Math.floor(aLat % 1 / (2.5 / 60));
          L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
            color: "#ff6b35",
            weight: 0.5,
            fill: false,
            opacity: 0.5,
            pane: "mapOverlays",
            interactive: false
          }).addTo(state_default.maidenheadLayer);
          if (zoom >= 12) {
            const label = String.fromCharCode(65 + fLon) + String.fromCharCode(65 + fLat) + sLon + sLat + String.fromCharCode(97 + Math.min(ssLon, 23)) + String.fromCharCode(97 + Math.min(ssLat, 23));
            L.marker([lat + latStep / 2, lon + lonStep / 2], {
              icon: L.divIcon({ className: "grid-label maidenhead-label-xs", html: label, iconSize: null }),
              pane: "mapOverlays",
              interactive: false
            }).addTo(state_default.maidenheadLayer);
          }
        }
      }
    }
  }
  function renderTimezoneGrid() {
    if (state_default.timezoneLayer) {
      state_default.map.removeLayer(state_default.timezoneLayer);
      state_default.timezoneLayer = null;
    }
    if (!state_default.mapOverlays.timezoneGrid) return;
    state_default.timezoneLayer = L.layerGroup().addTo(state_default.map);
    const lineStyle = { color: "#9b59b6", weight: 1.5, opacity: 0.4, dashArray: "5,5", pane: "mapOverlays", interactive: false };
    for (let i = -12; i <= 12; i++) {
      const lon = i * 15;
      L.polyline([[-85, lon], [85, lon]], lineStyle).addTo(state_default.timezoneLayer);
      const label = "UTC" + (i === 0 ? "" : i > 0 ? "+" + i : "" + i);
      L.marker([70, lon], {
        icon: L.divIcon({ className: "grid-label timezone-label", html: label, iconSize: null }),
        pane: "mapOverlays",
        interactive: false
      }).addTo(state_default.timezoneLayer);
    }
  }
  function renderMufImageOverlay() {
    if (mufImageLayer) {
      state_default.map.removeLayer(mufImageLayer);
      mufImageLayer = null;
    }
    if (mufImageRefreshTimer) {
      clearInterval(mufImageRefreshTimer);
      mufImageRefreshTimer = null;
    }
    if (!state_default.mapOverlays.mufImageOverlay) return;
    const L2 = window.L;
    const type = state_default.propMetric === "fof2" ? "fof2" : "mufd";
    const url = `/api/propagation/image?type=${type}&_t=${Date.now()}`;
    const bounds = [[-90, -180], [90, 180]];
    mufImageLayer = L2.imageOverlay(url, bounds, {
      opacity: 0.45,
      pane: "propagation",
      // z-index 300, below mapOverlays (350)
      interactive: false
    }).addTo(state_default.map);
    mufImageRefreshTimer = setInterval(() => {
      if (!state_default.mapOverlays.mufImageOverlay || !mufImageLayer) return;
      const freshUrl = `/api/propagation/image?type=${type}&_t=${Date.now()}`;
      mufImageLayer.setUrl(freshUrl);
    }, 15 * 60 * 1e3);
  }
  function renderDrapOverlay() {
    if (drapImageLayer) {
      state_default.map.removeLayer(drapImageLayer);
      drapImageLayer = null;
    }
    if (drapImageRefreshTimer) {
      clearInterval(drapImageRefreshTimer);
      drapImageRefreshTimer = null;
    }
    if (!state_default.mapOverlays.drapOverlay) return;
    const L2 = window.L;
    const url = `/api/drap/image?_t=${Date.now()}`;
    const bounds = [[-90, -180], [90, 180]];
    drapImageLayer = L2.imageOverlay(url, bounds, {
      opacity: 0.5,
      pane: "propagation",
      // same z-index as MUF overlay (300)
      interactive: false
    }).addTo(state_default.map);
    drapImageRefreshTimer = setInterval(() => {
      if (!state_default.mapOverlays.drapOverlay || !drapImageLayer) return;
      drapImageLayer.setUrl(`/api/drap/image?_t=${Date.now()}`);
    }, 15 * 60 * 1e3);
  }
  function renderTropicsLines() {
    if (tropicsLayer) {
      state_default.map.removeLayer(tropicsLayer);
      tropicsLayer = null;
    }
    if (!state_default.mapOverlays.tropicsLines) return;
    tropicsLayer = L.layerGroup().addTo(state_default.map);
    const lines = [
      { lat: 66.5634, name: "Arctic Circle", color: "#6ec6ff", dash: "8,6" },
      { lat: 23.4362, name: "Tropic of Cancer", color: "#f0a050", dash: "8,6" },
      { lat: 0, name: "Equator", color: "#f0d060", dash: null },
      { lat: -23.4362, name: "Tropic of Capricorn", color: "#f0a050", dash: "8,6" },
      { lat: -66.5634, name: "Antarctic Circle", color: "#6ec6ff", dash: "8,6" }
    ];
    const bounds = state_default.map.getBounds();
    const labelLon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * 0.02;
    for (const ln of lines) {
      const style = {
        color: ln.color,
        weight: ln.dash ? 1.5 : 2,
        opacity: 0.6,
        dashArray: ln.dash || void 0,
        pane: "mapOverlays",
        interactive: false
      };
      L.polyline([[ln.lat, -180], [ln.lat, 180]], style).addTo(tropicsLayer);
      if (ln.lat >= bounds.getSouth() && ln.lat <= bounds.getNorth()) {
        const isArctic = Math.abs(ln.lat) > 60;
        L.marker([ln.lat, labelLon], {
          icon: L.divIcon({
            className: "grid-label tropics-label" + (isArctic ? " tropics-arctic" : ""),
            html: ln.name,
            iconSize: null
          }),
          pane: "mapOverlays",
          interactive: false
        }).addTo(tropicsLayer);
      }
    }
  }
  function renderWeatherRadar() {
    if (weatherRadarLayer) {
      state_default.map.removeLayer(weatherRadarLayer);
      weatherRadarLayer = null;
    }
    if (weatherRadarTimer) {
      clearInterval(weatherRadarTimer);
      weatherRadarTimer = null;
    }
    if (!state_default.mapOverlays.weatherRadar) return;
    fetchRadarAndShow();
    weatherRadarTimer = setInterval(fetchRadarAndShow, 5 * 60 * 1e3);
  }
  async function fetchRadarAndShow() {
    try {
      const res = await fetch("/api/weather/radar");
      if (!res.ok) return;
      const data = await res.json();
      if (!data.host || !data.path) return;
      const tileUrl = `${data.host}${data.path}/256/{z}/{x}/{y}/2/1_1.png`;
      if (weatherRadarLayer) state_default.map.removeLayer(weatherRadarLayer);
      weatherRadarLayer = L.tileLayer(tileUrl, {
        opacity: 0.35,
        pane: "propagation",
        // z-300, below mapOverlays (350)
        interactive: false,
        attribution: "&copy; RainViewer"
      }).addTo(state_default.map);
    } catch (e) {
      if (state_default.debug) console.error("Weather radar fetch failed:", e);
    }
  }
  function renderCloudCover() {
    if (cloudCoverLayer) {
      state_default.map.removeLayer(cloudCoverLayer);
      cloudCoverLayer = null;
    }
    if (!state_default.mapOverlays.cloudCover) return;
    cloudCoverLayer = L.tileLayer("/api/weather/clouds/{z}/{x}/{y}", {
      opacity: 0.4,
      pane: "propagation",
      // z-300, below mapOverlays (350)
      interactive: false,
      attribution: "&copy; OpenWeatherMap"
    }).addTo(state_default.map);
  }
  function renderSymbolLegend() {
    if (legendControl) {
      state_default.map.removeControl(legendControl);
      legendControl = null;
    }
    if (!state_default.mapOverlays.symbolLegend) return;
    const LegendControl = L.Control.extend({
      options: { position: "bottomright" },
      onAdd() {
        const div = L.DomUtil.create("div", "map-legend");
        L.DomEvent.disableClickPropagation(div);
        L.DomEvent.disableScrollPropagation(div);
        const items = [
          { symbol: '<span class="legend-dot" style="background:#4CAF50"></span>', label: "POTA" },
          { symbol: '<span class="legend-dot" style="background:#FF9800"></span>', label: "SOTA" },
          { symbol: '<span class="legend-dot" style="background:#f44336"></span>', label: "DX Cluster" },
          { symbol: '<span class="legend-dot" style="background:#009688"></span>', label: "WWFF" },
          { symbol: '<span class="legend-dot" style="background:#9C27B0"></span>', label: "PSKReporter" },
          { symbol: '<span class="legend-circle" style="border-color:#FF9800"></span>', label: "DXped (active)" },
          { symbol: '<span class="legend-circle" style="border-color:#888"></span>', label: "DXped (upcoming)" },
          { symbol: '<span class="legend-dot legend-sun"></span>', label: "Sun sub-point" },
          { symbol: '<span class="legend-dot legend-moon"></span>', label: "Moon sub-point" },
          { symbol: '<span class="legend-line" style="border-color:#666"></span>', label: "Gray line" },
          { symbol: '<span class="legend-line" style="border-color:#4a90e2"></span>', label: "Geodesic path" },
          { symbol: '<span class="legend-dot legend-beacon"></span>', label: "NCDXF beacon" }
        ];
        div.innerHTML = '<div class="legend-title">Legend</div>' + items.map((i) => `<div class="legend-row">${i.symbol}<span class="legend-label">${i.label}</span></div>`).join("");
        return div;
      }
    });
    legendControl = new LegendControl();
    state_default.map.addControl(legendControl);
  }
  function saveMapOverlays() {
    localStorage.setItem("hamtab_map_overlays", JSON.stringify(state_default.mapOverlays));
  }
  var mufImageLayer, mufImageRefreshTimer, drapImageLayer, drapImageRefreshTimer, tropicsLayer, weatherRadarLayer, weatherRadarTimer, cloudCoverLayer, legendControl;
  var init_map_overlays = __esm({
    "src/map-overlays.js"() {
      init_state();
      mufImageLayer = null;
      mufImageRefreshTimer = null;
      drapImageLayer = null;
      drapImageRefreshTimer = null;
      tropicsLayer = null;
      weatherRadarLayer = null;
      weatherRadarTimer = null;
      cloudCoverLayer = null;
      legendControl = null;
    }
  });

  // src/dom.js
  function $(id) {
    if (!cache[id]) cache[id] = document.getElementById(id);
    return cache[id];
  }
  var cache;
  var init_dom = __esm({
    "src/dom.js"() {
      cache = {};
    }
  });

  // src/band-conditions.js
  var band_conditions_exports = {};
  __export(band_conditions_exports, {
    HF_BANDS: () => HF_BANDS,
    VOACAP_BANDS: () => VOACAP_BANDS,
    calculate24HourMatrix: () => calculate24HourMatrix,
    calculateBandConditions: () => calculateBandConditions,
    calculateBandReliability: () => calculateBandReliability,
    calculateMUF: () => calculateMUF,
    calculateSolarZenith: () => calculateSolarZenith,
    conditionColorClass: () => conditionColorClass,
    conditionLabel: () => conditionLabel,
    dayFraction: () => dayFraction,
    getReliabilityColor: () => getReliabilityColor,
    initDayNightToggle: () => initDayNightToggle,
    renderPropagationWidget: () => renderPropagationWidget
  });
  function calculateSolarZenith(lat, lon, utcHour) {
    const now = /* @__PURE__ */ new Date();
    const start = new Date(now.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((now - start) / 864e5) + 1;
    const declRad = Math.asin(
      Math.sin(23.44 * Math.PI / 180) * Math.sin(360 / 365 * (dayOfYear - 81) * Math.PI / 180)
    );
    const solarNoonOffset = lon / 15;
    const hourAngle = (utcHour - 12 + solarNoonOffset) * 15;
    const haRad = hourAngle * Math.PI / 180;
    const latRad = lat * Math.PI / 180;
    const cosZenith = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
    return Math.acos(Math.max(-1, Math.min(1, cosZenith))) * 180 / Math.PI;
  }
  function dayFraction(lat, lon, utcHour) {
    if (lat == null || lon == null) {
      return utcHour >= 6 && utcHour < 18 ? 1 : 0;
    }
    const zenith = calculateSolarZenith(lat, lon, utcHour);
    if (zenith <= 80) return 1;
    if (zenith >= 100) return 0;
    return (100 - zenith) / 20;
  }
  function calculateMUF(sfi, dayFrac) {
    if (dayFrac === true) dayFrac = 1;
    else if (dayFrac === false) dayFrac = 0;
    const foF2Factor = 0.6 + 0.3 * dayFrac;
    const foF2 = foF2Factor * Math.sqrt(Math.max(sfi, 50));
    const obliquityFactor = 3.5;
    return foF2 * obliquityFactor;
  }
  function calculateBandReliability(bandFreqMHz, muf, kIndex, aIndex, isDay, opts) {
    const mufLower = muf * 0.5;
    const mufOptimal = muf * 0.85;
    let baseReliability = 0;
    if (bandFreqMHz < mufLower) {
      if (isDay) {
        baseReliability = Math.max(0, 10 - (mufLower - bandFreqMHz) * 3);
      } else {
        baseReliability = Math.min(70, 40 + (mufLower - bandFreqMHz) * 1);
      }
    } else if (bandFreqMHz <= mufOptimal) {
      const position = (bandFreqMHz - mufLower) / (mufOptimal - mufLower);
      baseReliability = 50 + 35 * Math.sin(position * Math.PI);
    } else if (bandFreqMHz <= muf) {
      const position = (bandFreqMHz - mufOptimal) / (muf - mufOptimal);
      baseReliability = 75 - position * 35;
    } else {
      const excess = bandFreqMHz - muf;
      baseReliability = Math.max(0, 15 - excess * 5);
    }
    let geomagPenalty = 0;
    if (kIndex >= 6) {
      geomagPenalty = (kIndex - 5) * 12;
    } else if (kIndex >= 3) {
      geomagPenalty = (kIndex - 2) * 5;
    }
    let aIndexPenalty = 0;
    if (aIndex > 30) {
      aIndexPenalty = Math.min(20, (aIndex - 30) / 2);
    } else if (aIndex > 10) {
      aIndexPenalty = (aIndex - 10) / 4;
    }
    let adjusted = baseReliability - geomagPenalty - aIndexPenalty;
    if (opts) {
      if (opts.mode === "CW") adjusted += 8;
      else if (opts.mode === "FT8") adjusted += 15;
      if (opts.powerWatts && opts.powerWatts !== 100) {
        const dBdiff = 10 * Math.log10(opts.powerWatts / 100);
        adjusted += dBdiff * 1.5;
      }
      if (opts.toaDeg != null) {
        adjusted += (opts.toaDeg - 5) * 0.5;
      }
      if (opts.longPath) adjusted -= 30;
    }
    const finalReliability = Math.max(0, Math.min(100, adjusted));
    return Math.round(finalReliability);
  }
  function classifyCondition(reliability) {
    if (reliability >= 80) return "excellent";
    if (reliability >= 60) return "good";
    if (reliability >= 40) return "fair";
    if (reliability >= 20) return "poor";
    return "closed";
  }
  function calculateBandConditions(timeOfDay = null) {
    if (!state_default.lastSolarData || !state_default.lastSolarData.indices) {
      return HF_BANDS.map((band) => ({
        ...band,
        reliability: 0,
        condition: "unknown",
        muf: 0
      }));
    }
    const { indices } = state_default.lastSolarData;
    const sfi = parseFloat(indices.sfi) || 70;
    const kIndex = parseInt(indices.kindex) || 2;
    const aIndex = parseInt(indices.aindex) || 5;
    let isDay;
    if (timeOfDay === "day") {
      isDay = true;
    } else if (timeOfDay === "night") {
      isDay = false;
    } else {
      const utcHour = (/* @__PURE__ */ new Date()).getUTCHours();
      isDay = utcHour >= 6 && utcHour < 18;
    }
    const muf = calculateMUF(sfi, isDay);
    return HF_BANDS.map((band) => {
      const reliability = calculateBandReliability(
        band.freqMHz,
        muf,
        kIndex,
        aIndex,
        isDay
      );
      return {
        ...band,
        reliability,
        condition: classifyCondition(reliability),
        muf: Math.round(muf * 10) / 10
        // Round to 1 decimal
      };
    });
  }
  function conditionColorClass(condition) {
    const map = {
      "excellent": "band-excellent",
      "good": "band-good",
      "fair": "band-fair",
      "poor": "band-poor",
      "closed": "band-closed",
      "unknown": "band-unknown"
    };
    return map[condition] || "band-unknown";
  }
  function conditionLabel(condition) {
    const map = {
      "excellent": "Excellent",
      "good": "Good",
      "fair": "Fair",
      "poor": "Poor",
      "closed": "Closed",
      "unknown": "Unknown"
    };
    return map[condition] || "Unknown";
  }
  function getReliabilityColor(rel) {
    if (rel < 5) return "rgba(26, 26, 26, 0.6)";
    const t = Math.max(0, Math.min(1, (rel - 5) / 90));
    const hue = t * 120;
    const sat = 90;
    const light = 42 + t * 13;
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }
  function calculate24HourMatrix(opts) {
    if (!state_default.lastSolarData || !state_default.lastSolarData.indices) {
      return Array.from({ length: 24 }, (_, i) => ({
        hour: i,
        bands: {},
        muf: 0
      }));
    }
    const { indices } = state_default.lastSolarData;
    const sfi = parseFloat(indices.sfi) || 70;
    const kIndex = parseInt(indices.kindex) || 2;
    const aIndex = parseInt(indices.aindex) || 5;
    const lat = opts && opts.lat != null ? opts.lat : null;
    const lon = opts && opts.lon != null ? opts.lon : null;
    const bandList = opts ? VOACAP_BANDS : HF_BANDS;
    const matrix = [];
    for (let hour = 0; hour < 24; hour++) {
      const df = dayFraction(lat, lon, hour);
      const muf = calculateMUF(sfi, df);
      const bands = {};
      for (const band of bandList) {
        const reliability = calculateBandReliability(
          band.freqMHz,
          muf,
          kIndex,
          aIndex,
          df >= 0.5,
          // boolean isDay for absorption branch
          opts
        );
        bands[band.name] = reliability;
      }
      matrix.push({
        hour,
        bands,
        muf: Math.round(muf * 10) / 10
      });
    }
    return matrix;
  }
  function initDayNightToggle() {
    const tabContainer = $("bandTabs");
    if (!tabContainer) return;
    tabContainer.addEventListener("click", (e) => {
      const btn = e.target.closest(".band-tab");
      if (!btn) return;
      const tab = btn.dataset.bandTab;
      const hfGrid = $("bandConditionsGrid");
      const vhfPanel = $("vhfConditions");
      tabContainer.querySelectorAll(".band-tab").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      if (tab === "hf") {
        if (hfGrid) hfGrid.style.display = "";
        if (vhfPanel) vhfPanel.style.display = "none";
      } else {
        if (hfGrid) hfGrid.style.display = "none";
        if (vhfPanel) vhfPanel.style.display = "";
      }
    });
  }
  function cellTextColor(reliability) {
    return reliability < 40 ? "#fff" : "#1a1a1a";
  }
  function vhfConditionColor(condition) {
    const c = condition.toLowerCase();
    if (c.includes("closed")) return "var(--red)";
    if (c.includes("poor")) return "var(--orange)";
    if (c.includes("fair")) return "var(--yellow)";
    if (c.includes("good") || c.includes("high")) return "var(--green)";
    if (c.includes("excellent") || c.includes("open")) return "var(--green)";
    return "var(--text-dim)";
  }
  function formatVhfLocation(location2) {
    const map = {
      "northern_hemi": "N. Hemi",
      "north_america": "NA",
      "europe": "EU",
      "europe_6m": "EU 6m",
      "europe_4m": "EU 4m"
    };
    return map[location2] || location2;
  }
  function formatVhfName(name) {
    const map = {
      "vhf-aurora": "Aurora",
      "E-Skip": "E-Skip"
    };
    return map[name] || name;
  }
  function renderPropagationWidget() {
    const grid = $("bandConditionsGrid");
    const mufValue = $("propMufValue");
    const sfiValue = $("propSfiValue");
    const kindexValue = $("propKindexValue");
    const vhfEl = $("vhfConditions");
    if (!grid) return;
    const dayConditions = calculateBandConditions("day");
    const nightConditions = calculateBandConditions("night");
    if (mufValue) {
      const muf = dayConditions[0]?.muf || 0;
      mufValue.textContent = muf > 0 ? `${muf} MHz` : "--";
    }
    if (state_default.lastSolarData && state_default.lastSolarData.indices) {
      const { indices } = state_default.lastSolarData;
      if (sfiValue) sfiValue.textContent = indices.sfi || "--";
      if (kindexValue) {
        const kindex = indices.kindex || "--";
        kindexValue.textContent = kindex;
        if (kindex !== "--") {
          const k = parseInt(kindex);
          if (k <= 2) kindexValue.style.color = "var(--green)";
          else if (k <= 4) kindexValue.style.color = "var(--yellow)";
          else kindexValue.style.color = "var(--red)";
        }
      }
    }
    grid.innerHTML = "";
    const table = document.createElement("table");
    table.className = "band-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const emptyTh = document.createElement("th");
    emptyTh.className = "band-table-label";
    headerRow.appendChild(emptyTh);
    const dayTh = document.createElement("th");
    dayTh.className = "band-table-header band-table-header-day";
    dayTh.textContent = "Day";
    headerRow.appendChild(dayTh);
    const nightTh = document.createElement("th");
    nightTh.className = "band-table-header band-table-header-night";
    nightTh.textContent = "Night";
    headerRow.appendChild(nightTh);
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    for (let i = 0; i < dayConditions.length; i++) {
      const row = document.createElement("tr");
      const labelTd = document.createElement("td");
      labelTd.className = "band-table-label";
      labelTd.textContent = dayConditions[i].label;
      row.appendChild(labelTd);
      const dayTd = document.createElement("td");
      dayTd.className = "band-table-cell";
      dayTd.style.backgroundColor = getReliabilityColor(dayConditions[i].reliability);
      dayTd.style.color = cellTextColor(dayConditions[i].reliability);
      dayTd.textContent = `${dayConditions[i].reliability}%`;
      dayTd.title = `${dayConditions[i].label} Day: ${conditionLabel(dayConditions[i].condition)}`;
      row.appendChild(dayTd);
      const nightTd = document.createElement("td");
      nightTd.className = "band-table-cell";
      nightTd.style.backgroundColor = getReliabilityColor(nightConditions[i].reliability);
      nightTd.style.color = cellTextColor(nightConditions[i].reliability);
      nightTd.textContent = `${nightConditions[i].reliability}%`;
      nightTd.title = `${nightConditions[i].label} Night: ${conditionLabel(nightConditions[i].condition)}`;
      row.appendChild(nightTd);
      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    grid.appendChild(table);
    if (vhfEl) {
      renderVhfConditions(vhfEl);
    }
  }
  function renderVhfConditions(container) {
    container.innerHTML = "";
    const vhfData = state_default.lastSolarData?.vhf;
    if (!vhfData || vhfData.length === 0) return;
    const list = document.createElement("div");
    list.className = "vhf-list";
    vhfData.forEach((item) => {
      const row = document.createElement("div");
      row.className = "vhf-row";
      const label = document.createElement("span");
      label.className = "vhf-label";
      label.textContent = `${esc(formatVhfName(item.name))} ${esc(formatVhfLocation(item.location))}`;
      const value = document.createElement("span");
      value.className = "vhf-value";
      value.textContent = esc(item.condition);
      value.style.color = vhfConditionColor(item.condition);
      row.appendChild(label);
      row.appendChild(value);
      list.appendChild(row);
    });
    container.appendChild(list);
  }
  var HF_BANDS, VOACAP_BANDS;
  var init_band_conditions = __esm({
    "src/band-conditions.js"() {
      init_state();
      init_dom();
      init_utils();
      HF_BANDS = [
        { name: "160m", freqMHz: 1.9, label: "160m" },
        { name: "80m", freqMHz: 3.7, label: "80m" },
        { name: "60m", freqMHz: 5.35, label: "60m" },
        { name: "40m", freqMHz: 7.15, label: "40m" },
        { name: "30m", freqMHz: 10.12, label: "30m" },
        { name: "20m", freqMHz: 14.15, label: "20m" },
        { name: "17m", freqMHz: 18.1, label: "17m" },
        { name: "15m", freqMHz: 21.2, label: "15m" },
        { name: "12m", freqMHz: 24.93, label: "12m" },
        { name: "10m", freqMHz: 28.5, label: "10m" }
      ];
      VOACAP_BANDS = HF_BANDS.filter((b) => b.name !== "160m" && b.name !== "60m");
    }
  });

  // src/rel-heatmap.js
  var rel_heatmap_exports = {};
  __export(rel_heatmap_exports, {
    clearHeatmap: () => clearHeatmap,
    initHeatmapListeners: () => initHeatmapListeners,
    renderHeatmapCanvas: () => renderHeatmapCanvas
  });
  function greatCircleMidpoint(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const lat1r = lat1 * r, lon1r = lon1 * r;
    const lat2r = lat2 * r, lon2r = lon2 * r;
    const dLon = lon2r - lon1r;
    const Bx = Math.cos(lat2r) * Math.cos(dLon);
    const By = Math.cos(lat2r) * Math.sin(dLon);
    const midLat = Math.atan2(
      Math.sin(lat1r) + Math.sin(lat2r),
      Math.sqrt((Math.cos(lat1r) + Bx) ** 2 + By ** 2)
    );
    const midLon = lon1r + Math.atan2(By, Math.cos(lat1r) + Bx);
    return { lat: midLat / r, lon: midLon / r };
  }
  function distanceKm(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const R3 = 6371;
    const dLat = (lat2 - lat1) * r;
    const dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return R3 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  function distanceModifier(distKm) {
    if (distKm < 100) return 0.3;
    if (distKm < 500) return 0.5;
    if (distKm < 1e3) return 0.85;
    if (distKm < 4e3) return 1;
    if (distKm < 8e3) return 0.85;
    if (distKm < 15e3) return 0.7;
    return 0.5;
  }
  function computeCellReliability(deLat, deLon, dxLat, dxLon, freqMHz, sfi, kIndex, aIndex, utcHour, opts) {
    const mid = greatCircleMidpoint(deLat, deLon, dxLat, dxLon);
    const df = dayFraction(mid.lat, mid.lon, utcHour);
    const muf = calculateMUF(sfi, df);
    const isDay = df >= 0.5;
    const baseRel = calculateBandReliability(freqMHz, muf, kIndex, aIndex, isDay, opts);
    const dist = distanceKm(deLat, deLon, dxLat, dxLon);
    const distMod = distanceModifier(dist);
    return Math.max(0, Math.min(100, Math.round(baseRel * distMod)));
  }
  function hslToRgb(h, s, l) {
    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(h / 60 % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;
    if (h < 60) {
      r = c;
      g = x;
    } else if (h < 120) {
      r = x;
      g = c;
    } else if (h < 180) {
      g = c;
      b = x;
    } else if (h < 240) {
      g = x;
      b = c;
    } else if (h < 300) {
      r = x;
      b = c;
    } else {
      r = c;
      b = x;
    }
    return {
      r: Math.round((r + m) * 255),
      g: Math.round((g + m) * 255),
      b: Math.round((b + m) * 255)
    };
  }
  function reliabilityToRGBA(rel) {
    if (rel < 5) return { r: 0, g: 0, b: 0, a: 30 };
    const hue = (rel - 5) / 95 * 120;
    const { r, g, b } = hslToRgb(hue, 0.85, 0.45);
    const alpha = Math.min(200, 80 + rel / 100 * 120);
    return { r, g, b, a: Math.round(alpha) };
  }
  function cellSizeForZoom(zoom) {
    if (zoom <= 3) return 4;
    if (zoom <= 5) return 2;
    if (zoom <= 7) return 1;
    return 0.5;
  }
  function renderHeatmapCanvas(band) {
    if (!state_default.map || state_default.myLat == null || state_default.myLon == null) return;
    if (!state_default.lastSolarData || !state_default.lastSolarData.indices) return;
    const L2 = window.L;
    const map = state_default.map;
    clearHeatmap();
    const bandDef = VOACAP_BANDS.find((b) => b.name === band) || HF_BANDS.find((b) => b.name === band);
    if (!bandDef) return;
    const { indices } = state_default.lastSolarData;
    const sfi = parseFloat(indices.sfi) || 70;
    const kIndex = parseInt(indices.kindex) || 2;
    const aIndex = parseInt(indices.aindex) || 5;
    const utcHour = (/* @__PURE__ */ new Date()).getUTCHours();
    const opts = getVoacapOpts();
    const bounds = map.getBounds();
    const south = Math.max(-85, bounds.getSouth());
    const north = Math.min(85, bounds.getNorth());
    const west = bounds.getWest();
    const east = bounds.getEast();
    const zoom = map.getZoom();
    const cellSize = cellSizeForZoom(zoom);
    const cols = Math.ceil((east - west) / cellSize);
    const rows = Math.ceil((north - south) / cellSize);
    if (cols <= 0 || rows <= 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = cols;
    canvas.height = rows;
    const ctx = canvas.getContext("2d");
    const imageData = ctx.createImageData(cols, rows);
    const data = imageData.data;
    for (let row = 0; row < rows; row++) {
      const dxLat = north - (row + 0.5) * cellSize;
      for (let col = 0; col < cols; col++) {
        const dxLon = west + (col + 0.5) * cellSize;
        const rel = computeCellReliability(
          state_default.myLat,
          state_default.myLon,
          dxLat,
          dxLon,
          bandDef.freqMHz,
          sfi,
          kIndex,
          aIndex,
          utcHour,
          opts
        );
        const px = reliabilityToRGBA(rel);
        const idx = (row * cols + col) * 4;
        data[idx] = px.r;
        data[idx + 1] = px.g;
        data[idx + 2] = px.b;
        data[idx + 3] = px.a;
      }
    }
    ctx.putImageData(imageData, 0, 0);
    const dataUrl = canvas.toDataURL();
    const imageBounds = [[south, west], [north, east]];
    state_default.heatmapLayer = L2.imageOverlay(dataUrl, imageBounds, {
      opacity: 0.7,
      pane: "propagation"
    });
    state_default.heatmapLayer.addTo(map);
  }
  function clearHeatmap() {
    if (state_default.heatmapLayer && state_default.map) {
      state_default.map.removeLayer(state_default.heatmapLayer);
      state_default.heatmapLayer = null;
    }
  }
  function initHeatmapListeners() {
  }
  var init_rel_heatmap = __esm({
    "src/rel-heatmap.js"() {
      init_state();
      init_band_conditions();
      init_voacap();
    }
  });

  // src/voacap.js
  var voacap_exports = {};
  __export(voacap_exports, {
    clearVoacapOverlay: () => clearVoacapOverlay,
    fetchVoacapMatrix: () => fetchVoacapMatrix,
    fetchVoacapMatrixThrottled: () => fetchVoacapMatrixThrottled,
    getVoacapOpts: () => getVoacapOpts,
    initVoacapListeners: () => initVoacapListeners,
    onSpotDeselected: () => onSpotDeselected,
    onSpotSelected: () => onSpotSelected,
    renderVoacapMatrix: () => renderVoacapMatrix,
    toggleBandOverlay: () => toggleBandOverlay
  });
  function initVoacapListeners() {
    const matrix = $("voacapMatrix");
    if (!matrix) return;
    matrix.addEventListener("click", (e) => {
      const param = e.target.closest(".voacap-param");
      if (param && param.dataset.param) {
        if (param.dataset.param === "sensitivity" && e.shiftKey) {
          cycleParam("sensitivity-reset");
        } else {
          cycleParam(param.dataset.param);
        }
        return;
      }
      const row = e.target.closest(".voacap-row");
      if (row && row.dataset.band) {
        toggleBandOverlay(row.dataset.band);
      }
    });
  }
  function cycleParam(name) {
    if (name === "overlay") {
      const next2 = state_default.heatmapOverlayMode === "circles" ? "heatmap" : "circles";
      state_default.heatmapOverlayMode = next2;
      localStorage.setItem("hamtab_heatmap_mode", next2);
      renderVoacapMatrix();
      if (state_default.hfPropOverlayBand) {
        clearBandOverlay();
        clearHeatmap();
        if (next2 === "heatmap") {
          renderHeatmapCanvas(state_default.hfPropOverlayBand);
        } else {
          drawBandOverlay(state_default.hfPropOverlayBand);
        }
      }
      return;
    }
    if (name === "autospot") {
      state_default.voacapAutoSpot = !state_default.voacapAutoSpot;
      localStorage.setItem("hamtab_voacap_auto_spot", state_default.voacapAutoSpot);
      renderVoacapMatrix();
      return;
    }
    if (name === "sensitivity-reset") {
      state_default.voacapSensitivity = DEFAULT_SENSITIVITY;
      localStorage.setItem("hamtab_voacap_sensitivity", DEFAULT_SENSITIVITY);
      renderVoacapMatrix();
      clearTimeout(state_default.voacapParamTimer);
      state_default.voacapParamTimer = setTimeout(() => fetchVoacapMatrix(), 300);
      return;
    }
    if (name === "sensitivity") {
      const current2 = state_default.voacapSensitivity;
      const next2 = current2 >= MAX_SENSITIVITY ? 1 : current2 + 1;
      state_default.voacapSensitivity = next2;
      localStorage.setItem("hamtab_voacap_sensitivity", next2);
      renderVoacapMatrix();
      clearTimeout(state_default.voacapParamTimer);
      state_default.voacapParamTimer = setTimeout(() => fetchVoacapMatrix(), 300);
      return;
    }
    if (name === "target") {
      const current2 = state_default.voacapTarget;
      const next2 = current2 === "overview" ? "spot" : "overview";
      state_default.voacapTarget = next2;
      localStorage.setItem("hamtab_voacap_target", next2);
      fetchVoacapMatrix();
      return;
    }
    let options, key, stateKey;
    if (name === "power") {
      options = POWER_OPTIONS;
      key = "hamtab_voacap_power";
      stateKey = "voacapPower";
    } else if (name === "mode") {
      options = MODE_OPTIONS;
      key = "hamtab_voacap_mode";
      stateKey = "voacapMode";
    } else if (name === "toa") {
      options = TOA_OPTIONS;
      key = "hamtab_voacap_toa";
      stateKey = "voacapToa";
    } else if (name === "path") {
      options = PATH_OPTIONS;
      key = "hamtab_voacap_path";
      stateKey = "voacapPath";
    } else return;
    const current = state_default[stateKey];
    const idx = options.indexOf(current);
    const next = options[(idx + 1) % options.length];
    state_default[stateKey] = next;
    localStorage.setItem(key, next);
    renderVoacapMatrix();
    clearTimeout(state_default.voacapParamTimer);
    state_default.voacapParamTimer = setTimeout(() => fetchVoacapMatrix(), 300);
    if (state_default.hfPropOverlayBand) {
      clearBandOverlay();
      clearHeatmap();
      if (state_default.heatmapOverlayMode === "heatmap") {
        renderHeatmapCanvas(state_default.hfPropOverlayBand);
      } else {
        drawBandOverlay(state_default.hfPropOverlayBand);
      }
    }
  }
  function getVoacapOpts() {
    return {
      lat: state_default.myLat,
      lon: state_default.myLon,
      mode: state_default.voacapMode,
      powerWatts: parseInt(state_default.voacapPower, 10),
      toaDeg: parseInt(state_default.voacapToa, 10),
      longPath: state_default.voacapPath === "LP"
    };
  }
  async function fetchVoacapMatrix() {
    if (state_default.myLat == null || state_default.myLon == null) {
      renderVoacapMatrix();
      return;
    }
    console.log(`[VOACAP] fetchVoacapMatrix called, target=${state_default.voacapTarget}, selectedSpot=${state_default.selectedSpotId}, sensitivity=${state_default.voacapSensitivity}`);
    if (activeFetchController) activeFetchController.abort();
    const controller = new AbortController();
    activeFetchController = controller;
    const sensLevel = SENSITIVITY_LEVELS[state_default.voacapSensitivity] || SENSITIVITY_LEVELS[DEFAULT_SENSITIVITY];
    const currentSnr = sensLevel[state_default.voacapMode] ?? sensLevel.SSB;
    const params = new URLSearchParams({
      txLat: state_default.myLat,
      txLon: state_default.myLon,
      power: state_default.voacapPower,
      mode: state_default.voacapMode,
      toa: state_default.voacapToa,
      path: state_default.voacapPath,
      snr: currentSnr
    });
    if (state_default.voacapTarget === "spot" && state_default.selectedSpotId) {
      try {
        const spot = findSelectedSpot();
        const spotLat = parseFloat(spot?.latitude);
        const spotLon = parseFloat(spot?.longitude);
        console.log(`[VOACAP] Spot lookup: found=${!!spot}, lat=${spotLat}, lon=${spotLon}`);
        if (!isNaN(spotLat) && !isNaN(spotLon)) {
          params.set("rxLat", spotLat);
          params.set("rxLon", spotLon);
        }
      } catch (err) {
        console.warn("[VOACAP] Spot lookup error:", err);
      }
    }
    try {
      const timeout = setTimeout(() => controller.abort(), 25e3);
      const resp = await fetch(`/api/voacap?${params}`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      if (activeFetchController === controller) {
        state_default.voacapServerData = data;
        state_default.voacapEngine = data.engine || "simplified";
        state_default.voacapLastFetch = Date.now();
        if (state_default.voacapTarget === "spot") {
          const hasSignal = matrixHasSignal(data.matrix);
          const peakRel = Math.max(...data.matrix.flatMap(
            (e) => Object.values(e.bands).map((b) => typeof b === "object" ? b.rel || 0 : b || 0)
          ));
          console.log(`[VOACAP] SPOT fetch: engine=${data.engine}, rxLat=${params.get("rxLat")}, rxLon=${params.get("rxLon")}, peakRel=${peakRel}%, hasSignal=${hasSignal}${data.fallbackReason ? ", fallback=" + data.fallbackReason : ""}`);
        }
      }
    } catch (err) {
      if (err.name === "AbortError") {
        console.log("[VOACAP] Fetch aborted (superseded)");
        return;
      }
      console.warn(`[VOACAP] Fetch error: ${err.message}`);
    }
    renderVoacapMatrix();
  }
  function fetchVoacapMatrixThrottled() {
    const throttle = state_default.voacapEngine === "dvoacap" ? FETCH_THROTTLE_MS : FETCH_RETRY_MS;
    if (Date.now() - state_default.voacapLastFetch < throttle) return;
    fetchVoacapMatrix();
  }
  function findSelectedSpot() {
    if (!state_default.selectedSpotId) return null;
    const source = state_default.currentSource;
    const spots = state_default.sourceData[source] || [];
    const def = SOURCE_DEFS[source];
    if (!def || !def.spotId) return null;
    return spots.find((s) => def.spotId(s) === state_default.selectedSpotId);
  }
  function matrixHasSignal(matrix) {
    for (const entry of matrix) {
      for (const val of Object.values(entry.bands)) {
        const rel = typeof val === "object" ? val.rel || 0 : val || 0;
        if (rel >= 5) return true;
      }
    }
    return false;
  }
  function getActiveMatrix() {
    if (state_default.voacapServerData && state_default.voacapServerData.matrix) {
      const serverMatrix = state_default.voacapServerData.matrix;
      if (state_default.voacapTarget === "spot" && !matrixHasSignal(serverMatrix)) {
        const opts2 = getVoacapOpts();
        return calculate24HourMatrix(opts2);
      }
      return serverMatrix;
    }
    const opts = getVoacapOpts();
    return calculate24HourMatrix(opts);
  }
  function getBandReliability(hourData, bandName) {
    const bandVal = hourData.bands[bandName];
    if (bandVal == null) return 0;
    if (typeof bandVal === "object") return bandVal.rel || 0;
    return bandVal;
  }
  function renderVoacapMatrix() {
    const container = $("voacapMatrix");
    if (!container) return;
    const matrix = getActiveMatrix();
    const hasData = matrix.some((entry) => Object.keys(entry.bands).length > 0);
    if (!hasData) {
      container.innerHTML = '<div class="voacap-no-data">Waiting for solar data...</div>';
      return;
    }
    const spotPathDead = state_default.voacapTarget === "spot" && state_default.voacapServerData?.matrix && !matrixHasSignal(state_default.voacapServerData.matrix);
    const nowHour = (/* @__PURE__ */ new Date()).getUTCHours();
    const hourOrder = [];
    for (let i = 0; i < 24; i++) {
      hourOrder.push((nowHour + i) % 24);
    }
    const bandsReversed = [...VOACAP_BANDS].reverse();
    let html = '<table class="voacap-table"><tbody>';
    for (const band of bandsReversed) {
      const isOverlayActive = state_default.hfPropOverlayBand === band.name;
      const activeClass = isOverlayActive ? "voacap-row-active" : "";
      html += `<tr class="voacap-row ${activeClass}" data-band="${band.name}">`;
      html += `<td class="voacap-band-label">${band.label}</td>`;
      for (let i = 0; i < 24; i++) {
        const h = hourOrder[i];
        const hourData = matrix[h];
        const reliability = getBandReliability(hourData, band.name);
        const color = getReliabilityColor(reliability);
        const isNow = i === 0;
        const nowClass = isNow ? "voacap-cell-now" : "";
        html += `<td class="voacap-cell ${nowClass}" style="background-color: ${color}" title="${band.label} @ ${String(h).padStart(2, "0")}z: ${reliability}%"></td>`;
      }
      html += "</tr>";
    }
    html += '<tr class="voacap-hour-row"><td class="voacap-band-label"></td>';
    for (let i = 0; i < 24; i++) {
      const h = hourOrder[i];
      if (i % 3 === 0) {
        const isNow = i === 0;
        const nowClass = isNow ? "voacap-hour-now" : "";
        html += `<td class="voacap-hour-label ${nowClass}" colspan="3">${String(h).padStart(2, "0")}</td>`;
      }
    }
    html += "</tr>";
    html += "</tbody></table>";
    const engineLabel = state_default.voacapEngine === "dvoacap" ? "VOACAP" : "SIM";
    const engineClass = state_default.voacapEngine === "dvoacap" ? "voacap-engine-real" : "voacap-engine-sim";
    const engineTitle = state_default.voacapEngine === "dvoacap" ? "Using real VOACAP propagation model" : "Using simplified propagation model";
    const targetLabel = state_default.voacapTarget === "spot" ? "SPOT" : "OVW";
    const targetTitle = state_default.voacapTarget === "spot" ? "Showing prediction to selected spot (click for overview)" : "Showing average worldwide prediction (click for spot mode)";
    const serverData = state_default.voacapServerData;
    const effectiveSSN = serverData?.ssn ? Math.round(serverData.ssn) : null;
    const baseSSN = serverData?.ssnBase ? Math.round(serverData.ssnBase) : null;
    const kIndex = serverData?.kIndex;
    const kDegradation = serverData?.kDegradation || 0;
    const ssnDisplay = effectiveSSN ?? (state_default.lastSolarData?.indices?.sunspots || "--");
    const isStorm = kIndex !== null && kIndex >= 4;
    const ssnWarningClass = isStorm ? " voacap-k-warning" : "";
    const ssnWarningIndicator = isStorm ? "!" : "";
    let ssnTitle = "Smoothed sunspot number";
    if (kIndex !== null && baseSSN !== null) {
      if (kDegradation > 0) {
        ssnTitle = `K-index ${kIndex}: Base SSN ${baseSSN} \u2192 ${effectiveSSN} (-${kDegradation}%)`;
      } else {
        ssnTitle = `K-index ${kIndex}: SSN ${baseSSN} (no degradation)`;
      }
    }
    const overlayLabel = state_default.heatmapOverlayMode === "heatmap" ? "REL" : "\u25CB";
    const overlayTitle = state_default.heatmapOverlayMode === "heatmap" ? "Overlay: REL heatmap (click for circles)" : "Overlay: circles (click for REL heatmap)";
    html += `<div class="voacap-params">`;
    html += `<span class="voacap-engine-badge ${engineClass}" title="${engineTitle}">${engineLabel}</span>`;
    html += `<span class="voacap-param" data-param="target" title="${targetTitle}">${targetLabel}</span>`;
    const autoClass = state_default.voacapAutoSpot ? " voacap-param-active" : "";
    const autoTitle = state_default.voacapAutoSpot ? "Auto-SPOT: ON \u2014 clicking a spot refreshes VOACAP to that path (click to disable)" : "Auto-SPOT: OFF \u2014 click to auto-refresh VOACAP when selecting a spot";
    html += `<span class="voacap-param${autoClass}" data-param="autospot" title="${autoTitle}">AUTO</span>`;
    html += `<span class="voacap-param" data-param="overlay" title="${overlayTitle}">${overlayLabel}</span>`;
    html += `<span class="voacap-param" data-param="power" title="TX Power (click to cycle)">${POWER_LABELS[state_default.voacapPower] || state_default.voacapPower}</span>`;
    html += `<span class="voacap-param" data-param="mode" title="Mode (click to cycle)">${state_default.voacapMode}</span>`;
    html += `<span class="voacap-param" data-param="toa" title="Takeoff angle (click to cycle)">${state_default.voacapToa}\xB0</span>`;
    html += `<span class="voacap-param" data-param="path" title="Path type (click to cycle)">${state_default.voacapPath}</span>`;
    html += `<span class="voacap-param-static${ssnWarningClass}" title="${ssnTitle}">S=${ssnDisplay}${ssnWarningIndicator}</span>`;
    const sensLvl = state_default.voacapSensitivity;
    const sensInfo = SENSITIVITY_LEVELS[sensLvl] || SENSITIVITY_LEVELS[DEFAULT_SENSITIVITY];
    const sensDefault = sensLvl === DEFAULT_SENSITIVITY;
    const sensActiveClass = !sensDefault ? " voacap-param-active" : "";
    const sensTooltip = `SNR Sensitivity: ${sensInfo.label} (${sensLvl}/${MAX_SENSITIVITY})
${sensInfo.desc}

Required S/N for ${state_default.voacapMode}: ${sensInfo[state_default.voacapMode]}dB

Higher = stricter (fewer paths workable)
Lower = more lenient (more paths workable)

Click to cycle \u2022 Shift+click to reset to Normal`;
    html += `<span class="voacap-param${sensActiveClass}" data-param="sensitivity" title="${sensTooltip}">SN${sensLvl}</span>`;
    html += `</div>`;
    if (spotPathDead) {
      html += `<div class="voacap-no-prop">No HF path to this station \u2014 showing overview</div>`;
    }
    html += `<div class="voacap-legend">`;
    html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(0)}"></span>Closed</span>`;
    html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(20)}"></span>Poor</span>`;
    html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(50)}"></span>Fair</span>`;
    html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(80)}"></span>Good</span>`;
    html += `</div>`;
    container.innerHTML = html;
  }
  function toggleBandOverlay(band) {
    clearBandOverlay();
    clearHeatmap();
    if (state_default.hfPropOverlayBand === band) {
      state_default.hfPropOverlayBand = null;
      renderVoacapMatrix();
      return;
    }
    state_default.hfPropOverlayBand = band;
    renderVoacapMatrix();
    if (state_default.heatmapOverlayMode === "heatmap") {
      renderHeatmapCanvas(band);
    } else {
      drawBandOverlay(band);
    }
  }
  function clearBandOverlay() {
    if (!state_default.map) return;
    for (const circle of bandOverlayCircles) {
      state_default.map.removeLayer(circle);
    }
    bandOverlayCircles = [];
  }
  function drawBandOverlay(band) {
    if (!state_default.map || state_default.myLat == null || state_default.myLon == null) return;
    const L2 = window.L;
    const matrix = getActiveMatrix();
    const nowHour = (/* @__PURE__ */ new Date()).getUTCHours();
    const hourData = matrix[nowHour];
    const reliability = getBandReliability(hourData, band);
    const bandDef = VOACAP_BANDS.find((b) => b.name === band) || HF_BANDS.find((b) => b.name === band);
    if (!bandDef) return;
    const baseRadius = 500;
    const maxRadius = 15e3;
    const radius = baseRadius + (maxRadius - baseRadius) * (reliability / 100);
    if (reliability < 10) {
      const circle = L2.circle([state_default.myLat, state_default.myLon], {
        radius: 500 * 1e3,
        // 500 km in meters
        color: "#c0392b",
        fillColor: "#c0392b",
        fillOpacity: 0.1,
        weight: 1
      });
      circle.addTo(state_default.map);
      bandOverlayCircles.push(circle);
      return;
    }
    const steps = 4;
    for (let i = steps; i >= 1; i--) {
      const stepRadius = radius / steps * i;
      const stepReliability = reliability * (i / steps);
      const color = getReliabilityColor(stepReliability);
      const circle = L2.circle([state_default.myLat, state_default.myLon], {
        radius: stepRadius * 1e3,
        // km → meters
        color,
        fillColor: color,
        fillOpacity: 0.05 + 0.1 * (steps - i) / steps,
        weight: 1,
        dashArray: i === steps ? null : "4 4"
      });
      circle.addTo(state_default.map);
      bandOverlayCircles.push(circle);
    }
    const marker = L2.marker([state_default.myLat, state_default.myLon], {
      icon: L2.divIcon({
        className: "voacap-center-marker",
        html: `<div class="voacap-center-label">${band}: ${reliability}%</div>`,
        iconSize: [80, 20],
        iconAnchor: [40, 10]
      })
    });
    marker.addTo(state_default.map);
    bandOverlayCircles.push(marker);
  }
  function clearVoacapOverlay() {
    clearBandOverlay();
    clearHeatmap();
    state_default.hfPropOverlayBand = null;
  }
  function onSpotSelected() {
    if (!state_default.voacapAutoSpot) return;
    if (state_default.voacapTarget !== "spot") {
      state_default.voacapTarget = "spot";
      localStorage.setItem("hamtab_voacap_target", "spot");
    }
    fetchVoacapMatrix();
  }
  function onSpotDeselected() {
    if (!state_default.voacapAutoSpot) return;
    if (state_default.voacapTarget === "spot") {
      state_default.voacapTarget = "overview";
      localStorage.setItem("hamtab_voacap_target", "overview");
    }
    state_default.voacapServerData = null;
    fetchVoacapMatrix();
  }
  var bandOverlayCircles, activeFetchController, FETCH_THROTTLE_MS, FETCH_RETRY_MS, POWER_OPTIONS, POWER_LABELS, MODE_OPTIONS, TOA_OPTIONS, PATH_OPTIONS, SENSITIVITY_LEVELS, DEFAULT_SENSITIVITY, MAX_SENSITIVITY;
  var init_voacap = __esm({
    "src/voacap.js"() {
      init_state();
      init_dom();
      init_constants();
      init_band_conditions();
      init_rel_heatmap();
      bandOverlayCircles = [];
      activeFetchController = null;
      FETCH_THROTTLE_MS = 5 * 60 * 1e3;
      FETCH_RETRY_MS = 30 * 1e3;
      POWER_OPTIONS = ["5", "100", "1000"];
      POWER_LABELS = { "5": "5W", "100": "100W", "1000": "1kW" };
      MODE_OPTIONS = ["CW", "SSB", "FT8"];
      TOA_OPTIONS = ["3", "5", "10", "15"];
      PATH_OPTIONS = ["SP", "LP"];
      SENSITIVITY_LEVELS = {
        1: { SSB: 42, CW: 18, FT8: -4, label: "Optimistic", desc: "Beam antenna, low noise \u2014 most paths show as workable" },
        2: { SSB: 48, CW: 24, FT8: 0, label: "Relaxed", desc: "Good antenna, reasonable noise floor" },
        3: { SSB: 54, CW: 30, FT8: 2, label: "Normal", desc: "Typical amateur station (default)" },
        4: { SSB: 60, CW: 36, FT8: 8, label: "Conservative", desc: "Compromise antenna, urban noise" },
        5: { SSB: 66, CW: 42, FT8: 14, label: "Strict", desc: "Small antenna, high noise \u2014 only strong paths show" }
      };
      DEFAULT_SENSITIVITY = 3;
      MAX_SENSITIVITY = 5;
    }
  });

  // src/spot-detail.js
  function weatherCacheKey(lat, lon) {
    return `${lat.toFixed(1)},${lon.toFixed(1)}`;
  }
  function isNwsCoverage(lat, lon) {
    return lat >= 17.5 && lat <= 72 && lon >= -180 && lon <= -64;
  }
  async function fetchCallsignInfo(call) {
    if (!call) return null;
    const key = call.toUpperCase();
    if (state_default.callsignCache[key]) return state_default.callsignCache[key];
    if (state_default.callsignCache[key] === null) return null;
    try {
      const resp = await fetch(`/api/callsign/${encodeURIComponent(key)}`);
      if (!resp.ok) {
        cacheCallsign(key, null);
        return null;
      }
      const data = await resp.json();
      if (data.status !== "VALID") {
        cacheCallsign(key, null);
        return null;
      }
      cacheCallsign(key, data);
      return data;
    } catch {
      cacheCallsign(key, null);
      return null;
    }
  }
  async function fetchSpotWeather(lat, lon) {
    const key = weatherCacheKey(lat, lon);
    if (spotDetailWeatherCache[key]) return spotDetailWeatherCache[key];
    try {
      const resp = await fetch(`/api/weather/conditions?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}`);
      if (!resp.ok) return null;
      const data = await resp.json();
      spotDetailWeatherCache[key] = data;
      return data;
    } catch {
      return null;
    }
  }
  function renderLocalTime(lon) {
    const el2 = document.getElementById("spotDetailTime");
    if (!el2) return;
    el2.textContent = localTimeAtLon(lon, state_default.use24h);
  }
  function wxClass(shortForecast) {
    if (!shortForecast) return "";
    const f = shortForecast.toLowerCase();
    if (f.includes("thunder") || f.includes("storm")) return "wx-storm";
    if (f.includes("rain") || f.includes("shower") || f.includes("drizzle")) return "wx-rain";
    if (f.includes("snow") || f.includes("sleet") || f.includes("ice") || f.includes("freezing")) return "wx-snow";
    if (f.includes("cloud") || f.includes("overcast")) return "wx-cloudy";
    if (f.includes("fog") || f.includes("haze") || f.includes("mist")) return "wx-fog";
    if (f.includes("clear") || f.includes("sunny") || f.includes("fair")) return "wx-clear";
    return "";
  }
  async function updateSpotDetail(spot) {
    currentSpot = spot;
    const body = $("spotDetailBody");
    if (!body) return;
    const displayCall = spot.callsign || spot.activator || "";
    const qrzUrl = `https://www.qrz.com/db/${encodeURIComponent(displayCall)}`;
    const freq = spot.frequency || "";
    const mode2 = spot.mode || "";
    const band = freqToBand(freq) || "";
    const ref = spot.reference || "";
    const spotter = spot.spotter || "";
    const continent = spot.continent || "";
    let refHtml = "";
    if (ref) {
      const refUrl = state_default.currentSource === "sota" ? `https://www.sota.org.uk/Summit/${encodeURIComponent(ref)}` : state_default.currentSource === "wwff" ? `https://wwff.co/directory/?showRef=${encodeURIComponent(ref)}` : `https://pota.app/#/park/${encodeURIComponent(ref)}`;
      refHtml = `<a href="${refUrl}" target="_blank" rel="noopener">${esc(ref)}</a>`;
    }
    let spotterHtml = "";
    if (spotter && state_default.currentSource === "dxc") {
      const spotterQrzUrl = `https://www.qrz.com/db/${encodeURIComponent(spotter)}`;
      spotterHtml = `<a href="${spotterQrzUrl}" target="_blank" rel="noopener">${esc(spotter)}</a>`;
    }
    let bearingHtml = "";
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (state_default.myLat !== null && state_default.myLon !== null && !isNaN(lat) && !isNaN(lon)) {
      const deg = bearingTo(state_default.myLat, state_default.myLon, lat, lon);
      const longPath = (Math.round(deg) + 180) % 360;
      const mi = distanceMi(state_default.myLat, state_default.myLon, lat, lon);
      const dist = state_default.distanceUnit === "km" ? Math.round(mi * 1.60934) : Math.round(mi);
      bearingHtml = `
      <div class="spot-detail-row"><span class="spot-detail-label">SP Bearing:</span> ${Math.round(deg)}\xB0 ${bearingToCardinal(deg)}</div>
      <div class="spot-detail-row"><span class="spot-detail-label">LP Bearing:</span> ${longPath}\xB0 ${bearingToCardinal(longPath)}</div>
      <div class="spot-detail-row"><span class="spot-detail-label">Distance:</span> ${dist.toLocaleString()} ${state_default.distanceUnit}</div>
    `;
    }
    const localTime = !isNaN(lon) ? localTimeAtLon(lon, state_default.use24h) : "";
    const dxcRows = state_default.currentSource === "dxc" ? `
    ${spotterHtml ? `<div class="spot-detail-row"><span class="spot-detail-label">Spotter:</span> ${spotterHtml}</div>` : ""}
    ${continent ? `<div class="spot-detail-row"><span class="spot-detail-label">Continent:</span> ${esc(continent)}</div>` : ""}
  ` : "";
    body.innerHTML = `
    <div class="spot-detail-call"><a href="${qrzUrl}" target="_blank" rel="noopener">${esc(displayCall)}</a></div>
    <div class="spot-detail-name" id="spotDetailName"></div>
    <div class="spot-detail-row"><span class="spot-detail-label">Freq:</span> ${esc(freq)} MHz</div>
    <div class="spot-detail-row"><span class="spot-detail-label">Mode:</span> ${esc(mode2)}</div>
    ${band ? `<div class="spot-detail-row"><span class="spot-detail-label">Band:</span> ${esc(band)}</div>` : ""}
    ${refHtml ? `<div class="spot-detail-row"><span class="spot-detail-label">Ref:</span> ${refHtml}</div>` : ""}
    ${spot.name ? `<div class="spot-detail-row"><span class="spot-detail-label">${state_default.currentSource === "dxc" ? "Country:" : "Name:"}</span> ${esc(spot.name)}</div>` : ""}
    ${spot.locationDesc ? `<div class="spot-detail-row"><span class="spot-detail-label">Location:</span> ${esc(spot.locationDesc)}</div>` : ""}
    ${dxcRows}
    ${bearingHtml}
    ${!isNaN(lon) ? `<div class="spot-detail-row"><span class="spot-detail-label">DX Time:</span> <span id="spotDetailTime">${esc(localTime)}</span></div>` : ""}
    ${spot.comments ? `<div class="spot-detail-row spot-detail-comments">${esc(spot.comments)}</div>` : ""}
    <div class="spot-detail-wx" id="spotDetailWx"></div>
  `;
    if (clockInterval) clearInterval(clockInterval);
    if (!isNaN(lon)) {
      clockInterval = setInterval(() => renderLocalTime(lon), 1e3);
    }
    const info = await fetchCallsignInfo(displayCall);
    const nameEl = document.getElementById("spotDetailName");
    if (info && nameEl && currentSpot === spot) {
      const parts = [];
      if (info.name) parts.push(info.name);
      if (info.class) parts.push(`(${info.class})`);
      if (info.grid) parts.push(`\xB7 ${info.grid}`);
      if (info.addr2) parts.push(`\xB7 ${info.addr2}`);
      nameEl.textContent = parts.join(" ");
    }
    if (!isNaN(lat) && !isNaN(lon) && isNwsCoverage(lat, lon)) {
      const wxEl = document.getElementById("spotDetailWx");
      const wx = await fetchSpotWeather(lat, lon);
      if (wx && wxEl && currentSpot === spot) {
        const cls = wxClass(wx.shortForecast);
        wxEl.className = `spot-detail-wx ${cls}`;
        let tempStr = "";
        if (wx.temperature != null) {
          const apiUnit = wx.temperatureUnit || "F";
          let temp = wx.temperature;
          if (apiUnit !== state_default.temperatureUnit) {
            temp = apiUnit === "F" ? Math.round((temp - 32) * 5 / 9) : Math.round(temp * 9 / 5 + 32);
          }
          tempStr = `${temp}\xB0${state_default.temperatureUnit}`;
        }
        wxEl.innerHTML = `
        <span class="spot-detail-label">Weather:</span>
        ${esc(wx.shortForecast || "")} ${tempStr}
        ${wx.windSpeed ? `\xB7 Wind ${esc(wx.windSpeed)} ${esc(wx.windDirection || "")}` : ""}
      `;
      }
    }
  }
  function clearSpotDetail() {
    currentSpot = null;
    if (clockInterval) {
      clearInterval(clockInterval);
      clockInterval = null;
    }
    const body = $("spotDetailBody");
    if (body) body.innerHTML = '<div class="spot-detail-empty">Select a DX</div>';
  }
  function initSpotDetail() {
    clearSpotDetail();
  }
  var currentSpot, clockInterval, spotDetailWeatherCache;
  var init_spot_detail = __esm({
    "src/spot-detail.js"() {
      init_state();
      init_dom();
      init_utils();
      init_filters();
      init_geo();
      currentSpot = null;
      clockInterval = null;
      spotDetailWeatherCache = {};
    }
  });

  // src/dedx-info.js
  function initDedxListeners() {
  }
  function setDedxSpot(spot) {
    selectedSpot = spot;
    renderDedxInfo();
  }
  function clearDedxSpot() {
    selectedSpot = null;
    renderDedxInfo();
  }
  function startDedxTimer() {
    renderDedxInfo();
    if (state_default.dedxTimer) return;
    state_default.dedxTimer = setInterval(renderDedxInfo, 1e3);
  }
  function stopDedxTimer() {
    if (state_default.dedxTimer) {
      clearInterval(state_default.dedxTimer);
      state_default.dedxTimer = null;
    }
  }
  function fmtTime2(date, use24h) {
    const h = date.getHours();
    const m = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    if (use24h) return `${String(h).padStart(2, "0")}:${m}:${s}`;
    const h12 = h % 12 || 12;
    const ampm = h < 12 ? "AM" : "PM";
    return `${h12}:${m}:${s} ${ampm}`;
  }
  function localTimeAtLonDate(lon) {
    const now = /* @__PURE__ */ new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 6e4;
    const offsetMs = lon / 15 * 36e5;
    return new Date(utcMs + offsetMs);
  }
  function fmtSunCountdown(target, now, prefix) {
    if (!target) return null;
    const diffMs = target.getTime() - now.getTime();
    const absDiff = Math.abs(diffMs);
    const h = Math.floor(absDiff / 36e5);
    const m = Math.floor(absDiff % 36e5 / 6e4);
    const mm = String(m).padStart(2, "0");
    if (diffMs > 0) {
      return `${prefix} in ${h}:${mm}`;
    }
    return `${prefix} ${h}:${mm} ago`;
  }
  function renderDedxInfo() {
    if (!isWidgetVisible("widget-dedx")) return;
    renderDedxDe();
    renderDedxDx();
  }
  function renderDedxDe() {
    const timeEl = $("dedxDeTime");
    const el2 = $("dedxDeContent");
    if (!el2) return;
    const now = /* @__PURE__ */ new Date();
    if (timeEl) timeEl.textContent = fmtTime2(now, state_default.use24h);
    const call = state_default.myCallsign || "\u2014";
    const lat = state_default.myLat;
    const lon = state_default.myLon;
    let rows = `<div class="dedx-row"><span class="dedx-callsign">${esc(call)}</span></div>`;
    if (lat !== null && lon !== null) {
      const grid = latLonToGrid(lat, lon).substring(0, 6).toUpperCase();
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Grid</span><span class="dedx-value">${esc(grid)}</span></div>`;
      const cardinal = latLonToCardinal(lat, lon);
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Loc</span><span class="dedx-value">${cardinal}</span></div>`;
      const sun = getSunTimes(lat, lon, now);
      const rise = fmtSunCountdown(sun.sunrise, now, "R");
      const set = fmtSunCountdown(sun.sunset, now, "S");
      if (rise) {
        rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunrise">${rise}</span></div>`;
      }
      if (set) {
        rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunset">${set}</span></div>`;
      }
    } else {
      rows += `<div class="dedx-row dedx-empty">Set location in Config</div>`;
    }
    el2.innerHTML = rows;
  }
  function renderDedxDx() {
    const timeEl = $("dedxDxTime");
    const el2 = $("dedxDxContent");
    if (!el2) return;
    if (!selectedSpot) {
      if (timeEl) {
        const now = /* @__PURE__ */ new Date();
        const h = String(now.getUTCHours()).padStart(2, "0");
        const m = String(now.getUTCMinutes()).padStart(2, "0");
        const s = String(now.getUTCSeconds()).padStart(2, "0");
        timeEl.textContent = `${h}:${m}:${s}`;
      }
      el2.innerHTML = '<div class="dedx-utc-label">UTC</div><div class="dedx-row dedx-empty">Select a spot</div>';
      return;
    }
    const spot = selectedSpot;
    const call = spot.callsign || spot.activator || "\u2014";
    const freq = spot.frequency || "";
    const mode2 = spot.mode || "";
    const band = freqToBand(freq) || "";
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (timeEl) {
      if (!isNaN(lat) && !isNaN(lon)) {
        const dxLocal = localTimeAtLonDate(lon);
        timeEl.textContent = fmtTime2(dxLocal, state_default.use24h);
      } else {
        timeEl.textContent = "--:--:--";
      }
    }
    let rows = `<div class="dedx-row"><span class="dedx-callsign">${esc(call)}</span></div>`;
    if (freq) {
      const parts = [freq];
      if (band) parts.push(`(${band})`);
      if (mode2) parts.push(mode2);
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Freq</span><span class="dedx-value">${esc(parts.join(" "))}</span></div>`;
    } else if (mode2) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Mode</span><span class="dedx-value">${esc(mode2)}</span></div>`;
    }
    if (!isNaN(lat) && !isNaN(lon)) {
      const grid = latLonToGrid(lat, lon).substring(0, 4).toUpperCase();
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Grid</span><span class="dedx-value">${esc(grid)}</span></div>`;
      const cardinal = latLonToCardinal(lat, lon);
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Loc</span><span class="dedx-value">${cardinal}</span></div>`;
      if (state_default.myLat !== null && state_default.myLon !== null) {
        const deg = bearingTo(state_default.myLat, state_default.myLon, lat, lon);
        const mi = distanceMi(state_default.myLat, state_default.myLon, lat, lon);
        const dist = state_default.distanceUnit === "km" ? Math.round(mi * 1.60934) : Math.round(mi);
        const card = bearingToCardinal(deg);
        rows += `<div class="dedx-row"><span class="dedx-label-sm">D/B</span><span class="dedx-value dedx-compact">${dist.toLocaleString()}${state_default.distanceUnit}@${Math.round(deg)}\xB0${card}</span></div>`;
      }
      const now = /* @__PURE__ */ new Date();
      const sun = getSunTimes(lat, lon, now);
      const rise = fmtSunCountdown(sun.sunrise, now, "R");
      const set = fmtSunCountdown(sun.sunset, now, "S");
      if (rise) {
        rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunrise">${rise}</span></div>`;
      }
      if (set) {
        rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunset">${set}</span></div>`;
      }
      const offset = utcOffsetFromLon(lon);
      const sign = offset >= 0 ? "+" : "";
      rows += `<div class="dedx-row"><span class="dedx-label-sm">TZ</span><span class="dedx-value dedx-utc-badge">UTC${sign}${offset}</span></div>`;
    }
    el2.innerHTML = rows;
  }
  var selectedSpot;
  var init_dedx_info = __esm({
    "src/dedx-info.js"() {
      init_state();
      init_dom();
      init_widgets();
      init_geo();
      init_utils();
      init_filters();
      selectedSpot = null;
    }
  });

  // src/markers.js
  function ensureIcons() {
    if (defaultIcon) return;
    defaultIcon = L.icon({
      iconUrl: "vendor/images/marker-icon.png",
      iconRetinaUrl: "vendor/images/marker-icon-2x.png",
      shadowUrl: "vendor/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
    selectedIcon = L.icon({
      iconUrl: "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 22 12.5 41 12.5 41S25 22 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#ff9800"/><circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>'),
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowUrl: "vendor/images/marker-shadow.png",
      shadowSize: [41, 41]
    });
  }
  function clearGeodesicLine() {
    if (state_default.geodesicLine) {
      state_default.map.removeLayer(state_default.geodesicLine);
      state_default.geodesicLine = null;
    }
    if (state_default.geodesicLineLong) {
      state_default.map.removeLayer(state_default.geodesicLineLong);
      state_default.geodesicLineLong = null;
    }
  }
  function drawGeodesicLine(spot) {
    if (state_default.myLat == null || state_default.myLon == null || !state_default.map) return;
    let spotLat, spotLon;
    let fromGrid = false;
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      spotLat = lat;
      spotLon = lon;
    } else if (spot.grid4) {
      const center = gridToLatLon(spot.grid4);
      if (!center) return;
      spotLat = center.lat;
      spotLon = center.lon;
      fromGrid = true;
    } else {
      return;
    }
    const pts = geodesicPoints(state_default.myLat, state_default.myLon, spotLat, spotLon, 64);
    function splitAtDateline2(points) {
      const segments = [[]];
      for (let i = 0; i < points.length; i++) {
        segments[segments.length - 1].push(points[i]);
        if (i < points.length - 1) {
          if (Math.abs(points[i + 1][1] - points[i][1]) > 180) {
            segments.push([]);
          }
        }
      }
      return segments;
    }
    state_default.geodesicLine = L.polyline(splitAtDateline2(pts), {
      color: "#ff9800",
      weight: 2,
      opacity: 0.7,
      dashArray: "6 4"
    });
    state_default.geodesicLine.addTo(state_default.map);
    const midIdx = Math.floor(pts.length / 2);
    const midPt = pts[midIdx];
    const antiLat = -midPt[0];
    let antiLon = midPt[1] + 180;
    if (antiLon > 180) antiLon -= 360;
    const ptsToAnti = geodesicPoints(state_default.myLat, state_default.myLon, antiLat, antiLon, 48);
    const ptsFromAnti = geodesicPoints(antiLat, antiLon, spotLat, spotLon, 48);
    const longPts = [...ptsToAnti.slice(0, -1), ...ptsFromAnti];
    state_default.geodesicLineLong = L.polyline(splitAtDateline2(longPts), {
      color: "#ff9800",
      weight: 1.5,
      opacity: 0.35,
      dashArray: "4 6"
    });
    state_default.geodesicLineLong.addTo(state_default.map);
  }
  function clearBandPaths() {
    for (const line of state_default.dxPathLines) {
      state_default.map.removeLayer(line);
    }
    state_default.dxPathLines = [];
  }
  function drawBandPaths() {
    clearBandPaths();
    if (!state_default.mapOverlays.bandPaths) return;
    if (state_default.myLat == null || state_default.myLon == null || !state_default.map) return;
    const filtered = state_default.sourceFiltered[state_default.currentSource] || [];
    function splitAtDateline2(points) {
      const segments = [[]];
      for (let i = 0; i < points.length; i++) {
        segments[segments.length - 1].push(points[i]);
        if (i < points.length - 1 && Math.abs(points[i + 1][1] - points[i][1]) > 180) {
          segments.push([]);
        }
      }
      return segments;
    }
    for (const spot of filtered) {
      let spotLat, spotLon;
      const lat = parseFloat(spot.latitude);
      const lon = parseFloat(spot.longitude);
      if (!isNaN(lat) && !isNaN(lon)) {
        spotLat = lat;
        spotLon = lon;
      } else if (spot.grid4) {
        const center = gridToLatLon(spot.grid4);
        if (!center) continue;
        spotLat = center.lat;
        spotLon = center.lon;
      } else {
        continue;
      }
      const band = freqToBand(spot.frequency);
      const color = band ? getBandColor(band) : "#888";
      const pts = geodesicPoints(state_default.myLat, state_default.myLon, spotLat, spotLon, 32);
      const line = L.polyline(splitAtDateline2(pts), {
        color,
        weight: 1.5,
        opacity: 0.45,
        interactive: false
      });
      line.addTo(state_default.map);
      state_default.dxPathLines.push(line);
    }
  }
  function renderMarkers() {
    if (!state_default.map) return;
    ensureIcons();
    clearGeodesicLine();
    clearBandPaths();
    state_default.clusterGroup.clearLayers();
    state_default.markers = {};
    if (!SOURCE_DEFS[state_default.currentSource].hasMap) return;
    const filtered = state_default.sourceFiltered[state_default.currentSource] || [];
    filtered.forEach((spot) => {
      const lat = parseFloat(spot.latitude);
      const lon = parseFloat(spot.longitude);
      if (isNaN(lat) || isNaN(lon)) return;
      const sid = spotId(spot);
      const marker = L.marker([lat, lon], { icon: sid === state_default.selectedSpotId ? selectedIcon : defaultIcon });
      const displayCall = spot.callsign || spot.activator || "";
      const callsign = esc(displayCall);
      const qrzUrl = `https://www.qrz.com/db/${encodeURIComponent(displayCall)}`;
      let dirLine = "";
      let distLine = "";
      if (state_default.myLat !== null && state_default.myLon !== null) {
        const deg = bearingTo(state_default.myLat, state_default.myLon, lat, lon);
        const longPath = (Math.round(deg) + 180) % 360;
        const mi = distanceMi(state_default.myLat, state_default.myLon, lat, lon);
        const dist = state_default.distanceUnit === "km" ? Math.round(mi * 1.60934) : Math.round(mi);
        dirLine = `<div class="popup-dir">SP: ${Math.round(deg)}\xB0 ${bearingToCardinal(deg)} \xB7 LP: ${longPath}\xB0 ${bearingToCardinal(longPath)}</div>`;
        distLine = `<div class="popup-dist">Distance: ~${dist.toLocaleString()} ${state_default.distanceUnit}</div>`;
      }
      const localTime = localTimeAtLon(lon, state_default.use24h);
      marker.bindPopup(`
      <div class="popup-call"><a href="${qrzUrl}" target="_blank" rel="noopener">${callsign}</a></div>
      <div class="popup-freq">${esc(spot.frequency || "")} ${esc(spot.mode || "")}</div>
      <div class="popup-park"><strong>${esc(spot.reference || "")}</strong> ${esc(spot.name || "")}</div>
      ${dirLine}
      ${distLine}
      <div class="popup-time">Local time: ${esc(localTime)}</div>
      ${spot.comments ? '<div style="margin-top:4px;font-size:0.78rem;color:#8899aa;">' + esc(spot.comments) + "</div>" : ""}
    `);
      marker.on("click", () => {
        selectSpot(sid);
      });
      state_default.markers[sid] = marker;
      state_default.clusterGroup.addLayer(marker);
    });
    drawBandPaths();
  }
  function selectSpot(sid) {
    ensureIcons();
    clearGeodesicLine();
    const oldSid = state_default.selectedSpotId;
    const newSid = sid && sid === oldSid ? null : sid;
    if (oldSid && state_default.markers[oldSid]) {
      state_default.markers[oldSid].setIcon(defaultIcon);
    }
    state_default.selectedSpotId = newSid;
    if (newSid && state_default.markers[newSid]) {
      state_default.markers[newSid].setIcon(selectedIcon);
    }
    if (state_default.clusterGroup) {
      if (oldSid && state_default.markers[oldSid]) {
        const oldParent = state_default.clusterGroup.getVisibleParent(state_default.markers[oldSid]);
        if (oldParent && oldParent !== state_default.markers[oldSid] && oldParent._icon) {
          oldParent._icon.classList.remove("marker-cluster-selected");
        }
      }
      if (newSid && state_default.markers[newSid]) {
        const newParent = state_default.clusterGroup.getVisibleParent(state_default.markers[newSid]);
        if (newParent && newParent !== state_default.markers[newSid] && newParent._icon) {
          newParent._icon.classList.add("marker-cluster-selected");
        }
      }
    }
    document.querySelectorAll("#spotsBody tr").forEach((tr) => {
      tr.classList.toggle("selected", tr.dataset.spotId === newSid);
    });
    if (newSid) {
      const selectedRow = document.querySelector(`#spotsBody tr[data-spot-id="${CSS.escape(newSid)}"]`);
      if (selectedRow) {
        selectedRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    }
    if (newSid) {
      const filtered = state_default.sourceFiltered[state_default.currentSource] || [];
      const spot = filtered.find((s) => spotId(s) === newSid);
      if (spot) {
        updateSpotDetail(spot);
        setDedxSpot(spot);
        drawGeodesicLine(spot);
      } else {
        clearSpotDetail();
        clearDedxSpot();
      }
      onSpotSelected();
    } else {
      clearSpotDetail();
      clearDedxSpot();
      onSpotDeselected();
    }
  }
  function flyToSpot(spot) {
    const sid = spotId(spot);
    selectSpot(sid);
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (!state_default.map || isNaN(lat) || isNaN(lon)) return;
    if (state_default.mapCenterMode === "spot") {
      state_default.map.flyTo([lat, lon], 5, { duration: 0.8 });
    }
    const marker = state_default.markers[sid];
    if (marker) {
      marker.openPopup();
    }
  }
  var defaultIcon, selectedIcon;
  var init_markers = __esm({
    "src/markers.js"() {
      init_state();
      init_constants();
      init_utils();
      init_geo();
      init_filters();
      init_spot_detail();
      init_dedx_info();
      init_voacap();
      defaultIcon = null;
      selectedIcon = null;
    }
  });

  // src/spots.js
  function loadSpotColumnVisibility() {
    try {
      const saved = JSON.parse(localStorage.getItem(SPOT_COL_VIS_KEY));
      if (saved && typeof saved === "object") return saved;
    } catch (e) {
    }
    const vis = {};
    SOURCE_DEFS.pota.columns.forEach((c) => vis[c.key] = true);
    return vis;
  }
  function saveSpotColumnVisibility() {
    localStorage.setItem(SPOT_COL_VIS_KEY, JSON.stringify(state_default.spotColumnVisibility));
  }
  function toggleSort(colKey) {
    if (state_default.spotSortColumn === colKey) {
      state_default.spotSortDirection = state_default.spotSortDirection === "asc" ? "desc" : "asc";
    } else {
      state_default.spotSortColumn = colKey;
      state_default.spotSortDirection = colKey === "spotTime" || colKey === "age" ? "desc" : "asc";
    }
    saveCurrentFilters();
    renderSpots();
  }
  function renderSpotsHeader() {
    const cols = SOURCE_DEFS[state_default.currentSource].columns.filter((c) => state_default.spotColumnVisibility[c.key] !== false);
    const thead = $("spotsHead");
    thead.innerHTML = "";
    const tr = document.createElement("tr");
    cols.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col.label;
      if (col.sortable) {
        th.classList.add("sortable");
        th.addEventListener("click", () => toggleSort(col.key));
        const effectiveCol = state_default.spotSortColumn || SOURCE_DEFS[state_default.currentSource].sortKey;
        if (effectiveCol === col.key || col.key === "age" && effectiveCol === "spotTime" && !state_default.spotSortColumn) {
          th.classList.add(state_default.spotSortDirection === "asc" ? "sort-asc" : "sort-desc");
        }
      }
      tr.appendChild(th);
    });
    thead.appendChild(tr);
  }
  function renderSpots() {
    const filtered = state_default.sourceFiltered[state_default.currentSource] || [];
    const spotsBody = $("spotsBody");
    spotsBody.innerHTML = "";
    $("spotCount").textContent = `(${filtered.length})`;
    renderSpotsHeader();
    const cols = SOURCE_DEFS[state_default.currentSource].columns.filter((c) => state_default.spotColumnVisibility[c.key] !== false);
    const sortCol = state_default.spotSortColumn || SOURCE_DEFS[state_default.currentSource].sortKey;
    const dir = state_default.spotSortDirection === "asc" ? 1 : -1;
    const sorted = [...filtered].sort((a, b) => {
      if (sortCol === "spotTime" || sortCol === "age") {
        return dir * (new Date(a.spotTime) - new Date(b.spotTime));
      } else if (sortCol === "frequency") {
        return dir * ((parseFloat(a.frequency) || 0) - (parseFloat(b.frequency) || 0));
      } else {
        const aVal = (a[sortCol] || a.activator || "").toString().toLowerCase();
        const bVal = (b[sortCol] || b.activator || "").toString().toLowerCase();
        return dir * aVal.localeCompare(bVal);
      }
    });
    sorted.forEach((spot) => {
      const tr = document.createElement("tr");
      const sid = spotId(spot);
      tr.dataset.spotId = sid;
      if (sid === state_default.selectedSpotId) tr.classList.add("selected");
      const spotCall = (spot.activator || spot.callsign || "").toUpperCase();
      if (state_default.myCallsign && spotCall === state_default.myCallsign.toUpperCase()) {
        tr.classList.add("my-spot");
      }
      if (state_default.watchRedSpotIds.has(sid)) {
        tr.classList.add("spot-watch-red");
      }
      cols.forEach((col) => {
        const td = document.createElement("td");
        if (col.class) td.className = col.class;
        if (col.key === "spotTime") {
          const time = spot.spotTime ? new Date(spot.spotTime) : null;
          td.textContent = time ? fmtTime(time, { hour: "2-digit", minute: "2-digit" }) : "";
        } else if (col.key === "age") {
          td.textContent = formatAge(spot.spotTime);
        } else if (col.key === "callsign") {
          td.textContent = spot.activator || spot.callsign || "";
        } else if (col.key === "reference") {
          const ref = spot[col.key] || "";
          if (ref) {
            const a = document.createElement("a");
            a.textContent = ref;
            a.target = "_blank";
            a.rel = "noopener";
            if (state_default.currentSource === "sota") {
              a.href = `https://www.sota.org.uk/Summit/${ref}`;
            } else if (state_default.currentSource === "wwff") {
              a.href = `https://wwff.co/directory/?showRef=${encodeURIComponent(ref)}`;
            } else {
              a.href = `https://pota.app/#/park/${ref}`;
            }
            a.addEventListener("click", (e) => e.stopPropagation());
            td.appendChild(a);
          }
        } else if (col.key === "spotter" && state_default.currentSource === "dxc") {
          const spotter = spot.spotter || "";
          if (spotter) {
            const a = document.createElement("a");
            a.textContent = spotter;
            a.href = `https://www.qrz.com/db/${encodeURIComponent(spotter)}`;
            a.target = "_blank";
            a.rel = "noopener";
            a.addEventListener("click", (e) => e.stopPropagation());
            td.appendChild(a);
          }
        } else if (col.key === "name") {
          const val = spot[col.key] || "";
          td.textContent = val;
          td.title = val;
        } else {
          td.textContent = spot[col.key] || "";
        }
        tr.appendChild(td);
      });
      tr.addEventListener("click", () => flyToSpot(spot));
      spotsBody.appendChild(tr);
    });
  }
  var SPOT_COL_VIS_KEY;
  var init_spots = __esm({
    "src/spots.js"() {
      init_state();
      init_dom();
      init_constants();
      init_utils();
      init_filters();
      init_markers();
      SPOT_COL_VIS_KEY = "hamtab_spot_columns";
    }
  });

  // src/filters.js
  var filters_exports = {};
  __export(filters_exports, {
    applyFilter: () => applyFilter,
    clearAllFilters: () => clearAllFilters,
    deletePreset: () => deletePreset,
    fetchLicenseClass: () => fetchLicenseClass,
    filterByAge: () => filterByAge,
    filterByDistance: () => filterByDistance,
    filterByPrivileges: () => filterByPrivileges,
    filterByPropagation: () => filterByPropagation,
    freqToBand: () => freqToBand,
    getAvailableBands: () => getAvailableBands,
    getAvailableContinents: () => getAvailableContinents,
    getAvailableCountries: () => getAvailableCountries,
    getAvailableGrids: () => getAvailableGrids,
    getAvailableModes: () => getAvailableModes,
    getAvailableStates: () => getAvailableStates,
    hasActiveFilters: () => hasActiveFilters,
    initFilterListeners: () => initFilterListeners,
    isUSCallsign: () => isUSCallsign,
    loadFiltersForSource: () => loadFiltersForSource,
    loadPreset: () => loadPreset,
    normalizeMode: () => normalizeMode,
    renderWatchListEditor: () => renderWatchListEditor,
    saveCurrentFilters: () => saveCurrentFilters,
    savePreset: () => savePreset,
    saveWatchLists: () => saveWatchLists,
    spotId: () => spotId,
    updateAllFilterUI: () => updateAllFilterUI,
    updateBandFilterButtons: () => updateBandFilterButtons,
    updateContinentFilter: () => updateContinentFilter,
    updateCountryFilter: () => updateCountryFilter,
    updateDistanceAgeVisibility: () => updateDistanceAgeVisibility,
    updateGridFilter: () => updateGridFilter,
    updateModeFilterButtons: () => updateModeFilterButtons,
    updatePresetDropdown: () => updatePresetDropdown,
    updatePrivFilterVisibility: () => updatePrivFilterVisibility,
    updateStateFilter: () => updateStateFilter
  });
  function freqToBand(freqStr) {
    let freq = parseFloat(freqStr);
    if (isNaN(freq)) return null;
    if (freq > 1e3) freq = freq / 1e3;
    if (freq >= 1.8 && freq <= 2) return "160m";
    if (freq >= 3.5 && freq <= 4) return "80m";
    if (freq >= 5.3 && freq <= 5.4) return "60m";
    if (freq >= 7 && freq <= 7.3) return "40m";
    if (freq >= 10.1 && freq <= 10.15) return "30m";
    if (freq >= 14 && freq <= 14.35) return "20m";
    if (freq >= 18.068 && freq <= 18.168) return "17m";
    if (freq >= 21 && freq <= 21.45) return "15m";
    if (freq >= 24.89 && freq <= 24.99) return "12m";
    if (freq >= 28 && freq <= 29.7) return "10m";
    if (freq >= 50 && freq <= 54) return "6m";
    if (freq >= 144 && freq <= 148) return "2m";
    if (freq >= 420 && freq <= 450) return "70cm";
    return null;
  }
  function isUSCallsign(call) {
    if (!call) return false;
    return /^[AKNW][A-Z]?\d/.test(call.toUpperCase());
  }
  function normalizeMode(mode2) {
    if (!mode2) return "phone";
    const m = mode2.toUpperCase();
    if (m === "CW") return "cw";
    if (m === "SSB" || m === "FM" || m === "AM" || m === "LSB" || m === "USB") return "phone";
    return "digital";
  }
  function filterByPrivileges(spot) {
    if (!state_default.licenseClass) return true;
    const privs = US_PRIVILEGES[state_default.licenseClass.toUpperCase()];
    if (!privs) return true;
    let freq = parseFloat(spot.frequency);
    if (isNaN(freq)) return true;
    if (freq > 1e3) freq = freq / 1e3;
    const spotMode = normalizeMode(spot.mode);
    for (const [lo, hi, allowed] of privs) {
      if (freq >= lo && freq <= hi) {
        if (allowed === "all") return true;
        if (allowed === "cw" && spotMode === "cw") return true;
        if (allowed === "cwdig" && (spotMode === "cw" || spotMode === "digital")) return true;
        if (allowed === "phone" && spotMode === "phone") return true;
      }
    }
    return false;
  }
  function filterByDistance(spot) {
    if (state_default.activeMaxDistance === null) return true;
    if (state_default.myLat === null || state_default.myLon === null) return true;
    if (spot.latitude == null || spot.longitude == null) return true;
    const dist = distanceMi(state_default.myLat, state_default.myLon, spot.latitude, spot.longitude);
    const thresholdMi = state_default.distanceUnit === "km" ? state_default.activeMaxDistance * 0.621371 : state_default.activeMaxDistance;
    return dist <= thresholdMi;
  }
  function filterByAge(spot) {
    if (state_default.activeMaxAge === null) return true;
    if (!spot.spotTime) return true;
    const ageMs = Date.now() - new Date(spot.spotTime).getTime();
    const ageMin = ageMs / 6e4;
    return ageMin <= state_default.activeMaxAge;
  }
  function filterByPropagation(spot) {
    if (!state_default.propagationFilterEnabled) return true;
    if (!state_default.lastSolarData?.indices) return true;
    const band = freqToBand(spot.frequency);
    if (!band) return true;
    const bandDef = HF_BANDS.find((b) => b.name === band);
    if (!bandDef) return true;
    const { indices } = state_default.lastSolarData;
    const sfi = parseFloat(indices.sfi) || 70;
    const kIndex = parseInt(indices.kindex) || 2;
    const aIndex = parseInt(indices.aindex) || 5;
    const utcHour = (/* @__PURE__ */ new Date()).getUTCHours();
    const dayFrac = dayFraction(state_default.myLat, state_default.myLon, utcHour);
    const muf = calculateMUF(sfi, dayFrac);
    const isDay = dayFrac > 0.5;
    const rel = calculateBandReliability(bandDef.freqMHz, muf, kIndex, aIndex, isDay);
    return rel >= 30;
  }
  function getCountryPrefix(ref) {
    if (!ref) return "";
    return ref.split("-")[0];
  }
  function getUSState(locationDesc) {
    if (!locationDesc) return "";
    if (locationDesc.startsWith("US-")) return locationDesc.substring(3);
    return "";
  }
  function normalizeCallsign(raw) {
    const call = (raw || "").toUpperCase().trim();
    const slash = call.lastIndexOf("/");
    return slash > 0 ? call.substring(0, slash) : call;
  }
  function matchWatchRule(rule, spot) {
    const val = (rule.value || "").toUpperCase();
    if (!val) return false;
    switch (rule.type) {
      case "callsign": {
        const spotCall = normalizeCallsign(spot.activator || spot.callsign);
        return spotCall === val;
      }
      case "dxcc": {
        const country = (spot.name || "").toUpperCase();
        const locPrefix = (spot.locationDesc || "").split("-")[0].toUpperCase();
        return country.includes(val) || locPrefix === val;
      }
      case "grid": {
        const grid = (spot.grid4 || spot.senderLocator || "").toUpperCase();
        return grid.startsWith(val);
      }
      case "ref": {
        const ref = (spot.reference || "").toUpperCase();
        return ref === val;
      }
      default:
        return false;
    }
  }
  function saveWatchLists() {
    localStorage.setItem("hamtab_watchlists", JSON.stringify(state_default.watchLists));
  }
  function renderWatchListEditor() {
    const container = document.getElementById("watchListEditor");
    if (!container) return;
    container.innerHTML = "";
    const key = state_default.currentSource;
    if (!SOURCE_DEFS[key]) return;
    const rules = state_default.watchLists[key] || [];
    if (rules.length > 0) {
      const list = document.createElement("div");
      list.className = "wl-rule-list";
      rules.forEach((rule, idx) => {
        const row = document.createElement("div");
        row.className = "wl-rule";
        const badge = document.createElement("span");
        badge.className = `wl-rule-mode ${rule.mode}`;
        badge.textContent = rule.mode;
        row.appendChild(badge);
        const val = document.createElement("span");
        val.className = "wl-rule-value";
        val.textContent = rule.value;
        row.appendChild(val);
        const type = document.createElement("span");
        type.className = "wl-rule-type";
        type.textContent = `(${rule.type})`;
        row.appendChild(type);
        const del = document.createElement("span");
        del.className = "wl-rule-delete";
        del.textContent = "\xD7";
        del.title = "Remove rule";
        del.addEventListener("click", () => {
          state_default.watchLists[key].splice(idx, 1);
          saveWatchLists();
          applyFilter();
          renderSpots();
          renderMarkers();
          renderWatchListEditor();
        });
        row.appendChild(del);
        list.appendChild(row);
      });
      container.appendChild(list);
    }
    const form = document.createElement("div");
    form.className = "wl-add-form";
    const modes = ["red", "only", "not"];
    const radioName = `wl-mode-${key}`;
    modes.forEach((m, i) => {
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = radioName;
      radio.value = m;
      if (i === 0) radio.checked = true;
      const label = document.createElement("label");
      label.appendChild(radio);
      label.appendChild(document.createTextNode(m.charAt(0).toUpperCase() + m.slice(1)));
      form.appendChild(label);
    });
    const typeSelect = document.createElement("select");
    const types = ["callsign", "dxcc", "grid"];
    if (key === "pota" || key === "sota" || key === "wwff") types.push("ref");
    types.forEach((t) => {
      const opt = document.createElement("option");
      opt.value = t;
      opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
      typeSelect.appendChild(opt);
    });
    form.appendChild(typeSelect);
    const valueInput = document.createElement("input");
    valueInput.type = "text";
    valueInput.placeholder = "Value";
    form.appendChild(valueInput);
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.textContent = "Add";
    addBtn.addEventListener("click", () => {
      const val = valueInput.value.trim().toUpperCase();
      if (!val) return;
      const mode2 = form.querySelector(`input[name="${radioName}"]:checked`).value;
      const type = typeSelect.value;
      const existing = state_default.watchLists[key] || [];
      if (existing.some((r) => r.mode === mode2 && r.type === type && r.value === val)) return;
      if (!state_default.watchLists[key]) state_default.watchLists[key] = [];
      state_default.watchLists[key].push({ mode: mode2, type, value: val });
      saveWatchLists();
      applyFilter();
      renderSpots();
      renderMarkers();
      renderWatchListEditor();
    });
    form.appendChild(addBtn);
    container.appendChild(form);
  }
  function applyFilter() {
    state_default.watchRedSpotIds = /* @__PURE__ */ new Set();
    const allowed = SOURCE_DEFS[state_default.currentSource].filters;
    const wlRules = state_default.watchLists[state_default.currentSource] || [];
    const onlyRules = wlRules.filter((r) => r.mode === "only");
    const notRules = wlRules.filter((r) => r.mode === "not");
    const redRules = wlRules.filter((r) => r.mode === "red");
    state_default.sourceFiltered[state_default.currentSource] = (state_default.sourceData[state_default.currentSource] || []).filter((s) => {
      if (allowed.includes("band") && state_default.activeBands.size > 0) {
        const spotBand = freqToBand(s.frequency);
        if (!spotBand || !state_default.activeBands.has(spotBand)) return false;
      }
      if (allowed.includes("mode") && state_default.activeModes.size > 0) {
        if (!state_default.activeModes.has((s.mode || "").toUpperCase())) return false;
      }
      if (allowed.includes("distance") && !filterByDistance(s)) return false;
      if (allowed.includes("age") && !filterByAge(s)) return false;
      if (state_default.propagationFilterEnabled && !filterByPropagation(s)) return false;
      if (allowed.includes("country") && state_default.activeCountry && getCountryPrefix(s.reference) !== state_default.activeCountry) return false;
      if (allowed.includes("state") && state_default.activeState && getUSState(s.locationDesc) !== state_default.activeState) return false;
      if (allowed.includes("grid") && state_default.activeGrid && (s.grid4 || "") !== state_default.activeGrid) return false;
      if (allowed.includes("continent") && state_default.activeContinent && (s.continent || "") !== state_default.activeContinent) return false;
      if (allowed.includes("privilege") && state_default.privilegeFilterEnabled && !filterByPrivileges(s)) return false;
      if (wlRules.length > 0) {
        if (onlyRules.length > 0 && !onlyRules.some((r) => matchWatchRule(r, s))) return false;
        if (notRules.some((r) => matchWatchRule(r, s))) return false;
        if (redRules.length > 0 && redRules.some((r) => matchWatchRule(r, s))) {
          state_default.watchRedSpotIds.add(SOURCE_DEFS[state_default.currentSource].spotId(s));
        }
      }
      return true;
    });
  }
  function getAvailableBands() {
    const bandSet = /* @__PURE__ */ new Set();
    (state_default.sourceData[state_default.currentSource] || []).forEach((s) => {
      const band = freqToBand(s.frequency);
      if (band) bandSet.add(band);
    });
    const order = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "2m", "70cm"];
    return order.filter((b) => bandSet.has(b));
  }
  function updateBandFilterButtons() {
    const bands = getAvailableBands();
    const bandFilters = $("bandFilters");
    bandFilters.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.textContent = "All";
    allBtn.className = state_default.activeBands.size === 0 ? "active" : "";
    allBtn.addEventListener("click", () => {
      state_default.activeBands.clear();
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
      updateBandFilterButtons();
    });
    bandFilters.appendChild(allBtn);
    bands.forEach((band) => {
      const btn = document.createElement("button");
      btn.textContent = band;
      btn.className = state_default.activeBands.has(band) ? "active" : "";
      btn.addEventListener("click", () => {
        if (state_default.activeBands.has(band)) {
          state_default.activeBands.delete(band);
        } else {
          state_default.activeBands.add(band);
        }
        saveCurrentFilters();
        applyFilter();
        renderSpots();
        renderMarkers();
        updateBandFilterButtons();
      });
      bandFilters.appendChild(btn);
    });
  }
  function getAvailableModes() {
    const modeSet = /* @__PURE__ */ new Set();
    (state_default.sourceData[state_default.currentSource] || []).forEach((s) => {
      if (s.mode) modeSet.add(s.mode.toUpperCase());
    });
    return [...modeSet].sort();
  }
  function updateModeFilterButtons() {
    const modes = getAvailableModes();
    const modeFilters = $("modeFilters");
    modeFilters.innerHTML = "";
    const allBtn = document.createElement("button");
    allBtn.textContent = "All";
    allBtn.className = state_default.activeModes.size === 0 ? "active" : "";
    allBtn.addEventListener("click", () => {
      state_default.activeModes.clear();
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
      updateModeFilterButtons();
    });
    modeFilters.appendChild(allBtn);
    modes.forEach((mode2) => {
      const btn = document.createElement("button");
      btn.textContent = mode2;
      btn.className = state_default.activeModes.has(mode2) ? "active" : "";
      btn.addEventListener("click", () => {
        if (state_default.activeModes.has(mode2)) {
          state_default.activeModes.delete(mode2);
        } else {
          state_default.activeModes.add(mode2);
        }
        saveCurrentFilters();
        applyFilter();
        renderSpots();
        renderMarkers();
        updateModeFilterButtons();
      });
      modeFilters.appendChild(btn);
    });
  }
  function getAvailableCountries() {
    const countrySet = /* @__PURE__ */ new Set();
    (state_default.sourceData[state_default.currentSource] || []).forEach((s) => {
      const prefix = getCountryPrefix(s.reference);
      if (prefix) countrySet.add(prefix);
    });
    return [...countrySet].sort();
  }
  function updateCountryFilter() {
    const countries = getAvailableCountries();
    const current = state_default.activeCountry;
    const countryFilter = $("countryFilter");
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    countries.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      if (c === current) opt.selected = true;
      countryFilter.appendChild(opt);
    });
  }
  function getAvailableStates() {
    const stateSet = /* @__PURE__ */ new Set();
    (state_default.sourceData[state_default.currentSource] || []).forEach((s) => {
      const st = getUSState(s.locationDesc);
      if (st) stateSet.add(st);
    });
    return [...stateSet].sort();
  }
  function updateStateFilter() {
    const states = getAvailableStates();
    const current = state_default.activeState;
    const stateFilter = $("stateFilter");
    stateFilter.innerHTML = '<option value="">All States</option>';
    states.forEach((st) => {
      const opt = document.createElement("option");
      opt.value = st;
      opt.textContent = st;
      if (st === current) opt.selected = true;
      stateFilter.appendChild(opt);
    });
  }
  function getAvailableGrids() {
    const gridSet = /* @__PURE__ */ new Set();
    (state_default.sourceData[state_default.currentSource] || []).forEach((s) => {
      if (s.grid4) gridSet.add(s.grid4);
    });
    return [...gridSet].sort();
  }
  function updateGridFilter() {
    const grids = getAvailableGrids();
    const current = state_default.activeGrid;
    const gridFilter = $("gridFilter");
    gridFilter.innerHTML = '<option value="">All Grids</option>';
    grids.forEach((g) => {
      const opt = document.createElement("option");
      opt.value = g;
      opt.textContent = g;
      if (g === current) opt.selected = true;
      gridFilter.appendChild(opt);
    });
  }
  function getAvailableContinents() {
    const contSet = /* @__PURE__ */ new Set();
    (state_default.sourceData[state_default.currentSource] || []).forEach((s) => {
      if (s.continent) contSet.add(s.continent);
    });
    const order = ["AF", "AN", "AS", "EU", "NA", "OC", "SA"];
    return order.filter((c) => contSet.has(c));
  }
  function updateContinentFilter() {
    const continents = getAvailableContinents();
    const current = state_default.activeContinent;
    const continentFilter = $("continentFilter");
    if (!continentFilter) return;
    continentFilter.innerHTML = '<option value="">All Continents</option>';
    const labels = { AF: "Africa", AN: "Antarctica", AS: "Asia", EU: "Europe", NA: "N. America", OC: "Oceania", SA: "S. America" };
    continents.forEach((c) => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = `${c} - ${labels[c] || c}`;
      if (c === current) opt.selected = true;
      continentFilter.appendChild(opt);
    });
  }
  function updatePrivFilterVisibility() {
    const label = document.querySelector(".priv-filter-label");
    if (!label) return;
    const show2 = isUSCallsign(state_default.myCallsign) && !!state_default.licenseClass;
    label.classList.toggle("hidden", !show2);
    if (!show2) {
      state_default.privilegeFilterEnabled = false;
      const cb = $("privFilter");
      if (cb) cb.checked = false;
    }
  }
  async function fetchLicenseClass(callsign) {
    if (!isUSCallsign(callsign)) {
      state_default.licenseClass = "";
      localStorage.removeItem("hamtab_license_class");
      updatePrivFilterVisibility();
      updateOperatorDisplay();
      return;
    }
    try {
      const resp = await fetch(`/api/callsign/${encodeURIComponent(callsign)}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.status === "VALID") {
        state_default.licenseClass = (data.class || "").toUpperCase();
        if (state_default.licenseClass) localStorage.setItem("hamtab_license_class", state_default.licenseClass);
        cacheCallsign(callsign.toUpperCase(), data);
      } else {
        state_default.licenseClass = "";
        localStorage.removeItem("hamtab_license_class");
      }
    } catch (e) {
    }
    updatePrivFilterVisibility();
    updateOperatorDisplay();
  }
  function updateOperatorDisplay() {
    const { esc: esc2 } = (init_utils(), __toCommonJS(utils_exports));
    const opCall = $("opCall");
    const opLoc = $("opLoc");
    if (state_default.myCallsign) {
      const qrz = `https://www.qrz.com/db/${encodeURIComponent(state_default.myCallsign)}`;
      let classLabel = state_default.licenseClass ? `[${state_default.licenseClass}]` : "";
      opCall.innerHTML = `<a href="${qrz}" target="_blank" rel="noopener">${esc2(state_default.myCallsign)}</a>${classLabel ? `<div class="op-class">${esc2(classLabel)}</div>` : ""}`;
      const info = state_default.callsignCache[state_default.myCallsign.toUpperCase()];
      const opName = document.getElementById("opName");
      if (opName) {
        opName.textContent = info ? info.name : "";
      }
    } else {
      opCall.textContent = "";
      const opName = document.getElementById("opName");
      if (opName) opName.textContent = "";
    }
    if (state_default.myLat !== null && state_default.myLon !== null) {
      const { latLonToGrid: latLonToGrid2 } = (init_geo(), __toCommonJS(geo_exports));
      const grid = latLonToGrid2(state_default.myLat, state_default.myLon);
      opLoc.textContent = `${state_default.myLat.toFixed(2)}, ${state_default.myLon.toFixed(2)} [${grid}]`;
    } else {
      opLoc.textContent = "Location unknown";
    }
  }
  function initFilterListeners() {
    const countryFilter = $("countryFilter");
    const stateFilter = $("stateFilter");
    const gridFilter = $("gridFilter");
    const continentFilter = $("continentFilter");
    countryFilter.addEventListener("change", () => {
      state_default.activeCountry = countryFilter.value || null;
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    stateFilter.addEventListener("change", () => {
      state_default.activeState = stateFilter.value || null;
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    gridFilter.addEventListener("change", () => {
      state_default.activeGrid = gridFilter.value || null;
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    if (continentFilter) {
      continentFilter.addEventListener("change", () => {
        state_default.activeContinent = continentFilter.value || null;
        saveCurrentFilters();
        applyFilter();
        renderSpots();
        renderMarkers();
      });
    }
    const privFilterCheckbox = $("privFilter");
    privFilterCheckbox.checked = state_default.privilegeFilterEnabled;
    updatePrivFilterVisibility();
    privFilterCheckbox.addEventListener("change", () => {
      state_default.privilegeFilterEnabled = privFilterCheckbox.checked;
      localStorage.setItem("hamtab_privilege_filter", String(state_default.privilegeFilterEnabled));
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    const distanceInput = $("distanceFilter");
    const distanceUnit = $("distanceUnit");
    if (distanceInput) {
      distanceInput.addEventListener("input", () => {
        const val = distanceInput.value.trim();
        state_default.activeMaxDistance = val === "" ? null : parseFloat(val);
        if (isNaN(state_default.activeMaxDistance)) state_default.activeMaxDistance = null;
        saveCurrentFilters();
        applyFilter();
        renderSpots();
        renderMarkers();
      });
    }
    if (distanceUnit) {
      distanceUnit.value = state_default.distanceUnit;
      distanceUnit.addEventListener("change", () => {
        state_default.distanceUnit = distanceUnit.value;
        localStorage.setItem("hamtab_distance_unit", state_default.distanceUnit);
        saveCurrentFilters();
        applyFilter();
        renderSpots();
        renderMarkers();
      });
    }
    const ageFilter = $("ageFilter");
    if (ageFilter) {
      ageFilter.addEventListener("change", () => {
        const val = ageFilter.value;
        state_default.activeMaxAge = val === "" ? null : parseInt(val, 10);
        saveCurrentFilters();
        applyFilter();
        renderSpots();
        renderMarkers();
      });
    }
    const propBtn = $("propFilterBtn");
    if (propBtn) {
      propBtn.classList.toggle("active", state_default.propagationFilterEnabled);
      propBtn.addEventListener("click", () => {
        state_default.propagationFilterEnabled = !state_default.propagationFilterEnabled;
        propBtn.classList.toggle("active", state_default.propagationFilterEnabled);
        saveCurrentFilters();
        applyFilter();
        renderSpots();
        renderMarkers();
      });
    }
    const clearBtn = $("clearFiltersBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        clearAllFilters();
      });
    }
    const presetSelect = $("presetFilter");
    const savePresetBtn = $("savePresetBtn");
    const deletePresetBtn = $("deletePresetBtn");
    if (presetSelect) {
      presetSelect.addEventListener("change", () => {
        const name = presetSelect.value;
        if (name) loadPreset(name);
        presetSelect.value = "";
      });
    }
    if (savePresetBtn) {
      savePresetBtn.addEventListener("click", () => {
        const name = prompt("Preset name:");
        if (name && name.trim()) savePreset(name.trim());
      });
    }
    if (deletePresetBtn) {
      deletePresetBtn.addEventListener("click", () => {
        const name = prompt("Preset name to delete:");
        if (name && name.trim()) deletePreset(name.trim());
      });
    }
    if (state_default.myCallsign) {
      fetchLicenseClass(state_default.myCallsign);
    }
    const wlToggle = document.getElementById("wlAccordionToggle");
    if (wlToggle) {
      wlToggle.addEventListener("click", () => {
        const body = document.getElementById("wlAccordionBody");
        const open = body.classList.toggle("open");
        wlToggle.classList.toggle("open", open);
        if (open) renderWatchListEditor();
      });
    }
  }
  function spotId(spot) {
    return SOURCE_DEFS[state_default.currentSource].spotId(spot);
  }
  function saveCurrentFilters() {
    const source = state_default.currentSource;
    const filterState = {
      bands: [...state_default.activeBands],
      modes: [...state_default.activeModes],
      maxDistance: state_default.activeMaxDistance,
      distanceUnit: state_default.distanceUnit,
      maxAge: state_default.activeMaxAge,
      country: state_default.activeCountry,
      state: state_default.activeState,
      grid: state_default.activeGrid,
      continent: state_default.activeContinent,
      privilegeFilter: state_default.privilegeFilterEnabled,
      propagationFilter: state_default.propagationFilterEnabled,
      sortColumn: state_default.spotSortColumn,
      sortDirection: state_default.spotSortDirection
    };
    localStorage.setItem(`hamtab_filter_${source}`, JSON.stringify(filterState));
    updateFilterIndicator();
  }
  function loadFiltersForSource(source) {
    try {
      const saved = JSON.parse(localStorage.getItem(`hamtab_filter_${source}`));
      if (saved) {
        state_default.activeBands = new Set(saved.bands || []);
        state_default.activeModes = new Set(saved.modes || []);
        state_default.activeMaxDistance = saved.maxDistance ?? null;
        state_default.activeMaxAge = saved.maxAge ?? null;
        state_default.activeCountry = saved.country ?? null;
        state_default.activeState = saved.state ?? null;
        state_default.activeGrid = saved.grid ?? null;
        state_default.activeContinent = saved.continent ?? null;
        state_default.privilegeFilterEnabled = saved.privilegeFilter ?? false;
        state_default.propagationFilterEnabled = saved.propagationFilter ?? false;
        state_default.spotSortColumn = saved.sortColumn ?? null;
        state_default.spotSortDirection = saved.sortDirection ?? "desc";
        return;
      }
    } catch (e) {
    }
    state_default.activeBands = /* @__PURE__ */ new Set();
    state_default.activeModes = /* @__PURE__ */ new Set();
    state_default.activeMaxDistance = null;
    state_default.activeMaxAge = null;
    state_default.activeCountry = null;
    state_default.activeState = null;
    state_default.activeGrid = null;
    state_default.activeContinent = null;
    state_default.privilegeFilterEnabled = false;
    state_default.propagationFilterEnabled = false;
    state_default.spotSortColumn = null;
    state_default.spotSortDirection = "desc";
  }
  function hasActiveFilters() {
    return state_default.activeBands.size > 0 || state_default.activeModes.size > 0 || state_default.activeMaxDistance !== null || state_default.activeMaxAge !== null || state_default.activeCountry !== null || state_default.activeState !== null || state_default.activeGrid !== null || state_default.activeContinent !== null || state_default.privilegeFilterEnabled || state_default.propagationFilterEnabled;
  }
  function updateFilterIndicator() {
    const active2 = hasActiveFilters();
    const header = document.querySelector("#widget-filters .widget-header");
    if (header) {
      let badge = header.querySelector(".filter-active-badge");
      if (active2) {
        if (!badge) {
          badge = document.createElement("span");
          badge.className = "filter-active-badge";
          badge.title = "Filters active \u2014 some spots may be hidden";
          header.appendChild(badge);
        }
      } else if (badge) {
        badge.remove();
      }
    }
    const clearBtn = $("clearFiltersBtn");
    if (clearBtn) {
      clearBtn.classList.toggle("filters-active", active2);
    }
  }
  function updateAllFilterUI() {
    updateBandFilterButtons();
    updateModeFilterButtons();
    updateCountryFilter();
    updateStateFilter();
    updateGridFilter();
    updateContinentFilter();
    const distanceInput = $("distanceFilter");
    if (distanceInput) {
      distanceInput.value = state_default.activeMaxDistance !== null ? state_default.activeMaxDistance : "";
    }
    const distanceUnit = $("distanceUnit");
    if (distanceUnit) {
      distanceUnit.value = state_default.distanceUnit;
    }
    const ageFilter = $("ageFilter");
    if (ageFilter) {
      ageFilter.value = state_default.activeMaxAge !== null ? String(state_default.activeMaxAge) : "";
    }
    const privFilterCheckbox = $("privFilter");
    if (privFilterCheckbox) {
      privFilterCheckbox.checked = state_default.privilegeFilterEnabled;
    }
    const propBtn = $("propFilterBtn");
    if (propBtn) {
      propBtn.classList.toggle("active", state_default.propagationFilterEnabled);
    }
    updateFilterIndicator();
  }
  function clearAllFilters() {
    state_default.activeBands.clear();
    state_default.activeModes.clear();
    state_default.activeMaxDistance = null;
    state_default.activeMaxAge = null;
    state_default.activeCountry = null;
    state_default.activeState = null;
    state_default.activeGrid = null;
    state_default.activeContinent = null;
    state_default.privilegeFilterEnabled = false;
    state_default.propagationFilterEnabled = false;
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
    updateAllFilterUI();
  }
  function updatePresetDropdown() {
    const presetSelect = $("presetFilter");
    if (!presetSelect) return;
    const source = state_default.currentSource;
    const presets = state_default.filterPresets[source] || {};
    const names = Object.keys(presets).sort();
    presetSelect.innerHTML = '<option value="">Load Preset...</option>';
    names.forEach((name) => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      presetSelect.appendChild(opt);
    });
  }
  function savePreset(name) {
    const source = state_default.currentSource;
    const preset = {
      bands: [...state_default.activeBands],
      modes: [...state_default.activeModes],
      maxDistance: state_default.activeMaxDistance,
      distanceUnit: state_default.distanceUnit,
      maxAge: state_default.activeMaxAge,
      country: state_default.activeCountry,
      state: state_default.activeState,
      grid: state_default.activeGrid,
      continent: state_default.activeContinent,
      privilegeFilter: state_default.privilegeFilterEnabled,
      propagationFilter: state_default.propagationFilterEnabled,
      sortColumn: state_default.spotSortColumn,
      sortDirection: state_default.spotSortDirection
    };
    if (!state_default.filterPresets[source]) state_default.filterPresets[source] = {};
    state_default.filterPresets[source][name] = preset;
    localStorage.setItem("hamtab_filter_presets", JSON.stringify(state_default.filterPresets));
    updatePresetDropdown();
  }
  function loadPreset(name) {
    const source = state_default.currentSource;
    const preset = state_default.filterPresets[source]?.[name];
    if (!preset) return;
    state_default.activeBands = new Set(preset.bands || []);
    state_default.activeModes = new Set(preset.modes || []);
    state_default.activeMaxDistance = preset.maxDistance ?? null;
    state_default.activeMaxAge = preset.maxAge ?? null;
    state_default.activeCountry = preset.country ?? null;
    state_default.activeState = preset.state ?? null;
    state_default.activeGrid = preset.grid ?? null;
    state_default.activeContinent = preset.continent ?? null;
    state_default.privilegeFilterEnabled = preset.privilegeFilter ?? false;
    state_default.propagationFilterEnabled = preset.propagationFilter ?? false;
    state_default.spotSortColumn = preset.sortColumn ?? null;
    state_default.spotSortDirection = preset.sortDirection ?? "desc";
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
    updateAllFilterUI();
  }
  function deletePreset(name) {
    const source = state_default.currentSource;
    if (state_default.filterPresets[source]?.[name]) {
      delete state_default.filterPresets[source][name];
      localStorage.setItem("hamtab_filter_presets", JSON.stringify(state_default.filterPresets));
      updatePresetDropdown();
    }
  }
  function updateDistanceAgeVisibility() {
    const allowed = SOURCE_DEFS[state_default.currentSource].filters;
    const distWrap = $("distanceFilterWrap");
    const ageWrap = $("ageFilterWrap");
    const presetWrap = $("presetFilterWrap");
    if (distWrap) distWrap.style.display = allowed.includes("distance") ? "" : "none";
    if (ageWrap) ageWrap.style.display = allowed.includes("age") ? "" : "none";
    if (presetWrap) presetWrap.style.display = "";
  }
  var init_filters = __esm({
    "src/filters.js"() {
      init_state();
      init_dom();
      init_constants();
      init_utils();
      init_spots();
      init_markers();
      init_geo();
      init_band_conditions();
    }
  });

  // src/solar.js
  function aColor(val) {
    const n = parseInt(val);
    if (isNaN(n)) return "";
    if (n < 10) return "var(--green)";
    if (n < 30) return "var(--yellow)";
    return "var(--red)";
  }
  function kColor(val) {
    const n = parseInt(val);
    if (isNaN(n)) return "";
    if (n <= 2) return "var(--green)";
    if (n <= 4) return "var(--yellow)";
    return "var(--red)";
  }
  function solarWindColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return "";
    if (n < 400) return "var(--green)";
    if (n < 600) return "var(--yellow)";
    return "var(--red)";
  }
  function bzColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return "";
    if (n >= 0) return "var(--green)";
    if (n > -10) return "var(--yellow)";
    return "var(--red)";
  }
  function auroraColor(val) {
    const n = parseInt(val);
    if (isNaN(n)) return "";
    if (n <= 3) return "var(--green)";
    if (n <= 6) return "var(--yellow)";
    return "var(--red)";
  }
  function geomagColor(val) {
    const s = (val || "").toLowerCase();
    if (s.includes("quiet")) return "var(--green)";
    if (s.includes("unsettled") || s.includes("active")) return "var(--yellow)";
    if (s.includes("storm") || s.includes("major")) return "var(--red)";
    return "";
  }
  function loadSolarFieldVisibility() {
    const { SOLAR_FIELD_DEFS: SOLAR_FIELD_DEFS2 } = (init_constants(), __toCommonJS(constants_exports));
    try {
      const saved = JSON.parse(localStorage.getItem(SOLAR_VIS_KEY));
      if (saved && typeof saved === "object") return saved;
    } catch (e) {
    }
    const vis = {};
    SOLAR_FIELD_DEFS2.forEach((f) => vis[f.key] = f.defaultVisible);
    return vis;
  }
  function saveSolarFieldVisibility() {
    localStorage.setItem(SOLAR_VIS_KEY, JSON.stringify(state_default.solarFieldVisibility));
  }
  function initSolarImage() {
    const select = $("solarImageType");
    const canvas = $("solarCanvas");
    const playBtn = $("solarPlayBtn");
    if (!select || !canvas) return;
    const saved = localStorage.getItem("hamtab_sdo_type");
    if (saved) select.value = saved;
    select.addEventListener("change", () => {
      localStorage.setItem("hamtab_sdo_type", select.value);
      solarFrames = [];
      solarFrameNames = [];
      solarCurrentType = "";
      loadSolarFrames();
    });
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        solarPlaying = !solarPlaying;
        playBtn.innerHTML = solarPlaying ? "&#9646;&#9646;" : "&#9654;";
        if (solarPlaying) startSolarAnimation();
        else stopSolarAnimation();
      });
    }
    loadSolarFrames();
  }
  function startSolarAnimation() {
    stopSolarAnimation();
    if (solarFrames.length < 2) return;
    solarIntervalId = setInterval(() => {
      solarFrameIndex = (solarFrameIndex + 1) % solarFrames.length;
      drawSolarFrame();
    }, 200);
  }
  function stopSolarAnimation() {
    if (solarIntervalId) {
      clearInterval(solarIntervalId);
      solarIntervalId = null;
    }
  }
  function drawSolarFrame() {
    const canvas = $("solarCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const img = solarFrames[solarFrameIndex];
    if (!img || !img.complete || !img.naturalWidth) {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      return;
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }
  function preloadImage(filename) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = "/api/solar/frame/" + encodeURIComponent(filename);
    });
  }
  async function loadSolarFrames() {
    if (solarLoadingFrames) return;
    solarLoadingFrames = true;
    const select = $("solarImageType");
    const type = select ? select.value : "0193";
    const isFullReload = type !== solarCurrentType || solarFrames.length === 0;
    if (isFullReload) stopSolarAnimation();
    try {
      const resp = await fetch("/api/solar/frames?type=" + encodeURIComponent(type));
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const filenames = await resp.json();
      if (!filenames.length) {
        loadSolarImageFallback(type);
        return;
      }
      if (isFullReload) {
        const loaded = await Promise.all(filenames.map(preloadImage));
        solarFrames = loaded.filter(Boolean);
        solarFrameNames = filenames.filter((fn, i) => loaded[i] !== null);
        solarFrameIndex = 0;
        solarCurrentType = type;
      } else {
        const existingSet = new Set(solarFrameNames);
        const newNames = filenames.filter((fn) => !existingSet.has(fn));
        if (newNames.length > 0) {
          const newImgs = await Promise.all(newNames.map(preloadImage));
          for (let i = 0; i < newNames.length; i++) {
            if (newImgs[i]) {
              solarFrames.push(newImgs[i]);
              solarFrameNames.push(newNames[i]);
            }
          }
          if (solarFrames.length > 48) {
            const excess = solarFrames.length - 48;
            solarFrames.splice(0, excess);
            solarFrameNames.splice(0, excess);
            if (solarFrameIndex >= excess) solarFrameIndex -= excess;
            else solarFrameIndex = 0;
          }
        }
      }
      if (solarFrames.length < 2) {
        loadSolarImageFallback(type);
        return;
      }
      if (isFullReload) {
        drawSolarFrame();
        const playBtn = $("solarPlayBtn");
        if (playBtn) playBtn.innerHTML = "&#9646;&#9646;";
        solarPlaying = true;
        startSolarAnimation();
      }
    } catch (err) {
      console.error("Failed to load SDO frames:", err);
      if (solarFrames.length === 0) loadSolarImageFallback(type);
    } finally {
      solarLoadingFrames = false;
    }
  }
  function loadSolarImageFallback(type) {
    solarCurrentType = type;
    const canvas = $("solarCanvas");
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      solarFrames = [img];
      solarFrameNames = ["__fallback__"];
      solarFrameIndex = 0;
      drawSolarFrame();
    };
    img.src = "/api/solar/image?type=" + encodeURIComponent(type) + "&t=" + Date.now();
  }
  function loadSolarImage() {
    loadSolarFrames();
  }
  async function fetchSolar() {
    try {
      const resp = await fetch("/api/solar");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.lastSolarData = data;
      renderSolar(data);
      loadSolarImage();
      const { renderPropagationWidget: renderPropagationWidget2 } = await Promise.resolve().then(() => (init_band_conditions(), band_conditions_exports));
      renderPropagationWidget2();
      const { renderVoacapMatrix: renderVoacapMatrix2 } = await Promise.resolve().then(() => (init_voacap(), voacap_exports));
      renderVoacapMatrix2();
      checkAutoStormOverlay(data);
    } catch (err) {
      console.error("Failed to fetch solar:", err);
    }
  }
  function renderSolar(data) {
    const { SOLAR_FIELD_DEFS: SOLAR_FIELD_DEFS2 } = (init_constants(), __toCommonJS(constants_exports));
    const { indices, bands } = data;
    const solarIndices = $("solarIndices");
    solarIndices.innerHTML = "";
    SOLAR_FIELD_DEFS2.forEach((f) => {
      if (state_default.solarFieldVisibility[f.key] === false) return;
      const rawVal = indices[f.key];
      const displayVal = rawVal === "" || rawVal === void 0 || rawVal === "NoRpt" ? "-" : String(rawVal) + (f.unit || "");
      const color = f.colorFn ? f.colorFn(rawVal) : "";
      const div = document.createElement("div");
      div.className = "solar-card";
      const labelDiv = document.createElement("div");
      labelDiv.className = "label";
      labelDiv.textContent = f.label;
      const valueDiv = document.createElement("div");
      valueDiv.className = "value";
      if (color) valueDiv.style.color = color;
      valueDiv.textContent = displayVal;
      div.appendChild(labelDiv);
      div.appendChild(valueDiv);
      solarIndices.appendChild(div);
    });
  }
  async function fetchPropagation() {
    if (!state_default.map) return;
    if (state_default.propLayer) {
      state_default.map.removeLayer(state_default.propLayer);
      state_default.propLayer = null;
    }
    if (state_default.propLabelLayer) {
      state_default.map.removeLayer(state_default.propLabelLayer);
      state_default.propLabelLayer = null;
    }
    if (state_default.propMetric === "off") return;
    try {
      const resp = await fetch(`/api/propagation?type=${encodeURIComponent(state_default.propMetric)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.propLayer = L.geoJSON(data, {
        pane: "propagation",
        interactive: false,
        style: (feature) => ({
          color: feature.properties.stroke || "#00ff00",
          weight: 2,
          opacity: 0.7,
          fill: false
        })
      }).addTo(state_default.map);
      state_default.propLabelLayer = L.layerGroup({ pane: "propagation" }).addTo(state_default.map);
      data.features.forEach((feature) => {
        let coords = feature.geometry.coordinates;
        if (!coords || coords.length === 0) return;
        if (feature.geometry.type === "MultiLineString") {
          coords = coords.reduce((a, b) => a.length >= b.length ? a : b, coords[0]);
        }
        if (coords.length < 2) return;
        const label = feature.properties.title || String(feature.properties["level-value"]);
        const color = feature.properties.stroke || "#00ff00";
        const mid = coords[Math.floor(coords.length / 2)];
        const icon = L.divIcon({
          className: "prop-label",
          html: `<span style="color:${color}">${esc(label.trim())} MHz</span>`,
          iconSize: null
        });
        L.marker([mid[1], mid[0]], { icon, pane: "propagation", interactive: false }).addTo(state_default.propLabelLayer);
      });
    } catch (err) {
      console.error("Failed to fetch propagation:", err);
    }
  }
  function updateGrayLine() {
    if (!state_default.map) return;
    const now = /* @__PURE__ */ new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 864e5);
    const sunDec = -23.44 * Math.cos(2 * Math.PI / 365 * (dayOfYear + 10));
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const sunLon = -(utcHours - 12) * 15;
    state_default.sunLat = sunDec;
    state_default.sunLon = sunLon;
    const rad = Math.PI / 180;
    const dec = Math.abs(sunDec) < 0.1 ? 0.1 : sunDec;
    const tanDec = Math.tan(dec * rad);
    const terminator = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / tanDec) / rad;
      terminator.push([lat, lon]);
    }
    const nightPole = dec >= 0 ? -90 : 90;
    const dayPole = -nightPole;
    const points = [...terminator, [nightPole, 180], [nightPole, -180]];
    if (state_default.grayLinePolygon) {
      state_default.grayLinePolygon.setLatLngs(points);
    } else {
      state_default.grayLinePolygon = L.polygon(points, {
        pane: "grayline",
        color: "#445",
        weight: 1,
        fillColor: "#000",
        fillOpacity: 0.25,
        interactive: false
      }).addTo(state_default.map);
    }
    const dayPoints = [...terminator, [dayPole, 180], [dayPole, -180]];
    if (state_default.dayPolygon) {
      state_default.dayPolygon.setLatLngs(dayPoints);
    } else {
      state_default.dayPolygon = L.polygon(dayPoints, {
        pane: "grayline",
        color: "transparent",
        weight: 0,
        fillColor: "#ffd54f",
        fillOpacity: 0.06,
        interactive: false
      }).addTo(state_default.map);
    }
  }
  function initPropListeners() {
    document.querySelectorAll(".prop-metric-btn").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => e.stopPropagation());
      btn.addEventListener("click", () => {
        state_default.propMetric = btn.dataset.metric;
        localStorage.setItem("hamtab_prop_metric", state_default.propMetric);
        document.querySelectorAll(".prop-metric-btn").forEach((b) => b.classList.toggle("active", b.dataset.metric === state_default.propMetric));
        fetchPropagation();
      });
    });
    document.querySelectorAll(".prop-metric-btn").forEach((b) => b.classList.toggle("active", b.dataset.metric === state_default.propMetric));
    document.querySelectorAll(".map-center-btn").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => e.stopPropagation());
      btn.addEventListener("click", () => {
        state_default.mapCenterMode = btn.dataset.center;
        localStorage.setItem("hamtab_map_center", state_default.mapCenterMode);
        document.querySelectorAll(".map-center-btn").forEach((b) => b.classList.toggle("active", b.dataset.center === state_default.mapCenterMode));
        centerMap();
      });
    });
    document.querySelectorAll(".map-center-btn").forEach((b) => b.classList.toggle("active", b.dataset.center === state_default.mapCenterMode));
  }
  function centerMap() {
    if (!state_default.map) return;
    if (state_default.mapCenterMode === "qth") {
      if (state_default.myLat !== null && state_default.myLon !== null) state_default.map.flyTo([state_default.myLat, state_default.myLon], 6, { duration: 0.8 });
    } else if (state_default.mapCenterMode === "pm") {
      state_default.map.flyTo([0, 0], 2, { duration: 0.8 });
    } else if (state_default.mapCenterMode === "spot") {
      if (state_default.selectedSpotId) {
        const allSpots = state_default.sourceFiltered[state_default.currentSource] || [];
        const { spotId: spotId2 } = (init_filters(), __toCommonJS(filters_exports));
        const spot = allSpots.find((s) => spotId2(s) === state_default.selectedSpotId);
        if (spot) {
          const lat = parseFloat(spot.latitude);
          const lon = parseFloat(spot.longitude);
          if (!isNaN(lat) && !isNaN(lon)) state_default.map.flyTo([lat, lon], 5, { duration: 0.8 });
        }
      }
    }
  }
  async function checkAutoStormOverlay(data) {
    const kp = parseInt(data?.indices?.kindex);
    if (isNaN(kp)) return;
    if (kp >= 5 && !state_default.mapOverlays.drapOverlay && !lastStormAutoEnabled) {
      state_default.mapOverlays.drapOverlay = true;
      lastStormAutoEnabled = true;
      const { saveMapOverlays: saveMapOverlays2, renderDrapOverlay: renderDrapOverlay2 } = await Promise.resolve().then(() => (init_map_overlays(), map_overlays_exports));
      saveMapOverlays2();
      renderDrapOverlay2();
    } else if (kp < 5) {
      lastStormAutoEnabled = false;
    }
  }
  var SOLAR_VIS_KEY, solarFrames, solarFrameNames, solarFrameIndex, solarPlaying, solarIntervalId, solarLoadingFrames, solarCurrentType, lastStormAutoEnabled;
  var init_solar = __esm({
    "src/solar.js"() {
      init_state();
      init_dom();
      init_utils();
      SOLAR_VIS_KEY = "hamtab_solar_fields";
      solarFrames = [];
      solarFrameNames = [];
      solarFrameIndex = 0;
      solarPlaying = true;
      solarIntervalId = null;
      solarLoadingFrames = false;
      solarCurrentType = "";
      lastStormAutoEnabled = false;
    }
  });

  // src/lunar.js
  function loadMoonImage() {
    if (moonImage || moonImageLoading) return;
    moonImageLoading = true;
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        moonImage = img;
        if (state_default.lastLunarData) {
          renderMoonPhase(state_default.lastLunarData.illumination, state_default.lastLunarData.phase);
        }
      } else {
        moonImageLoading = false;
      }
    };
    img.onerror = () => {
      moonImageLoading = false;
    };
    img.src = "/api/lunar/image";
  }
  function lunarDecColor(val) {
    const n = Math.abs(parseFloat(val));
    if (isNaN(n)) return "";
    if (n < 15) return "var(--green)";
    if (n < 25) return "var(--yellow)";
    return "var(--red)";
  }
  function lunarPlColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return "";
    if (n < -0.5) return "var(--green)";
    if (n < 0.5) return "var(--yellow)";
    return "var(--red)";
  }
  function lunarElColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return "";
    if (n >= 20) return "var(--green)";
    if (n >= 0) return "var(--yellow)";
    return "var(--text-dim)";
  }
  function loadLunarFieldVisibility() {
    try {
      const saved = JSON.parse(localStorage.getItem(LUNAR_VIS_KEY));
      if (saved && typeof saved === "object") return saved;
    } catch (e) {
    }
    const vis = {};
    LUNAR_FIELD_DEFS.forEach((f) => vis[f.key] = f.defaultVisible);
    return vis;
  }
  function saveLunarFieldVisibility() {
    localStorage.setItem(LUNAR_VIS_KEY, JSON.stringify(state_default.lunarFieldVisibility));
  }
  async function fetchLunar() {
    try {
      let url = "/api/lunar";
      if (state_default.myLat !== null && state_default.myLon !== null) {
        url += `?lat=${state_default.myLat}&lon=${state_default.myLon}`;
      }
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.lastLunarData = data;
      renderLunar(data);
      const { updateMoonMarker: updateMoonMarker2 } = await Promise.resolve().then(() => (init_map_init(), map_init_exports));
      updateMoonMarker2();
    } catch (err) {
      console.error("Failed to fetch lunar:", err);
    }
  }
  function renderMoonPhase(illumination, phase) {
    const canvas = $("moonCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const size = canvas.width;
    const r = size / 2 - 2;
    const cx = size / 2;
    const cy = size / 2;
    ctx.clearRect(0, 0, size, size);
    loadMoonImage();
    const illum = Math.max(0, Math.min(100, illumination)) / 100;
    const waning = (phase || "").toLowerCase().includes("waning") || (phase || "").toLowerCase().includes("last");
    if (moonImage) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.clip();
      const scale = r * 2 / (moonImage.width * 0.82);
      const drawSize = moonImage.width * scale;
      const offset = (drawSize - r * 2) / 2;
      ctx.drawImage(moonImage, cx - r - offset, cy - r - offset, drawSize, drawSize);
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fillStyle = "#1a1a2e";
      ctx.fill();
      if (illum >= 0.99) {
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = "#d4d4d4";
        ctx.fill();
      } else if (illum > 0.01) {
        const terminatorX = Math.abs(1 - 2 * illum) * r;
        const litOnRight = !waning;
        ctx.beginPath();
        if (litOnRight) {
          ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
          if (illum <= 0.5) {
            ctx.ellipse(cx, cy, terminatorX, r, 0, Math.PI / 2, -Math.PI / 2, false);
          } else {
            ctx.ellipse(cx, cy, terminatorX, r, 0, Math.PI / 2, -Math.PI / 2, true);
          }
        } else {
          ctx.arc(cx, cy, r, Math.PI / 2, -Math.PI / 2, false);
          if (illum <= 0.5) {
            ctx.ellipse(cx, cy, terminatorX, r, 0, -Math.PI / 2, Math.PI / 2, false);
          } else {
            ctx.ellipse(cx, cy, terminatorX, r, 0, -Math.PI / 2, Math.PI / 2, true);
          }
        }
        ctx.closePath();
        ctx.fillStyle = "#d4d4d4";
        ctx.fill();
      }
    }
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#445";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function renderLunar(data) {
    const lunarCards = $("lunarCards");
    lunarCards.innerHTML = "";
    renderMoonPhase(data.illumination, data.phase);
    LUNAR_FIELD_DEFS.forEach((f) => {
      if (state_default.lunarFieldVisibility[f.key] === false) return;
      const rawVal = data[f.key];
      let displayVal;
      if (rawVal === void 0 || rawVal === null || rawVal === "") {
        displayVal = "-";
      } else if (f.format === "time") {
        displayVal = fmtTime(new Date(rawVal * 1e3));
      } else if (f.key === "distance") {
        displayVal = Number(rawVal).toLocaleString() + f.unit;
      } else if (f.key === "pathLoss") {
        displayVal = (rawVal > 0 ? "+" : "") + rawVal + f.unit;
      } else {
        displayVal = String(rawVal) + f.unit;
      }
      const color = f.colorFn ? f.colorFn(rawVal) : "";
      const div = document.createElement("div");
      div.className = "solar-card";
      const labelDiv = document.createElement("div");
      labelDiv.className = "label";
      labelDiv.textContent = f.label;
      const valueDiv = document.createElement("div");
      valueDiv.className = "value";
      if (color) valueDiv.style.color = color;
      valueDiv.textContent = displayVal;
      div.appendChild(labelDiv);
      div.appendChild(valueDiv);
      lunarCards.appendChild(div);
    });
  }
  var moonImage, moonImageLoading, LUNAR_VIS_KEY;
  var init_lunar = __esm({
    "src/lunar.js"() {
      init_state();
      init_dom();
      init_constants();
      init_utils();
      moonImage = null;
      moonImageLoading = false;
      LUNAR_VIS_KEY = "hamtab_lunar_fields";
    }
  });

  // src/constants.js
  var constants_exports = {};
  __export(constants_exports, {
    BREAKPOINT_MOBILE: () => BREAKPOINT_MOBILE,
    DEFAULT_BAND_COLORS: () => DEFAULT_BAND_COLORS,
    DEFAULT_REFERENCE_TAB: () => DEFAULT_REFERENCE_TAB,
    DEFAULT_TRACKED_SATS: () => DEFAULT_TRACKED_SATS,
    GRID_ASSIGN_KEY: () => GRID_ASSIGN_KEY,
    GRID_DEFAULT_ASSIGNMENTS: () => GRID_DEFAULT_ASSIGNMENTS,
    GRID_MODE_KEY: () => GRID_MODE_KEY,
    GRID_PERMUTATIONS: () => GRID_PERMUTATIONS,
    GRID_PERM_KEY: () => GRID_PERM_KEY,
    GRID_SIZES_KEY: () => GRID_SIZES_KEY,
    GRID_SPANS_KEY: () => GRID_SPANS_KEY,
    HEADER_H: () => HEADER_H,
    LUNAR_FIELD_DEFS: () => LUNAR_FIELD_DEFS,
    MOBILE_TAB_KEY: () => MOBILE_TAB_KEY,
    REFERENCE_TABS: () => REFERENCE_TABS,
    REFLOW_WIDGET_ORDER: () => REFLOW_WIDGET_ORDER,
    SAT_FREQUENCIES: () => SAT_FREQUENCIES,
    SCALE_MIN_FACTOR: () => SCALE_MIN_FACTOR,
    SCALE_REFERENCE_WIDTH: () => SCALE_REFERENCE_WIDTH,
    SCALE_REFLOW_WIDTH: () => SCALE_REFLOW_WIDTH,
    SNAP_DIST: () => SNAP_DIST,
    SOLAR_FIELD_DEFS: () => SOLAR_FIELD_DEFS,
    SOURCE_DEFS: () => SOURCE_DEFS,
    USER_LAYOUT_KEY: () => USER_LAYOUT_KEY,
    US_PRIVILEGES: () => US_PRIVILEGES,
    WIDGET_DEFS: () => WIDGET_DEFS,
    WIDGET_HELP: () => WIDGET_HELP,
    WIDGET_STORAGE_KEY: () => WIDGET_STORAGE_KEY,
    getBandColor: () => getBandColor,
    getBandColorOverrides: () => getBandColorOverrides,
    getLayoutMode: () => getLayoutMode,
    saveBandColors: () => saveBandColors
  });
  function getLayoutMode() {
    const w = window.innerWidth;
    if (w < SCALE_REFLOW_WIDTH) return "mobile";
    return "desktop";
  }
  function getBandColor(band) {
    return bandColorOverrides[band] || DEFAULT_BAND_COLORS[band] || "#888";
  }
  function saveBandColors(overrides) {
    bandColorOverrides = overrides;
    localStorage.setItem("hamtab_band_colors", JSON.stringify(overrides));
  }
  function getBandColorOverrides() {
    return { ...bandColorOverrides };
  }
  var WIDGET_DEFS, SAT_FREQUENCIES, DEFAULT_TRACKED_SATS, SOURCE_DEFS, SOLAR_FIELD_DEFS, LUNAR_FIELD_DEFS, US_PRIVILEGES, WIDGET_HELP, REFERENCE_TABS, DEFAULT_REFERENCE_TAB, BREAKPOINT_MOBILE, SCALE_REFERENCE_WIDTH, SCALE_MIN_FACTOR, SCALE_REFLOW_WIDTH, REFLOW_WIDGET_ORDER, DEFAULT_BAND_COLORS, bandColorOverrides, MOBILE_TAB_KEY, WIDGET_STORAGE_KEY, USER_LAYOUT_KEY, SNAP_DIST, HEADER_H, GRID_MODE_KEY, GRID_PERM_KEY, GRID_ASSIGN_KEY, GRID_SIZES_KEY, GRID_SPANS_KEY, GRID_PERMUTATIONS, GRID_DEFAULT_ASSIGNMENTS;
  var init_constants = __esm({
    "src/constants.js"() {
      init_solar();
      init_lunar();
      WIDGET_DEFS = [
        { id: "widget-filters", name: "Filters", short: "Filt" },
        { id: "widget-activations", name: "On the Air", short: "OTA" },
        { id: "widget-map", name: "HamMap", short: "MAP" },
        { id: "widget-solar", name: "Solar", short: "Sol" },
        { id: "widget-spacewx", name: "Space Wx", short: "SpWx" },
        { id: "widget-propagation", name: "Band Conditions", short: "Band" },
        { id: "widget-voacap", name: "VOACAP DE\u2192DX", short: "VOA" },
        { id: "widget-live-spots", name: "Live Spots", short: "Live" },
        { id: "widget-lunar", name: "Lunar / EME", short: "Moon" },
        { id: "widget-satellites", name: "Satellites", short: "Sat" },
        { id: "widget-rst", name: "Reference", short: "Ref" },
        { id: "widget-spot-detail", name: "DX Detail", short: "DXDt" },
        { id: "widget-contests", name: "Contests", short: "Cont" },
        { id: "widget-dxpeditions", name: "DXpeditions", short: "DXpd" },
        { id: "widget-beacons", name: "NCDXF Beacons", short: "Bcn" },
        { id: "widget-dedx", name: "DE/DX Info", short: "DEDX" },
        { id: "widget-stopwatch", name: "Stopwatch / Timer", short: "Tmr" },
        { id: "widget-analog-clock", name: "Analog Clock", short: "Clk" }
      ];
      SAT_FREQUENCIES = {
        25544: {
          name: "ISS (ZARYA)",
          uplinks: [
            { freq: 145.99, mode: "FM", desc: "V/U Repeater" }
          ],
          downlinks: [
            { freq: 437.8, mode: "FM", desc: "V/U Repeater" },
            { freq: 145.8, mode: "FM", desc: "Voice/SSTV" },
            { freq: 145.825, mode: "APRS", desc: "Packet" }
          ]
        },
        43770: {
          name: "AO-91 (RadFxSat)",
          uplinks: [
            { freq: 435.25, mode: "FM", desc: "67 Hz CTCSS" }
          ],
          downlinks: [
            { freq: 145.96, mode: "FM", desc: "FM Voice" }
          ]
        },
        43137: {
          name: "AO-92 (Fox-1D)",
          uplinks: [
            { freq: 435.35, mode: "FM", desc: "67 Hz CTCSS" }
          ],
          downlinks: [
            { freq: 145.88, mode: "FM", desc: "FM Voice" }
          ]
        },
        27607: {
          name: "SO-50 (SaudiSat-1C)",
          uplinks: [
            { freq: 145.85, mode: "FM", desc: "67 Hz arm, 74.4 Hz TX" }
          ],
          downlinks: [
            { freq: 436.795, mode: "FM", desc: "FM Voice" }
          ]
        },
        44909: {
          name: "CAS-4A (ZHUHAI-1 01)",
          uplinks: [
            { freq: 435.21, mode: "SSB/CW", desc: "Linear Transponder" }
          ],
          downlinks: [
            { freq: 145.855, mode: "SSB/CW", desc: "Linear Transponder" }
          ]
        },
        44910: {
          name: "CAS-4B (ZHUHAI-1 02)",
          uplinks: [
            { freq: 435.28, mode: "SSB/CW", desc: "Linear Transponder" }
          ],
          downlinks: [
            { freq: 145.925, mode: "SSB/CW", desc: "Linear Transponder" }
          ]
        },
        47960: {
          name: "RS-44 (DOSAAF-85)",
          uplinks: [
            { freq: 145.935, mode: "SSB/CW", desc: "Linear Transponder" }
          ],
          downlinks: [
            { freq: 435.61, mode: "SSB/CW", desc: "Linear Transponder" }
          ]
        },
        54684: {
          name: "TEVEL-1",
          uplinks: [
            { freq: 145.97, mode: "FM", desc: "FM Transponder" }
          ],
          downlinks: [
            { freq: 436.4, mode: "FM", desc: "FM Transponder" }
          ]
        },
        54685: {
          name: "TEVEL-2",
          uplinks: [
            { freq: 145.97, mode: "FM", desc: "FM Transponder" }
          ],
          downlinks: [
            { freq: 436.4, mode: "FM", desc: "FM Transponder" }
          ]
        }
      };
      DEFAULT_TRACKED_SATS = [25544];
      SOURCE_DEFS = {
        pota: {
          label: "POTA",
          endpoint: "/api/spots",
          columns: [
            { key: "callsign", label: "Callsign", class: "callsign", sortable: true },
            { key: "frequency", label: "Freq", class: "freq", sortable: true },
            { key: "mode", label: "Mode", class: "mode", sortable: true },
            { key: "reference", label: "Park (link)", class: "" },
            { key: "name", label: "Name", class: "" },
            { key: "spotTime", label: "Time", class: "", sortable: true },
            { key: "age", label: "Age", class: "", sortable: true }
          ],
          filters: ["band", "mode", "distance", "age", "country", "state", "grid", "privilege"],
          hasMap: true,
          spotId: (s) => `${s.activator || s.callsign}-${s.reference}-${s.frequency}`,
          sortKey: "spotTime"
        },
        sota: {
          label: "SOTA",
          endpoint: "/api/spots/sota",
          columns: [
            { key: "callsign", label: "Callsign", class: "callsign", sortable: true },
            { key: "frequency", label: "Freq", class: "freq", sortable: true },
            { key: "mode", label: "Mode", class: "mode", sortable: true },
            { key: "reference", label: "Summit (link)", class: "" },
            { key: "name", label: "Details", class: "" },
            { key: "spotTime", label: "Time", class: "", sortable: true },
            { key: "age", label: "Age", class: "", sortable: true }
          ],
          filters: ["band", "mode", "distance", "age", "privilege"],
          hasMap: true,
          spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
          sortKey: "spotTime"
        },
        dxc: {
          label: "DXC",
          endpoint: "/api/spots/dxc",
          columns: [
            { key: "callsign", label: "DX Station", class: "callsign", sortable: true },
            { key: "frequency", label: "Freq", class: "freq", sortable: true },
            { key: "mode", label: "Mode", class: "mode", sortable: true },
            { key: "spotter", label: "Spotter", class: "" },
            { key: "name", label: "Country", class: "" },
            { key: "continent", label: "Cont", class: "" },
            { key: "spotTime", label: "Time", class: "", sortable: true },
            { key: "age", label: "Age", class: "", sortable: true }
          ],
          filters: ["band", "mode", "distance", "age", "continent", "privilege"],
          hasMap: true,
          spotId: (s) => `${s.callsign}-${s.frequency}-${s.spotTime}`,
          sortKey: "spotTime"
        },
        wwff: {
          label: "WWFF",
          endpoint: "/api/spots/wwff",
          columns: [
            { key: "callsign", label: "Callsign", class: "callsign", sortable: true },
            { key: "frequency", label: "Freq", class: "freq", sortable: true },
            { key: "mode", label: "Mode", class: "mode", sortable: true },
            { key: "reference", label: "Ref (link)", class: "" },
            { key: "name", label: "Name", class: "" },
            { key: "spotTime", label: "Time", class: "", sortable: true },
            { key: "age", label: "Age", class: "", sortable: true }
          ],
          filters: ["band", "mode", "distance", "age", "privilege"],
          hasMap: true,
          spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
          sortKey: "spotTime"
        },
        psk: {
          label: "PSK",
          endpoint: "/api/spots/psk",
          columns: [
            { key: "callsign", label: "TX Call", class: "callsign", sortable: true },
            { key: "frequency", label: "Freq", class: "freq", sortable: true },
            { key: "mode", label: "Mode", class: "mode", sortable: true },
            { key: "reporter", label: "RX Call", class: "" },
            { key: "snr", label: "SNR", class: "" },
            { key: "senderLocator", label: "TX Grid", class: "" },
            { key: "reporterLocator", label: "RX Grid", class: "" },
            { key: "spotTime", label: "Time", class: "", sortable: true },
            { key: "age", label: "Age", class: "", sortable: true }
          ],
          filters: ["band", "mode", "distance", "age", "privilege"],
          hasMap: true,
          spotId: (s) => `${s.callsign}-${s.reporter}-${s.frequency}-${s.spotTime}`,
          sortKey: "spotTime"
        }
      };
      SOLAR_FIELD_DEFS = [
        { key: "sfi", label: "Solar Flux", unit: "", colorFn: null, defaultVisible: true },
        { key: "sunspots", label: "Sunspots", unit: "", colorFn: null, defaultVisible: true },
        { key: "aindex", label: "A-Index", unit: "", colorFn: aColor, defaultVisible: true },
        { key: "kindex", label: "K-Index", unit: "", colorFn: kColor, defaultVisible: true },
        { key: "xray", label: "X-Ray", unit: "", colorFn: null, defaultVisible: true },
        { key: "signalnoise", label: "Signal Noise", unit: "", colorFn: null, defaultVisible: true },
        { key: "solarwind", label: "Solar Wind", unit: " km/s", colorFn: solarWindColor, defaultVisible: false },
        { key: "magneticfield", label: "Bz (IMF)", unit: " nT", colorFn: bzColor, defaultVisible: false },
        { key: "protonflux", label: "Proton Flux", unit: "", colorFn: null, defaultVisible: false },
        { key: "electonflux", label: "Electron Flux", unit: "", colorFn: null, defaultVisible: false },
        { key: "aurora", label: "Aurora", unit: "", colorFn: auroraColor, defaultVisible: false },
        { key: "latdegree", label: "Aurora Lat", unit: "\xB0", colorFn: null, defaultVisible: false },
        { key: "heliumline", label: "He 10830\xC5", unit: "", colorFn: null, defaultVisible: false },
        { key: "geomagfield", label: "Geomag Field", unit: "", colorFn: geomagColor, defaultVisible: false },
        { key: "kindexnt", label: "K-Index (Night)", unit: "", colorFn: kColor, defaultVisible: false },
        { key: "muf", label: "MUF", unit: " MHz", colorFn: null, defaultVisible: false },
        { key: "fof2", label: "foF2", unit: " MHz", colorFn: null, defaultVisible: false },
        { key: "muffactor", label: "MUF Factor", unit: "", colorFn: null, defaultVisible: false }
      ];
      LUNAR_FIELD_DEFS = [
        { key: "phase", label: "Moon Phase", unit: "", colorFn: null, defaultVisible: true },
        { key: "illumination", label: "Illumination", unit: "%", colorFn: null, defaultVisible: true },
        { key: "elevation", label: "Elevation", unit: "\xB0", colorFn: lunarElColor, defaultVisible: true },
        { key: "azimuth", label: "Azimuth", unit: "\xB0", colorFn: null, defaultVisible: true },
        { key: "moonrise", label: "Moonrise", unit: "", colorFn: null, defaultVisible: true, format: "time" },
        { key: "moonset", label: "Moonset", unit: "", colorFn: null, defaultVisible: true, format: "time" },
        { key: "declination", label: "Declination", unit: "\xB0", colorFn: lunarDecColor, defaultVisible: true },
        { key: "distance", label: "Distance", unit: " km", colorFn: null, defaultVisible: true },
        { key: "pathLoss", label: "Path Loss", unit: " dB", colorFn: lunarPlColor, defaultVisible: true },
        { key: "elongation", label: "Elongation", unit: "\xB0", colorFn: null, defaultVisible: false },
        { key: "eclipticLon", label: "Ecl. Longitude", unit: "\xB0", colorFn: null, defaultVisible: false },
        { key: "eclipticLat", label: "Ecl. Latitude", unit: "\xB0", colorFn: null, defaultVisible: false },
        { key: "rightAscension", label: "Right Ascension", unit: "\xB0", colorFn: null, defaultVisible: false }
      ];
      US_PRIVILEGES = {
        EXTRA: [
          [1.8, 2, "all"],
          [3.5, 4, "all"],
          [5.3, 5.4, "all"],
          [7, 7.3, "all"],
          [10.1, 10.15, "all"],
          [14, 14.35, "all"],
          [18.068, 18.168, "all"],
          [21, 21.45, "all"],
          [24.89, 24.99, "all"],
          [28, 29.7, "all"],
          [50, 54, "all"],
          [144, 148, "all"],
          [420, 450, "all"]
        ],
        GENERAL: [
          [1.8, 2, "all"],
          [3.525, 3.6, "cwdig"],
          [3.8, 4, "phone"],
          [5.3, 5.4, "all"],
          [7.025, 7.125, "cwdig"],
          [7.175, 7.3, "phone"],
          [10.1, 10.15, "cwdig"],
          [14.025, 14.15, "cwdig"],
          [14.225, 14.35, "phone"],
          [18.068, 18.11, "cwdig"],
          [18.11, 18.168, "phone"],
          [21.025, 21.2, "cwdig"],
          [21.275, 21.45, "phone"],
          [24.89, 24.93, "cwdig"],
          [24.93, 24.99, "phone"],
          [28, 29.7, "all"],
          [50, 54, "all"],
          [144, 148, "all"],
          [420, 450, "all"]
        ],
        TECHNICIAN: [
          [3.525, 3.6, "cw"],
          [7.025, 7.125, "cw"],
          [21.025, 21.2, "cw"],
          [28, 28.3, "cwdig"],
          [28.3, 28.5, "phone"],
          [50, 54, "all"],
          [144, 148, "all"],
          [420, 450, "all"]
        ],
        NOVICE: [
          [3.525, 3.6, "cw"],
          [7.025, 7.125, "cw"],
          [21.025, 21.2, "cw"],
          [28, 28.3, "cwdig"],
          [28.3, 28.5, "phone"],
          [222, 225, "all"],
          [420, 450, "all"]
        ]
      };
      WIDGET_HELP = {
        "widget-filters": {
          title: "Filters",
          description: "Narrow down the spot list to find exactly what you're looking for. Filters let you focus on specific bands, modes, nearby stations, or recent activity. Watch lists add per-source highlighting and include/exclude rules.",
          sections: [
            { heading: "Band & Mode Filters", content: "Click one or more bands (like 20m, 40m) or modes (like FT8, SSB) to show only those spots. Click again to deselect. You can select as many as you want." },
            { heading: "Distance Filter", content: "Show only spots within a certain distance from your location (QTH). You'll need to set your location in Config first. Great for finding nearby activations you can reach." },
            { heading: "Age Filter", content: "Show only spots posted within the last N minutes. Older spots may no longer be active, so this helps you find stations that are on the air right now." },
            { heading: "Propagation Filter", content: `Click the "Prop" button to hide spots on bands with poor predicted propagation. Uses your current solar indices and location to estimate which HF bands are likely open. Spots on bands rated below "Fair" (less than 30% reliability) are filtered out. VHF/UHF spots are never filtered since they don't depend on HF propagation.` },
            { heading: "Watch Lists", content: 'Click the "Watch Lists" accordion below the presets to add rules for the active source tab. Three modes: Red highlights matching spots with a tinted row, Only shows ONLY matching spots (everything else hidden), Not excludes matching spots. Match by callsign (strips /P, /M suffixes), DXCC entity, grid prefix, or park/summit reference. Rules apply per source tab and persist across sessions.' },
            { heading: "Presets", content: 'Save your favorite filter combinations and switch between them quickly. For example, save a "Local FT8" preset for nearby digital spots, and a "DX SSB" preset for long-distance voice contacts.' }
          ]
        },
        "widget-activations": {
          title: "On the Air",
          description: "A live feed of stations currently on the air. This is your main view for finding stations to contact. Data comes from five sources: POTA (Parks on the Air), SOTA (Summits on the Air), DX Cluster (worldwide DX spots), WWFF (World Wide Flora & Fauna), and PSKReporter (digital mode reception reports).",
          sections: [
            { heading: "How to Use", content: "Use the tabs at the top to switch between POTA, SOTA, DXC, WWFF, and PSK sources. Click any row to select that station \u2014 its details will appear in the DX Detail widget and its location will be highlighted on the map." },
            { heading: "POTA", content: "Shows operators activating parks for the Parks on the Air program. Click the park reference link to see park details on the POTA website." },
            { heading: "SOTA", content: "Shows operators activating mountain summits for the Summits on the Air program. Click the summit reference for details." },
            { heading: "DX Cluster", content: "Worldwide spots from the DX Cluster network. Great for finding rare or distant (DX) stations." },
            { heading: "WWFF", content: "Shows operators activating nature reserves for the World Wide Flora & Fauna program. Similar to POTA but with a worldwide scope \u2014 especially popular in Europe. Click the reference link for reserve details." },
            { heading: "PSK Reporter", content: "Digital mode reception reports from PSKReporter. Shows which stations are being decoded and where, useful for checking band conditions." }
          ]
        },
        "widget-map": {
          title: "HamMap",
          description: "An interactive world map showing the locations of spotted stations, your location, satellite tracks, and optional overlays. This gives you a visual picture of who's on the air and where.",
          sections: [
            { heading: "Spot Markers", content: "Each dot on the map is a spotted station. Click a marker to select it and see its details. A line will be drawn showing the path from your location to the station." },
            { heading: "Map Overlays", content: "Click the gear icon to toggle overlays: lat/lon grid, Maidenhead grid squares (a location system hams use), time zones, MUF map (Maximum Usable Frequency from prop.kc2g.com), D-RAP absorption (NOAA SWPC \u2014 shows where HF signals are being absorbed by solar events), DX Paths (band-colored great circle lines), DXpedition Markers (active/upcoming DXpeditions), Tropics & Arctic Lines (major latitude circles with labels), Weather Radar (global precipitation from RainViewer), Cloud Cover (OpenWeatherMap \u2014 useful for satellite and EME ops), and Map Legend (color key for all marker types). D-RAP auto-enables when Kp reaches storm level (\u22655). Cloud Cover requires an OpenWeatherMap API key (enter in Config > Services)." },
            { heading: "Geodesic Paths", content: "The curved line between you and a selected station is called a geodesic (great-circle) path \u2014 this is the shortest route over the Earth's surface and the direction to point your antenna." },
            { heading: "Center Mode", content: "In Config, choose whether the map stays centered on your location (QTH) or follows the selected spot." }
          ]
        },
        "widget-solar": {
          title: "Solar",
          description: "Real-time space weather data that affects radio propagation. The sun's activity directly determines which bands are open and how far your signal can travel.",
          sections: [
            { heading: "What This Shows", content: "Solar Flux (SFI) and Sunspot Number indicate overall solar activity \u2014 higher values generally mean better HF propagation. The A-Index and K-Index measure geomagnetic disturbance \u2014 lower is better for radio." },
            { heading: "Color Coding", content: "Values are color-coded: green means good conditions for radio, yellow means fair, and red means poor or disturbed. Watch the K-Index especially \u2014 values above 4 can shut down HF bands." },
            { heading: "Customize Fields", content: "Click the gear icon to show or hide individual fields. By default, the most useful metrics are shown. Advanced users can enable additional fields like solar wind speed, Bz component, and aurora activity." }
          ],
          links: [
            { label: "HamQSL Space Weather", url: "https://www.hamqsl.com/solar.html" }
          ]
        },
        "widget-spacewx": {
          title: "Space Weather History",
          description: "Historical graphs of key space weather indices over the past week (or 90 days for Solar Flux). These charts help you spot trends and understand how conditions are changing \u2014 not just a single snapshot, but the bigger picture.",
          sections: [
            { heading: "Tabs", content: "Five tabs let you switch between different measurements: Kp index (geomagnetic activity), X-Ray flux (solar flare intensity), SFI (Solar Flux Index \u2014 overall solar activity), Solar Wind speed, and Bz (interplanetary magnetic field direction)." },
            { heading: "What the graphs show", content: "Kp: Bar chart colored green/yellow/red \u2014 values above 4 mean geomagnetic storms that can disrupt HF. X-Ray: Line chart on a log scale \u2014 C/M/X class flares marked. SFI: 90-day trend \u2014 higher values (100+) mean better HF propagation. Wind: Solar wind speed \u2014 above 400 km/s can disturb conditions. Bz: Southward (negative) Bz opens Earth's magnetosphere to solar wind, worsening conditions." },
            { heading: "Data source", content: "All data comes from NOAA Space Weather Prediction Center (SWPC), updated every 15 minutes." }
          ],
          links: [
            { label: "NOAA SWPC", url: "https://www.swpc.noaa.gov/" }
          ]
        },
        "widget-propagation": {
          title: "Band Conditions",
          description: "HF band conditions and VHF propagation status. Shows per-band reliability predictions for both day and night simultaneously, plus VHF phenomena like Aurora and E-Skip.",
          sections: [
            { heading: "HF Bands", content: "Each band shows a reliability percentage and condition (Excellent/Good/Fair/Poor/Closed). Day and night are shown side by side \u2014 day conditions appear in the left column (orange border), night in the right column (blue border). Green means the band is likely open, yellow means marginal, red means closed." },
            { heading: "VHF Conditions", content: "Below the HF bands, VHF propagation phenomena are shown: Aurora (affects 2m and above in northern latitudes) and E-Skip (sporadic E-layer openings on 6m/4m/2m by region). Data comes directly from HamQSL." },
            { heading: "How It Works", content: "HF predictions are calculated from Solar Flux (SFI), K-index, and A-index using an ionospheric model. Higher SFI means better HF conditions. K-index above 4 can shut down HF bands. The summary bar shows current MUF (Maximum Usable Frequency), SFI, and K-index." }
          ],
          links: [
            { label: "NOAA Space Weather", url: "https://www.swpc.noaa.gov/" },
            { label: "HamQSL Solar Data", url: "https://www.hamqsl.com/solar.html" }
          ]
        },
        "widget-lunar": {
          title: "Lunar / EME",
          description: 'Moon tracking data for Earth-Moon-Earth (EME or "moonbounce") communication. EME is an advanced technique where operators bounce radio signals off the moon to make contacts over very long distances.',
          sections: [
            { heading: "Moon Phase & Position", content: "Shows the current moon phase, illumination, and sky position. The moon needs to be above the horizon at both your location and the other station's location for EME to work." },
            { heading: "Azimuth & Elevation", content: "Shows where the moon is in your sky right now. Elevation is the angle above your horizon \u2014 green (20\xB0+) is ideal for EME, yellow (0-20\xB0) is marginal, dim means below the horizon. Azimuth is the compass bearing (0\xB0 = North, 90\xB0 = East, etc.)." },
            { heading: "Moonrise & Moonset", content: "Shows the next moonrise and moonset times for your location. These help you plan EME operating windows. Requires your location to be set in Configuration." },
            { heading: "EME Path Loss", content: "Shows how much signal is lost on the round trip to the moon and back, calculated at 144 MHz (2m band). Lower path loss means better EME conditions. Loss varies with moon distance \u2014 closer moon (perigee) means less loss." },
            { heading: "Declination", content: "The moon's angle relative to the equator. Higher declination generally means longer EME windows (more time with the moon above the horizon)." },
            { heading: "Customize Fields", content: "Click the gear icon to show additional data like elongation, ecliptic coordinates, and right ascension for advanced planning." }
          ],
          links: [
            { label: "ARRL EME Guide", url: "https://www.arrl.org/eme" },
            { label: "NASA Moon Visualization", url: "https://svs.gsfc.nasa.gov/5187" }
          ]
        },
        "widget-satellites": {
          title: "Satellites",
          description: "Track amateur radio satellites in real time and predict when they'll pass over your location. Many satellites carry amateur radio repeaters that anyone with a ham license can use to make contacts.",
          sections: [
            { heading: "ISS Tracking", content: "The ISS (International Space Station) is tracked automatically \u2014 no API key needed! Its position, footprint, and predicted orbit path appear on the map as a dashed cyan line. The ISS has an amateur radio station (ARISS) onboard." },
            { heading: "Adding More Satellites", content: "To track additional satellites like AO-91, SO-50, and others, you'll need a free API key from N2YO.com \u2014 enter it in Config. Click the gear icon to search for and add satellites." },
            { heading: "Live Position", content: "See where each satellite is right now on the map, along with its altitude, speed, and whether it's above your horizon (visible to you)." },
            { heading: "TLE Age", content: 'Each satellite row shows the age of its TLE (orbital element) data in days. Color thresholds are based on the configurable "Max TLE Age" setting (default: 7 days) \u2014 green = fresh, yellow = aging, red + \u26A0 = exceeds max age. Stale TLEs reduce position accuracy. The ISS TLE is refreshed from CelesTrak every 6 hours. Set the max age in the satellite config (gear icon).' },
            { heading: "Pass Predictions", content: "Click a satellite to see when it will next pass over your location. AOS (Acquisition of Signal) is when it rises, LOS (Loss of Signal) is when it sets. Higher max elevation passes are easier to work." }
          ],
          links: [
            { label: "N2YO Satellite Tracker", url: "https://www.n2yo.com/" },
            { label: "AMSAT \u2014 Amateur Satellites", url: "https://www.amsat.org/" }
          ]
        },
        "widget-rst": {
          title: "Reference",
          description: "Quick-reference tables for common ham radio information. Use the tabs to switch between RST signal reports, NATO phonetic alphabet, Morse code, Q-codes, and US band privileges.",
          sections: [
            { heading: "RST Reports", content: "The RST tab shows readability (R), signal strength (S), and tone (T) values. During a contact, you exchange signal reports so each station knows how well they're being received." },
            { heading: "Phonetic & Morse", content: "The Phonetic tab has the NATO phonetic alphabet for spelling callsigns clearly. The Morse tab shows dit/dah patterns for each character." },
            { heading: "Q-Codes", content: "Common three-letter abbreviations starting with Q, originally for CW but now used on voice too. QTH = your location, QSO = a contact, QSL = confirmed." },
            { heading: "Bands", content: 'US amateur band privileges by license class (Extra, General, Technician, Novice). Check "My privileges only" to show just your class. Requires a US callsign set in Config.' }
          ],
          links: [
            { label: "Ham Radio School \u2014 Signal Reports", url: "https://www.hamradioschool.com/post/practical-signal-reports" }
          ]
        },
        "widget-rst:phonetic": {
          title: "Phonetic Alphabet",
          description: `The NATO phonetic alphabet is used by hams to spell out callsigns and words clearly, especially when signals are weak or noisy. Instead of saying the letter "B", you say "Bravo" so it can't be confused with "D", "E", or "P".`,
          sections: [
            { heading: "When to Use It", content: `Use the phonetic alphabet whenever you give your callsign on the air. For example, W1AW would be spoken as "Whiskey One Alpha Whiskey". It's also used to spell names, locations, or any word that needs to be communicated clearly.` },
            { heading: "Tips", content: `You'll quickly memorize the phonetics for your own callsign. Practice saying it aloud before your first contact! Some hams use creative alternatives (like "Kilowatt" for K), but the standard NATO alphabet is always understood.` }
          ]
        },
        "widget-rst:morse": {
          title: "Morse Code",
          description: "Morse code (CW) is one of the oldest and most effective modes in ham radio. It uses short signals (dits, shown as dots) and long signals (dahs, shown as dashes) to represent letters and numbers. CW can get through when voice and digital modes can't.",
          sections: [
            { heading: "Learning Morse", content: 'The best way to learn Morse code is by sound, not by memorizing the dot-dash patterns visually. Apps like "Morse Trainer" or the Koch method help you learn by listening to characters at full speed.' },
            { heading: "Prosigns", content: 'Prosigns are special Morse sequences with specific meanings: AR (.-.-.) means "end of message", BT (-...-) means "pause/break", SK (...-.-) means "end of contact", and 73 means "best regards".' },
            { heading: "On the Air", content: "CW is popular for QRP (low power) operating because it's very efficient. A 5-watt CW signal can often be copied when a 100-watt voice signal cannot. Many hams enjoy CW contesting and DX." }
          ],
          links: [
            { label: "LCWO \u2014 Learn CW Online", url: "https://lcwo.net/" }
          ]
        },
        "widget-rst:qcodes": {
          title: "Q-Codes",
          description: `Q-codes are three-letter abbreviations starting with "Q" that were originally created for CW (Morse code) to save time. Many are now commonly used in voice conversations too. As a question, they end with a "?"; as a statement, they're a direct answer.`,
          sections: [
            { heading: "Most Common for New Hams", content: 'QTH = your location ("My QTH is Denver"). QSO = a contact/conversation. QSL = confirmation ("QSL" means "I confirm" or "received"). QRZ = "who is calling?" (also the name of a popular callsign lookup website).' },
            { heading: "Power & Interference", content: "QRP = low power (5W or less) \u2014 a popular challenge mode. QRO = high power. QRM = man-made interference. QRN = natural noise (static). QSB = signal fading in and out." },
            { heading: "Operating", content: `QSY = change frequency ("Let's QSY to 14.250"). QRT = shutting down for the day ("I'm going QRT"). QRV = ready to receive. QRL = the frequency is in use (always ask "QRL?" before transmitting on a frequency!).` }
          ]
        },
        "widget-rst:bands": {
          title: "US Band Privileges",
          description: "A reference chart showing which frequencies and modes are available to each US license class. This is based on FCC Part 97.301\u201397.305.",
          sections: [
            { heading: "License Classes", content: "US ham licenses come in four classes: Technician (entry level), General (expanded HF access), Amateur Extra (full privileges), and Novice (legacy, no longer issued). Each class has different frequency allocations." },
            { heading: "My Privileges Only", content: 'Check "My privileges only" to filter the table to show just your license class. This requires a US callsign to be set in Config \u2014 your license class is looked up automatically.' },
            { heading: "Mode Groups", content: "All = any mode allowed. CW = Morse code only. CW/Digital = CW and digital modes (FT8, PSK31, etc.). Phone = voice modes (SSB, FM, AM)." }
          ]
        },
        "widget-spot-detail": {
          title: "DX Detail",
          description: "Shows detailed information about whichever station you've selected. Click any row in the On the Air table or any marker on the map to see that station's details here.",
          sections: [
            { heading: "Station Info", content: "Displays the operator's name, location, license class, and grid square (looked up from their callsign). For POTA/SOTA/WWFF spots, the park or summit location (e.g. US-TX, VE-ON) is also shown. This helps you know who you're about to contact." },
            { heading: "Distance & Bearing", content: "Shows how far away the station is and which direction to point your antenna (bearing). Requires your location to be set in Config." },
            { heading: "Frequency & Mode", content: "The frequency and mode the station is operating on, so you know exactly where to tune your radio." },
            { heading: "Weather", content: "Shows current weather conditions at the station's location, if available." }
          ]
        },
        "widget-contests": {
          title: "Contests",
          description: "A calendar of upcoming and active amateur radio contests. Contests are time-limited on-air competitions where operators try to make as many contacts as possible. They're a great way to fill your logbook and practice your operating skills.",
          sections: [
            { heading: "What Are Contests?", content: "Ham radio contests run for a set period (usually a weekend). Operators exchange brief messages and try to contact as many stations or regions as possible. Contests happen nearly every weekend \u2014 from casual events to major international competitions." },
            { heading: "Reading the List", content: 'Each card shows the contest name, date/time window, and operating mode. Contests update in real time \u2014 when a contest starts, it moves to the top with a green "NOW" badge. When it ends, it disappears automatically. Click any card to view the full rules and exchange format on the contest website.' },
            { heading: "Mode Badges", content: "CW = Morse code only. PHONE = voice modes (SSB/FM). DIGITAL = digital modes (RTTY, FT8, etc.). Contests without a badge accept mixed modes." }
          ],
          links: [
            { label: "WA7BNM Contest Calendar", url: "https://www.contestcalendar.com/" }
          ]
        },
        "widget-dxpeditions": {
          title: "DXpeditions",
          description: "Track upcoming and active DXpeditions \u2014 organized trips to rare or hard-to-reach locations (remote islands, territories, etc.) specifically to get on the air for other hams to contact. Working a DXpedition is often the only way to log a new DXCC entity.",
          sections: [
            { heading: "What Is a DXpedition?", content: "A DXpedition is when a team of operators travels to a rare location and sets up amateur radio stations. They operate around the clock so as many hams as possible can make contact. Some DXpeditions are to uninhabited islands that might only be activated once a decade." },
            { heading: "Reading the Cards", content: 'Each card shows the callsign being used, the location (DXCC entity), operating dates, and QSL information. Cards marked "ACTIVE" are on the air right now. Click any card for more details. DXpeditions with known locations also appear as orange circle markers on the map (toggle via Map Overlays gear icon) \u2014 bright orange for active, dimmer for upcoming.' },
            { heading: "Time Filter", content: "Use the dropdown in the widget header to filter DXpeditions by time window: Active Now, Within 1 Week, Within 1 Month, Within 6 Months, or All. Active DXpeditions always appear regardless of the filter. The map markers match whatever the widget shows." },
            { heading: "Hiding DXpeditions", content: 'Hover over any card and click the \xD7 button to hide it. Hidden DXpeditions are also removed from the map. A "Show N hidden" button appears at the bottom to restore all hidden items at once.' },
            { heading: "QSL Information", content: `QSL means "I confirm" \u2014 it's how you verify a contact. The QSL field shows how to confirm: LoTW (Logbook of the World, an electronic system), direct (mail a card to the QSL manager), or bureau (via the QSL bureau, slower but cheaper).` }
          ],
          links: [
            { label: "NG3K DXpedition Calendar", url: "https://www.ng3k.com/Misc/adxo.html" }
          ]
        },
        "widget-beacons": {
          title: "NCDXF Beacons",
          description: "Real-time display of the NCDXF/IARU International Beacon Project \u2014 a network of 18 synchronized beacons worldwide that transmit on 5 HF frequencies in a repeating 3-minute cycle. Listening for these beacons is the quickest way to check which bands are open to which parts of the world.",
          sections: [
            { heading: "How It Works", content: "Every 3 minutes, each of the 18 beacons transmits for 10 seconds on each of 5 frequencies (14.100, 18.110, 21.150, 24.930, and 28.200 MHz). Five beacons transmit simultaneously \u2014 one per frequency. The table shows which beacon is active on each frequency right now, with a countdown to the next rotation." },
            { heading: "Checking Propagation", content: "Tune your radio to one of the beacon frequencies and listen. If you hear a beacon, the band is open to that beacon's location. Scan all five frequencies to quickly map which bands are open to which parts of the world." },
            { heading: "Beacon Transmission", content: "Each beacon transmits its callsign in CW (Morse code) at 100 watts, followed by four 1-second dashes at decreasing power levels (100W, 10W, 1W, 0.1W). If you can copy the callsign but not the last dashes, you know the band is open but marginal to that location." }
          ],
          links: [
            { label: "NCDXF Beacon Project", url: "https://www.ncdxf.org/beacon/" }
          ]
        },
        "widget-dedx": {
          title: "DE/DX Info",
          description: "A side-by-side display of your station (DE) and the currently selected distant station (DX) with live clocks. Inspired by the classic HamClock dual-pane layout, this widget shows large local time displays at each location plus key contact information at a glance.",
          sections: [
            { heading: "DE (Your Station)", content: "The left panel shows a large live clock for your local time, plus your callsign, grid square, and sunrise/sunset countdowns. Requires your callsign and location to be set in Config." },
            { heading: "DX (Selected Station)", content: "The right panel shows the approximate local time at the selected DX station's location (calculated from longitude), plus their callsign, frequency, mode, grid square, bearing, distance, and sunrise/sunset. When no spot is selected, the DX side shows UTC." },
            { heading: "Why Two Clocks?", content: "Knowing the local time at both ends of a path is essential for scheduling contacts and understanding propagation. A station in Japan is unlikely to be on the air at 3 AM their local time, and gray line propagation depends on sunrise/sunset at both locations." },
            { heading: "Bearing & Distance", content: "The bearing tells you which compass direction to point a directional antenna. Distance helps estimate signal path loss and whether your power level is sufficient for the contact." }
          ]
        },
        "widget-analog-clock": {
          title: "Analog Clock",
          description: "A customizable round analog clock showing your local time at a glance. Choose from 6 clock face styles and add up to 4 complications (sub-dials) for UTC time, Solar Flux, stopwatch mirror, and sunrise/sunset countdown \u2014 inspired by luxury watch complications.",
          sections: [
            { heading: "Clock Faces", content: "Click the gear icon to choose from 6 face styles: Classic (Arabic numerals), Minimal (clean index bars), Roman (Roman numerals), Pilot (bold indices with luminous triangle at 12), Railroad (double concentric track ring), and Digital (analog hands plus a digital time readout). Your selection is saved and persists across sessions." },
            { heading: "Complications", content: "Complications are optional sub-dials that embed useful data directly on the clock face. Enable them in the gear menu:\n\n\u2022 Sunrise/Sunset (12 o'clock) \u2014 countdown to next sunrise or sunset with color-coded icon\n\u2022 Solar SFI (3 o'clock) \u2014 arc gauge showing Solar Flux Index, colored green/yellow/red\n\u2022 Stopwatch (6 o'clock) \u2014 mirrors the Stopwatch widget's elapsed time with running indicator\n\u2022 UTC 24h (9 o'clock) \u2014 24-hour sub-dial showing current UTC time" },
            { heading: "Sunrise/Sunset Arc", content: "When your location (QTH) is set in Config, a golden arc appears on the clock face showing the daylight hours. The arc spans from sunrise to sunset on the 12-hour dial. This helps you visualize how much daylight remains and when gray line propagation windows occur." },
            { heading: "Theme Support", content: "The clock colors automatically adapt to your selected theme. All face styles, hands, complications, and numbers use your theme's color scheme." }
          ]
        },
        "widget-stopwatch": {
          title: "Stopwatch / Timer",
          description: "A dual-mode timer for contest operations and general use. Switch between Stopwatch (count up with laps) and Countdown (preset timers including the 10-minute FCC station ID reminder).",
          sections: [
            { heading: "Stopwatch Mode", content: "Click Start to begin counting up. Use Lap to mark split times during a contest (e.g., tracking contacts per minute). Stop pauses the timer; Reset clears everything." },
            { heading: "Countdown Mode", content: "Click the Countdown tab and select a preset duration. The 10m ID button is a quick shortcut for the FCC 10-minute station identification requirement. The display flashes when the countdown reaches zero." },
            { heading: "Station ID Timer", content: "FCC Part 97.119 requires US hams to identify every 10 minutes during a contact and at the end. Use the 10m ID preset as a reminder \u2014 when it flashes, give your callsign!" }
          ]
        },
        "widget-live-spots": {
          title: "Live Spots",
          description: "See where YOUR signal is being received right now! When you transmit on digital modes like FT8 or FT4, stations around the world automatically report hearing you to PSKReporter. This widget shows those reports so you can see how far your signal is reaching.",
          sections: [
            { heading: "Getting Started", content: "Enter your callsign in Config, then transmit on a digital mode (FT8, FT4, JS8Call, etc.). Within a few minutes, you should see band cards appear showing who is hearing you." },
            { heading: "Band Cards", content: "Each card represents a band where you're being heard. It shows either how many stations are receiving you or the distance to your farthest receiver. Click a card to show those stations on the map." },
            { heading: "Display Mode", content: 'Click the gear icon to switch between "count" (number of stations hearing you) and "distance" (farthest reach per band). Distance mode also shows the callsign of your farthest contact.' },
            { heading: "Map Lines", content: "When you click a band card, lines are drawn on the map from your location to each receiving station, giving you a visual picture of your signal coverage." }
          ],
          links: [
            { label: "PSKReporter", url: "https://pskreporter.info/" }
          ]
        },
        "widget-voacap": {
          title: "VOACAP DE\u2192DX",
          description: "A dense 24-hour propagation grid showing predicted band reliability from your station (DE) to the world (DX). The current hour starts at the left edge so you can instantly see what's open right now.",
          sections: [
            { heading: "Reading the Grid", content: `Each row is an HF band (10m at top, 80m at bottom). Each column is one hour in UTC, starting from "now" at the left. Cell colors show predicted reliability as a continuous gradient:

\u2022 Closed (black) \u2014 Below 5% reliability. The band is not usable on this path. Signals cannot propagate because the frequency is above the MUF or ionospheric conditions block it entirely.
\u2022 Poor (red) \u2014 5\u201330% reliability. The band may open briefly or weakly. You might make a contact with persistence and good timing, but don't count on it.
\u2022 Fair (yellow/orange) \u2014 30\u201365% reliability. The band is usable but inconsistent. Signals may fade in and out. Good for CW and digital modes; SSB may be marginal.
\u2022 Good (green) \u2014 Above 65% reliability. The band is solidly open. Expect workable signals for the predicted mode and power level.` },
            { heading: "Interactive Parameters", content: "The bottom bar shows clickable settings. Click any value to cycle through options: Power (5W/100W/1kW), Mode (CW/SSB/FT8), Takeoff Angle (3\xB0/5\xB0/10\xB0/15\xB0), and Path (SP=short, LP=long). FT8 mode shows more green because its low SNR threshold means signals are decodable in conditions where SSB would be unusable." },
            { heading: "Overview vs Spot", content: `Click OVW/SPOT to toggle target mode. "OVW" (overview) shows the average predicted reliability across four worldwide targets (Europe, East Asia, South America, North America). "SPOT" calculates predictions specifically to the station you've selected in the On the Air table, so you can see exactly when a band will open to that DX.` },
            { heading: "Auto-SPOT", content: "Click the AUTO button to enable automatic SPOT updates. When AUTO is on (highlighted green), clicking any spot in the table or on the map instantly switches VOACAP to SPOT mode and recalculates the grid for the path to that station. This lets you quickly scan propagation to different DX stations by clicking through spots. AUTO is off by default \u2014 enable it when you want live per-spot predictions." },
            { heading: "Engine Badge", content: 'The green "VOACAP" or gray "SIM" badge shows which prediction engine is active. VOACAP uses the real Voice of America Coverage Analysis Program \u2014 a professional ionospheric ray-tracing model used by broadcasters and militaries worldwide. It computes multi-hop propagation paths through actual ionospheric layers, accounting for D-layer absorption, MUF, takeoff angle, power, and mode. SIM is a lightweight approximation based on solar flux and time of day \u2014 useful as a fallback but significantly less accurate. The engine switches automatically; no user action needed.' },
            { heading: "Map Overlay", content: "Click any band row to show propagation on the map. Two modes are available \u2014 click the \u25CB/REL toggle in the param bar to switch. Circle mode (\u25CB) draws concentric range rings from your QTH. REL heatmap mode paints the entire map with a color gradient showing predicted reliability to every point: green = good, yellow = fair, red = poor, dark = closed. The heatmap re-renders as you pan and zoom, with finer detail at higher zoom levels." },
            { heading: "About the Data", content: "Predictions are monthly median values based on the current smoothed sunspot number (SSN) from NOAA. They represent typical conditions for this month, not real-time ionospheric state. Use them for planning which bands to try at different times of day, rather than as guarantees of what's open right now." }
          ],
          links: [
            { label: "NOAA Space Weather & Propagation", url: "https://www.swpc.noaa.gov/communities/radio-communications" }
          ]
        }
      };
      REFERENCE_TABS = {
        rst: {
          label: "RST",
          content: {
            description: "Signal reporting system for readability, strength, and tone.",
            table: {
              headers: ["", "Readability", "Strength", "Tone (CW)"],
              rows: [
                ["1", "Unreadable", "Faint", "Harsh, hum"],
                ["2", "Barely readable", "Very weak", "Harsh, modulation"],
                ["3", "Readable with difficulty", "Weak", "Rough, hum"],
                ["4", "Almost perfectly readable", "Fair", "Rough, modulation"],
                ["5", "Perfectly readable", "Fairly good", "Wavering, strong hum"],
                ["6", "\u2014", "Good", "Wavering, strong mod"],
                ["7", "\u2014", "Moderately strong", "Good, slight hum"],
                ["8", "\u2014", "Strong", "Good, slight mod"],
                ["9", "\u2014", "Very strong", "Perfect tone"]
              ]
            },
            note: "Phone: RS only (e.g. 59) \xB7 CW: RST (e.g. 599)",
            link: { text: "Ham Radio School \u2014 Practical Signal Reports", url: "https://www.hamradioschool.com/post/practical-signal-reports" }
          }
        },
        phonetic: {
          label: "Phonetic",
          content: {
            description: "NATO phonetic alphabet for clear letter pronunciation.",
            table: {
              headers: ["Letter", "Phonetic", "Letter", "Phonetic"],
              rows: [
                ["A", "Alpha", "N", "November"],
                ["B", "Bravo", "O", "Oscar"],
                ["C", "Charlie", "P", "Papa"],
                ["D", "Delta", "Q", "Quebec"],
                ["E", "Echo", "R", "Romeo"],
                ["F", "Foxtrot", "S", "Sierra"],
                ["G", "Golf", "T", "Tango"],
                ["H", "Hotel", "U", "Uniform"],
                ["I", "India", "V", "Victor"],
                ["J", "Juliet", "W", "Whiskey"],
                ["K", "Kilo", "X", "X-ray"],
                ["L", "Lima", "Y", "Yankee"],
                ["M", "Mike", "Z", "Zulu"]
              ]
            }
          }
        },
        morse: {
          label: "Morse",
          content: {
            description: "International Morse code \u2014 dits (.) and dahs (-) for each character.",
            table: {
              headers: ["Char", "Morse", "Char", "Morse"],
              rows: [
                ["A", ".-", "N", "-."],
                ["B", "-...", "O", "---"],
                ["C", "-.-.", "P", ".--."],
                ["D", "-..", "Q", "--.-"],
                ["E", ".", "R", ".-."],
                ["F", "..-.", "S", "..."],
                ["G", "--.", "T", "-"],
                ["H", "....", "U", "..-"],
                ["I", "..", "V", "...-"],
                ["J", ".---", "W", ".--"],
                ["K", "-.-", "X", "-..-"],
                ["L", ".-..", "Y", "-.--"],
                ["M", "--", "Z", "--.."],
                ["0", "-----", "5", "....."],
                ["1", ".----", "6", "-...."],
                ["2", "..---", "7", "--..."],
                ["3", "...--", "8", "---.."],
                ["4", "....-", "9", "----."]
              ]
            },
            note: "Prosigns: AR (end of message) = .-.-.  BT (pause) = -...-  SK (end of contact) = ...-.-"
          }
        },
        qcodes: {
          label: "Q-Codes",
          content: {
            description: "Common Q-codes used in amateur radio. Originally for CW, now widely used on voice too.",
            table: {
              headers: ["Code", "Meaning", "Code", "Meaning"],
              rows: [
                ["QRG", "Your exact frequency", "QRS", "Send more slowly"],
                ["QRL", "Frequency is busy", "QRT", "Stop sending / shutting down"],
                ["QRM", "Man-made interference", "QRV", "I am ready"],
                ["QRN", "Natural interference", "QRX", "Stand by / wait"],
                ["QRO", "Increase power", "QRZ", "Who is calling me?"],
                ["QRP", "Reduce power / low power", "QSB", "Signal is fading"],
                ["QSL", "I confirm / received", "QSO", "A contact (conversation)"],
                ["QSY", "Change frequency", "QTH", "My location"]
              ]
            },
            note: "QRP = operating at 5 watts or less \xB7 QRO = running high power \xB7 QSL cards confirm contacts"
          }
        },
        bands: {
          label: "Bands",
          custom: true
          // rendered by bandref logic, not generic table renderer
        }
      };
      DEFAULT_REFERENCE_TAB = "rst";
      BREAKPOINT_MOBILE = 1200;
      SCALE_REFERENCE_WIDTH = 1200;
      SCALE_MIN_FACTOR = 0.55;
      SCALE_REFLOW_WIDTH = 1200;
      REFLOW_WIDGET_ORDER = [
        "widget-map",
        "widget-activations",
        "widget-filters",
        "widget-solar",
        "widget-propagation",
        "widget-voacap",
        "widget-live-spots",
        "widget-spacewx",
        "widget-spot-detail",
        "widget-lunar",
        "widget-satellites",
        "widget-rst",
        "widget-contests",
        "widget-dxpeditions",
        "widget-beacons",
        "widget-dedx",
        "widget-stopwatch",
        "widget-analog-clock"
      ];
      DEFAULT_BAND_COLORS = {
        "160m": "#9c27b0",
        "80m": "#673ab7",
        "60m": "#3f51b5",
        "40m": "#2196f3",
        "30m": "#00bcd4",
        "20m": "#4caf50",
        "17m": "#8bc34a",
        "15m": "#cddc39",
        "12m": "#ffeb3b",
        "10m": "#ff9800",
        "6m": "#ff5722",
        "2m": "#f44336",
        "70cm": "#e91e63"
      };
      bandColorOverrides = {};
      try {
        const saved = JSON.parse(localStorage.getItem("hamtab_band_colors"));
        if (saved && typeof saved === "object") bandColorOverrides = saved;
      } catch (e) {
      }
      MOBILE_TAB_KEY = "hamtab_active_tab";
      WIDGET_STORAGE_KEY = "hamtab_widgets";
      USER_LAYOUT_KEY = "hamtab_widgets_user";
      SNAP_DIST = 20;
      HEADER_H = 30;
      GRID_MODE_KEY = "hamtab_grid_mode";
      GRID_PERM_KEY = "hamtab_grid_permutation";
      GRID_ASSIGN_KEY = "hamtab_grid_assignments";
      GRID_SIZES_KEY = "hamtab_grid_sizes";
      GRID_SPANS_KEY = "hamtab_grid_spans";
      GRID_PERMUTATIONS = [
        {
          id: "2L-2R",
          name: "2 Left / 2 Right",
          slots: 4,
          // Legacy fields — used by config preview (splash.js:renderGridPreview)
          areas: '"L1 map R1" "L2 map R2"',
          columns: "1fr 2fr 1fr",
          rows: "1fr 1fr",
          cellNames: ["L1", "L2", "R1", "R2"],
          // Flex-column hybrid fields — used by grid-layout.js at runtime
          left: ["L1", "L2"],
          right: ["R1", "R2"],
          top: [],
          bottom: [],
          outerAreas: '"left map right"',
          outerColumns: "1fr 2fr 1fr",
          outerRows: "1fr"
        },
        {
          id: "3L-3R",
          name: "3 Left / 3 Right",
          slots: 6,
          areas: '"L1 map R1" "L2 map R2" "L3 map R3"',
          columns: "1fr 2fr 1fr",
          rows: "1fr 1fr 1fr",
          cellNames: ["L1", "L2", "L3", "R1", "R2", "R3"],
          left: ["L1", "L2", "L3"],
          right: ["R1", "R2", "R3"],
          top: [],
          bottom: [],
          outerAreas: '"left map right"',
          outerColumns: "1fr 2fr 1fr",
          outerRows: "1fr"
        },
        {
          id: "1T-2L-2R-1B",
          name: "Top + 2L/2R + Bottom",
          slots: 6,
          areas: '"T1 T1 T1" "L1 map R1" "L2 map R2" "B1 B1 B1"',
          columns: "1fr 2fr 1fr",
          rows: "auto 1fr 1fr auto",
          cellNames: ["T1", "L1", "L2", "R1", "R2", "B1"],
          left: ["L1", "L2"],
          right: ["R1", "R2"],
          top: ["T1"],
          bottom: ["B1"],
          outerAreas: '"top top top" "left map right" "bottom bottom bottom"',
          outerColumns: "1fr 2fr 1fr",
          outerRows: "auto 1fr auto"
        },
        {
          id: "1T-3L-3R-1B",
          name: "Top + 3L/3R + Bottom",
          slots: 8,
          areas: '"T1 T1 T1" "L1 map R1" "L2 map R2" "L3 map R3" "B1 B1 B1"',
          columns: "1fr 2fr 1fr",
          rows: "auto 1fr 1fr 1fr auto",
          cellNames: ["T1", "L1", "L2", "L3", "R1", "R2", "R3", "B1"],
          left: ["L1", "L2", "L3"],
          right: ["R1", "R2", "R3"],
          top: ["T1"],
          bottom: ["B1"],
          outerAreas: '"top top top" "left map right" "bottom bottom bottom"',
          outerColumns: "1fr 2fr 1fr",
          outerRows: "auto 1fr auto"
        },
        {
          id: "2T-3L-3R-2B",
          name: "2 Top + 3L/3R + 2 Bottom",
          slots: 10,
          areas: '"T1 T1 T2 T2" "L1 map map R1" "L2 map map R2" "L3 map map R3" "B1 B1 B2 B2"',
          columns: "1fr 1fr 1fr 1fr",
          rows: "auto 1fr 1fr 1fr auto",
          cellNames: ["T1", "T2", "L1", "L2", "L3", "R1", "R2", "R3", "B1", "B2"],
          left: ["L1", "L2", "L3"],
          right: ["R1", "R2", "R3"],
          top: ["T1", "T2"],
          bottom: ["B1", "B2"],
          outerAreas: '"top top top" "left map right" "bottom bottom bottom"',
          outerColumns: "1fr 2fr 1fr",
          outerRows: "auto 1fr auto"
        }
      ];
      GRID_DEFAULT_ASSIGNMENTS = {
        "2L-2R": {
          L1: "widget-filters",
          L2: "widget-activations",
          R1: "widget-solar",
          R2: "widget-propagation"
        },
        "3L-3R": {
          L1: "widget-filters",
          L2: "widget-activations",
          L3: "widget-live-spots",
          R1: "widget-solar",
          R2: "widget-propagation",
          R3: "widget-voacap"
        },
        "1T-2L-2R-1B": {
          T1: "widget-solar",
          L1: "widget-filters",
          L2: "widget-activations",
          R1: "widget-propagation",
          R2: "widget-voacap",
          B1: "widget-live-spots"
        },
        "1T-3L-3R-1B": {
          T1: "widget-solar",
          L1: "widget-filters",
          L2: "widget-activations",
          L3: "widget-live-spots",
          R1: "widget-propagation",
          R2: "widget-voacap",
          R3: "widget-spot-detail",
          B1: "widget-lunar"
        },
        "2T-3L-3R-2B": {
          T1: "widget-solar",
          T2: "widget-propagation",
          L1: "widget-filters",
          L2: "widget-activations",
          L3: "widget-live-spots",
          R1: "widget-voacap",
          R2: "widget-spot-detail",
          R3: "widget-satellites",
          B1: "widget-lunar",
          B2: "widget-rst"
        }
      };
    }
  });

  // src/grid-layout.js
  function loadCustomTrackSizes(permId) {
    try {
      const all = JSON.parse(localStorage.getItem(GRID_SIZES_KEY));
      if (all && all[permId]) return all[permId];
    } catch (e) {
    }
    return null;
  }
  function saveCustomTrackSizes(permId, columns, rows, flexRatios) {
    let all = {};
    try {
      const saved = JSON.parse(localStorage.getItem(GRID_SIZES_KEY));
      if (saved && typeof saved === "object") all = saved;
    } catch (e) {
    }
    all[permId] = { columns, rows, ...flexRatios || {} };
    localStorage.setItem(GRID_SIZES_KEY, JSON.stringify(all));
  }
  function clearCustomTrackSizes(permId) {
    try {
      const all = JSON.parse(localStorage.getItem(GRID_SIZES_KEY));
      if (all && all[permId]) {
        delete all[permId];
        localStorage.setItem(GRID_SIZES_KEY, JSON.stringify(all));
      }
    } catch (e) {
    }
  }
  function loadGridSpans(permId) {
    try {
      const all = JSON.parse(localStorage.getItem(GRID_SPANS_KEY));
      if (all && all[permId]) return all[permId];
    } catch (e) {
    }
    return null;
  }
  function saveGridSpans() {
    let all = {};
    try {
      const saved = JSON.parse(localStorage.getItem(GRID_SPANS_KEY));
      if (saved && typeof saved === "object") all = saved;
    } catch (e) {
    }
    all[state_default.gridPermutation] = state_default.gridSpans;
    localStorage.setItem(GRID_SPANS_KEY, JSON.stringify(all));
  }
  function clearGridSpans(permId) {
    try {
      const all = JSON.parse(localStorage.getItem(GRID_SPANS_KEY));
      if (all && all[permId]) {
        delete all[permId];
        localStorage.setItem(GRID_SPANS_KEY, JSON.stringify(all));
      }
    } catch (e) {
    }
  }
  function isAbsorbed(cellName, cellNames, spans) {
    const idx = cellNames.indexOf(cellName);
    for (let i = 0; i < idx; i++) {
      const span = spans[cellNames[i]] || 1;
      if (i + span > idx) return true;
    }
    return false;
  }
  function sumFlexForSpan(cellName, span, cellNames, flexValues) {
    const startIdx = cellNames.indexOf(cellName);
    let total = 0;
    for (let s = 0; s < span && startIdx + s < cellNames.length; s++) {
      total += flexValues[startIdx + s];
    }
    return total;
  }
  function getSpanForVisibleChild(childIdx, cellNames, spans) {
    let visibleCount = 0;
    for (let i = 0; i < cellNames.length; i++) {
      if (isAbsorbed(cellNames[i], cellNames, spans)) continue;
      if (visibleCount === childIdx) return spans[cellNames[i]] || 1;
      visibleCount++;
    }
    return 1;
  }
  function parseTracks(templateStr) {
    return templateStr.trim().split(/\s+/).map((t) => {
      const frMatch = t.match(/^([\d.]+)fr$/);
      if (frMatch) return { value: parseFloat(frMatch[1]), unit: "fr" };
      const pxMatch = t.match(/^([\d.]+)px$/);
      if (pxMatch) return { value: parseFloat(pxMatch[1]), unit: "px" };
      return { value: t, unit: "keyword" };
    });
  }
  function serializeTracks(tracks) {
    return tracks.map((t) => {
      if (t.unit === "fr") return t.value.toFixed(2) + "fr";
      if (t.unit === "px") return t.value + "px";
      return t.value;
    }).join(" ");
  }
  function getResizableBoundaries(tracks) {
    const boundaries = [];
    for (let i = 0; i < tracks.length - 1; i++) {
      const a = tracks[i].unit;
      const b = tracks[i + 1].unit;
      if (a === "fr" && b === "fr") {
        boundaries.push({ index: i, type: "fr-fr" });
      } else if (a === "fr" && b === "keyword" || a === "keyword" && b === "fr") {
        boundaries.push({ index: i, type: "auto-fr" });
      }
    }
    return boundaries;
  }
  function removeTrackHandles() {
    trackHandles.forEach((h) => h.remove());
    trackHandles = [];
  }
  function createTrackHandles() {
    removeTrackHandles();
    const area = document.getElementById("widgetArea");
    if (!area || !isGridMode()) return;
    const colTemplate = area.style.gridTemplateColumns || "";
    const rowTemplate = area.style.gridTemplateRows || "";
    const colTracks = parseTracks(colTemplate);
    const rowTracks = parseTracks(rowTemplate);
    const colBoundaries = getResizableBoundaries(colTracks);
    const rowBoundaries = getResizableBoundaries(rowTracks);
    colBoundaries.forEach((b) => {
      const handle = document.createElement("div");
      handle.className = "grid-track-handle grid-track-handle--col";
      handle.dataset.axis = "col";
      handle.dataset.boundary = b.index;
      handle.dataset.btype = b.type;
      handle.addEventListener("mousedown", onHandleMouseDown);
      area.appendChild(handle);
      trackHandles.push(handle);
    });
    rowBoundaries.forEach((b) => {
      const handle = document.createElement("div");
      handle.className = "grid-track-handle grid-track-handle--row";
      handle.dataset.axis = "row";
      handle.dataset.boundary = b.index;
      handle.dataset.btype = b.type;
      handle.addEventListener("mousedown", onHandleMouseDown);
      area.appendChild(handle);
      trackHandles.push(handle);
    });
    positionTrackHandles();
  }
  function positionTrackHandles() {
    const area = document.getElementById("widgetArea");
    if (!area || trackHandles.length === 0) return;
    const cs = getComputedStyle(area);
    const padding = 6;
    const gap = 6;
    const colPx = cs.gridTemplateColumns.split(/\s+/).map(parseFloat);
    const rowPx = cs.gridTemplateRows.split(/\s+/).map(parseFloat);
    trackHandles.forEach((handle) => {
      const axis = handle.dataset.axis;
      const bIdx = parseInt(handle.dataset.boundary);
      if (axis === "col") {
        let left = padding;
        for (let i = 0; i <= bIdx; i++) left += colPx[i] + gap;
        left -= gap / 2 + 3;
        handle.style.left = left + "px";
        handle.style.top = "0";
        handle.style.height = area.offsetHeight + "px";
        handle.style.width = "6px";
      } else {
        let top = padding;
        for (let i = 0; i <= bIdx; i++) top += rowPx[i] + gap;
        top -= gap / 2 + 3;
        handle.style.top = top + "px";
        handle.style.left = "0";
        handle.style.width = area.offsetWidth + "px";
        handle.style.height = "6px";
      }
    });
  }
  function repositionGridHandles() {
    positionTrackHandles();
  }
  function onHandleMouseDown(e) {
    if (state_default.reflowActive || window.innerWidth < SCALE_REFERENCE_WIDTH) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    const axis = handle.dataset.axis;
    const bIdx = parseInt(handle.dataset.boundary);
    const btype = handle.dataset.btype;
    const area = document.getElementById("widgetArea");
    if (!area) return;
    const isCol = axis === "col";
    const templateProp = isCol ? "gridTemplateColumns" : "gridTemplateRows";
    const tracks = parseTracks(area.style[templateProp] || "");
    const cs = getComputedStyle(area);
    const pxSizes = (isCol ? cs.gridTemplateColumns : cs.gridTemplateRows).split(/\s+/).map(parseFloat);
    const beforeIdx = bIdx;
    const afterIdx = bIdx + 1;
    const startPos = isCol ? e.clientX : e.clientY;
    let onMove;
    if (btype === "fr-fr") {
      const beforeFr = tracks[beforeIdx].value;
      const afterFr = tracks[afterIdx].value;
      const totalPx = pxSizes[beforeIdx] + pxSizes[afterIdx];
      const totalFr = beforeFr + afterFr;
      const pxPerFr = totalPx / totalFr;
      onMove = function(ev) {
        const delta = (isCol ? ev.clientX : ev.clientY) - startPos;
        const deltaFr = delta / pxPerFr;
        let newBefore = beforeFr + deltaFr;
        let newAfter = afterFr - deltaFr;
        if (newBefore < MIN_FR) {
          newAfter -= MIN_FR - newBefore;
          newBefore = MIN_FR;
        }
        if (newAfter < MIN_FR) {
          newBefore -= MIN_FR - newAfter;
          newAfter = MIN_FR;
        }
        newBefore = Math.max(MIN_FR, newBefore);
        newAfter = Math.max(MIN_FR, newAfter);
        tracks[beforeIdx] = { value: newBefore, unit: "fr" };
        tracks[afterIdx] = { value: newAfter, unit: "fr" };
        area.style[templateProp] = serializeTracks(tracks);
        positionTrackHandles();
      };
    } else {
      const MIN_PX = 40;
      const autoIdx = tracks[beforeIdx].unit === "keyword" ? beforeIdx : afterIdx;
      const initialPx = pxSizes[autoIdx];
      const sign = autoIdx === beforeIdx ? 1 : -1;
      onMove = function(ev) {
        const delta = (isCol ? ev.clientX : ev.clientY) - startPos;
        const newPx = Math.max(MIN_PX, initialPx + delta * sign);
        tracks[autoIdx] = { value: Math.round(newPx), unit: "px" };
        area.style[templateProp] = serializeTracks(tracks);
        positionTrackHandles();
      };
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const perm = getGridPermutation(state_default.gridPermutation);
      saveCustomTrackSizes(
        state_default.gridPermutation,
        area.style.gridTemplateColumns,
        area.style.gridTemplateRows,
        readCurrentFlexRatios(perm)
      );
      if (state_default.map) state_default.map.invalidateSize();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
  function createWrappers(perm) {
    const area = document.getElementById("widgetArea");
    if (!area) return;
    if (perm.left.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.id = "grid-col-left";
      wrapper.className = "grid-col-wrapper";
      wrapper.style.gridArea = "left";
      area.appendChild(wrapper);
    }
    if (perm.right.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.id = "grid-col-right";
      wrapper.className = "grid-col-wrapper";
      wrapper.style.gridArea = "right";
      area.appendChild(wrapper);
    }
    if (perm.top.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.id = "grid-bar-top";
      wrapper.className = "grid-bar-wrapper";
      wrapper.style.gridArea = "top";
      area.appendChild(wrapper);
    }
    if (perm.bottom.length > 0) {
      const wrapper = document.createElement("div");
      wrapper.id = "grid-bar-bottom";
      wrapper.className = "grid-bar-wrapper";
      wrapper.style.gridArea = "bottom";
      area.appendChild(wrapper);
    }
  }
  function removeWrappers() {
    const area = document.getElementById("widgetArea");
    if (!area) return;
    const wrapperIds = ["grid-col-left", "grid-col-right", "grid-bar-top", "grid-bar-bottom"];
    wrapperIds.forEach((id) => {
      const wrapper = document.getElementById(id);
      if (!wrapper) return;
      const widgets = wrapper.querySelectorAll(".widget");
      widgets.forEach((w) => area.appendChild(w));
      wrapper.querySelectorAll(".grid-flex-handle, .grid-cell-placeholder").forEach((el2) => el2.remove());
      wrapper.remove();
    });
  }
  function onFlexHandleMouseDown(e) {
    if (state_default.reflowActive || window.innerWidth < SCALE_REFERENCE_WIDTH) return;
    e.preventDefault();
    e.stopPropagation();
    const handle = e.currentTarget;
    const wrapper = handle.parentElement;
    if (!wrapper) return;
    const isColumn = wrapper.classList.contains("grid-col-wrapper");
    const children = Array.from(wrapper.children).filter(
      (c) => !c.classList.contains("grid-flex-handle")
    );
    const handleIdx = Array.from(wrapper.children).indexOf(handle);
    let beforeEl = null;
    let afterEl = null;
    for (let i = handleIdx - 1; i >= 0; i--) {
      const c = wrapper.children[i];
      if (!c.classList.contains("grid-flex-handle")) {
        beforeEl = c;
        break;
      }
    }
    for (let i = handleIdx + 1; i < wrapper.children.length; i++) {
      const c = wrapper.children[i];
      if (!c.classList.contains("grid-flex-handle")) {
        afterEl = c;
        break;
      }
    }
    if (!beforeEl || !afterEl) return;
    const beforeFlex = parseFloat(beforeEl.style.flexGrow) || 1;
    const afterFlex = parseFloat(afterEl.style.flexGrow) || 1;
    const totalFlex = beforeFlex + afterFlex;
    const beforePx = isColumn ? beforeEl.offsetHeight : beforeEl.offsetWidth;
    const afterPx = isColumn ? afterEl.offsetHeight : afterEl.offsetWidth;
    const totalPx = beforePx + afterPx;
    const pxPerFlex = totalPx / totalFlex;
    const startPos = isColumn ? e.clientY : e.clientX;
    const spanCtx = handle._spanCtx;
    function onMove(ev) {
      const delta = (isColumn ? ev.clientY : ev.clientX) - startPos;
      const deltaFlex = delta / pxPerFlex;
      let newBefore = beforeFlex + deltaFlex;
      let newAfter = afterFlex - deltaFlex;
      if (spanCtx) {
        const estAfterPx = afterPx - delta;
        if (estAfterPx < SNAP_PX && delta > 0) {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          beforeEl.style.flexGrow = beforeFlex;
          afterEl.style.flexGrow = afterFlex;
          toggleSpan(handle, wrapper, spanCtx.cellNames, isColumn, spanCtx.flexKey);
          return;
        }
      }
      if (newBefore < MIN_FLEX) {
        newAfter -= MIN_FLEX - newBefore;
        newBefore = MIN_FLEX;
      }
      if (newAfter < MIN_FLEX) {
        newBefore -= MIN_FLEX - newAfter;
        newAfter = MIN_FLEX;
      }
      newBefore = Math.max(MIN_FLEX, newBefore);
      newAfter = Math.max(MIN_FLEX, newAfter);
      beforeEl.style.flexGrow = newBefore.toFixed(3);
      afterEl.style.flexGrow = newAfter.toFixed(3);
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      const perm = getGridPermutation(state_default.gridPermutation);
      const area = document.getElementById("widgetArea");
      if (area) {
        saveCustomTrackSizes(
          state_default.gridPermutation,
          area.style.gridTemplateColumns,
          area.style.gridTemplateRows,
          readCurrentFlexRatios(perm)
        );
      }
      if (state_default.map) state_default.map.invalidateSize();
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
  function readCurrentFlexRatios(perm) {
    const ratios = {};
    const spans = state_default.gridSpans || {};
    const wrapperMap = {
      leftFlex: { wrapperId: "grid-col-left", cellNames: perm.left },
      rightFlex: { wrapperId: "grid-col-right", cellNames: perm.right },
      topFlex: { wrapperId: "grid-bar-top", cellNames: perm.top },
      bottomFlex: { wrapperId: "grid-bar-bottom", cellNames: perm.bottom }
    };
    for (const [key, { wrapperId, cellNames }] of Object.entries(wrapperMap)) {
      const wrapper = document.getElementById(wrapperId);
      if (!wrapper) continue;
      const children = Array.from(wrapper.children).filter(
        (c) => !c.classList.contains("grid-flex-handle")
      );
      if (children.length === 0) continue;
      const perCellRatios = [];
      let childIdx = 0;
      for (let i = 0; i < cellNames.length; i++) {
        if (isAbsorbed(cellNames[i], cellNames, spans)) {
          continue;
        }
        const span = getSpanForVisibleChild(childIdx, cellNames, spans);
        const combinedFlex = childIdx < children.length ? parseFloat(children[childIdx].style.flexGrow) || 1 : 1;
        const perCell = combinedFlex / span;
        for (let s = 0; s < span; s++) perCellRatios.push(perCell);
        childIdx++;
      }
      ratios[key] = perCellRatios.length === cellNames.length ? perCellRatios : children.map((c) => parseFloat(c.style.flexGrow) || 1);
    }
    return ratios;
  }
  function populateWrapper(wrapperId, cellNames, flexKey, isColumn, customSizes) {
    const wrapper = document.getElementById(wrapperId);
    if (!wrapper || cellNames.length === 0) return;
    while (wrapper.firstChild) {
      const child = wrapper.firstChild;
      if (child.classList && child.classList.contains("widget")) {
        document.getElementById("widgetArea").appendChild(child);
      } else {
        child.remove();
      }
    }
    const savedFlex = customSizes && customSizes[flexKey];
    const defaultFlex = cellNames.map(() => 1);
    const flexValues = savedFlex && savedFlex.length === cellNames.length ? savedFlex : defaultFlex;
    const spans = state_default.gridSpans || {};
    let firstRendered = true;
    cellNames.forEach((cellName, idx) => {
      if (isAbsorbed(cellName, cellNames, spans)) {
        const absWidgetId = state_default.gridAssignments[cellName];
        if (absWidgetId) {
          const absEl = document.getElementById(absWidgetId);
          if (absEl) absEl.style.display = "none";
        }
        return;
      }
      const span = spans[cellName] || 1;
      if (!firstRendered) {
        const handle = document.createElement("div");
        handle.className = isColumn ? "grid-flex-handle grid-flex-handle--col" : "grid-flex-handle grid-flex-handle--row";
        handle._spanCtx = { cellNames, flexKey };
        handle.addEventListener("mousedown", onFlexHandleMouseDown);
        handle.addEventListener("dblclick", (e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSpan(handle, wrapper, cellNames, isColumn, flexKey);
        });
        wrapper.appendChild(handle);
      }
      firstRendered = false;
      const widgetId = state_default.gridAssignments[cellName];
      let el2;
      const isVisible = widgetId && state_default.widgetVisibility && state_default.widgetVisibility[widgetId] !== false;
      if (isVisible) {
        el2 = document.getElementById(widgetId);
        if (el2) {
          el2.style.gridArea = "";
          el2.style.display = "";
          wrapper.appendChild(el2);
        }
      } else if (widgetId) {
        const hiddenEl = document.getElementById(widgetId);
        if (hiddenEl) hiddenEl.style.display = "none";
      }
      if (!el2) {
        el2 = document.createElement("div");
        el2.className = "grid-cell-placeholder";
        el2.dataset.gridCell = cellName;
        wrapper.appendChild(el2);
      }
      const combinedFlex = span > 1 ? sumFlexForSpan(cellName, span, cellNames, flexValues) : flexValues[idx];
      el2.style.flexGrow = combinedFlex;
      el2.style.flexShrink = "1";
      el2.style.flexBasis = "0%";
    });
  }
  function toggleSpan(handle, wrapper, cellNames, isColumn, flexKey) {
    if (state_default.reflowActive || window.innerWidth < SCALE_REFERENCE_WIDTH) return;
    const children = Array.from(wrapper.children).filter(
      (c) => !c.classList.contains("grid-flex-handle")
    );
    const handleIdx = Array.from(wrapper.children).indexOf(handle);
    let beforeEl = null;
    let afterEl = null;
    for (let i = handleIdx - 1; i >= 0; i--) {
      const c = wrapper.children[i];
      if (!c.classList.contains("grid-flex-handle")) {
        beforeEl = c;
        break;
      }
    }
    for (let i = handleIdx + 1; i < wrapper.children.length; i++) {
      const c = wrapper.children[i];
      if (!c.classList.contains("grid-flex-handle")) {
        afterEl = c;
        break;
      }
    }
    if (!beforeEl || !afterEl) return;
    const spans = state_default.gridSpans || {};
    const visibleCells = cellNames.filter((c) => !isAbsorbed(c, cellNames, spans));
    const beforeCellIdx = children.indexOf(beforeEl);
    const afterCellIdx = children.indexOf(afterEl);
    if (beforeCellIdx < 0 || afterCellIdx < 0) return;
    const beforeCell = visibleCells[beforeCellIdx];
    const afterCell = visibleCells[afterCellIdx];
    if (!beforeCell || !afterCell) return;
    const currentSpan = spans[beforeCell] || 1;
    const afterCellPos = cellNames.indexOf(afterCell);
    const beforeCellPos = cellNames.indexOf(beforeCell);
    if (beforeCellPos + currentSpan > afterCellPos) {
      const newSpan = afterCellPos - beforeCellPos;
      if (newSpan <= 1) {
        delete spans[beforeCell];
      } else {
        spans[beforeCell] = newSpan;
      }
    } else {
      const afterSpan = spans[afterCell] || 1;
      const newSpan = afterCellPos + afterSpan - beforeCellPos;
      const maxSpan = cellNames.length - beforeCellPos;
      spans[beforeCell] = Math.min(newSpan, maxSpan);
      delete spans[afterCell];
    }
    state_default.gridSpans = spans;
    saveGridSpans();
    applyGridAssignments();
  }
  function isGridMode() {
    return state_default.gridMode === "grid";
  }
  function getGridPermutation(permId) {
    return GRID_PERMUTATIONS.find((p) => p.id === permId) || GRID_PERMUTATIONS[1];
  }
  function loadGridAssignments() {
    try {
      const saved = JSON.parse(localStorage.getItem(GRID_ASSIGN_KEY));
      if (saved && typeof saved === "object" && Object.keys(saved).length > 0) {
        state_default.gridAssignments = saved;
        state_default.gridSpans = loadGridSpans(state_default.gridPermutation) || {};
        return saved;
      }
    } catch (e) {
    }
    const defaults = GRID_DEFAULT_ASSIGNMENTS[state_default.gridPermutation];
    state_default.gridAssignments = defaults ? { ...defaults } : {};
    state_default.gridSpans = loadGridSpans(state_default.gridPermutation) || {};
    return state_default.gridAssignments;
  }
  function saveGridAssignments() {
    localStorage.setItem(GRID_ASSIGN_KEY, JSON.stringify(state_default.gridAssignments));
  }
  function saveGridMode() {
    localStorage.setItem(GRID_MODE_KEY, state_default.gridMode);
  }
  function saveGridPermutation() {
    localStorage.setItem(GRID_PERM_KEY, state_default.gridPermutation);
  }
  function activateGridMode(permId) {
    const perm = getGridPermutation(permId);
    const area = document.getElementById("widgetArea");
    if (!area) return;
    state_default.gridMode = "grid";
    state_default.gridPermutation = perm.id;
    saveGridMode();
    saveGridPermutation();
    if (!state_default.gridAssignments || Object.keys(state_default.gridAssignments).length === 0) {
      loadGridAssignments();
    }
    area.classList.add("grid-active");
    area.style.gridTemplateAreas = perm.outerAreas;
    const custom = loadCustomTrackSizes(perm.id);
    area.style.gridTemplateColumns = custom ? custom.columns : perm.outerColumns;
    area.style.gridTemplateRows = custom ? custom.rows : perm.outerRows;
    removeWrappers();
    createWrappers(perm);
    applyGridAssignments(custom);
    setTimeout(() => {
      if (state_default.map) state_default.map.invalidateSize();
      createTrackHandles();
    }, 100);
  }
  function deactivateGridMode() {
    removeTrackHandles();
    removeWrappers();
    const area = document.getElementById("widgetArea");
    if (!area) return;
    state_default.gridMode = "float";
    saveGridMode();
    area.classList.remove("grid-active");
    area.style.gridTemplateAreas = "";
    area.style.gridTemplateColumns = "";
    area.style.gridTemplateRows = "";
    const saved = getSavedFloatLayout();
    document.querySelectorAll(".widget").forEach((w) => {
      w.style.gridArea = "";
      w.style.flex = "";
      w.style.flexGrow = "";
      w.style.flexShrink = "";
      w.style.flexBasis = "";
      if (saved && saved[w.id]) {
        w.style.left = saved[w.id].left + "px";
        w.style.top = saved[w.id].top + "px";
        w.style.width = saved[w.id].width + "px";
        w.style.height = saved[w.id].height + "px";
      }
    });
    area.querySelectorAll(".grid-cell-placeholder").forEach((el2) => el2.remove());
    setTimeout(() => {
      if (state_default.map) state_default.map.invalidateSize();
    }, 100);
  }
  function getSavedFloatLayout() {
    try {
      const saved = localStorage.getItem("hamtab_widgets");
      if (saved) return JSON.parse(saved);
    } catch (e) {
    }
    return null;
  }
  function applyGridAssignments(customSizes) {
    const perm = getGridPermutation(state_default.gridPermutation);
    const area = document.getElementById("widgetArea");
    if (!area || !state_default.gridAssignments) return;
    const vis = state_default.widgetVisibility || {};
    const assignments = state_default.gridAssignments;
    let dirty = false;
    const spans = state_default.gridSpans || {};
    for (const cell of Object.keys(assignments)) {
      if (vis[assignments[cell]] === false) {
        delete assignments[cell];
        if (spans[cell]) delete spans[cell];
        dirty = true;
      }
    }
    state_default.gridSpans = spans;
    const assignedSet = new Set(Object.values(assignments));
    const unassigned = WIDGET_DEFS.filter((w) => w.id !== "widget-map" && vis[w.id] !== false && !assignedSet.has(w.id)).map((w) => w.id);
    if (unassigned.length > 0) {
      const emptyCells = perm.cellNames.filter((c) => !assignments[c]);
      for (let i = 0; i < Math.min(emptyCells.length, unassigned.length); i++) {
        assignments[emptyCells[i]] = unassigned[i];
        dirty = true;
      }
    }
    if (dirty) saveGridAssignments();
    if (!customSizes) customSizes = loadCustomTrackSizes(perm.id);
    const mapEl = document.getElementById("widget-map");
    if (mapEl) {
      mapEl.style.gridArea = "map";
      mapEl.style.display = "";
      if (mapEl.parentElement !== area) area.appendChild(mapEl);
    }
    populateWrapper("grid-col-left", perm.left, "leftFlex", true, customSizes);
    populateWrapper("grid-col-right", perm.right, "rightFlex", true, customSizes);
    populateWrapper("grid-bar-top", perm.top, "topFlex", false, customSizes);
    populateWrapper("grid-bar-bottom", perm.bottom, "bottomFlex", false, customSizes);
    const assignedWidgets = new Set(Object.values(state_default.gridAssignments));
    WIDGET_DEFS.forEach((def) => {
      if (def.id === "widget-map") return;
      const el2 = document.getElementById(def.id);
      if (!el2) return;
      if (!assignedWidgets.has(def.id) || vis[def.id] === false) {
        el2.style.gridArea = "";
        el2.style.display = "none";
      } else {
        el2.style.display = "";
      }
    });
  }
  function resetGridAssignments() {
    const defaults = GRID_DEFAULT_ASSIGNMENTS[state_default.gridPermutation];
    state_default.gridAssignments = defaults ? { ...defaults } : {};
    saveGridAssignments();
    state_default.gridSpans = {};
    clearGridSpans(state_default.gridPermutation);
    clearCustomTrackSizes(state_default.gridPermutation);
    const perm = getGridPermutation(state_default.gridPermutation);
    const area = document.getElementById("widgetArea");
    if (area) {
      area.style.gridTemplateAreas = perm.outerAreas;
      area.style.gridTemplateColumns = perm.outerColumns;
      area.style.gridTemplateRows = perm.outerRows;
    }
    applyGridAssignments();
    createTrackHandles();
  }
  function handleGridDragStart(widget, e) {
    if (widget.id === "widget-map") return;
    if (state_default.reflowActive || window.innerWidth < SCALE_REFERENCE_WIDTH) return;
    e.preventDefault();
    const sourceId = widget.id;
    let currentTarget = null;
    widget.classList.add("grid-dragging");
    function onMove(ev) {
      widget.style.pointerEvents = "none";
      const el2 = document.elementFromPoint(ev.clientX, ev.clientY);
      widget.style.pointerEvents = "";
      if (currentTarget) {
        currentTarget.classList.remove("grid-drop-target");
        currentTarget = null;
      }
      if (!el2) return;
      const target = el2.closest(".widget, .grid-cell-placeholder");
      if (target && target !== widget && target.id !== "widget-map") {
        target.classList.add("grid-drop-target");
        currentTarget = target;
      }
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      widget.classList.remove("grid-dragging");
      if (currentTarget) {
        currentTarget.classList.remove("grid-drop-target");
        performSwap(sourceId, currentTarget);
      }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }
  function performSwap(sourceWidgetId, target) {
    if (!state_default.gridAssignments) return;
    let sourceCell = null;
    for (const [cell, wId] of Object.entries(state_default.gridAssignments)) {
      if (wId === sourceWidgetId) {
        sourceCell = cell;
        break;
      }
    }
    if (!sourceCell) return;
    let targetCell = null;
    if (target.classList.contains("grid-cell-placeholder")) {
      targetCell = target.dataset.gridCell;
    } else if (target.classList.contains("widget")) {
      for (const [cell, wId] of Object.entries(state_default.gridAssignments)) {
        if (wId === target.id) {
          targetCell = cell;
          break;
        }
      }
    }
    if (!targetCell) return;
    const perm = getGridPermutation(state_default.gridPermutation);
    const spans = state_default.gridSpans || {};
    const wrapperCells = [perm.left, perm.right, perm.top, perm.bottom].find((cells) => cells.includes(targetCell)) || [];
    if (isAbsorbed(targetCell, wrapperCells, spans)) return;
    if (spans[sourceCell]) {
      delete spans[sourceCell];
    }
    if (spans[targetCell]) {
      delete spans[targetCell];
    }
    state_default.gridSpans = spans;
    saveGridSpans();
    if (target.classList.contains("grid-cell-placeholder")) {
      delete state_default.gridAssignments[sourceCell];
      state_default.gridAssignments[targetCell] = sourceWidgetId;
    } else {
      const targetWidgetId = target.id;
      state_default.gridAssignments[sourceCell] = targetWidgetId;
      state_default.gridAssignments[targetCell] = sourceWidgetId;
    }
    saveGridAssignments();
    applyGridAssignments();
  }
  var trackHandles, MIN_FR, MIN_FLEX, SNAP_PX;
  var init_grid_layout = __esm({
    "src/grid-layout.js"() {
      init_state();
      init_constants();
      trackHandles = [];
      MIN_FR = 0.3;
      MIN_FLEX = 0.15;
      SNAP_PX = 40;
    }
  });

  // src/tabs.js
  function saveSecondary() {
    localStorage.setItem(SECONDARY_KEY, JSON.stringify(secondaryWidgets));
  }
  function buildTabBar() {
    const tabBar = document.getElementById("tabBar");
    if (!tabBar) return;
    tabBar.innerHTML = "";
    const vis = state_default.widgetVisibility || {};
    WIDGET_DEFS.forEach((def) => {
      if (def.id === "widget-filters") return;
      if (vis[def.id] === false) return;
      const btn = document.createElement("button");
      btn.className = "tab-bar-btn";
      btn.dataset.tab = def.id;
      btn.title = def.name;
      if (def.id === "widget-map") {
        btn.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span>${def.short}</span>`;
      } else {
        btn.innerHTML = `<span>${def.short}</span>`;
      }
      btn.addEventListener("click", () => {
        if (def.id === state_default.activeTab) {
          const area = document.getElementById("widgetArea");
          if (area) area.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        switchTab(def.id);
      });
      tabBar.appendChild(btn);
    });
    tabBar.querySelectorAll(".tab-bar-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === state_default.activeTab);
    });
  }
  function dismantleGridForMobile() {
    const area = document.getElementById("widgetArea");
    if (!area) return;
    const wrapperIds = ["grid-col-left", "grid-col-right", "grid-bar-top", "grid-bar-bottom"];
    wrapperIds.forEach((id) => {
      const wrapper = document.getElementById(id);
      if (!wrapper) return;
      const widgets = wrapper.querySelectorAll(".widget");
      widgets.forEach((w) => area.appendChild(w));
    });
    area.querySelectorAll(".grid-col-wrapper, .grid-bar-wrapper, .grid-flex-handle, .grid-cell-placeholder, .grid-track-handle").forEach((el2) => {
      el2.style.display = "none";
    });
    area.classList.remove("grid-active", "reflow-layout");
    area.style.gridTemplateAreas = "";
    area.style.gridTemplateColumns = "";
    area.style.gridTemplateRows = "";
  }
  function buildSecondaryPicker(area, primaryId) {
    const old = document.getElementById("mobileSecondaryPicker");
    if (old) old.remove();
    const vis = state_default.widgetVisibility || {};
    const currentSecondary = secondaryWidgets[primaryId] || "";
    const options = WIDGET_DEFS.filter(
      (w) => w.id !== "widget-filters" && w.id !== primaryId && vis[w.id] !== false
    );
    if (options.length === 0) return;
    const picker = document.createElement("div");
    picker.id = "mobileSecondaryPicker";
    picker.className = "mobile-secondary-picker";
    const select = document.createElement("select");
    select.className = "mobile-secondary-select";
    const noneOpt = document.createElement("option");
    noneOpt.value = "";
    noneOpt.textContent = "+ Add widget below\u2026";
    select.appendChild(noneOpt);
    options.forEach((def) => {
      const opt = document.createElement("option");
      opt.value = def.id;
      opt.textContent = def.name;
      if (def.id === currentSecondary) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", () => {
      const val = select.value;
      if (val) {
        secondaryWidgets[primaryId] = val;
      } else {
        delete secondaryWidgets[primaryId];
      }
      saveSecondary();
      switchTab(primaryId);
    });
    picker.appendChild(select);
    area.appendChild(picker);
  }
  function switchTab(widgetId) {
    if (getLayoutMode() !== "mobile") return;
    dismantleGridForMobile();
    const vis = state_default.widgetVisibility || {};
    const def = WIDGET_DEFS.find((w) => w.id === widgetId);
    if (!def || vis[widgetId] === false) {
      widgetId = "widget-map";
    }
    state_default.activeTab = widgetId;
    localStorage.setItem(MOBILE_TAB_KEY, widgetId);
    let secondaryId = secondaryWidgets[widgetId] || "";
    if (secondaryId && (vis[secondaryId] === false || secondaryId === widgetId || secondaryId === "widget-filters")) {
      secondaryId = "";
      delete secondaryWidgets[widgetId];
      saveSecondary();
    }
    const tabBar = document.getElementById("tabBar");
    if (tabBar) {
      tabBar.querySelectorAll(".tab-bar-btn").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.tab === widgetId);
      });
    }
    document.body.classList.toggle("tab-map-active", widgetId === "widget-map" && !secondaryId);
    const area = document.getElementById("widgetArea");
    WIDGET_DEFS.forEach((w) => {
      const el2 = document.getElementById(w.id);
      if (!el2) return;
      el2.style.gridArea = "";
      el2.style.flex = "";
      el2.style.flexGrow = "";
      el2.style.flexShrink = "";
      el2.style.flexBasis = "";
      el2.classList.remove("mobile-active-widget");
      el2.classList.remove("mobile-secondary-widget");
      if (w.id === "widget-filters") {
        el2.style.display = vis[w.id] !== false ? "" : "none";
        if (el2.style.display !== "none") {
          el2.style.order = "-1";
          area.prepend(el2);
          if (!el2.dataset.mobileCollapsed) {
            el2.classList.add("collapsed");
            el2.dataset.mobileCollapsed = "1";
          }
        }
      } else if (w.id === widgetId) {
        el2.style.display = vis[w.id] !== false ? "" : "none";
        el2.classList.add("mobile-active-widget");
        el2.classList.remove("collapsed");
      } else if (w.id === secondaryId) {
        el2.style.display = "";
        el2.classList.add("mobile-secondary-widget");
        el2.classList.remove("collapsed");
      } else {
        el2.style.display = "none";
      }
    });
    buildSecondaryPicker(area, widgetId);
    if ((widgetId === "widget-map" || secondaryId === "widget-map") && state_default.map) {
      setTimeout(() => state_default.map.invalidateSize(), 50);
    }
  }
  function rebuildTabs() {
    if (getLayoutMode() !== "mobile") return;
    buildTabBar();
    const vis = state_default.widgetVisibility || {};
    if (vis[state_default.activeTab] === false || !WIDGET_DEFS.find((w) => w.id === state_default.activeTab)) {
      switchTab("widget-map");
    } else {
      switchTab(state_default.activeTab);
    }
  }
  function initTabs() {
    const tabBar = document.getElementById("tabBar");
    if (!tabBar) return;
    if (getLayoutMode() === "mobile") {
      buildTabBar();
      const saved = state_default.activeTab || "widget-map";
      switchTab(saved);
    }
    let prevMode = getLayoutMode();
    window.addEventListener("resize", () => {
      const mode2 = getLayoutMode();
      if (mode2 === prevMode) return;
      prevMode = mode2;
      if (mode2 === "mobile") {
        buildTabBar();
        switchTab(state_default.activeTab || "widget-map");
      } else {
        document.body.classList.remove("tab-map-active");
        const picker = document.getElementById("mobileSecondaryPicker");
        if (picker) picker.remove();
        const area = document.getElementById("widgetArea");
        if (area) {
          area.querySelectorAll(".grid-col-wrapper, .grid-bar-wrapper, .grid-flex-handle, .grid-cell-placeholder, .grid-track-handle").forEach((el2) => {
            el2.style.display = "";
          });
        }
        WIDGET_DEFS.forEach((w) => {
          const el2 = document.getElementById(w.id);
          if (!el2) return;
          el2.style.order = "";
          el2.classList.remove("mobile-active-widget", "mobile-secondary-widget");
          if (state_default.widgetVisibility[w.id] !== false) {
            el2.style.display = "";
          }
        });
      }
    });
    initialized = true;
  }
  var initialized, SECONDARY_KEY, secondaryWidgets;
  var init_tabs = __esm({
    "src/tabs.js"() {
      init_state();
      init_constants();
      initialized = false;
      SECONDARY_KEY = "hamtab_mobile_secondary";
      secondaryWidgets = {};
      try {
        const s = JSON.parse(localStorage.getItem(SECONDARY_KEY));
        if (s && typeof s === "object") secondaryWidgets = s;
      } catch (e) {
      }
    }
  });

  // src/widgets.js
  function loadWidgetVisibility() {
    try {
      const saved = JSON.parse(localStorage.getItem(WIDGET_VIS_KEY));
      if (saved && typeof saved === "object") return saved;
    } catch (e) {
    }
    const vis = {};
    WIDGET_DEFS.forEach((w) => vis[w.id] = true);
    return vis;
  }
  function saveWidgetVisibility() {
    localStorage.setItem(WIDGET_VIS_KEY, JSON.stringify(state_default.widgetVisibility));
  }
  function isWidgetVisible(id) {
    return state_default.widgetVisibility[id] !== false;
  }
  function applyWidgetVisibility() {
    if (getLayoutMode() === "mobile") {
      rebuildTabs();
      return;
    }
    if (isGridMode()) {
      applyGridAssignments();
      if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 50);
      return;
    }
    WIDGET_DEFS.forEach((w) => {
      const el2 = document.getElementById(w.id);
      if (!el2) return;
      if (state_default.widgetVisibility[w.id] === false) {
        el2.style.display = "none";
      } else {
        el2.style.display = "";
      }
    });
    redistributeRightColumn();
    if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 50);
  }
  function redistributeRightColumn() {
    const { height: H } = getWidgetArea();
    const pad = 6;
    const solarEl = document.getElementById("widget-solar");
    if (!solarEl || solarEl.style.display === "none") return;
    const solarBottom = (parseInt(solarEl.style.top) || 0) + (parseInt(solarEl.style.height) || 0);
    const rightX = parseInt(solarEl.style.left) || 0;
    const rightW = parseInt(solarEl.style.width) || 0;
    const rightBottomIds = ["widget-spacewx", "widget-propagation", "widget-voacap", "widget-live-spots", "widget-lunar", "widget-satellites", "widget-rst", "widget-spot-detail", "widget-contests", "widget-dxpeditions", "widget-beacons", "widget-dedx", "widget-stopwatch", "widget-analog-clock"];
    const vis = state_default.widgetVisibility || {};
    const visible = rightBottomIds.filter((id) => vis[id] !== false);
    if (visible.length === 0) return;
    const bottomSpace = H - solarBottom - pad;
    const gaps = visible.length - 1;
    const slotH = Math.round((bottomSpace - gaps * pad) / visible.length);
    let curY = solarBottom + pad;
    visible.forEach((id) => {
      const el2 = document.getElementById(id);
      if (!el2) return;
      el2.style.left = rightX + "px";
      el2.style.top = curY + "px";
      el2.style.width = rightW + "px";
      el2.style.height = slotH + "px";
      curY += slotH + pad;
    });
    saveWidgets();
  }
  function getWidgetArea() {
    const area = document.getElementById("widgetArea");
    return { width: area.clientWidth, height: area.clientHeight };
  }
  function getDefaultLayout() {
    const { width: W, height: H } = getWidgetArea();
    const pad = 6;
    const leftW = Math.round(W * 0.3);
    const rightW = Math.round(W * 0.25);
    const centerW = W - leftW - rightW - pad * 4;
    const rightHalf = Math.round((H - pad * 3) / 2);
    const rightX = leftW + centerW + pad * 3;
    const filtersH = 220;
    const activationsH = H - filtersH - pad * 3;
    const layout = {
      "widget-filters": { left: pad, top: pad, width: leftW, height: filtersH },
      "widget-activations": { left: pad, top: filtersH + pad * 2, width: leftW, height: activationsH },
      "widget-map": { left: leftW + pad * 2, top: pad, width: centerW, height: H - pad * 2 },
      "widget-solar": { left: rightX, top: pad, width: rightW, height: rightHalf }
    };
    const rightBottomIds = ["widget-spacewx", "widget-propagation", "widget-voacap", "widget-live-spots", "widget-lunar", "widget-satellites", "widget-rst", "widget-spot-detail", "widget-contests", "widget-dxpeditions", "widget-beacons", "widget-dedx", "widget-stopwatch", "widget-analog-clock"];
    const vis = state_default.widgetVisibility || {};
    const visibleBottom = rightBottomIds.filter((id) => vis[id] !== false);
    const bottomSpace = H - rightHalf - pad * 2;
    const gaps = visibleBottom.length > 0 ? visibleBottom.length - 1 : 0;
    const slotH = visibleBottom.length > 0 ? Math.round((bottomSpace - gaps * pad) / visibleBottom.length) : 0;
    let curY = rightHalf + pad * 2;
    visibleBottom.forEach((id) => {
      layout[id] = { left: rightX, top: curY, width: rightW, height: slotH };
      curY += slotH + pad;
    });
    rightBottomIds.filter((id) => vis[id] === false).forEach((id) => {
      layout[id] = { left: rightX, top: rightHalf + pad * 2, width: rightW, height: 150 };
    });
    return layout;
  }
  function clampPosition(left, top, wW, wH) {
    const { width: aW, height: aH } = getWidgetArea();
    left = Math.max(0, Math.min(left, aW - 60));
    top = Math.max(0, Math.min(top, aH - HEADER_H));
    return { left, top };
  }
  function snapPosition(left, top, wW, wH) {
    const { width: aW, height: aH } = getWidgetArea();
    const right = left + wW;
    const bottom = top + wH;
    if (Math.abs(left) < SNAP_DIST) left = 0;
    if (Math.abs(right - aW) < SNAP_DIST) left = aW - wW;
    if (Math.abs(top) < SNAP_DIST) top = 0;
    if (Math.abs(bottom - aH) < SNAP_DIST) top = aH - wH;
    const cx = left + wW / 2;
    if (Math.abs(cx - aW / 2) < SNAP_DIST) left = Math.round((aW - wW) / 2);
    const cy = top + wH / 2;
    if (Math.abs(cy - aH / 2) < SNAP_DIST) top = Math.round((aH - wH) / 2);
    return { left, top };
  }
  function clampSize(left, top, w, h) {
    const { width: aW, height: aH } = getWidgetArea();
    w = Math.min(w, aW - left);
    h = Math.min(h, aH - top);
    w = Math.max(150, w);
    h = Math.max(80, h);
    return { w, h };
  }
  function getWidgetRect(widget) {
    return {
      id: widget.id,
      left: parseInt(widget.style.left) || 0,
      top: parseInt(widget.style.top) || 0,
      width: parseInt(widget.style.width) || 200,
      height: parseInt(widget.style.height) || 150
    };
  }
  function rectsOverlap(r1, r2) {
    return !(r1.left + r1.width <= r2.left || // r1 is left of r2
    r2.left + r2.width <= r1.left || // r2 is left of r1
    r1.top + r1.height <= r2.top || // r1 is above r2
    r2.top + r2.height <= r1.top);
  }
  function resolveOverlaps(movedWidget) {
    const { width: aW, height: aH } = getWidgetArea();
    const pad = 6;
    const maxIterations = 10;
    for (let iter = 0; iter < maxIterations; iter++) {
      let anyMoved = false;
      const movedRect = getWidgetRect(movedWidget);
      document.querySelectorAll(".widget").forEach((other) => {
        if (other.id === movedWidget.id) return;
        if (other.style.display === "none") return;
        if (state_default.widgetVisibility && state_default.widgetVisibility[other.id] === false) return;
        const otherRect = getWidgetRect(other);
        if (!rectsOverlap(movedRect, otherRect)) return;
        const overlapLeft = movedRect.left + movedRect.width - otherRect.left;
        const overlapRight = otherRect.left + otherRect.width - movedRect.left;
        const overlapTop = movedRect.top + movedRect.height - otherRect.top;
        const overlapBottom = otherRect.top + otherRect.height - movedRect.top;
        const pushes = [
          { dir: "right", dist: overlapLeft, newLeft: movedRect.left + movedRect.width + pad, newTop: otherRect.top },
          { dir: "left", dist: overlapRight, newLeft: movedRect.left - otherRect.width - pad, newTop: otherRect.top },
          { dir: "down", dist: overlapTop, newLeft: otherRect.left, newTop: movedRect.top + movedRect.height + pad },
          { dir: "up", dist: overlapBottom, newLeft: otherRect.left, newTop: movedRect.top - otherRect.height - pad }
        ];
        const validPushes = pushes.filter((p) => {
          return p.newLeft >= 0 && p.newTop >= 0 && p.newLeft + otherRect.width <= aW && p.newTop + otherRect.height <= aH;
        });
        const sorted = (validPushes.length > 0 ? validPushes : pushes).sort((a, b) => a.dist - b.dist);
        const best = sorted[0];
        let newLeft = Math.max(0, Math.min(best.newLeft, aW - otherRect.width));
        let newTop = Math.max(0, Math.min(best.newTop, aH - otherRect.height));
        if (newLeft !== otherRect.left || newTop !== otherRect.top) {
          other.style.left = newLeft + "px";
          other.style.top = newTop + "px";
          anyMoved = true;
        }
      });
      if (!anyMoved) break;
    }
  }
  function resolveAllOverlaps() {
    const widgets = Array.from(document.querySelectorAll(".widget")).filter((w) => {
      return w.style.display !== "none" && (!state_default.widgetVisibility || state_default.widgetVisibility[w.id] !== false);
    });
    const { width: aW, height: aH } = getWidgetArea();
    const pad = 6;
    const maxIterations = 20;
    for (let iter = 0; iter < maxIterations; iter++) {
      let anyMoved = false;
      for (let i = 0; i < widgets.length; i++) {
        for (let j = i + 1; j < widgets.length; j++) {
          const r1 = getWidgetRect(widgets[i]);
          const r2 = getWidgetRect(widgets[j]);
          if (!rectsOverlap(r1, r2)) continue;
          const overlapLeft = r1.left + r1.width - r2.left;
          const overlapRight = r2.left + r2.width - r1.left;
          const overlapTop = r1.top + r1.height - r2.top;
          const overlapBottom = r2.top + r2.height - r1.top;
          const pushes = [
            { dist: overlapLeft, newLeft: r1.left + r1.width + pad, newTop: r2.top },
            { dist: overlapRight, newLeft: r1.left - r2.width - pad, newTop: r2.top },
            { dist: overlapTop, newLeft: r2.left, newTop: r1.top + r1.height + pad },
            { dist: overlapBottom, newLeft: r2.left, newTop: r1.top - r2.height - pad }
          ];
          const validPushes = pushes.filter((p) => {
            return p.newLeft >= 0 && p.newTop >= 0 && p.newLeft + r2.width <= aW && p.newTop + r2.height <= aH;
          });
          const sorted = (validPushes.length > 0 ? validPushes : pushes).sort((a, b) => a.dist - b.dist);
          const best = sorted[0];
          let newLeft = Math.max(0, Math.min(best.newLeft, aW - r2.width));
          let newTop = Math.max(0, Math.min(best.newTop, aH - r2.height));
          if (newLeft !== r2.left || newTop !== r2.top) {
            widgets[j].style.left = newLeft + "px";
            widgets[j].style.top = newTop + "px";
            anyMoved = true;
          }
        }
      }
      if (!anyMoved) break;
    }
  }
  function saveWidgets() {
    const layout = {};
    document.querySelectorAll(".widget").forEach((w) => {
      layout[w.id] = {
        left: parseInt(w.style.left) || 0,
        top: parseInt(w.style.top) || 0,
        width: parseInt(w.style.width) || 200,
        height: parseInt(w.style.height) || 150
      };
    });
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(layout));
  }
  function saveUserLayout() {
    const layout = {};
    document.querySelectorAll(".widget").forEach((w) => {
      layout[w.id] = {
        left: parseInt(w.style.left) || 0,
        top: parseInt(w.style.top) || 0,
        width: parseInt(w.style.width) || 200,
        height: parseInt(w.style.height) || 150
      };
    });
    localStorage.setItem(USER_LAYOUT_KEY, JSON.stringify(layout));
  }
  function clearUserLayout() {
    localStorage.removeItem(USER_LAYOUT_KEY);
  }
  function hasUserLayout() {
    return localStorage.getItem(USER_LAYOUT_KEY) !== null;
  }
  function bringToFront(widget) {
    state_default.zCounter++;
    widget.style.zIndex = state_default.zCounter;
  }
  function setupDrag(widget, handle) {
    let startX, startY, origLeft, origTop;
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (state_default.reflowActive || computeScaleFactor() < 1) return;
      if (isGridMode()) {
        handleGridDragStart(widget, e);
        return;
      }
      e.preventDefault();
      bringToFront(widget);
      startX = e.clientX;
      startY = e.clientY;
      origLeft = parseInt(widget.style.left) || 0;
      origTop = parseInt(widget.style.top) || 0;
      function onMove(ev) {
        let newLeft = origLeft + (ev.clientX - startX);
        let newTop = origTop + (ev.clientY - startY);
        const wW = widget.offsetWidth;
        const wH = widget.offsetHeight;
        ({ left: newLeft, top: newTop } = snapPosition(newLeft, newTop, wW, wH));
        ({ left: newLeft, top: newTop } = clampPosition(newLeft, newTop, wW, wH));
        widget.style.left = newLeft + "px";
        widget.style.top = newTop + "px";
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        resolveOverlaps(widget);
        saveWidgets();
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }
  function setupResize(widget, handle) {
    let startX, startY, origW, origH, origLeft, origTop;
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
      if (isGridMode()) return;
      if (state_default.reflowActive || computeScaleFactor() < 1) return;
      e.preventDefault();
      e.stopPropagation();
      bringToFront(widget);
      startX = e.clientX;
      startY = e.clientY;
      origW = widget.offsetWidth;
      origH = widget.offsetHeight;
      origLeft = parseInt(widget.style.left) || 0;
      origTop = parseInt(widget.style.top) || 0;
      function onMove(ev) {
        let newW = origW + (ev.clientX - startX);
        let newH = origH + (ev.clientY - startY);
        ({ w: newW, h: newH } = clampSize(origLeft, origTop, newW, newH));
        widget.style.width = newW + "px";
        widget.style.height = newH + "px";
        if (state_default.map && widget.id === "widget-map") {
          state_default.map.invalidateSize();
        }
      }
      function onUp() {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        resolveOverlaps(widget);
        saveWidgets();
        if (state_default.map && widget.id === "widget-map") {
          state_default.map.invalidateSize();
        }
      }
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }
  function applyLayout(layout) {
    if (getLayoutMode() !== "desktop") {
      if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 200);
      return;
    }
    const defaults = getDefaultLayout();
    document.querySelectorAll(".widget").forEach((widget) => {
      const pos = layout[widget.id] || defaults[widget.id];
      if (pos) {
        widget.style.left = pos.left + "px";
        widget.style.top = pos.top + "px";
        widget.style.width = pos.width + "px";
        widget.style.height = pos.height + "px";
      }
      widget.style.zIndex = ++state_default.zCounter;
    });
    if (state_default.map) state_default.map.invalidateSize();
  }
  function reflowWidgets() {
    if (isGridMode()) {
      repositionGridHandles();
      if (state_default.map) state_default.map.invalidateSize();
      return;
    }
    if (getLayoutMode() !== "desktop") return;
    const { width: aW, height: aH } = getWidgetArea();
    if (prevAreaW === 0 || prevAreaH === 0) {
      prevAreaW = aW;
      prevAreaH = aH;
      return;
    }
    const scaleX = aW / prevAreaW;
    const scaleY = aH / prevAreaH;
    document.querySelectorAll(".widget").forEach((widget) => {
      if (widget.style.display === "none") return;
      let left = Math.round((parseInt(widget.style.left) || 0) * scaleX);
      let top = Math.round((parseInt(widget.style.top) || 0) * scaleY);
      let w = Math.round((parseInt(widget.style.width) || 200) * scaleX);
      let h = Math.round((parseInt(widget.style.height) || 150) * scaleY);
      w = Math.max(150, w);
      h = Math.max(80, h);
      if (w > aW) w = aW;
      if (h > aH) h = aH;
      if (left + w > aW) left = Math.max(0, aW - w);
      if (top + h > aH) top = Math.max(0, aH - h);
      widget.style.left = left + "px";
      widget.style.top = top + "px";
      widget.style.width = w + "px";
      widget.style.height = h + "px";
    });
    prevAreaW = aW;
    prevAreaH = aH;
    resolveAllOverlaps();
    if (state_default.map) state_default.map.invalidateSize();
    saveWidgets();
  }
  function computeScaleFactor() {
    const w = window.innerWidth;
    if (w >= SCALE_REFERENCE_WIDTH) return 1;
    return Math.max(w / SCALE_REFERENCE_WIDTH, SCALE_MIN_FACTOR);
  }
  function applyProgressiveScale() {
    const area = document.getElementById("widgetArea");
    if (!area) return;
    const w = window.innerWidth;
    if (w < SCALE_REFLOW_WIDTH) {
      if (!state_default.reflowActive) applyReflowLayout();
      return;
    }
    if (state_default.reflowActive) exitReflowLayout();
    const factor = computeScaleFactor();
    if (factor < 1) {
      area.style.transformOrigin = "top left";
      area.style.transform = `scale(${factor})`;
      area.style.width = `${100 / factor}%`;
      area.classList.add("scaling-active");
    } else {
      area.style.transform = "";
      area.style.width = "";
      area.style.transformOrigin = "";
      area.classList.remove("scaling-active");
    }
    if (state_default.map) state_default.map.invalidateSize();
  }
  function applyReflowLayout() {
    const area = document.getElementById("widgetArea");
    if (!area) return;
    state_default.reflowActive = true;
    area.style.transform = "";
    area.style.width = "";
    area.style.transformOrigin = "";
    area.classList.remove("scaling-active");
    if (getLayoutMode() === "mobile") {
      area.classList.remove("reflow-layout");
      rebuildTabs();
      if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 100);
      return;
    }
    area.classList.add("reflow-layout");
    const vis = state_default.widgetVisibility || {};
    REFLOW_WIDGET_ORDER.forEach((id) => {
      const el2 = document.getElementById(id);
      if (!el2) return;
      if (vis[id] === false) {
        el2.style.display = "none";
        return;
      }
      el2.style.display = "";
      area.appendChild(el2);
    });
    if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 100);
  }
  function exitReflowLayout() {
    const area = document.getElementById("widgetArea");
    if (!area) return;
    state_default.reflowActive = false;
    area.classList.remove("reflow-layout");
    if (isGridMode()) {
      activateGridMode(state_default.gridPermutation);
    } else {
      let layout;
      try {
        const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
        if (saved) layout = JSON.parse(saved);
      } catch (e) {
      }
      if (!layout) layout = getDefaultLayout();
      applyLayout(layout);
      applyWidgetVisibility();
    }
    if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 100);
  }
  function initWidgets() {
    let layout;
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) {
        layout = JSON.parse(saved);
        if (layout["widget-clock-local"] || layout["widget-clock-utc"]) {
          console.log("Clearing old layout with clock widgets");
          localStorage.removeItem(WIDGET_STORAGE_KEY);
          localStorage.removeItem(USER_LAYOUT_KEY);
          layout = null;
        } else {
          const { width: aW, height: aH } = getWidgetArea();
          for (const id of Object.keys(layout)) {
            const p = layout[id];
            if (p.left > aW - 30 || p.top > aH - 30 || p.left + p.width < 30 || p.top + p.height < 10) {
              layout = null;
              break;
            }
          }
        }
      }
    } catch (e) {
      layout = null;
    }
    if (!layout) {
      layout = getDefaultLayout();
    }
    applyLayout(layout);
    applyWidgetVisibility();
    const area = getWidgetArea();
    prevAreaW = area.width;
    prevAreaH = area.height;
    const isDesktop = getLayoutMode() === "desktop";
    document.querySelectorAll(".widget").forEach((widget) => {
      const header = widget.querySelector(".widget-header");
      const resizer = widget.querySelector(".widget-resize");
      if (header) {
        if (isDesktop) setupDrag(widget, header);
        const closeBtn = document.createElement("button");
        closeBtn.className = "widget-close-btn";
        closeBtn.title = "Hide widget";
        closeBtn.textContent = "\xD7";
        closeBtn.addEventListener("mousedown", (e) => e.stopPropagation());
        closeBtn.addEventListener("click", () => {
          if (isGridMode() && widget.id === "widget-map") return;
          state_default.widgetVisibility[widget.id] = false;
          saveWidgetVisibility();
          applyWidgetVisibility();
        });
        header.insertBefore(closeBtn, header.firstChild);
        if (!isDesktop) {
          const expandedByDefault = /* @__PURE__ */ new Set(["widget-map", "widget-activations"]);
          const collapseKey = "hamtab_collapsed";
          let collapsed;
          try {
            collapsed = new Set(JSON.parse(localStorage.getItem(collapseKey) || "[]"));
          } catch {
            collapsed = /* @__PURE__ */ new Set();
          }
          const wid = widget.id;
          if (collapsed.has(wid) || !collapsed.size && !expandedByDefault.has(wid)) {
            widget.classList.add("collapsed");
          }
          header.addEventListener("click", (e) => {
            if (e.target.closest("button") || e.target.closest("select") || e.target.closest("a")) return;
            widget.classList.toggle("collapsed");
            const allCollapsed = [];
            document.querySelectorAll(".widget.collapsed").forEach((w) => allCollapsed.push(w.id));
            localStorage.setItem(collapseKey, JSON.stringify(allCollapsed));
            if (wid === "widget-map" && !widget.classList.contains("collapsed") && state_default.map) {
              setTimeout(() => state_default.map.invalidateSize(), 50);
            }
          });
        }
      }
      if (resizer && isDesktop) setupResize(widget, resizer);
      if (isDesktop) widget.addEventListener("mousedown", () => bringToFront(widget));
    });
    const mapWidget = document.getElementById("widget-map");
    if (state_default.map && mapWidget && window.ResizeObserver) {
      new ResizeObserver(() => state_default.map.invalidateSize()).observe(mapWidget);
    }
    if (!isDesktop && mapWidget) {
      const mapHeader = mapWidget.querySelector(".widget-header");
      if (mapHeader) {
        const maxBtn = document.createElement("button");
        maxBtn.className = "map-fullscreen-btn";
        maxBtn.title = "Toggle fullscreen map";
        maxBtn.textContent = "\u26F6";
        maxBtn.addEventListener("mousedown", (e) => e.stopPropagation());
        maxBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          mapWidget.classList.toggle("map-fullscreen");
          if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 50);
        });
        mapHeader.appendChild(maxBtn);
      }
    }
    if (window.ResizeObserver) {
      let reflowTimer;
      new ResizeObserver(() => {
        clearTimeout(reflowTimer);
        reflowTimer = setTimeout(() => {
          applyProgressiveScale();
          if (computeScaleFactor() === 1 && !state_default.reflowActive) {
            reflowWidgets();
          }
        }, 150);
      }).observe(document.getElementById("widgetArea"));
    }
    if (isGridMode()) {
      activateGridMode(state_default.gridPermutation);
    }
    applyProgressiveScale();
  }
  var WIDGET_VIS_KEY, prevAreaW, prevAreaH;
  var init_widgets = __esm({
    "src/widgets.js"() {
      init_state();
      init_constants();
      init_grid_layout();
      init_tabs();
      WIDGET_VIS_KEY = "hamtab_widget_vis";
      prevAreaW = 0;
      prevAreaH = 0;
    }
  });

  // src/beacons.js
  function getActiveBeacons() {
    const now = /* @__PURE__ */ new Date();
    const T = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
    const slot = Math.floor(T % CYCLE / SLOT);
    const elapsed2 = T % SLOT;
    return FREQUENCIES.map((freq, f) => ({
      freq,
      beacon: BEACONS[(slot - f + 18) % 18],
      // each freq is offset by one beacon in the rotation
      secondsLeft: SLOT - elapsed2
    }));
  }
  function renderBeacons() {
    if (!isWidgetVisible("widget-beacons")) return;
    const tbody = $("beaconTbody");
    if (!tbody) return;
    const active2 = getActiveBeacons();
    if (tbody.children.length !== active2.length) {
      tbody.textContent = "";
      for (const entry of active2) {
        const tr = document.createElement("tr");
        const tdFreq = document.createElement("td");
        tdFreq.textContent = (entry.freq / 1e3).toFixed(3);
        tr.appendChild(tdFreq);
        const tdCall = document.createElement("td");
        tdCall.className = "beacon-call";
        tdCall.textContent = entry.beacon.call;
        tr.appendChild(tdCall);
        const tdLoc = document.createElement("td");
        tdLoc.className = "beacon-loc";
        tdLoc.textContent = entry.beacon.location;
        tr.appendChild(tdLoc);
        const tdTime = document.createElement("td");
        tdTime.className = "beacon-time";
        tdTime.textContent = entry.secondsLeft + "s";
        tr.appendChild(tdTime);
        tbody.appendChild(tr);
      }
    } else {
      for (let i = 0; i < active2.length; i++) {
        const cells = tbody.children[i].children;
        cells[1].textContent = active2[i].beacon.call;
        cells[2].textContent = active2[i].beacon.location;
        cells[3].textContent = active2[i].secondsLeft + "s";
      }
    }
  }
  function initBeaconListeners() {
  }
  function startBeaconTimer() {
    renderBeacons();
    state_default.beaconTimer = setInterval(renderBeacons, 1e3);
  }
  function stopBeaconTimer() {
    if (state_default.beaconTimer) {
      clearInterval(state_default.beaconTimer);
      state_default.beaconTimer = null;
    }
  }
  var BEACONS, FREQUENCIES, CYCLE, SLOT;
  var init_beacons = __esm({
    "src/beacons.js"() {
      init_state();
      init_dom();
      init_widgets();
      BEACONS = [
        { call: "4U1UN", location: "New York", lat: 40.75, lon: -73.97 },
        { call: "VE8AT", location: "Inuvik", lat: 68.32, lon: -133.52 },
        { call: "W6WX", location: "Mt. Umunhum", lat: 37.16, lon: -121.9 },
        { call: "KH6RS", location: "Maui", lat: 20.75, lon: -156.43 },
        { call: "ZL6B", location: "Masterton", lat: -41.06, lon: 175.58 },
        { call: "VK6RBP", location: "Rolystone", lat: -32.11, lon: 116.05 },
        { call: "JA2IGY", location: "Mt. Asama", lat: 34.46, lon: 136.78 },
        { call: "RR9O", location: "Novosibirsk", lat: 54.98, lon: 82.9 },
        { call: "VR2B", location: "Hong Kong", lat: 22.28, lon: 114.17 },
        { call: "4S7B", location: "Colombo", lat: 6.88, lon: 79.87 },
        { call: "ZS6DN", location: "Pretoria", lat: -25.73, lon: 28.18 },
        { call: "5Z4B", location: "Kikuyu", lat: -1.25, lon: 36.67 },
        { call: "4X6TU", location: "Tel Aviv", lat: 32.08, lon: 34.78 },
        { call: "OH2B", location: "Lohja", lat: 60.25, lon: 24.03 },
        { call: "CS3B", location: "Madeira", lat: 32.65, lon: -16.9 },
        { call: "LU4AA", location: "Buenos Aires", lat: -34.62, lon: -58.44 },
        { call: "OA4B", location: "Lima", lat: -12.08, lon: -76.98 },
        { call: "YV5B", location: "Caracas", lat: 10.5, lon: -66.92 }
      ];
      FREQUENCIES = [14100, 18110, 21150, 24930, 28200];
      CYCLE = 180;
      SLOT = 10;
    }
  });

  // src/map-init.js
  var map_init_exports = {};
  __export(map_init_exports, {
    centerMapOnUser: () => centerMapOnUser,
    initMap: () => initMap,
    swapMapTiles: () => swapMapTiles,
    updateBeaconMarkers: () => updateBeaconMarkers,
    updateMoonMarker: () => updateMoonMarker,
    updateSunMarker: () => updateSunMarker,
    updateUserMarker: () => updateUserMarker
  });
  function initMap() {
    const hasLeaflet = typeof L !== "undefined" && L.map;
    if (!hasLeaflet) return;
    const isMobile = window.innerWidth < BREAKPOINT_MOBILE;
    try {
      state_default.map = L.map("map", {
        worldCopyJump: true,
        maxBoundsViscosity: 1,
        maxBounds: [[-90, -180], [90, 180]],
        minZoom: 1,
        zoomControl: false
        // added manually for position control
      }).setView([39.8, -98.5], 4);
      L.control.zoom({ position: isMobile ? "bottomright" : "topleft" }).addTo(state_default.map);
      state_default.tileLayer = L.tileLayer(TILE_DARK, {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 19
      }).addTo(state_default.map);
      state_default.clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 40,
        // px — merge markers within 40px; keeps clusters tight on a dark basemap
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
          const childCount = cluster.getChildCount();
          const sizeClass = childCount < 10 ? "small" : childCount < 100 ? "medium" : "large";
          let extraClass = "";
          if (state_default.selectedSpotId && state_default.markers[state_default.selectedSpotId]) {
            const children = cluster.getAllChildMarkers();
            if (children.indexOf(state_default.markers[state_default.selectedSpotId]) !== -1) {
              extraClass = " marker-cluster-selected";
            }
          }
          return L.divIcon({
            html: "<div><span>" + childCount + "</span></div>",
            className: "marker-cluster marker-cluster-" + sizeClass + extraClass,
            iconSize: L.point(40, 40)
          });
        }
      });
      state_default.map.addLayer(state_default.clusterGroup);
      state_default.map.createPane("grayline");
      state_default.map.getPane("grayline").style.zIndex = 250;
      state_default.map.createPane("propagation");
      state_default.map.getPane("propagation").style.zIndex = 300;
      state_default.map.createPane("mapOverlays");
      state_default.map.getPane("mapOverlays").style.zIndex = 350;
      state_default.map.getPane("mapOverlays").style.pointerEvents = "none";
      state_default.map.on("zoomend", () => {
        if (state_default.mapOverlays.latLonGrid) {
          const { renderLatLonGrid: renderLatLonGrid2 } = (init_map_overlays(), __toCommonJS(map_overlays_exports));
          renderLatLonGrid2();
        }
        if (state_default.mapOverlays.maidenheadGrid) {
          clearTimeout(state_default.maidenheadDebounceTimer);
          const { renderMaidenheadGrid: renderMaidenheadGrid2 } = (init_map_overlays(), __toCommonJS(map_overlays_exports));
          state_default.maidenheadDebounceTimer = setTimeout(renderMaidenheadGrid2, 150);
        }
        if (state_default.mapOverlays.tropicsLines) renderTropicsLines();
        if (state_default.hfPropOverlayBand && state_default.heatmapOverlayMode === "heatmap") {
          clearTimeout(state_default.heatmapRenderTimer);
          const { renderHeatmapCanvas: renderHeatmapCanvas2 } = (init_rel_heatmap(), __toCommonJS(rel_heatmap_exports));
          state_default.heatmapRenderTimer = setTimeout(() => renderHeatmapCanvas2(state_default.hfPropOverlayBand), 200);
        }
      });
      state_default.map.on("moveend", () => {
        if (state_default.mapOverlays.latLonGrid) {
          const { renderLatLonGrid: renderLatLonGrid2 } = (init_map_overlays(), __toCommonJS(map_overlays_exports));
          renderLatLonGrid2();
        }
        if (state_default.mapOverlays.maidenheadGrid) {
          clearTimeout(state_default.maidenheadDebounceTimer);
          const { renderMaidenheadGrid: renderMaidenheadGrid2 } = (init_map_overlays(), __toCommonJS(map_overlays_exports));
          state_default.maidenheadDebounceTimer = setTimeout(renderMaidenheadGrid2, 150);
        }
        if (state_default.mapOverlays.tropicsLines) renderTropicsLines();
        if (state_default.hfPropOverlayBand && state_default.heatmapOverlayMode === "heatmap") {
          clearTimeout(state_default.heatmapRenderTimer);
          const { renderHeatmapCanvas: renderHeatmapCanvas2 } = (init_rel_heatmap(), __toCommonJS(rel_heatmap_exports));
          state_default.heatmapRenderTimer = setTimeout(() => renderHeatmapCanvas2(state_default.hfPropOverlayBand), 200);
        }
      });
      window.addEventListener("orientationchange", () => {
        setTimeout(() => {
          if (state_default.map) state_default.map.invalidateSize();
        }, 200);
      });
      setTimeout(renderAllMapOverlays, 200);
    } catch (e) {
      console.error("Map initialization failed:", e);
      state_default.map = null;
      state_default.clusterGroup = null;
    }
  }
  function centerMapOnUser() {
    if (!state_default.map) return;
    if (state_default.mapCenterMode === "pm") {
      state_default.map.setView([0, 0], 2);
    } else if (state_default.mapCenterMode === "qth") {
      if (state_default.myLat !== null && state_default.myLon !== null) {
        state_default.map.setView([state_default.myLat, state_default.myLon], state_default.map.getZoom());
      }
    }
  }
  function updateUserMarker() {
    if (!state_default.map || state_default.myLat === null || state_default.myLon === null) return;
    const call = state_default.myCallsign || "ME";
    const grid = latLonToGrid(state_default.myLat, state_default.myLon).substring(0, 4).toUpperCase();
    const popupHtml = `<div class="user-popup"><div class="user-popup-title">${esc(call)}</div><div class="user-popup-row">${state_default.myLat.toFixed(4)}, ${state_default.myLon.toFixed(4)}</div><div class="user-popup-row">Grid: ${esc(grid)}</div><div class="user-popup-row">${state_default.manualLoc ? "Manual override" : "GPS"}</div></div>`;
    if (state_default.userMarker) {
      state_default.userMarker.setLatLng([state_default.myLat, state_default.myLon]);
      state_default.userMarker.setPopupContent(popupHtml);
      state_default.userMarker.setIcon(L.divIcon({
        className: "user-icon",
        html: `<span class="user-icon-diamond">&#9889;</span><span class="user-icon-call">${esc(call)}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      }));
    } else {
      const icon = L.divIcon({
        className: "user-icon",
        html: `<span class="user-icon-diamond">&#9889;</span><span class="user-icon-call">${esc(call)}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0]
      });
      state_default.userMarker = L.marker([state_default.myLat, state_default.myLon], { icon, zIndexOffset: 9e3 }).addTo(state_default.map);
      state_default.userMarker.bindPopup(popupHtml, { maxWidth: 200 });
    }
  }
  function updateSunMarker() {
    if (!state_default.map || state_default.sunLat === null || state_default.sunLon === null) return;
    const icon = L.divIcon({
      className: "sun-marker-icon",
      html: '<span class="sun-marker-dot"></span>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    const tooltip = `Sub-solar point
${state_default.sunLat.toFixed(1)}\xB0, ${state_default.sunLon.toFixed(1)}\xB0`;
    if (state_default.sunMarker) {
      state_default.sunMarker.setLatLng([state_default.sunLat, state_default.sunLon]);
    } else {
      state_default.sunMarker = L.marker([state_default.sunLat, state_default.sunLon], { icon, zIndexOffset: 8e3, interactive: true }).addTo(state_default.map);
      state_default.sunMarker.bindTooltip(tooltip);
    }
    state_default.sunMarker.setTooltipContent(tooltip);
  }
  function gmstDegrees(date) {
    const JD = date.getTime() / 864e5 + 24405875e-1;
    const T = (JD - 2451545) / 36525;
    let gmst = 280.46061837 + 360.98564736629 * (JD - 2451545) + 387933e-9 * T * T - T * T * T / 3871e4;
    return (gmst % 360 + 360) % 360;
  }
  function updateMoonMarker() {
    if (!state_default.map || !state_default.lastLunarData) return;
    const data = state_default.lastLunarData;
    const dec = data.declination;
    const ra = data.rightAscension;
    if (dec == null || ra == null) return;
    const now = /* @__PURE__ */ new Date();
    const gmst = gmstDegrees(now);
    let moonLon = ra - gmst;
    moonLon = ((moonLon + 180) % 360 + 360) % 360 - 180;
    state_default.moonLat = dec;
    state_default.moonLon = moonLon;
    const icon = L.divIcon({
      className: "moon-marker-icon",
      html: '<span class="moon-marker-dot"></span>',
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });
    const tooltip = `Sub-lunar point
${dec.toFixed(1)}\xB0, ${moonLon.toFixed(1)}\xB0`;
    if (state_default.moonMarker) {
      state_default.moonMarker.setLatLng([dec, moonLon]);
    } else {
      state_default.moonMarker = L.marker([dec, moonLon], { icon, zIndexOffset: 7500, interactive: true }).addTo(state_default.map);
      state_default.moonMarker.bindTooltip(tooltip);
    }
    state_default.moonMarker.setTooltipContent(tooltip);
  }
  function updateBeaconMarkers() {
    if (!state_default.map) return;
    const active2 = getActiveBeacons();
    for (const key of Object.keys(state_default.beaconMarkers)) {
      state_default.map.removeLayer(state_default.beaconMarkers[key]);
      delete state_default.beaconMarkers[key];
    }
    for (const entry of active2) {
      const { freq, beacon } = entry;
      const color = BEACON_COLORS[freq] || "#ffffff";
      const marker = L.circleMarker([beacon.lat, beacon.lon], {
        radius: 5,
        color,
        fillColor: color,
        fillOpacity: 0.8,
        weight: 1,
        interactive: true
      }).addTo(state_default.map);
      marker.bindTooltip(`${beacon.call}
${(freq / 1e3).toFixed(3)} MHz
${beacon.location}`);
      state_default.beaconMarkers[freq] = marker;
    }
  }
  function swapMapTiles(themeId) {
    if (!state_default.tileLayer) return;
    const url = themeId === "hamclock" ? TILE_VOYAGER : TILE_DARK;
    state_default.tileLayer.setUrl(url);
  }
  var TILE_DARK, TILE_VOYAGER, BEACON_COLORS;
  var init_map_init = __esm({
    "src/map-init.js"() {
      init_state();
      init_geo();
      init_utils();
      init_map_overlays();
      init_beacons();
      init_constants();
      TILE_DARK = "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";
      TILE_VOYAGER = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png";
      BEACON_COLORS = {
        14100: "#ff4444",
        // 20m — red
        18110: "#ff8800",
        // 17m — orange
        21150: "#ffff00",
        // 15m — yellow
        24930: "#00cc44",
        // 12m — green
        28200: "#4488ff"
        // 10m — blue
      };
    }
  });

  // src/migration.js
  function migrate() {
    if (localStorage.getItem("hamtab_migrated")) return;
    const PREFIX_OLD = "pota_";
    const PREFIX_NEW = "hamtab_";
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(PREFIX_OLD)) {
        const newKey = PREFIX_NEW + key.slice(PREFIX_OLD.length);
        if (localStorage.getItem(newKey) === null) {
          localStorage.setItem(newKey, localStorage.getItem(key));
        }
        localStorage.removeItem(key);
        i--;
      }
    }
    localStorage.setItem("hamtab_migrated", "1");
  }
  function migrateV2() {
    if (localStorage.getItem("hamtab_migration_v2")) return;
    if (localStorage.getItem("hamtab_theme") === "hamclock") {
      localStorage.setItem("hamtab_theme", "terminal");
    }
    localStorage.setItem("hamtab_migration_v2", "1");
  }

  // src/themes.js
  var STORAGE_KEY = "hamtab_theme";
  var THEMES = {
    default: {
      id: "default",
      name: "Default",
      description: "Modern dark theme",
      bodyClass: "",
      supportsGrid: true,
      vars: {
        "--bg": "#1a1a2e",
        "--surface": "#16213e",
        "--surface2": "#0f3460",
        "--surface3": "#1a4a7a",
        "--accent": "#e94560",
        "--text": "#e0e0e0",
        "--text-dim": "#8899aa",
        "--green": "#00c853",
        "--yellow": "#ffd600",
        "--red": "#ff1744",
        "--orange": "#ff9100",
        "--border": "#2a3a5e",
        "--bg-secondary": "#1a1a2e",
        "--bg-tertiary": "#252540",
        "--de-color": "#4fc3f7",
        // light blue — DE panel accent
        "--dx-color": "#81c784"
        // light green — DX panel accent
      }
    },
    lcars: {
      id: "lcars",
      name: "LCARS",
      description: "Star Trek TNG inspired",
      bodyClass: "theme-lcars",
      supportsGrid: true,
      vars: {
        "--bg": "#000000",
        "--surface": "#0a0a14",
        "--surface2": "#9999CC",
        // blue-bell (Drexler palette)
        "--surface3": "#CC99CC",
        // lilac
        "--accent": "#FFCC66",
        // golden-tanoi — signature LCARS gold
        "--text": "#FF9966",
        // orange-peel
        "--text-dim": "#CCBBDD",
        // light-lavender (brighter for contrast on dark bg)
        "--green": "#99CCFF",
        // anakiwa — LCARS uses blue for "go"
        "--yellow": "#FFFF99",
        // pale-canary
        "--red": "#CC6666",
        // chestnut-rose
        "--orange": "#FF9933",
        // neon-carrot
        "--border": "#9999CC",
        // blue-bell (matches surface2)
        "--bg-secondary": "#0a0a14",
        "--bg-tertiary": "#111122",
        "--de-color": "#ff9900",
        // LCARS gold — DE panel accent
        "--dx-color": "#99ccff"
        // LCARS blue — DX panel accent
      }
    },
    terminal: {
      id: "terminal",
      name: "Terminal",
      description: "Retro terminal style",
      bodyClass: "theme-terminal",
      supportsGrid: true,
      vars: {
        "--bg": "#000000",
        "--surface": "#0a1a0a",
        "--surface2": "#0d2b0d",
        "--surface3": "#143014",
        "--accent": "#00cc66",
        "--text": "#00ff88",
        "--text-dim": "#338855",
        "--green": "#00ff44",
        "--yellow": "#cccc00",
        "--red": "#ff3333",
        "--orange": "#ff8800",
        "--border": "#1a4a2a",
        "--bg-secondary": "#0a1a0a",
        "--bg-tertiary": "#0d200d",
        "--de-color": "#00ff00",
        // green — DE panel accent
        "--dx-color": "#00ff00"
        // green — DX panel accent
      }
    },
    hamclock: {
      id: "hamclock",
      name: "HamClock",
      description: "Inspired by HamClock by WB0OEW",
      bodyClass: "theme-hamclock",
      supportsGrid: true,
      vars: {
        "--bg": "#000000",
        "--surface": "#000000",
        // pure black — real HamClock has no surface variation
        "--surface2": "#0a0a0a",
        "--surface3": "#141414",
        "--accent": "#00ffff",
        // cyan — HamClock uses cyan for headings/labels
        "--text": "#e0e0e0",
        // white-ish — HamClock main text
        "--text-dim": "#888899",
        "--green": "#00ff00",
        // bright green — active/positive values
        "--yellow": "#ffff00",
        // yellow — warnings, highlighted values
        "--red": "#ff0000",
        // red — alerts
        "--orange": "#e8a000",
        // warm amber — matches real HamClock orange
        "--border": "#333333",
        // subtle separator — real HamClock uses very thin borders
        "--bg-secondary": "#000000",
        "--bg-tertiary": "#0a0a0a",
        "--de-color": "#e8a000",
        // orange — DE panel accent (matches real HamClock)
        "--dx-color": "#00ff00"
        // bright green — DX panel accent
      }
    },
    rebel: {
      id: "rebel",
      name: "Rebel",
      description: "Desert outpost warmth",
      bodyClass: "",
      supportsGrid: true,
      vars: {
        "--bg": "#1a120b",
        // deep charred brown
        "--surface": "#2a1a0e",
        // dark burnt sienna
        "--surface2": "#3d2614",
        // warm leather brown
        "--surface3": "#4a3020",
        // dusty canyon
        "--accent": "#ff6f00",
        // blazing orange — rally signal
        "--text": "#f0dcc0",
        // warm parchment
        "--text-dim": "#9a8060",
        // faded sand
        "--green": "#7cb342",
        // olive rebel green
        "--yellow": "#ffc107",
        // gold
        "--red": "#e53935",
        // alert red
        "--orange": "#ff8f00",
        // deep amber
        "--border": "#5c3a1e",
        // worn leather edge
        "--bg-secondary": "#1a120b",
        "--bg-tertiary": "#221610",
        "--de-color": "#ff6f00",
        // blazing orange — DE panel accent
        "--dx-color": "#7cb342"
        // olive green — DX panel accent
      }
    },
    imperial: {
      id: "imperial",
      name: "Imperial",
      description: "Cold steel command deck",
      bodyClass: "",
      supportsGrid: true,
      vars: {
        "--bg": "#0a0c10",
        // near-black with cold blue cast
        "--surface": "#12151c",
        // dark gunmetal
        "--surface2": "#1c2030",
        // brushed steel
        "--surface3": "#262b3e",
        // polished durasteel
        "--accent": "#90caf9",
        // cold ice blue — command highlight
        "--text": "#cfd8e0",
        // cool gray-white
        "--text-dim": "#607080",
        // muted steel
        "--green": "#66bb6a",
        // tactical green
        "--yellow": "#ffee58",
        // caution yellow
        "--red": "#ef5350",
        // imperial red
        "--orange": "#ffa726",
        // amber alert
        "--border": "#2a3040",
        // cold steel border
        "--bg-secondary": "#0a0c10",
        "--bg-tertiary": "#0e1018",
        "--de-color": "#90caf9",
        // ice blue — DE panel accent
        "--dx-color": "#ef5350"
        // imperial red — DX panel accent
      }
    },
    neon: {
      id: "neon",
      name: "Neon",
      description: "Digital grid, neon glow",
      bodyClass: "theme-neon",
      supportsGrid: true,
      vars: {
        "--bg": "#050510",
        // void black with blue tint
        "--surface": "#0a0a1a",
        // deep digital dark
        "--surface2": "#0f1028",
        // dark grid
        "--surface3": "#141838",
        // subtle grid highlight
        "--accent": "#00e5ff",
        // neon cyan — primary glow
        "--text": "#e0f0ff",
        // cool white
        "--text-dim": "#4a6080",
        // dim circuit trace
        "--green": "#00e676",
        // neon green
        "--yellow": "#eeff41",
        // electric yellow
        "--red": "#ff1744",
        // neon red
        "--orange": "#ff6e40",
        // neon orange
        "--border": "#0d2040",
        // dark grid line
        "--bg-secondary": "#050510",
        "--bg-tertiary": "#080818",
        "--de-color": "#00e5ff",
        // neon cyan — DE panel accent
        "--dx-color": "#ff1744"
        // neon red — DX panel accent
      }
    },
    steampunk: {
      id: "steampunk",
      name: "Steampunk",
      description: "Brass, gears & gaslight",
      bodyClass: "theme-steampunk",
      supportsGrid: true,
      vars: {
        "--bg": "#1a1408",
        // dark aged wood
        "--surface": "#241c0e",
        // oiled mahogany
        "--surface2": "#3a2e18",
        // polished walnut
        "--surface3": "#4a3c22",
        // brass-touched panel
        "--accent": "#d4a04a",
        // polished brass
        "--text": "#e8d8b8",
        // aged parchment
        "--text-dim": "#8a7a5a",
        // faded ink
        "--green": "#6b8e23",
        // oxidized copper green
        "--yellow": "#daa520",
        // goldenrod
        "--red": "#b22222",
        // firebrick
        "--orange": "#cd853f",
        // peru — warm copper
        "--border": "#5a4a2a",
        // brass trim
        "--bg-secondary": "#1a1408",
        "--bg-tertiary": "#1e180c",
        "--de-color": "#d4a04a",
        // polished brass — DE panel accent
        "--dx-color": "#6b8e23"
        // oxidized copper — DX panel accent
      }
    }
  };
  var activeThemeId = localStorage.getItem(STORAGE_KEY) || "default";
  function getThemeList() {
    return Object.values(THEMES).map((t) => ({
      id: t.id,
      name: t.name,
      description: t.description
    }));
  }
  function getCurrentThemeId() {
    return activeThemeId;
  }
  function applyTheme(themeId) {
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
    Promise.resolve().then(() => (init_map_init(), map_init_exports)).then((m) => m.swapMapTiles(themeId)).catch(() => {
    });
  }
  function initTheme() {
    const savedId = localStorage.getItem(STORAGE_KEY) || "default";
    const themeId = THEMES[savedId] ? savedId : "default";
    applyTheme(themeId);
    if (localStorage.getItem("hamtab_slim_header") === "true") {
      document.body.classList.add("slim-header");
    }
    if (localStorage.getItem("hamtab_grayscale") === "true") {
      document.body.classList.add("grayscale");
    }
  }
  function currentThemeSupportsGrid() {
    const theme = THEMES[activeThemeId];
    return theme ? theme.supportsGrid !== false : true;
  }
  function getThemeSwatchColors(themeId) {
    const theme = THEMES[themeId];
    if (!theme) return [];
    return [
      theme.vars["--bg"],
      theme.vars["--surface2"],
      theme.vars["--accent"],
      theme.vars["--text"],
      theme.vars["--border"]
    ];
  }

  // src/main.js
  init_state();
  init_dom();
  init_solar();
  init_lunar();
  init_widgets();
  init_spots();
  init_map_init();
  init_widgets();

  // src/source.js
  init_state();
  init_dom();
  init_constants();
  init_utils();
  init_filters();
  init_spots();
  init_markers();
  function updateTableColumns() {
    const cols = SOURCE_DEFS[state_default.currentSource].columns.filter((c) => state_default.spotColumnVisibility[c.key] !== false);
    $("spotsHead").innerHTML = "<tr>" + cols.map((c) => `<th>${esc(c.label)}</th>`).join("") + "</tr>";
  }
  function updateFilterVisibility() {
    const allowed = SOURCE_DEFS[state_default.currentSource].filters;
    $("bandFilters").style.display = allowed.includes("band") ? "" : "none";
    $("modeFilters").style.display = allowed.includes("mode") ? "" : "none";
    const distWrap = $("distanceFilterWrap");
    const ageWrap = $("ageFilterWrap");
    if (distWrap) distWrap.style.display = allowed.includes("distance") ? "" : "none";
    if (ageWrap) ageWrap.style.display = allowed.includes("age") ? "" : "none";
    $("countryFilter").style.display = allowed.includes("country") ? "" : "none";
    $("stateFilter").style.display = allowed.includes("state") ? "" : "none";
    $("gridFilter").style.display = allowed.includes("grid") ? "" : "none";
    const continentFilter = $("continentFilter");
    if (continentFilter) continentFilter.style.display = allowed.includes("continent") ? "" : "none";
    const privLabel = document.querySelector(".priv-filter-label");
    if (privLabel) {
      if (!allowed.includes("privilege")) {
        privLabel.style.display = "none";
      } else {
        privLabel.style.display = "";
        updatePrivFilterVisibility();
      }
    }
  }
  function switchSource(source) {
    if (!SOURCE_DEFS[source]) source = "pota";
    state_default.currentSource = source;
    localStorage.setItem("hamtab_spot_source", source);
    $("sourceTabs").querySelectorAll(".source-tab").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.source === source);
    });
    updateTableColumns();
    updateFilterVisibility();
    loadFiltersForSource(source);
    const countryFilter = $("countryFilter");
    if (countryFilter) countryFilter.value = state_default.activeCountry || "";
    const stateFilter = $("stateFilter");
    if (stateFilter) stateFilter.value = state_default.activeState || "";
    const gridFilter = $("gridFilter");
    if (gridFilter) gridFilter.value = state_default.activeGrid || "";
    const continentFilter = $("continentFilter");
    if (continentFilter) continentFilter.value = state_default.activeContinent || "";
    const privFilterCheckbox = $("privFilter");
    if (privFilterCheckbox) privFilterCheckbox.checked = state_default.privilegeFilterEnabled;
    applyFilter();
    renderSpots();
    renderMarkers();
    updateAllFilterUI();
    updatePresetDropdown();
    updateDistanceAgeVisibility();
    renderWatchListEditor();
  }
  function initSourceListeners() {
    $("sourceTabs").querySelectorAll(".source-tab").forEach((btn) => {
      btn.addEventListener("mousedown", (e) => e.stopPropagation());
      btn.addEventListener("click", () => switchSource(btn.dataset.source));
    });
  }

  // src/main.js
  init_filters();

  // src/tooltip.js
  init_state();
  init_dom();
  init_utils();
  var callTooltip = document.createElement("div");
  callTooltip.className = "call-tooltip";
  document.body.appendChild(callTooltip);
  async function fetchCallsignInfo2(call) {
    if (!call) return null;
    const key = call.toUpperCase();
    if (state_default.callsignCache[key]) return state_default.callsignCache[key];
    if (state_default.callsignCache[key] === null) return null;
    try {
      const resp = await fetch(`/api/callsign/${encodeURIComponent(key)}`);
      if (!resp.ok) {
        cacheCallsign(key, null);
        return null;
      }
      const data = await resp.json();
      if (data.status !== "VALID") {
        cacheCallsign(key, null);
        return null;
      }
      cacheCallsign(key, data);
      return data;
    } catch {
      cacheCallsign(key, null);
      return null;
    }
  }
  function showCallTooltip(td, info) {
    let html = "";
    if (info.name) html += `<div class="call-tooltip-name">${esc(info.name)}</div>`;
    if (info.addr2) html += `<div class="call-tooltip-loc">${esc(info.addr2)}</div>`;
    if (info.class) html += `<div class="call-tooltip-class">${esc(info.class)}</div>`;
    if (info.grid) html += `<div class="call-tooltip-grid">${esc(info.grid)}</div>`;
    if (!html) {
      hideCallTooltip();
      return;
    }
    callTooltip.innerHTML = html;
    callTooltip.classList.add("visible");
    const rect = td.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 4;
    const ttWidth = callTooltip.offsetWidth;
    const ttHeight = callTooltip.offsetHeight;
    if (left + ttWidth > window.innerWidth) left = window.innerWidth - ttWidth - 4;
    if (top + ttHeight > window.innerHeight) top = rect.top - ttHeight - 4;
    callTooltip.style.left = left + "px";
    callTooltip.style.top = top + "px";
  }
  function hideCallTooltip() {
    callTooltip.classList.remove("visible");
  }
  function handleCallMouseEnter(e) {
    clearTimeout(state_default.tooltipHideTimer);
    const td = e.currentTarget;
    const call = td.textContent.trim();
    if (!call) return;
    const cached = state_default.callsignCache[call.toUpperCase()];
    if (cached) {
      showCallTooltip(td, cached);
    } else if (cached === void 0) {
      callTooltip.innerHTML = '<div class="call-tooltip-loading">Loading...</div>';
      callTooltip.classList.add("visible");
      const rect = td.getBoundingClientRect();
      callTooltip.style.left = rect.left + "px";
      callTooltip.style.top = rect.bottom + 4 + "px";
      fetchCallsignInfo2(call).then((info) => {
        if (callTooltip.classList.contains("visible")) {
          if (info) {
            showCallTooltip(td, info);
          } else {
            hideCallTooltip();
          }
        }
      });
    }
  }
  function handleCallMouseLeave() {
    state_default.tooltipHideTimer = setTimeout(hideCallTooltip, 150);
  }
  function initTooltipListeners() {
    const spotsBody = $("spotsBody");
    spotsBody.addEventListener("mouseover", (e) => {
      const td = e.target.closest("td.callsign");
      if (!td || td === state_default.currentHoverTd) return;
      state_default.currentHoverTd = td;
      handleCallMouseEnter({ currentTarget: td });
    });
    spotsBody.addEventListener("mouseout", (e) => {
      const td = e.target.closest("td.callsign");
      if (td && td === state_default.currentHoverTd) {
        const related = e.relatedTarget;
        if (!td.contains(related)) {
          state_default.currentHoverTd = null;
          handleCallMouseLeave();
        }
      }
    });
  }

  // src/splash.js
  init_state();
  init_dom();
  init_constants();
  init_utils();
  init_geo();
  init_map_init();

  // src/clocks.js
  init_state();
  init_dom();
  init_utils();
  init_geo();
  function updateDayNight() {
    const now = /* @__PURE__ */ new Date();
    if (state_default.myLat !== null && state_default.myLon !== null) {
      state_default.lastLocalDay = isDaytime(state_default.myLat, state_default.myLon, now);
    } else {
      state_default.lastLocalDay = null;
    }
    state_default.lastUtcDay = isDaytime(51.48, 0, now);
  }
  function updateClocks() {
    const now = /* @__PURE__ */ new Date();
    const localTime = fmtTime(now);
    const utcTime = fmtTime(now, { timeZone: "UTC" });
    $("clockLocalTime").textContent = localTime;
    $("clockUtcTime").textContent = utcTime;
    updateDayNight();
  }

  // src/splash.js
  init_spots();
  init_markers();

  // src/weather.js
  init_state();
  init_dom();
  init_utils();
  var wxBgClasses = ["wx-clear-day", "wx-clear-night", "wx-partly-cloudy-day", "wx-partly-cloudy-night", "wx-cloudy", "wx-rain", "wx-thunderstorm", "wx-snow", "wx-fog"];
  function useWU() {
    return state_default.wxStation && state_default.wxApiKey;
  }
  function isNwsCoverage2(lat, lon) {
    return lat >= 17.5 && lat <= 72 && lon >= -180 && lon <= -64;
  }
  function setWxSource(src) {
    const wxSourceLogo = $("wxSourceLogo");
    wxSourceLogo.classList.remove("hidden", "wx-src-wu", "wx-src-nws");
    if (src === "wu") {
      wxSourceLogo.textContent = "WU";
      wxSourceLogo.title = "Weather Underground";
      wxSourceLogo.classList.add("wx-src-wu");
    } else if (src === "nws") {
      wxSourceLogo.textContent = "NWS";
      wxSourceLogo.title = "National Weather Service";
      wxSourceLogo.classList.add("wx-src-nws");
    } else {
      wxSourceLogo.classList.add("hidden");
    }
  }
  function doFetchWeather() {
    if (useWU()) {
      const url = "/api/weather?station=" + encodeURIComponent(state_default.wxStation) + "&apikey=" + encodeURIComponent(state_default.wxApiKey);
      fetch(url).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
        const name = data.neighborhood || state_default.wxStation;
        const tempStr = data.temp != null ? data.temp + "\xB0F" : "";
        const cond = data.condition || "";
        const wind = (data.windDir || "") + " " + (data.windSpeed != null ? data.windSpeed + "mph" : "");
        const hum = data.humidity != null ? data.humidity + "%" : "";
        let line1 = [name, tempStr, cond].filter(Boolean).join("  ");
        let line2 = ["W: " + wind.trim(), hum ? "H: " + hum : ""].filter(Boolean).join("  ");
        $("clockLocalWeather").innerHTML = esc(line1) + "<br>" + esc(line2);
        setWxSource("wu");
      }).catch(() => {
        $("clockLocalWeather").textContent = "";
        setWxSource(null);
      });
    }
  }
  function fetchWeather() {
    if (state_default.weatherTimer) clearInterval(state_default.weatherTimer);
    doFetchWeather();
    state_default.weatherTimer = setInterval(doFetchWeather, 5 * 60 * 1e3);
  }
  function fetchNwsConditions() {
    if (state_default.myLat === null || state_default.myLon === null) return;
    if (!isNwsCoverage2(state_default.myLat, state_default.myLon)) return;
    const url = "/api/weather/conditions?lat=" + state_default.myLat + "&lon=" + state_default.myLon;
    fetch(url).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
      applyWeatherBackground(data.shortForecast, data.isDaytime);
      if (!useWU()) {
        let tempStr = "";
        if (data.temperature != null) {
          const apiUnit = data.temperatureUnit || "F";
          let temp = data.temperature;
          if (apiUnit !== state_default.temperatureUnit) {
            temp = apiUnit === "F" ? Math.round((temp - 32) * 5 / 9) : Math.round(temp * 9 / 5 + 32);
          }
          tempStr = temp + "\xB0" + state_default.temperatureUnit;
        }
        const cond = data.shortForecast || "";
        const wind = data.windDirection && data.windSpeed ? data.windDirection + " " + data.windSpeed : "";
        const hum = data.relativeHumidity != null ? data.relativeHumidity + "%" : "";
        let line1 = [tempStr, cond].filter(Boolean).join("  ");
        let line2 = [wind ? "W: " + wind : "", hum ? "H: " + hum : ""].filter(Boolean).join("  ");
        $("clockLocalWeather").innerHTML = esc(line1) + (line2 ? "<br>" + esc(line2) : "");
        setWxSource("nws");
      }
    }).catch((err) => {
      console.warn("NWS conditions fetch failed:", err);
    });
  }
  var wxIcons = {
    "wx-clear-day": "\u2600\uFE0F",
    "wx-clear-night": "\u{1F319}",
    "wx-partly-cloudy-day": "\u26C5",
    "wx-partly-cloudy-night": "\u2601\uFE0F",
    "wx-cloudy": "\u2601\uFE0F",
    "wx-rain": "\u{1F327}\uFE0F",
    "wx-thunderstorm": "\u26C8\uFE0F",
    "wx-snow": "\u2744\uFE0F",
    "wx-fog": "\u{1F32B}\uFE0F"
  };
  function applyWeatherBackground(forecast, isDaytime2) {
    const headerClock = $("headerClockLocal");
    const wxIcon = $("clockWxIcon");
    if (!headerClock) return;
    wxBgClasses.forEach((c) => headerClock.classList.remove(c));
    if (!forecast) {
      if (wxIcon) wxIcon.textContent = "";
      return;
    }
    const fc = forecast.toLowerCase();
    let cls = "";
    if (/thunder|t-storm/.test(fc)) cls = "wx-thunderstorm";
    else if (/snow|flurr|blizzard|sleet|ice/.test(fc)) cls = "wx-snow";
    else if (/rain|drizzle|shower/.test(fc)) cls = "wx-rain";
    else if (/fog|haze|mist/.test(fc)) cls = "wx-fog";
    else if (/cloudy|overcast/.test(fc)) {
      if (/partly|mostly sunny/.test(fc)) cls = isDaytime2 ? "wx-partly-cloudy-day" : "wx-partly-cloudy-night";
      else cls = "wx-cloudy";
    } else if (/sunny|clear/.test(fc)) cls = isDaytime2 ? "wx-clear-day" : "wx-clear-night";
    if (cls) {
      if (!state_default.disableWxBackgrounds) headerClock.classList.add(cls);
      if (wxIcon) wxIcon.textContent = wxIcons[cls] || "";
    }
  }
  function fetchNwsAlerts() {
    if (state_default.myLat === null || state_default.myLon === null) return;
    if (!isNwsCoverage2(state_default.myLat, state_default.myLon)) return;
    const url = "/api/weather/alerts?lat=" + state_default.myLat + "&lon=" + state_default.myLon;
    fetch(url).then((r) => r.ok ? r.json() : Promise.reject()).then((alerts) => {
      state_default.nwsAlerts = alerts;
      updateAlertBadge();
    }).catch(() => {
      state_default.nwsAlerts = [];
      updateAlertBadge();
    });
  }
  function updateAlertBadge() {
    const wxAlertBadge = $("wxAlertBadge");
    if (!state_default.nwsAlerts.length) {
      wxAlertBadge.classList.add("hidden");
      return;
    }
    wxAlertBadge.classList.remove("hidden");
    const sevOrder = ["Extreme", "Severe", "Moderate", "Minor", "Unknown"];
    let highest = "Minor";
    for (const a of state_default.nwsAlerts) {
      if (sevOrder.indexOf(a.severity) < sevOrder.indexOf(highest)) highest = a.severity;
    }
    wxAlertBadge.className = "wx-alert-badge wx-alert-" + highest.toLowerCase();
  }
  function startNwsPolling() {
    if (state_default.nwsCondTimer) clearInterval(state_default.nwsCondTimer);
    if (state_default.nwsAlertTimer) clearInterval(state_default.nwsAlertTimer);
    fetchNwsConditions();
    fetchNwsAlerts();
    state_default.nwsCondTimer = setInterval(fetchNwsConditions, 15 * 60 * 1e3);
    state_default.nwsAlertTimer = setInterval(fetchNwsAlerts, 5 * 60 * 1e3);
  }
  function initWeatherListeners() {
    $("wxAlertBadge").addEventListener("click", () => {
      const wxAlertList = $("wxAlertList");
      wxAlertList.innerHTML = "";
      for (const a of state_default.nwsAlerts) {
        const div = document.createElement("div");
        div.className = "wx-alert-item";
        div.innerHTML = '<div class="wx-alert-event wx-sev-' + (a.severity || "Unknown") + '">' + esc(a.event) + " (" + esc(a.severity) + ')</div><div class="wx-alert-headline">' + esc(a.headline || "") + '</div><div class="wx-alert-desc">' + esc(a.description || "") + "</div>" + (a.web && /^https?:\/\//.test(a.web) ? '<div class="wx-alert-link"><a href="' + esc(a.web) + '" target="_blank" rel="noopener">View on NWS website</a></div>' : "");
        wxAlertList.appendChild(div);
      }
      $("wxAlertSplash").classList.remove("hidden");
    });
    $("wxAlertClose").addEventListener("click", () => {
      $("wxAlertSplash").classList.add("hidden");
    });
  }

  // src/splash.js
  init_filters();
  init_widgets();
  init_constants();
  init_grid_layout();

  // src/refresh.js
  init_state();
  init_dom();
  init_constants();
  init_filters();
  init_spots();
  init_markers();
  init_solar();
  init_lunar();
  init_voacap();

  // src/spacewx-graphs.js
  init_state();
  function initSpaceWxListeners() {
    const tabs = document.querySelectorAll(".spacewx-tab");
    tabs.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        btn.classList.add("active");
        state_default.spacewxTab = btn.dataset.tab;
        renderSpaceWxGraph();
      });
    });
    const widget = document.getElementById("widget-spacewx");
    if (widget && window.ResizeObserver) {
      new ResizeObserver(() => renderSpaceWxGraph()).observe(widget);
    }
  }
  async function fetchSpaceWxData() {
    const types = ["kp", "xray", "sfi", "wind", "mag"];
    try {
      const results = await Promise.all(
        types.map(
          (t) => fetch(`/api/spacewx/history?type=${t}`).then((r) => r.ok ? r.json() : []).catch(() => [])
        )
      );
      state_default.spacewxData = {};
      types.forEach((t, i) => {
        state_default.spacewxData[t] = results[i];
      });
      renderSpaceWxGraph();
    } catch (err) {
      if (state_default.debug) console.error("Failed to fetch space weather data:", err);
    }
  }
  var PAD = { top: 12, right: 12, bottom: 30, left: 52 };
  function renderSpaceWxGraph() {
    const canvas = document.getElementById("spacewxCanvas");
    if (!canvas) return;
    const body = canvas.parentElement;
    if (!body) return;
    const w = body.clientWidth;
    const h = body.clientHeight;
    if (w < 10 || h < 10) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + "px";
    canvas.style.height = h + "px";
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, w, h);
    const tab = state_default.spacewxTab || "kp";
    const dataKey = tab === "bz" ? "mag" : tab;
    const data = state_default.spacewxData && state_default.spacewxData[dataKey];
    if (!data || data.length === 0) {
      drawNoData(ctx, w, h);
      return;
    }
    const bounds = {
      x: PAD.left,
      y: PAD.top,
      w: w - PAD.left - PAD.right,
      h: h - PAD.top - PAD.bottom
    };
    switch (tab) {
      case "kp":
        drawKpGraph(ctx, bounds, data);
        break;
      case "xray":
        drawXrayGraph(ctx, bounds, data);
        break;
      case "sfi":
        drawSfiGraph(ctx, bounds, data);
        break;
      case "wind":
        drawWindGraph(ctx, bounds, data);
        break;
      case "bz":
        drawBzGraph(ctx, bounds, data);
        break;
    }
  }
  function drawNoData(ctx, w, h) {
    ctx.fillStyle = getStyle("--text-dim") || "#8899aa";
    ctx.font = "12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Loading space weather data...", w / 2, h / 2);
  }
  function getStyle(prop) {
    return getComputedStyle(document.documentElement).getPropertyValue(prop).trim();
  }
  function colorGreen() {
    return getStyle("--green") || "#00c853";
  }
  function colorYellow() {
    return getStyle("--yellow") || "#ffd600";
  }
  function colorRed() {
    return getStyle("--red") || "#ff1744";
  }
  function colorAccent() {
    return getStyle("--accent") || "#e94560";
  }
  function colorDim() {
    return getStyle("--text-dim") || "#8899aa";
  }
  function colorText() {
    return getStyle("--text") || "#e0e0e0";
  }
  function colorGrid() {
    return getStyle("--border") || "#2a3a5e";
  }
  function drawGridLines(ctx, bounds, yMin, yMax, ticks) {
    ctx.strokeStyle = colorGrid();
    ctx.lineWidth = 0.5;
    for (const val of ticks) {
      const y = bounds.y + bounds.h - (val - yMin) / (yMax - yMin) * bounds.h;
      ctx.beginPath();
      ctx.moveTo(bounds.x, y);
      ctx.lineTo(bounds.x + bounds.w, y);
      ctx.stroke();
    }
  }
  function drawYLabels(ctx, bounds, yMin, yMax, ticks, formatFn) {
    ctx.fillStyle = colorDim();
    ctx.font = "10px sans-serif";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (const val of ticks) {
      const y = bounds.y + bounds.h - (val - yMin) / (yMax - yMin) * bounds.h;
      ctx.fillText(formatFn ? formatFn(val) : String(val), bounds.x - 4, y);
    }
  }
  function drawTimeAxis(ctx, bounds, data) {
    if (data.length < 2) return;
    const times = data.map((d) => (/* @__PURE__ */ new Date(d.time_tag + (d.time_tag.includes("Z") ? "" : "Z"))).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const range = tMax - tMin;
    if (range <= 0) return;
    const maxLabels = Math.max(3, Math.floor(bounds.w / 60));
    const step = Math.ceil(data.length / maxLabels);
    ctx.fillStyle = colorDim();
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    for (let i = 0; i < data.length; i += step) {
      const t = /* @__PURE__ */ new Date(data[i].time_tag + (data[i].time_tag.includes("Z") ? "" : "Z"));
      const x = bounds.x + (times[i] - tMin) / range * bounds.w;
      let label;
      if (range > 3 * 24 * 60 * 60 * 1e3) {
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        label = months[t.getUTCMonth()] + " " + t.getUTCDate();
      } else {
        label = String(t.getUTCHours()).padStart(2, "0") + ":" + String(t.getUTCMinutes()).padStart(2, "0");
      }
      ctx.fillText(label, x, bounds.y + bounds.h + 4);
    }
  }
  function drawThreshold(ctx, bounds, yMin, yMax, yVal, label, color) {
    const y = bounds.y + bounds.h - (yVal - yMin) / (yMax - yMin) * bounds.h;
    if (y < bounds.y || y > bounds.y + bounds.h) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(bounds.x, y);
    ctx.lineTo(bounds.x + bounds.w, y);
    ctx.stroke();
    ctx.setLineDash([]);
    if (label) {
      ctx.fillStyle = color;
      ctx.font = "9px sans-serif";
      ctx.textAlign = "right";
      ctx.textBaseline = "bottom";
      ctx.fillText(label, bounds.x + bounds.w, y - 2);
    }
  }
  function drawLine(ctx, bounds, data, yMin, yMax, color, keyFn) {
    if (data.length < 2) return;
    const times = data.map((d) => (/* @__PURE__ */ new Date(d.time_tag + (d.time_tag.includes("Z") ? "" : "Z"))).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const range = tMax - tMin;
    if (range <= 0) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    let started = false;
    for (let i = 0; i < data.length; i++) {
      const val = keyFn ? keyFn(data[i]) : data[i].value;
      if (val === null || val === void 0 || isNaN(val)) continue;
      const x = bounds.x + (times[i] - tMin) / range * bounds.w;
      const y = bounds.y + bounds.h - (val - yMin) / (yMax - yMin) * bounds.h;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  function drawTitle(ctx, bounds, text) {
    ctx.fillStyle = colorText();
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, bounds.x, 1);
  }
  function drawAxesBorder(ctx, bounds) {
    ctx.strokeStyle = colorDim();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(bounds.x, bounds.y);
    ctx.lineTo(bounds.x, bounds.y + bounds.h);
    ctx.lineTo(bounds.x + bounds.w, bounds.y + bounds.h);
    ctx.stroke();
  }
  function kpBarColor(val) {
    if (val <= 3) return colorGreen();
    if (val <= 4) return colorYellow();
    return colorRed();
  }
  function drawKpGraph(ctx, bounds, data) {
    drawTitle(ctx, bounds, "Kp Index \u2014 7 Days");
    const yMin = 0;
    const yMax = 9;
    const ticks = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    drawGridLines(ctx, bounds, yMin, yMax, ticks);
    drawAxesBorder(ctx, bounds);
    drawYLabels(ctx, bounds, yMin, yMax, ticks);
    drawTimeAxis(ctx, bounds, data);
    drawThreshold(ctx, bounds, yMin, yMax, 4, "Storm", colorYellow());
    drawThreshold(ctx, bounds, yMin, yMax, 7, "Severe", colorRed());
    const barW = Math.max(2, bounds.w / data.length - 1);
    const times = data.map((d) => (/* @__PURE__ */ new Date(d.time_tag + (d.time_tag.includes("Z") ? "" : "Z"))).getTime());
    const tMin = times[0];
    const tMax = times[times.length - 1];
    const range = tMax - tMin || 1;
    for (let i = 0; i < data.length; i++) {
      const val = data[i].value;
      if (isNaN(val)) continue;
      const x = bounds.x + (times[i] - tMin) / range * bounds.w - barW / 2;
      const barH = val / yMax * bounds.h;
      const y = bounds.y + bounds.h - barH;
      ctx.fillStyle = kpBarColor(val);
      ctx.fillRect(x, y, barW, barH);
    }
  }
  function drawXrayGraph(ctx, bounds, data) {
    drawTitle(ctx, bounds, "X-Ray Flux \u2014 7 Days");
    const logMin = -9;
    const logMax = -3;
    const classes = [
      { val: 1e-8, label: "A" },
      { val: 1e-7, label: "B" },
      { val: 1e-6, label: "C" },
      { val: 1e-5, label: "M" },
      { val: 1e-4, label: "X" }
    ];
    const ticks = [-9, -8, -7, -6, -5, -4, -3];
    drawGridLines(ctx, bounds, logMin, logMax, ticks);
    drawAxesBorder(ctx, bounds);
    drawYLabels(ctx, bounds, logMin, logMax, ticks, (v) => "1e" + v);
    drawTimeAxis(ctx, bounds, data);
    for (const cls of classes) {
      const logVal = Math.log10(cls.val);
      drawThreshold(ctx, bounds, logMin, logMax, logVal, cls.label, colorDim());
    }
    drawLine(ctx, bounds, data, logMin, logMax, "#00e5ff", (d) => {
      const v = d.value;
      if (v <= 0) return null;
      const log = Math.log10(v);
      return Math.max(logMin, Math.min(logMax, log));
    });
  }
  function drawSfiGraph(ctx, bounds, data) {
    drawTitle(ctx, bounds, "Solar Flux Index \u2014 90 Days");
    const vals = data.map((d) => d.value).filter((v) => !isNaN(v));
    const dataMin = Math.min(...vals);
    const dataMax = Math.max(...vals);
    const padding = (dataMax - dataMin) * 0.1 || 10;
    const yMin = Math.floor(dataMin - padding);
    const yMax = Math.ceil(dataMax + padding);
    const tickStep = Math.ceil((yMax - yMin) / 8);
    const ticks = [];
    for (let v = Math.ceil(yMin / tickStep) * tickStep; v <= yMax; v += tickStep) ticks.push(v);
    drawGridLines(ctx, bounds, yMin, yMax, ticks);
    drawAxesBorder(ctx, bounds);
    drawYLabels(ctx, bounds, yMin, yMax, ticks);
    drawTimeAxis(ctx, bounds, data);
    drawThreshold(ctx, bounds, yMin, yMax, 100, "Good", colorYellow());
    drawThreshold(ctx, bounds, yMin, yMax, 150, "Excellent", colorGreen());
    drawLine(ctx, bounds, data, yMin, yMax, colorAccent());
  }
  function drawWindGraph(ctx, bounds, data) {
    drawTitle(ctx, bounds, "Solar Wind Speed \u2014 7 Days");
    const vals = data.map((d) => d.value).filter((v) => !isNaN(v));
    const yMin = 0;
    const yMax = Math.max(800, Math.ceil(Math.max(...vals) * 1.1));
    const ticks = [];
    for (let v = 0; v <= yMax; v += 100) ticks.push(v);
    drawGridLines(ctx, bounds, yMin, yMax, ticks);
    drawAxesBorder(ctx, bounds);
    drawYLabels(ctx, bounds, yMin, yMax, ticks, (v) => v + "");
    drawTimeAxis(ctx, bounds, data);
    drawThreshold(ctx, bounds, yMin, yMax, 400, "400 km/s", colorYellow());
    drawThreshold(ctx, bounds, yMin, yMax, 600, "600 km/s", colorRed());
    if (data.length >= 2) {
      const times = data.map((d) => (/* @__PURE__ */ new Date(d.time_tag + (d.time_tag.includes("Z") ? "" : "Z"))).getTime());
      const tMin = times[0];
      const tMax = times[times.length - 1];
      const range = tMax - tMin || 1;
      ctx.lineWidth = 1.5;
      for (let i = 1; i < data.length; i++) {
        const v0 = data[i - 1].value;
        const v1 = data[i].value;
        if (isNaN(v0) || isNaN(v1)) continue;
        const avg = (v0 + v1) / 2;
        ctx.strokeStyle = avg < 400 ? colorGreen() : avg < 600 ? colorYellow() : colorRed();
        const x0 = bounds.x + (times[i - 1] - tMin) / range * bounds.w;
        const y0 = bounds.y + bounds.h - (v0 - yMin) / (yMax - yMin) * bounds.h;
        const x1 = bounds.x + (times[i] - tMin) / range * bounds.w;
        const y1 = bounds.y + bounds.h - (v1 - yMin) / (yMax - yMin) * bounds.h;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }
  }
  function drawBzGraph(ctx, bounds, data) {
    drawTitle(ctx, bounds, "Bz (IMF) & Bt \u2014 7 Days");
    const bzVals = data.map((d) => d.value).filter((v) => !isNaN(v));
    const btVals = data.map((d) => d.value2).filter((v) => v !== void 0 && !isNaN(v));
    const allVals = bzVals.concat(btVals);
    const absMax = Math.max(20, Math.ceil(Math.max(...allVals.map(Math.abs)) * 1.2));
    const yMin = -absMax;
    const yMax = absMax;
    const tickStep = Math.ceil(absMax / 4);
    const ticks = [];
    for (let v = -absMax; v <= absMax; v += tickStep) ticks.push(v);
    drawGridLines(ctx, bounds, yMin, yMax, ticks);
    drawAxesBorder(ctx, bounds);
    drawYLabels(ctx, bounds, yMin, yMax, ticks, (v) => v + " nT");
    drawTimeAxis(ctx, bounds, data);
    drawThreshold(ctx, bounds, yMin, yMax, 0, "0", colorDim());
    if (btVals.length > 0) {
      drawLine(ctx, bounds, data, yMin, yMax, colorGrid(), (d) => {
        const v = d.value2;
        return v !== void 0 && !isNaN(v) ? v : null;
      });
    }
    if (data.length >= 2) {
      const times = data.map((d) => (/* @__PURE__ */ new Date(d.time_tag + (d.time_tag.includes("Z") ? "" : "Z"))).getTime());
      const tMin = times[0];
      const tMax = times[times.length - 1];
      const range = tMax - tMin || 1;
      ctx.lineWidth = 1.5;
      for (let i = 1; i < data.length; i++) {
        const v0 = data[i - 1].value;
        const v1 = data[i].value;
        if (isNaN(v0) || isNaN(v1)) continue;
        const avg = (v0 + v1) / 2;
        ctx.strokeStyle = avg >= 0 ? colorGreen() : colorRed();
        const x0 = bounds.x + (times[i - 1] - tMin) / range * bounds.w;
        const y0 = bounds.y + bounds.h - (v0 - yMin) / (yMax - yMin) * bounds.h;
        const x1 = bounds.x + (times[i] - tMin) / range * bounds.w;
        const y1 = bounds.y + bounds.h - (v1 - yMin) / (yMax - yMin) * bounds.h;
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.stroke();
      }
    }
  }

  // src/dxpeditions.js
  init_state();
  init_dom();
  var TIME_FILTER_MS = {
    active: 0,
    // special case — only items where active === true
    "7d": 7 * 24 * 60 * 60 * 1e3,
    "30d": 30 * 24 * 60 * 60 * 1e3,
    "180d": 180 * 24 * 60 * 60 * 1e3,
    all: Infinity
  };
  function filterByTime(data) {
    const filter = state_default.dxpedTimeFilter || "all";
    if (filter === "all") return data;
    if (filter === "active") return data.filter((d) => d.active);
    const cutoff = TIME_FILTER_MS[filter];
    if (!cutoff) return data;
    const now = Date.now();
    return data.filter((d) => {
      if (d.active) return true;
      if (d.startDate) {
        const start = new Date(d.startDate).getTime();
        return start - now <= cutoff;
      }
      return false;
    });
  }
  function saveHiddenDxpeditions() {
    localStorage.setItem("hamtab_dxped_hidden", JSON.stringify([...state_default.hiddenDxpeditions]));
  }
  function hideDxpedition(callsign) {
    state_default.hiddenDxpeditions.add(callsign);
    saveHiddenDxpeditions();
    renderDxpeditions();
  }
  function unhideAllDxpeditions() {
    state_default.hiddenDxpeditions.clear();
    saveHiddenDxpeditions();
    renderDxpeditions();
  }
  function initDxpeditionListeners() {
    const list = $("dxpedList");
    if (!list) return;
    list.addEventListener("click", (e) => {
      if (e.target.closest(".dxped-hide-btn")) return;
      if (e.target.closest(".dxped-unhide-btn")) return;
      const card = e.target.closest(".dxped-card");
      if (!card) return;
      const url = card.dataset.link;
      if (url) window.open(url, "_blank", "noopener");
    });
    const filterSel = $("dxpedTimeFilter");
    if (filterSel) {
      filterSel.value = state_default.dxpedTimeFilter;
      filterSel.addEventListener("change", () => {
        state_default.dxpedTimeFilter = filterSel.value;
        localStorage.setItem("hamtab_dxped_time_filter", filterSel.value);
        renderDxpeditions();
      });
      filterSel.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
    }
  }
  async function fetchDxpeditions() {
    try {
      const resp = await fetch("/api/dxpeditions");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      state_default.lastDxpeditionData = await resp.json();
      renderDxpeditions();
    } catch (err) {
      if (state_default.debug) console.error("Failed to fetch DXpeditions:", err);
    }
  }
  function renderDxpeditions() {
    const list = $("dxpedList");
    const countEl = $("dxpeditionCount");
    if (!list) return;
    const data = state_default.lastDxpeditionData;
    if (!Array.isArray(data) || data.length === 0) {
      list.textContent = "";
      const empty = document.createElement("div");
      empty.className = "dxped-empty";
      empty.textContent = "No DXpeditions found";
      list.appendChild(empty);
      if (countEl) countEl.textContent = "";
      updateDxpeditionMarkers([]);
      return;
    }
    const timeFiltered = filterByTime(data);
    const hiddenCount = timeFiltered.filter((d) => state_default.hiddenDxpeditions.has(d.callsign)).length;
    const filtered = timeFiltered.filter((d) => !state_default.hiddenDxpeditions.has(d.callsign));
    if (countEl) countEl.textContent = filtered.length;
    list.textContent = "";
    if (filtered.length === 0 && hiddenCount === 0) {
      const empty = document.createElement("div");
      empty.className = "dxped-empty";
      empty.textContent = "No DXpeditions match the selected time filter";
      list.appendChild(empty);
      updateDxpeditionMarkers([]);
      return;
    }
    for (const dx of filtered) {
      const card = document.createElement("div");
      card.className = "dxped-card";
      if (dx.active) card.classList.add("dxped-active-card");
      if (dx.link) card.dataset.link = dx.link;
      const header = document.createElement("div");
      header.className = "dxped-header";
      const call = document.createElement("span");
      call.className = "dxped-call";
      call.textContent = dx.callsign || "??";
      header.appendChild(call);
      const entity = document.createElement("span");
      entity.className = "dxped-entity";
      entity.textContent = dx.entity || "";
      header.appendChild(entity);
      if (dx.active) {
        const badge = document.createElement("span");
        badge.className = "dxped-badge";
        badge.textContent = "ACTIVE";
        header.appendChild(badge);
      }
      const hideBtn = document.createElement("button");
      hideBtn.className = "dxped-hide-btn";
      hideBtn.title = "Hide this DXpedition";
      hideBtn.textContent = "\xD7";
      hideBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        hideDxpedition(dx.callsign);
      });
      header.appendChild(hideBtn);
      card.appendChild(header);
      const detail = document.createElement("div");
      detail.className = "dxped-detail";
      const parts = [];
      if (dx.dateStr) parts.push(dx.dateStr);
      if (dx.qsl) parts.push("QSL: " + dx.qsl);
      detail.textContent = parts.join("  \xB7  ");
      card.appendChild(detail);
      list.appendChild(card);
    }
    if (hiddenCount > 0) {
      const unhideRow = document.createElement("div");
      unhideRow.className = "dxped-unhide-row";
      const btn = document.createElement("button");
      btn.className = "dxped-unhide-btn";
      btn.textContent = `Show ${hiddenCount} hidden`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        unhideAllDxpeditions();
      });
      unhideRow.appendChild(btn);
      list.appendChild(unhideRow);
    }
    updateDxpeditionMarkers(filtered);
  }
  function updateDxpeditionMarkers(data) {
    if (!state_default.map || typeof L === "undefined") return;
    for (const m of state_default.dxpedMarkers) {
      state_default.map.removeLayer(m);
    }
    state_default.dxpedMarkers = [];
    if (!Array.isArray(data)) return;
    if (!state_default.mapOverlays.dxpedMarkers) return;
    for (const dx of data) {
      if (dx.lat == null || dx.lon == null) continue;
      const isActive = !!dx.active;
      const marker = L.circleMarker([dx.lat, dx.lon], {
        radius: isActive ? 6 : 4,
        color: isActive ? "#ff9800" : "#9e6b00",
        // orange outline
        fillColor: isActive ? "#ff9800" : "#9e6b00",
        fillOpacity: isActive ? 0.8 : 0.4,
        weight: isActive ? 2 : 1,
        interactive: true
      }).addTo(state_default.map);
      const lines = [dx.callsign || "??"];
      if (dx.entity) lines.push(dx.entity);
      if (dx.dateStr) lines.push(dx.dateStr);
      if (isActive) lines.push("ACTIVE NOW");
      marker.bindTooltip(lines.join("\n"));
      state_default.dxpedMarkers.push(marker);
    }
  }

  // src/contests.js
  init_state();
  init_dom();
  function initContestListeners() {
    const list = $("contestList");
    if (!list) return;
    list.addEventListener("click", (e) => {
      const card = e.target.closest(".contest-card");
      if (!card) return;
      const url = card.dataset.link;
      if (url) window.open(url, "_blank", "noopener");
    });
  }
  async function fetchContests() {
    try {
      const resp = await fetch("/api/contests");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      state_default.lastContestData = await resp.json();
      renderContests();
    } catch (err) {
      if (state_default.debug) console.error("Failed to fetch contests:", err);
    }
  }
  var SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  function fmtContestRange(startISO, endISO) {
    const s = new Date(startISO);
    const e = new Date(endISO);
    if (isNaN(s) || isNaN(e)) return "";
    const fmt = (d) => {
      const day = SHORT_DAYS[d.getUTCDay()];
      const mon = SHORT_MONTHS[d.getUTCMonth()];
      const date = d.getUTCDate();
      const hh = String(d.getUTCHours()).padStart(2, "0");
      const mm = String(d.getUTCMinutes()).padStart(2, "0");
      return `${day} ${mon} ${date}, ${hh}:${mm}z`;
    };
    return `${fmt(s)} \u2013 ${fmt(e)}`;
  }
  function renderContests() {
    const list = $("contestList");
    const countEl = $("contestCount");
    if (!list) return;
    const data = state_default.lastContestData;
    if (!Array.isArray(data) || data.length === 0) {
      list.textContent = "";
      const empty = document.createElement("div");
      empty.className = "contest-empty";
      empty.textContent = "No upcoming contests found";
      list.appendChild(empty);
      if (countEl) countEl.textContent = "";
      return;
    }
    const now = Date.now();
    const visible = [];
    for (const c of data) {
      const start = c.startDate ? new Date(c.startDate).getTime() : null;
      const end = c.endDate ? new Date(c.endDate).getTime() : null;
      if (end && now > end) continue;
      const isActive = start && end && now >= start && now <= end;
      visible.push({ ...c, _active: isActive });
    }
    if (visible.length === 0) {
      list.textContent = "";
      const empty = document.createElement("div");
      empty.className = "contest-empty";
      empty.textContent = "No upcoming contests found";
      list.appendChild(empty);
      if (countEl) countEl.textContent = "";
      return;
    }
    visible.sort((a, b) => {
      if (a._active !== b._active) return a._active ? -1 : 1;
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aDate - bDate;
    });
    if (countEl) countEl.textContent = visible.length;
    list.textContent = "";
    for (const c of visible) {
      const card = document.createElement("div");
      card.className = "contest-card";
      if (c._active) card.classList.add("contest-active-card");
      if (c.link) card.dataset.link = c.link;
      const header = document.createElement("div");
      header.className = "contest-header";
      const name = document.createElement("span");
      name.className = "contest-name";
      name.textContent = c.name || "??";
      header.appendChild(name);
      if (c.mode && c.mode !== "mixed") {
        const modeBadge = document.createElement("span");
        modeBadge.className = "contest-mode contest-mode-" + c.mode;
        modeBadge.textContent = c.mode.toUpperCase();
        header.appendChild(modeBadge);
      }
      if (c._active) {
        const badge = document.createElement("span");
        badge.className = "contest-now-badge";
        badge.textContent = "NOW";
        header.appendChild(badge);
      }
      card.appendChild(header);
      const detail = document.createElement("div");
      detail.className = "contest-detail";
      if (c.startDate && c.endDate) {
        detail.textContent = fmtContestRange(c.startDate, c.endDate);
      } else {
        detail.textContent = c.dateStr || "";
      }
      card.appendChild(detail);
      list.appendChild(card);
    }
  }

  // src/refresh.js
  init_widgets();
  async function fetchSourceData(source) {
    const def = SOURCE_DEFS[source];
    if (!def) return;
    try {
      const resp = await fetch(def.endpoint);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let data = await resp.json();
      if (source === "pota") {
        data = (Array.isArray(data) ? data : []).map((s) => {
          if (!s.callsign && s.activator) s.callsign = s.activator;
          return s;
        });
      }
      state_default.sourceData[source] = Array.isArray(data) ? data : [];
      if (source === state_default.currentSource) {
        applyFilter();
        renderSpots();
        renderMarkers();
        updateBandFilterButtons();
        updateModeFilterButtons();
        updateCountryFilter();
        updateStateFilter();
        updateGridFilter();
        updateContinentFilter();
      }
    } catch (err) {
      console.error(`Failed to fetch ${source} spots:`, err);
    }
  }
  function refreshAll() {
    const btn = $("refreshBtn");
    if (btn) btn.textContent = "Refreshing...";
    fetchSourceData("pota");
    fetchSourceData("sota");
    fetchSourceData("dxc");
    fetchSourceData("wwff");
    fetchSourceData("psk");
    if (isWidgetVisible("widget-solar") || isWidgetVisible("widget-propagation") || isWidgetVisible("widget-voacap")) fetchSolar();
    if (isWidgetVisible("widget-lunar")) fetchLunar();
    fetchPropagation();
    if (isWidgetVisible("widget-voacap") || state_default.hfPropOverlayBand) fetchVoacapMatrixThrottled();
    if (isWidgetVisible("widget-spacewx")) fetchSpaceWxData();
    if (isWidgetVisible("widget-dxpeditions") || state_default.mapOverlays.dxpedMarkers) fetchDxpeditions();
    if (isWidgetVisible("widget-contests")) fetchContests();
    resetCountdown();
  }
  function resetCountdown() {
    state_default.countdownSeconds = 60;
    updateCountdownDisplay();
  }
  function updateCountdownDisplay() {
    const btn = $("refreshBtn");
    if (!btn) return;
    if (state_default.autoRefreshEnabled) {
      btn.textContent = "Refresh (" + state_default.countdownSeconds + "s)";
    } else {
      btn.textContent = "Refresh";
    }
  }
  function startAutoRefresh() {
    stopAutoRefresh();
    state_default.autoRefreshEnabled = true;
    localStorage.setItem("hamtab_auto_refresh", "true");
    resetCountdown();
    state_default.countdownTimer = setInterval(() => {
      state_default.countdownSeconds--;
      if (state_default.countdownSeconds <= 0) {
        refreshAll();
      }
      updateCountdownDisplay();
    }, 1e3);
  }
  function stopAutoRefresh() {
    state_default.autoRefreshEnabled = false;
    localStorage.setItem("hamtab_auto_refresh", "false");
    if (state_default.countdownTimer) {
      clearInterval(state_default.countdownTimer);
      state_default.countdownTimer = null;
    }
    const btn = $("refreshBtn");
    if (btn) btn.textContent = "Refresh";
  }
  function initRefreshListeners() {
    $("refreshBtn").addEventListener("click", () => {
      refreshAll();
    });
  }

  // src/satellites.js
  init_state();
  init_dom();
  init_constants();
  init_utils();
  var EARTH_RADIUS_KM = 6371;
  var SPEED_OF_LIGHT_KM_S = 299792.458;
  var DEFAULT_SAT_ALT_KM = 400;
  function initSatellites() {
    initSatelliteListeners();
    fetchIssPosition();
    if (state_default.n2yoApiKey) {
      fetchSatellitePositions();
    }
  }
  function initSatelliteListeners() {
    const cfgBtn = $("satCfgBtn");
    if (cfgBtn) {
      cfgBtn.addEventListener("click", showSatelliteConfig);
    }
    const cfgOk = $("satCfgOk");
    if (cfgOk) {
      cfgOk.addEventListener("click", dismissSatelliteConfig);
    }
    const splash = $("satCfgSplash");
    if (splash) {
      splash.addEventListener("click", (e) => {
        if (e.target === splash) dismissSatelliteConfig();
      });
    }
  }
  async function fetchIssPosition() {
    try {
      const lat = state_default.myLat ?? 0;
      const lon = state_default.myLon ?? 0;
      const resp = await fetch(`/api/iss/position?lat=${lat}&lon=${lon}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.satellites.positions["25544"] = {
        satId: 25544,
        name: data.name,
        lat: data.lat,
        lon: data.lon,
        alt: data.alt,
        azimuth: data.azimuth,
        elevation: data.elevation,
        timestamp: data.timestamp,
        tleEpoch: data.tleEpoch || null
      };
      state_default.satellites.issOrbitPath = data.orbitPath || [];
      updateSatelliteMarkers();
      updateIssOrbitLine();
      renderSatelliteWidget();
    } catch (err) {
      if (state_default.debug) console.error("Failed to fetch ISS position:", err);
    }
  }
  function splitAtDateline(points) {
    const segments = [[]];
    for (let i = 0; i < points.length; i++) {
      segments[segments.length - 1].push([points[i].lat, points[i].lon]);
      if (i < points.length - 1) {
        if (Math.abs(points[i + 1].lon - points[i].lon) > 180) {
          segments.push([]);
        }
      }
    }
    return segments;
  }
  function updateIssOrbitLine() {
    if (!state_default.map) return;
    if (state_default.satellites.orbitLines["25544"]) {
      state_default.map.removeLayer(state_default.satellites.orbitLines["25544"]);
      delete state_default.satellites.orbitLines["25544"];
    }
    const path = state_default.satellites.issOrbitPath;
    if (!path || path.length < 2) return;
    const segments = splitAtDateline(path);
    state_default.satellites.orbitLines["25544"] = L.polyline(segments, {
      color: "#00bcd4",
      weight: 1.5,
      opacity: 0.5,
      dashArray: "6 4",
      interactive: false
    }).addTo(state_default.map);
  }
  async function fetchSatelliteList() {
    if (!state_default.n2yoApiKey) return;
    try {
      const url = `/api/satellites/list?apikey=${encodeURIComponent(state_default.n2yoApiKey)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.satellites.available = data;
      renderSatelliteSelectList();
    } catch (err) {
      console.error("Failed to fetch satellite list:", err);
    }
  }
  async function fetchSatellitePositions() {
    if (!state_default.n2yoApiKey || state_default.satellites.tracked.length === 0) return;
    const n2yoIds = state_default.satellites.tracked.filter((id) => id !== 25544);
    if (n2yoIds.length === 0) return;
    try {
      const ids = n2yoIds.join(",");
      const lat = state_default.myLat ?? 0;
      const lon = state_default.myLon ?? 0;
      const url = `/api/satellites/positions?apikey=${encodeURIComponent(state_default.n2yoApiKey)}&ids=${ids}&lat=${lat}&lon=${lon}&seconds=1`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      const issPos = state_default.satellites.positions["25544"];
      state_default.satellites.positions = data;
      if (issPos) state_default.satellites.positions["25544"] = issPos;
      updateSatelliteMarkers();
      renderSatelliteWidget();
    } catch (err) {
      console.error("Failed to fetch satellite positions:", err);
    }
  }
  async function fetchSatellitePasses(satId) {
    if (!state_default.n2yoApiKey || state_default.myLat === null || state_default.myLon === null) return;
    try {
      const url = `/api/satellites/passes?apikey=${encodeURIComponent(state_default.n2yoApiKey)}&id=${satId}&lat=${state_default.myLat}&lon=${state_default.myLon}&days=2&minEl=10`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.satellites.passes[satId] = {
        ...data,
        expires: Date.now() + 5 * 60 * 1e3
        // 5 min cache
      };
      renderSatellitePasses(satId);
    } catch (err) {
      console.error("Failed to fetch satellite passes:", err);
    }
  }
  function updateSatelliteMarkers() {
    if (!state_default.map) return;
    const positions = state_default.satellites.positions;
    for (const satId of Object.keys(state_default.satellites.markers)) {
      if (!positions[satId]) {
        state_default.map.removeLayer(state_default.satellites.markers[satId]);
        delete state_default.satellites.markers[satId];
      }
    }
    for (const satId of Object.keys(state_default.satellites.circles)) {
      if (!positions[satId]) {
        state_default.map.removeLayer(state_default.satellites.circles[satId]);
        delete state_default.satellites.circles[satId];
      }
    }
    for (const satId of Object.keys(state_default.satellites.orbitLines)) {
      if (!positions[satId]) {
        state_default.map.removeLayer(state_default.satellites.orbitLines[satId]);
        delete state_default.satellites.orbitLines[satId];
      }
    }
    for (const [satId, pos] of Object.entries(positions)) {
      const satInfo = SAT_FREQUENCIES[satId] || { name: pos.name || `SAT ${satId}` };
      const name = satInfo.name || pos.name || `SAT ${satId}`;
      const isAboveHorizon = pos.elevation > 0;
      const altKm = pos.alt || DEFAULT_SAT_ALT_KM;
      const footprintRadiusKm = calculateFootprintRadius(altKm);
      const radiusMeters = footprintRadiusKm * 1e3;
      const isISS = satId === "25544" || satId === 25544;
      if (state_default.satellites.markers[satId]) {
        const prev = state_default.satellites.markers[satId].getLatLng();
        if (Math.abs(prev.lat - pos.lat) > 0.01 || Math.abs(prev.lng - pos.lon) > 0.01) {
          state_default.satellites.markers[satId].setLatLng([pos.lat, pos.lon]);
        }
      } else {
        let iconClass;
        if (isISS) {
          iconClass = "iss-icon";
        } else {
          iconClass = isAboveHorizon ? "sat-icon" : "sat-icon below-horizon";
        }
        const shortName = isISS ? "ISS" : esc(name.split(" ")[0].split("(")[0].trim());
        const icon = L.divIcon({
          className: iconClass,
          html: shortName,
          iconSize: isISS ? [40, 20] : [50, 20],
          iconAnchor: isISS ? [20, 10] : [25, 10]
        });
        state_default.satellites.markers[satId] = L.marker([pos.lat, pos.lon], {
          icon,
          zIndexOffset: isISS ? 1e4 : isAboveHorizon ? 9e3 : 8e3
        }).addTo(state_default.map);
        state_default.satellites.markers[satId].bindPopup("", { maxWidth: 300 });
      }
      state_default.satellites.markers[satId].setPopupContent(buildSatellitePopup(satId, pos, satInfo));
      const markerEl = state_default.satellites.markers[satId].getElement();
      if (markerEl) {
        const iconEl = markerEl.querySelector(".sat-icon");
        if (iconEl) {
          iconEl.classList.toggle("below-horizon", !isAboveHorizon);
        }
      }
      if (state_default.satellites.circles[satId]) {
        const prevC = state_default.satellites.circles[satId].getLatLng();
        if (Math.abs(prevC.lat - pos.lat) > 0.01 || Math.abs(prevC.lng - pos.lon) > 0.01) {
          state_default.satellites.circles[satId].setLatLng([pos.lat, pos.lon]);
          state_default.satellites.circles[satId].setRadius(radiusMeters);
        }
      } else {
        const color = satId === "25544" ? "#00bcd4" : "#4caf50";
        state_default.satellites.circles[satId] = L.circle([pos.lat, pos.lon], {
          radius: radiusMeters,
          color,
          fillColor: color,
          fillOpacity: 0.06,
          weight: 1,
          interactive: false
        }).addTo(state_default.map);
      }
    }
  }
  function buildSatellitePopup(satId, pos, satInfo) {
    const name = satInfo.name || pos.name || `SAT ${satId}`;
    const isAbove = pos.elevation > 0;
    const statusText = isAbove ? "Above Horizon" : "Below Horizon";
    const statusColor = isAbove ? "var(--green)" : "var(--text-dim)";
    const isISS = satId === "25544" || satId === 25544;
    const popupClass = isISS ? "iss-popup" : "sat-popup";
    const titleClass = isISS ? "iss-popup-title" : "sat-popup-title";
    const rowClass = isISS ? "iss-popup-row" : "sat-popup-row";
    const headerClass = isISS ? "iss-radio-header" : "sat-radio-header";
    const tableClass = isISS ? "iss-freq-table" : "sat-freq-table";
    let html = `<div class="${popupClass}">`;
    html += `<div class="${titleClass}">${esc(name)}</div>`;
    html += `<div class="${rowClass}">Lat: ${pos.lat.toFixed(2)}, Lon: ${pos.lon.toFixed(2)}</div>`;
    html += `<div class="${rowClass}">Alt: ${Math.round(pos.alt)} km</div>`;
    html += `<div class="${rowClass}">Az: ${pos.azimuth.toFixed(1)}&deg; &bull; El: ${pos.elevation.toFixed(1)}&deg;</div>`;
    html += `<div class="${rowClass}" style="color:${statusColor}">${statusText}</div>`;
    if (pos.tleEpoch) {
      const ageDays = Math.floor((Date.now() / 1e3 - pos.tleEpoch) / 86400);
      const maxAge = state_default.maxTleAge || 7;
      const ageColor = ageDays <= Math.floor(maxAge * 0.4) ? "var(--green)" : ageDays <= maxAge ? "var(--yellow)" : "var(--red)";
      const epochDate = new Date(pos.tleEpoch * 1e3).toLocaleDateString(void 0, { month: "short", day: "numeric" });
      const warn = ageDays > maxAge ? " \u26A0" : "";
      html += `<div class="${rowClass}">TLE: <span style="color:${ageColor}">${ageDays}d old${warn}</span> (${epochDate})</div>`;
    }
    if (satInfo.uplinks || satInfo.downlinks) {
      html += `<div class="${headerClass}">${isISS ? "Amateur Radio (ARISS)" : "Amateur Radio Frequencies"}</div>`;
      html += `<table class="${tableClass}">`;
      if (satInfo.uplinks) {
        for (const ul of satInfo.uplinks) {
          const doppler = calculateDopplerShift(ul.freq, pos);
          const dopplerStr = doppler !== null ? ` (${doppler > 0 ? "+" : ""}${doppler.toFixed(1)} kHz)` : "";
          html += `<tr><td>&#8593; ${esc(ul.desc || ul.mode)}</td><td>${ul.freq.toFixed(3)} MHz${dopplerStr}</td></tr>`;
        }
      }
      if (satInfo.downlinks) {
        for (const dl of satInfo.downlinks) {
          const doppler = calculateDopplerShift(dl.freq, pos);
          const dopplerStr = doppler !== null ? ` (${doppler > 0 ? "+" : ""}${doppler.toFixed(1)} kHz)` : "";
          html += `<tr><td>&#8595; ${esc(dl.desc || dl.mode)}</td><td>${dl.freq.toFixed(3)} MHz${dopplerStr}</td></tr>`;
        }
      }
      html += `</table>`;
      if (isISS) {
        html += `<div class="iss-radio-note">Repeater &amp; APRS typically active. SSTV during special events. Doppler shown above.</div>`;
      }
    }
    html += `</div>`;
    return html;
  }
  function calculateFootprintRadius(altitudeKm) {
    const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm);
    const angleRad = Math.acos(ratio);
    return EARTH_RADIUS_KM * angleRad;
  }
  function calculateDopplerShift(freqMHz, pos) {
    if (pos.elevation === void 0 || pos.elevation === null) return null;
    const orbitalVelocityKmS = 7.8;
    const elevRad = pos.elevation * Math.PI / 180;
    const radialVelocity = orbitalVelocityKmS * Math.cos(elevRad);
    const dopplerMHz = freqMHz * (radialVelocity / SPEED_OF_LIGHT_KM_S);
    return dopplerMHz * 1e3;
  }
  function renderSatelliteWidget() {
    const satList = $("satList");
    if (!satList) return;
    const positions = state_default.satellites.positions;
    const tracked = state_default.satellites.tracked;
    if (Object.keys(positions).length === 0) {
      if (!state_default.n2yoApiKey) {
        satList.innerHTML = '<div class="sat-no-data">Loading ISS...</div>';
      } else {
        satList.innerHTML = '<div class="sat-no-data">No satellite data</div>';
      }
      return;
    }
    let html = "";
    for (const satId of tracked) {
      const pos = positions[satId];
      if (!pos) continue;
      const satInfo = SAT_FREQUENCIES[satId] || {};
      const name = satInfo.name || pos.name || `SAT ${satId}`;
      const shortName = name.split(" ")[0].split("(")[0].trim();
      const isAbove = pos.elevation > 0;
      const isSelected = state_default.satellites.selectedSatId === parseInt(satId, 10);
      let dopplerStr = "";
      if (satInfo.downlinks && satInfo.downlinks.length > 0) {
        const doppler = calculateDopplerShift(satInfo.downlinks[0].freq, pos);
        if (doppler !== null) {
          dopplerStr = `${doppler > 0 ? "+" : ""}${doppler.toFixed(1)}`;
        }
      }
      let tleAgeHtml = "";
      if (pos.tleEpoch) {
        const ageDays = Math.floor((Date.now() / 1e3 - pos.tleEpoch) / 86400);
        const maxAge = state_default.maxTleAge || 7;
        const cls = ageDays <= Math.floor(maxAge * 0.4) ? "tle-fresh" : ageDays <= maxAge ? "tle-aging" : "tle-stale";
        const warn = ageDays > maxAge ? " \u26A0" : "";
        tleAgeHtml = `<span class="sat-tle-age ${cls}" title="TLE age: ${ageDays}d (max: ${maxAge}d)">${ageDays}d${warn}</span>`;
      }
      const rowClass = `sat-row${isSelected ? " selected" : ""}${isAbove ? "" : " below-horizon"}`;
      html += `<div class="${rowClass}" data-sat-id="${satId}">`;
      html += `<span class="sat-name">${esc(shortName)}${tleAgeHtml}</span>`;
      html += `<span class="sat-azel">Az ${pos.azimuth.toFixed(0)}&deg; El ${pos.elevation.toFixed(0)}&deg;</span>`;
      if (dopplerStr) {
        html += `<span class="sat-doppler">${dopplerStr} kHz</span>`;
      }
      html += `</div>`;
    }
    if (!state_default.n2yoApiKey && tracked.some((id) => id !== 25544)) {
      html += '<div class="sat-no-key" style="font-size:0.85em;margin-top:4px">N2YO key needed for other satellites</div>';
    }
    satList.innerHTML = html;
    satList.querySelectorAll(".sat-row").forEach((row) => {
      row.addEventListener("click", () => {
        const satId = parseInt(row.dataset.satId, 10);
        selectSatellite(satId);
      });
    });
  }
  function selectSatellite(satId) {
    state_default.satellites.selectedSatId = satId;
    const satList = $("satList");
    if (satList) {
      satList.querySelectorAll(".sat-row").forEach((row) => {
        row.classList.toggle("selected", parseInt(row.dataset.satId, 10) === satId);
      });
    }
    const pos = state_default.satellites.positions[satId];
    if (pos && state_default.map) {
      state_default.map.panTo([pos.lat, pos.lon]);
      if (state_default.satellites.markers[satId]) {
        state_default.satellites.markers[satId].openPopup();
      }
    }
    const cached = state_default.satellites.passes[satId];
    if (!cached || Date.now() > cached.expires) {
      fetchSatellitePasses(satId);
    } else {
      renderSatellitePasses(satId);
    }
  }
  function renderSatellitePasses(satId) {
    const passesDiv = $("satPasses");
    if (!passesDiv) return;
    const cached = state_default.satellites.passes[satId];
    if (!cached || !cached.passes || cached.passes.length === 0) {
      passesDiv.innerHTML = '<div class="sat-no-passes">No upcoming passes</div>';
      return;
    }
    let html = `<div class="sat-passes-title">Upcoming Passes</div>`;
    for (const pass of cached.passes.slice(0, 5)) {
      const startDate = new Date(pass.startUTC * 1e3);
      const maxDate = new Date(pass.maxUTC * 1e3);
      const timeStr = formatPassTime(startDate);
      const durationMin = Math.round((pass.endUTC - pass.startUTC) / 60);
      html += `<div class="pass-item">`;
      html += `<div class="pass-time">${timeStr}</div>`;
      html += `<div class="pass-details">Max El: ${pass.maxEl}&deg; &bull; ${durationMin} min</div>`;
      html += `<div class="pass-azimuth">${pass.startAzCompass} &rarr; ${pass.maxAzCompass} &rarr; ${pass.endAzCompass}</div>`;
      html += `</div>`;
    }
    passesDiv.innerHTML = html;
  }
  function formatPassTime(date) {
    const now = /* @__PURE__ */ new Date();
    const diffMs = date - now;
    const diffMin = Math.round(diffMs / 6e4);
    if (diffMin < 60) {
      return `In ${diffMin} min`;
    } else if (diffMin < 1440) {
      const hours = Math.floor(diffMin / 60);
      const mins = diffMin % 60;
      return `In ${hours}h ${mins}m`;
    } else {
      return date.toLocaleString(void 0, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
    }
  }
  function showSatelliteConfig() {
    const splash = $("satCfgSplash");
    if (!splash) return;
    const apiKeyInput = $("satApiKey");
    if (apiKeyInput) {
      apiKeyInput.value = state_default.n2yoApiKey;
    }
    const tleAgeInput = $("satMaxTleAge");
    if (tleAgeInput) {
      tleAgeInput.value = state_default.maxTleAge;
    }
    if (state_default.n2yoApiKey && state_default.satellites.available.length === 0) {
      fetchSatelliteList();
    }
    renderSatelliteSelectList();
    splash.classList.remove("hidden");
  }
  function dismissSatelliteConfig() {
    const splash = $("satCfgSplash");
    if (!splash) return;
    const apiKeyInput = $("satApiKey");
    if (apiKeyInput) {
      state_default.n2yoApiKey = apiKeyInput.value.trim();
      localStorage.setItem("hamtab_n2yo_apikey", state_default.n2yoApiKey);
      if (state_default.n2yoApiKey) {
        fetch("/api/config/env", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ N2YO_API_KEY: state_default.n2yoApiKey })
        }).catch(() => {
        });
      }
    }
    const tleAgeInput = $("satMaxTleAge");
    if (tleAgeInput) {
      const age = parseInt(tleAgeInput.value, 10);
      if (!isNaN(age) && age >= 1 && age <= 30) {
        state_default.maxTleAge = age;
        localStorage.setItem("hamtab_max_tle_age", String(age));
      }
    }
    const selectList = $("satSelectList");
    if (selectList) {
      const tracked = [];
      selectList.querySelectorAll('input[type="checkbox"]:checked').forEach((cb) => {
        const id = parseInt(cb.dataset.satId, 10);
        if (!isNaN(id)) tracked.push(id);
      });
      state_default.satellites.tracked = tracked.length > 0 ? tracked : [25544];
      localStorage.setItem("hamtab_sat_tracked", JSON.stringify(state_default.satellites.tracked));
    }
    splash.classList.add("hidden");
    fetchIssPosition();
    if (state_default.n2yoApiKey) {
      fetchSatellitePositions();
    }
  }
  function renderSatelliteSelectList() {
    const selectList = $("satSelectList");
    if (!selectList) return;
    const allSats = /* @__PURE__ */ new Map();
    for (const [id, info] of Object.entries(SAT_FREQUENCIES)) {
      allSats.set(parseInt(id, 10), info.name);
    }
    for (const sat of state_default.satellites.available) {
      if (!allSats.has(sat.satId)) {
        allSats.set(sat.satId, sat.name);
      }
    }
    let html = "";
    for (const [satId, name] of allSats) {
      const isTracked = state_default.satellites.tracked.includes(satId);
      html += `<label class="sat-select-item">`;
      html += `<input type="checkbox" data-sat-id="${satId}" ${isTracked ? "checked" : ""} />`;
      html += `${esc(name)} (${satId})`;
      html += `</label>`;
    }
    selectList.innerHTML = html;
  }

  // src/splash.js
  init_beacons();
  init_map_init();
  init_voacap();

  // src/live-spots.js
  init_state();
  init_dom();
  init_geo();
  init_utils();
  init_constants();
  function initLiveSpotsListeners() {
    const cfgBtn = $("liveSpotsCfgBtn");
    if (cfgBtn) {
      cfgBtn.addEventListener("click", showLiveSpotsConfig);
    }
    const cfgOk = $("liveSpotsCfgOk");
    if (cfgOk) {
      cfgOk.addEventListener("click", dismissLiveSpotsConfig);
    }
    const splash = $("liveSpotsCfgSplash");
    if (splash) {
      splash.addEventListener("click", (e) => {
        if (e.target === splash) dismissLiveSpotsConfig();
      });
    }
    const modeSelect = $("liveSpotsModeSelect");
    if (modeSelect) {
      modeSelect.value = state_default.liveSpots.displayMode;
      modeSelect.addEventListener("change", () => {
        state_default.liveSpots.displayMode = modeSelect.value;
        localStorage.setItem("hamtab_livespots_mode", modeSelect.value);
        renderLiveSpots();
      });
    }
  }
  function showLiveSpotsConfig() {
    const splash = $("liveSpotsCfgSplash");
    if (splash) splash.classList.remove("hidden");
    const modeSelect = $("liveSpotsModeSelect");
    if (modeSelect) modeSelect.value = state_default.liveSpots.displayMode;
  }
  function dismissLiveSpotsConfig() {
    const splash = $("liveSpotsCfgSplash");
    if (splash) splash.classList.add("hidden");
  }
  async function fetchLiveSpots() {
    if (!state_default.myCallsign) {
      renderLiveSpots();
      return;
    }
    try {
      const url = `/api/spots/psk/heard?callsign=${encodeURIComponent(state_default.myCallsign)}`;
      const resp = await fetch(url);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.liveSpots.data = data.spots || [];
      state_default.liveSpots.summary = data.summary || {};
      state_default.liveSpots.lastFetch = Date.now();
      state_default.liveSpots.error = false;
      renderLiveSpots();
    } catch (err) {
      if (state_default.debug) console.error("Failed to fetch Live Spots:", err);
      state_default.liveSpots.error = true;
      renderLiveSpots();
    }
  }
  function renderLiveSpots() {
    const status = $("liveSpotsStatus");
    const summary = $("liveSpotsSummary");
    const count = $("liveSpotsCount");
    if (!summary) return;
    if (!state_default.myCallsign) {
      if (status) {
        status.textContent = "Set your callsign in Config";
        status.classList.add("visible");
      }
      summary.innerHTML = "";
      if (count) count.textContent = "";
      return;
    }
    if (status) {
      if (state_default.liveSpots.error && !state_default.liveSpots.lastFetch) {
        status.textContent = "PSKReporter unavailable \u2014 retrying";
        status.classList.add("visible");
      } else if (state_default.liveSpots.data.length === 0 && state_default.liveSpots.lastFetch) {
        status.textContent = "No spots in last hour";
        status.classList.add("visible");
      } else if (!state_default.liveSpots.lastFetch) {
        status.textContent = "Loading...";
        status.classList.add("visible");
      } else {
        status.textContent = "";
        status.classList.remove("visible");
      }
    }
    if (count) {
      const total = state_default.liveSpots.data.length;
      count.textContent = total > 0 ? `(${total})` : "";
    }
    const bands = Object.keys(state_default.liveSpots.summary).sort((a, b) => {
      const order = ["160m", "80m", "60m", "40m", "30m", "20m", "17m", "15m", "12m", "10m", "6m", "2m", "70cm"];
      return order.indexOf(a) - order.indexOf(b);
    });
    if (bands.length === 0) {
      summary.innerHTML = "";
      return;
    }
    let html = "";
    for (const band of bands) {
      const info = state_default.liveSpots.summary[band];
      const isActive = state_default.liveSpots.visibleBands.has(band);
      const activeClass = isActive ? "active" : "";
      const color = getBandColor(band);
      let valueHtml;
      if (state_default.liveSpots.displayMode === "distance") {
        const km = info.farthestKm || 0;
        const mi = Math.round(km * 0.621371);
        valueHtml = `<span class="live-spots-value">${state_default.distanceUnit === "km" ? km : mi} ${state_default.distanceUnit}</span>`;
      } else {
        valueHtml = `<span class="live-spots-value">${info.count}</span>`;
      }
      html += `
      <div class="live-spots-band-card ${activeClass}" data-band="${esc(band)}" style="border-color: ${color}">
        <span class="live-spots-band-name">${esc(band)}</span>
        ${valueHtml}
        ${state_default.liveSpots.displayMode === "distance" && info.farthestCall ? `<span class="live-spots-farthest">${esc(info.farthestCall)}</span>` : ""}
      </div>
    `;
    }
    summary.innerHTML = html;
    const cards = summary.querySelectorAll(".live-spots-band-card");
    cards.forEach((card) => {
      card.addEventListener("click", () => {
        const band = card.dataset.band;
        toggleBandOnMap(band);
        card.classList.toggle("active");
      });
    });
  }
  function toggleBandOnMap(band) {
    if (state_default.liveSpots.visibleBands.has(band)) {
      state_default.liveSpots.visibleBands.delete(band);
    } else {
      state_default.liveSpots.visibleBands.add(band);
    }
    renderLiveSpotsOnMap();
  }
  function renderLiveSpotsOnMap() {
    if (!state_default.map) return;
    clearLiveSpotsFromMap();
    if (state_default.myLat == null || state_default.myLon == null) return;
    if (state_default.liveSpots.visibleBands.size === 0) return;
    const L2 = window.L;
    const spotsByBand = {};
    for (const spot of state_default.liveSpots.data) {
      if (!spot.band || !state_default.liveSpots.visibleBands.has(spot.band)) continue;
      if (spot.receiverLat == null || spot.receiverLon == null) continue;
      if (!spotsByBand[spot.band]) spotsByBand[spot.band] = [];
      spotsByBand[spot.band].push(spot);
    }
    for (const band of Object.keys(spotsByBand)) {
      const color = getBandColor(band);
      const spots = spotsByBand[band];
      for (const spot of spots) {
        const pts = geodesicPoints(state_default.myLat, state_default.myLon, spot.receiverLat, spot.receiverLon, 50);
        const segments = [[]];
        let lastLon = pts[0][1];
        for (const pt of pts) {
          if (Math.abs(pt[1] - lastLon) > 180) {
            segments.push([]);
          }
          segments[segments.length - 1].push([pt[0], pt[1]]);
          lastLon = pt[1];
        }
        const line = L2.polyline(segments, {
          color,
          weight: 2,
          opacity: 0.6,
          dashArray: "4 3"
        });
        line.addTo(state_default.map);
        const lineKey = `${spot.receiver}-${spot.spotTime}`;
        if (!state_default.liveSpotsLines) state_default.liveSpotsLines = {};
        state_default.liveSpotsLines[lineKey] = line;
        const marker = L2.marker([spot.receiverLat, spot.receiverLon], {
          icon: L2.divIcon({
            className: "live-spots-rx-marker",
            html: `<div class="live-spots-rx-icon" style="background: ${color}">&#9632;</div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          })
        });
        const popupHtml = `
        <div class="live-spots-popup">
          <div class="live-spots-popup-call">${esc(spot.receiver)}</div>
          <div class="live-spots-popup-grid">${esc(spot.receiverLocator || "")}</div>
          <div class="live-spots-popup-details">
            ${spot.distanceKm ? `${spot.distanceKm} km` : ""}
            ${spot.snr ? ` / SNR: ${esc(spot.snr)} dB` : ""}
          </div>
          <div class="live-spots-popup-mode">${esc(spot.mode)} on ${esc(band)}</div>
        </div>
      `;
        marker.bindPopup(popupHtml);
        marker.addTo(state_default.map);
        const markerKey = `${spot.receiver}-${spot.spotTime}`;
        state_default.liveSpotsMarkers[markerKey] = marker;
      }
    }
  }
  function clearLiveSpotsFromMap() {
    for (const key of Object.keys(state_default.liveSpotsMarkers)) {
      if (state_default.map && state_default.liveSpotsMarkers[key]) {
        state_default.map.removeLayer(state_default.liveSpotsMarkers[key]);
      }
    }
    state_default.liveSpotsMarkers = {};
    if (state_default.liveSpotsLines) {
      for (const key of Object.keys(state_default.liveSpotsLines)) {
        if (state_default.map && state_default.liveSpotsLines[key]) {
          state_default.map.removeLayer(state_default.liveSpotsLines[key]);
        }
      }
      state_default.liveSpotsLines = null;
    }
  }

  // src/splash.js
  init_dedx_info();
  init_solar();
  init_lunar();
  init_dedx_info();
  var stagedAssignments = {};
  var selectedCell = null;
  function updateOperatorDisplay2() {
    const opCall = $("opCall");
    const opLoc = $("opLoc");
    if (state_default.myCallsign) {
      const qrz = `https://www.qrz.com/db/${encodeURIComponent(state_default.myCallsign)}`;
      let classLabel = state_default.licenseClass ? `[${state_default.licenseClass}]` : "";
      opCall.innerHTML = `<a href="${qrz}" target="_blank" rel="noopener">${esc(state_default.myCallsign)}</a>${classLabel ? `<div class="op-class">${esc(classLabel)}</div>` : ""}`;
      const info = state_default.callsignCache[state_default.myCallsign.toUpperCase()];
      const opName = document.getElementById("opName");
      if (opName) {
        opName.textContent = info ? info.name : "";
      }
    } else {
      opCall.textContent = "";
      const opName = document.getElementById("opName");
      if (opName) opName.textContent = "";
    }
    if (state_default.myLat !== null && state_default.myLon !== null) {
      const grid = latLonToGrid(state_default.myLat, state_default.myLon);
      opLoc.textContent = `${state_default.myLat.toFixed(2)}, ${state_default.myLon.toFixed(2)} [${grid}]`;
    } else {
      opLoc.textContent = "Location unknown";
    }
  }
  function fetchLocation() {
    if (state_default.manualLoc) return;
    if (!navigator.geolocation) {
      $("opLoc").textContent = "Geolocation unavailable";
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLon = pos.coords.longitude;
        const changed = state_default.myLat !== newLat || state_default.myLon !== newLon;
        state_default.myLat = newLat;
        state_default.myLon = newLon;
        localStorage.setItem("hamtab_gps_lat", String(newLat));
        localStorage.setItem("hamtab_gps_lon", String(newLon));
        updateOperatorDisplay2();
        centerMapOnUser();
        updateUserMarker();
        if (changed && state_default.appInitialized) startNwsPolling();
      },
      () => {
        $("opLoc").textContent = "Location denied";
      },
      { enableHighAccuracy: false, timeout: 1e4 }
    );
  }
  function getGridSuggestions(prefix) {
    const results = [];
    const p = prefix.toUpperCase();
    if (p.length === 0 || p.length >= 4) return results;
    const fieldChars = "ABCDEFGHIJKLMNOPQR";
    const digitChars = "0123456789";
    function generate(current, pos) {
      if (results.length >= 20) return;
      if (current.length === 4) {
        results.push(current);
        return;
      }
      const chars = pos < 2 ? fieldChars : digitChars;
      for (let i = 0; i < chars.length; i++) {
        if (results.length >= 20) return;
        const ch = chars[i];
        if (pos < p.length) {
          if (ch === p[pos]) {
            generate(current + ch, pos + 1);
          }
        } else {
          generate(current + ch, pos + 1);
        }
      }
    }
    generate("", 0);
    return results;
  }
  function showGridSuggestions(prefix) {
    const splashGridDropdown = $("splashGridDropdown");
    const suggestions = getGridSuggestions(prefix);
    splashGridDropdown.innerHTML = "";
    state_default.gridHighlightIdx = -1;
    if (suggestions.length === 0) {
      splashGridDropdown.classList.remove("open");
      return;
    }
    suggestions.forEach((grid) => {
      const div = document.createElement("div");
      div.className = "grid-option";
      div.textContent = grid;
      div.addEventListener("mousedown", (e) => {
        e.preventDefault();
        selectGridSuggestion(grid);
      });
      splashGridDropdown.appendChild(div);
    });
    splashGridDropdown.classList.add("open");
  }
  function selectGridSuggestion(grid) {
    const splashGrid = $("splashGrid");
    const splashGridDropdown = $("splashGridDropdown");
    splashGrid.value = grid;
    splashGridDropdown.classList.remove("open");
    splashGridDropdown.innerHTML = "";
    state_default.gridHighlightIdx = -1;
    const ll = gridToLatLon(grid);
    if (ll) {
      state_default.syncingFields = true;
      $("splashLat").value = ll.lat.toFixed(2);
      $("splashLon").value = ll.lon.toFixed(2);
      state_default.myLat = ll.lat;
      state_default.myLon = ll.lon;
      state_default.syncingFields = false;
      state_default.manualLoc = true;
      $("splashGpsBtn").classList.remove("active");
      updateLocStatus("Manual location set");
    }
  }
  function updateLocStatus(msg, isError) {
    const el2 = $("splashLocStatus");
    el2.textContent = msg || "";
    el2.classList.toggle("error", !!isError);
  }
  function updateGridHighlight() {
    const options = $("splashGridDropdown").querySelectorAll(".grid-option");
    options.forEach((opt, i) => {
      opt.classList.toggle("highlighted", i === state_default.gridHighlightIdx);
    });
    if (state_default.gridHighlightIdx >= 0 && options[state_default.gridHighlightIdx]) {
      options[state_default.gridHighlightIdx].scrollIntoView({ block: "nearest" });
    }
  }
  function updateWidgetSlotEnforcement() {
    const counter = document.getElementById("widgetSlotCounter");
    const widgetList = document.getElementById("splashWidgetList");
    if (!counter || !widgetList) return;
    const floatRadio = document.getElementById("layoutModeFloat");
    const isGrid = floatRadio ? !floatRadio.checked : false;
    const supportsGrid = currentThemeSupportsGrid();
    if (!isGrid || !supportsGrid) {
      counter.textContent = "";
      counter.classList.remove("over-limit");
      widgetList.querySelectorAll("label").forEach((lbl) => {
        lbl.classList.remove("cb-disabled");
        const cb = lbl.querySelector('input[type="checkbox"]');
        if (cb) cb.disabled = false;
      });
      return;
    }
    const permSelect = document.getElementById("gridPermSelect");
    const permId = permSelect ? permSelect.value : state_default.gridPermutation;
    const perm = getGridPermutation(permId);
    const spans = state_default.gridSpans || {};
    const absorbedCount = Object.values(spans).reduce((sum, s) => sum + (s - 1), 0);
    const maxSlots = perm.slots - absorbedCount;
    const checkboxes = widgetList.querySelectorAll('input[type="checkbox"]');
    let checkedNonMap = 0;
    checkboxes.forEach((cb) => {
      if (cb.dataset.widgetId === "widget-map") {
        cb.checked = true;
        cb.disabled = true;
        cb.closest("label").classList.add("cb-disabled");
      } else if (cb.checked) {
        checkedNonMap++;
      }
    });
    const atLimit = checkedNonMap >= maxSlots;
    checkboxes.forEach((cb) => {
      if (cb.dataset.widgetId === "widget-map") return;
      if (atLimit && !cb.checked) {
        cb.disabled = true;
        cb.closest("label").classList.add("cb-disabled");
      } else {
        cb.disabled = false;
        cb.closest("label").classList.remove("cb-disabled");
      }
    });
    if (checkedNonMap > maxSlots) {
      counter.textContent = `${checkedNonMap} / ${maxSlots} slots \u2014 excess hidden in grid`;
      counter.classList.add("over-limit");
    } else {
      const spanNote = absorbedCount > 0 ? ` (${absorbedCount} spanned)` : "";
      counter.textContent = `${checkedNonMap} / ${maxSlots} slots${spanNote}`;
      counter.classList.remove("over-limit");
    }
  }
  var _initApp = null;
  function setInitApp(fn) {
    _initApp = fn;
  }
  function showSplash() {
    const splash = $("splash");
    splash.classList.remove("hidden");
    splash.querySelectorAll(".config-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === "station"));
    splash.querySelectorAll(".config-panel").forEach((p) => p.classList.toggle("active", p.dataset.panel === "station"));
    $("splashCallsign").value = state_default.myCallsign;
    if (state_default.myLat !== null && state_default.myLon !== null) {
      $("splashLat").value = state_default.myLat.toFixed(2);
      $("splashLon").value = state_default.myLon.toFixed(2);
      const grid = latLonToGrid(state_default.myLat, state_default.myLon);
      $("splashGrid").value = grid.substring(0, 4).toUpperCase();
    } else {
      $("splashLat").value = "";
      $("splashLon").value = "";
      $("splashGrid").value = "";
    }
    if (state_default.manualLoc) {
      $("splashGpsBtn").classList.remove("active");
      updateLocStatus("Manual override active");
    } else {
      $("splashGpsBtn").classList.add("active");
      updateLocStatus("Using GPS");
    }
    const timeFmt24 = $("timeFmt24");
    const timeFmt12 = $("timeFmt12");
    if (timeFmt24) timeFmt24.checked = state_default.use24h;
    if (timeFmt12) timeFmt12.checked = !state_default.use24h;
    const distUnitMi = $("distUnitMi");
    const distUnitKm = $("distUnitKm");
    if (distUnitMi) distUnitMi.checked = state_default.distanceUnit === "mi";
    if (distUnitKm) distUnitKm.checked = state_default.distanceUnit === "km";
    const tempUnitF = $("tempUnitF");
    const tempUnitC = $("tempUnitC");
    if (tempUnitF) tempUnitF.checked = state_default.temperatureUnit === "F";
    if (tempUnitC) tempUnitC.checked = state_default.temperatureUnit === "C";
    const cfgAutoRefresh = $("cfgAutoRefresh");
    if (cfgAutoRefresh) cfgAutoRefresh.checked = state_default.autoRefreshEnabled;
    const widgetList = document.getElementById("splashWidgetList");
    widgetList.innerHTML = "";
    WIDGET_DEFS.forEach((w) => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.widgetId = w.id;
      cb.checked = state_default.widgetVisibility[w.id] !== false;
      cb.addEventListener("change", () => {
        updateWidgetSlotEnforcement();
        onWidgetCheckboxChange(cb.dataset.widgetId, cb.checked);
      });
      label.appendChild(cb);
      label.appendChild(document.createTextNode(w.name));
      widgetList.appendChild(label);
    });
    $("splashWxStation").value = state_default.wxStation;
    $("splashWxApiKey").value = state_default.wxApiKey;
    $("splashOwmApiKey").value = state_default.owmApiKey;
    $("splashN2yoApiKey").value = state_default.n2yoApiKey;
    const intervalSelect = $("splashUpdateInterval");
    if (intervalSelect) {
      const savedInterval = localStorage.getItem("hamtab_update_interval") || "60";
      intervalSelect.value = savedInterval;
    }
    $("splashGridDropdown").classList.remove("open");
    $("splashGridDropdown").innerHTML = "";
    state_default.gridHighlightIdx = -1;
    const themeSelector = document.getElementById("themeSelector");
    if (themeSelector) {
      themeSelector.innerHTML = "";
      const themes = getThemeList();
      const currentId = getCurrentThemeId();
      themes.forEach((t) => {
        const swatch = document.createElement("div");
        swatch.className = "theme-swatch" + (t.id === currentId ? " active" : "");
        swatch.dataset.themeId = t.id;
        const colors = getThemeSwatchColors(t.id);
        const colorsDiv = document.createElement("div");
        colorsDiv.className = "theme-swatch-colors";
        colors.forEach((c) => {
          const span = document.createElement("span");
          span.style.background = c;
          colorsDiv.appendChild(span);
        });
        swatch.appendChild(colorsDiv);
        const nameDiv = document.createElement("div");
        nameDiv.className = "theme-swatch-name";
        nameDiv.textContent = t.name;
        swatch.appendChild(nameDiv);
        const descDiv = document.createElement("div");
        descDiv.className = "theme-swatch-desc";
        descDiv.textContent = t.description;
        swatch.appendChild(descDiv);
        swatch.addEventListener("click", () => {
          applyTheme(t.id);
          themeSelector.querySelectorAll(".theme-swatch").forEach((s) => s.classList.remove("active"));
          swatch.classList.add("active");
          const gridSec = document.getElementById("gridModeSection");
          if (gridSec) {
            const supports = currentThemeSupportsGrid();
            gridSec.style.display = supports ? "" : "none";
            if (!supports) {
              const floatRadio = document.getElementById("layoutModeFloat");
              if (floatRadio) floatRadio.checked = true;
              const permSec = document.getElementById("gridPermSection");
              if (permSec) permSec.style.display = "none";
            }
          }
          updateWidgetSlotEnforcement();
        });
        themeSelector.appendChild(swatch);
      });
    }
    const cfgSlimHeader = $("cfgSlimHeader");
    if (cfgSlimHeader) cfgSlimHeader.checked = state_default.slimHeader;
    const cfgGrayscale = $("cfgGrayscale");
    if (cfgGrayscale) cfgGrayscale.checked = state_default.grayscale;
    const cfgDisableWxBg = $("cfgDisableWxBg");
    if (cfgDisableWxBg) cfgDisableWxBg.checked = state_default.disableWxBackgrounds;
    populateBandColorPickers();
    $("splashVersion").textContent = "0.52.0";
    $("aboutVersion").textContent = "0.52.0";
    const gridSection = document.getElementById("gridModeSection");
    const gridPermSection = document.getElementById("gridPermSection");
    if (gridSection) {
      gridSection.style.display = currentThemeSupportsGrid() ? "" : "none";
      $("layoutModeFloat").checked = state_default.gridMode !== "grid";
      $("layoutModeGrid").checked = state_default.gridMode === "grid";
      const permSelect = document.getElementById("gridPermSelect");
      if (permSelect) {
        permSelect.innerHTML = "";
        GRID_PERMUTATIONS.forEach((p) => {
          const opt = document.createElement("option");
          opt.value = p.id;
          opt.textContent = `${p.name} (${p.slots} slots)`;
          permSelect.appendChild(opt);
        });
        permSelect.value = state_default.gridPermutation;
      }
      if (gridPermSection) {
        gridPermSection.style.display = state_default.gridMode === "grid" ? "" : "none";
      }
      const currentPerm = permSelect ? permSelect.value : state_default.gridPermutation;
      if (state_default.gridAssignments && Object.keys(state_default.gridAssignments).length > 0) {
        stagedAssignments = { ...state_default.gridAssignments };
      } else {
        const defaults = GRID_DEFAULT_ASSIGNMENTS[currentPerm];
        stagedAssignments = defaults ? { ...defaults } : {};
      }
      selectedCell = null;
      renderGridPreview(currentPerm, stagedAssignments);
    }
    updateWidgetSlotEnforcement();
    updateWidgetCellBadges(stagedAssignments);
    const hasSaved = hasUserLayout();
    $("splashClearLayout").disabled = !hasSaved;
    $("splashLayoutStatus").textContent = hasSaved ? "Custom layout saved" : "";
    $("splashCallsign").focus();
  }
  function dismissSplash() {
    const val = $("splashCallsign").value.trim().toUpperCase();
    if (!val) return;
    state_default.myCallsign = val;
    localStorage.setItem("hamtab_callsign", state_default.myCallsign);
    if (state_default.manualLoc && state_default.myLat !== null && state_default.myLon !== null) {
      localStorage.setItem("hamtab_lat", String(state_default.myLat));
      localStorage.setItem("hamtab_lon", String(state_default.myLon));
    }
    state_default.use24h = $("timeFmt24").checked;
    localStorage.setItem("hamtab_time24", String(state_default.use24h));
    state_default.distanceUnit = $("distUnitKm").checked ? "km" : "mi";
    state_default.temperatureUnit = $("tempUnitC").checked ? "C" : "F";
    localStorage.setItem("hamtab_distance_unit", state_default.distanceUnit);
    localStorage.setItem("hamtab_temperature_unit", state_default.temperatureUnit);
    state_default.wxStation = ($("splashWxStation").value || "").trim().toUpperCase();
    state_default.wxApiKey = ($("splashWxApiKey").value || "").trim();
    state_default.owmApiKey = ($("splashOwmApiKey").value || "").trim();
    state_default.n2yoApiKey = ($("splashN2yoApiKey").value || "").trim();
    localStorage.setItem("hamtab_wx_station", state_default.wxStation);
    localStorage.setItem("hamtab_wx_apikey", state_default.wxApiKey);
    localStorage.setItem("hamtab_owm_apikey", state_default.owmApiKey);
    localStorage.setItem("hamtab_n2yo_apikey", state_default.n2yoApiKey);
    const envUpdates = {};
    if (state_default.wxApiKey) envUpdates.WU_API_KEY = state_default.wxApiKey;
    if (state_default.owmApiKey) envUpdates.OWM_API_KEY = state_default.owmApiKey;
    if (state_default.n2yoApiKey) envUpdates.N2YO_API_KEY = state_default.n2yoApiKey;
    if (Object.keys(envUpdates).length > 0) {
      fetch("/api/config/env", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(envUpdates)
      }).catch(() => {
      });
    }
    fetchWeather();
    const oldVis = { ...state_default.widgetVisibility };
    const widgetList = document.getElementById("splashWidgetList");
    widgetList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      state_default.widgetVisibility[cb.dataset.widgetId] = cb.checked;
    });
    saveWidgetVisibility();
    if (currentThemeSupportsGrid()) {
      const newMode = $("layoutModeGrid").checked ? "grid" : "float";
      const permSelect = document.getElementById("gridPermSelect");
      const newPerm = permSelect ? permSelect.value : state_default.gridPermutation;
      const oldPerm = state_default.gridPermutation;
      if (newMode === "grid") {
        state_default.gridPermutation = newPerm;
        state_default.gridAssignments = { ...stagedAssignments };
        saveGridAssignments();
        if (state_default.gridMode !== "grid" || newPerm !== oldPerm) {
          activateGridMode(newPerm);
        } else {
          applyGridAssignments();
        }
      } else if (newMode === "float" && state_default.gridMode === "grid") {
        deactivateGridMode();
      }
    }
    applyWidgetVisibility();
    const justShown = (id) => oldVis[id] === false && state_default.widgetVisibility[id] !== false;
    const justHidden = (id) => oldVis[id] !== false && state_default.widgetVisibility[id] === false;
    if (justShown("widget-satellites")) fetchSatellitePositions();
    if (justShown("widget-voacap")) fetchVoacapMatrixThrottled();
    if (justShown("widget-live-spots")) fetchLiveSpots();
    if (justShown("widget-dedx")) renderDedxInfo();
    if (justShown("widget-solar")) fetchSolar();
    if (justShown("widget-lunar")) fetchLunar();
    if (justShown("widget-spacewx")) fetchSpaceWxData();
    if (justShown("widget-dxpeditions")) fetchDxpeditions();
    if (justShown("widget-contests")) fetchContests();
    if (justShown("widget-beacons")) {
      startBeaconTimer();
      updateBeaconMarkers();
    }
    if (justHidden("widget-beacons")) {
      stopBeaconTimer();
    }
    if (justShown("widget-dedx")) {
      startDedxTimer();
    }
    if (justHidden("widget-dedx")) {
      stopDedxTimer();
    }
    const intervalSelect = $("splashUpdateInterval");
    if (intervalSelect) {
      const intervalVal = intervalSelect.value;
      localStorage.setItem("hamtab_update_interval", intervalVal);
      fetch("/api/update/interval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: parseInt(intervalVal, 10) })
      }).catch(() => {
      });
    }
    $("splashGridDropdown").classList.remove("open");
    $("splash").classList.add("hidden");
    updateOperatorDisplay2();
    centerMapOnUser();
    updateUserMarker();
    updateClocks();
    renderSpots();
    if (_initApp) _initApp();
    fetchLicenseClass(state_default.myCallsign);
  }
  function initSplashListeners() {
    document.querySelectorAll(".config-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".config-tab").forEach((t) => t.classList.remove("active"));
        document.querySelectorAll(".config-panel").forEach((p) => p.classList.remove("active"));
        tab.classList.add("active");
        document.querySelector(`.config-panel[data-panel="${tab.dataset.tab}"]`).classList.add("active");
      });
    });
    $("splashOk").addEventListener("click", dismissSplash);
    $("splashCallsign").addEventListener("keydown", (e) => {
      if (e.key === "Enter") dismissSplash();
    });
    function onLatLonInput() {
      if (state_default.syncingFields) return;
      state_default.manualLoc = true;
      $("splashGpsBtn").classList.remove("active");
      const lat = parseFloat($("splashLat").value);
      const lon = parseFloat($("splashLon").value);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        state_default.syncingFields = true;
        $("splashGrid").value = latLonToGrid(lat, lon).substring(0, 4).toUpperCase();
        state_default.myLat = lat;
        state_default.myLon = lon;
        state_default.syncingFields = false;
        updateLocStatus("Manual location set");
      } else {
        updateLocStatus("");
      }
    }
    $("splashLat").addEventListener("input", onLatLonInput);
    $("splashLon").addEventListener("input", onLatLonInput);
    $("splashGrid").addEventListener("input", () => {
      if (state_default.syncingFields) return;
      state_default.manualLoc = true;
      $("splashGpsBtn").classList.remove("active");
      const val = $("splashGrid").value.toUpperCase();
      if (val.length === 4) {
        const ll = gridToLatLon(val);
        if (ll) {
          state_default.syncingFields = true;
          $("splashLat").value = ll.lat.toFixed(2);
          $("splashLon").value = ll.lon.toFixed(2);
          state_default.myLat = ll.lat;
          state_default.myLon = ll.lon;
          state_default.syncingFields = false;
          updateLocStatus("Manual location set");
        }
        $("splashGridDropdown").classList.remove("open");
        $("splashGridDropdown").innerHTML = "";
        state_default.gridHighlightIdx = -1;
      } else if (val.length > 0 && val.length < 4) {
        showGridSuggestions(val);
      } else {
        $("splashGridDropdown").classList.remove("open");
        $("splashGridDropdown").innerHTML = "";
        state_default.gridHighlightIdx = -1;
        updateLocStatus("");
      }
    });
    $("splashGrid").addEventListener("keydown", (e) => {
      const options = $("splashGridDropdown").querySelectorAll(".grid-option");
      if (!$("splashGridDropdown").classList.contains("open") || options.length === 0) {
        if (e.key === "Enter") dismissSplash();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        state_default.gridHighlightIdx = Math.min(state_default.gridHighlightIdx + 1, options.length - 1);
        updateGridHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        state_default.gridHighlightIdx = Math.max(state_default.gridHighlightIdx - 1, 0);
        updateGridHighlight();
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (state_default.gridHighlightIdx >= 0 && options[state_default.gridHighlightIdx]) {
          selectGridSuggestion(options[state_default.gridHighlightIdx].textContent);
        }
      } else if (e.key === "Escape") {
        $("splashGridDropdown").classList.remove("open");
        $("splashGridDropdown").innerHTML = "";
        state_default.gridHighlightIdx = -1;
      }
    });
    $("splashGrid").addEventListener("blur", () => {
      setTimeout(() => {
        $("splashGridDropdown").classList.remove("open");
        $("splashGridDropdown").innerHTML = "";
        state_default.gridHighlightIdx = -1;
      }, 150);
    });
    $("splashLat").addEventListener("keydown", (e) => {
      if (e.key === "Enter") dismissSplash();
    });
    $("splashLon").addEventListener("keydown", (e) => {
      if (e.key === "Enter") dismissSplash();
    });
    $("splashGpsBtn").addEventListener("click", () => {
      state_default.manualLoc = false;
      localStorage.removeItem("hamtab_lat");
      localStorage.removeItem("hamtab_lon");
      $("splashGpsBtn").classList.add("active");
      updateLocStatus("Using GPS");
      if (navigator.geolocation) {
        $("opLoc").textContent = "Locating...";
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            state_default.myLat = pos.coords.latitude;
            state_default.myLon = pos.coords.longitude;
            state_default.syncingFields = true;
            $("splashLat").value = state_default.myLat.toFixed(2);
            $("splashLon").value = state_default.myLon.toFixed(2);
            $("splashGrid").value = latLonToGrid(state_default.myLat, state_default.myLon).substring(0, 4).toUpperCase();
            state_default.syncingFields = false;
            updateOperatorDisplay2();
            centerMapOnUser();
            updateUserMarker();
            updateLocStatus("Using GPS");
          },
          () => {
            updateLocStatus("Location denied", true);
            $("opLoc").textContent = "Location denied";
          },
          { enableHighAccuracy: false, timeout: 1e4 }
        );
      } else {
        updateLocStatus("Geolocation unavailable", true);
      }
    });
    $("splashCallsignLocBtn").addEventListener("click", async () => {
      const call = $("splashCallsign").value.trim().toUpperCase();
      if (!call) {
        updateLocStatus("Enter a callsign first", true);
        return;
      }
      const btn = $("splashCallsignLocBtn");
      btn.disabled = true;
      updateLocStatus("Looking up " + call + "...");
      try {
        const resp = await fetch("/api/callsign/" + encodeURIComponent(call));
        const data = await resp.json();
        if (data.status === "VALID" && data.lat != null && data.lon != null) {
          state_default.syncingFields = true;
          $("splashLat").value = data.lat.toFixed(2);
          $("splashLon").value = data.lon.toFixed(2);
          if (data.grid) {
            $("splashGrid").value = data.grid.substring(0, 4).toUpperCase();
          } else {
            $("splashGrid").value = latLonToGrid(data.lat, data.lon).substring(0, 4).toUpperCase();
          }
          state_default.myLat = data.lat;
          state_default.myLon = data.lon;
          state_default.syncingFields = false;
          state_default.manualLoc = true;
          $("splashGpsBtn").classList.remove("active");
          updateLocStatus("Location set from callsign");
        } else {
          updateLocStatus("No location found for " + call, true);
        }
      } catch {
        updateLocStatus("Lookup failed \u2014 try again", true);
      } finally {
        btn.disabled = false;
      }
    });
    $("splashSaveLayout").addEventListener("click", () => {
      saveUserLayout();
      $("splashLayoutStatus").textContent = "Layout saved";
      $("splashClearLayout").disabled = false;
    });
    $("splashClearLayout").addEventListener("click", () => {
      clearUserLayout();
      $("splashLayoutStatus").textContent = "App default restored";
      $("splashClearLayout").disabled = true;
    });
    const layoutModeFloat = document.getElementById("layoutModeFloat");
    const layoutModeGrid = document.getElementById("layoutModeGrid");
    const gridPermSelect = document.getElementById("gridPermSelect");
    const gridPermSection = document.getElementById("gridPermSection");
    if (layoutModeFloat && layoutModeGrid) {
      layoutModeFloat.addEventListener("change", () => {
        if (gridPermSection) gridPermSection.style.display = "none";
        updateWidgetCellBadges(stagedAssignments);
        updateWidgetSlotEnforcement();
      });
      layoutModeGrid.addEventListener("change", () => {
        if (gridPermSection) gridPermSection.style.display = "";
        if (gridPermSelect) {
          if (!stagedAssignments || Object.keys(stagedAssignments).length === 0) {
            const defaults = GRID_DEFAULT_ASSIGNMENTS[gridPermSelect.value];
            stagedAssignments = defaults ? { ...defaults } : {};
          }
          selectedCell = null;
          renderGridPreview(gridPermSelect.value, stagedAssignments);
        }
        updateWidgetCellBadges(stagedAssignments);
        updateWidgetSlotEnforcement();
      });
    }
    if (gridPermSelect) {
      gridPermSelect.addEventListener("change", () => {
        const newPermId = gridPermSelect.value;
        const defaults = GRID_DEFAULT_ASSIGNMENTS[newPermId];
        stagedAssignments = defaults ? { ...defaults } : {};
        selectedCell = null;
        renderGridPreview(newPermId, stagedAssignments);
        updateWidgetCellBadges(stagedAssignments);
        updateWidgetSlotEnforcement();
      });
    }
    const resetGridBtn = document.getElementById("resetGridBtn");
    if (resetGridBtn) {
      resetGridBtn.addEventListener("click", () => {
        resetGridAssignments();
        const defaults = GRID_DEFAULT_ASSIGNMENTS[state_default.gridPermutation];
        stagedAssignments = defaults ? { ...defaults } : {};
        selectedCell = null;
        renderGridPreview(state_default.gridPermutation, stagedAssignments);
        updateWidgetCellBadges(stagedAssignments);
        updateWidgetSlotEnforcement();
      });
    }
    $("editCallBtn").addEventListener("click", () => {
      showSplash();
    });
    const cfgAutoRefreshCb = $("cfgAutoRefresh");
    if (cfgAutoRefreshCb) {
      cfgAutoRefreshCb.addEventListener("change", () => {
        if (cfgAutoRefreshCb.checked) {
          startAutoRefresh();
        } else {
          stopAutoRefresh();
        }
      });
    }
    const cfgSlimHeaderCb = $("cfgSlimHeader");
    if (cfgSlimHeaderCb) {
      cfgSlimHeaderCb.addEventListener("change", () => {
        state_default.slimHeader = cfgSlimHeaderCb.checked;
        localStorage.setItem("hamtab_slim_header", String(state_default.slimHeader));
        document.body.classList.toggle("slim-header", state_default.slimHeader);
      });
    }
    const cfgGrayscaleCb = $("cfgGrayscale");
    if (cfgGrayscaleCb) {
      cfgGrayscaleCb.addEventListener("change", () => {
        state_default.grayscale = cfgGrayscaleCb.checked;
        localStorage.setItem("hamtab_grayscale", String(state_default.grayscale));
        document.body.classList.toggle("grayscale", state_default.grayscale);
      });
    }
    const cfgDisableWxBgCb = $("cfgDisableWxBg");
    if (cfgDisableWxBgCb) {
      cfgDisableWxBgCb.addEventListener("change", () => {
        state_default.disableWxBackgrounds = cfgDisableWxBgCb.checked;
        localStorage.setItem("hamtab_disable_wx_bg", String(state_default.disableWxBackgrounds));
        const hcl = document.getElementById("headerClockLocal");
        if (hcl) {
          const wxClasses = ["wx-clear-day", "wx-clear-night", "wx-partly-cloudy-day", "wx-partly-cloudy-night", "wx-cloudy", "wx-rain", "wx-thunderstorm", "wx-snow", "wx-fog"];
          if (state_default.disableWxBackgrounds) {
            wxClasses.forEach((c) => hcl.classList.remove(c));
          }
        }
      });
    }
    const bandColorResetBtn = document.getElementById("bandColorResetBtn");
    if (bandColorResetBtn) {
      bandColorResetBtn.addEventListener("click", () => {
        saveBandColors({});
        populateBandColorPickers();
      });
    }
  }
  function populateBandColorPickers() {
    const container = document.getElementById("bandColorPickers");
    if (!container) return;
    container.innerHTML = "";
    const bands = Object.keys(DEFAULT_BAND_COLORS);
    bands.forEach((band) => {
      const row = document.createElement("div");
      row.className = "band-color-row";
      const input = document.createElement("input");
      input.type = "color";
      input.value = getBandColor(band);
      input.dataset.band = band;
      input.addEventListener("input", () => {
        const overrides = getBandColorOverrides();
        if (input.value === DEFAULT_BAND_COLORS[band]) {
          delete overrides[band];
        } else {
          overrides[band] = input.value;
        }
        saveBandColors(overrides);
      });
      const label = document.createElement("label");
      label.textContent = band;
      row.appendChild(input);
      row.appendChild(label);
      container.appendChild(row);
    });
  }
  function renderGridPreview(permId, assignments) {
    const container = document.getElementById("gridPermPreview");
    if (!container) return;
    const perm = getGridPermutation(permId);
    container.innerHTML = "";
    const picker = document.getElementById("gridAssignPicker");
    if (picker) {
      picker.innerHTML = "";
      picker.classList.remove("open");
    }
    const asgn = assignments || stagedAssignments || {};
    const widgetShortMap = {};
    WIDGET_DEFS.forEach((w) => {
      widgetShortMap[w.id] = w.short || w.name.substring(0, 4);
    });
    const spans = permId === state_default.gridPermutation ? state_default.gridSpans || {} : {};
    let areas = perm.areas;
    const allWrappers = [perm.left, perm.right, perm.top, perm.bottom];
    const absorbed = /* @__PURE__ */ new Set();
    for (const wrapperCells of allWrappers) {
      for (let i = 0; i < wrapperCells.length; i++) {
        const span = spans[wrapperCells[i]] || 1;
        for (let s = 1; s < span && i + s < wrapperCells.length; s++) {
          const absCell = wrapperCells[i + s];
          areas = areas.replace(new RegExp("\\b" + absCell + "\\b", "g"), wrapperCells[i]);
          absorbed.add(absCell);
        }
      }
    }
    container.style.gridTemplateAreas = areas;
    container.style.gridTemplateColumns = perm.columns;
    container.style.gridTemplateRows = perm.rows;
    const mapCell = document.createElement("div");
    mapCell.className = "grid-preview-cell grid-preview-map";
    mapCell.style.gridArea = "map";
    mapCell.textContent = "MAP";
    container.appendChild(mapCell);
    perm.cellNames.forEach((name) => {
      if (absorbed.has(name)) return;
      const cell = document.createElement("div");
      const span = spans[name] || 1;
      const isSpanned = span > 1;
      cell.className = "grid-preview-cell grid-preview-assignable" + (isSpanned ? " grid-preview-spanned" : "") + (selectedCell === name ? " grid-preview-selected" : "");
      cell.style.gridArea = name;
      const nameEl = document.createElement("span");
      nameEl.className = "cell-name";
      nameEl.textContent = isSpanned ? `${name} (+${span - 1})` : name;
      cell.appendChild(nameEl);
      const widgetEl = document.createElement("span");
      widgetEl.className = "cell-widget";
      const widgetId = asgn[name];
      widgetEl.textContent = widgetId ? widgetShortMap[widgetId] || "\u2014" : "\u2014";
      cell.appendChild(widgetEl);
      cell.addEventListener("click", () => {
        if (selectedCell === name) {
          selectedCell = null;
          renderGridPreview(permId, asgn);
        } else {
          selectedCell = name;
          renderGridPreview(permId, asgn);
          renderAssignmentPicker(name, asgn, permId);
        }
      });
      container.appendChild(cell);
    });
  }
  function renderAssignmentPicker(cellName, assignments, permId) {
    const picker = document.getElementById("gridAssignPicker");
    if (!picker) return;
    picker.innerHTML = "";
    const asgn = assignments || stagedAssignments;
    const currentWidgetId = asgn[cellName] || null;
    const widgetList = document.getElementById("splashWidgetList");
    const enabledWidgets = [];
    if (widgetList) {
      widgetList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        if (cb.dataset.widgetId !== "widget-map" && cb.checked) {
          const def = WIDGET_DEFS.find((w) => w.id === cb.dataset.widgetId);
          if (def) enabledWidgets.push(def);
        }
      });
    }
    const reverseMap = {};
    for (const [cell, wid] of Object.entries(asgn)) {
      if (wid) reverseMap[wid] = cell;
    }
    const emptyOpt = document.createElement("div");
    emptyOpt.className = "assign-option" + (!currentWidgetId ? " assign-current" : "");
    emptyOpt.textContent = "(Empty)";
    emptyOpt.addEventListener("click", () => {
      delete asgn[cellName];
      selectedCell = null;
      renderGridPreview(permId, asgn);
      updateWidgetCellBadges(asgn);
      picker.innerHTML = "";
      picker.classList.remove("open");
    });
    picker.appendChild(emptyOpt);
    enabledWidgets.forEach((w) => {
      const opt = document.createElement("div");
      opt.className = "assign-option" + (currentWidgetId === w.id ? " assign-current" : "");
      const nameSpan = document.createElement("span");
      nameSpan.textContent = w.name;
      opt.appendChild(nameSpan);
      if (reverseMap[w.id] && reverseMap[w.id] !== cellName) {
        const hint = document.createElement("span");
        hint.className = "assign-hint";
        hint.textContent = reverseMap[w.id];
        opt.appendChild(hint);
      }
      opt.addEventListener("click", () => {
        const oldCell = reverseMap[w.id] || null;
        const displaced = asgn[cellName] || null;
        asgn[cellName] = w.id;
        if (oldCell && oldCell !== cellName) {
          if (displaced) {
            asgn[oldCell] = displaced;
          } else {
            delete asgn[oldCell];
          }
        }
        selectedCell = null;
        renderGridPreview(permId, asgn);
        updateWidgetCellBadges(asgn);
        picker.innerHTML = "";
        picker.classList.remove("open");
      });
      picker.appendChild(opt);
    });
    picker.classList.add("open");
  }
  function updateWidgetCellBadges(assignments) {
    const widgetList = document.getElementById("splashWidgetList");
    if (!widgetList) return;
    const floatRadio = document.getElementById("layoutModeFloat");
    const isGrid = floatRadio ? !floatRadio.checked : false;
    widgetList.querySelectorAll(".widget-cell-badge").forEach((b) => b.remove());
    if (!isGrid) return;
    const asgn = assignments || stagedAssignments || {};
    const reverseMap = {};
    for (const [cell, wid] of Object.entries(asgn)) {
      if (wid) reverseMap[wid] = cell;
    }
    widgetList.querySelectorAll("label").forEach((label) => {
      const cb = label.querySelector('input[type="checkbox"]');
      if (!cb || cb.dataset.widgetId === "widget-map") return;
      const cell = reverseMap[cb.dataset.widgetId];
      if (cell) {
        const badge = document.createElement("span");
        badge.className = "widget-cell-badge";
        badge.textContent = `[${cell}]`;
        label.appendChild(badge);
      }
    });
  }
  function onWidgetCheckboxChange(widgetId, checked) {
    const floatRadio = document.getElementById("layoutModeFloat");
    const isGrid = floatRadio ? !floatRadio.checked : false;
    if (!isGrid || widgetId === "widget-map") return;
    const permSelect = document.getElementById("gridPermSelect");
    const permId = permSelect ? permSelect.value : state_default.gridPermutation;
    const perm = getGridPermutation(permId);
    if (!checked) {
      for (const [cell, wid] of Object.entries(stagedAssignments)) {
        if (wid === widgetId) {
          delete stagedAssignments[cell];
          break;
        }
      }
    } else {
      const spans = permId === state_default.gridPermutation ? state_default.gridSpans || {} : {};
      const allWrappers = [perm.left, perm.right, perm.top, perm.bottom];
      const absorbed = /* @__PURE__ */ new Set();
      for (const wrapperCells of allWrappers) {
        for (let i = 0; i < wrapperCells.length; i++) {
          const span = spans[wrapperCells[i]] || 1;
          for (let s = 1; s < span && i + s < wrapperCells.length; s++) {
            absorbed.add(wrapperCells[i + s]);
          }
        }
      }
      for (const cellName of perm.cellNames) {
        if (absorbed.has(cellName)) continue;
        if (!stagedAssignments[cellName]) {
          stagedAssignments[cellName] = widgetId;
          break;
        }
      }
    }
    selectedCell = null;
    renderGridPreview(permId, stagedAssignments);
    updateWidgetCellBadges(stagedAssignments);
  }

  // src/config.js
  init_state();
  init_dom();
  init_constants();
  init_solar();
  init_lunar();
  init_map_overlays();
  init_markers();
  init_spots();
  function initConfigListeners() {
    $("solarCfgBtn").addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    $("solarCfgBtn").addEventListener("click", () => {
      const solarFieldList = $("solarFieldList");
      solarFieldList.innerHTML = "";
      SOLAR_FIELD_DEFS.forEach((f) => {
        const label = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.fieldKey = f.key;
        cb.checked = state_default.solarFieldVisibility[f.key] !== false;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(f.label));
        solarFieldList.appendChild(label);
      });
      $("solarCfgSplash").classList.remove("hidden");
    });
    $("solarCfgOk").addEventListener("click", () => {
      $("solarFieldList").querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        state_default.solarFieldVisibility[cb.dataset.fieldKey] = cb.checked;
      });
      saveSolarFieldVisibility();
      $("solarCfgSplash").classList.add("hidden");
      if (state_default.lastSolarData) renderSolar(state_default.lastSolarData);
    });
    $("lunarCfgBtn").addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    $("lunarCfgBtn").addEventListener("click", () => {
      const lunarFieldList = $("lunarFieldList");
      lunarFieldList.innerHTML = "";
      LUNAR_FIELD_DEFS.forEach((f) => {
        const label = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.fieldKey = f.key;
        cb.checked = state_default.lunarFieldVisibility[f.key] !== false;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(f.label));
        lunarFieldList.appendChild(label);
      });
      $("lunarCfgSplash").classList.remove("hidden");
    });
    $("lunarCfgOk").addEventListener("click", () => {
      $("lunarFieldList").querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        state_default.lunarFieldVisibility[cb.dataset.fieldKey] = cb.checked;
      });
      saveLunarFieldVisibility();
      $("lunarCfgSplash").classList.add("hidden");
      if (state_default.lastLunarData) renderLunar(state_default.lastLunarData);
    });
    const mapOverlayCfgBtn = $("mapOverlayCfgBtn");
    const mapOverlayCfgSplash = $("mapOverlayCfgSplash");
    const mapOverlayCfgOk = $("mapOverlayCfgOk");
    if (mapOverlayCfgBtn) {
      mapOverlayCfgBtn.addEventListener("mousedown", (e) => {
        e.stopPropagation();
      });
      mapOverlayCfgBtn.addEventListener("click", () => {
        $("mapOvLatLon").checked = state_default.mapOverlays.latLonGrid;
        $("mapOvMaidenhead").checked = state_default.mapOverlays.maidenheadGrid;
        $("mapOvTimezone").checked = state_default.mapOverlays.timezoneGrid;
        $("mapOvMufImage").checked = state_default.mapOverlays.mufImageOverlay;
        $("mapOvDrap").checked = state_default.mapOverlays.drapOverlay;
        $("mapOvBandPaths").checked = state_default.mapOverlays.bandPaths;
        $("mapOvDxpedMarkers").checked = state_default.mapOverlays.dxpedMarkers;
        $("mapOvTropics").checked = state_default.mapOverlays.tropicsLines;
        $("mapOvWeatherRadar").checked = state_default.mapOverlays.weatherRadar;
        $("mapOvCloudCover").checked = state_default.mapOverlays.cloudCover;
        $("mapOvLegend").checked = state_default.mapOverlays.symbolLegend;
        mapOverlayCfgSplash.classList.remove("hidden");
      });
    }
    if (mapOverlayCfgOk) {
      mapOverlayCfgOk.addEventListener("click", () => {
        state_default.mapOverlays.latLonGrid = $("mapOvLatLon").checked;
        state_default.mapOverlays.maidenheadGrid = $("mapOvMaidenhead").checked;
        state_default.mapOverlays.timezoneGrid = $("mapOvTimezone").checked;
        state_default.mapOverlays.mufImageOverlay = $("mapOvMufImage").checked;
        state_default.mapOverlays.drapOverlay = $("mapOvDrap").checked;
        state_default.mapOverlays.bandPaths = $("mapOvBandPaths").checked;
        state_default.mapOverlays.dxpedMarkers = $("mapOvDxpedMarkers").checked;
        state_default.mapOverlays.tropicsLines = $("mapOvTropics").checked;
        state_default.mapOverlays.weatherRadar = $("mapOvWeatherRadar").checked;
        state_default.mapOverlays.cloudCover = $("mapOvCloudCover").checked;
        state_default.mapOverlays.symbolLegend = $("mapOvLegend").checked;
        saveMapOverlays();
        mapOverlayCfgSplash.classList.add("hidden");
        renderAllMapOverlays();
        renderMarkers();
        renderDxpeditions();
      });
    }
    $("spotColCfgBtn").addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    $("spotColCfgBtn").addEventListener("click", () => {
      const fieldList = $("spotColFieldList");
      fieldList.innerHTML = "";
      SOURCE_DEFS[state_default.currentSource].columns.forEach((col) => {
        const label = document.createElement("label");
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.fieldKey = col.key;
        cb.checked = state_default.spotColumnVisibility[col.key] !== false;
        label.appendChild(cb);
        label.appendChild(document.createTextNode(col.label));
        fieldList.appendChild(label);
      });
      $("spotColCfgSplash").classList.remove("hidden");
    });
    $("spotColCfgOk").addEventListener("click", () => {
      $("spotColFieldList").querySelectorAll('input[type="checkbox"]').forEach((cb) => {
        state_default.spotColumnVisibility[cb.dataset.fieldKey] = cb.checked;
      });
      saveSpotColumnVisibility();
      $("spotColCfgSplash").classList.add("hidden");
      updateTableColumns();
      renderSpots();
    });
  }

  // src/update.js
  init_state();
  init_dom();
  init_utils();
  async function checkUpdateStatus() {
    try {
      const resp = await fetch("/api/update/status");
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.available && data.latestVersion) {
        $("updateDot").className = "update-dot green";
        $("updateLabel").textContent = `v${data.latestVersion} available`;
        state_default.updateReleaseUrl = data.releaseUrl || null;
      } else {
        $("updateDot").className = "update-dot gray";
        $("updateLabel").textContent = data.lastCheck ? "Checked " + fmtTime(new Date(data.lastCheck), { hour: "2-digit", minute: "2-digit" }) : "No updates";
        state_default.updateReleaseUrl = null;
      }
    } catch (e) {
    }
  }
  function startUpdateStatusPolling() {
    if (state_default.updateStatusPolling) clearInterval(state_default.updateStatusPolling);
    checkUpdateStatus();
    state_default.updateStatusPolling = setInterval(checkUpdateStatus, 3e4);
  }
  function pollForServer(attempts) {
    if (attempts <= 0) {
      $("updateLabel").textContent = "Server did not come back";
      $("updateDot").className = "update-dot red";
      return;
    }
    setTimeout(() => {
      fetch("/api/spots").then((resp) => {
        if (resp.ok) {
          $("updateLabel").textContent = "Reloading...";
          location.reload();
        } else {
          pollForServer(attempts - 1);
        }
      }).catch(() => {
        pollForServer(attempts - 1);
      });
    }, 1e3);
  }
  function sendUpdateInterval() {
    const saved = localStorage.getItem("hamtab_update_interval");
    if (saved) {
      fetch("/api/update/interval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seconds: parseInt(saved, 10) })
      }).catch(() => {
      });
    }
  }
  function initUpdateListeners() {
    $("updateIndicator").addEventListener("click", () => {
      if ($("updateDot").classList.contains("green") && state_default.updateReleaseUrl) {
        window.open(state_default.updateReleaseUrl, "_blank", "noopener");
      }
    });
    $("restartBtn").addEventListener("click", async (e) => {
      e.stopPropagation();
      $("restartBtn").classList.add("hidden");
      $("updateDot").className = "update-dot yellow";
      $("updateLabel").textContent = "Restarting...";
      try {
        await fetch("/api/restart", { method: "POST" });
      } catch {
      }
      pollForServer(30);
    });
  }

  // src/fullscreen.js
  init_state();
  init_dom();
  function initFullscreenListeners() {
    const fullscreenBtn = $("fullscreenBtn");
    function toggleFullscreen() {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        document.documentElement.requestFullscreen();
      }
    }
    fullscreenBtn.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", () => {
      fullscreenBtn.textContent = document.fullscreenElement ? "Exit Fullscreen" : "Fullscreen";
      if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 100);
    });
  }

  // src/main.js
  init_solar();
  init_spots();
  init_spot_detail();
  init_band_conditions();

  // src/help.js
  init_dom();
  init_constants();
  init_utils();
  init_state();
  function renderHelp(widgetId) {
    let helpKey = widgetId;
    if (widgetId === "widget-rst" && state_default.currentReferenceTab && state_default.currentReferenceTab !== "rst") {
      const tabKey = `widget-rst:${state_default.currentReferenceTab}`;
      if (WIDGET_HELP[tabKey]) helpKey = tabKey;
    }
    const help = WIDGET_HELP[helpKey];
    if (!help) return;
    $("helpTitle").textContent = help.title;
    let html = "";
    if (help.description) {
      html += `<div class="help-description">${esc(help.description)}</div>`;
    }
    if (help.sections && help.sections.length > 0) {
      help.sections.forEach((section) => {
        html += `<div class="help-section">`;
        html += `<h3>${esc(section.heading)}</h3>`;
        html += `<p>${esc(section.content)}</p>`;
        html += `</div>`;
      });
    }
    if (help.links && help.links.length > 0) {
      html += `<div class="help-links">`;
      html += `<h3>Learn More</h3>`;
      help.links.forEach((link) => {
        html += `<a href="${esc(link.url)}" target="_blank" rel="noopener">${esc(link.label)}</a>`;
      });
      html += `</div>`;
    }
    $("helpContent").innerHTML = html;
    $("helpSplash").classList.remove("hidden");
  }
  function initHelpListeners() {
    document.querySelectorAll(".widget-help-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const widgetId = btn.dataset.widget;
        renderHelp(widgetId);
      });
    });
    $("helpOk").addEventListener("click", () => {
      $("helpSplash").classList.add("hidden");
    });
    $("helpSplash").addEventListener("click", (e) => {
      if (e.target.id === "helpSplash") {
        $("helpSplash").classList.add("hidden");
      }
    });
  }

  // src/reference.js
  init_dom();
  init_constants();
  init_utils();
  init_state();

  // src/bandref.js
  init_state();
  init_dom();
  init_constants();
  init_filters();
  function renderBandRefTab() {
    const hasClass = isUSCallsign(state_default.myCallsign) && !!state_default.licenseClass;
    const savedPref = localStorage.getItem("hamtab_bandref_mypriv");
    const myPrivOnly = hasClass && savedPref !== "false";
    const MODE_LABELS = { all: "All", cw: "CW", cwdig: "CW/Digital", phone: "Phone" };
    const CLASS_DISPLAY = { EXTRA: "Extra", GENERAL: "General", TECHNICIAN: "Technician", NOVICE: "Novice" };
    let classesToShow;
    if (myPrivOnly && hasClass) {
      classesToShow = [state_default.licenseClass.toUpperCase()];
    } else {
      classesToShow = ["EXTRA", "GENERAL", "TECHNICIAN", "NOVICE"];
    }
    let html = `<label class="band-ref-inline-filter"><input type="checkbox" id="bandRefMyPriv" ${myPrivOnly ? "checked" : ""} ${!hasClass ? "disabled" : ""} /> My privileges only</label>`;
    for (const cls of classesToShow) {
      const privs = US_PRIVILEGES[cls];
      if (!privs) continue;
      html += `<h3>${CLASS_DISPLAY[cls] || cls}</h3>`;
      html += '<table class="band-ref-table"><thead><tr><th>Band</th><th>Frequency Range (MHz)</th><th>Modes</th></tr></thead><tbody>';
      for (const [lo, hi, modes] of privs) {
        const band = freqToBand(String(lo)) || "?";
        html += `<tr><td>${band}</td><td>${lo} \u2013 ${hi}</td><td>${MODE_LABELS[modes] || modes}</td></tr>`;
      }
      html += "</tbody></table>";
    }
    $("referenceContent").innerHTML = html;
    const checkbox = document.getElementById("bandRefMyPriv");
    if (checkbox) {
      checkbox.addEventListener("change", () => {
        localStorage.setItem("hamtab_bandref_mypriv", checkbox.checked ? "true" : "false");
        renderBandRefTab();
      });
    }
  }

  // src/reference.js
  function switchReferenceTab(tab) {
    if (!REFERENCE_TABS[tab]) return;
    state_default.currentReferenceTab = tab;
    localStorage.setItem("hamtab_reference_tab", tab);
    document.querySelectorAll(".reference-tab").forEach((btn) => {
      if (btn.dataset.refTab === tab) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    renderReferenceContent(tab);
  }
  function renderReferenceContent(tab) {
    const refData = REFERENCE_TABS[tab];
    if (!refData) return;
    if (refData.custom) {
      if (tab === "bands") renderBandRefTab();
      return;
    }
    const content = refData.content;
    let html = "";
    if (content.description) {
      html += `<div class="ref-description">${esc(content.description)}</div>`;
    }
    if (content.table) {
      html += `<table class="ref-table">`;
      html += `<thead><tr>`;
      content.table.headers.forEach((header) => {
        html += `<th>${esc(header)}</th>`;
      });
      html += `</tr></thead>`;
      html += `<tbody>`;
      content.table.rows.forEach((row) => {
        html += `<tr>`;
        row.forEach((cell) => {
          html += `<td>${esc(cell)}</td>`;
        });
        html += `</tr>`;
      });
      html += `</tbody>`;
      html += `</table>`;
    }
    if (content.note) {
      html += `<div class="ref-note">${esc(content.note)}</div>`;
    }
    if (content.link) {
      html += `<div class="ref-note"><a href="${esc(content.link.url)}" target="_blank" rel="noopener">${esc(content.link.text)}</a></div>`;
    }
    $("referenceContent").innerHTML = html;
  }
  function initReferenceListeners() {
    const savedTab = localStorage.getItem("hamtab_reference_tab") || DEFAULT_REFERENCE_TAB;
    state_default.currentReferenceTab = savedTab;
    document.querySelectorAll(".reference-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        switchReferenceTab(btn.dataset.refTab);
      });
    });
    switchReferenceTab(savedTab);
  }

  // src/feedback.js
  init_dom();
  var formOpenTime = 0;
  var EMAIL_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsMluvnUJ2MW0r2KQIqZF
MjdGDYqGib2b4eUcoLZjaRCfTr6gPZBFEAgb5o9xWrJ/eoAMUbNU3DY+iu0OhmIH
ZpCDB1jUHm5Lzy8YPkTLtZ8323FNUdMOyOoH59+oYxabZLZoHHtDF4y1uwIL6TFM
d87aR9tHibSG8qUhpBnbqplxRbrkDolRw8hAWsCl9W3tMsLYd7rAKXRQRbR+zUuK
ckjhF//MaPhf4OA1DPeXhzNEN/jCVe16FkqiHR+3TDAZUf76RpBV/Rr+XUE4oV4B
r6IHztIUIH85apHFFGAZkhMtrqHbhc8Er26EILCCHl/7vGS0dfj9WyT1urWcrRbu
8wIDAQAB
-----END PUBLIC KEY-----`;
  async function encryptEmail(email) {
    if (!email || !email.trim()) return "";
    try {
      const publicKeyData = EMAIL_PUBLIC_KEY.replace("-----BEGIN PUBLIC KEY-----", "").replace("-----END PUBLIC KEY-----", "").replace(/\s/g, "");
      const binaryKey = Uint8Array.from(atob(publicKeyData), (c) => c.charCodeAt(0));
      const publicKey = await crypto.subtle.importKey(
        "spki",
        binaryKey,
        { name: "RSA-OAEP", hash: "SHA-256" },
        false,
        ["encrypt"]
      );
      const encoder = new TextEncoder();
      const emailData = encoder.encode(email.trim());
      const encryptedBuffer = await crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        publicKey,
        emailData
      );
      const encryptedArray = new Uint8Array(encryptedBuffer);
      return btoa(String.fromCharCode(...encryptedArray));
    } catch (err) {
      console.error("Email encryption failed:", err);
      return "";
    }
  }
  function openFeedback() {
    $("feedbackSplash").classList.remove("hidden");
    $("feedbackForm").reset();
    $("feedbackStatus").classList.add("hidden");
    $("feedbackCharCount").textContent = "0";
    $("feedbackSubmit").disabled = false;
    formOpenTime = Date.now();
    $("feedbackMessage").focus();
  }
  function closeFeedback() {
    $("feedbackSplash").classList.add("hidden");
  }
  function updateCharCount() {
    const textarea = $("feedbackMessage");
    const count = textarea.value.length;
    $("feedbackCharCount").textContent = count;
  }
  function showStatus(message, type) {
    const status = $("feedbackStatus");
    status.textContent = message;
    status.className = "feedback-status " + type;
  }
  function showStatusWithLink(message, url, linkText) {
    const status = $("feedbackStatus");
    status.innerHTML = "";
    status.appendChild(document.createTextNode(message));
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = linkText;
    link.style.color = "var(--accent)";
    status.appendChild(link);
    status.className = "feedback-status error";
  }
  async function submitFeedback(e) {
    e.preventDefault();
    const submitBtn = $("feedbackSubmit");
    const form = $("feedbackForm");
    const formData = new FormData(form);
    const emailRaw = formData.get("email") || "";
    const emailEncrypted = emailRaw ? await encryptEmail(emailRaw) : "";
    const data = {
      name: formData.get("name") || "",
      email: emailEncrypted,
      // encrypted email or empty string
      feedback: formData.get("feedback") || "",
      website: formData.get("website") || ""
      // honeypot
    };
    if (data.feedback.length < 10) {
      showStatus("Feedback must be at least 10 characters", "error");
      return;
    }
    if (data.feedback.length > 5e3) {
      showStatus("Feedback must be less than 5000 characters", "error");
      return;
    }
    const timeSinceOpen = Date.now() - formOpenTime;
    if (timeSinceOpen < 3e3) {
      showStatus("Please take a moment to review your feedback", "error");
      return;
    }
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending...";
    showStatus("Sending your feedback...", "success");
    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      const result = await response.json();
      if (response.ok) {
        showStatus("Thank you! Your feedback has been submitted successfully.", "success");
        form.reset();
        updateCharCount();
        setTimeout(closeFeedback, 2e3);
      } else if (response.status === 503) {
        showStatusWithLink(
          "Feedback system temporarily unavailable. Please submit directly: ",
          "https://github.com/stevencheist/HamTabv1/issues/new",
          "Create GitHub Issue"
        );
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Feedback";
      } else {
        showStatus(result.error || "Failed to submit feedback. Please try again.", "error");
        submitBtn.disabled = false;
        submitBtn.textContent = "Send Feedback";
      }
    } catch (err) {
      console.error("Feedback submission error:", err);
      showStatus("Network error. Please check your connection and try again.", "error");
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Feedback";
    }
  }
  function initFeedbackListeners() {
    const feedbackBtn = $("feedbackBtn");
    const feedbackCancel = $("feedbackCancel");
    const feedbackForm = $("feedbackForm");
    const feedbackMessage = $("feedbackMessage");
    const feedbackSplash = $("feedbackSplash");
    feedbackBtn.addEventListener("click", openFeedback);
    feedbackCancel.addEventListener("click", closeFeedback);
    feedbackSplash.addEventListener("click", (e) => {
      if (e.target === feedbackSplash) closeFeedback();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !feedbackSplash.classList.contains("hidden")) {
        closeFeedback();
      }
    });
    feedbackMessage.addEventListener("input", updateCharCount);
    feedbackForm.addEventListener("submit", submitFeedback);
  }

  // src/main.js
  init_voacap();
  init_rel_heatmap();
  init_beacons();
  init_dedx_info();

  // src/big-clock.js
  init_state();
  init_dom();
  init_utils();
  var active = false;
  function fmtDate(date, options) {
    return date.toLocaleDateString(void 0, Object.assign({
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric"
    }, options || {}));
  }
  function updateBigClock() {
    if (!active) return;
    const now = /* @__PURE__ */ new Date();
    const localEl = $("bigClockLocal");
    const utcEl = $("bigClockUtc");
    const dateEl = $("bigClockDate");
    const utcDateEl = $("bigClockUtcDate");
    if (localEl) localEl.textContent = fmtTime(now);
    if (utcEl) utcEl.textContent = fmtTime(now, { timeZone: "UTC" });
    if (dateEl) dateEl.textContent = fmtDate(now);
    if (utcDateEl) utcDateEl.textContent = fmtDate(now, { timeZone: "UTC" });
  }
  function show() {
    const overlay = $("bigClockOverlay");
    if (!overlay) return;
    active = true;
    overlay.classList.remove("hidden");
    updateBigClock();
  }
  function hide() {
    const overlay = $("bigClockOverlay");
    if (!overlay) return;
    active = false;
    overlay.classList.add("hidden");
  }
  function toggleBigClock() {
    if (active) hide();
    else show();
  }
  function initBigClock() {
    const clockGroup = $("headerClockLocal");
    const clockUtc = $("headerClockUtc");
    if (clockGroup) clockGroup.addEventListener("click", toggleBigClock);
    if (clockUtc) clockUtc.addEventListener("click", toggleBigClock);
    const overlay = $("bigClockOverlay");
    if (overlay) {
      overlay.addEventListener("click", hide);
      const inner = overlay.querySelector(".big-clock-inner");
      if (inner) inner.addEventListener("click", (e) => e.stopPropagation());
    }
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && active) hide();
    });
  }

  // src/stopwatch.js
  init_state();
  init_dom();
  init_widgets();
  var mode = "stopwatch";
  var running = false;
  var startTime = 0;
  var elapsed = 0;
  var countdownTotal = 0;
  var laps = [];
  var alertFired = false;
  function initStopwatchListeners() {
    const tabSw = $("swTabStopwatch");
    const tabCd = $("swTabCountdown");
    const startBtn = $("swStart");
    const stopBtn = $("swStop");
    const resetBtn = $("swReset");
    const lapBtn = $("swLap");
    if (!tabSw) return;
    tabSw.addEventListener("click", () => switchMode("stopwatch"));
    tabCd.addEventListener("click", () => switchMode("countdown"));
    startBtn.addEventListener("click", startTimer);
    stopBtn.addEventListener("click", stopTimer);
    resetBtn.addEventListener("click", resetTimer);
    lapBtn.addEventListener("click", recordLap);
    const presets = document.querySelectorAll(".sw-preset");
    presets.forEach((btn) => {
      btn.addEventListener("click", () => {
        const min = parseInt(btn.dataset.minutes, 10);
        if (!isNaN(min) && min > 0) {
          countdownTotal = min * 60 * 1e3;
          elapsed = countdownTotal;
          renderDisplay();
        }
      });
    });
  }
  function switchMode(newMode) {
    if (running) stopTimer();
    mode = newMode;
    elapsed = 0;
    countdownTotal = 0;
    laps = [];
    alertFired = false;
    const tabSw = $("swTabStopwatch");
    const tabCd = $("swTabCountdown");
    const cdSet = $("swCountdownSet");
    const lapBtn = $("swLap");
    tabSw.classList.toggle("active", mode === "stopwatch");
    tabCd.classList.toggle("active", mode === "countdown");
    cdSet.classList.toggle("hidden", mode !== "countdown");
    lapBtn.classList.toggle("hidden", mode !== "stopwatch");
    renderDisplay();
    renderLaps();
  }
  function startTimer() {
    if (running) return;
    if (mode === "countdown" && countdownTotal === 0) return;
    running = true;
    alertFired = false;
    if (mode === "stopwatch") {
      startTime = Date.now() - elapsed;
    } else {
      startTime = Date.now();
    }
    state_default.stopwatchTimer = setInterval(tick, 100);
  }
  function stopTimer() {
    running = false;
    if (state_default.stopwatchTimer) {
      clearInterval(state_default.stopwatchTimer);
      state_default.stopwatchTimer = null;
    }
  }
  function resetTimer() {
    stopTimer();
    elapsed = mode === "countdown" ? countdownTotal : 0;
    laps = [];
    alertFired = false;
    renderDisplay();
    renderLaps();
  }
  function recordLap() {
    if (!running || mode !== "stopwatch") return;
    laps.push(elapsed);
    renderLaps();
  }
  function tick() {
    if (!isWidgetVisible("widget-stopwatch")) return;
    if (mode === "stopwatch") {
      elapsed = Date.now() - startTime;
    } else {
      const elapsedSince = Date.now() - startTime;
      elapsed = Math.max(0, countdownTotal - elapsedSince);
      if (elapsed === 0 && !alertFired) {
        alertFired = true;
        stopTimer();
        flashDisplay();
      }
    }
    renderDisplay();
  }
  function flashDisplay() {
    const display = $("swDisplay");
    if (!display) return;
    display.classList.add("sw-flash");
    setTimeout(() => display.classList.remove("sw-flash"), 3e3);
  }
  function renderDisplay() {
    const display = $("swDisplay");
    if (!display) return;
    const ms = Math.abs(elapsed);
    const totalSec = Math.floor(ms / 1e3);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor(totalSec % 3600 / 60);
    const s = totalSec % 60;
    const tenths = Math.floor(ms % 1e3 / 100);
    if (h > 0) {
      display.textContent = `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${tenths}`;
    } else {
      display.textContent = `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${tenths}`;
    }
  }
  function renderLaps() {
    const container = $("swLaps");
    if (!container) return;
    if (laps.length === 0) {
      container.innerHTML = "";
      return;
    }
    let html = "";
    for (let i = laps.length - 1; i >= 0; i--) {
      const lapMs = i === 0 ? laps[0] : laps[i] - laps[i - 1];
      const lapSec = Math.floor(lapMs / 1e3);
      const lapM = Math.floor(lapSec / 60);
      const lapS = lapSec % 60;
      const lapT = Math.floor(lapMs % 1e3 / 100);
      html += `<div class="sw-lap-row"><span class="sw-lap-num">${i + 1}</span><span class="sw-lap-time">${String(lapM).padStart(2, "0")}:${String(lapS).padStart(2, "0")}.${lapT}</span></div>`;
    }
    container.innerHTML = html;
  }
  function getStopwatchElapsed() {
    return elapsed;
  }
  function getStopwatchRunning() {
    return running;
  }
  function getStopwatchMode() {
    return mode;
  }

  // src/analog-clock.js
  init_state();
  init_widgets();
  init_geo();

  // src/clock-faces.js
  var NS = "http://www.w3.org/2000/svg";
  var CX = 100;
  var CY = 100;
  var R = 88;
  var ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
  var CLOCK_FACES = {
    classic: {
      id: "classic",
      name: "Classic",
      ticks: { minor: true, major: true, majorWidth: 2, minorWidth: 1, majorLength: 10, minorLength: 5 },
      labels: { type: "arabic", fontSize: 12, radius: R - 18 },
      hands: {
        hour: { length: 50, width: 4, tail: 0 },
        minute: { length: 70, width: 2.5, tail: 0 },
        second: { length: 78, width: 1, tail: 12, color: "var(--accent)" }
      },
      centerDot: { radius: 3.5, color: "var(--accent)" },
      dateWindow: { show: true, y: 130, fontSize: 11 },
      extras: null
    },
    minimal: {
      id: "minimal",
      name: "Minimal",
      ticks: { minor: false, major: false },
      labels: { type: "indices", fontSize: 0, radius: R - 10 },
      hands: {
        hour: { length: 48, width: 5, tail: 0 },
        minute: { length: 68, width: 2, tail: 0 },
        second: { length: 76, width: 0.8, tail: 10, color: "var(--accent)" }
      },
      centerDot: { radius: 3, color: "var(--accent)" },
      dateWindow: { show: false },
      extras: null
    },
    roman: {
      id: "roman",
      name: "Roman",
      ticks: { minor: true, major: true, majorWidth: 2, minorWidth: 1, majorLength: 8, minorLength: 4 },
      labels: { type: "roman", fontSize: 11, radius: R - 18 },
      hands: {
        hour: { length: 48, width: 4, tail: 0 },
        minute: { length: 68, width: 2.5, tail: 0 },
        second: { length: 76, width: 1, tail: 12, color: "var(--accent)" }
      },
      centerDot: { radius: 3.5, color: "var(--accent)" },
      dateWindow: { show: true, y: 130, fontSize: 10 },
      extras: null
    },
    pilot: {
      id: "pilot",
      name: "Pilot",
      ticks: { minor: true, major: true, majorWidth: 3, minorWidth: 1, majorLength: 10, minorLength: 5 },
      labels: { type: "indices", fontSize: 0, radius: R - 10 },
      hands: {
        hour: { length: 46, width: 5, tail: 0 },
        minute: { length: 68, width: 3, tail: 0 },
        second: { length: 76, width: 1, tail: 14, color: "var(--accent)" }
      },
      centerDot: { radius: 4, color: "var(--accent)" },
      dateWindow: { show: true, y: 130, fontSize: 10 },
      extras: "pilotTriangle"
    },
    railroad: {
      id: "railroad",
      name: "Railroad",
      ticks: { minor: true, major: true, majorWidth: 2.5, minorWidth: 1, majorLength: 10, minorLength: 6 },
      labels: { type: "arabic", fontSize: 11, radius: R - 20 },
      hands: {
        hour: { length: 46, width: 4, tail: 0 },
        minute: { length: 66, width: 2.5, tail: 0 },
        second: { length: 74, width: 1, tail: 12, color: "var(--accent)" }
      },
      centerDot: { radius: 3.5, color: "var(--accent)" },
      dateWindow: { show: true, y: 130, fontSize: 10 },
      extras: "doubleTrack"
    },
    digitalHybrid: {
      id: "digitalHybrid",
      name: "Digital",
      ticks: { minor: false, major: true, majorWidth: 2, minorWidth: 0, majorLength: 8, minorLength: 0 },
      labels: { type: "arabic", fontSize: 10, radius: R - 16 },
      hands: {
        hour: { length: 48, width: 4, tail: 0 },
        minute: { length: 68, width: 2.5, tail: 0 },
        second: { length: 76, width: 1, tail: 12, color: "var(--accent)" }
      },
      centerDot: { radius: 3, color: "var(--accent)" },
      dateWindow: { show: false },
      extras: "digitalReadout"
    }
  };
  function makeSvg(tag, attrs) {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }
  function buildFaceSvg(svg, faceId, complications) {
    const face = CLOCK_FACES[faceId] || CLOCK_FACES.classic;
    svg.innerHTML = "";
    svg.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: R, fill: "var(--surface)", stroke: "var(--border)", "stroke-width": 2 }));
    if (face.extras === "doubleTrack") {
      svg.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: R - 2, fill: "none", stroke: "var(--text-dim)", "stroke-width": 0.5 }));
      svg.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: R - 12, fill: "none", stroke: "var(--text-dim)", "stroke-width": 0.5 }));
    }
    const arc = makeSvg("path", { d: "", fill: "rgba(255,193,7,0.25)", stroke: "none" });
    svg.appendChild(arc);
    if (face.ticks.major || face.ticks.minor) {
      for (let i = 0; i < 60; i++) {
        const isMajor = i % 5 === 0;
        if (!isMajor && !face.ticks.minor) continue;
        if (isMajor && !face.ticks.major) continue;
        const angle = (i * 6 - 90) * Math.PI / 180;
        const outerR = R - 2;
        const innerR = outerR - (isMajor ? face.ticks.majorLength : face.ticks.minorLength);
        svg.appendChild(makeSvg("line", {
          x1: CX + Math.cos(angle) * innerR,
          y1: CY + Math.sin(angle) * innerR,
          x2: CX + Math.cos(angle) * outerR,
          y2: CY + Math.sin(angle) * outerR,
          stroke: "var(--text-dim)",
          "stroke-width": isMajor ? face.ticks.majorWidth : face.ticks.minorWidth
        }));
      }
    }
    if (face.labels.type === "arabic") {
      for (let h = 1; h <= 12; h++) {
        const angle = (h * 30 - 90) * Math.PI / 180;
        const txt = makeSvg("text", {
          x: CX + Math.cos(angle) * face.labels.radius,
          y: CY + Math.sin(angle) * face.labels.radius + 4,
          "text-anchor": "middle",
          fill: "var(--text-dim)",
          "font-size": face.labels.fontSize,
          "font-family": "inherit"
        });
        txt.textContent = h;
        svg.appendChild(txt);
      }
    } else if (face.labels.type === "roman") {
      for (let h = 1; h <= 12; h++) {
        const angle = (h * 30 - 90) * Math.PI / 180;
        const txt = makeSvg("text", {
          x: CX + Math.cos(angle) * face.labels.radius,
          y: CY + Math.sin(angle) * face.labels.radius + 4,
          "text-anchor": "middle",
          fill: "var(--text-dim)",
          "font-size": face.labels.fontSize,
          "font-family": "inherit"
        });
        txt.textContent = ROMAN[h];
        svg.appendChild(txt);
      }
    } else if (face.labels.type === "indices") {
      const positions = [
        { h: 12, angle: -90 },
        { h: 3, angle: 0 },
        { h: 6, angle: 90 },
        { h: 9, angle: 180 }
      ];
      for (const pos of positions) {
        const rad = pos.angle * Math.PI / 180;
        const outerR = R - 4;
        const innerR = R - 16;
        svg.appendChild(makeSvg("line", {
          x1: CX + Math.cos(rad) * innerR,
          y1: CY + Math.sin(rad) * innerR,
          x2: CX + Math.cos(rad) * outerR,
          y2: CY + Math.sin(rad) * outerR,
          stroke: "var(--text)",
          "stroke-width": 4,
          "stroke-linecap": "round"
        }));
      }
    }
    if (face.extras === "pilotTriangle") {
      const triSize = 8;
      const triY = CY - R + 6;
      svg.appendChild(makeSvg("polygon", {
        points: `${CX},${triY} ${CX - triSize / 2},${triY + triSize} ${CX + triSize / 2},${triY + triSize}`,
        fill: "var(--accent)",
        stroke: "none"
      }));
    }
    let digitalText = null;
    if (face.extras === "digitalReadout") {
      const hasBottomComp = complications && complications.stopwatch;
      const dY = hasBottomComp ? 118 : 125;
      digitalText = makeSvg("text", {
        x: CX,
        y: dY,
        "text-anchor": "middle",
        fill: "var(--text)",
        "font-size": "10",
        "font-family": "monospace, inherit"
      });
      digitalText.textContent = "--:--:--";
      svg.appendChild(digitalText);
    }
    let dateText = null;
    if (face.dateWindow && face.dateWindow.show) {
      const hasBottomComp = complications && complications.stopwatch;
      const dY = hasBottomComp ? 118 : face.dateWindow.y;
      dateText = makeSvg("text", {
        x: CX,
        y: dY,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": face.dateWindow.fontSize,
        "font-family": "inherit"
      });
      svg.appendChild(dateText);
    }
    return { arc, dateText, digitalText, face };
  }
  function buildFacePreview(faceId) {
    const face = CLOCK_FACES[faceId] || CLOCK_FACES.classic;
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", "0 0 200 200");
    svg.setAttribute("width", "48");
    svg.setAttribute("height", "48");
    svg.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: R, fill: "var(--surface)", stroke: "var(--border)", "stroke-width": 3 }));
    if (face.extras === "doubleTrack") {
      svg.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: R - 2, fill: "none", stroke: "var(--text-dim)", "stroke-width": 1 }));
      svg.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: R - 12, fill: "none", stroke: "var(--text-dim)", "stroke-width": 1 }));
    }
    if (face.ticks.major) {
      for (let i = 0; i < 12; i++) {
        const angle = (i * 30 - 90) * Math.PI / 180;
        const outerR = R - 2;
        const innerR = outerR - face.ticks.majorLength;
        svg.appendChild(makeSvg("line", {
          x1: CX + Math.cos(angle) * innerR,
          y1: CY + Math.sin(angle) * innerR,
          x2: CX + Math.cos(angle) * outerR,
          y2: CY + Math.sin(angle) * outerR,
          stroke: "var(--text-dim)",
          "stroke-width": face.ticks.majorWidth
        }));
      }
    }
    if (face.labels.type === "indices") {
      for (const a of [-90, 0, 90, 180]) {
        const rad = a * Math.PI / 180;
        svg.appendChild(makeSvg("line", {
          x1: CX + Math.cos(rad) * (R - 16),
          y1: CY + Math.sin(rad) * (R - 16),
          x2: CX + Math.cos(rad) * (R - 4),
          y2: CY + Math.sin(rad) * (R - 4),
          stroke: "var(--text)",
          "stroke-width": 5,
          "stroke-linecap": "round"
        }));
      }
    }
    if (face.extras === "pilotTriangle") {
      const triY = CY - R + 6;
      svg.appendChild(makeSvg("polygon", {
        points: `${CX},${triY} ${CX - 5},${triY + 10} ${CX + 5},${triY + 10}`,
        fill: "var(--accent)"
      }));
    }
    const hourAngle = (10 + 10 / 60) * 30;
    const minuteAngle = 10 * 6;
    const hRad = (hourAngle - 90) * Math.PI / 180;
    const mRad = (minuteAngle - 90) * Math.PI / 180;
    svg.appendChild(makeSvg("line", {
      x1: CX,
      y1: CY,
      x2: CX + Math.cos(hRad) * face.hands.hour.length,
      y2: CY + Math.sin(hRad) * face.hands.hour.length,
      stroke: "var(--text)",
      "stroke-width": face.hands.hour.width,
      "stroke-linecap": "round"
    }));
    svg.appendChild(makeSvg("line", {
      x1: CX,
      y1: CY,
      x2: CX + Math.cos(mRad) * face.hands.minute.length,
      y2: CY + Math.sin(mRad) * face.hands.minute.length,
      stroke: "var(--text)",
      "stroke-width": face.hands.minute.width,
      "stroke-linecap": "round"
    }));
    svg.appendChild(makeSvg("circle", { cx: CX, cy: CY, r: face.centerDot.radius, fill: face.centerDot.color }));
    return svg;
  }

  // src/clock-complications.js
  init_state();
  init_geo();
  var NS2 = "http://www.w3.org/2000/svg";
  function makeSvg2(tag, attrs) {
    const node = document.createElementNS(NS2, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }
  var COMPLICATION_DEFS = [
    { id: "sunrise", name: "Sunrise / Sunset", cx: 100, cy: 62, radius: 16, description: "Next sunrise or sunset countdown" },
    { id: "solar", name: "Solar (SFI)", cx: 138, cy: 100, radius: 16, description: "Solar Flux Index gauge" },
    { id: "stopwatch", name: "Stopwatch", cx: 100, cy: 138, radius: 16, description: "Mirrors Stopwatch widget elapsed time" },
    { id: "utc", name: "UTC 24h", cx: 62, cy: 100, radius: 16, description: "24-hour UTC sub-dial" }
  ];
  function mountComplication(svg, compId) {
    const def = COMPLICATION_DEFS.find((c) => c.id === compId);
    if (!def) return null;
    const g = document.createElementNS(NS2, "g");
    g.setAttribute("class", `comp-${compId}`);
    g.appendChild(makeSvg2("circle", {
      cx: def.cx,
      cy: def.cy,
      r: def.radius,
      fill: "var(--surface)",
      stroke: "var(--border)",
      "stroke-width": 1
    }));
    const refs = { g, def };
    if (compId === "utc") {
      for (let i = 0; i < 4; i++) {
        const angle = (i * 90 - 90) * Math.PI / 180;
        const outerR = def.radius - 1;
        const innerR = def.radius - 4;
        g.appendChild(makeSvg2("line", {
          x1: def.cx + Math.cos(angle) * innerR,
          y1: def.cy + Math.sin(angle) * innerR,
          x2: def.cx + Math.cos(angle) * outerR,
          y2: def.cy + Math.sin(angle) * outerR,
          stroke: "var(--text-dim)",
          "stroke-width": 1
        }));
      }
      refs.hand = makeSvg2("line", {
        x1: def.cx,
        y1: def.cy,
        x2: def.cx,
        y2: def.cy - 12,
        stroke: "var(--text)",
        "stroke-width": 1.5,
        "stroke-linecap": "round"
      });
      g.appendChild(refs.hand);
      g.appendChild(makeSvg2("circle", { cx: def.cx, cy: def.cy, r: 1.5, fill: "var(--text)" }));
      refs.label = makeSvg2("text", {
        x: def.cx,
        y: def.cy + 8,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "5",
        "font-family": "inherit"
      });
      refs.label.textContent = "UTC";
      g.appendChild(refs.label);
    } else if (compId === "stopwatch") {
      refs.timeText = makeSvg2("text", {
        x: def.cx,
        y: def.cy + 1,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "7",
        "font-family": "monospace, inherit"
      });
      refs.timeText.textContent = "00:00";
      g.appendChild(refs.timeText);
      refs.statusDot = makeSvg2("circle", {
        cx: def.cx,
        cy: def.cy - 8,
        r: 2,
        fill: "var(--text-dim)",
        opacity: "0.3"
      });
      g.appendChild(refs.statusDot);
      refs.modeLabel = makeSvg2("text", {
        x: def.cx,
        y: def.cy + 9,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "4",
        "font-family": "inherit"
      });
      refs.modeLabel.textContent = "STOP";
      g.appendChild(refs.modeLabel);
    } else if (compId === "solar") {
      const arcPath = describeArc(def.cx, def.cy, def.radius - 3, -135, 135);
      g.appendChild(makeSvg2("path", {
        d: arcPath,
        fill: "none",
        stroke: "var(--border)",
        "stroke-width": 2,
        "stroke-linecap": "round"
      }));
      refs.arcFill = makeSvg2("path", {
        d: arcPath,
        fill: "none",
        stroke: "var(--text-dim)",
        "stroke-width": 2,
        "stroke-linecap": "round"
      });
      g.appendChild(refs.arcFill);
      refs.needle = makeSvg2("line", {
        x1: def.cx,
        y1: def.cy,
        x2: def.cx,
        y2: def.cy - 11,
        stroke: "var(--text)",
        "stroke-width": 1,
        "stroke-linecap": "round"
      });
      g.appendChild(refs.needle);
      g.appendChild(makeSvg2("circle", { cx: def.cx, cy: def.cy, r: 1.5, fill: "var(--text)" }));
      refs.label = makeSvg2("text", {
        x: def.cx,
        y: def.cy + 8,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "5",
        "font-family": "inherit"
      });
      refs.label.textContent = "SFI";
      g.appendChild(refs.label);
      refs.valueText = makeSvg2("text", {
        x: def.cx,
        y: def.cy + 14,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "5",
        "font-family": "inherit"
      });
      refs.valueText.textContent = "---";
      g.appendChild(refs.valueText);
    } else if (compId === "sunrise") {
      refs.icon = makeSvg2("text", {
        x: def.cx,
        y: def.cy - 3,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "8"
      });
      refs.icon.textContent = "\u2600";
      g.appendChild(refs.icon);
      refs.countdownText = makeSvg2("text", {
        x: def.cx,
        y: def.cy + 7,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "6",
        "font-family": "monospace, inherit"
      });
      refs.countdownText.textContent = "--:--";
      g.appendChild(refs.countdownText);
      refs.eventLabel = makeSvg2("text", {
        x: def.cx,
        y: def.cy + 13,
        "text-anchor": "middle",
        fill: "var(--text-dim)",
        "font-size": "4",
        "font-family": "inherit"
      });
      refs.eventLabel.textContent = "";
      g.appendChild(refs.eventLabel);
    }
    svg.appendChild(g);
    return refs;
  }
  function updateComplication(compId, refs) {
    if (!refs) return;
    if (compId === "utc") {
      const now = /* @__PURE__ */ new Date();
      const h = now.getUTCHours();
      const m = now.getUTCMinutes();
      const angle = (h + m / 60) / 24 * 360;
      refs.hand.setAttribute("transform", `rotate(${angle} ${refs.def.cx} ${refs.def.cy})`);
    } else if (compId === "stopwatch") {
      const elapsed2 = getStopwatchElapsed();
      const running2 = getStopwatchRunning();
      const swMode = getStopwatchMode();
      const ms = Math.abs(elapsed2);
      const totalSec = Math.floor(ms / 1e3);
      const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
      const ss = String(totalSec % 60).padStart(2, "0");
      refs.timeText.textContent = `${mm}:${ss}`;
      refs.timeText.setAttribute("fill", running2 ? "var(--text)" : "var(--text-dim)");
      refs.statusDot.setAttribute("fill", running2 ? "#4caf50" : "var(--text-dim)");
      refs.statusDot.setAttribute("opacity", running2 ? "1" : "0.3");
      refs.modeLabel.textContent = swMode === "countdown" ? "CNTDN" : "STOP";
    } else if (compId === "solar") {
      const data = state_default.lastSolarData;
      if (data && data.sfi != null) {
        const sfi = parseInt(data.sfi, 10);
        if (!isNaN(sfi)) {
          const clamped = Math.max(50, Math.min(200, sfi));
          const ratio = (clamped - 50) / 150;
          const angle = -135 + ratio * 270;
          refs.needle.setAttribute("transform", `rotate(${angle} ${refs.def.cx} ${refs.def.cy})`);
          let color = "#4caf50";
          if (sfi < 70) color = "#f44336";
          else if (sfi <= 100) color = "#ff9800";
          const fillPath = describeArc(refs.def.cx, refs.def.cy, refs.def.radius - 3, -135, angle);
          refs.arcFill.setAttribute("d", fillPath);
          refs.arcFill.setAttribute("stroke", color);
          refs.valueText.textContent = sfi;
          refs.valueText.setAttribute("fill", color);
          return;
        }
      }
      refs.valueText.textContent = "---";
      refs.valueText.setAttribute("fill", "var(--text-dim)");
      refs.arcFill.setAttribute("d", "");
      refs.needle.setAttribute("transform", `rotate(-135 ${refs.def.cx} ${refs.def.cy})`);
    } else if (compId === "sunrise") {
      if (state_default.myLat == null || state_default.myLon == null) {
        refs.countdownText.textContent = "--:--";
        refs.icon.textContent = "\u2600";
        refs.icon.setAttribute("fill", "var(--text-dim)");
        refs.eventLabel.textContent = "";
        return;
      }
      const now = /* @__PURE__ */ new Date();
      const times = getSunTimes(state_default.myLat, state_default.myLon, now);
      if (!times.sunrise || !times.sunset) {
        refs.countdownText.textContent = "--:--";
        return;
      }
      let nextEvent, nextTime, isRise;
      if (now < times.sunrise) {
        nextEvent = "RISE";
        nextTime = times.sunrise;
        isRise = true;
      } else if (now < times.sunset) {
        nextEvent = "SET";
        nextTime = times.sunset;
        isRise = false;
      } else {
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tTimes = getSunTimes(state_default.myLat, state_default.myLon, tomorrow);
        nextEvent = "RISE";
        nextTime = tTimes.sunrise || times.sunrise;
        isRise = true;
      }
      const diffMs = nextTime - now;
      const diffMin = Math.floor(diffMs / 6e4);
      const h = Math.floor(diffMin / 60);
      const m = diffMin % 60;
      refs.countdownText.textContent = `${h}h${String(m).padStart(2, "0")}`;
      refs.countdownText.setAttribute("fill", isRise ? "#42a5f5" : "#ff9800");
      refs.icon.textContent = isRise ? "\u2600" : "\u263D";
      refs.icon.setAttribute("fill", isRise ? "#42a5f5" : "#ff9800");
      refs.eventLabel.textContent = nextEvent;
      refs.eventLabel.setAttribute("fill", isRise ? "#42a5f5" : "#ff9800");
    }
  }
  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? "0" : "1";
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + Math.cos(rad) * r, y: cy + Math.sin(rad) * r };
  }

  // src/analog-clock.js
  var NS3 = "http://www.w3.org/2000/svg";
  var CX2 = 100;
  var CY2 = 100;
  var R2 = 88;
  var svgBuilt = false;
  var lastDateStr = "";
  var lastArcDay = -1;
  var lastFaceId = null;
  var el = {};
  var compRefs = {};
  function makeSvg3(tag, attrs) {
    const node = document.createElementNS(NS3, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  }
  function buildSvg() {
    const svg = document.getElementById("analogClockSvg");
    if (!svg) return;
    const faceId = state_default.clockFace || "classic";
    const comps = state_default.clockComplications || {};
    const result = buildFaceSvg(svg, faceId, comps);
    el.arc = result.arc;
    el.dateText = result.dateText;
    el.digitalText = result.digitalText;
    compRefs = {};
    for (const def of COMPLICATION_DEFS) {
      if (comps[def.id]) {
        compRefs[def.id] = mountComplication(svg, def.id);
      }
    }
    const face = CLOCK_FACES[faceId] || CLOCK_FACES.classic;
    const hc = face.hands;
    el.hour = makeSvg3("line", {
      x1: CX2,
      y1: CY2 + (hc.hour.tail || 0),
      x2: CX2,
      y2: CY2 - hc.hour.length,
      stroke: "var(--text)",
      "stroke-width": hc.hour.width,
      "stroke-linecap": "round"
    });
    el.minute = makeSvg3("line", {
      x1: CX2,
      y1: CY2 + (hc.minute.tail || 0),
      x2: CX2,
      y2: CY2 - hc.minute.length,
      stroke: "var(--text)",
      "stroke-width": hc.minute.width,
      "stroke-linecap": "round"
    });
    el.second = makeSvg3("line", {
      x1: CX2,
      y1: CY2 + (hc.second.tail || 0),
      x2: CX2,
      y2: CY2 - hc.second.length,
      stroke: hc.second.color || "var(--accent)",
      "stroke-width": hc.second.width,
      "stroke-linecap": "round"
    });
    svg.appendChild(el.hour);
    svg.appendChild(el.minute);
    svg.appendChild(el.second);
    svg.appendChild(makeSvg3("circle", {
      cx: CX2,
      cy: CY2,
      r: face.centerDot.radius,
      fill: face.centerDot.color
    }));
    lastFaceId = faceId;
    lastDateStr = "";
    lastArcDay = -1;
    svgBuilt = true;
  }
  function setHand(line, angleDeg) {
    line.setAttribute("transform", `rotate(${angleDeg} ${CX2} ${CY2})`);
  }
  function updateArc(now) {
    if (!el.arc) return;
    if (state_default.myLat == null || state_default.myLon == null) {
      el.arc.setAttribute("d", "");
      return;
    }
    const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 864e5);
    if (dayOfYear === lastArcDay) return;
    lastArcDay = dayOfYear;
    const times = getSunTimes(state_default.myLat, state_default.myLon, now);
    if (!times.sunrise || !times.sunset) {
      el.arc.setAttribute("d", "");
      return;
    }
    const riseAngle = timeToAngle(times.sunrise);
    const setAngle = timeToAngle(times.sunset);
    const arcR = R2 - 12;
    const riseRad = (riseAngle - 90) * Math.PI / 180;
    const setRad = (setAngle - 90) * Math.PI / 180;
    const x1 = CX2 + Math.cos(riseRad) * arcR;
    const y1 = CY2 + Math.sin(riseRad) * arcR;
    const x2 = CX2 + Math.cos(setRad) * arcR;
    const y2 = CY2 + Math.sin(setRad) * arcR;
    let sweep = setAngle - riseAngle;
    if (sweep < 0) sweep += 360;
    const largeArc = sweep > 180 ? 1 : 0;
    const d = `M ${CX2} ${CY2} L ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    el.arc.setAttribute("d", d);
  }
  function timeToAngle(date) {
    const h = date.getHours() % 12;
    const m = date.getMinutes();
    return (h + m / 60) * 30;
  }
  function initAnalogClock() {
    buildSvg();
  }
  function rebuildClock() {
    svgBuilt = false;
    buildSvg();
    updateAnalogClock();
  }
  function updateAnalogClock() {
    if (!svgBuilt) return;
    if (!isWidgetVisible("widget-analog-clock")) return;
    const currentFace = state_default.clockFace || "classic";
    if (currentFace !== lastFaceId) {
      rebuildClock();
      return;
    }
    const now = /* @__PURE__ */ new Date();
    const h = now.getHours() % 12;
    const m = now.getMinutes();
    const s = now.getSeconds();
    const hourAngle = (h + m / 60) * 30;
    const minuteAngle = (m + s / 60) * 6;
    const secondAngle = s * 6;
    setHand(el.hour, hourAngle);
    setHand(el.minute, minuteAngle);
    setHand(el.second, secondAngle);
    if (el.dateText) {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const dateStr = `${days[now.getDay()]} ${now.getDate()}`;
      if (dateStr !== lastDateStr) {
        lastDateStr = dateStr;
        el.dateText.textContent = dateStr;
      }
    }
    if (el.digitalText) {
      const dh = String(now.getHours()).padStart(2, "0");
      const dm = String(m).padStart(2, "0");
      const ds = String(s).padStart(2, "0");
      el.digitalText.textContent = `${dh}:${dm}:${ds}`;
    }
    for (const [id, refs] of Object.entries(compRefs)) {
      updateComplication(id, refs);
    }
    updateArc(now);
  }

  // src/clock-config.js
  init_state();
  init_dom();
  function initClockConfigListeners() {
    const btn = $("clockCfgBtn");
    if (!btn) return;
    btn.addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    btn.addEventListener("click", () => {
      const picker = $("clockFacePicker");
      const compList = $("clockCompList");
      if (!picker || !compList) return;
      picker.innerHTML = "";
      for (const face of Object.values(CLOCK_FACES)) {
        const wrapper = document.createElement("div");
        wrapper.className = "clock-face-item";
        const thumb = document.createElement("div");
        thumb.className = "clock-face-thumb";
        if (state_default.clockFace === face.id) thumb.classList.add("active");
        thumb.appendChild(buildFacePreview(face.id));
        thumb.dataset.faceId = face.id;
        thumb.addEventListener("click", () => {
          picker.querySelectorAll(".clock-face-thumb").forEach((t) => t.classList.remove("active"));
          thumb.classList.add("active");
        });
        wrapper.appendChild(thumb);
        const label = document.createElement("div");
        label.className = "clock-face-label";
        label.textContent = face.name;
        wrapper.appendChild(label);
        picker.appendChild(wrapper);
      }
      compList.innerHTML = "";
      for (const comp of COMPLICATION_DEFS) {
        const label = document.createElement("label");
        label.className = "splash-widget-item";
        const cb = document.createElement("input");
        cb.type = "checkbox";
        cb.dataset.compId = comp.id;
        cb.checked = !!(state_default.clockComplications && state_default.clockComplications[comp.id]);
        label.appendChild(cb);
        label.appendChild(document.createTextNode(` ${comp.name}`));
        const desc = document.createElement("span");
        desc.className = "comp-desc";
        desc.textContent = ` \u2014 ${comp.description}`;
        label.appendChild(desc);
        compList.appendChild(label);
      }
      $("clockCfgSplash").classList.remove("hidden");
    });
    const okBtn = $("clockCfgOk");
    if (okBtn) {
      okBtn.addEventListener("click", () => {
        const activeThumb = document.querySelector(".clock-face-thumb.active");
        if (activeThumb) {
          state_default.clockFace = activeThumb.dataset.faceId;
          localStorage.setItem("hamtab_clock_face", state_default.clockFace);
        }
        const comps = {};
        document.querySelectorAll('#clockCompList input[type="checkbox"]').forEach((cb) => {
          if (cb.checked) comps[cb.dataset.compId] = true;
        });
        state_default.clockComplications = comps;
        localStorage.setItem("hamtab_clock_complications", JSON.stringify(comps));
        $("clockCfgSplash").classList.add("hidden");
        rebuildClock();
      });
    }
  }

  // src/menu.js
  init_dom();
  var isOpen = false;
  function openMenu() {
    const drawer = $("mobileMenuDrawer");
    const backdrop = $("mobileMenuBackdrop");
    if (!drawer || !backdrop) return;
    drawer.classList.add("open");
    backdrop.classList.add("open");
    isOpen = true;
    const updateEl = $("updateIndicator");
    const menuUpdate = $("mobileMenuUpdate");
    if (updateEl && menuUpdate) {
      menuUpdate.innerHTML = updateEl.innerHTML;
    }
  }
  function closeMenu() {
    const drawer = $("mobileMenuDrawer");
    const backdrop = $("mobileMenuBackdrop");
    if (!drawer || !backdrop) return;
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    isOpen = false;
  }
  function initMobileMenu() {
    const menuBtn = $("mobileMenuBtn");
    const backdrop = $("mobileMenuBackdrop");
    const drawer = $("mobileMenuDrawer");
    if (!menuBtn || !backdrop || !drawer) return;
    menuBtn.addEventListener("click", () => {
      if (isOpen) closeMenu();
      else openMenu();
    });
    backdrop.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isOpen) closeMenu();
    });
    drawer.addEventListener("click", (e) => {
      const item = e.target.closest(".mobile-menu-item");
      if (!item) return;
      const action = item.dataset.action;
      if (!action) {
        closeMenu();
        return;
      }
      closeMenu();
      switch (action) {
        case "config":
          document.getElementById("editCallBtn")?.click();
          break;
        case "refresh":
          document.getElementById("refreshBtn")?.click();
          break;
        case "feedback":
          document.getElementById("feedbackBtn")?.click();
          break;
      }
    });
  }

  // src/main.js
  init_tabs();
  migrate();
  migrateV2();
  initTheme();
  state_default.solarFieldVisibility = loadSolarFieldVisibility();
  state_default.lunarFieldVisibility = loadLunarFieldVisibility();
  state_default.widgetVisibility = loadWidgetVisibility();
  state_default.spotColumnVisibility = loadSpotColumnVisibility();
  initMap();
  updateGrayLine();
  updateSunMarker();
  setInterval(() => {
    updateGrayLine();
    updateSunMarker();
  }, 6e4);
  initSatellites();
  setInterval(() => {
    if (isWidgetVisible("widget-satellites")) fetchIssPosition();
  }, 1e4);
  setInterval(() => {
    if (isWidgetVisible("widget-satellites")) fetchSatellitePositions();
  }, 1e4);
  updateClocks();
  setInterval(() => {
    updateClocks();
    updateBigClock();
    updateAnalogClock();
  }, 1e3);
  setInterval(renderSpots, 3e4);
  initSourceListeners();
  initFilterListeners();
  initTooltipListeners();
  initSplashListeners();
  initConfigListeners();
  initRefreshListeners();
  initUpdateListeners();
  initFullscreenListeners();
  initWeatherListeners();
  initPropListeners();
  initSolarImage();
  initDayNightToggle();
  initSpotDetail();
  initHelpListeners();
  initReferenceListeners();
  initFeedbackListeners();
  initLiveSpotsListeners();
  initVoacapListeners();
  initHeatmapListeners();
  initSpaceWxListeners();
  initBeaconListeners();
  initDxpeditionListeners();
  initContestListeners();
  initDedxListeners();
  initBigClock();
  initStopwatchListeners();
  initAnalogClock();
  initClockConfigListeners();
  initMobileMenu();
  initTabs();
  function initApp() {
    if (state_default.appInitialized) return;
    state_default.appInitialized = true;
    refreshAll();
    if (state_default.autoRefreshEnabled) startAutoRefresh();
    fetchLocation();
    startUpdateStatusPolling();
    sendUpdateInterval();
    fetchWeather();
    startNwsPolling();
    if (isWidgetVisible("widget-live-spots")) fetchLiveSpots();
    if (isWidgetVisible("widget-voacap") || state_default.hfPropOverlayBand) fetchVoacapMatrix();
    if (isWidgetVisible("widget-spacewx")) fetchSpaceWxData();
    if (isWidgetVisible("widget-beacons")) startBeaconTimer();
    if (isWidgetVisible("widget-dxpeditions") || state_default.mapOverlays.dxpedMarkers) fetchDxpeditions();
    if (isWidgetVisible("widget-contests")) fetchContests();
    if (isWidgetVisible("widget-dedx")) startDedxTimer();
    if (isWidgetVisible("widget-beacons")) updateBeaconMarkers();
  }
  setInterval(() => {
    if (isWidgetVisible("widget-live-spots")) fetchLiveSpots();
  }, 5 * 60 * 1e3);
  setInterval(() => {
    if (isWidgetVisible("widget-voacap") || state_default.hfPropOverlayBand) renderVoacapMatrix();
  }, 60 * 1e3);
  setInterval(() => {
    if (isWidgetVisible("widget-voacap") || state_default.hfPropOverlayBand) fetchVoacapMatrixThrottled();
  }, 60 * 1e3);
  setInterval(() => {
    if (isWidgetVisible("widget-beacons")) updateBeaconMarkers();
  }, 1e4);
  setInitApp(initApp);
  initWidgets();
  switchSource(state_default.currentSource);
  if (state_default.map) setTimeout(() => state_default.map.invalidateSize(), 100);
  if (state_default.myCallsign) {
    $("splash").classList.add("hidden");
    updateOperatorDisplay2();
    centerMapOnUser();
    updateUserMarker();
    initApp();
  } else {
    showSplash();
    fetchLocation();
  }
})();
