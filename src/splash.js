import state from './state.js';
import { $ } from './dom.js';
import { WIDGET_DEFS } from './constants.js';
import { esc } from './utils.js';
import { latLonToGrid, gridToLatLon } from './geo.js';
import { centerMapOnUser, updateUserMarker } from './map-init.js';
import { updateClocks } from './clocks.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';
import { fetchWeather, startNwsPolling } from './weather.js';
import { applyFilter, fetchLicenseClass } from './filters.js';
import { saveWidgetVisibility, applyWidgetVisibility, loadWidgetVisibility, isWidgetVisible, saveUserLayout, clearUserLayout, hasUserLayout, getNamedLayouts, saveNamedLayout, loadNamedLayout, deleteNamedLayout } from './widgets.js';
import { getThemeList, getCurrentThemeId, applyTheme, getThemeSwatchColors, currentThemeSupportsGrid } from './themes.js';
import { GRID_PERMUTATIONS, GRID_DEFAULT_ASSIGNMENTS, DEFAULT_BAND_COLORS, getBandColor, getBandColorOverrides, saveBandColors } from './constants.js';
import { activateGridMode, deactivateGridMode, saveGridAssignments, applyGridAssignments, resetGridAssignments, getGridPermutation } from './grid-layout.js';
import { startAutoRefresh, stopAutoRefresh } from './refresh.js';
import { fetchSatellitePositions } from './satellites.js';
import { startBeaconTimer, stopBeaconTimer } from './beacons.js';
import { updateBeaconMarkers } from './map-init.js';
import { fetchVoacapMatrixThrottled } from './voacap.js';
import { fetchLiveSpots } from './live-spots.js';
import { renderDedxInfo } from './dedx-info.js';
import { fetchSolar } from './solar.js';
import { fetchLunar } from './lunar.js';
import { fetchSpaceWxData } from './spacewx-graphs.js';
import { fetchDxpeditions } from './dxpeditions.js';
import { fetchContests } from './contests.js';
import { startDedxTimer, stopDedxTimer } from './dedx-info.js';
import { exportConfig, importConfig, checkSyncCapability, pushConfig, isSyncEnabled, setSyncEnabled } from './config-sync.js';
import { getAvailableProfiles } from './cat/index.js';
import { initOnAirRig, destroyOnAirRig } from './on-air-rig.js';

// --- Staged grid assignments (working copy during config modal session) ---
let stagedAssignments = {};
let selectedCell = null; // currently selected cell name in preview

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

function setDataStatus(msg, isError) {
  const el = document.getElementById('dataStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.className = 'data-status' + (isError ? ' error' : msg ? ' success' : '');
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

  // Grid mode — enforce slot limit (reduced by active spans)
  const permSelect = document.getElementById('gridPermSelect');
  const permId = permSelect ? permSelect.value : state.gridPermutation;
  const perm = getGridPermutation(permId);
  const spans = state.gridSpans || {};
  const absorbedCount = Object.values(spans).reduce((sum, s) => sum + (s - 1), 0); // each span absorbs (span - 1) cells
  const maxSlots = perm.slots - absorbedCount;

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
    const spanNote = absorbedCount > 0 ? ` (${absorbedCount} spanned)` : '';
    counter.textContent = `${checkedNonMap} / ${maxSlots} slots${spanNote}`;
    counter.classList.remove('over-limit');
  }
}

// initApp is passed in to avoid circular dependency
let _initApp = null;
export function setInitApp(fn) { _initApp = fn; }

