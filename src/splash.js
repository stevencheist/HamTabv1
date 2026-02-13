import state from './state.js';
import { $ } from './dom.js';
import { WIDGET_DEFS } from './constants.js';
import { esc } from './utils.js';
import { latLonToGrid, gridToLatLon } from './geo.js';
import { centerMapOnUser, updateUserMarker, updateBeaconMarkers } from './map-init.js';
import { updateClocks } from './clocks.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';
import { fetchWeather, startNwsPolling } from './weather.js';
import { applyFilter, fetchLicenseClass } from './filters.js';
import { saveWidgetVisibility, applyWidgetVisibility, loadWidgetVisibility, isWidgetVisible, saveUserLayout, clearUserLayout, hasUserLayout } from './widgets.js';
import { getThemeList, getCurrentThemeId, applyTheme, getThemeSwatchColors, currentThemeSupportsGrid } from './themes.js';
import { GRID_PERMUTATIONS, GRID_DEFAULT_ASSIGNMENTS, DEFAULT_BAND_COLORS, getBandColor, getBandColorOverrides, saveBandColors } from './constants.js';
import { activateGridMode, deactivateGridMode, saveGridAssignments, getGridPermutation } from './grid-layout.js';
import { startAutoRefresh, stopAutoRefresh } from './refresh.js';
import { fetchSatellitePositions } from './satellites.js';
import { startBeaconTimer, stopBeaconTimer } from './beacons.js';
import { fetchVoacapMatrixThrottled } from './voacap.js';
import { fetchLiveSpots } from './live-spots.js';
import { renderDedxInfo } from './dedx-info.js';
import { fetchSolar } from './solar.js';
import { fetchLunar } from './lunar.js';
import { fetchSpaceWxData } from './spacewx-graphs.js';
import { fetchDxpeditions } from './dxpeditions.js';
import { fetchContests } from './contests.js';
import { startDedxTimer, stopDedxTimer } from './dedx-info.js';

export function updateOperatorDisplay() {
  const opCall = $('opCall');
  const opLoc = $('opLoc');

  if (state.myCallsign) {
    const qrz = `https://www.qrz.com/db/${encodeURIComponent(state.myCallsign)}`;
    let classLabel = state.licenseClass ? `[${state.licenseClass}]` : '';
    opCall.innerHTML = `<a href="${qrz}" target="_blank" rel="noopener">${esc(state.myCallsign)}</a>${classLabel ? `<div class="op-class">${esc(classLabel)}</div>` : ''}`;
    const info = state.callsignCache[state.myCallsign.toUpperCase()];
    const opName = document.getElementById('opName');
    if (opName) {
      opName.textContent = info ? info.name : '';
    }
  } else {
    opCall.textContent = '';
    const opName = document.getElementById('opName');
    if (opName) opName.textContent = '';
  }
  if (state.myLat !== null && state.myLon !== null) {
    const grid = latLonToGrid(state.myLat, state.myLon);
    opLoc.textContent = `${state.myLat.toFixed(2)}, ${state.myLon.toFixed(2)} [${grid}]`;
  } else {
    opLoc.textContent = 'Location unknown';
  }
}

