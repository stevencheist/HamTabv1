import state from './state.js';
import { $ } from './dom.js';
import { WIDGET_DEFS } from './constants.js';
import { esc } from './utils.js';
import { latLonToGrid, gridToLatLon } from './geo.js';
import { centerMapOnUser, updateUserMarker } from './map-init.js';
import { updateClocks } from './clocks.js';
import { renderSpots } from './spots.js';
import { fetchWeather, startNwsPolling } from './weather.js';
import { applyFilter, fetchLicenseClass } from './filters.js';
import { saveWidgetVisibility, applyWidgetVisibility, loadWidgetVisibility, saveUserLayout, clearUserLayout, hasUserLayout } from './widgets.js';

export function updateOperatorDisplay() {
  const opCall = $('opCall');
  const opLoc = $('opLoc');

  if (state.myCallsign) {
    const qrz = `https://www.qrz.com/db/${encodeURIComponent(state.myCallsign)}`;
    let classLabel = state.licenseClass ? ` [${state.licenseClass}]` : '';
    opCall.innerHTML = `<a href="${qrz}" target="_blank" rel="noopener">${esc(state.myCallsign)}</a><span class="op-class">${esc(classLabel)}</span>`;
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

// initApp is passed in to avoid circular dependency
let _initApp = null;
export function setInitApp(fn) { _initApp = fn; }

export function showSplash() {
  const splash = $('splash');
  splash.classList.remove('hidden');
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

  $('timeFmt24').checked = state.use24h;
  $('timeFmt12').checked = !state.use24h;

  const widgetList = document.getElementById('splashWidgetList');
  widgetList.innerHTML = '';
  WIDGET_DEFS.forEach(w => {
    const label = document.createElement('label');
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.dataset.widgetId = w.id;
    cb.checked = state.widgetVisibility[w.id] !== false;
    label.appendChild(cb);
    label.appendChild(document.createTextNode(w.name));
    widgetList.appendChild(label);
  });

  $('splashWxStation').value = state.wxStation;
  $('splashWxApiKey').value = state.wxApiKey;
  $('splashN2yoApiKey').value = state.n2yoApiKey;

  $('splashGridDropdown').classList.remove('open');
  $('splashGridDropdown').innerHTML = '';
  state.gridHighlightIdx = -1;
  $('splashVersion').textContent = __APP_VERSION__;

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

    const widgetList = document.getElementById('splashWidgetList');
    if (widgetList) {
      widgetList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        state.widgetVisibility[cb.dataset.widgetId] = cb.checked;
      });
    }
    saveWidgetVisibility();
    applyWidgetVisibility();

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
}

export function initSplashListeners() {
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

  $('editCallBtn').addEventListener('click', () => {
    showSplash();
  });

  $('refreshLocBtn').addEventListener('click', () => {
    if (state.manualLoc) {
      showSplash();
    } else {
      $('opLoc').textContent = 'Locating...';
      fetchLocation();
    }
  });
}