function renderSplashLayoutList() {
  const list = document.getElementById('splashLayoutList');
  if (!list) return;
  list.innerHTML = '';

  const layouts = getNamedLayouts();
  const names = Object.keys(layouts);

  if (names.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'splash-layout-empty';
    empty.textContent = 'No saved layouts';
    list.appendChild(empty);
    return;
  }

  names.forEach(name => {
    const row = document.createElement('div');
    row.className = 'splash-layout-item';

    const nameSpan = document.createElement('span');
    nameSpan.className = 'splash-layout-item-name';
    nameSpan.textContent = name;
    nameSpan.addEventListener('click', () => {
      loadNamedLayout(name);
      $('splashLayoutStatus').textContent = `Loaded "${name}"`;
    });
    row.appendChild(nameSpan);

    const delBtn = document.createElement('button');
    delBtn.className = 'splash-layout-item-del';
    delBtn.textContent = '\u00D7';
    delBtn.title = 'Delete';
    delBtn.addEventListener('click', () => {
      if (confirm(`Delete layout "${name}"?`)) {
        deleteNamedLayout(name);
        renderSplashLayoutList();
        $('splashLayoutStatus').textContent = `Deleted "${name}"`;
      }
    });
    row.appendChild(delBtn);

    list.appendChild(row);
  });
}

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
    cb.addEventListener('change', () => {
      updateWidgetSlotEnforcement();
      onWidgetCheckboxChange(cb.dataset.widgetId, cb.checked);
    });
    label.appendChild(cb);
    label.appendChild(document.createTextNode(w.name));
    widgetList.appendChild(label);
  });

  $('splashWxStation').value = state.wxStation;
  $('splashWxApiKey').value = state.wxApiKey;
  $('splashOwmApiKey').value = state.owmApiKey;
  $('splashN2yoApiKey').value = state.n2yoApiKey;
  $('splashHamqthUser').value = state.hamqthUser;
  $('splashHamqthPass').value = state.hamqthPass;

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

  // Disable weather backgrounds toggle
  const cfgDisableWxBg = $('cfgDisableWxBg');
  if (cfgDisableWxBg) cfgDisableWxBg.checked = state.disableWxBackgrounds;

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

    // Set float options from state
    const snapCheck = document.getElementById('snapToGridCheck');
    const overlapCheck = document.getElementById('allowOverlapCheck');
    const floatOpts = document.getElementById('floatOptions');
    if (snapCheck) snapCheck.checked = state.snapToGrid;
    if (overlapCheck) overlapCheck.checked = state.allowOverlap;
    if (floatOpts) floatOpts.style.display = state.gridMode === 'grid' ? 'none' : '';

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

    // Initialize staged assignments from current state or defaults
    const currentPerm = permSelect ? permSelect.value : state.gridPermutation;
    if (state.gridAssignments && Object.keys(state.gridAssignments).length > 0) {
      stagedAssignments = { ...state.gridAssignments };
    } else {
      const defaults = GRID_DEFAULT_ASSIGNMENTS[currentPerm];
      stagedAssignments = defaults ? { ...defaults } : {};
    }
    selectedCell = null;

    // Render preview with assignments
    renderGridPreview(currentPerm, stagedAssignments);
  }

  updateWidgetSlotEnforcement();
  updateWidgetCellBadges(stagedAssignments);

  // --- Layout section state ---
  renderSplashLayoutList();
  $('splashLayoutName').value = '';
  $('splashLayoutStatus').textContent = '';

  // --- Data tab state ---
  const dataExportSection = document.getElementById('dataExportSection');
  const dataImportSection = document.getElementById('dataImportSection');
  const dataStatus = document.getElementById('dataStatus');
  if (dataExportSection) dataExportSection.classList.add('hidden');
  if (dataImportSection) dataImportSection.classList.add('hidden');
  if (dataStatus) { dataStatus.textContent = ''; dataStatus.className = 'data-status'; }

  const dataSyncToggle = document.getElementById('dataSyncToggle');
  if (dataSyncToggle) dataSyncToggle.checked = isSyncEnabled();

  // Show LAN sync section only if server supports it
  const dataSyncSection = document.getElementById('dataSyncSection');
  if (dataSyncSection) {
    dataSyncSection.classList.add('hidden');
    checkSyncCapability().then(capable => {
      if (capable) {
        dataSyncSection.classList.remove('hidden');
        const syncStatus = document.getElementById('dataSyncStatus');
        const lastPush = localStorage.getItem('hamtab_sync_last_push');
        if (syncStatus && lastPush) {
          syncStatus.textContent = 'Last synced: ' + new Date(lastPush).toLocaleString();
        }
      }
    });
  }

  // --- Radio tab state ---
  loadRadioConfig();

  $('splashCallsign').focus();
}

// --- Radio config: load state into form ---
function loadRadioConfig() {
  const connReal = $('radioConnReal');
  const connDemo = $('radioConnDemo');
  if (connReal) connReal.checked = state.radioConnectionType === 'real';
  if (connDemo) connDemo.checked = state.radioConnectionType !== 'real';

  // Protocol family
  const protocolFamily = $('radioProtocolFamily');
  if (protocolFamily) protocolFamily.value = state.radioProtocolFamily;

  // Populate model preset dropdown filtered by protocol family
  populateModelPresets();

  // Port mode
  const portMode = $('radioPortMode');
  if (portMode) portMode.value = state.radioPortMode;

  // Serial settings
  const baudRate = $('radioBaudRate');
  const dataBits = $('radioDataBits');
  const stopBits = $('radioStopBits');
  const parity = $('radioParity');
  const flowControl = $('radioFlowControl');
  if (baudRate) baudRate.value = state.radioBaudRate;
  if (dataBits) dataBits.value = String(state.radioDataBits);
  if (stopBits) stopBits.value = String(state.radioStopBits);
  if (parity) parity.value = state.radioParity;
  if (flowControl) flowControl.value = state.radioFlowControl;

  // Control
  const pttMethod = $('radioPttMethod');
  const pollingInterval = $('radioPollingInterval');
  const civAddress = $('radioCivAddress');
  if (pttMethod) pttMethod.value = state.radioPttMethod;
  if (pollingInterval) pollingInterval.value = state.radioPollingInterval;
  if (civAddress) civAddress.value = state.radioCivAddress;

  // Safety checkboxes
  const txIntent = $('radioSafetyTxIntent');
  const bandLockout = $('radioSafetyBandLockout');
  const autoPower = $('radioSafetyAutoPower');
  if (txIntent) txIntent.checked = state.radioSafetyTxIntent;
  if (bandLockout) bandLockout.checked = state.radioSafetyBandLockout;
  if (autoPower) autoPower.checked = state.radioSafetyAutoPower;

  const swrLimit = $('radioSwrLimit');
  const safePower = $('radioSafePower');
  if (swrLimit) swrLimit.value = state.radioSwrLimit;
  if (safePower) safePower.value = state.radioSafePower;

  // Demo propagation
  const propOff = $('radioPropOff');
  const propBasic = $('radioPropBasic');
  const propLocation = $('radioPropLocation');
  if (propOff) propOff.checked = state.radioDemoPropagation === 'off';
  if (propBasic) propBasic.checked = state.radioDemoPropagation === 'basic';
  if (propLocation) propLocation.checked = state.radioDemoPropagation === 'location';

  // Show/hide sections based on connection type
  updateRadioSections();
}

