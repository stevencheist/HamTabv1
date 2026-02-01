// Migrate localStorage keys from pota_ to hamtab_ (one-time)
(() => {
  if (localStorage.getItem('hamtab_migrated')) return;
  const PREFIX_OLD = 'pota_';
  const PREFIX_NEW = 'hamtab_';
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith(PREFIX_OLD)) {
      const newKey = PREFIX_NEW + key.slice(PREFIX_OLD.length);
      if (localStorage.getItem(newKey) === null) {
        localStorage.setItem(newKey, localStorage.getItem(key));
      }
      localStorage.removeItem(key);
      i--; // adjust index after removal
    }
  }
  localStorage.setItem('hamtab_migrated', '1');
})();

(() => {
  // State
  let markers = {};
  let selectedSpotId = null;
  let activeBand = null;
  let activeMode = null;
  let activeCountry = null;
  let activeState = null;
  let activeGrid = null;
  let autoRefreshEnabled = true;
  let refreshInterval = null;
  let countdownSeconds = 60;
  let countdownTimer = null;
  let use24h = localStorage.getItem('hamtab_time24') !== 'false';
  let privilegeFilterEnabled = localStorage.getItem('hamtab_privilege_filter') === 'true';
  let licenseClass = localStorage.getItem('hamtab_license_class') || '';
  let propMetric = localStorage.getItem('hamtab_prop_metric') || 'mufd';
  let mapCenterMode = localStorage.getItem('hamtab_map_center') || 'qth';
  // Migrate old SVG metric values to new GeoJSON types
  if (propMetric === 'mof_sp' || propMetric === 'lof_sp') { propMetric = 'mufd'; localStorage.setItem('hamtab_prop_metric', propMetric); }
  let propLayer = null;
  let propLabelLayer = null;

  // Map overlay state
  const MAP_OVERLAY_KEY = 'hamtab_map_overlays';
  let mapOverlays = { latLonGrid: false, maidenheadGrid: false, timezoneGrid: false };
  try {
    const saved = JSON.parse(localStorage.getItem(MAP_OVERLAY_KEY));
    if (saved) Object.assign(mapOverlays, saved);
  } catch (e) {}
  function saveMapOverlays() { localStorage.setItem(MAP_OVERLAY_KEY, JSON.stringify(mapOverlays)); }
  let latLonLayer = null;
  let maidenheadLayer = null;
  let timezoneLayer = null;
  let maidenheadDebounceTimer = null;

  // Widget registry (single source of truth)
  const WIDGET_DEFS = [
    { id: 'widget-clock-local', name: 'Local Time' },
    { id: 'widget-clock-utc',   name: 'UTC' },
    { id: 'widget-activations', name: 'On the Air' },
    { id: 'widget-map',         name: 'HamMap' },
    { id: 'widget-solar',       name: 'Solar & Propagation' },
    { id: 'widget-lunar',       name: 'Lunar / EME' },
  ];

  // Source config for activations widget
  const SOURCE_DEFS = {
    pota: {
      label: 'POTA',
      endpoint: '/api/spots',
      columns: [
        { key: 'callsign',  label: 'Callsign', class: 'callsign' },
        { key: 'frequency',  label: 'Freq',     class: 'freq' },
        { key: 'mode',       label: 'Mode',     class: 'mode' },
        { key: 'reference',  label: 'Park (link)', class: '' },
        { key: 'name',       label: 'Name',     class: '' },
        { key: 'spotTime',   label: 'Time',     class: '' },
        { key: 'age',        label: 'Age',      class: '' },
      ],
      filters: ['band', 'mode', 'country', 'state', 'grid', 'privilege'],
      hasMap: true,
      spotId: (s) => `${s.activator || s.callsign}-${s.reference}-${s.frequency}`,
      sortKey: 'spotTime',
    },
    sota: {
      label: 'SOTA',
      endpoint: '/api/spots/sota',
      columns: [
        { key: 'callsign',  label: 'Callsign', class: 'callsign' },
        { key: 'frequency',  label: 'Freq',     class: 'freq' },
        { key: 'mode',       label: 'Mode',     class: 'mode' },
        { key: 'reference',  label: 'Summit (link)', class: '' },
        { key: 'name',       label: 'Details',  class: '' },
        { key: 'spotTime',   label: 'Time',     class: '' },
        { key: 'age',        label: 'Age',      class: '' },
      ],
      filters: ['band', 'mode'],
      hasMap: true,
      spotId: (s) => `${s.callsign}-${s.reference}-${s.frequency}`,
      sortKey: 'spotTime',
    },
  };

  let currentSource = localStorage.getItem('hamtab_spot_source') || 'pota';
  const sourceData = { pota: [], sota: [] };
  const sourceFiltered = { pota: [], sota: [] };

  // Widget visibility state
  const WIDGET_VIS_KEY = 'hamtab_widget_vis';
  let widgetVisibility = loadWidgetVisibility();

  function loadWidgetVisibility() {
    try {
      const saved = JSON.parse(localStorage.getItem(WIDGET_VIS_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch (e) {}
    const vis = {};
    WIDGET_DEFS.forEach(w => vis[w.id] = true);
    return vis;
  }

  function saveWidgetVisibility() {
    localStorage.setItem(WIDGET_VIS_KEY, JSON.stringify(widgetVisibility));
  }

  function applyWidgetVisibility() {
    WIDGET_DEFS.forEach(w => {
      const el = document.getElementById(w.id);
      if (!el) return;
      if (widgetVisibility[w.id] === false) {
        el.style.display = 'none';
      } else {
        el.style.display = '';
      }
    });
    if (map) setTimeout(() => map.invalidateSize(), 50);
  }

  // Solar field registry (single source of truth)
  const SOLAR_FIELD_DEFS = [
    // Currently displayed (default: visible)
    { key: 'sfi',           label: 'Solar Flux',      unit: '',      colorFn: null,           defaultVisible: true  },
    { key: 'sunspots',      label: 'Sunspots',        unit: '',      colorFn: null,           defaultVisible: true  },
    { key: 'aindex',        label: 'A-Index',         unit: '',      colorFn: aColor,         defaultVisible: true  },
    { key: 'kindex',        label: 'K-Index',         unit: '',      colorFn: kColor,         defaultVisible: true  },
    { key: 'xray',          label: 'X-Ray',           unit: '',      colorFn: null,           defaultVisible: true  },
    { key: 'signalnoise',   label: 'Signal Noise',    unit: '',      colorFn: null,           defaultVisible: true  },
    // New fields (default: hidden)
    { key: 'solarwind',     label: 'Solar Wind',      unit: ' km/s', colorFn: solarWindColor, defaultVisible: false },
    { key: 'magneticfield', label: 'Bz (IMF)',        unit: ' nT',   colorFn: bzColor,        defaultVisible: false },
    { key: 'protonflux',    label: 'Proton Flux',     unit: '',      colorFn: null,           defaultVisible: false },
    { key: 'electonflux',   label: 'Electron Flux',   unit: '',      colorFn: null,           defaultVisible: false },
    { key: 'aurora',        label: 'Aurora',           unit: '',      colorFn: auroraColor,    defaultVisible: false },
    { key: 'latdegree',     label: 'Aurora Lat',      unit: '\u00B0',colorFn: null,           defaultVisible: false },
    { key: 'heliumline',    label: 'He 10830\u00C5',  unit: '',      colorFn: null,           defaultVisible: false },
    { key: 'geomagfield',   label: 'Geomag Field',    unit: '',      colorFn: geomagColor,    defaultVisible: false },
    { key: 'kindexnt',      label: 'K-Index (Night)', unit: '',      colorFn: kColor,         defaultVisible: false },
    { key: 'muf',           label: 'MUF',             unit: ' MHz',  colorFn: null,           defaultVisible: false },
    { key: 'fof2',          label: 'foF2',            unit: ' MHz',  colorFn: null,           defaultVisible: false },
    { key: 'muffactor',     label: 'MUF Factor',      unit: '',      colorFn: null,           defaultVisible: false },
  ];

  // Solar field visibility state
  const SOLAR_VIS_KEY = 'hamtab_solar_fields';
  let solarFieldVisibility = loadSolarFieldVisibility();

  function loadSolarFieldVisibility() {
    try {
      const saved = JSON.parse(localStorage.getItem(SOLAR_VIS_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch (e) {}
    const vis = {};
    SOLAR_FIELD_DEFS.forEach(f => vis[f.key] = f.defaultVisible);
    return vis;
  }

  function saveSolarFieldVisibility() {
    localStorage.setItem(SOLAR_VIS_KEY, JSON.stringify(solarFieldVisibility));
  }

  // Solar color functions (must be function declarations for hoisting)
  function solarWindColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    if (n < 400) return 'var(--green)';
    if (n < 600) return 'var(--yellow)';
    return 'var(--red)';
  }

  function bzColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    if (n >= 0) return 'var(--green)';
    if (n > -10) return 'var(--yellow)';
    return 'var(--red)';
  }

  function auroraColor(val) {
    const n = parseInt(val);
    if (isNaN(n)) return '';
    if (n <= 3) return 'var(--green)';
    if (n <= 6) return 'var(--yellow)';
    return 'var(--red)';
  }

  function geomagColor(val) {
    const s = (val || '').toLowerCase();
    if (s.includes('quiet')) return 'var(--green)';
    if (s.includes('unsettled') || s.includes('active')) return 'var(--yellow)';
    if (s.includes('storm') || s.includes('major')) return 'var(--red)';
    return '';
  }

  // Lunar field registry (single source of truth)
  const LUNAR_FIELD_DEFS = [
    // Currently displayed (default: visible)
    { key: 'phase',          label: 'Moon Phase',      unit: '',      colorFn: null,          defaultVisible: true  },
    { key: 'illumination',   label: 'Illumination',    unit: '%',     colorFn: null,          defaultVisible: true  },
    { key: 'declination',    label: 'Declination',     unit: '\u00B0',colorFn: lunarDecColor, defaultVisible: true  },
    { key: 'distance',       label: 'Distance',        unit: ' km',   colorFn: null,          defaultVisible: true  },
    { key: 'pathLoss',       label: 'Path Loss',       unit: ' dB',   colorFn: lunarPlColor,  defaultVisible: true  },
    // New fields (default: hidden)
    { key: 'elongation',     label: 'Elongation',      unit: '\u00B0',colorFn: null,          defaultVisible: false },
    { key: 'eclipticLon',    label: 'Ecl. Longitude',  unit: '\u00B0',colorFn: null,          defaultVisible: false },
    { key: 'eclipticLat',    label: 'Ecl. Latitude',   unit: '\u00B0',colorFn: null,          defaultVisible: false },
    { key: 'rightAscension', label: 'Right Ascension', unit: '\u00B0',colorFn: null,          defaultVisible: false },
  ];

  // Lunar field visibility state
  const LUNAR_VIS_KEY = 'hamtab_lunar_fields';
  let lunarFieldVisibility = loadLunarFieldVisibility();

  function loadLunarFieldVisibility() {
    try {
      const saved = JSON.parse(localStorage.getItem(LUNAR_VIS_KEY));
      if (saved && typeof saved === 'object') return saved;
    } catch (e) {}
    const vis = {};
    LUNAR_FIELD_DEFS.forEach(f => vis[f.key] = f.defaultVisible);
    return vis;
  }

  function saveLunarFieldVisibility() {
    localStorage.setItem(LUNAR_VIS_KEY, JSON.stringify(lunarFieldVisibility));
  }

  // Lunar color functions
  function lunarDecColor(val) {
    const n = Math.abs(parseFloat(val));
    if (isNaN(n)) return '';
    if (n < 15) return 'var(--green)';
    if (n < 25) return 'var(--yellow)';
    return 'var(--red)';
  }

  function lunarPlColor(val) {
    const n = parseFloat(val);
    if (isNaN(n)) return '';
    if (n < -0.5) return 'var(--green)';
    if (n < 0.5) return 'var(--yellow)';
    return 'var(--red)';
  }

  // Cached data for re-rendering after config changes
  let lastSolarData = null;
  let lastLunarData = null;

  // DOM refs
  const spotsBody = document.getElementById('spotsBody');
  const spotCount = document.getElementById('spotCount');
  const bandFilters = document.getElementById('bandFilters');
  const modeFilters = document.getElementById('modeFilters');
  const countryFilter = document.getElementById('countryFilter');
  const stateFilter = document.getElementById('stateFilter');
  const gridFilter = document.getElementById('gridFilter');
  const lunarCards = document.getElementById('lunarCards');
  const lastUpdated = document.getElementById('lastUpdated');
  const countdownEl = document.getElementById('countdown');
  const autoRefreshCb = document.getElementById('autoRefresh');
  const refreshBtn = document.getElementById('refreshBtn');
  const solarIndices = document.getElementById('solarIndices');
  const headerBandsRow = document.getElementById('headerBandsRow');
  const splash = document.getElementById('splash');
  const splashCallsign = document.getElementById('splashCallsign');
  const splashOk = document.getElementById('splashOk');
  const opCall = document.getElementById('opCall');
  const opLoc = document.getElementById('opLoc');
  const editCallBtn = document.getElementById('editCallBtn');
  const refreshLocBtn = document.getElementById('refreshLocBtn');
  const splashLat = document.getElementById('splashLat');
  const splashLon = document.getElementById('splashLon');
  const splashGrid = document.getElementById('splashGrid');
  const splashGridDropdown = document.getElementById('splashGridDropdown');
  const splashGpsBtn = document.getElementById('splashGpsBtn');
  const splashLocStatus = document.getElementById('splashLocStatus');
  const clockLocal = document.getElementById('clockLocal');
  const clockUtc = document.getElementById('clockUtc');
  const clockLocalTime = document.getElementById('clockLocalTime');
  const clockLocalDate = document.getElementById('clockLocalDate');
  const clockLocalCanvas = document.getElementById('clockLocalCanvas');
  const clockUtcTime = document.getElementById('clockUtcTime');
  const clockUtcDate = document.getElementById('clockUtcDate');
  const clockUtcCanvas = document.getElementById('clockUtcCanvas');
  const clockLocalCfgBtn = document.getElementById('clockLocalCfgBtn');
  const clockUtcCfgBtn = document.getElementById('clockUtcCfgBtn');
  const clockCfgSplash = document.getElementById('clockCfgSplash');
  const clockCfgOk = document.getElementById('clockCfgOk');
  const clockStyleDigital = document.getElementById('clockStyleDigital');
  const clockStyleAnalog = document.getElementById('clockStyleAnalog');
  let clockStyle = localStorage.getItem('hamtab_clock_style') || 'digital';
  // clockLocalDayNight removed — indicator now in time text
  const clockLocalWeather = document.getElementById('clockLocalWeather');
  const splashWxStation = document.getElementById('splashWxStation');
  const splashWxApiKey = document.getElementById('splashWxApiKey');
  let wxStation = localStorage.getItem('hamtab_wx_station') || '';
  let wxApiKey = localStorage.getItem('hamtab_wx_apikey') || '';
  const wxAlertBadge = document.getElementById('wxAlertBadge');
  const wxAlertSplash = document.getElementById('wxAlertSplash');
  const wxAlertList = document.getElementById('wxAlertList');
  const wxAlertClose = document.getElementById('wxAlertClose');
  let nwsAlerts = [];
  const wxSourceLogo = document.getElementById('wxSourceLogo');
  const timeFmt12 = document.getElementById('timeFmt12');
  const timeFmt24 = document.getElementById('timeFmt24');
  const solarCfgBtn = document.getElementById('solarCfgBtn');
  const solarCfgSplash = document.getElementById('solarCfgSplash');
  const solarFieldList = document.getElementById('solarFieldList');
  const solarCfgOk = document.getElementById('solarCfgOk');
  const lunarCfgBtn = document.getElementById('lunarCfgBtn');
  const lunarCfgSplash = document.getElementById('lunarCfgSplash');
  const lunarFieldList = document.getElementById('lunarFieldList');
  const lunarCfgOk = document.getElementById('lunarCfgOk');
  const bandRefBtn = document.getElementById('bandRefBtn');
  const bandRefSplash = document.getElementById('bandRefSplash');
  const bandRefOk = document.getElementById('bandRefOk');
  const bandRefMyPriv = document.getElementById('bandRefMyPriv');
  const bandRefContent = document.getElementById('bandRefContent');
  const propContainer = document.getElementById('propContainer');
  const spotsHead = document.getElementById('spotsHead');
  const sourceTabs = document.getElementById('sourceTabs');
  const widgetFiltersEl = document.getElementById('widgetFilters');

  // --- Source tab switching ---

  function switchSource(source) {
    if (!SOURCE_DEFS[source]) source = 'pota';
    currentSource = source;
    localStorage.setItem('hamtab_spot_source', source);

    // Toggle active class on tab buttons
    sourceTabs.querySelectorAll('.source-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.source === source);
    });

    // Update table columns
    updateTableColumns();

    // Update filter visibility
    updateFilterVisibility();

    // Reset all active filters
    activeBand = null;
    activeMode = null;
    activeCountry = null;
    activeState = null;
    activeGrid = null;
    if (privFilterCheckbox) {
      privilegeFilterEnabled = false;
      privFilterCheckbox.checked = false;
    }
    if (countryFilter) countryFilter.value = '';
    if (stateFilter) stateFilter.value = '';
    if (gridFilter) gridFilter.value = '';

    // Re-apply and render
    applyFilter();
    renderSpots();
    renderMarkers();
    updateBandFilterButtons();
    updateModeFilterButtons();
    updateCountryFilter();
    updateStateFilter();
    updateGridFilter();
  }

  function updateTableColumns() {
    const cols = SOURCE_DEFS[currentSource].columns;
    spotsHead.innerHTML = '<tr>' + cols.map(c => `<th>${esc(c.label)}</th>`).join('') + '</tr>';
  }

  function updateFilterVisibility() {
    const allowed = SOURCE_DEFS[currentSource].filters;

    // Band filters
    bandFilters.style.display = allowed.includes('band') ? '' : 'none';
    // Mode filters
    modeFilters.style.display = allowed.includes('mode') ? '' : 'none';
    // Country filter
    countryFilter.style.display = allowed.includes('country') ? '' : 'none';
    // State filter
    stateFilter.style.display = allowed.includes('state') ? '' : 'none';
    // Grid filter
    gridFilter.style.display = allowed.includes('grid') ? '' : 'none';
    // Privilege filter
    const privLabel = document.querySelector('.priv-filter-label');
    if (privLabel) {
      if (!allowed.includes('privilege')) {
        privLabel.style.display = 'none';
      } else {
        privLabel.style.display = '';
        updatePrivFilterVisibility();
      }
    }
  }

  // Tab click handlers
  sourceTabs.querySelectorAll('.source-tab').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => switchSource(btn.dataset.source));
  });

  // --- Operator callsign & location ---

  let myCallsign = localStorage.getItem('hamtab_callsign') || '';
  let myLat = null;
  let myLon = null;
  let manualLoc = false;
  let syncingFields = false;
  let gridHighlightIdx = -1;

  // Load manual location from localStorage if present
  const savedLat = localStorage.getItem('hamtab_lat');
  const savedLon = localStorage.getItem('hamtab_lon');
  if (savedLat !== null && savedLon !== null) {
    myLat = parseFloat(savedLat);
    myLon = parseFloat(savedLon);
    if (!isNaN(myLat) && !isNaN(myLon)) {
      manualLoc = true;
    } else {
      myLat = null;
      myLon = null;
    }
  }

  function latLonToGrid(lat, lon) {
    lon += 180;
    lat += 90;
    const a = String.fromCharCode(65 + Math.floor(lon / 20));
    const b = String.fromCharCode(65 + Math.floor(lat / 10));
    const c = Math.floor((lon % 20) / 2);
    const d = Math.floor((lat % 10) / 1);
    const e = String.fromCharCode(97 + Math.floor(((lon % 2) * 12)));
    const f = String.fromCharCode(97 + Math.floor(((lat % 1) * 24)));
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

  function getGridSuggestions(prefix) {
    const results = [];
    const p = prefix.toUpperCase();
    if (p.length === 0 || p.length >= 4) return results;

    const fieldChars = 'ABCDEFGHIJKLMNOPQR';
    const digitChars = '0123456789';

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

    generate('', 0);
    return results;
  }

  function showGridSuggestions(prefix) {
    const suggestions = getGridSuggestions(prefix);
    splashGridDropdown.innerHTML = '';
    gridHighlightIdx = -1;

    if (suggestions.length === 0) {
      splashGridDropdown.classList.remove('open');
      return;
    }

    suggestions.forEach((grid, idx) => {
      const div = document.createElement('div');
      div.className = 'grid-option';
      div.textContent = grid;
      div.addEventListener('mousedown', (e) => {
        e.preventDefault();
        selectGridSuggestion(grid);
      });
      splashGridDropdown.appendChild(div);
    });

    splashGridDropdown.classList.add('open');
  }

  function selectGridSuggestion(grid) {
    splashGrid.value = grid;
    splashGridDropdown.classList.remove('open');
    splashGridDropdown.innerHTML = '';
    gridHighlightIdx = -1;

    const ll = gridToLatLon(grid);
    if (ll) {
      syncingFields = true;
      splashLat.value = ll.lat.toFixed(2);
      splashLon.value = ll.lon.toFixed(2);
      myLat = ll.lat;
      myLon = ll.lon;
      syncingFields = false;
      manualLoc = true;
      splashGpsBtn.classList.remove('active');
      updateLocStatus('Manual location set');
    }
  }

  function updateLocStatus(msg, isError) {
    splashLocStatus.textContent = msg || '';
    splashLocStatus.classList.toggle('error', !!isError);
  }

  function updateGridHighlight() {
    const options = splashGridDropdown.querySelectorAll('.grid-option');
    options.forEach((opt, i) => {
      opt.classList.toggle('highlighted', i === gridHighlightIdx);
    });
    if (gridHighlightIdx >= 0 && options[gridHighlightIdx]) {
      options[gridHighlightIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  function centerMapOnUser() {
    if (!map) return;
    if (mapCenterMode === 'pm') {
      map.setView([0, 0], 2);
    } else if (mapCenterMode === 'qth') {
      if (myLat !== null && myLon !== null) {
        map.setView([myLat, myLon], map.getZoom());
      }
    }
    // 'spot' mode: don't move the map on startup/config changes
  }

  function updateUserMarker() {
    if (!map || myLat === null || myLon === null) return;
    const call = myCallsign || 'ME';
    const grid = latLonToGrid(myLat, myLon).substring(0, 4).toUpperCase();
    const popupHtml =
      `<div class="user-popup">` +
      `<div class="user-popup-title">${esc(call)}</div>` +
      `<div class="user-popup-row">${myLat.toFixed(4)}, ${myLon.toFixed(4)}</div>` +
      `<div class="user-popup-row">Grid: ${esc(grid)}</div>` +
      `<div class="user-popup-row">${manualLoc ? 'Manual override' : 'GPS'}</div>` +
      `</div>`;

    if (userMarker) {
      userMarker.setLatLng([myLat, myLon]);
      userMarker.setPopupContent(popupHtml);
      // Update icon in case callsign changed
      userMarker.setIcon(L.divIcon({
        className: 'user-icon',
        html: `<span class="user-icon-diamond">&#9889;</span><span class="user-icon-call">${esc(call)}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      }));
    } else {
      const icon = L.divIcon({
        className: 'user-icon',
        html: `<span class="user-icon-diamond">&#9889;</span><span class="user-icon-call">${esc(call)}</span>`,
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });
      userMarker = L.marker([myLat, myLon], { icon, zIndexOffset: 9000 }).addTo(map);
      userMarker.bindPopup(popupHtml, { maxWidth: 200 });
    }
  }

  function updateOperatorDisplay() {
    if (myCallsign) {
      const qrz = `https://www.qrz.com/db/${encodeURIComponent(myCallsign)}`;
      let classLabel = licenseClass ? ` [${licenseClass}]` : '';
      opCall.innerHTML = `<a href="${qrz}" target="_blank" rel="noopener">${esc(myCallsign)}</a><span class="op-class">${esc(classLabel)}</span>`;

      // Show operator name from cache
      const info = callsignCache[myCallsign.toUpperCase()];
      const opName = document.getElementById('opName');
      if (opName) {
        opName.textContent = info ? info.name : '';
      }
    } else {
      opCall.textContent = '';
      const opName = document.getElementById('opName');
      if (opName) opName.textContent = '';
    }
    if (myLat !== null && myLon !== null) {
      const grid = latLonToGrid(myLat, myLon);
      opLoc.textContent = `${myLat.toFixed(2)}, ${myLon.toFixed(2)} [${grid}]`;
    } else {
      opLoc.textContent = 'Location unknown';
    }
  }

  function fetchLocation() {
    if (manualLoc) return;
    if (!navigator.geolocation) {
      opLoc.textContent = 'Geolocation unavailable';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        myLat = pos.coords.latitude;
        myLon = pos.coords.longitude;
        updateOperatorDisplay();
        centerMapOnUser();
        updateUserMarker();
      },
      () => {
        opLoc.textContent = 'Location denied';
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }

  function showSplash() {
    splash.classList.remove('hidden');
    splashCallsign.value = myCallsign;

    if (myLat !== null && myLon !== null) {
      splashLat.value = myLat.toFixed(2);
      splashLon.value = myLon.toFixed(2);
      const grid = latLonToGrid(myLat, myLon);
      splashGrid.value = grid.substring(0, 4).toUpperCase();
    } else {
      splashLat.value = '';
      splashLon.value = '';
      splashGrid.value = '';
    }

    if (manualLoc) {
      splashGpsBtn.classList.remove('active');
      updateLocStatus('Manual override active');
    } else {
      splashGpsBtn.classList.add('active');
      updateLocStatus('Using GPS');
    }

    timeFmt24.checked = use24h;
    timeFmt12.checked = !use24h;

    // Populate widget visibility checkboxes
    const widgetList = document.getElementById('splashWidgetList');
    widgetList.innerHTML = '';
    WIDGET_DEFS.forEach(w => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.widgetId = w.id;
      cb.checked = widgetVisibility[w.id] !== false;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(w.name));
      widgetList.appendChild(label);
    });

    // Set weather fields
    splashWxStation.value = wxStation;
    splashWxApiKey.value = wxApiKey;

    // Set update interval picker
    const intervalSelect = document.getElementById('splashUpdateInterval');
    const savedInterval = localStorage.getItem('hamtab_update_interval') || '60';
    intervalSelect.value = savedInterval;

    splashGridDropdown.classList.remove('open');
    splashGridDropdown.innerHTML = '';
    gridHighlightIdx = -1;
    splashCallsign.focus();
  }

  function dismissSplash() {
    const val = splashCallsign.value.trim().toUpperCase();
    if (!val) return;
    myCallsign = val;
    localStorage.setItem('hamtab_callsign', myCallsign);

    if (manualLoc && myLat !== null && myLon !== null) {
      localStorage.setItem('hamtab_lat', String(myLat));
      localStorage.setItem('hamtab_lon', String(myLon));
    }

    use24h = timeFmt24.checked;
    localStorage.setItem('hamtab_time24', String(use24h));

    // Save weather config
    wxStation = (splashWxStation.value || '').trim().toUpperCase();
    wxApiKey = (splashWxApiKey.value || '').trim();
    localStorage.setItem('hamtab_wx_station', wxStation);
    localStorage.setItem('hamtab_wx_apikey', wxApiKey);
    fetchWeather();

    // Read widget visibility checkboxes
    const widgetList = document.getElementById('splashWidgetList');
    widgetList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      widgetVisibility[cb.dataset.widgetId] = cb.checked;
    });
    saveWidgetVisibility();
    applyWidgetVisibility();

    // Save and send update interval
    const intervalSelect = document.getElementById('splashUpdateInterval');
    const intervalVal = intervalSelect.value;
    localStorage.setItem('hamtab_update_interval', intervalVal);
    fetch('/api/update/interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds: parseInt(intervalVal, 10) }),
    }).catch(() => {});

    splashGridDropdown.classList.remove('open');
    splash.classList.add('hidden');
    updateOperatorDisplay();
    centerMapOnUser();
    updateUserMarker();
    updateClocks();
    renderSpots();
    initApp();
    fetchLicenseClass(myCallsign);
  }

  splashOk.addEventListener('click', dismissSplash);
  splashCallsign.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dismissSplash();
  });

  // --- Solar config overlay ---

  // Prevent config button mousedown from triggering widget drag
  solarCfgBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  solarCfgBtn.addEventListener('click', () => {
    showSolarCfg();
  });

  function showSolarCfg() {
    solarFieldList.innerHTML = '';
    SOLAR_FIELD_DEFS.forEach(f => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.fieldKey = f.key;
      cb.checked = solarFieldVisibility[f.key] !== false;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(f.label));
      solarFieldList.appendChild(label);
    });
    solarCfgSplash.classList.remove('hidden');
  }

  function dismissSolarCfg() {
    solarFieldList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      solarFieldVisibility[cb.dataset.fieldKey] = cb.checked;
    });
    saveSolarFieldVisibility();
    solarCfgSplash.classList.add('hidden');
    if (lastSolarData) renderSolar(lastSolarData);
  }

  solarCfgOk.addEventListener('click', dismissSolarCfg);

  // --- Lunar config overlay ---

  lunarCfgBtn.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });

  lunarCfgBtn.addEventListener('click', () => {
    showLunarCfg();
  });

  function showLunarCfg() {
    lunarFieldList.innerHTML = '';
    LUNAR_FIELD_DEFS.forEach(f => {
      const label = document.createElement('label');
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.dataset.fieldKey = f.key;
      cb.checked = lunarFieldVisibility[f.key] !== false;
      label.appendChild(cb);
      label.appendChild(document.createTextNode(f.label));
      lunarFieldList.appendChild(label);
    });
    lunarCfgSplash.classList.remove('hidden');
  }

  function dismissLunarCfg() {
    lunarFieldList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      lunarFieldVisibility[cb.dataset.fieldKey] = cb.checked;
    });
    saveLunarFieldVisibility();
    lunarCfgSplash.classList.add('hidden');
    if (lastLunarData) renderLunar(lastLunarData);
  }

  lunarCfgOk.addEventListener('click', dismissLunarCfg);

  // --- Map overlay config ---

  const mapOverlayCfgBtn = document.getElementById('mapOverlayCfgBtn');
  const mapOverlayCfgSplash = document.getElementById('mapOverlayCfgSplash');
  const mapOverlayCfgOk = document.getElementById('mapOverlayCfgOk');
  const mapOvLatLon = document.getElementById('mapOvLatLon');
  const mapOvMaidenhead = document.getElementById('mapOvMaidenhead');
  const mapOvTimezone = document.getElementById('mapOvTimezone');

  if (mapOverlayCfgBtn) {
    mapOverlayCfgBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); });
    mapOverlayCfgBtn.addEventListener('click', () => {
      mapOvLatLon.checked = mapOverlays.latLonGrid;
      mapOvMaidenhead.checked = mapOverlays.maidenheadGrid;
      mapOvTimezone.checked = mapOverlays.timezoneGrid;
      mapOverlayCfgSplash.classList.remove('hidden');
    });
  }

  if (mapOverlayCfgOk) {
    mapOverlayCfgOk.addEventListener('click', () => {
      mapOverlays.latLonGrid = mapOvLatLon.checked;
      mapOverlays.maidenheadGrid = mapOvMaidenhead.checked;
      mapOverlays.timezoneGrid = mapOvTimezone.checked;
      saveMapOverlays();
      mapOverlayCfgSplash.classList.add('hidden');
      renderAllMapOverlays();
    });
  }

  function renderAllMapOverlays() {
    if (!map) return;
    renderLatLonGrid();
    renderMaidenheadGrid();
    renderTimezoneGrid();
  }

  function renderLatLonGrid() {
    if (latLonLayer) { map.removeLayer(latLonLayer); latLonLayer = null; }
    if (!mapOverlays.latLonGrid) return;

    latLonLayer = L.layerGroup().addTo(map);
    const zoom = map.getZoom();
    let spacing = 30;
    if (zoom >= 8) spacing = 1;
    else if (zoom >= 6) spacing = 5;
    else if (zoom >= 3) spacing = 10;

    const bounds = map.getBounds();
    const labelLon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * 0.01;
    const labelLat = bounds.getSouth() + (bounds.getNorth() - bounds.getSouth()) * 0.01;
    const lineStyle = { color: '#4a90e2', weight: 1, opacity: 0.3, pane: 'mapOverlays', interactive: false };
    const equatorStyle = { color: '#4a90e2', weight: 3, opacity: 0.6, pane: 'mapOverlays', interactive: false };
    const pmStyle = { color: '#4a90e2', weight: 2, opacity: 0.5, pane: 'mapOverlays', interactive: false };

    // Horizontal lines (lat)
    for (let lat = -90; lat <= 90; lat += spacing) {
      const style = lat === 0 ? equatorStyle : lineStyle;
      L.polyline([[ lat, -180 ], [ lat, 180 ]], style).addTo(latLonLayer);
      if (lat >= bounds.getSouth() && lat <= bounds.getNorth()) {
        const ns = lat === 0 ? 'EQ' : (lat > 0 ? lat + '°N' : Math.abs(lat) + '°S');
        L.marker([lat, labelLon], {
          icon: L.divIcon({ className: 'grid-label latlon-label' + (lat === 0 ? ' latlon-equator' : ''), html: ns, iconSize: null }),
          pane: 'mapOverlays', interactive: false
        }).addTo(latLonLayer);
      }
    }
    // Vertical lines (lon)
    for (let lon = -180; lon <= 180; lon += spacing) {
      const style = lon === 0 ? pmStyle : lineStyle;
      L.polyline([[ -85, lon ], [ 85, lon ]], style).addTo(latLonLayer);
      if (lon >= bounds.getWest() && lon <= bounds.getEast()) {
        const ew = lon === 0 ? 'PM' : (lon > 0 ? lon + '°E' : Math.abs(lon) + '°W');
        L.marker([labelLat, lon], {
          icon: L.divIcon({ className: 'grid-label latlon-label', html: ew, iconSize: null }),
          pane: 'mapOverlays', interactive: false
        }).addTo(latLonLayer);
      }
    }
  }

  function renderMaidenheadGrid() {
    if (maidenheadLayer) { map.removeLayer(maidenheadLayer); maidenheadLayer = null; }
    if (!mapOverlays.maidenheadGrid) return;

    maidenheadLayer = L.layerGroup().addTo(map);
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    const south = bounds.getSouth(), north = bounds.getNorth();
    const west = bounds.getWest(), east = bounds.getEast();

    if (zoom <= 5) {
      // 2-char fields: 20° lon × 10° lat
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
            color: '#ff6b35', weight: 1.5, fill: false, pane: 'mapOverlays', interactive: false
          }).addTo(maidenheadLayer);
          L.marker([lat + latStep / 2, lon + lonStep / 2], {
            icon: L.divIcon({ className: 'grid-label maidenhead-label', html: label, iconSize: null }),
            pane: 'mapOverlays', interactive: false
          }).addTo(maidenheadLayer);
        }
      }
    } else if (zoom <= 9) {
      // 4-char squares: 2° lon × 1° lat
      const lonStep = 2, latStep = 1;
      const lonStart = Math.floor((west + 180) / lonStep) * lonStep - 180;
      const latStart = Math.floor((south + 90) / latStep) * latStep - 90;
      for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
        for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
          const fieldLon = Math.floor((lon + 180) / 20);
          const fieldLat = Math.floor((lat + 90) / 10);
          if (fieldLon < 0 || fieldLon > 17 || fieldLat < 0 || fieldLat > 17) continue;
          const sqLon = Math.floor(((lon + 180) % 20) / 2);
          const sqLat = Math.floor(((lat + 90) % 10) / 1);
          const label = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat) + sqLon + sqLat;
          L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
            color: '#ff6b35', weight: 1, fill: false, pane: 'mapOverlays', interactive: false
          }).addTo(maidenheadLayer);
          L.marker([lat + latStep / 2, lon + lonStep / 2], {
            icon: L.divIcon({ className: 'grid-label maidenhead-label-sm', html: label, iconSize: null }),
            pane: 'mapOverlays', interactive: false
          }).addTo(maidenheadLayer);
        }
      }
    } else {
      // 6-char subsquares: 5' lon × 2.5' lat
      const lonStep = 5 / 60, latStep = 2.5 / 60;
      const lonStart = Math.floor(west / lonStep) * lonStep;
      const latStart = Math.floor(south / latStep) * latStep;
      for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
        for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
          const aLon = lon + 180, aLat = lat + 90;
          if (aLon < 0 || aLon >= 360 || aLat < 0 || aLat >= 180) continue;
          const fLon = Math.floor(aLon / 20), fLat = Math.floor(aLat / 10);
          const sLon = Math.floor((aLon % 20) / 2), sLat = Math.floor((aLat % 10) / 1);
          const ssLon = Math.floor(((aLon % 2) / (5 / 60))), ssLat = Math.floor(((aLat % 1) / (2.5 / 60)));
          L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
            color: '#ff6b35', weight: 0.5, fill: false, opacity: 0.5, pane: 'mapOverlays', interactive: false
          }).addTo(maidenheadLayer);
          if (zoom >= 12) {
            const label = String.fromCharCode(65 + fLon) + String.fromCharCode(65 + fLat) + sLon + sLat +
              String.fromCharCode(97 + Math.min(ssLon, 23)) + String.fromCharCode(97 + Math.min(ssLat, 23));
            L.marker([lat + latStep / 2, lon + lonStep / 2], {
              icon: L.divIcon({ className: 'grid-label maidenhead-label-xs', html: label, iconSize: null }),
              pane: 'mapOverlays', interactive: false
            }).addTo(maidenheadLayer);
          }
        }
      }
    }
  }

  function renderTimezoneGrid() {
    if (timezoneLayer) { map.removeLayer(timezoneLayer); timezoneLayer = null; }
    if (!mapOverlays.timezoneGrid) return;

    timezoneLayer = L.layerGroup().addTo(map);
    const lineStyle = { color: '#9b59b6', weight: 1.5, opacity: 0.4, dashArray: '5,5', pane: 'mapOverlays', interactive: false };

    for (let i = -12; i <= 12; i++) {
      const lon = i * 15;
      L.polyline([[-85, lon], [85, lon]], lineStyle).addTo(timezoneLayer);
      const label = 'UTC' + (i === 0 ? '' : (i > 0 ? '+' + i : '' + i));
      L.marker([70, lon], {
        icon: L.divIcon({ className: 'grid-label timezone-label', html: label, iconSize: null }),
        pane: 'mapOverlays', interactive: false
      }).addTo(timezoneLayer);
    }
  }

  // --- Clock config overlay ---

  clockLocalCfgBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); });
  clockUtcCfgBtn.addEventListener('mousedown', (e) => { e.stopPropagation(); });

  function showClockCfg() {
    if (clockStyle === 'analog') clockStyleAnalog.checked = true;
    else clockStyleDigital.checked = true;
    clockCfgSplash.classList.remove('hidden');
  }

  function dismissClockCfg() {
    clockStyle = document.querySelector('input[name="clockStyle"]:checked').value;
    localStorage.setItem('hamtab_clock_style', clockStyle);
    clockCfgSplash.classList.add('hidden');
    applyClockStyle();
    // Resize clock widgets and map to fit new style
    const def = getDefaultLayout();
    ['widget-clock-local', 'widget-clock-utc', 'widget-map'].forEach(id => {
      const el = document.getElementById(id);
      const pos = def[id];
      if (el && pos) {
        el.style.height = pos.height + 'px';
        el.style.top = pos.top + 'px';
      }
    });
    saveWidgets();
    if (map) map.invalidateSize();
    updateClocks();
  }

  clockLocalCfgBtn.addEventListener('click', showClockCfg);
  clockUtcCfgBtn.addEventListener('click', showClockCfg);
  clockCfgOk.addEventListener('click', dismissClockCfg);

  // --- Band reference popup ---

  bandRefBtn.addEventListener('click', () => {
    renderBandRef();
    bandRefSplash.classList.remove('hidden');
  });

  bandRefOk.addEventListener('click', () => {
    bandRefSplash.classList.add('hidden');
  });

  bandRefMyPriv.addEventListener('change', () => {
    renderBandRef();
  });

  function renderBandRef() {
    const myPrivOnly = bandRefMyPriv.checked;
    const hasClass = isUSCallsign(myCallsign) && !!licenseClass;

    // If no US license class, disable checkbox and show all
    bandRefMyPriv.disabled = !hasClass;
    if (!hasClass) bandRefMyPriv.checked = false;

    const MODE_LABELS = { all: 'All', cw: 'CW', cwdig: 'CW/Digital', phone: 'Phone' };

    let classesToShow;
    if (myPrivOnly && hasClass) {
      classesToShow = [licenseClass.toUpperCase()];
    } else {
      classesToShow = ['EXTRA', 'GENERAL', 'TECHNICIAN', 'NOVICE'];
    }

    const CLASS_DISPLAY = { EXTRA: 'Extra', GENERAL: 'General', TECHNICIAN: 'Technician', NOVICE: 'Novice' };

    let html = '';
    for (const cls of classesToShow) {
      const privs = US_PRIVILEGES[cls];
      if (!privs) continue;
      html += `<h3>${CLASS_DISPLAY[cls] || cls}</h3>`;
      html += '<table class="band-ref-table"><thead><tr><th>Band</th><th>Frequency Range (MHz)</th><th>Modes</th></tr></thead><tbody>';
      for (const [lo, hi, modes] of privs) {
        const band = freqToBand(String(lo)) || '?';
        html += `<tr><td>${band}</td><td>${lo} – ${hi}</td><td>${MODE_LABELS[modes] || modes}</td></tr>`;
      }
      html += '</tbody></table>';
    }

    bandRefContent.innerHTML = html;
  }

  // --- Bidirectional lat/lon <-> grid sync ---

  splashLat.addEventListener('input', () => {
    if (syncingFields) return;
    manualLoc = true;
    splashGpsBtn.classList.remove('active');
    const lat = parseFloat(splashLat.value);
    const lon = parseFloat(splashLon.value);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      syncingFields = true;
      splashGrid.value = latLonToGrid(lat, lon).substring(0, 4).toUpperCase();
      myLat = lat;
      myLon = lon;
      syncingFields = false;
      updateLocStatus('Manual location set');
    } else {
      updateLocStatus('');
    }
  });

  splashLon.addEventListener('input', () => {
    if (syncingFields) return;
    manualLoc = true;
    splashGpsBtn.classList.remove('active');
    const lat = parseFloat(splashLat.value);
    const lon = parseFloat(splashLon.value);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      syncingFields = true;
      splashGrid.value = latLonToGrid(lat, lon).substring(0, 4).toUpperCase();
      myLat = lat;
      myLon = lon;
      syncingFields = false;
      updateLocStatus('Manual location set');
    } else {
      updateLocStatus('');
    }
  });

  splashGrid.addEventListener('input', () => {
    if (syncingFields) return;
    manualLoc = true;
    splashGpsBtn.classList.remove('active');
    const val = splashGrid.value.toUpperCase();

    if (val.length === 4) {
      const ll = gridToLatLon(val);
      if (ll) {
        syncingFields = true;
        splashLat.value = ll.lat.toFixed(2);
        splashLon.value = ll.lon.toFixed(2);
        myLat = ll.lat;
        myLon = ll.lon;
        syncingFields = false;
        updateLocStatus('Manual location set');
      }
      splashGridDropdown.classList.remove('open');
      splashGridDropdown.innerHTML = '';
      gridHighlightIdx = -1;
    } else if (val.length > 0 && val.length < 4) {
      showGridSuggestions(val);
    } else {
      splashGridDropdown.classList.remove('open');
      splashGridDropdown.innerHTML = '';
      gridHighlightIdx = -1;
      updateLocStatus('');
    }
  });

  // Grid autocomplete keyboard navigation
  splashGrid.addEventListener('keydown', (e) => {
    const options = splashGridDropdown.querySelectorAll('.grid-option');
    if (!splashGridDropdown.classList.contains('open') || options.length === 0) {
      if (e.key === 'Enter') dismissSplash();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      gridHighlightIdx = Math.min(gridHighlightIdx + 1, options.length - 1);
      updateGridHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      gridHighlightIdx = Math.max(gridHighlightIdx - 1, 0);
      updateGridHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (gridHighlightIdx >= 0 && options[gridHighlightIdx]) {
        selectGridSuggestion(options[gridHighlightIdx].textContent);
      }
    } else if (e.key === 'Escape') {
      splashGridDropdown.classList.remove('open');
      splashGridDropdown.innerHTML = '';
      gridHighlightIdx = -1;
    }
  });

  // Close dropdown on blur with delay for mousedown to fire first
  splashGrid.addEventListener('blur', () => {
    setTimeout(() => {
      splashGridDropdown.classList.remove('open');
      splashGridDropdown.innerHTML = '';
      gridHighlightIdx = -1;
    }, 150);
  });

  // Enter key on lat/lon fields dismisses splash
  splashLat.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dismissSplash();
  });
  splashLon.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dismissSplash();
  });

  // "Use GPS" button handler
  splashGpsBtn.addEventListener('click', () => {
    manualLoc = false;
    localStorage.removeItem('hamtab_lat');
    localStorage.removeItem('hamtab_lon');
    splashGpsBtn.classList.add('active');
    updateLocStatus('Using GPS');

    // Fetch GPS and update fields
    if (navigator.geolocation) {
      opLoc.textContent = 'Locating...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          myLat = pos.coords.latitude;
          myLon = pos.coords.longitude;
          syncingFields = true;
          splashLat.value = myLat.toFixed(2);
          splashLon.value = myLon.toFixed(2);
          splashGrid.value = latLonToGrid(myLat, myLon).substring(0, 4).toUpperCase();
          syncingFields = false;
          updateOperatorDisplay();
          centerMapOnUser();
          updateUserMarker();
          updateLocStatus('Using GPS');
        },
        () => {
          updateLocStatus('Location denied', true);
          opLoc.textContent = 'Location denied';
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } else {
      updateLocStatus('Geolocation unavailable', true);
    }
  });

  editCallBtn.addEventListener('click', () => {
    showSplash();
  });

  refreshLocBtn.addEventListener('click', () => {
    if (manualLoc) {
      showSplash();
    } else {
      opLoc.textContent = 'Locating...';
      fetchLocation();
    }
  });

  // Map setup — guard against Leaflet load failure
  let map = null;
  let clusterGroup = null;
  const hasLeaflet = typeof L !== 'undefined' && L.map;

  if (hasLeaflet) {
    try {
      map = L.map('map', {
        worldCopyJump: true,
        maxBoundsViscosity: 1.0,
        maxBounds: [[-90, -180], [90, 180]],
        minZoom: 2,
      }).setView([39.8, -98.5], 4);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        maxZoom: 19,
      }).addTo(map);

      clusterGroup = L.markerClusterGroup({
        maxClusterRadius: 40,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        iconCreateFunction: function(cluster) {
          const childCount = cluster.getChildCount();
          const sizeClass = childCount < 10 ? 'small' : childCount < 100 ? 'medium' : 'large';
          let extraClass = '';
          if (selectedSpotId && markers[selectedSpotId]) {
            const children = cluster.getAllChildMarkers();
            if (children.indexOf(markers[selectedSpotId]) !== -1) {
              extraClass = ' marker-cluster-selected';
            }
          }
          return L.divIcon({
            html: '<div><span>' + childCount + '</span></div>',
            className: 'marker-cluster marker-cluster-' + sizeClass + extraClass,
            iconSize: L.point(40, 40),
          });
        },
      });
      map.addLayer(clusterGroup);

      // Gray line (day/night terminator)
      map.createPane('grayline');
      map.getPane('grayline').style.zIndex = 250;

      // Propagation contour overlay
      map.createPane('propagation');
      map.getPane('propagation').style.zIndex = 300;

      // Map overlays pane (above propagation, below markers)
      map.createPane('mapOverlays');
      map.getPane('mapOverlays').style.zIndex = 350;
      map.getPane('mapOverlays').style.pointerEvents = 'none';

      // Map overlay event listeners
      map.on('zoomend', () => {
        if (mapOverlays.latLonGrid) renderLatLonGrid();
        if (mapOverlays.maidenheadGrid) {
          clearTimeout(maidenheadDebounceTimer);
          maidenheadDebounceTimer = setTimeout(renderMaidenheadGrid, 150);
        }
      });
      map.on('moveend', () => {
        if (mapOverlays.latLonGrid) renderLatLonGrid();
        if (mapOverlays.maidenheadGrid) {
          clearTimeout(maidenheadDebounceTimer);
          maidenheadDebounceTimer = setTimeout(renderMaidenheadGrid, 150);
        }
      });

      // Initial render of saved overlays
      setTimeout(renderAllMapOverlays, 200);
    } catch (e) {
      console.error('Map initialization failed:', e);
      map = null;
      clusterGroup = null;
    }
  }
  let grayLinePolygon = null;
  let dayPolygon = null;

  // User location marker
  let userMarker = null;

  // ISS tracking state
  let issMarker = null;
  let issCircle = null;
  let issTrail = [];
  let issTrailLine = null;
  let issOrbitLine = null;

  // --- Data fetching ---

  async function fetchSourceData(source) {
    const def = SOURCE_DEFS[source];
    if (!def) return;
    try {
      const resp = await fetch(def.endpoint);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      let data = await resp.json();
      // For POTA, alias callsign from activator field
      if (source === 'pota') {
        data = (Array.isArray(data) ? data : []).map(s => {
          if (!s.callsign && s.activator) s.callsign = s.activator;
          return s;
        });
      }
      sourceData[source] = Array.isArray(data) ? data : [];
      // Only update UI if this is the currently active source
      if (source === currentSource) {
        applyFilter();
        renderSpots();
        renderMarkers();
        updateBandFilterButtons();
        updateModeFilterButtons();
        updateCountryFilter();
        updateStateFilter();
        updateGridFilter();
        lastUpdated.textContent = 'Updated: ' + fmtTime(new Date());
      }
    } catch (err) {
      console.error(`Failed to fetch ${source} spots:`, err);
    }
  }

  async function fetchSolar() {
    try {
      const resp = await fetch('/api/solar');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      lastSolarData = data;
      renderSolar(data);
    } catch (err) {
      console.error('Failed to fetch solar:', err);
    }
  }

  async function fetchPropagation() {
    if (!map) return;

    // Remove old layers
    if (propLayer) { map.removeLayer(propLayer); propLayer = null; }
    if (propLabelLayer) { map.removeLayer(propLabelLayer); propLabelLayer = null; }

    if (propMetric === 'off') return;

    try {
      const resp = await fetch(`/api/propagation?type=${encodeURIComponent(propMetric)}`);
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();

      // GeoJSON coordinates are [lon, lat] — Leaflet handles this via coordsToLatLng
      propLayer = L.geoJSON(data, {
        pane: 'propagation',
        interactive: false,
        style: (feature) => ({
          color: feature.properties.stroke || '#00ff00',
          weight: 2,
          opacity: 0.7,
          fill: false,
        }),
      }).addTo(map);

      // Add MHz labels along contour lines
      propLabelLayer = L.layerGroup({ pane: 'propagation' }).addTo(map);
      data.features.forEach(feature => {
        const coords = feature.geometry.coordinates;
        if (!coords || coords.length < 2) return;
        const label = feature.properties.title || String(feature.properties['level-value']);
        const color = feature.properties.stroke || '#00ff00';
        // Place label at midpoint of contour
        const mid = coords[Math.floor(coords.length / 2)];
        const icon = L.divIcon({
          className: 'prop-label',
          html: `<span style="color:${color}">${esc(label.trim())} MHz</span>`,
          iconSize: null,
        });
        L.marker([mid[1], mid[0]], { icon, pane: 'propagation', interactive: false }).addTo(propLabelLayer);
      });
    } catch (err) {
      console.error('Failed to fetch propagation:', err);
    }
  }

  // Propagation overlay toggle
  document.querySelectorAll('.prop-metric-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      propMetric = btn.dataset.metric;
      localStorage.setItem('hamtab_prop_metric', propMetric);
      document.querySelectorAll('.prop-metric-btn').forEach(b => b.classList.toggle('active', b.dataset.metric === propMetric));
      fetchPropagation();
    });
  });
  // Sync button active state with saved preference
  document.querySelectorAll('.prop-metric-btn').forEach(b => b.classList.toggle('active', b.dataset.metric === propMetric));

  // Map center mode
  function centerMap() {
    if (!map) return;
    if (mapCenterMode === 'qth') {
      if (myLat !== null && myLon !== null) map.flyTo([myLat, myLon], 6, { duration: 0.8 });
    } else if (mapCenterMode === 'pm') {
      map.flyTo([0, 0], 2, { duration: 0.8 });
    } else if (mapCenterMode === 'spot') {
      if (selectedSpotId) {
        const allSpots = sourceFiltered[currentSource] || [];
        const spot = allSpots.find(s => spotId(s) === selectedSpotId);
        if (spot) {
          const lat = parseFloat(spot.latitude);
          const lon = parseFloat(spot.longitude);
          if (!isNaN(lat) && !isNaN(lon)) map.flyTo([lat, lon], 5, { duration: 0.8 });
        }
      }
    }
  }

  document.querySelectorAll('.map-center-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      mapCenterMode = btn.dataset.center;
      localStorage.setItem('hamtab_map_center', mapCenterMode);
      document.querySelectorAll('.map-center-btn').forEach(b => b.classList.toggle('active', b.dataset.center === mapCenterMode));
      centerMap();
    });
  });
  // Sync map-center button active state with saved preference
  document.querySelectorAll('.map-center-btn').forEach(b => b.classList.toggle('active', b.dataset.center === mapCenterMode));

  function refreshAll() {
    fetchSourceData('pota');
    fetchSourceData('sota');
    fetchSolar();
    fetchLunar();
    fetchPropagation();
    resetCountdown();
  }

  // --- Band helpers ---

  function freqToBand(freqStr) {
    let freq = parseFloat(freqStr);
    if (isNaN(freq)) return null;
    // POTA API sends frequencies in kHz; convert to MHz if > 1000
    if (freq > 1000) freq = freq / 1000;
    if (freq >= 1.8 && freq <= 2.0) return '160m';
    if (freq >= 3.5 && freq <= 4.0) return '80m';
    if (freq >= 5.3 && freq <= 5.4) return '60m';
    if (freq >= 7.0 && freq <= 7.3) return '40m';
    if (freq >= 10.1 && freq <= 10.15) return '30m';
    if (freq >= 14.0 && freq <= 14.35) return '20m';
    if (freq >= 18.068 && freq <= 18.168) return '17m';
    if (freq >= 21.0 && freq <= 21.45) return '15m';
    if (freq >= 24.89 && freq <= 24.99) return '12m';
    if (freq >= 28.0 && freq <= 29.7) return '10m';
    if (freq >= 50.0 && freq <= 54.0) return '6m';
    if (freq >= 144.0 && freq <= 148.0) return '2m';
    if (freq >= 420.0 && freq <= 450.0) return '70cm';
    return null;
  }

  // US amateur band privileges by license class (freq in MHz)
  // Each entry: [lowMHz, highMHz, modes] where modes = 'all' | 'cw' | 'phone' | 'cwdig'
  const US_PRIVILEGES = {
    EXTRA: [
      // Full privileges on all HF + VHF/UHF
      [1.8, 2.0, 'all'], [3.5, 4.0, 'all'], [5.3, 5.4, 'all'],
      [7.0, 7.3, 'all'], [10.1, 10.15, 'all'], [14.0, 14.35, 'all'],
      [18.068, 18.168, 'all'], [21.0, 21.45, 'all'], [24.89, 24.99, 'all'],
      [28.0, 29.7, 'all'], [50.0, 54.0, 'all'], [144.0, 148.0, 'all'],
      [420.0, 450.0, 'all'],
    ],
    GENERAL: [
      [1.8, 2.0, 'all'],
      [3.525, 3.6, 'cwdig'], [3.8, 4.0, 'phone'],
      [5.3, 5.4, 'all'],
      [7.025, 7.125, 'cwdig'], [7.175, 7.3, 'phone'],
      [10.1, 10.15, 'cwdig'],
      [14.025, 14.15, 'cwdig'], [14.225, 14.35, 'phone'],
      [18.068, 18.11, 'cwdig'], [18.11, 18.168, 'phone'],
      [21.025, 21.2, 'cwdig'], [21.275, 21.45, 'phone'],
      [24.89, 24.93, 'cwdig'], [24.93, 24.99, 'phone'],
      [28.0, 29.7, 'all'],
      [50.0, 54.0, 'all'], [144.0, 148.0, 'all'], [420.0, 450.0, 'all'],
    ],
    TECHNICIAN: [
      // Limited HF CW
      [3.525, 3.6, 'cw'], [7.025, 7.125, 'cw'], [21.025, 21.2, 'cw'],
      // 10m
      [28.0, 28.3, 'cwdig'], [28.3, 28.5, 'phone'],
      // VHF/UHF full
      [50.0, 54.0, 'all'], [144.0, 148.0, 'all'], [420.0, 450.0, 'all'],
    ],
    NOVICE: [
      [3.525, 3.6, 'cw'], [7.025, 7.125, 'cw'], [21.025, 21.2, 'cw'],
      [28.0, 28.3, 'cwdig'], [28.3, 28.5, 'phone'],
      [222.0, 225.0, 'all'], [420.0, 450.0, 'all'],
    ],
  };

  function isUSCallsign(call) {
    if (!call) return false;
    return /^[AKNW][A-Z]?\d/.test(call.toUpperCase());
  }

  function normalizeMode(mode) {
    if (!mode) return 'phone';
    const m = mode.toUpperCase();
    if (m === 'CW') return 'cw';
    if (m === 'SSB' || m === 'FM' || m === 'AM' || m === 'LSB' || m === 'USB') return 'phone';
    return 'digital';
  }

  function filterByPrivileges(spot) {
    if (!licenseClass) return true;
    const privs = US_PRIVILEGES[licenseClass.toUpperCase()];
    if (!privs) return true; // unknown class, don't filter

    let freq = parseFloat(spot.frequency);
    if (isNaN(freq)) return true;
    if (freq > 1000) freq = freq / 1000; // kHz to MHz

    const spotMode = normalizeMode(spot.mode);

    for (const [lo, hi, allowed] of privs) {
      if (freq >= lo && freq <= hi) {
        if (allowed === 'all') return true;
        if (allowed === 'cw' && spotMode === 'cw') return true;
        if (allowed === 'cwdig' && (spotMode === 'cw' || spotMode === 'digital')) return true;
        if (allowed === 'phone' && spotMode === 'phone') return true;
      }
    }
    return false;
  }

  async function fetchLicenseClass(callsign) {
    if (!isUSCallsign(callsign)) {
      licenseClass = '';
      localStorage.removeItem('hamtab_license_class');
      updatePrivFilterVisibility();
      updateOperatorDisplay();
      return;
    }
    try {
      const resp = await fetch(`/api/callsign/${encodeURIComponent(callsign)}`);
      if (!resp.ok) return;
      const data = await resp.json();
      if (data.status === 'VALID') {
        licenseClass = (data.class || '').toUpperCase();
        if (licenseClass) localStorage.setItem('hamtab_license_class', licenseClass);
        // Cache the info for header display and tooltip
        callsignCache[callsign.toUpperCase()] = data;
      } else {
        licenseClass = '';
        localStorage.removeItem('hamtab_license_class');
      }
    } catch (e) {
      // keep existing value
    }
    updatePrivFilterVisibility();
    updateOperatorDisplay();
  }

  function updatePrivFilterVisibility() {
    const label = document.querySelector('.priv-filter-label');
    if (!label) return;
    const show = isUSCallsign(myCallsign) && !!licenseClass;
    label.classList.toggle('hidden', !show);
    if (!show) {
      privilegeFilterEnabled = false;
      const cb = document.getElementById('privFilter');
      if (cb) cb.checked = false;
    }
  }

  function getAvailableBands() {
    const bandSet = new Set();
    (sourceData[currentSource] || []).forEach(s => {
      const band = freqToBand(s.frequency);
      if (band) bandSet.add(band);
    });
    const order = ['160m','80m','60m','40m','30m','20m','17m','15m','12m','10m','6m','2m','70cm'];
    return order.filter(b => bandSet.has(b));
  }

  function updateBandFilterButtons() {
    const bands = getAvailableBands();
    bandFilters.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.className = activeBand === null ? 'active' : '';
    allBtn.addEventListener('click', () => {
      activeBand = null;
      applyFilter();
      renderSpots();
      renderMarkers();
      updateBandFilterButtons();
    });
    bandFilters.appendChild(allBtn);

    bands.forEach(band => {
      const btn = document.createElement('button');
      btn.textContent = band;
      btn.className = activeBand === band ? 'active' : '';
      btn.addEventListener('click', () => {
        activeBand = band;
        applyFilter();
        renderSpots();
        renderMarkers();
        updateBandFilterButtons();
      });
      bandFilters.appendChild(btn);
    });
  }

  function applyFilter() {
    const allowed = SOURCE_DEFS[currentSource].filters;
    sourceFiltered[currentSource] = (sourceData[currentSource] || []).filter(s => {
      if (allowed.includes('band') && activeBand && freqToBand(s.frequency) !== activeBand) return false;
      if (allowed.includes('mode') && activeMode && (s.mode || '').toUpperCase() !== activeMode) return false;
      if (allowed.includes('country') && activeCountry && getCountryPrefix(s.reference) !== activeCountry) return false;
      if (allowed.includes('state') && activeState && getUSState(s.locationDesc) !== activeState) return false;
      if (allowed.includes('grid') && activeGrid && (s.grid4 || '') !== activeGrid) return false;
      if (allowed.includes('privilege') && privilegeFilterEnabled && !filterByPrivileges(s)) return false;
      return true;
    });
  }

  // --- Mode filter ---

  function getAvailableModes() {
    const modeSet = new Set();
    (sourceData[currentSource] || []).forEach(s => {
      if (s.mode) modeSet.add(s.mode.toUpperCase());
    });
    return [...modeSet].sort();
  }

  function updateModeFilterButtons() {
    const modes = getAvailableModes();
    modeFilters.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.textContent = 'All';
    allBtn.className = activeMode === null ? 'active' : '';
    allBtn.addEventListener('click', () => {
      activeMode = null;
      applyFilter();
      renderSpots();
      renderMarkers();
      updateModeFilterButtons();
    });
    modeFilters.appendChild(allBtn);

    modes.forEach(mode => {
      const btn = document.createElement('button');
      btn.textContent = mode;
      btn.className = activeMode === mode ? 'active' : '';
      btn.addEventListener('click', () => {
        activeMode = mode;
        applyFilter();
        renderSpots();
        renderMarkers();
        updateModeFilterButtons();
      });
      modeFilters.appendChild(btn);
    });
  }

  // --- Country filter ---

  function getCountryPrefix(ref) {
    if (!ref) return '';
    return ref.split('-')[0];
  }

  function getAvailableCountries() {
    const countrySet = new Set();
    (sourceData[currentSource] || []).forEach(s => {
      const prefix = getCountryPrefix(s.reference);
      if (prefix) countrySet.add(prefix);
    });
    return [...countrySet].sort();
  }

  function updateCountryFilter() {
    const countries = getAvailableCountries();
    const current = activeCountry;
    countryFilter.innerHTML = '<option value="">All Countries</option>';
    countries.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c;
      opt.textContent = c;
      if (c === current) opt.selected = true;
      countryFilter.appendChild(opt);
    });
  }

  countryFilter.addEventListener('change', () => {
    activeCountry = countryFilter.value || null;
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  // --- US State filter ---

  function getUSState(locationDesc) {
    if (!locationDesc) return '';
    if (locationDesc.startsWith('US-')) return locationDesc.substring(3);
    return '';
  }

  function getAvailableStates() {
    const stateSet = new Set();
    (sourceData[currentSource] || []).forEach(s => {
      const st = getUSState(s.locationDesc);
      if (st) stateSet.add(st);
    });
    return [...stateSet].sort();
  }

  function updateStateFilter() {
    const states = getAvailableStates();
    const current = activeState;
    stateFilter.innerHTML = '<option value="">All States</option>';
    states.forEach(st => {
      const opt = document.createElement('option');
      opt.value = st;
      opt.textContent = st;
      if (st === current) opt.selected = true;
      stateFilter.appendChild(opt);
    });
  }

  stateFilter.addEventListener('change', () => {
    activeState = stateFilter.value || null;
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  // --- Grid square filter ---

  function getAvailableGrids() {
    const gridSet = new Set();
    (sourceData[currentSource] || []).forEach(s => {
      if (s.grid4) gridSet.add(s.grid4);
    });
    return [...gridSet].sort();
  }

  function updateGridFilter() {
    const grids = getAvailableGrids();
    const current = activeGrid;
    gridFilter.innerHTML = '<option value="">All Grids</option>';
    grids.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g;
      opt.textContent = g;
      if (g === current) opt.selected = true;
      gridFilter.appendChild(opt);
    });
  }

  gridFilter.addEventListener('change', () => {
    activeGrid = gridFilter.value || null;
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  // --- Privilege filter checkbox ---

  const privFilterCheckbox = document.getElementById('privFilter');
  privFilterCheckbox.checked = privilegeFilterEnabled;
  updatePrivFilterVisibility();

  privFilterCheckbox.addEventListener('change', () => {
    privilegeFilterEnabled = privFilterCheckbox.checked;
    localStorage.setItem('hamtab_privilege_filter', String(privilegeFilterEnabled));
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  // Fetch license class on initial load if we have a callsign
  if (myCallsign) {
    fetchLicenseClass(myCallsign);
  }

  // --- Spot ID helper ---

  function spotId(spot) {
    return SOURCE_DEFS[currentSource].spotId(spot);
  }

  // --- Callsign info cache & tooltip ---

  const callsignCache = {};

  async function fetchCallsignInfo(call) {
    if (!call) return null;
    const key = call.toUpperCase();
    if (callsignCache[key]) return callsignCache[key];
    if (callsignCache[key] === null) return null; // previously failed
    try {
      const resp = await fetch(`/api/callsign/${encodeURIComponent(key)}`);
      if (!resp.ok) { callsignCache[key] = null; return null; }
      const data = await resp.json();
      if (data.status !== 'VALID') { callsignCache[key] = null; return null; }
      callsignCache[key] = data;
      return data;
    } catch {
      callsignCache[key] = null;
      return null;
    }
  }

  // Shared tooltip element
  const callTooltip = document.createElement('div');
  callTooltip.className = 'call-tooltip';
  document.body.appendChild(callTooltip);

  let tooltipHideTimer = null;

  function showCallTooltip(td, info) {
    let html = '';
    if (info.name) html += `<div class="call-tooltip-name">${esc(info.name)}</div>`;
    if (info.addr2) html += `<div class="call-tooltip-loc">${esc(info.addr2)}</div>`;
    if (info.class) html += `<div class="call-tooltip-class">${esc(info.class)}</div>`;
    if (info.grid) html += `<div class="call-tooltip-grid">${esc(info.grid)}</div>`;
    if (!html) { hideCallTooltip(); return; }
    callTooltip.innerHTML = html;
    callTooltip.classList.add('visible');

    const rect = td.getBoundingClientRect();
    let left = rect.left;
    let top = rect.bottom + 4;
    // Keep tooltip on screen
    const ttWidth = callTooltip.offsetWidth;
    const ttHeight = callTooltip.offsetHeight;
    if (left + ttWidth > window.innerWidth) left = window.innerWidth - ttWidth - 4;
    if (top + ttHeight > window.innerHeight) top = rect.top - ttHeight - 4;
    callTooltip.style.left = left + 'px';
    callTooltip.style.top = top + 'px';
  }

  function hideCallTooltip() {
    callTooltip.classList.remove('visible');
  }

  function handleCallMouseEnter(e) {
    clearTimeout(tooltipHideTimer);
    const td = e.currentTarget;
    const call = td.textContent.trim();
    if (!call) return;

    const cached = callsignCache[call.toUpperCase()];
    if (cached) {
      showCallTooltip(td, cached);
    } else if (cached === undefined) {
      callTooltip.innerHTML = '<div class="call-tooltip-loading">Loading...</div>';
      callTooltip.classList.add('visible');
      const rect = td.getBoundingClientRect();
      callTooltip.style.left = rect.left + 'px';
      callTooltip.style.top = (rect.bottom + 4) + 'px';
      fetchCallsignInfo(call).then(info => {
        // Only update if tooltip is still showing for this cell
        if (callTooltip.classList.contains('visible')) {
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
    tooltipHideTimer = setTimeout(hideCallTooltip, 150);
  }

  // Delegated hover events on tbody for callsign cells
  let currentHoverTd = null;

  spotsBody.addEventListener('mouseover', (e) => {
    const td = e.target.closest('td.callsign');
    if (!td || td === currentHoverTd) return;
    currentHoverTd = td;
    handleCallMouseEnter({ currentTarget: td });
  });

  spotsBody.addEventListener('mouseout', (e) => {
    const td = e.target.closest('td.callsign');
    if (td && td === currentHoverTd) {
      const related = e.relatedTarget;
      if (!td.contains(related)) {
        currentHoverTd = null;
        handleCallMouseLeave();
      }
    }
  });

  // --- Render spots table ---

  function formatAge(spotTime) {
    if (!spotTime) return '';
    const ts = spotTime.endsWith('Z') ? spotTime : spotTime + 'Z';
    const diffMs = Date.now() - new Date(ts).getTime();
    if (diffMs < 0) return '0s';
    const totalSec = Math.floor(diffMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`;
    if (m > 0) return s > 0 ? `${m}m${s}s` : `${m}m`;
    return `${s}s`;
  }

  function renderSpots() {
    const filtered = sourceFiltered[currentSource] || [];
    spotsBody.innerHTML = '';
    spotCount.textContent = `(${filtered.length})`;

    const cols = SOURCE_DEFS[currentSource].columns;
    const sortKey = SOURCE_DEFS[currentSource].sortKey;

    // Sort by sort key descending
    const sorted = [...filtered].sort((a, b) => {
      return new Date(b[sortKey]) - new Date(a[sortKey]);
    });

    sorted.forEach(spot => {
      const tr = document.createElement('tr');
      const sid = spotId(spot);
      tr.dataset.spotId = sid;
      if (sid === selectedSpotId) tr.classList.add('selected');

      cols.forEach(col => {
        const td = document.createElement('td');
        if (col.class) td.className = col.class;
        if (col.key === 'spotTime') {
          const time = spot.spotTime ? new Date(spot.spotTime) : null;
          td.textContent = time ? fmtTime(time, { hour: '2-digit', minute: '2-digit' }) : '';
        } else if (col.key === 'age') {
          td.textContent = formatAge(spot.spotTime);
        } else if (col.key === 'callsign') {
          td.textContent = spot.activator || spot.callsign || '';
        } else if (col.key === 'reference') {
          const ref = spot[col.key] || '';
          if (ref) {
            const a = document.createElement('a');
            a.textContent = ref;
            a.target = '_blank';
            a.rel = 'noopener';
            if (currentSource === 'sota') {
              a.href = `https://www.sota.org.uk/Summit/${ref}`;
            } else {
              a.href = `https://pota.app/#/park/${ref}`;
            }
            a.addEventListener('click', e => e.stopPropagation());
            td.appendChild(a);
          }
        } else if (col.key === 'name') {
          const val = spot[col.key] || '';
          td.textContent = val;
          td.title = val;
        } else {
          td.textContent = spot[col.key] || '';
        }
        tr.appendChild(td);
      });

      tr.addEventListener('click', () => flyToSpot(spot));
      spotsBody.appendChild(tr);
    });
  }

  function esc(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --- Bearing & local time helpers ---

  function bearingTo(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const dLon = (lon2 - lon1) * r;
    const y = Math.sin(dLon) * Math.cos(lat2 * r);
    const x = Math.cos(lat1 * r) * Math.sin(lat2 * r) - Math.sin(lat1 * r) * Math.cos(lat2 * r) * Math.cos(dLon);
    return (Math.atan2(y, x) / r + 360) % 360;
  }

  function bearingToCardinal(deg) {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  function distanceMi(lat1, lon1, lat2, lon2) {
    const r = Math.PI / 180;
    const R = 3958.8; // Earth radius in miles
    const dLat = (lat2 - lat1) * r;
    const dLon = (lon2 - lon1) * r;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function localTimeAtLon(lon) {
    // Approximate local time using longitude offset from UTC
    const now = new Date();
    const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
    const offsetMs = (lon / 15) * 3600000;
    const local = new Date(utcMs + offsetMs);
    return local.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: !use24h });
  }

  // --- Marker icons ---

  const defaultIcon = L.icon({
    iconUrl: 'vendor/images/marker-icon.png',
    iconRetinaUrl: 'vendor/images/marker-icon-2x.png',
    shadowUrl: 'vendor/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const selectedIcon = L.icon({
    iconUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 22 12.5 41 12.5 41S25 22 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#ff9800"/><circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>'),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'vendor/images/marker-shadow.png',
    shadowSize: [41, 41],
  });

  // --- Render map markers ---

  function renderMarkers() {
    if (!map) return;
    clusterGroup.clearLayers();
    markers = {};

    // Skip map markers for sources that don't support them
    if (!SOURCE_DEFS[currentSource].hasMap) return;

    const filtered = sourceFiltered[currentSource] || [];

    filtered.forEach(spot => {
      const lat = parseFloat(spot.latitude);
      const lon = parseFloat(spot.longitude);
      if (isNaN(lat) || isNaN(lon)) return;

      const sid = spotId(spot);
      const marker = L.marker([lat, lon], { icon: sid === selectedSpotId ? selectedIcon : defaultIcon });

      const displayCall = spot.callsign || spot.activator || '';
      const callsign = esc(displayCall);
      const qrzUrl = `https://www.qrz.com/db/${encodeURIComponent(displayCall)}`;
      let dirLine = '';
      let distLine = '';
      if (myLat !== null && myLon !== null) {
        const deg = bearingTo(myLat, myLon, lat, lon);
        const mi = Math.round(distanceMi(myLat, myLon, lat, lon));
        dirLine = `<div class="popup-dir">Direction: ${bearingToCardinal(deg)}</div>`;
        distLine = `<div class="popup-dist">Distance: ~${mi.toLocaleString()} mi</div>`;
      }
      const localTime = localTimeAtLon(lon);
      marker.bindPopup(`
        <div class="popup-call"><a href="${qrzUrl}" target="_blank" rel="noopener">${callsign}</a></div>
        <div class="popup-freq">${esc(spot.frequency || '')} ${esc(spot.mode || '')}</div>
        <div class="popup-park"><strong>${esc(spot.reference || '')}</strong> ${esc(spot.name || '')}</div>
        ${dirLine}
        ${distLine}
        <div class="popup-time">Local time: ${esc(localTime)}</div>
        ${spot.comments ? '<div style="margin-top:4px;font-size:0.78rem;color:#8899aa;">' + esc(spot.comments) + '</div>' : ''}
      `);

      marker.on('click', () => {
        selectSpot(sid);
      });

      markers[sid] = marker;
      clusterGroup.addLayer(marker);
    });
  }

  // --- Interaction ---

  function flyToSpot(spot) {
    if (!map) return;
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const sid = spotId(spot);
    selectSpot(sid);

    if (mapCenterMode === 'spot') {
      map.flyTo([lat, lon], 5, { duration: 0.8 });
    }

    const marker = markers[sid];
    if (marker) {
      marker.openPopup();
    }
  }

  function selectSpot(sid) {
    const oldSid = selectedSpotId;

    // Reset previous marker icon
    if (oldSid && markers[oldSid]) {
      markers[oldSid].setIcon(defaultIcon);
    }

    selectedSpotId = sid;

    // Highlight new marker icon
    if (sid && markers[sid]) {
      markers[sid].setIcon(selectedIcon);
    }

    // Update cluster highlights
    if (clusterGroup) {
      // Remove highlight from old cluster
      if (oldSid && markers[oldSid]) {
        const oldParent = clusterGroup.getVisibleParent(markers[oldSid]);
        if (oldParent && oldParent !== markers[oldSid] && oldParent._icon) {
          oldParent._icon.classList.remove('marker-cluster-selected');
        }
      }
      // Add highlight to new cluster
      if (sid && markers[sid]) {
        const newParent = clusterGroup.getVisibleParent(markers[sid]);
        if (newParent && newParent !== markers[sid] && newParent._icon) {
          newParent._icon.classList.add('marker-cluster-selected');
        }
      }
    }

    // Highlight table row
    document.querySelectorAll('#spotsBody tr').forEach(tr => {
      tr.classList.toggle('selected', tr.dataset.spotId === sid);
    });

    // Scroll row into view
    const selectedRow = document.querySelector(`#spotsBody tr[data-spot-id="${CSS.escape(sid)}"]`);
    if (selectedRow) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // --- Render solar data ---

  function renderSolar(data) {
    const { indices, bands } = data;

    solarIndices.innerHTML = '';

    SOLAR_FIELD_DEFS.forEach(f => {
      if (solarFieldVisibility[f.key] === false) return;

      const rawVal = indices[f.key];
      const displayVal = (rawVal === '' || rawVal === undefined || rawVal === 'NoRpt')
        ? '-'
        : String(rawVal) + (f.unit || '');
      const color = f.colorFn ? f.colorFn(rawVal) : '';

      const div = document.createElement('div');
      div.className = 'solar-card';
      const labelDiv = document.createElement('div');
      labelDiv.className = 'label';
      labelDiv.textContent = f.label;
      const valueDiv = document.createElement('div');
      valueDiv.className = 'value';
      if (color) valueDiv.style.color = color;
      valueDiv.textContent = displayVal;
      div.appendChild(labelDiv);
      div.appendChild(valueDiv);
      solarIndices.appendChild(div);
    });

    // Band conditions in header strip
    headerBandsRow.innerHTML = '';
    const bandMap = {};
    bands.forEach(b => {
      if (!bandMap[b.band]) bandMap[b.band] = {};
      bandMap[b.band][b.time] = b.condition;
    });

    const bandOrder = ['80m-40m', '30m-20m', '17m-15m', '12m-10m'];
    bandOrder.forEach(band => {
      if (!bandMap[band]) return;
      const day = bandMap[band]['day'] || '-';
      const night = bandMap[band]['night'] || '-';
      const item = document.createElement('div');
      item.className = 'header-band-item';
      const nameSpan = document.createElement('span');
      nameSpan.className = 'header-band-name';
      nameSpan.textContent = band;
      const daySpan = document.createElement('span');
      daySpan.className = 'header-band-day ' + condClass(day);
      daySpan.textContent = day;
      const sep = document.createElement('span');
      sep.textContent = '/';
      sep.style.color = 'var(--text-dim)';
      const nightSpan = document.createElement('span');
      nightSpan.className = 'header-band-night ' + condClass(night);
      nightSpan.textContent = night;
      item.appendChild(nameSpan);
      item.appendChild(daySpan);
      item.appendChild(sep);
      item.appendChild(nightSpan);
      headerBandsRow.appendChild(item);
    });

  }

  function condClass(cond) {
    const c = (cond || '').toLowerCase();
    if (c === 'good') return 'cond-good';
    if (c === 'fair') return 'cond-fair';
    if (c === 'poor') return 'cond-poor';
    return '';
  }

  function aColor(val) {
    const n = parseInt(val);
    if (isNaN(n)) return '';
    if (n < 10) return 'var(--green)';
    if (n < 30) return 'var(--yellow)';
    return 'var(--red)';
  }

  function kColor(val) {
    const n = parseInt(val);
    if (isNaN(n)) return '';
    if (n <= 2) return 'var(--green)';
    if (n <= 4) return 'var(--yellow)';
    return 'var(--red)';
  }

  // --- Gray Line (Day/Night Terminator) ---

  function updateGrayLine() {
    if (!map) return;
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((now - start) / 86400000);

    // Solar declination (approximate Meeus)
    const sunDec = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
    // Sub-solar longitude from UTC time
    const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
    const sunLon = -(utcHours - 12) * 15;

    const rad = Math.PI / 180;
    // Clamp near-zero declination to avoid tan(0) division
    const dec = Math.abs(sunDec) < 0.1 ? 0.1 : sunDec;
    const tanDec = Math.tan(dec * rad);

    const points = [];
    for (let lon = -180; lon <= 180; lon += 2) {
      const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / tanDec) / rad;
      points.push([lat, lon]);
    }

    // Close polygon through the pole on the night side
    if (dec >= 0) {
      // Sun in northern hemisphere — night extends toward south pole
      points.push([-90, 180]);
      points.push([-90, -180]);
    } else {
      // Sun in southern hemisphere — night extends toward north pole
      points.push([90, 180]);
      points.push([90, -180]);
    }

    if (grayLinePolygon) {
      grayLinePolygon.setLatLngs(points);
    } else {
      grayLinePolygon = L.polygon(points, {
        pane: 'grayline',
        color: '#445',
        weight: 1,
        fillColor: '#000',
        fillOpacity: 0.25,
        interactive: false,
      }).addTo(map);
    }

    // Day-side polygon — same terminator, closed through the opposite pole
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

    if (dayPolygon) {
      dayPolygon.setLatLngs(dayPoints);
    } else {
      dayPolygon = L.polygon(dayPoints, {
        pane: 'grayline',
        color: 'transparent',
        weight: 0,
        fillColor: '#ffd54f',
        fillOpacity: 0.06,
        interactive: false,
      }).addTo(map);
    }
  }

  updateGrayLine();
  setInterval(updateGrayLine, 60000);

  // --- ISS Tracking ---

  async function fetchISS() {
    try {
      const resp = await fetch('/api/iss');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      updateISS(data);
    } catch (err) {
      console.error('Failed to fetch ISS:', err);
    }
  }

  function updateISS(data) {
    if (!map) return;
    const lat = data.latitude;
    const lon = data.longitude;
    const footprintKm = data.footprint || 0;
    const radiusMeters = (footprintKm / 2) * 1000;

    // Update or create marker
    if (issMarker) {
      issMarker.setLatLng([lat, lon]);
    } else {
      const icon = L.divIcon({
        className: 'iss-icon',
        html: 'ISS',
        iconSize: [40, 20],
        iconAnchor: [20, 10],
      });
      issMarker = L.marker([lat, lon], { icon, zIndexOffset: 10000 }).addTo(map);
      issMarker.bindPopup('', { maxWidth: 280 });
    }

    issMarker.setPopupContent(
      `<div class="iss-popup">` +
      `<div class="iss-popup-title">ISS (ZARYA)</div>` +
      `<div class="iss-popup-row">Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}</div>` +
      `<div class="iss-popup-row">Alt: ${Math.round(data.altitude)} km &bull; Vel: ${Math.round(data.velocity)} km/h</div>` +
      `<div class="iss-popup-row">Visibility: ${data.visibility || 'N/A'}</div>` +
      `<div class="iss-radio-header">Amateur Radio (ARISS)</div>` +
      `<table class="iss-freq-table">` +
      `<tr><td>V/U Repeater &#8593;</td><td>145.990 MHz FM</td></tr>` +
      `<tr><td>V/U Repeater &#8595;</td><td>437.800 MHz FM</td></tr>` +
      `<tr><td>Voice Downlink</td><td>145.800 MHz FM</td></tr>` +
      `<tr><td>APRS / Packet</td><td>145.825 MHz</td></tr>` +
      `<tr><td>SSTV Events</td><td>145.800 MHz PD120</td></tr>` +
      `</table>` +
      `<div class="iss-radio-note">Repeater &amp; APRS typically active. SSTV during special events. Use &#177;10 kHz Doppler shift.</div>` +
      `</div>`
    );

    // Update or create footprint circle
    if (issCircle) {
      issCircle.setLatLng([lat, lon]);
      issCircle.setRadius(radiusMeters);
    } else {
      issCircle = L.circle([lat, lon], {
        radius: radiusMeters,
        color: '#00bcd4',
        fillColor: '#00bcd4',
        fillOpacity: 0.08,
        weight: 1,
      }).addTo(map);
    }

    // Recent position trail
    issTrail.push([lat, lon]);
    if (issTrail.length > 20) issTrail.shift();
    if (issTrailLine) map.removeLayer(issTrailLine);
    if (issTrail.length > 1) {
      // Split into segments at antimeridian crossings
      const segs = [[]];
      for (let i = 0; i < issTrail.length; i++) {
        segs[segs.length - 1].push(issTrail[i]);
        if (i < issTrail.length - 1) {
          if (Math.abs(issTrail[i + 1][1] - issTrail[i][1]) > 180) {
            segs.push([]);
          }
        }
      }
      issTrailLine = L.polyline(segs, {
        color: '#00bcd4',
        weight: 2,
        opacity: 0.6,
        dashArray: '4 6',
      }).addTo(map);
    }
  }

  setInterval(fetchISS, 5000);
  fetchISS();

  // --- ISS Orbit Ground Track ---

  async function fetchISSOrbit() {
    try {
      const resp = await fetch('/api/iss/orbit');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      renderISSOrbit(data);
    } catch (err) {
      console.error('Failed to fetch ISS orbit:', err);
    }
  }

  function renderISSOrbit(positions) {
    if (!map) return;
    if (issOrbitLine) map.removeLayer(issOrbitLine);
    if (!positions || positions.length < 2) return;

    // Split into segments at antimeridian crossings
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

    issOrbitLine = L.polyline(segments, {
      color: '#00bcd4',
      weight: 1.5,
      opacity: 0.35,
      dashArray: '8 8',
      interactive: false,
    }).addTo(map);
  }

  fetchISSOrbit();
  setInterval(fetchISSOrbit, 300000); // refresh every 5 minutes

  // --- Lunar / EME ---

  async function fetchLunar() {
    try {
      const resp = await fetch('/api/lunar');
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      lastLunarData = data;
      renderLunar(data);
    } catch (err) {
      console.error('Failed to fetch lunar:', err);
    }
  }

  function renderLunar(data) {
    lunarCards.innerHTML = '';

    LUNAR_FIELD_DEFS.forEach(f => {
      if (lunarFieldVisibility[f.key] === false) return;

      const rawVal = data[f.key];
      let displayVal;
      if (rawVal === undefined || rawVal === null || rawVal === '') {
        displayVal = '-';
      } else if (f.key === 'distance') {
        displayVal = Number(rawVal).toLocaleString() + f.unit;
      } else if (f.key === 'pathLoss') {
        displayVal = (rawVal > 0 ? '+' : '') + rawVal + f.unit;
      } else {
        displayVal = String(rawVal) + f.unit;
      }
      const color = f.colorFn ? f.colorFn(rawVal) : '';

      const div = document.createElement('div');
      div.className = 'solar-card';
      const labelDiv = document.createElement('div');
      labelDiv.className = 'label';
      labelDiv.textContent = f.label;
      const valueDiv = document.createElement('div');
      valueDiv.className = 'value';
      if (color) valueDiv.style.color = color;
      valueDiv.textContent = displayVal;
      div.appendChild(labelDiv);
      div.appendChild(valueDiv);
      lunarCards.appendChild(div);
    });
  }

  // --- Clocks ---

  function fmtTime(date, options) {
    const opts = Object.assign({ hour12: !use24h }, options || {});
    return date.toLocaleTimeString([], opts);
  }

  function drawAnalogClock(canvas, date) {
    const size = Math.min(canvas.parentElement.clientWidth, canvas.parentElement.clientHeight - 24) - 4;
    if (size < 20) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const r = size / 2;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(r, r);

    // Face
    ctx.beginPath();
    ctx.arc(0, 0, r - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0f3460';
    ctx.fill();
    ctx.strokeStyle = '#2a3a5e';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Tick marks and numerals
    for (let i = 1; i <= 12; i++) {
      const angle = (i * Math.PI) / 6 - Math.PI / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      // Tick
      ctx.beginPath();
      ctx.moveTo(cos * (r - 12), sin * (r - 12));
      ctx.lineTo(cos * (r - 5), sin * (r - 5));
      ctx.strokeStyle = '#8899aa';
      ctx.lineWidth = 2;
      ctx.stroke();
      // Numeral
      ctx.fillStyle = '#e0e0e0';
      ctx.font = `bold ${Math.round(r * 0.22)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), cos * (r - 22), sin * (r - 22));
    }
    // Minute ticks
    for (let i = 0; i < 60; i++) {
      if (i % 5 === 0) continue;
      const angle = (i * Math.PI) / 30 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * (r - 8), Math.sin(angle) * (r - 8));
      ctx.lineTo(Math.cos(angle) * (r - 5), Math.sin(angle) * (r - 5));
      ctx.strokeStyle = '#2a3a5e';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    const h = date.getHours() % 12;
    const m = date.getMinutes();
    const s = date.getSeconds();

    // Hour hand
    const hAngle = ((h + m / 60) * Math.PI) / 6 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(hAngle) * r * 0.5, Math.sin(hAngle) * r * 0.5);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Minute hand
    const mAngle = ((m + s / 60) * Math.PI) / 30 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(mAngle) * r * 0.7, Math.sin(mAngle) * r * 0.7);
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Second hand
    const sAngle = (s * Math.PI) / 30 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(sAngle) * r * 0.75, Math.sin(sAngle) * r * 0.75);
    ctx.strokeStyle = '#e94560';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Center dot
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#e94560';
    ctx.fill();

    ctx.restore();
  }

  function applyClockStyle() {
    clockLocal.classList.toggle('analog', clockStyle === 'analog');
    clockUtc.classList.toggle('analog', clockStyle === 'analog');
  }

  // --- Sunrise/Sunset calculation (standard solar equation) ---

  function getSunTimes(lat, lon, date) {
    const rad = Math.PI / 180;
    const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / 86400000);
    const zenith = 90.833;

    // Longitude hour
    const lngHour = lon / 15;

    // Rising / setting
    function calc(rising) {
      const t = dayOfYear + ((rising ? 6 : 18) - lngHour) / 24;
      const M = (0.9856 * t) - 3.289;
      let L = M + (1.916 * Math.sin(M * rad)) + (0.020 * Math.sin(2 * M * rad)) + 282.634;
      L = ((L % 360) + 360) % 360;
      let RA = Math.atan2(Math.sin(L * rad), Math.cos(L * rad)) / rad;
      RA = ((RA % 360) + 360) % 360;
      const Lquadrant = Math.floor(L / 90) * 90;
      const RAquadrant = Math.floor(RA / 90) * 90;
      RA = RA + (Lquadrant - RAquadrant);
      RA = RA / 15;
      const sinDec = 0.39782 * Math.sin(L * rad);
      const cosDec = Math.cos(Math.asin(sinDec));
      const cosH = (Math.cos(zenith * rad) - (sinDec * Math.sin(lat * rad))) / (cosDec * Math.cos(lat * rad));
      if (cosH > 1 || cosH < -1) return null; // no sunrise/sunset
      let H = Math.acos(cosH) / rad / 15;
      if (rising) H = 24 - H;
      const T = H + RA - (0.06571 * t) - 6.622;
      let UT = ((T - lngHour) % 24 + 24) % 24;
      const hours = Math.floor(UT);
      const minutes = Math.round((UT - hours) * 60);
      const result = new Date(date);
      result.setUTCHours(hours, minutes, 0, 0);
      return result;
    }
    return { sunrise: calc(true), sunset: calc(false) };
  }

  const SVG_SUN = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<circle cx="32" cy="32" r="12" fill="#ffd600"/>' +
    '<g stroke="#ffd600" stroke-width="3" stroke-linecap="round">' +
    '<line x1="32" y1="4" x2="32" y2="14"/><line x1="32" y1="50" x2="32" y2="60"/>' +
    '<line x1="4" y1="32" x2="14" y2="32"/><line x1="50" y1="32" x2="60" y2="32"/>' +
    '<line x1="12.2" y1="12.2" x2="19.3" y2="19.3"/><line x1="44.7" y1="44.7" x2="51.8" y2="51.8"/>' +
    '<line x1="12.2" y1="51.8" x2="19.3" y2="44.7"/><line x1="44.7" y1="19.3" x2="51.8" y2="12.2"/>' +
    '</g></svg>';

  const SVG_MOON = '<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M36 8a24 24 0 1 0 0 48 20 20 0 0 1 0-48z" fill="#b0bec5"/>' +
    '</svg>';

  function isDaytime(lat, lon, date) {
    try {
      const times = getSunTimes(lat, lon, date);
      if (times.sunrise && times.sunset) {
        return date >= times.sunrise && date < times.sunset;
      }
    } catch (e) {}
    // Fallback: rough estimate using solar noon at longitude
    const utcHour = date.getUTCHours() + date.getUTCMinutes() / 60;
    const solarNoon = 12 - lon / 15;
    const diff = Math.abs(((utcHour - solarNoon) + 24) % 24 - 12);
    return diff < 6;
  }

  let lastLocalDay = null;
  let lastUtcDay = null;

  function updateDayNight() {
    const now = new Date();
    // Local day/night based on user location
    if (myLat !== null && myLon !== null) {
      lastLocalDay = isDaytime(myLat, myLon, now);
    } else {
      lastLocalDay = null;
    }
    // UTC day/night based on Greenwich (51.48°N, 0°W)
    lastUtcDay = isDaytime(51.48, 0, now);
  }

  // --- Weather fetch (WU PWS) ---

  let weatherTimer = null;

  function fetchWeather() {
    if (weatherTimer) clearInterval(weatherTimer);
    doFetchWeather();
    weatherTimer = setInterval(doFetchWeather, 5 * 60 * 1000);
  }

  function useWU() { return wxStation && wxApiKey; }

  function setWxSource(src) {
    wxSourceLogo.classList.remove('hidden', 'wx-src-wu', 'wx-src-nws');
    if (src === 'wu') {
      wxSourceLogo.textContent = 'WU';
      wxSourceLogo.title = 'Weather Underground';
      wxSourceLogo.classList.add('wx-src-wu');
    } else if (src === 'nws') {
      wxSourceLogo.textContent = 'NWS';
      wxSourceLogo.title = 'National Weather Service';
      wxSourceLogo.classList.add('wx-src-nws');
    } else {
      wxSourceLogo.classList.add('hidden');
    }
  }

  function doFetchWeather() {
    if (useWU()) {
      const url = '/api/weather?station=' + encodeURIComponent(wxStation) + '&apikey=' + encodeURIComponent(wxApiKey);
      fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
        const name = data.neighborhood || wxStation;
        const tempStr = data.temp != null ? data.temp + '\u00B0F' : '';
        const cond = data.condition || '';
        const wind = (data.windDir || '') + ' ' + (data.windSpeed != null ? data.windSpeed + 'mph' : '');
        const hum = data.humidity != null ? data.humidity + '%' : '';
        let line1 = [name, tempStr, cond].filter(Boolean).join('  ');
        let line2 = ['W: ' + wind.trim(), hum ? 'H: ' + hum : ''].filter(Boolean).join('  ');
        clockLocalWeather.innerHTML = line1 + '<br>' + line2;
        setWxSource('wu');
      }).catch(() => {
        clockLocalWeather.textContent = '';
        setWxSource(null);
      });
    }
    // If no WU, NWS conditions callback handles the weather text display
  }

  // --- NWS conditions (weather background) ---

  let nwsCondTimer = null;
  let nwsAlertTimer = null;
  const wxBgClasses = ['wx-clear-day','wx-clear-night','wx-partly-cloudy-day','wx-partly-cloudy-night','wx-cloudy','wx-rain','wx-thunderstorm','wx-snow','wx-fog'];

  function startNwsPolling() {
    if (nwsCondTimer) clearInterval(nwsCondTimer);
    if (nwsAlertTimer) clearInterval(nwsAlertTimer);
    fetchNwsConditions();
    fetchNwsAlerts();
    nwsCondTimer = setInterval(fetchNwsConditions, 15 * 60 * 1000);
    nwsAlertTimer = setInterval(fetchNwsAlerts, 5 * 60 * 1000);
  }

  function fetchNwsConditions() {
    if (myLat === null || myLon === null) return;
    const url = '/api/weather/conditions?lat=' + myLat + '&lon=' + myLon;
    fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(data => {
      applyWeatherBackground(data.shortForecast, data.isDaytime);
      // Use NWS as weather text source when WU is not configured
      if (!useWU()) {
        const tempStr = data.temperature != null ? data.temperature + '\u00B0' + (data.temperatureUnit || 'F') : '';
        const cond = data.shortForecast || '';
        const wind = data.windDirection && data.windSpeed ? data.windDirection + ' ' + data.windSpeed : '';
        const hum = data.relativeHumidity != null ? data.relativeHumidity + '%' : '';
        let line1 = [tempStr, cond].filter(Boolean).join('  ');
        let line2 = [wind ? 'W: ' + wind : '', hum ? 'H: ' + hum : ''].filter(Boolean).join('  ');
        clockLocalWeather.innerHTML = line1 + (line2 ? '<br>' + line2 : '');
        setWxSource('nws');
      }
    }).catch(() => {});
  }

  function applyWeatherBackground(forecast, isDaytime) {
    const body = document.querySelector('#widget-clock-local .widget-body');
    wxBgClasses.forEach(c => body.classList.remove(c));
    if (!forecast) return;
    const fc = forecast.toLowerCase();
    let cls = '';
    if (/thunder|t-storm/.test(fc)) cls = 'wx-thunderstorm';
    else if (/snow|flurr|blizzard|sleet|ice/.test(fc)) cls = 'wx-snow';
    else if (/rain|drizzle|shower/.test(fc)) cls = 'wx-rain';
    else if (/fog|haze|mist/.test(fc)) cls = 'wx-fog';
    else if (/cloudy|overcast/.test(fc)) {
      if (/partly|mostly sunny/.test(fc)) cls = isDaytime ? 'wx-partly-cloudy-day' : 'wx-partly-cloudy-night';
      else cls = 'wx-cloudy';
    }
    else if (/sunny|clear/.test(fc)) cls = isDaytime ? 'wx-clear-day' : 'wx-clear-night';
    if (cls) body.classList.add(cls);
  }

  // --- NWS alerts ---

  function fetchNwsAlerts() {
    if (myLat === null || myLon === null) return;
    const url = '/api/weather/alerts?lat=' + myLat + '&lon=' + myLon;
    fetch(url).then(r => r.ok ? r.json() : Promise.reject()).then(alerts => {
      nwsAlerts = alerts;
      updateAlertBadge();
    }).catch(() => {
      nwsAlerts = [];
      updateAlertBadge();
    });
  }

  function updateAlertBadge() {
    if (!nwsAlerts.length) {
      wxAlertBadge.classList.add('hidden');
      return;
    }
    wxAlertBadge.classList.remove('hidden');
    // Use highest severity
    const sevOrder = ['Extreme','Severe','Moderate','Minor','Unknown'];
    let highest = 'Minor';
    for (const a of nwsAlerts) {
      if (sevOrder.indexOf(a.severity) < sevOrder.indexOf(highest)) highest = a.severity;
    }
    wxAlertBadge.className = 'wx-alert-badge wx-alert-' + highest.toLowerCase();
  }

  wxAlertBadge.addEventListener('click', () => {
    wxAlertList.innerHTML = '';
    for (const a of nwsAlerts) {
      const div = document.createElement('div');
      div.className = 'wx-alert-item';
      div.innerHTML =
        '<div class="wx-alert-event wx-sev-' + (a.severity || 'Unknown') + '">' + esc(a.event) + ' (' + esc(a.severity) + ')</div>' +
        '<div class="wx-alert-headline">' + esc(a.headline || '') + '</div>' +
        '<div class="wx-alert-desc">' + esc(a.description || '') + '</div>' +
        (a.web ? '<div class="wx-alert-link"><a href="' + esc(a.web) + '" target="_blank" rel="noopener">View on NWS website</a></div>' : '');
      wxAlertList.appendChild(div);
    }
    wxAlertSplash.classList.remove('hidden');
  });

  wxAlertClose.addEventListener('click', () => {
    wxAlertSplash.classList.add('hidden');
  });

  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  function updateClocks() {
    const now = new Date();
    const dateOpts = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const localIcon = lastLocalDay === true ? '☀️' : lastLocalDay === false ? '🌙' : '';
    const utcIcon = lastUtcDay === true ? '☀️' : lastUtcDay === false ? '🌙' : '';
    const localTime = fmtTime(now);
    const utcTime = fmtTime(now, { timeZone: 'UTC' });
    clockLocalTime.innerHTML = (localIcon ? '<span class="daynight-emoji">' + localIcon + '</span> ' : '') + esc(localTime);
    clockUtcTime.innerHTML = (utcIcon ? '<span class="daynight-emoji">' + utcIcon + '</span> ' : '') + esc(utcTime);
    clockUtcDate.textContent = now.toLocaleDateString(undefined, Object.assign({ timeZone: 'UTC' }, dateOpts));
    if (clockStyle === 'analog') {
      drawAnalogClock(clockLocalCanvas, now);
      const utcDate = new Date(now);
      utcDate.setMinutes(utcDate.getMinutes() + utcDate.getTimezoneOffset());
      drawAnalogClock(clockUtcCanvas, utcDate);
    }
    applyClockStyle();
    updateDayNight();
  }

  updateClocks();
  setInterval(updateClocks, 1000);
  setInterval(renderSpots, 30000);

  // --- Auto-refresh ---

  function resetCountdown() {
    countdownSeconds = 60;
    updateCountdownDisplay();
  }

  function updateCountdownDisplay() {
    if (autoRefreshEnabled) {
      countdownEl.textContent = `(${countdownSeconds}s)`;
    } else {
      countdownEl.textContent = '';
    }
  }

  function startAutoRefresh() {
    stopAutoRefresh();
    autoRefreshEnabled = true;
    resetCountdown();
    countdownTimer = setInterval(() => {
      countdownSeconds--;
      if (countdownSeconds <= 0) {
        refreshAll();
      }
      updateCountdownDisplay();
    }, 1000);
  }

  function stopAutoRefresh() {
    autoRefreshEnabled = false;
    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
    countdownEl.textContent = '';
  }

  // --- Event listeners ---

  autoRefreshCb.addEventListener('change', () => {
    if (autoRefreshCb.checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  refreshBtn.addEventListener('click', () => {
    refreshAll();
  });

  // --- Fullscreen ---

  const fullscreenBtn = document.getElementById('fullscreenBtn');

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  document.addEventListener('fullscreenchange', () => {
    fullscreenBtn.textContent = document.fullscreenElement ? 'Exit Fullscreen' : 'Fullscreen';
    // Recalculate widget area after fullscreen transition
    if (map) setTimeout(() => map.invalidateSize(), 100);
  });

  // --- Widget Management ---

  let zCounter = 10;
  const WIDGET_STORAGE_KEY = 'hamtab_widgets';
  const SNAP_DIST = 20;
  const HEADER_H = 30; // approximate widget header height

  function getWidgetArea() {
    const area = document.getElementById('widgetArea');
    return { width: area.clientWidth, height: area.clientHeight };
  }

  function getDefaultLayout() {
    const { width: W, height: H } = getWidgetArea();
    const pad = 6;

    const leftW = Math.round(W * 0.30);
    const rightW = Math.round(W * 0.25);
    const centerW = W - leftW - rightW - pad * 4;
    const rightHalf = Math.round((H - pad * 3) / 2);

    const clockH = clockStyle === 'analog' ? 280 : 130;
    const clockW = Math.round((centerW - pad) / 2);

    const rightX = leftW + centerW + pad * 3;

    return {
      'widget-clock-local': { left: leftW + pad * 2, top: pad, width: clockW, height: clockH },
      'widget-clock-utc': { left: leftW + pad * 2 + clockW + pad, top: pad, width: clockW, height: clockH },
      'widget-activations': { left: pad, top: pad, width: leftW, height: H - pad * 2 },
      'widget-map': { left: leftW + pad * 2, top: clockH + pad * 2, width: centerW, height: H - clockH - pad * 3 },
      'widget-solar': { left: rightX, top: pad, width: rightW, height: rightHalf },
      'widget-lunar': { left: rightX, top: rightHalf + pad * 2, width: rightW, height: H - rightHalf - pad * 3 },
    };
  }

  function clampPosition(left, top, wW, wH) {
    const { width: aW, height: aH } = getWidgetArea();
    // Keep header bar always visible and at least 60px of width on screen
    left = Math.max(0, Math.min(left, aW - 60));
    top = Math.max(0, Math.min(top, aH - HEADER_H));
    return { left, top };
  }

  function snapPosition(left, top, wW, wH) {
    const { width: aW, height: aH } = getWidgetArea();
    const right = left + wW;
    const bottom = top + wH;

    // Snap left edge to area left
    if (Math.abs(left) < SNAP_DIST) left = 0;
    // Snap right edge to area right
    if (Math.abs(right - aW) < SNAP_DIST) left = aW - wW;
    // Snap top edge to area top
    if (Math.abs(top) < SNAP_DIST) top = 0;
    // Snap bottom edge to area bottom
    if (Math.abs(bottom - aH) < SNAP_DIST) top = aH - wH;
    // Snap horizontal center
    const cx = left + wW / 2;
    if (Math.abs(cx - aW / 2) < SNAP_DIST) left = Math.round((aW - wW) / 2);
    // Snap vertical center
    const cy = top + wH / 2;
    if (Math.abs(cy - aH / 2) < SNAP_DIST) top = Math.round((aH - wH) / 2);

    return { left, top };
  }

  function clampSize(left, top, w, h) {
    const { width: aW, height: aH } = getWidgetArea();
    // Don't let widget extend beyond the area
    w = Math.min(w, aW - left);
    h = Math.min(h, aH - top);
    w = Math.max(150, w);
    h = Math.max(80, h);
    return { w, h };
  }

  function saveWidgets() {
    const layout = {};
    document.querySelectorAll('.widget').forEach(w => {
      layout[w.id] = {
        left: parseInt(w.style.left) || 0,
        top: parseInt(w.style.top) || 0,
        width: parseInt(w.style.width) || 200,
        height: parseInt(w.style.height) || 150,
      };
    });
    localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(layout));
  }

  function bringToFront(widget) {
    zCounter++;
    widget.style.zIndex = zCounter;
  }

  function setupDrag(widget, handle) {
    let startX, startY, origLeft, origTop;

    handle.addEventListener('mousedown', (e) => {
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

        // Snap then clamp
        ({ left: newLeft, top: newTop } = snapPosition(newLeft, newTop, wW, wH));
        ({ left: newLeft, top: newTop } = clampPosition(newLeft, newTop, wW, wH));

        widget.style.left = newLeft + 'px';
        widget.style.top = newTop + 'px';
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveWidgets();
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function setupResize(widget, handle) {
    let startX, startY, origW, origH, origLeft, origTop;

    handle.addEventListener('mousedown', (e) => {
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
        widget.style.width = newW + 'px';
        widget.style.height = newH + 'px';
        if (map && widget.id === 'widget-map') {
          map.invalidateSize();
        }
      }

      function onUp() {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        saveWidgets();
        if (map && widget.id === 'widget-map') {
          map.invalidateSize();
        }
      }

      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  function applyLayout(layout) {
    document.querySelectorAll('.widget').forEach(widget => {
      const pos = layout[widget.id];
      if (pos) {
        widget.style.left = pos.left + 'px';
        widget.style.top = pos.top + 'px';
        widget.style.width = pos.width + 'px';
        widget.style.height = pos.height + 'px';
      }
      widget.style.zIndex = ++zCounter;
    });
    if (map) map.invalidateSize();
  }

  function resetLayout() {
    localStorage.removeItem(WIDGET_STORAGE_KEY);
    applyLayout(getDefaultLayout());
    saveWidgets();
    centerMapOnUser();
    updateUserMarker();
  }

  function initWidgets() {
    let layout;
    try {
      const saved = localStorage.getItem(WIDGET_STORAGE_KEY);
      if (saved) {
        layout = JSON.parse(saved);
        // Validate: if any widget is off-screen, reset everything
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

    document.querySelectorAll('.widget').forEach(widget => {
      const header = widget.querySelector('.widget-header');
      const resizer = widget.querySelector('.widget-resize');
      if (header) setupDrag(widget, header);
      if (resizer) setupResize(widget, resizer);
      widget.addEventListener('mousedown', () => bringToFront(widget));
    });

    // Keep map in sync with its container size
    const mapWidget = document.getElementById('widget-map');
    if (map && mapWidget && window.ResizeObserver) {
      new ResizeObserver(() => map.invalidateSize()).observe(mapWidget);
    }
  }

  document.getElementById('resetLayoutBtn').addEventListener('click', resetLayout);

  // --- Auto-update status ---

  const updateIndicator = document.getElementById('updateIndicator');
  const updateDot = document.getElementById('updateDot');
  const updateLabel = document.getElementById('updateLabel');
  const restartBtn = document.getElementById('restartBtn');

  let updateStatusPolling = null;
  let knownServerHash = null;
  let restartNeeded = false;

  function pollForServer(attempts) {
    if (attempts <= 0) {
      updateLabel.textContent = 'Server did not come back';
      updateDot.className = 'update-dot red';
      return;
    }
    setTimeout(() => {
      fetch('/api/spots').then(resp => {
        if (resp.ok) {
          updateLabel.textContent = 'Reloading...';
          location.reload();
        } else {
          pollForServer(attempts - 1);
        }
      }).catch(() => {
        pollForServer(attempts - 1);
      });
    }, 1000);
  }

  function showRestartNeeded() {
    restartNeeded = true;
    updateDot.className = 'update-dot yellow';
    updateLabel.textContent = 'Restart needed';
    restartBtn.classList.remove('hidden');
  }

  async function checkUpdateStatus() {
    try {
      const resp = await fetch('/api/update/status');
      if (!resp.ok) return;
      const data = await resp.json();

      // Track server hash; detect if HEAD has moved past the running server
      if (data.serverHash) {
        if (!knownServerHash) knownServerHash = data.serverHash;
      }

      if (restartNeeded) return; // don't overwrite restart indicator

      if (data.available) {
        updateDot.className = 'update-dot green';
        updateLabel.textContent = 'Update available';
      } else {
        updateDot.className = 'update-dot gray';
        updateLabel.textContent = data.lastCheck
          ? 'Checked ' + fmtTime(new Date(data.lastCheck), { hour: '2-digit', minute: '2-digit' })
          : 'No updates';
      }
    } catch (e) {
      // ignore
    }
  }

  function startUpdateStatusPolling() {
    if (updateStatusPolling) clearInterval(updateStatusPolling);
    checkUpdateStatus();
    updateStatusPolling = setInterval(checkUpdateStatus, 30000);
  }

  async function applyUpdate() {
    updateDot.className = 'update-dot yellow';
    updateLabel.textContent = 'Applying...';
    updateIndicator.style.pointerEvents = 'none';

    try {
      const resp = await fetch('/api/update/apply', { method: 'POST' });
      const data = await resp.json();

      if (!resp.ok) {
        updateDot.className = 'update-dot red';
        updateLabel.textContent = data.error || 'Failed';
        updateIndicator.style.pointerEvents = '';
        return;
      }

      if (!data.updated) {
        updateDot.className = 'update-dot gray';
        updateLabel.textContent = 'Already up to date';
        updateIndicator.style.pointerEvents = '';
        return;
      }

      if (data.serverRestarting) {
        updateLabel.textContent = 'Restarting...';
        pollForServer(30);
      } else {
        // Frontend-only update — check if server files also changed
        // by comparing the server's startup hash to current HEAD
        try {
          const statusResp = await fetch('/api/update/status');
          if (statusResp.ok) {
            const statusData = await statusResp.json();
            if (statusData.serverHash && knownServerHash && statusData.serverHash !== knownServerHash) {
              // Server code changed but process didn't restart
              showRestartNeeded();
              return;
            }
          }
        } catch { /* ignore */ }
        updateLabel.textContent = 'Reloading...';
        setTimeout(() => location.reload(), 500);
      }
    } catch (err) {
      updateDot.className = 'update-dot red';
      updateLabel.textContent = 'Error';
      updateIndicator.style.pointerEvents = '';
    }
  }

  updateIndicator.addEventListener('click', () => {
    if (updateDot.classList.contains('green') && !restartNeeded) {
      applyUpdate();
    }
  });

  restartBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    restartBtn.classList.add('hidden');
    updateDot.className = 'update-dot yellow';
    updateLabel.textContent = 'Restarting...';
    try {
      await fetch('/api/restart', { method: 'POST' });
    } catch { /* server is exiting */ }
    pollForServer(30);
  });

  // Send saved update interval to server on load
  function sendUpdateInterval() {
    const saved = localStorage.getItem('hamtab_update_interval');
    if (saved) {
      fetch('/api/update/interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: parseInt(saved, 10) }),
      }).catch(() => {});
    }
  }

  // --- Init ---

  let appInitialized = false;

  function initApp() {
    if (appInitialized) return;
    appInitialized = true;
    refreshAll();
    startAutoRefresh();
    fetchLocation();
    startUpdateStatusPolling();
    sendUpdateInterval();
    fetchWeather();
    startNwsPolling();
  }

  // Initialize widget positions before anything else
  initWidgets();
  // Restore saved source tab
  switchSource(currentSource);
  // Allow layout to settle, then fix map size
  if (map) setTimeout(() => map.invalidateSize(), 100);

  // Show splash if no saved callsign, otherwise start immediately
  if (myCallsign) {
    splash.classList.add('hidden');
    updateOperatorDisplay();
    centerMapOnUser();
    updateUserMarker();
    initApp();
  } else {
    showSplash();
    // Still fetch location in the background while splash is up
    fetchLocation();
  }
})();
