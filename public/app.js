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
        // Filters
        activeBand: null,
        activeMode: null,
        activeCountry: null,
        activeState: null,
        activeGrid: null,
        // Auto-refresh
        autoRefreshEnabled: true,
        refreshInterval: null,
        countdownSeconds: 60,
        countdownTimer: null,
        // Preferences
        use24h: localStorage.getItem("hamtab_time24") !== "false",
        privilegeFilterEnabled: localStorage.getItem("hamtab_privilege_filter") === "true",
        licenseClass: localStorage.getItem("hamtab_license_class") || "",
        propMetric: localStorage.getItem("hamtab_prop_metric") || "mufd",
        mapCenterMode: localStorage.getItem("hamtab_map_center") || "qth",
        clockStyle: localStorage.getItem("hamtab_clock_style") || "digital",
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
        currentSource: localStorage.getItem("hamtab_spot_source") || "pota",
        sourceData: { pota: [], sota: [] },
        sourceFiltered: { pota: [], sota: [] },
        // Widget visibility
        widgetVisibility: null,
        // loaded in widgets.js
        // Solar/Lunar field visibility
        solarFieldVisibility: null,
        // loaded in solar.js
        lunarFieldVisibility: null,
        // loaded in lunar.js
        // Cached data for re-render
        lastSolarData: null,
        lastLunarData: null,
        // Operator
        myCallsign: localStorage.getItem("hamtab_callsign") || "",
        myLat: null,
        myLon: null,
        manualLoc: false,
        syncingFields: false,
        gridHighlightIdx: -1,
        // Map
        map: null,
        clusterGroup: null,
        grayLinePolygon: null,
        dayPolygon: null,
        userMarker: null,
        // ISS
        issMarker: null,
        issCircle: null,
        issTrail: [],
        issTrailLine: null,
        issOrbitLine: null,
        // Weather
        wxStation: localStorage.getItem("hamtab_wx_station") || "",
        wxApiKey: localStorage.getItem("hamtab_wx_apikey") || "",
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
        // Update
        updateStatusPolling: null,
        knownServerHash: null,
        restartNeeded: false,
        // Init flag
        appInitialized: false,
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
        if (saved) Object.assign(state.mapOverlays, saved);
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
      state_default = state;
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

  // src/utils.js
  var utils_exports = {};
  __export(utils_exports, {
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
  var init_utils = __esm({
    "src/utils.js"() {
      init_state();
    }
  });

  // src/lunar.js
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
  function loadLunarFieldVisibility() {
    const { LUNAR_FIELD_DEFS: LUNAR_FIELD_DEFS2 } = (init_constants(), __toCommonJS(constants_exports));
    try {
      const saved = JSON.parse(localStorage.getItem(LUNAR_VIS_KEY));
      if (saved && typeof saved === "object") return saved;
    } catch (e) {
    }
    const vis = {};
    LUNAR_FIELD_DEFS2.forEach((f) => vis[f.key] = f.defaultVisible);
    return vis;
  }
  function saveLunarFieldVisibility() {
    localStorage.setItem(LUNAR_VIS_KEY, JSON.stringify(state_default.lunarFieldVisibility));
  }
  async function fetchLunar() {
    try {
      const resp = await fetch("/api/lunar");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.lastLunarData = data;
      renderLunar(data);
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
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = "#1a1a2e";
    ctx.fill();
    const illum = Math.max(0, Math.min(100, illumination)) / 100;
    const waning = (phase || "").toLowerCase().includes("waning") || (phase || "").toLowerCase().includes("last");
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
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = "#445";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  function renderLunar(data) {
    const { LUNAR_FIELD_DEFS: LUNAR_FIELD_DEFS2 } = (init_constants(), __toCommonJS(constants_exports));
    const lunarCards = $("lunarCards");
    lunarCards.innerHTML = "";
    renderMoonPhase(data.illumination, data.phase);
    LUNAR_FIELD_DEFS2.forEach((f) => {
      if (state_default.lunarFieldVisibility[f.key] === false) return;
      const rawVal = data[f.key];
      let displayVal;
      if (rawVal === void 0 || rawVal === null || rawVal === "") {
        displayVal = "-";
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
  var LUNAR_VIS_KEY;
  var init_lunar = __esm({
    "src/lunar.js"() {
      init_state();
      init_dom();
      LUNAR_VIS_KEY = "hamtab_lunar_fields";
    }
  });

  // src/constants.js
  var constants_exports = {};
  __export(constants_exports, {
    HEADER_H: () => HEADER_H,
    LUNAR_FIELD_DEFS: () => LUNAR_FIELD_DEFS,
    SNAP_DIST: () => SNAP_DIST,
    SOLAR_FIELD_DEFS: () => SOLAR_FIELD_DEFS,
    SOURCE_DEFS: () => SOURCE_DEFS,
    US_PRIVILEGES: () => US_PRIVILEGES,
    WIDGET_DEFS: () => WIDGET_DEFS,
    WIDGET_STORAGE_KEY: () => WIDGET_STORAGE_KEY
  });
  var WIDGET_DEFS, SOURCE_DEFS, SOLAR_FIELD_DEFS, LUNAR_FIELD_DEFS, US_PRIVILEGES, WIDGET_STORAGE_KEY, SNAP_DIST, HEADER_H;
  var init_constants = __esm({
    "src/constants.js"() {
      init_solar();
      init_lunar();
      WIDGET_DEFS = [
        { id: "widget-clock-local", name: "Local Time" },
        { id: "widget-clock-utc", name: "UTC" },
        { id: "widget-activations", name: "On the Air" },
        { id: "widget-map", name: "HamMap" },
        { id: "widget-solar", name: "Solar & Propagation" },
        { id: "widget-lunar", name: "Lunar / EME" },
        { id: "widget-rst", name: "RST Reference" },
        { id: "widget-spot-detail", name: "DX Detail" }
      ];
      SOURCE_DEFS = {
        pota: {
          label: "POTA",
          endpoint: "/api/spots",
          columns: [
            { key: "callsign", label: "Callsign", class: "callsign" },
            { key: "frequency", label: "Freq", class: "freq" },
            { key: "mode", label: "Mode", class: "mode" },
            { key: "reference", label: "Park (link)", class: "" },
            { key: "name", label: "Name", class: "" },
            { key: "spotTime", label: "Time", class: "" },
            { key: "age", label: "Age", class: "" }
          ],
          filters: ["band", "mode", "country", "state", "grid", "privilege"],
          hasMap: true,
          spotId: (s) => `${s.activator || s.callsign}-${s.reference}-${s.frequency}`,
          sortKey: "spotTime"
        },
        sota: {
          label: "SOTA",
          endpoint: "/api/spots/sota",
          columns: [
            { key: "callsign", label: "Callsign", class: "callsign" },
            { key: "frequency", label: "Freq", class: "freq" },
            { key: "mode", label: "Mode", class: "mode" },
            { key: "reference", label: "Summit (link)", class: "" },
            { key: "name", label: "Details", class: "" },
            { key: "spotTime", label: "Time", class: "" },
            { key: "age", label: "Age", class: "" }
          ],
          filters: ["band", "mode"],
          hasMap: true,
          spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
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
      WIDGET_STORAGE_KEY = "hamtab_widgets";
      SNAP_DIST = 20;
      HEADER_H = 30;
    }
  });

  // src/geo.js
  var geo_exports = {};
  __export(geo_exports, {
    bearingTo: () => bearingTo,
    bearingToCardinal: () => bearingToCardinal,
    distanceMi: () => distanceMi,
    getSunTimes: () => getSunTimes,
    gridToLatLon: () => gridToLatLon,
    isDaytime: () => isDaytime,
    latLonToGrid: () => latLonToGrid,
    localTimeAtLon: () => localTimeAtLon
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
    const R = 3958.8;
    const dLat = (lat2 - lat1) * r;
    const dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  // src/spot-detail.js
  function weatherCacheKey(lat, lon) {
    return `${lat.toFixed(1)},${lon.toFixed(1)}`;
  }
  async function fetchCallsignInfo(call) {
    if (!call) return null;
    const key = call.toUpperCase();
    if (state_default.callsignCache[key]) return state_default.callsignCache[key];
    if (state_default.callsignCache[key] === null) return null;
    try {
      const resp = await fetch(`/api/callsign/${encodeURIComponent(key)}`);
      if (!resp.ok) {
        state_default.callsignCache[key] = null;
        return null;
      }
      const data = await resp.json();
      if (data.status !== "VALID") {
        state_default.callsignCache[key] = null;
        return null;
      }
      state_default.callsignCache[key] = data;
      return data;
    } catch {
      state_default.callsignCache[key] = null;
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
    const el = document.getElementById("spotDetailTime");
    if (!el) return;
    el.textContent = localTimeAtLon(lon, state_default.use24h);
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
    const mode = spot.mode || "";
    const band = freqToBand(freq) || "";
    const ref = spot.reference || "";
    let refHtml = "";
    if (ref) {
      const refUrl = state_default.currentSource === "sota" ? `https://www.sota.org.uk/Summit/${encodeURIComponent(ref)}` : `https://pota.app/#/park/${encodeURIComponent(ref)}`;
      refHtml = `<a href="${refUrl}" target="_blank" rel="noopener">${esc(ref)}</a>`;
    }
    let bearingHtml = "";
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (state_default.myLat !== null && state_default.myLon !== null && !isNaN(lat) && !isNaN(lon)) {
      const deg = bearingTo(state_default.myLat, state_default.myLon, lat, lon);
      const mi = Math.round(distanceMi(state_default.myLat, state_default.myLon, lat, lon));
      bearingHtml = `
      <div class="spot-detail-row"><span class="spot-detail-label">Bearing from DE:</span> ${Math.round(deg)}\xB0 ${bearingToCardinal(deg)}</div>
      <div class="spot-detail-row"><span class="spot-detail-label">Distance from DE:</span> ${mi.toLocaleString()} mi</div>
    `;
    }
    const localTime = !isNaN(lon) ? localTimeAtLon(lon, state_default.use24h) : "";
    body.innerHTML = `
    <div class="spot-detail-call"><a href="${qrzUrl}" target="_blank" rel="noopener">${esc(displayCall)}</a></div>
    <div class="spot-detail-name" id="spotDetailName"></div>
    <div class="spot-detail-row"><span class="spot-detail-label">Freq:</span> ${esc(freq)} MHz</div>
    <div class="spot-detail-row"><span class="spot-detail-label">Mode:</span> ${esc(mode)}</div>
    ${band ? `<div class="spot-detail-row"><span class="spot-detail-label">Band:</span> ${esc(band)}</div>` : ""}
    ${refHtml ? `<div class="spot-detail-row"><span class="spot-detail-label">Ref:</span> ${refHtml}</div>` : ""}
    ${spot.name ? `<div class="spot-detail-row"><span class="spot-detail-label">Name:</span> ${esc(spot.name)}</div>` : ""}
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
    if (!isNaN(lat) && !isNaN(lon)) {
      const wxEl = document.getElementById("spotDetailWx");
      const wx = await fetchSpotWeather(lat, lon);
      if (wx && wxEl && currentSpot === spot) {
        const cls = wxClass(wx.shortForecast);
        wxEl.className = `spot-detail-wx ${cls}`;
        wxEl.innerHTML = `
        <span class="spot-detail-label">Weather:</span>
        ${esc(wx.shortForecast || "")} ${wx.temperature != null ? `${wx.temperature}\xB0${wx.temperatureUnit || "F"}` : ""}
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
  function renderMarkers() {
    if (!state_default.map) return;
    ensureIcons();
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
        const mi = Math.round(distanceMi(state_default.myLat, state_default.myLon, lat, lon));
        dirLine = `<div class="popup-dir">Direction: ${bearingToCardinal(deg)}</div>`;
        distLine = `<div class="popup-dist">Distance: ~${mi.toLocaleString()} mi</div>`;
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
  }
  function selectSpot(sid) {
    ensureIcons();
    const oldSid = state_default.selectedSpotId;
    if (oldSid && state_default.markers[oldSid]) {
      state_default.markers[oldSid].setIcon(defaultIcon);
    }
    state_default.selectedSpotId = sid;
    if (sid && state_default.markers[sid]) {
      state_default.markers[sid].setIcon(selectedIcon);
    }
    if (state_default.clusterGroup) {
      if (oldSid && state_default.markers[oldSid]) {
        const oldParent = state_default.clusterGroup.getVisibleParent(state_default.markers[oldSid]);
        if (oldParent && oldParent !== state_default.markers[oldSid] && oldParent._icon) {
          oldParent._icon.classList.remove("marker-cluster-selected");
        }
      }
      if (sid && state_default.markers[sid]) {
        const newParent = state_default.clusterGroup.getVisibleParent(state_default.markers[sid]);
        if (newParent && newParent !== state_default.markers[sid] && newParent._icon) {
          newParent._icon.classList.add("marker-cluster-selected");
        }
      }
    }
    document.querySelectorAll("#spotsBody tr").forEach((tr) => {
      tr.classList.toggle("selected", tr.dataset.spotId === sid);
    });
    const selectedRow = document.querySelector(`#spotsBody tr[data-spot-id="${CSS.escape(sid)}"]`);
    if (selectedRow) {
      selectedRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
    if (sid) {
      const filtered = state_default.sourceFiltered[state_default.currentSource] || [];
      const spot = filtered.find((s) => spotId(s) === sid);
      if (spot) updateSpotDetail(spot);
      else clearSpotDetail();
    } else {
      clearSpotDetail();
    }
  }
  function flyToSpot(spot) {
    if (!state_default.map) return;
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (isNaN(lat) || isNaN(lon)) return;
    const sid = spotId(spot);
    selectSpot(sid);
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
      defaultIcon = null;
      selectedIcon = null;
    }
  });

  // src/spots.js
  function renderSpots() {
    const filtered = state_default.sourceFiltered[state_default.currentSource] || [];
    const spotsBody = $("spotsBody");
    spotsBody.innerHTML = "";
    $("spotCount").textContent = `(${filtered.length})`;
    const cols = SOURCE_DEFS[state_default.currentSource].columns;
    const sortKey = SOURCE_DEFS[state_default.currentSource].sortKey;
    const sorted = [...filtered].sort((a, b) => {
      return new Date(b[sortKey]) - new Date(a[sortKey]);
    });
    sorted.forEach((spot) => {
      const tr = document.createElement("tr");
      const sid = spotId(spot);
      tr.dataset.spotId = sid;
      if (sid === state_default.selectedSpotId) tr.classList.add("selected");
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
            } else {
              a.href = `https://pota.app/#/park/${ref}`;
            }
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
  var init_spots = __esm({
    "src/spots.js"() {
      init_state();
      init_dom();
      init_constants();
      init_utils();
      init_filters();
      init_markers();
    }
  });

  // src/filters.js
  var filters_exports = {};
  __export(filters_exports, {
    applyFilter: () => applyFilter,
    fetchLicenseClass: () => fetchLicenseClass,
    filterByPrivileges: () => filterByPrivileges,
    freqToBand: () => freqToBand,
    getAvailableBands: () => getAvailableBands,
    getAvailableCountries: () => getAvailableCountries,
    getAvailableGrids: () => getAvailableGrids,
    getAvailableModes: () => getAvailableModes,
    getAvailableStates: () => getAvailableStates,
    initFilterListeners: () => initFilterListeners,
    isUSCallsign: () => isUSCallsign,
    normalizeMode: () => normalizeMode,
    spotId: () => spotId,
    updateBandFilterButtons: () => updateBandFilterButtons,
    updateCountryFilter: () => updateCountryFilter,
    updateGridFilter: () => updateGridFilter,
    updateModeFilterButtons: () => updateModeFilterButtons,
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
  function normalizeMode(mode) {
    if (!mode) return "phone";
    const m = mode.toUpperCase();
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
  function getCountryPrefix(ref) {
    if (!ref) return "";
    return ref.split("-")[0];
  }
  function getUSState(locationDesc) {
    if (!locationDesc) return "";
    if (locationDesc.startsWith("US-")) return locationDesc.substring(3);
    return "";
  }
  function applyFilter() {
    const allowed = SOURCE_DEFS[state_default.currentSource].filters;
    state_default.sourceFiltered[state_default.currentSource] = (state_default.sourceData[state_default.currentSource] || []).filter((s) => {
      if (allowed.includes("band") && state_default.activeBand && freqToBand(s.frequency) !== state_default.activeBand) return false;
      if (allowed.includes("mode") && state_default.activeMode && (s.mode || "").toUpperCase() !== state_default.activeMode) return false;
      if (allowed.includes("country") && state_default.activeCountry && getCountryPrefix(s.reference) !== state_default.activeCountry) return false;
      if (allowed.includes("state") && state_default.activeState && getUSState(s.locationDesc) !== state_default.activeState) return false;
      if (allowed.includes("grid") && state_default.activeGrid && (s.grid4 || "") !== state_default.activeGrid) return false;
      if (allowed.includes("privilege") && state_default.privilegeFilterEnabled && !filterByPrivileges(s)) return false;
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
    allBtn.className = state_default.activeBand === null ? "active" : "";
    allBtn.addEventListener("click", () => {
      state_default.activeBand = null;
      applyFilter();
      renderSpots();
      renderMarkers();
      updateBandFilterButtons();
    });
    bandFilters.appendChild(allBtn);
    bands.forEach((band) => {
      const btn = document.createElement("button");
      btn.textContent = band;
      btn.className = state_default.activeBand === band ? "active" : "";
      btn.addEventListener("click", () => {
        state_default.activeBand = band;
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
    allBtn.className = state_default.activeMode === null ? "active" : "";
    allBtn.addEventListener("click", () => {
      state_default.activeMode = null;
      applyFilter();
      renderSpots();
      renderMarkers();
      updateModeFilterButtons();
    });
    modeFilters.appendChild(allBtn);
    modes.forEach((mode) => {
      const btn = document.createElement("button");
      btn.textContent = mode;
      btn.className = state_default.activeMode === mode ? "active" : "";
      btn.addEventListener("click", () => {
        state_default.activeMode = mode;
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
  function updatePrivFilterVisibility() {
    const label = document.querySelector(".priv-filter-label");
    if (!label) return;
    const show = isUSCallsign(state_default.myCallsign) && !!state_default.licenseClass;
    label.classList.toggle("hidden", !show);
    if (!show) {
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
        state_default.callsignCache[callsign.toUpperCase()] = data;
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
      let classLabel = state_default.licenseClass ? ` [${state_default.licenseClass}]` : "";
      opCall.innerHTML = `<a href="${qrz}" target="_blank" rel="noopener">${esc2(state_default.myCallsign)}</a><span class="op-class">${esc2(classLabel)}</span>`;
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
    countryFilter.addEventListener("change", () => {
      state_default.activeCountry = countryFilter.value || null;
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    stateFilter.addEventListener("change", () => {
      state_default.activeState = stateFilter.value || null;
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    gridFilter.addEventListener("change", () => {
      state_default.activeGrid = gridFilter.value || null;
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    const privFilterCheckbox = $("privFilter");
    privFilterCheckbox.checked = state_default.privilegeFilterEnabled;
    updatePrivFilterVisibility();
    privFilterCheckbox.addEventListener("change", () => {
      state_default.privilegeFilterEnabled = privFilterCheckbox.checked;
      localStorage.setItem("hamtab_privilege_filter", String(state_default.privilegeFilterEnabled));
      applyFilter();
      renderSpots();
      renderMarkers();
    });
    if (state_default.myCallsign) {
      fetchLicenseClass(state_default.myCallsign);
    }
  }
  function spotId(spot) {
    return SOURCE_DEFS[state_default.currentSource].spotId(spot);
  }
  var init_filters = __esm({
    "src/filters.js"() {
      init_state();
      init_dom();
      init_constants();
      init_spots();
      init_markers();
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
  function condClass(cond) {
    const c = (cond || "").toLowerCase();
    if (c === "good") return "cond-good";
    if (c === "fair") return "cond-fair";
    if (c === "poor") return "cond-poor";
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
    const img = $("solarImage");
    if (!select || !img) return;
    const saved = localStorage.getItem("hamtab_sdo_type");
    if (saved) select.value = saved;
    select.addEventListener("change", () => {
      localStorage.setItem("hamtab_sdo_type", select.value);
      loadSolarImage();
    });
    loadSolarImage();
  }
  function loadSolarImage() {
    const select = $("solarImageType");
    const img = $("solarImage");
    if (!select || !img) return;
    img.src = "/api/solar/image?type=" + encodeURIComponent(select.value) + "&t=" + Date.now();
  }
  async function fetchSolar() {
    try {
      const resp = await fetch("/api/solar");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      state_default.lastSolarData = data;
      renderSolar(data);
      loadSolarImage();
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
    const headerBandsRow = $("headerBandsRow");
    headerBandsRow.innerHTML = "";
    const bandMap = {};
    bands.forEach((b) => {
      if (!bandMap[b.band]) bandMap[b.band] = {};
      bandMap[b.band][b.time] = b.condition;
    });
    const bandOrder = ["80m-40m", "30m-20m", "17m-15m", "12m-10m"];
    bandOrder.forEach((band) => {
      if (!bandMap[band]) return;
      const day = bandMap[band]["day"] || "-";
      const night = bandMap[band]["night"] || "-";
      const item = document.createElement("div");
      item.className = "header-band-item";
      const nameSpan = document.createElement("span");
      nameSpan.className = "header-band-name";
      nameSpan.textContent = band;
      const daySpan = document.createElement("span");
      daySpan.className = "header-band-day " + condClass(day);
      daySpan.textContent = day;
      const sep = document.createElement("span");
      sep.textContent = "/";
      sep.style.color = "var(--text-dim)";
      const nightSpan = document.createElement("span");
      nightSpan.className = "header-band-night " + condClass(night);
      nightSpan.textContent = night;
      item.appendChild(nameSpan);
      item.appendChild(daySpan);
      item.appendChild(sep);
      item.appendChild(nightSpan);
      headerBandsRow.appendChild(item);
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
        const coords = feature.geometry.coordinates;
        if (!coords || coords.length < 2) return;
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
    const rad = Math.PI / 180;
    const dec = Math.abs(sunDec) < 0.1 ? 0.1 : sunDec;
    const tanDec = Math.tan(dec * rad);
    const points = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / tanDec) / rad;
      points.push([lat, lon]);
    }
    if (dec >= 0) {
      points.push([-90, 180]);
      points.push([-90, -180]);
    } else {
      points.push([90, 180]);
      points.push([90, -180]);
    }
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
    const dayPoints = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / tanDec) / rad;
      dayPoints.push([lat, lon]);
    }
    if (dec >= 0) {
      dayPoints.push([90, 180]);
      dayPoints.push([90, -180]);
    } else {
      dayPoints.push([-90, 180]);
      dayPoints.push([-90, -180]);
    }
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
  var SOLAR_VIS_KEY;
  var init_solar = __esm({
    "src/solar.js"() {
      init_state();
      init_dom();
      init_utils();
      SOLAR_VIS_KEY = "hamtab_solar_fields";
    }
  });

  // src/map-overlays.js
  var map_overlays_exports = {};
  __export(map_overlays_exports, {
    renderAllMapOverlays: () => renderAllMapOverlays,
    renderLatLonGrid: () => renderLatLonGrid,
    renderMaidenheadGrid: () => renderMaidenheadGrid,
    renderTimezoneGrid: () => renderTimezoneGrid,
    saveMapOverlays: () => saveMapOverlays
  });
  function renderAllMapOverlays() {
    if (!state_default.map) return;
    renderLatLonGrid();
    renderMaidenheadGrid();
    renderTimezoneGrid();
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
  function saveMapOverlays() {
    localStorage.setItem("hamtab_map_overlays", JSON.stringify(state_default.mapOverlays));
  }
  var init_map_overlays = __esm({
    "src/map-overlays.js"() {
      init_state();
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

  // src/main.js
  init_state();
  init_dom();
  init_solar();
  init_lunar();

  // src/widgets.js
  init_state();
  init_constants();

  // src/map-init.js
  init_state();
  init_geo();
  init_utils();
  init_map_overlays();
  function initMap() {
    const hasLeaflet = typeof L !== "undefined" && L.map;
    if (!hasLeaflet) return;
    try {
      state_default.map = L.map("map", {
        worldCopyJump: true,
        maxBoundsViscosity: 1,
        maxBounds: [[-90, -180], [90, 180]],
        minZoom: 2
      }).setView([39.8, -98.5], 4);
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
        maxZoom: 19
      }).addTo(state_default.map);
      state_default.clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 40,
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

  // src/widgets.js
  var WIDGET_VIS_KEY = "hamtab_widget_vis";
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
  function applyWidgetVisibility() {
    WIDGET_DEFS.forEach((w) => {
      const el = document.getElementById(w.id);
      if (!el) return;
      if (state_default.widgetVisibility[w.id] === false) {
        el.style.display = "none";
      } else {
        el.style.display = "";
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
    const rightBottomIds = ["widget-lunar", "widget-rst", "widget-spot-detail"];
    const vis = state_default.widgetVisibility || {};
    const visible = rightBottomIds.filter((id) => vis[id] !== false);
    if (visible.length === 0) return;
    const bottomSpace = H - solarBottom - pad;
    const gaps = visible.length - 1;
    const slotH = Math.round((bottomSpace - gaps * pad) / visible.length);
    let curY = solarBottom + pad;
    visible.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.style.left = rightX + "px";
      el.style.top = curY + "px";
      el.style.width = rightW + "px";
      el.style.height = slotH + "px";
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
    const clockH = state_default.clockStyle === "analog" ? 280 : 130;
    const clockW = Math.round((centerW - pad) / 2);
    const rightX = leftW + centerW + pad * 3;
    const layout = {
      "widget-clock-local": { left: leftW + pad * 2, top: pad, width: clockW, height: clockH },
      "widget-clock-utc": { left: leftW + pad * 2 + clockW + pad, top: pad, width: clockW, height: clockH },
      "widget-activations": { left: pad, top: pad, width: leftW, height: H - pad * 2 },
      "widget-map": { left: leftW + pad * 2, top: clockH + pad * 2, width: centerW, height: H - clockH - pad * 3 },
      "widget-solar": { left: rightX, top: pad, width: rightW, height: rightHalf }
    };
    const rightBottomIds = ["widget-lunar", "widget-rst", "widget-spot-detail"];
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
  function bringToFront(widget) {
    state_default.zCounter++;
    widget.style.zIndex = state_default.zCounter;
  }
  function setupDrag(widget, handle) {
    let startX, startY, origLeft, origTop;
    handle.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;
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
    document.querySelectorAll(".widget").forEach((widget) => {
      const pos = layout[widget.id];
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
  function resetLayout() {
    localStorage.removeItem(WIDGET_STORAGE_KEY);
    applyLayout(getDefaultLayout());
    saveWidgets();
    centerMapOnUser();
    updateUserMarker();
  }
  var prevAreaW = 0;
  var prevAreaH = 0;
  function reflowWidgets() {
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
    if (state_default.map) state_default.map.invalidateSize();
    saveWidgets();
  }
  function initWidgets() {
    let layout;
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) {
        layout = JSON.parse(saved);
        const { width: aW, height: aH } = getWidgetArea();
        for (const id of Object.keys(layout)) {
          const p = layout[id];
          if (p.left > aW - 30 || p.top > aH - 30 || p.left + p.width < 30 || p.top + p.height < 10) {
            layout = null;
            break;
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
    document.querySelectorAll(".widget").forEach((widget) => {
      const header = widget.querySelector(".widget-header");
      const resizer = widget.querySelector(".widget-resize");
      if (header) setupDrag(widget, header);
      if (resizer) setupResize(widget, resizer);
      widget.addEventListener("mousedown", () => bringToFront(widget));
    });
    const mapWidget = document.getElementById("widget-map");
    if (state_default.map && mapWidget && window.ResizeObserver) {
      new ResizeObserver(() => state_default.map.invalidateSize()).observe(mapWidget);
    }
    document.getElementById("resetLayoutBtn").addEventListener("click", resetLayout);
    if (window.ResizeObserver) {
      let reflowTimer;
      new ResizeObserver(() => {
        clearTimeout(reflowTimer);
        reflowTimer = setTimeout(reflowWidgets, 150);
      }).observe(document.getElementById("widgetArea"));
    }
  }

  // src/source.js
  init_state();
  init_dom();
  init_constants();
  init_utils();
  init_filters();
  init_spots();
  init_markers();
  function updateTableColumns() {
    const cols = SOURCE_DEFS[state_default.currentSource].columns;
    $("spotsHead").innerHTML = "<tr>" + cols.map((c) => `<th>${esc(c.label)}</th>`).join("") + "</tr>";
  }
  function updateFilterVisibility() {
    const allowed = SOURCE_DEFS[state_default.currentSource].filters;
    $("bandFilters").style.display = allowed.includes("band") ? "" : "none";
    $("modeFilters").style.display = allowed.includes("mode") ? "" : "none";
    $("countryFilter").style.display = allowed.includes("country") ? "" : "none";
    $("stateFilter").style.display = allowed.includes("state") ? "" : "none";
    $("gridFilter").style.display = allowed.includes("grid") ? "" : "none";
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
    state_default.activeBand = null;
    state_default.activeMode = null;
    state_default.activeCountry = null;
    state_default.activeState = null;
    state_default.activeGrid = null;
    const privFilterCheckbox = $("privFilter");
    if (privFilterCheckbox) {
      state_default.privilegeFilterEnabled = false;
      privFilterCheckbox.checked = false;
    }
    const countryFilter = $("countryFilter");
    if (countryFilter) countryFilter.value = "";
    const stateFilter = $("stateFilter");
    if (stateFilter) stateFilter.value = "";
    const gridFilter = $("gridFilter");
    if (gridFilter) gridFilter.value = "";
    applyFilter();
    renderSpots();
    renderMarkers();
    updateBandFilterButtons();
    updateModeFilterButtons();
    updateCountryFilter();
    updateStateFilter();
    updateGridFilter();
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
        state_default.callsignCache[key] = null;
        return null;
      }
      const data = await resp.json();
      if (data.status !== "VALID") {
        state_default.callsignCache[key] = null;
        return null;
      }
      state_default.callsignCache[key] = data;
      return data;
    } catch {
      state_default.callsignCache[key] = null;
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

  // src/clocks.js
  init_state();
  init_dom();
  init_utils();
  init_geo();
  function drawAnalogClock(canvas, date) {
    const size = Math.min(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight - 24) - 4;
    if (size < 20) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const r = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(r, r);
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = "#0f3460";
    ctx.fill();
    ctx.strokeStyle = "#2a3a5e";
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 1; i <= 12; i++) {
      const angle = i * Math.PI / 6 - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(cos * (r - 12), sin * (r - 12));
      ctx.lineTo(cos * (r - 5), sin * (r - 5));
      ctx.strokeStyle = "#8899aa";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = "#e0e0e0";
      ctx.font = `bold ${Math.round(r * 0.22)}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(i.toString(), cos * (r - 22), sin * (r - 22));
    }
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const angle = i * Math.PI / 30 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (r - 8), Math.sin(angle) * (r - 8));
      ctx.lineTo(Math.cos(angle) * (r - 5), Math.sin(angle) * (r - 5));
      ctx.strokeStyle = "#2a3a5e";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    const h = date.getHours() % 12;
    const m = date.getMinutes();
    const s = date.getSeconds();
    const hAngle = (h + m / 60) * Math.PI / 6 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hAngle) * r * 0.5, Math.sin(hAngle) * r * 0.5);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.stroke();
    const mAngle = (m + s / 60) * Math.PI / 30 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(mAngle) * r * 0.7, Math.sin(mAngle) * r * 0.7);
    ctx.strokeStyle = "#e0e0e0";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.stroke();
    const sAngle = s * Math.PI / 30 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sAngle) * r * 0.75, Math.sin(sAngle) * r * 0.75);
    ctx.strokeStyle = "#e94560";
    ctx.lineWidth = 1;
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#e94560";
    ctx.fill();
    ctx.restore();
  }
  function applyClockStyle() {
    $("clockLocal").classList.toggle("analog", state_default.clockStyle === "analog");
    $("clockUtc").classList.toggle("analog", state_default.clockStyle === "analog");
  }
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
    const dateOpts = { weekday: "short", month: "short", day: "numeric", year: "numeric" };
    const localIcon = state_default.lastLocalDay === true ? "\u2600\uFE0F" : state_default.lastLocalDay === false ? "\u{1F319}" : "";
    const utcIcon = state_default.lastUtcDay === true ? "\u2600\uFE0F" : state_default.lastUtcDay === false ? "\u{1F319}" : "";
    const localTime = fmtTime(now);
    const utcTime = fmtTime(now, { timeZone: "UTC" });
    $("clockLocalTime").innerHTML = (localIcon ? '<span class="daynight-emoji">' + localIcon + "</span> " : "") + esc(localTime);
    $("clockUtcTime").innerHTML = (utcIcon ? '<span class="daynight-emoji">' + utcIcon + "</span> " : "") + esc(utcTime);
    $("clockUtcDate").textContent = now.toLocaleDateString(void 0, Object.assign({ timeZone: "UTC" }, dateOpts));
    if (state_default.clockStyle === "analog") {
      drawAnalogClock($("clockLocalCanvas"), now);
      const utcDate = new Date(now);
      utcDate.setMinutes(utcDate.getMinutes() + utcDate.getTimezoneOffset());
      drawAnalogClock($("clockUtcCanvas"), utcDate);
    }
    applyClockStyle();
    updateDayNight();
  }

  // src/splash.js
  init_spots();

  // src/weather.js
  init_state();
  init_dom();
  init_utils();
  var wxBgClasses = ["wx-clear-day", "wx-clear-night", "wx-partly-cloudy-day", "wx-partly-cloudy-night", "wx-cloudy", "wx-rain", "wx-thunderstorm", "wx-snow", "wx-fog"];
  function useWU() {
    return state_default.wxStation && state_default.wxApiKey;
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
        $("clockLocalWeather").innerHTML = line1 + "<br>" + line2;
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
    const url = "/api/weather/conditions?lat=" + state_default.myLat + "&lon=" + state_default.myLon;
    fetch(url).then((r) => r.ok ? r.json() : Promise.reject()).then((data) => {
      applyWeatherBackground(data.shortForecast, data.isDaytime);
      if (!useWU()) {
        const tempStr = data.temperature != null ? data.temperature + "\xB0" + (data.temperatureUnit || "F") : "";
        const cond = data.shortForecast || "";
        const wind = data.windDirection && data.windSpeed ? data.windDirection + " " + data.windSpeed : "";
        const hum = data.relativeHumidity != null ? data.relativeHumidity + "%" : "";
        let line1 = [tempStr, cond].filter(Boolean).join("  ");
        let line2 = [wind ? "W: " + wind : "", hum ? "H: " + hum : ""].filter(Boolean).join("  ");
        $("clockLocalWeather").innerHTML = line1 + (line2 ? "<br>" + line2 : "");
        setWxSource("nws");
      }
    }).catch((err) => {
      console.warn("NWS conditions fetch failed:", err);
    });
  }
  function applyWeatherBackground(forecast, isDaytime2) {
    const body = document.querySelector("#widget-clock-local .widget-body");
    wxBgClasses.forEach((c) => body.classList.remove(c));
    if (!forecast) return;
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
    if (cls) body.classList.add(cls);
  }
  function fetchNwsAlerts() {
    if (state_default.myLat === null || state_default.myLon === null) return;
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
        div.innerHTML = '<div class="wx-alert-event wx-sev-' + (a.severity || "Unknown") + '">' + esc(a.event) + " (" + esc(a.severity) + ')</div><div class="wx-alert-headline">' + esc(a.headline || "") + '</div><div class="wx-alert-desc">' + esc(a.description || "") + "</div>" + (a.web ? '<div class="wx-alert-link"><a href="' + esc(a.web) + '" target="_blank" rel="noopener">View on NWS website</a></div>' : "");
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
  function updateOperatorDisplay2() {
    const opCall = $("opCall");
    const opLoc = $("opLoc");
    if (state_default.myCallsign) {
      const qrz = `https://www.qrz.com/db/${encodeURIComponent(state_default.myCallsign)}`;
      let classLabel = state_default.licenseClass ? ` [${state_default.licenseClass}]` : "";
      opCall.innerHTML = `<a href="${qrz}" target="_blank" rel="noopener">${esc(state_default.myCallsign)}</a><span class="op-class">${esc(classLabel)}</span>`;
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
    const el = $("splashLocStatus");
    el.textContent = msg || "";
    el.classList.toggle("error", !!isError);
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
  var _initApp = null;
  function setInitApp(fn) {
    _initApp = fn;
  }
  function showSplash() {
    const splash = $("splash");
    splash.classList.remove("hidden");
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
    $("timeFmt24").checked = state_default.use24h;
    $("timeFmt12").checked = !state_default.use24h;
    const widgetList = document.getElementById("splashWidgetList");
    widgetList.innerHTML = "";
    WIDGET_DEFS.forEach((w) => {
      const label = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.dataset.widgetId = w.id;
      cb.checked = state_default.widgetVisibility[w.id] !== false;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(w.name));
      widgetList.appendChild(label);
    });
    $("splashWxStation").value = state_default.wxStation;
    $("splashWxApiKey").value = state_default.wxApiKey;
    const intervalSelect = $("splashUpdateInterval");
    const savedInterval = localStorage.getItem("hamtab_update_interval") || "60";
    intervalSelect.value = savedInterval;
    $("splashGridDropdown").classList.remove("open");
    $("splashGridDropdown").innerHTML = "";
    state_default.gridHighlightIdx = -1;
    $("splashVersion").textContent = "0.2.0";
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
    state_default.wxStation = ($("splashWxStation").value || "").trim().toUpperCase();
    state_default.wxApiKey = ($("splashWxApiKey").value || "").trim();
    localStorage.setItem("hamtab_wx_station", state_default.wxStation);
    localStorage.setItem("hamtab_wx_apikey", state_default.wxApiKey);
    fetchWeather();
    const widgetList = document.getElementById("splashWidgetList");
    widgetList.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      state_default.widgetVisibility[cb.dataset.widgetId] = cb.checked;
    });
    saveWidgetVisibility();
    applyWidgetVisibility();
    const intervalSelect = $("splashUpdateInterval");
    const intervalVal = intervalSelect.value;
    localStorage.setItem("hamtab_update_interval", intervalVal);
    fetch("/api/update/interval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ seconds: parseInt(intervalVal, 10) })
    }).catch(() => {
    });
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
    $("splashOk").addEventListener("click", dismissSplash);
    $("splashCallsign").addEventListener("keydown", (e) => {
      if (e.key === "Enter") dismissSplash();
    });
    $("splashLat").addEventListener("input", () => {
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
    });
    $("splashLon").addEventListener("input", () => {
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
    });
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
    $("editCallBtn").addEventListener("click", () => {
      showSplash();
    });
    $("refreshLocBtn").addEventListener("click", () => {
      if (state_default.manualLoc) {
        showSplash();
      } else {
        $("opLoc").textContent = "Locating...";
        fetchLocation();
      }
    });
  }

  // src/config.js
  init_state();
  init_dom();
  init_constants();
  init_solar();
  init_lunar();
  init_map_overlays();
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
        mapOverlayCfgSplash.classList.remove("hidden");
      });
    }
    if (mapOverlayCfgOk) {
      mapOverlayCfgOk.addEventListener("click", () => {
        state_default.mapOverlays.latLonGrid = $("mapOvLatLon").checked;
        state_default.mapOverlays.maidenheadGrid = $("mapOvMaidenhead").checked;
        state_default.mapOverlays.timezoneGrid = $("mapOvTimezone").checked;
        saveMapOverlays();
        mapOverlayCfgSplash.classList.add("hidden");
        renderAllMapOverlays();
      });
    }
    $("clockLocalCfgBtn").addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    $("clockUtcCfgBtn").addEventListener("mousedown", (e) => {
      e.stopPropagation();
    });
    function showClockCfg() {
      if (state_default.clockStyle === "analog") $("clockStyleAnalog").checked = true;
      else $("clockStyleDigital").checked = true;
      $("clockCfgSplash").classList.remove("hidden");
    }
    function dismissClockCfg() {
      state_default.clockStyle = document.querySelector('input[name="clockStyle"]:checked').value;
      localStorage.setItem("hamtab_clock_style", state_default.clockStyle);
      $("clockCfgSplash").classList.add("hidden");
      applyClockStyle();
      const def = getDefaultLayout();
      ["widget-clock-local", "widget-clock-utc", "widget-map"].forEach((id) => {
        const el = document.getElementById(id);
        const pos = def[id];
        if (el && pos) {
          el.style.height = pos.height + "px";
          el.style.top = pos.top + "px";
        }
      });
      saveWidgets();
      if (state_default.map) state_default.map.invalidateSize();
      updateClocks();
    }
    $("clockLocalCfgBtn").addEventListener("click", showClockCfg);
    $("clockUtcCfgBtn").addEventListener("click", showClockCfg);
    $("clockCfgOk").addEventListener("click", dismissClockCfg);
  }

  // src/bandref.js
  init_state();
  init_dom();
  init_constants();
  init_filters();
  function renderBandRef() {
    const bandRefMyPriv = $("bandRefMyPriv");
    const myPrivOnly = bandRefMyPriv.checked;
    const hasClass = isUSCallsign(state_default.myCallsign) && !!state_default.licenseClass;
    bandRefMyPriv.disabled = !hasClass;
    if (!hasClass) bandRefMyPriv.checked = false;
    const MODE_LABELS = { all: "All", cw: "CW", cwdig: "CW/Digital", phone: "Phone" };
    let classesToShow;
    if (myPrivOnly && hasClass) {
      classesToShow = [state_default.licenseClass.toUpperCase()];
    } else {
      classesToShow = ["EXTRA", "GENERAL", "TECHNICIAN", "NOVICE"];
    }
    const CLASS_DISPLAY = { EXTRA: "Extra", GENERAL: "General", TECHNICIAN: "Technician", NOVICE: "Novice" };
    let html = "";
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
    $("bandRefContent").innerHTML = html;
  }
  function initBandRefListeners() {
    $("bandRefBtn").addEventListener("click", () => {
      renderBandRef();
      $("bandRefSplash").classList.remove("hidden");
    });
    $("bandRefOk").addEventListener("click", () => {
      $("bandRefSplash").classList.add("hidden");
    });
    $("bandRefMyPriv").addEventListener("change", () => {
      renderBandRef();
    });
  }

  // src/refresh.js
  init_state();
  init_dom();
  init_constants();
  init_utils();
  init_filters();
  init_spots();
  init_markers();
  init_solar();
  init_lunar();
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
        $("lastUpdated").textContent = "Updated: " + fmtTime(/* @__PURE__ */ new Date());
      }
    } catch (err) {
      console.error(`Failed to fetch ${source} spots:`, err);
    }
  }
  function refreshAll() {
    fetchSourceData("pota");
    fetchSourceData("sota");
    fetchSolar();
    fetchLunar();
    fetchPropagation();
    resetCountdown();
  }
  function resetCountdown() {
    state_default.countdownSeconds = 60;
    updateCountdownDisplay();
  }
  function updateCountdownDisplay() {
    if (state_default.autoRefreshEnabled) {
      $("countdown").textContent = `(${state_default.countdownSeconds}s)`;
    } else {
      $("countdown").textContent = "";
    }
  }
  function startAutoRefresh() {
    stopAutoRefresh();
    state_default.autoRefreshEnabled = true;
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
    if (state_default.countdownTimer) {
      clearInterval(state_default.countdownTimer);
      state_default.countdownTimer = null;
    }
    $("countdown").textContent = "";
  }
  function initRefreshListeners() {
    $("autoRefresh").addEventListener("change", () => {
      if ($("autoRefresh").checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
    $("refreshBtn").addEventListener("click", () => {
      refreshAll();
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
      if (data.serverHash) {
        if (!state_default.knownServerHash) state_default.knownServerHash = data.serverHash;
      }
      if (state_default.restartNeeded) return;
      if (data.available) {
        $("updateDot").className = "update-dot green";
        $("updateLabel").textContent = "Update available";
      } else {
        $("updateDot").className = "update-dot gray";
        $("updateLabel").textContent = data.lastCheck ? "Checked " + fmtTime(new Date(data.lastCheck), { hour: "2-digit", minute: "2-digit" }) : "No updates";
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
  function showRestartNeeded() {
    state_default.restartNeeded = true;
    $("updateDot").className = "update-dot yellow";
    $("updateLabel").textContent = "Restart needed";
    $("restartBtn").classList.remove("hidden");
  }
  async function applyUpdate() {
    $("updateDot").className = "update-dot yellow";
    $("updateLabel").textContent = "Applying...";
    $("updateIndicator").style.pointerEvents = "none";
    try {
      const resp = await fetch("/api/update/apply", { method: "POST" });
      const data = await resp.json();
      if (!resp.ok) {
        $("updateDot").className = "update-dot red";
        $("updateLabel").textContent = data.error || "Failed";
        $("updateIndicator").style.pointerEvents = "";
        return;
      }
      if (!data.updated) {
        $("updateDot").className = "update-dot gray";
        $("updateLabel").textContent = "Already up to date";
        $("updateIndicator").style.pointerEvents = "";
        return;
      }
      if (data.serverRestarting) {
        $("updateLabel").textContent = "Restarting...";
        pollForServer(30);
      } else {
        try {
          const statusResp = await fetch("/api/update/status");
          if (statusResp.ok) {
            const statusData = await statusResp.json();
            if (statusData.serverHash && state_default.knownServerHash && statusData.serverHash !== state_default.knownServerHash) {
              showRestartNeeded();
              return;
            }
          }
        } catch {
        }
        $("updateLabel").textContent = "Reloading...";
        setTimeout(() => location.reload(), 500);
      }
    } catch (err) {
      $("updateDot").className = "update-dot red";
      $("updateLabel").textContent = "Error";
      $("updateIndicator").style.pointerEvents = "";
    }
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
      if ($("updateDot").classList.contains("green") && !state_default.restartNeeded) {
        applyUpdate();
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

  // src/iss.js
  init_state();
  async function fetchISS() {
    try {
      const resp = await fetch("/api/iss");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      updateISS(data);
    } catch (err) {
      console.error("Failed to fetch ISS:", err);
    }
  }
  function updateISS(data) {
    if (!state_default.map) return;
    const lat = data.latitude;
    const lon = data.longitude;
    const footprintKm = data.footprint || 0;
    const radiusMeters = footprintKm / 2 * 1e3;
    if (state_default.issMarker) {
      state_default.issMarker.setLatLng([lat, lon]);
    } else {
      const icon = L.divIcon({
        className: "iss-icon",
        html: "ISS",
        iconSize: [40, 20],
        iconAnchor: [20, 10]
      });
      state_default.issMarker = L.marker([lat, lon], { icon, zIndexOffset: 1e4 }).addTo(state_default.map);
      state_default.issMarker.bindPopup("", { maxWidth: 280 });
    }
    state_default.issMarker.setPopupContent(
      `<div class="iss-popup"><div class="iss-popup-title">ISS (ZARYA)</div><div class="iss-popup-row">Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}</div><div class="iss-popup-row">Alt: ${Math.round(data.altitude)} km &bull; Vel: ${Math.round(data.velocity)} km/h</div><div class="iss-popup-row">Visibility: ${data.visibility || "N/A"}</div><div class="iss-radio-header">Amateur Radio (ARISS)</div><table class="iss-freq-table"><tr><td>V/U Repeater &#8593;</td><td>145.990 MHz FM</td></tr><tr><td>V/U Repeater &#8595;</td><td>437.800 MHz FM</td></tr><tr><td>Voice Downlink</td><td>145.800 MHz FM</td></tr><tr><td>APRS / Packet</td><td>145.825 MHz</td></tr><tr><td>SSTV Events</td><td>145.800 MHz PD120</td></tr></table><div class="iss-radio-note">Repeater &amp; APRS typically active. SSTV during special events. Use &#177;10 kHz Doppler shift.</div></div>`
    );
    if (state_default.issCircle) {
      state_default.issCircle.setLatLng([lat, lon]);
      state_default.issCircle.setRadius(radiusMeters);
    } else {
      state_default.issCircle = L.circle([lat, lon], {
        radius: radiusMeters,
        color: "#00bcd4",
        fillColor: "#00bcd4",
        fillOpacity: 0.08,
        weight: 1
      }).addTo(state_default.map);
    }
    state_default.issTrail.push([lat, lon]);
    if (state_default.issTrail.length > 20) state_default.issTrail.shift();
    if (state_default.issTrailLine) state_default.map.removeLayer(state_default.issTrailLine);
    if (state_default.issTrail.length > 1) {
      const segs = [[]];
      for (let i = 0; i < state_default.issTrail.length; i++) {
        segs[segs.length - 1].push(state_default.issTrail[i]);
        if (i < state_default.issTrail.length - 1) {
          if (Math.abs(state_default.issTrail[i + 1][1] - state_default.issTrail[i][1]) > 180) {
            segs.push([]);
          }
        }
      }
      state_default.issTrailLine = L.polyline(segs, {
        color: "#00bcd4",
        weight: 2,
        opacity: 0.6,
        dashArray: "4 6"
      }).addTo(state_default.map);
    }
  }
  async function fetchISSOrbit() {
    try {
      const resp = await fetch("/api/iss/orbit");
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      renderISSOrbit(data);
    } catch (err) {
      console.error("Failed to fetch ISS orbit:", err);
    }
  }
  function renderISSOrbit(positions) {
    if (!state_default.map) return;
    if (state_default.issOrbitLine) state_default.map.removeLayer(state_default.issOrbitLine);
    if (!positions || positions.length < 2) return;
    const segments = [[]];
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];
      segments[segments.length - 1].push([p.latitude, p.longitude]);
      if (i < positions.length - 1) {
        const lonDiff = Math.abs(positions[i + 1].longitude - p.longitude);
        if (lonDiff > 180) {
          segments.push([]);
        }
      }
    }
    state_default.issOrbitLine = L.polyline(segments, {
      color: "#00bcd4",
      weight: 1.5,
      opacity: 0.35,
      dashArray: "8 8",
      interactive: false
    }).addTo(state_default.map);
  }

  // src/main.js
  init_spot_detail();
  migrate();
  state_default.solarFieldVisibility = loadSolarFieldVisibility();
  state_default.lunarFieldVisibility = loadLunarFieldVisibility();
  state_default.widgetVisibility = loadWidgetVisibility();
  initMap();
  updateGrayLine();
  setInterval(updateGrayLine, 6e4);
  setInterval(fetchISS, 5e3);
  fetchISS();
  fetchISSOrbit();
  setInterval(fetchISSOrbit, 3e5);
  updateClocks();
  setInterval(updateClocks, 1e3);
  setInterval(renderSpots, 3e4);
  initSourceListeners();
  initFilterListeners();
  initTooltipListeners();
  initSplashListeners();
  initConfigListeners();
  initBandRefListeners();
  initRefreshListeners();
  initUpdateListeners();
  initFullscreenListeners();
  initWeatherListeners();
  initPropListeners();
  initSolarImage();
  initSpotDetail();
  function initApp() {
    if (state_default.appInitialized) return;
    state_default.appInitialized = true;
    refreshAll();
    startAutoRefresh();
    fetchLocation();
    startUpdateStatusPolling();
    sendUpdateInterval();
    fetchWeather();
    startNwsPolling();
  }
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