// --- Populate model preset dropdown filtered by selected protocol family ---
function populateModelPresets() {
  const presetSelect = $('radioModelPreset');
  if (!presetSelect) return;

  const familySelect = $('radioProtocolFamily');
  const selectedFamily = familySelect ? familySelect.value : 'auto';

  // Clear existing options except the first "(None)" option
  while (presetSelect.options.length > 1) presetSelect.remove(1);

  const profs = getAvailableProfiles();
  for (const p of profs) {
    if (p.id === 'demo') continue; // Skip demo profile
    // Filter by protocol family (show all when 'auto')
    if (selectedFamily !== 'auto' && p.protocol !== selectedFamily) continue;
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.manufacturer} ${p.model}`;
    presetSelect.appendChild(opt);
  }

  // Restore saved model preset
  const saved = state.radioModelPreset;
  if (saved && presetSelect.querySelector(`option[value="${saved}"]`)) {
    presetSelect.value = saved;
  }
}

// --- Auto-fill serial settings from a model preset ---
function applyModelPresetDefaults() {
  const presetSelect = $('radioModelPreset');
  if (!presetSelect || !presetSelect.value) return;

  const profs = getAvailableProfiles();
  const profile = profs.find(p => p.id === presetSelect.value);
  if (!profile || !profile.serial) return;

  // Fill serial settings from profile
  const baudRate = $('radioBaudRate');
  const dataBits = $('radioDataBits');
  const stopBits = $('radioStopBits');
  const parity = $('radioParity');
  const flowControl = $('radioFlowControl');

  if (baudRate) baudRate.value = String(profile.serial.baudRate);
  if (dataBits) dataBits.value = String(profile.serial.dataBits);
  if (stopBits) stopBits.value = String(profile.serial.stopBits);
  if (parity) parity.value = profile.serial.parity;
  if (flowControl) flowControl.value = profile.serial.flowControl;

  // Fill control settings
  const pttMethod = $('radioPttMethod');
  const pollingInterval = $('radioPollingInterval');
  if (pttMethod && profile.control) pttMethod.value = profile.control.pttMethod;
  if (pollingInterval && profile.control) pollingInterval.value = profile.control.pollingInterval;

  // Fill CI-V address if Icom
  if (profile.civAddress) {
    const civAddress = $('radioCivAddress');
    if (civAddress) civAddress.value = profile.civAddress;
  }

  // Also set protocol family to match
  const familySelect = $('radioProtocolFamily');
  if (familySelect && profile.protocol) {
    familySelect.value = profile.protocol;
  }
}

// --- Refresh authorized port list ---
async function refreshPortList() {
  const portList = $('radioPortList');
  if (!portList) return;

  // Clear existing options
  portList.innerHTML = '';

  if (!navigator.serial || !navigator.serial.getPorts) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'WebSerial not supported';
    portList.appendChild(opt);
    return;
  }

  try {
    const ports = await navigator.serial.getPorts();
    if (ports.length === 0) {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'No authorized ports';
      portList.appendChild(opt);
      return;
    }

    ports.forEach((port, i) => {
      const info = port.getInfo();
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = info.usbVendorId
        ? `USB ${info.usbVendorId.toString(16).toUpperCase()}:${info.usbProductId.toString(16).toUpperCase()}`
        : `Port ${i + 1}`;
      portList.appendChild(opt);
    });
  } catch {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'Error reading ports';
    portList.appendChild(opt);
  }
}

// --- Toggle radio config sections based on real/demo ---
function updateRadioSections() {
  const isReal = $('radioConnReal') && $('radioConnReal').checked;
  const protocolSection = document.getElementById('radioProtocolSection');
  const portSection = document.getElementById('radioPortSection');
  const serialSection = document.getElementById('radioSerialSection');
  const controlSection = document.getElementById('radioControlSection');
  const safetySection = document.getElementById('radioSafetySection');
  const demoSection = document.getElementById('radioDemoSection');

  // Real radio: show protocol, port, serial, control, safety; hide demo
  // Demo: hide all real sections; show demo
  if (protocolSection) protocolSection.style.display = isReal ? '' : 'none';
  if (portSection) portSection.style.display = isReal ? '' : 'none';
  if (serialSection) serialSection.style.display = isReal ? '' : 'none';
  if (controlSection) controlSection.style.display = isReal ? '' : 'none';
  if (safetySection) safetySection.style.display = isReal ? '' : 'none';
  if (demoSection) demoSection.style.display = isReal ? 'none' : '';

  // Port list row: only show when port mode is 'manual'
  updatePortListVisibility();

  // CI-V row: only show for Icom protocol family
  updateCivRowVisibility();
}

// --- Show port list row only when port mode is 'manual' ---
function updatePortListVisibility() {
  const portListRow = document.getElementById('radioPortListRow');
  const portMode = $('radioPortMode');
  if (!portListRow) return;

  const isManual = portMode && portMode.value === 'manual';
  portListRow.style.display = isManual ? '' : 'none';

  // Auto-populate port list when switching to manual
  if (isManual) refreshPortList();
}

// --- Show CI-V row only when Icom CI-V protocol is selected ---
function updateCivRowVisibility() {
  const civRow = document.getElementById('radioCivRow');
  const familySelect = $('radioProtocolFamily');
  if (!civRow) return;

  const val = familySelect ? familySelect.value : 'auto';
  // Show for Icom CI-V or auto-detect (might be Icom)
  const isIcom = val === 'auto' || val === 'icom_civ';
  civRow.style.display = isIcom ? '' : 'none';
}

// --- Save radio config from form to state + localStorage ---
function saveRadioConfig() {
  // Connection type
  state.radioConnectionType = $('radioConnReal') && $('radioConnReal').checked ? 'real' : 'demo';
  localStorage.setItem('hamtab_radio_conn_type', state.radioConnectionType);

  // Protocol + model preset
  state.radioProtocolFamily = $('radioProtocolFamily')?.value || 'auto';
  state.radioModelPreset = $('radioModelPreset')?.value || '';
  localStorage.setItem('hamtab_radio_protocol', state.radioProtocolFamily);
  localStorage.setItem('hamtab_radio_model_preset', state.radioModelPreset);

  // Port mode
  state.radioPortMode = $('radioPortMode')?.value || 'auto';
  localStorage.setItem('hamtab_radio_port_mode', state.radioPortMode);

  // Serial settings
  state.radioBaudRate = $('radioBaudRate')?.value || 'auto';
  state.radioDataBits = parseInt($('radioDataBits')?.value, 10) || 8;
  state.radioStopBits = parseInt($('radioStopBits')?.value, 10) || 1;
  state.radioParity = $('radioParity')?.value || 'none';
  state.radioFlowControl = $('radioFlowControl')?.value || 'none';
  localStorage.setItem('hamtab_radio_baud', state.radioBaudRate);
  localStorage.setItem('hamtab_radio_data_bits', String(state.radioDataBits));
  localStorage.setItem('hamtab_radio_stop_bits', String(state.radioStopBits));
  localStorage.setItem('hamtab_radio_parity', state.radioParity);
  localStorage.setItem('hamtab_radio_flow_control', state.radioFlowControl);

  // Control
  state.radioPttMethod = $('radioPttMethod')?.value || 'cat';
  state.radioPollingInterval = parseInt($('radioPollingInterval')?.value, 10) || 500;
  state.radioCivAddress = ($('radioCivAddress')?.value || '0x94').trim();
  localStorage.setItem('hamtab_radio_ptt_method', state.radioPttMethod);
  localStorage.setItem('hamtab_radio_polling_interval', String(state.radioPollingInterval));
  localStorage.setItem('hamtab_radio_civ_address', state.radioCivAddress);

  // Safety
  state.radioSafetyTxIntent = $('radioSafetyTxIntent') ? $('radioSafetyTxIntent').checked : true;
  state.radioSafetyBandLockout = $('radioSafetyBandLockout') ? $('radioSafetyBandLockout').checked : true;
  state.radioSafetyAutoPower = $('radioSafetyAutoPower') ? $('radioSafetyAutoPower').checked : true;
  localStorage.setItem('hamtab_radio_safety_tx_intent', String(state.radioSafetyTxIntent));
  localStorage.setItem('hamtab_radio_safety_band_lockout', String(state.radioSafetyBandLockout));
  localStorage.setItem('hamtab_radio_safety_auto_power', String(state.radioSafetyAutoPower));

  state.radioSwrLimit = parseFloat($('radioSwrLimit')?.value) || 3.0;
  state.radioSafePower = parseInt($('radioSafePower')?.value, 10) || 20;
  localStorage.setItem('hamtab_radio_swr_limit', String(state.radioSwrLimit));
  localStorage.setItem('hamtab_radio_safe_power', String(state.radioSafePower));

  // Demo propagation
  if ($('radioPropBasic')?.checked) state.radioDemoPropagation = 'basic';
  else if ($('radioPropLocation')?.checked) state.radioDemoPropagation = 'location';
  else state.radioDemoPropagation = 'off';
  localStorage.setItem('hamtab_radio_demo_propagation', state.radioDemoPropagation);
}

function dismissSplash() {
  const val = $('splashCallsign').value.trim().toUpperCase();
  if (!val) return;
  state.myCallsign = val;
  localStorage.setItem('hamtab_callsign', state.myCallsign);

  if (state.manualLoc && state.myLat !== null && state.myLon !== null) {
    localStorage.setItem('hamtab_lat', String(state.myLat));
    localStorage.setItem('hamtab_lon', String(state.myLon));
  }

  state.use24h = $('timeFmt24').checked;
  localStorage.setItem('hamtab_time24', String(state.use24h));

  // Save unit preferences
  state.distanceUnit = $('distUnitKm').checked ? 'km' : 'mi';
  state.temperatureUnit = $('tempUnitC').checked ? 'C' : 'F';
  localStorage.setItem('hamtab_distance_unit', state.distanceUnit);
  localStorage.setItem('hamtab_temperature_unit', state.temperatureUnit);

  // Save radio config
  saveRadioConfig();

  state.wxStation = ($('splashWxStation').value || '').trim().toUpperCase();
  state.wxApiKey = ($('splashWxApiKey').value || '').trim();
  state.owmApiKey = ($('splashOwmApiKey').value || '').trim();
  state.n2yoApiKey = ($('splashN2yoApiKey').value || '').trim();
  state.hamqthUser = ($('splashHamqthUser').value || '').trim();
  state.hamqthPass = ($('splashHamqthPass').value || '').trim();
  localStorage.setItem('hamtab_wx_station', state.wxStation);
  localStorage.setItem('hamtab_wx_apikey', state.wxApiKey);
  localStorage.setItem('hamtab_owm_apikey', state.owmApiKey);
  localStorage.setItem('hamtab_n2yo_apikey', state.n2yoApiKey);
  localStorage.setItem('hamtab_hamqth_user', state.hamqthUser);
  localStorage.setItem('hamtab_hamqth_pass', state.hamqthPass);

  // Persist API keys to server .env so all clients share them
  const envUpdates = {};
  if (state.wxApiKey) envUpdates.WU_API_KEY = state.wxApiKey;
  if (state.owmApiKey) envUpdates.OWM_API_KEY = state.owmApiKey;
  if (state.n2yoApiKey) envUpdates.N2YO_API_KEY = state.n2yoApiKey;
  if (state.hamqthUser) envUpdates.HAMQTH_USER = state.hamqthUser;
  if (state.hamqthPass) envUpdates.HAMQTH_PASS = state.hamqthPass;
  if (Object.keys(envUpdates).length > 0) {
    fetch('/api/config/env', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envUpdates),
    }).catch(() => {});
  }

  fetchWeather();

  // Capture old visibility before applying changes (for refresh-on-show hook)
  const oldVis = { ...state.widgetVisibility };

  const widgetList = document.getElementById('splashWidgetList');
  widgetList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    state.widgetVisibility[cb.dataset.widgetId] = cb.checked;
  });
  saveWidgetVisibility();

  // --- Grid mode changes ---
  if (currentThemeSupportsGrid()) {
    const newMode = $('layoutModeGrid').checked ? 'grid' : 'float';
    const permSelect = document.getElementById('gridPermSelect');
    const newPerm = permSelect ? permSelect.value : state.gridPermutation;
    const oldPerm = state.gridPermutation;

    if (newMode === 'grid') {
      state.gridPermutation = newPerm;
      state.gridAssignments = { ...stagedAssignments };
      saveGridAssignments();
      if (state.gridMode !== 'grid' || newPerm !== oldPerm) {
        activateGridMode(newPerm);
      } else {
        applyGridAssignments(); // refresh layout with new assignments
      }
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

  // On-Air Rig — init/destroy: stops all CAT polling, safety, propagation when hidden
  if (justShown('widget-on-air-rig'))  { initOnAirRig(); }
  if (justHidden('widget-on-air-rig')) { destroyOnAirRig(); }

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

  // Push config to LAN sync server (async, non-blocking)
  if (isSyncEnabled() && state.myCallsign) {
    pushConfig(state.myCallsign).catch(() => {});
  }
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

  // --- Use Callsign location button ---
  $('splashCallsignLocBtn').addEventListener('click', async () => {
    const call = $('splashCallsign').value.trim().toUpperCase();
    if (!call) {
      updateLocStatus('Enter a callsign first', true);
      return;
    }

    const btn = $('splashCallsignLocBtn');
    btn.disabled = true;
    updateLocStatus('Looking up ' + call + '...');

    try {
      const resp = await fetch('/api/callsign/' + encodeURIComponent(call));
      const data = await resp.json();

      if (data.status === 'VALID' && data.lat != null && data.lon != null) {
        state.syncingFields = true;
        $('splashLat').value = data.lat.toFixed(2);
        $('splashLon').value = data.lon.toFixed(2);
        if (data.grid) {
          $('splashGrid').value = data.grid.substring(0, 4).toUpperCase();
        } else {
          $('splashGrid').value = latLonToGrid(data.lat, data.lon).substring(0, 4).toUpperCase();
        }
        state.myLat = data.lat;
        state.myLon = data.lon;
        state.syncingFields = false;
        state.manualLoc = true;
        $('splashGpsBtn').classList.remove('active');
        updateLocStatus('Location set from callsign');
      } else {
        updateLocStatus('No location found for ' + call, true);
      }
    } catch {
      updateLocStatus('Lookup failed — try again', true);
    } finally {
      btn.disabled = false;
    }
  });

  // --- Layout save / clear buttons ---
  $('splashSaveLayout').addEventListener('click', () => {
    const name = $('splashLayoutName').value.trim();
    if (!name) {
      $('splashLayoutStatus').textContent = 'Enter a layout name';
      return;
    }
    const ok = saveNamedLayout(name);
    if (!ok) {
      $('splashLayoutStatus').textContent = 'Max 20 layouts. Delete one first.';
      return;
    }
    $('splashLayoutName').value = '';
    $('splashLayoutStatus').textContent = `Saved "${name}"`;
    renderSplashLayoutList();
  });

  $('splashLayoutName').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('splashSaveLayout').click();
  });

  $('splashClearLayout').addEventListener('click', () => {
    clearUserLayout();
    $('splashLayoutStatus').textContent = 'Reset to app default';
  });

  // --- Grid mode listeners ---
  const layoutModeFloat = document.getElementById('layoutModeFloat');
  const layoutModeGrid = document.getElementById('layoutModeGrid');
  const gridPermSelect = document.getElementById('gridPermSelect');
  const gridPermSection = document.getElementById('gridPermSection');

  const floatOptions = document.getElementById('floatOptions');

  if (layoutModeFloat && layoutModeGrid) {
    layoutModeFloat.addEventListener('change', () => {
      if (gridPermSection) gridPermSection.style.display = 'none';
      if (floatOptions) floatOptions.style.display = '';
      updateWidgetCellBadges(stagedAssignments); // hides badges in float mode
      updateWidgetSlotEnforcement();
    });
    layoutModeGrid.addEventListener('change', () => {
      if (gridPermSection) gridPermSection.style.display = '';
      if (floatOptions) floatOptions.style.display = 'none';
      if (gridPermSelect) {
        // Initialize staged assignments if switching to grid
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

  // --- Free-float snap/overlap toggles ---
  const snapToGridCheck = document.getElementById('snapToGridCheck');
  const allowOverlapCheck = document.getElementById('allowOverlapCheck');
  if (snapToGridCheck) {
    snapToGridCheck.addEventListener('change', () => {
      state.snapToGrid = snapToGridCheck.checked;
      localStorage.setItem('hamtab_snap_grid', state.snapToGrid);
    });
  }
  if (allowOverlapCheck) {
    allowOverlapCheck.addEventListener('change', () => {
      state.allowOverlap = allowOverlapCheck.checked;
      localStorage.setItem('hamtab_allow_overlap', state.allowOverlap);
    });
  }
  if (gridPermSelect) {
    gridPermSelect.addEventListener('change', () => {
      const newPermId = gridPermSelect.value;
      const defaults = GRID_DEFAULT_ASSIGNMENTS[newPermId];
      stagedAssignments = defaults ? { ...defaults } : {};
      selectedCell = null;
      renderGridPreview(newPermId, stagedAssignments);
      updateWidgetCellBadges(stagedAssignments);
      updateWidgetSlotEnforcement();
    });
  }

  // Reset Grid button — clears assignments, spans, and track sizes
  const resetGridBtn = document.getElementById('resetGridBtn');
  if (resetGridBtn) {
    resetGridBtn.addEventListener('click', () => {
      resetGridAssignments();
      const defaults = GRID_DEFAULT_ASSIGNMENTS[state.gridPermutation];
      stagedAssignments = defaults ? { ...defaults } : {};
      selectedCell = null;
      renderGridPreview(state.gridPermutation, stagedAssignments);
      updateWidgetCellBadges(stagedAssignments);
      updateWidgetSlotEnforcement();
    });
  }

  // --- Data tab listeners ---
  const dataExportBtn = document.getElementById('dataExportBtn');
  const dataImportToggle = document.getElementById('dataImportToggle');
  const dataExportCopy = document.getElementById('dataExportCopy');
  const dataImportApply = document.getElementById('dataImportApply');
  const dataSyncToggleCb = document.getElementById('dataSyncToggle');

  if (dataExportBtn) {
    dataExportBtn.addEventListener('click', () => {
      const code = exportConfig();
      const section = document.getElementById('dataExportSection');
      const textarea = document.getElementById('dataExportCode');
      const importSec = document.getElementById('dataImportSection');
      if (importSec) importSec.classList.add('hidden');
      if (section && textarea) {
        textarea.value = code;
        section.classList.remove('hidden');
        textarea.select();
      }
      setDataStatus('Config exported', false);
    });
  }

  if (dataImportToggle) {
    dataImportToggle.addEventListener('click', () => {
      const section = document.getElementById('dataImportSection');
      const exportSec = document.getElementById('dataExportSection');
      if (exportSec) exportSec.classList.add('hidden');
      if (section) {
        section.classList.toggle('hidden');
        if (!section.classList.contains('hidden')) {
          const ta = document.getElementById('dataImportCode');
          if (ta) { ta.value = ''; ta.focus(); }
        }
      }
      setDataStatus('', false);
    });
  }

  if (dataExportCopy) {
    dataExportCopy.addEventListener('click', () => {
      const textarea = document.getElementById('dataExportCode');
      if (textarea && textarea.value) {
        navigator.clipboard.writeText(textarea.value).then(() => {
          setDataStatus('Copied to clipboard', false);
        }).catch(() => {
          textarea.select();
          setDataStatus('Select and copy manually', true);
        });
      }
    });
  }

  if (dataImportApply) {
    dataImportApply.addEventListener('click', () => {
      const textarea = document.getElementById('dataImportCode');
      if (!textarea || !textarea.value.trim()) {
        setDataStatus('Paste a config code first', true);
        return;
      }
      if (!confirm('This will replace all your settings including your callsign. Continue?')) return;
      const result = importConfig(textarea.value);
      if (result.ok) {
        setDataStatus(`Imported config from ${result.callsign || 'unknown'} — reloading...`, false);
        setTimeout(() => window.location.reload(), 500);
      } else {
        setDataStatus(result.error, true);
      }
    });
  }

  if (dataSyncToggleCb) {
    dataSyncToggleCb.addEventListener('change', () => {
      setSyncEnabled(dataSyncToggleCb.checked);
      if (dataSyncToggleCb.checked && state.myCallsign) {
        pushConfig(state.myCallsign).then(ok => {
          const el = document.getElementById('dataSyncStatus');
          if (el) el.textContent = ok ? 'Synced now' : 'Sync failed — will retry on next save';
        });
      }
    });
  }

  // --- Radio tab listeners ---
  const radioConnReal = $('radioConnReal');
  const radioConnDemo = $('radioConnDemo');
  if (radioConnReal) radioConnReal.addEventListener('change', updateRadioSections);
  if (radioConnDemo) radioConnDemo.addEventListener('change', updateRadioSections);

  // Protocol family → filter model presets + update CI-V visibility
  const radioProtocolFamily = $('radioProtocolFamily');
  if (radioProtocolFamily) {
    radioProtocolFamily.addEventListener('change', () => {
      populateModelPresets();
      updateCivRowVisibility();
    });
  }

  // Model preset → auto-fill serial/control settings from profile
  const radioModelPreset = $('radioModelPreset');
  if (radioModelPreset) {
    radioModelPreset.addEventListener('change', applyModelPresetDefaults);
  }

  // Port mode → show/hide authorized port list
  const radioPortMode = $('radioPortMode');
  if (radioPortMode) {
    radioPortMode.addEventListener('change', updatePortListVisibility);
  }

  // Refresh ports button
  const radioRefreshPorts = $('radioRefreshPorts');
  if (radioRefreshPorts) {
    radioRefreshPorts.addEventListener('click', refreshPortList);
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

  // Disable weather backgrounds toggle in Appearance tab
  const cfgDisableWxBgCb = $('cfgDisableWxBg');
  if (cfgDisableWxBgCb) {
    cfgDisableWxBgCb.addEventListener('change', () => {
      state.disableWxBackgrounds = cfgDisableWxBgCb.checked;
      localStorage.setItem('hamtab_disable_wx_bg', String(state.disableWxBackgrounds));
      // Immediately strip or re-apply weather background classes
      const hcl = document.getElementById('headerClockLocal');
      if (hcl) {
        const wxClasses = ['wx-clear-day','wx-clear-night','wx-partly-cloudy-day','wx-partly-cloudy-night','wx-cloudy','wx-rain','wx-thunderstorm','wx-snow','wx-fog'];
        if (state.disableWxBackgrounds) {
          wxClasses.forEach(c => hcl.classList.remove(c));
        }
        // If re-enabling, next weather fetch will re-apply the class
      }
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


// Build a mini CSS Grid preview showing the permutation layout with widget assignments
function renderGridPreview(permId, assignments) {
  const container = document.getElementById('gridPermPreview');
  if (!container) return;
  const perm = getGridPermutation(permId);
  container.innerHTML = '';

  // Close any open picker
  const picker = document.getElementById('gridAssignPicker');
  if (picker) { picker.innerHTML = ''; picker.classList.remove('open'); }

  const asgn = assignments || stagedAssignments || {};

  // Build reverse map: widgetId → short abbreviation
  const widgetShortMap = {};
  WIDGET_DEFS.forEach(w => { widgetShortMap[w.id] = w.short || w.name.substring(0, 4); });

  // Build areas string with spans applied — replace absorbed cell names
  // with the spanning cell's name so CSS grid merges them visually
  const spans = (permId === state.gridPermutation) ? (state.gridSpans || {}) : {};
  let areas = perm.areas;
  const allWrappers = [perm.left, perm.right, perm.top, perm.bottom];
  const absorbed = new Set();
  for (const wrapperCells of allWrappers) {
    for (let i = 0; i < wrapperCells.length; i++) {
      const span = spans[wrapperCells[i]] || 1;
      for (let s = 1; s < span && i + s < wrapperCells.length; s++) {
        const absCell = wrapperCells[i + s];
        areas = areas.replace(new RegExp('\\b' + absCell + '\\b', 'g'), wrapperCells[i]);
        absorbed.add(absCell);
      }
    }
  }

  container.style.gridTemplateAreas = areas;
  container.style.gridTemplateColumns = perm.columns;
  container.style.gridTemplateRows = perm.rows;

  // Map cell (not assignable)
  const mapCell = document.createElement('div');
  mapCell.className = 'grid-preview-cell grid-preview-map';
  mapCell.style.gridArea = 'map';
  mapCell.textContent = 'MAP';
  container.appendChild(mapCell);

  // Widget cells — skip absorbed cells
  perm.cellNames.forEach(name => {
    if (absorbed.has(name)) return;
    const cell = document.createElement('div');
    const span = spans[name] || 1;
    const isSpanned = span > 1;
    cell.className = 'grid-preview-cell grid-preview-assignable'
      + (isSpanned ? ' grid-preview-spanned' : '')
      + (selectedCell === name ? ' grid-preview-selected' : '');
    cell.style.gridArea = name;

    // Cell name label (dim, small)
    const nameEl = document.createElement('span');
    nameEl.className = 'cell-name';
    nameEl.textContent = isSpanned ? `${name} (+${span - 1})` : name;
    cell.appendChild(nameEl);

    // Widget abbreviation (bold)
    const widgetEl = document.createElement('span');
    widgetEl.className = 'cell-widget';
    const widgetId = asgn[name];
    widgetEl.textContent = widgetId ? (widgetShortMap[widgetId] || '\u2014') : '\u2014';
    cell.appendChild(widgetEl);

    // Click handler to select cell and open picker
    cell.addEventListener('click', () => {
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

// Render the widget picker below the preview for a selected cell
function renderAssignmentPicker(cellName, assignments, permId) {
  const picker = document.getElementById('gridAssignPicker');
  if (!picker) return;
  picker.innerHTML = '';

  const asgn = assignments || stagedAssignments;
  const currentWidgetId = asgn[cellName] || null;

  // Build list of enabled non-map widgets
  const widgetList = document.getElementById('splashWidgetList');
  const enabledWidgets = [];
  if (widgetList) {
    widgetList.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.dataset.widgetId !== 'widget-map' && cb.checked) {
        const def = WIDGET_DEFS.find(w => w.id === cb.dataset.widgetId);
        if (def) enabledWidgets.push(def);
      }
    });
  }

  // Build reverse map: widgetId → cellName for hint display
  const reverseMap = {};
  for (const [cell, wid] of Object.entries(asgn)) {
    if (wid) reverseMap[wid] = cell;
  }

  // "(Empty)" option
  const emptyOpt = document.createElement('div');
  emptyOpt.className = 'assign-option' + (!currentWidgetId ? ' assign-current' : '');
  emptyOpt.textContent = '(Empty)';
  emptyOpt.addEventListener('click', () => {
    delete asgn[cellName];
    selectedCell = null;
    renderGridPreview(permId, asgn);
    updateWidgetCellBadges(asgn);
    picker.innerHTML = '';
    picker.classList.remove('open');
  });
  picker.appendChild(emptyOpt);

  // Widget options
  enabledWidgets.forEach(w => {
    const opt = document.createElement('div');
    opt.className = 'assign-option' + (currentWidgetId === w.id ? ' assign-current' : '');

    const nameSpan = document.createElement('span');
    nameSpan.textContent = w.name;
    opt.appendChild(nameSpan);

    // Show current cell hint if assigned elsewhere
    if (reverseMap[w.id] && reverseMap[w.id] !== cellName) {
      const hint = document.createElement('span');
      hint.className = 'assign-hint';
      hint.textContent = reverseMap[w.id];
      opt.appendChild(hint);
    }

    opt.addEventListener('click', () => {
      // Swap logic: if target widget is assigned elsewhere, its old cell gets whatever was here
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
      picker.innerHTML = '';
      picker.classList.remove('open');
    });

    picker.appendChild(opt);
  });

  picker.classList.add('open');
}

// Update cell badges next to widget checkboxes
function updateWidgetCellBadges(assignments) {
  const widgetList = document.getElementById('splashWidgetList');
  if (!widgetList) return;

  const floatRadio = document.getElementById('layoutModeFloat');
  const isGrid = floatRadio ? !floatRadio.checked : false;

  // Remove existing badges
  widgetList.querySelectorAll('.widget-cell-badge').forEach(b => b.remove());

  if (!isGrid) return;

  // Build reverse map: widgetId → cellName
  const asgn = assignments || stagedAssignments || {};
  const reverseMap = {};
  for (const [cell, wid] of Object.entries(asgn)) {
    if (wid) reverseMap[wid] = cell;
  }

  widgetList.querySelectorAll('label').forEach(label => {
    const cb = label.querySelector('input[type="checkbox"]');
    if (!cb || cb.dataset.widgetId === 'widget-map') return;
    const cell = reverseMap[cb.dataset.widgetId];
    if (cell) {
      const badge = document.createElement('span');
      badge.className = 'widget-cell-badge';
      badge.textContent = `[${cell}]`;
      label.appendChild(badge);
    }
  });
}

// Handle widget checkbox change — auto-assign/unassign in staged assignments
function onWidgetCheckboxChange(widgetId, checked) {
  const floatRadio = document.getElementById('layoutModeFloat');
  const isGrid = floatRadio ? !floatRadio.checked : false;
  if (!isGrid || widgetId === 'widget-map') return;

  const permSelect = document.getElementById('gridPermSelect');
  const permId = permSelect ? permSelect.value : state.gridPermutation;
  const perm = getGridPermutation(permId);

  if (!checked) {
    // Remove from staged assignments, free its cell
    for (const [cell, wid] of Object.entries(stagedAssignments)) {
      if (wid === widgetId) {
        delete stagedAssignments[cell];
        break;
      }
    }
  } else {
    // Auto-assign to first empty cell
    const spans = (permId === state.gridPermutation) ? (state.gridSpans || {}) : {};
    const allWrappers = [perm.left, perm.right, perm.top, perm.bottom];
    const absorbed = new Set();
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