export function fetchLocation() {
  if (state.manualLoc) return;
  if (!navigator.geolocation) {
    $('opLoc').textContent = 'Geolocation unavailable';
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const newLat = pos.coords.latitude;
      const newLon = pos.coords.longitude;
      const changed = state.myLat !== newLat || state.myLon !== newLon;
      state.myLat = newLat;
      state.myLon = newLon;
      localStorage.setItem('hamtab_gps_lat', String(newLat));
      localStorage.setItem('hamtab_gps_lon', String(newLon));
      updateOperatorDisplay();
      centerMapOnUser();
      updateUserMarker();
      if (changed && state.appInitialized) startNwsPolling();
    },
    () => {
      $('opLoc').textContent = 'Location denied';
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
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
  const splashGridDropdown = $('splashGridDropdown');
  const suggestions = getGridSuggestions(prefix);
  splashGridDropdown.innerHTML = '';
  state.gridHighlightIdx = -1;

  if (suggestions.length === 0) {
    splashGridDropdown.classList.remove('open');
    return;
  }

  suggestions.forEach((grid) => {
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
  const splashGrid = $('splashGrid');
  const splashGridDropdown = $('splashGridDropdown');
  splashGrid.value = grid;
  splashGridDropdown.classList.remove('open');
  splashGridDropdown.innerHTML = '';
  state.gridHighlightIdx = -1;

  const ll = gridToLatLon(grid);
  if (ll) {
    state.syncingFields = true;
    $('splashLat').value = ll.lat.toFixed(2);
    $('splashLon').value = ll.lon.toFixed(2);
    state.myLat = ll.lat;
    state.myLon = ll.lon;
    state.syncingFields = false;
    state.manualLoc = true;
    $('splashGpsBtn').classList.remove('active');
    updateLocStatus('Manual location set');
  }
}

function updateLocStatus(msg, isError) {
  const el = $('splashLocStatus');
  el.textContent = msg || '';
  el.classList.toggle('error', !!isError);
}

function updateGridHighlight() {
  const options = $('splashGridDropdown').querySelectorAll('.grid-option');
  options.forEach((opt, i) => {
    opt.classList.toggle('highlighted', i === state.gridHighlightIdx);
  });
  if (state.gridHighlightIdx >= 0 && options[state.gridHighlightIdx]) {
    options[state.gridHighlightIdx].scrollIntoView({ block: 'nearest' });
  }
}

// --- Widget slot enforcement for grid mode ---
function updateWidgetSlotEnforcement() {
  const counter = document.getElementById('widgetSlotCounter');
  const widgetList = document.getElementById('splashWidgetList');
  if (!counter || !widgetList) return;

  const floatRadio = document.getElementById('layoutModeFloat');
  const isGrid = floatRadio ? !floatRadio.checked : false;
  const supportsGrid = currentThemeSupportsGrid();

  // Float mode or non-grid theme — no limits
  if (!isGrid || !supportsGrid) {
    counter.textContent = '';
    counter.classList.remove('over-limit');
    widgetList.querySelectorAll('label').forEach(lbl => {
      lbl.classList.remove('cb-disabled');
      const cb = lbl.querySelector('input[type="checkbox"]');
      if (cb) cb.disabled = false;
    });
    return;
  }

  // Grid mode — enforce slot limit
  const permSelect = document.getElementById('gridPermSelect');
  const permId = permSelect ? permSelect.value : state.gridPermutation;
  const perm = getGridPermutation(permId);
  const maxSlots = perm.slots;

  const checkboxes = widgetList.querySelectorAll('input[type="checkbox"]');
  let checkedNonMap = 0;

  // Force-check and disable the map checkbox; count non-map checked
  checkboxes.forEach(cb => {
    if (cb.dataset.widgetId === 'widget-map') {
      cb.checked = true;
      cb.disabled = true;
      cb.closest('label').classList.add('cb-disabled');
    } else if (cb.checked) {
      checkedNonMap++;
    }
  });

  const atLimit = checkedNonMap >= maxSlots;

  // Disable unchecked non-map boxes when at/over limit
  checkboxes.forEach(cb => {
    if (cb.dataset.widgetId === 'widget-map') return; // already handled
    if (atLimit && !cb.checked) {
      cb.disabled = true;
      cb.closest('label').classList.add('cb-disabled');
    } else {
      cb.disabled = false;
      cb.closest('label').classList.remove('cb-disabled');
    }
  });

  // Update counter text
  if (checkedNonMap > maxSlots) {
    counter.textContent = `${checkedNonMap} / ${maxSlots} slots \u2014 excess hidden in grid`;
    counter.classList.add('over-limit');
  } else {
    counter.textContent = `${checkedNonMap} / ${maxSlots} slots`;
    counter.classList.remove('over-limit');
  }
}

// initApp is passed in to avoid circular dependency
let _initApp = null;
export function setInitApp(fn) { _initApp = fn; }

export function showSplash() {
  const splash = $('splash');
  splash.classList.remove('hidden');

  // --- Reset to Station tab ---
  splash.querySelectorAll('.config-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === 'station'));
  splash.querySelectorAll('.config-panel').forEach(p => p.classList.toggle('active', p.dataset.panel === 'station'));

  $('splashCallsign').value = state.myCallsign;

  if (state.myLat !== null && state.myLon !== null) {
    $('splashLat').value = state.myLat.toFixed(2);
    $('splashLon').value = state.myLon.toFixed(2);
    const grid = latLonToGrid(state.myLat, state.myLon);
    $('splashGrid').value = grid.substring(0, 4).toUpperCase();
  } else {
    $('splashLat').value = '';
    $('splashLon').value = '';
    $('splashGrid').value = '';
  }

  if (state.manualLoc) {
    $('splashGpsBtn').classList.remove('active');
    updateLocStatus('Manual override active');
  } else {
    $('splashGpsBtn').classList.add('active');
    updateLocStatus('Using GPS');
  }

  // Load preferences — defensive null-checks for deployment-mode differences
  const timeFmt24 = $('timeFmt24');
  const timeFmt12 = $('timeFmt12');
  if (timeFmt24) timeFmt24.checked = state.use24h;
  if (timeFmt12) timeFmt12.checked = !state.use24h;

  const distUnitMi = $('distUnitMi');
  const distUnitKm = $('distUnitKm');
  if (distUnitMi) distUnitMi.checked = state.distanceUnit === 'mi';
  if (distUnitKm) distUnitKm.checked = state.distanceUnit === 'km';

  const tempUnitF = $('tempUnitF');
  const tempUnitC = $('tempUnitC');
  if (tempUnitF) tempUnitF.checked = state.temperatureUnit === 'F';
  if (tempUnitC) tempUnitC.checked = state.temperatureUnit === 'C';

  // Auto-refresh toggle
  const cfgAutoRefresh = $('cfgAutoRefresh');
  if (cfgAutoRefresh) cfgAutoRefresh.checked = state.autoRefreshEnabled;

  const widgetList = document.getElementById('splashWidgetList');
  widgetList.innerHTML = '';
  WIDGET_DEFS.forEach(w => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.widgetId = w.id;
    cb.checked = state.widgetVisibility[w.id] !== false;
    cb.addEventListener('change', updateWidgetSlotEnforcement);
    label.appendChild(cb);
    label.appendChild(document.createTextNode(w.name));
    widgetList.appendChild(label);
  });

  $('splashWxStation').value = state.wxStation;
  $('splashWxApiKey').value = state.wxApiKey;
  $('splashN2yoApiKey').value = state.n2yoApiKey;

  const intervalSelect = $('splashUpdateInterval');
  if (intervalSelect) {
    const savedInterval = localStorage.getItem('hamtab_update_interval') || '60';
    intervalSelect.value = savedInterval;
  }

  $('splashGridDropdown').classList.remove('open');
  $('splashGridDropdown').innerHTML = '';
  state.gridHighlightIdx = -1;

  // --- Populate theme selector ---
  const themeSelector = document.getElementById('themeSelector');
  if (themeSelector) {
    themeSelector.innerHTML = '';
    const themes = getThemeList();
    const currentId = getCurrentThemeId();
    themes.forEach(t => {
      const swatch = document.createElement('div');
      swatch.className = 'theme-swatch' + (t.id === currentId ? ' active' : '');
      swatch.dataset.themeId = t.id;

      const colors = getThemeSwatchColors(t.id);
      const colorsDiv = document.createElement('div');
      colorsDiv.className = 'theme-swatch-colors';
      colors.forEach(c => {
        const span = document.createElement('span');
        span.style.background = c;
        colorsDiv.appendChild(span);
      });
      swatch.appendChild(colorsDiv);

      const nameDiv = document.createElement('div');
      nameDiv.className = 'theme-swatch-name';
      nameDiv.textContent = t.name;
      swatch.appendChild(nameDiv);

      const descDiv = document.createElement('div');
      descDiv.className = 'theme-swatch-desc';
      descDiv.textContent = t.description;
      swatch.appendChild(descDiv);

      swatch.addEventListener('click', () => {
        applyTheme(t.id);
        themeSelector.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');

        // Update grid section visibility based on new theme
        const gridSec = document.getElementById('gridModeSection');
        if (gridSec) {
          const supports = currentThemeSupportsGrid();
          gridSec.style.display = supports ? '' : 'none';
          if (!supports) {
            // Force float mode radio when switching to non-grid theme
            const floatRadio = document.getElementById('layoutModeFloat');
            if (floatRadio) floatRadio.checked = true;
            const permSec = document.getElementById('gridPermSection');
            if (permSec) permSec.style.display = 'none';
          }
        }
        updateWidgetSlotEnforcement();
      });

      themeSelector.appendChild(swatch);
    });
  }

  // Compact header toggle
  const cfgSlimHeader = $('cfgSlimHeader');
  if (cfgSlimHeader) cfgSlimHeader.checked = state.slimHeader;

  // Grayscale toggle
  const cfgGrayscale = $('cfgGrayscale');
  if (cfgGrayscale) cfgGrayscale.checked = state.grayscale;

  // Band color pickers
  populateBandColorPickers();

  $('splashVersion').textContent = __APP_VERSION__;
  $('aboutVersion').textContent = __APP_VERSION__;

  // --- Grid mode section ---
  const gridSection = document.getElementById('gridModeSection');
  const gridPermSection = document.getElementById('gridPermSection');
  if (gridSection) {
    // Hide grid section if current theme doesn't support it
    gridSection.style.display = currentThemeSupportsGrid() ? '' : 'none';

    // Set radio buttons from state
    $('layoutModeFloat').checked = state.gridMode !== 'grid';
    $('layoutModeGrid').checked = state.gridMode === 'grid';

    // Populate permutation select
    const permSelect = document.getElementById('gridPermSelect');
    if (permSelect) {
      permSelect.innerHTML = '';
      GRID_PERMUTATIONS.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${p.name} (${p.slots} slots)`;
        permSelect.appendChild(opt);
      });
      permSelect.value = state.gridPermutation;
    }

    // Show/hide perm section based on mode
    if (gridPermSection) {
      gridPermSection.style.display = state.gridMode === 'grid' ? '' : 'none';
    }

    // Render preview
    renderGridPreview(state.gridPermutation);
  }

  updateWidgetSlotEnforcement();

  // --- Layout section state ---
  const hasSaved = hasUserLayout();
  $('splashClearLayout').disabled = !hasSaved;
  $('splashLayoutStatus').textContent = hasSaved ? 'Custom layout saved' : '';

  $('splashCallsign').focus();
}

function dismissSplash() {
  // Get callsign - required to proceed
  const callsignEl = $('splashCallsign');
  const val = callsignEl ? callsignEl.value.trim().toUpperCase() : '';
  if (!val) return;

  // Hide modal FIRST - before anything that could fail
  const splashEl = $('splash');
  const gridDropdown = $('splashGridDropdown');
  if (gridDropdown) gridDropdown.classList.remove('open');
  if (splashEl) splashEl.classList.add('hidden');

  // Everything else in try-catch so modal stays hidden even if storage fails
  try {
    state.myCallsign = val;
    localStorage.setItem('hamtab_callsign', state.myCallsign);

    if (state.manualLoc && state.myLat !== null && state.myLon !== null) {
      localStorage.setItem('hamtab_lat', String(state.myLat));
      localStorage.setItem('hamtab_lon', String(state.myLon));
    }

    const timeFmt24 = $('timeFmt24');
    state.use24h = timeFmt24 ? timeFmt24.checked : state.use24h;
    localStorage.setItem('hamtab_time24', String(state.use24h));

    // Save unit preferences
    const distUnitKm = $('distUnitKm');
    const tempUnitC = $('tempUnitC');
    state.distanceUnit = distUnitKm && distUnitKm.checked ? 'km' : 'mi';
    state.temperatureUnit = tempUnitC && tempUnitC.checked ? 'C' : 'F';
    localStorage.setItem('hamtab_distance_unit', state.distanceUnit);
    localStorage.setItem('hamtab_temperature_unit', state.temperatureUnit);

    const wxStationEl = $('splashWxStation');
    const wxApiKeyEl = $('splashWxApiKey');
    const n2yoApiKeyEl = $('splashN2yoApiKey');
    state.wxStation = wxStationEl ? wxStationEl.value.trim().toUpperCase() : state.wxStation;
    state.wxApiKey = wxApiKeyEl ? wxApiKeyEl.value.trim() : state.wxApiKey;
    state.n2yoApiKey = n2yoApiKeyEl ? n2yoApiKeyEl.value.trim() : state.n2yoApiKey;
    localStorage.setItem('hamtab_wx_station', state.wxStation);
    localStorage.setItem('hamtab_wx_apikey', state.wxApiKey);
    localStorage.setItem('hamtab_n2yo_apikey', state.n2yoApiKey);

    fetchWeather();

    // Capture old visibility before applying changes (for refresh-on-show hook)
    const oldVis = { ...state.widgetVisibility };

    const widgetList = document.getElementById('splashWidgetList');
    if (widgetList) {
      widgetList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        state.widgetVisibility[cb.dataset.widgetId] = cb.checked;
      });
    }
    saveWidgetVisibility();
    applyWidgetVisibility();

    // --- Refresh data for widgets that just became visible ---
    const justShown = (id) => oldVis[id] === false && state.widgetVisibility[id] !== false;
    const justHidden = (id) => oldVis[id] !== false && state.widgetVisibility[id] === false;

    if (justShown('widget-satellites'))   fetchSatellitePositions();
    if (justShown('widget-voacap'))       fetchVoacapMatrixThrottled();
    if (justShown('widget-live-spots'))   fetchLiveSpots();
    if (justShown('widget-dedx'))         renderDedxInfo();
    if (justShown('widget-solar'))        fetchSolar();
    if (justShown('widget-lunar'))        fetchLunar();
    if (justShown('widget-spacewx'))      fetchSpaceWxData();
    if (justShown('widget-dxpeditions'))  fetchDxpeditions();
    if (justShown('widget-contests'))     fetchContests();

    // Beacon timer start/stop — avoid 1 Hz timer running for a hidden widget
    if (justShown('widget-beacons'))  { startBeaconTimer(); updateBeaconMarkers(); }
    if (justHidden('widget-beacons')) { stopBeaconTimer(); }

    // Update interval setting (lanmode only - element may not exist on hostedmode)
    const intervalSelect = $('splashUpdateInterval');
    if (intervalSelect) {
      const intervalVal = intervalSelect.value;
      localStorage.setItem('hamtab_update_interval', intervalVal);
      fetch('/api/update/interval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seconds: parseInt(intervalVal, 10) }),
      }).catch(() => {});
    }
  } catch (e) {
    console.warn('Error saving settings:', e);
  }

  // Post-dismiss updates - also wrapped so UI doesn't break
  try {
    updateOperatorDisplay();
    centerMapOnUser();
    updateUserMarker();
    updateClocks();
    renderSpots();
    if (_initApp) _initApp();
    fetchLicenseClass(state.myCallsign);
  } catch (e) {
    console.warn('Error updating display after dismiss:', e);
  }

  // --- Grid mode changes ---
  if (currentThemeSupportsGrid()) {
    const newMode = $('layoutModeGrid') && $('layoutModeGrid').checked ? 'grid' : 'float';
    const permSelect = document.getElementById('gridPermSelect');
    const newPerm = permSelect ? permSelect.value : state.gridPermutation;

    if (newMode === 'grid' && state.gridMode !== 'grid') {
      state.gridPermutation = newPerm;
      const defaults = GRID_DEFAULT_ASSIGNMENTS[newPerm];
      state.gridAssignments = defaults ? { ...defaults } : {};
      saveGridAssignments();
      activateGridMode(newPerm);
    } else if (newMode === 'grid' && newPerm !== state.gridPermutation) {
      state.gridPermutation = newPerm;
      const defaults = GRID_DEFAULT_ASSIGNMENTS[newPerm];
      state.gridAssignments = defaults ? { ...defaults } : {};
      saveGridAssignments();
      activateGridMode(newPerm);
    } else if (newMode === 'float' && state.gridMode === 'grid') {
      deactivateGridMode();
    }
  }

  applyWidgetVisibility();

  // --- Refresh data for widgets that just became visible ---
  const justShown = (id) => oldVis[id] === false && state.widgetVisibility[id] !== false;
  const justHidden = (id) => oldVis[id] !== false && state.widgetVisibility[id] === false;

  if (justShown('widget-satellites'))   fetchSatellitePositions();
  if (justShown('widget-voacap'))       fetchVoacapMatrixThrottled();
  if (justShown('widget-live-spots'))   fetchLiveSpots();
  if (justShown('widget-dedx'))         renderDedxInfo();
  if (justShown('widget-solar'))        fetchSolar();
  if (justShown('widget-lunar'))        fetchLunar();
  if (justShown('widget-spacewx'))      fetchSpaceWxData();
  if (justShown('widget-dxpeditions'))  fetchDxpeditions();
  if (justShown('widget-contests'))     fetchContests();

  // Beacon timer start/stop — avoid 1 Hz timer running for a hidden widget
  if (justShown('widget-beacons'))  { startBeaconTimer(); updateBeaconMarkers(); }
  if (justHidden('widget-beacons')) { stopBeaconTimer(); }

  // DE/DX Info timer start/stop — avoid 1 Hz timer running for a hidden widget
  if (justShown('widget-dedx'))  { startDedxTimer(); }
  if (justHidden('widget-dedx')) { stopDedxTimer(); }

  // Update interval — lanmode only (element absent in hostedmode)
  const intervalSelect = $('splashUpdateInterval');
  if (intervalSelect) {
    const intervalVal = intervalSelect.value;
    localStorage.setItem('hamtab_update_interval', intervalVal);
    fetch('/api/update/interval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seconds: parseInt(intervalVal, 10) }),
    }).catch(() => {});
  }

  $('splashGridDropdown').classList.remove('open');
  $('splash').classList.add('hidden');
  updateOperatorDisplay();
  centerMapOnUser();
  updateUserMarker();
  updateClocks();
  renderSpots();
  if (_initApp) _initApp();
  fetchLicenseClass(state.myCallsign);
}

export function initSplashListeners() {
  // --- Tab switching ---
  document.querySelectorAll('.config-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.config-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.config-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`.config-panel[data-panel="${tab.dataset.tab}"]`).classList.add('active');
    });
  });

  $('splashOk').addEventListener('click', dismissSplash);
  $('splashCallsign').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dismissSplash();
  });

  function onLatLonInput() {
    if (state.syncingFields) return;
    state.manualLoc = true;
    $('splashGpsBtn').classList.remove('active');
    const lat = parseFloat($('splashLat').value);
    const lon = parseFloat($('splashLon').value);
    if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
      state.syncingFields = true;
      $('splashGrid').value = latLonToGrid(lat, lon).substring(0, 4).toUpperCase();
      state.myLat = lat;
      state.myLon = lon;
      state.syncingFields = false;
      updateLocStatus('Manual location set');
    } else {
      updateLocStatus('');
    }
  }

  $('splashLat').addEventListener('input', onLatLonInput);
  $('splashLon').addEventListener('input', onLatLonInput);

  $('splashGrid').addEventListener('input', () => {
    if (state.syncingFields) return;
    state.manualLoc = true;
    $('splashGpsBtn').classList.remove('active');
    const val = $('splashGrid').value.toUpperCase();

    if (val.length === 4) {
      const ll = gridToLatLon(val);
      if (ll) {
        state.syncingFields = true;
        $('splashLat').value = ll.lat.toFixed(2);
        $('splashLon').value = ll.lon.toFixed(2);
        state.myLat = ll.lat;
        state.myLon = ll.lon;
        state.syncingFields = false;
        updateLocStatus('Manual location set');
      }
      $('splashGridDropdown').classList.remove('open');
      $('splashGridDropdown').innerHTML = '';
      state.gridHighlightIdx = -1;
    } else if (val.length > 0 && val.length < 4) {
      showGridSuggestions(val);
    } else {
      $('splashGridDropdown').classList.remove('open');
      $('splashGridDropdown').innerHTML = '';
      state.gridHighlightIdx = -1;
      updateLocStatus('');
    }
  });

  $('splashGrid').addEventListener('keydown', (e) => {
    const options = $('splashGridDropdown').querySelectorAll('.grid-option');
    if (!$('splashGridDropdown').classList.contains('open') || options.length === 0) {
      if (e.key === 'Enter') dismissSplash();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.gridHighlightIdx = Math.min(state.gridHighlightIdx + 1, options.length - 1);
      updateGridHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.gridHighlightIdx = Math.max(state.gridHighlightIdx - 1, 0);
      updateGridHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (state.gridHighlightIdx >= 0 && options[state.gridHighlightIdx]) {
        selectGridSuggestion(options[state.gridHighlightIdx].textContent);
      }
    } else if (e.key === 'Escape') {
      $('splashGridDropdown').classList.remove('open');
      $('splashGridDropdown').innerHTML = '';
      state.gridHighlightIdx = -1;
    }
  });

  $('splashGrid').addEventListener('blur', () => {
    setTimeout(() => { // 150 ms delay lets a dropdown click register before the menu closes
      $('splashGridDropdown').classList.remove('open');
      $('splashGridDropdown').innerHTML = '';
      state.gridHighlightIdx = -1;
    }, 150);
  });

  $('splashLat').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dismissSplash();
  });
  $('splashLon').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') dismissSplash();
  });

  $('splashGpsBtn').addEventListener('click', () => {
    state.manualLoc = false;
    localStorage.removeItem('hamtab_lat');
    localStorage.removeItem('hamtab_lon');
    $('splashGpsBtn').classList.add('active');
    updateLocStatus('Using GPS');

    if (navigator.geolocation) {
      $('opLoc').textContent = 'Locating...';
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.myLat = pos.coords.latitude;
          state.myLon = pos.coords.longitude;
          state.syncingFields = true;
          $('splashLat').value = state.myLat.toFixed(2);
          $('splashLon').value = state.myLon.toFixed(2);
          $('splashGrid').value = latLonToGrid(state.myLat, state.myLon).substring(0, 4).toUpperCase();
          state.syncingFields = false;
          updateOperatorDisplay();
          centerMapOnUser();
          updateUserMarker();
          updateLocStatus('Using GPS');
        },
        () => {
          updateLocStatus('Location denied', true);
          $('opLoc').textContent = 'Location denied';
        },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    } else {
      updateLocStatus('Geolocation unavailable', true);
    }
  });

  // --- Layout save / clear buttons ---
  $('splashSaveLayout').addEventListener('click', () => {
    saveUserLayout();
    $('splashLayoutStatus').textContent = 'Layout saved';
    $('splashClearLayout').disabled = false;
  });

  $('splashClearLayout').addEventListener('click', () => {
    clearUserLayout();
    $('splashLayoutStatus').textContent = 'App default restored';
    $('splashClearLayout').disabled = true;
  });

  // --- Grid mode listeners ---
  const layoutModeFloat = document.getElementById('layoutModeFloat');
  const layoutModeGrid = document.getElementById('layoutModeGrid');
  const gridPermSelect = document.getElementById('gridPermSelect');
  const gridPermSection = document.getElementById('gridPermSection');

  if (layoutModeFloat && layoutModeGrid) {
    layoutModeFloat.addEventListener('change', () => {
      if (gridPermSection) gridPermSection.style.display = 'none';
      updateWidgetSlotEnforcement();
    });
    layoutModeGrid.addEventListener('change', () => {
      if (gridPermSection) gridPermSection.style.display = '';
      if (gridPermSelect) renderGridPreview(gridPermSelect.value);
      updateWidgetSlotEnforcement();
    });
  }
  if (gridPermSelect) {
    gridPermSelect.addEventListener('change', () => {
      renderGridPreview(gridPermSelect.value);
      updateWidgetSlotEnforcement();
    });
  }

  $('editCallBtn').addEventListener('click', () => {
    showSplash();
  });

  // Auto-refresh toggle in config modal Display tab
  const cfgAutoRefreshCb = $('cfgAutoRefresh');
  if (cfgAutoRefreshCb) {
    cfgAutoRefreshCb.addEventListener('change', () => {
      if (cfgAutoRefreshCb.checked) {
        startAutoRefresh();
      } else {
        stopAutoRefresh();
      }
    });
  }

  // Compact header toggle in Appearance tab
  const cfgSlimHeaderCb = $('cfgSlimHeader');
  if (cfgSlimHeaderCb) {
    cfgSlimHeaderCb.addEventListener('change', () => {
      state.slimHeader = cfgSlimHeaderCb.checked;
      localStorage.setItem('hamtab_slim_header', String(state.slimHeader));
      document.body.classList.toggle('slim-header', state.slimHeader);
    });
  }

  // Grayscale toggle in Appearance tab
  const cfgGrayscaleCb = $('cfgGrayscale');
  if (cfgGrayscaleCb) {
    cfgGrayscaleCb.addEventListener('change', () => {
      state.grayscale = cfgGrayscaleCb.checked;
      localStorage.setItem('hamtab_grayscale', String(state.grayscale));
      document.body.classList.toggle('grayscale', state.grayscale);
    });
  }

  // Band color reset button
  const bandColorResetBtn = document.getElementById('bandColorResetBtn');
  if (bandColorResetBtn) {
    bandColorResetBtn.addEventListener('click', () => {
      saveBandColors({});
      populateBandColorPickers();
    });
  }
}

// --- Band Color Pickers ---

function populateBandColorPickers() {
  const container = document.getElementById('bandColorPickers');
  if (!container) return;
  container.innerHTML = '';

  const bands = Object.keys(DEFAULT_BAND_COLORS);
  bands.forEach(band => {
    const row = document.createElement('div');
    row.className = 'band-color-row';

    const input = document.createElement('input');
    input.type = 'color';
    input.value = getBandColor(band);
    input.dataset.band = band;
    input.addEventListener('input', () => {
      const overrides = getBandColorOverrides();
      if (input.value === DEFAULT_BAND_COLORS[band]) {
        delete overrides[band];
      } else {
        overrides[band] = input.value;
      }
      saveBandColors(overrides);
    });

    const label = document.createElement('label');
    label.textContent = band;

    row.appendChild(input);
    row.appendChild(label);
    container.appendChild(row);
  });
}


// Build a mini CSS Grid preview showing the permutation layout
function renderGridPreview(permId) {
  const container = document.getElementById('gridPermPreview');
  if (!container) return;
  const perm = getGridPermutation(permId);
  container.innerHTML = '';
  container.style.gridTemplateAreas = perm.areas;
  container.style.gridTemplateColumns = perm.columns;
  container.style.gridTemplateRows = perm.rows;

  // Map cell
  const mapCell = document.createElement('div');
  mapCell.className = 'grid-preview-cell grid-preview-map';
  mapCell.style.gridArea = 'map';
  mapCell.textContent = 'MAP';
  container.appendChild(mapCell);

  // Widget cells
  perm.cellNames.forEach(name => {
    const cell = document.createElement('div');
    cell.className = 'grid-preview-cell';
    cell.style.gridArea = name;
    cell.textContent = name;
    container.appendChild(cell);
  });
}
