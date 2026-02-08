import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS, US_PRIVILEGES } from './constants.js';
import { cacheCallsign } from './utils.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';
import { distanceMi } from './geo.js';
import { calculateBandReliability, calculateMUF, dayFraction, HF_BANDS } from './band-conditions.js';

export function freqToBand(freqStr) {
  let freq = parseFloat(freqStr);
  if (isNaN(freq)) return null;
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

export function isUSCallsign(call) {
  if (!call) return false;
  return /^[AKNW][A-Z]?\d/.test(call.toUpperCase());
}

export function normalizeMode(mode) {
  if (!mode) return 'phone';
  const m = mode.toUpperCase();
  if (m === 'CW') return 'cw';
  if (m === 'SSB' || m === 'FM' || m === 'AM' || m === 'LSB' || m === 'USB') return 'phone';
  return 'digital';
}

export function filterByPrivileges(spot) {
  if (!state.licenseClass) return true;
  const privs = US_PRIVILEGES[state.licenseClass.toUpperCase()];
  if (!privs) return true;

  let freq = parseFloat(spot.frequency);
  if (isNaN(freq)) return true;
  if (freq > 1000) freq = freq / 1000;

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

// Distance filter — spots without coords pass through (include them)
export function filterByDistance(spot) {
  if (state.activeMaxDistance === null) return true;
  if (state.myLat === null || state.myLon === null) return true;
  if (spot.latitude == null || spot.longitude == null) return true;

  const dist = distanceMi(state.myLat, state.myLon, spot.latitude, spot.longitude);
  // Convert threshold if user selected km
  const thresholdMi = state.distanceUnit === 'km'
    ? state.activeMaxDistance * 0.621371
    : state.activeMaxDistance;
  return dist <= thresholdMi;
}

// Age filter — spots without spotTime pass through
export function filterByAge(spot) {
  if (state.activeMaxAge === null) return true;
  if (!spot.spotTime) return true;
  const ageMs = Date.now() - new Date(spot.spotTime).getTime();
  const ageMin = ageMs / 60000; // ms to minutes
  return ageMin <= state.activeMaxAge;
}

// Propagation filter — hide spots on bands with predicted reliability < 30%
export function filterByPropagation(spot) {
  if (!state.propagationFilterEnabled) return true;
  if (!state.lastSolarData?.indices) return true; // no solar data yet — pass through

  const band = freqToBand(spot.frequency);
  if (!band) return true; // unknown band — pass through

  const bandDef = HF_BANDS.find(b => b.name === band);
  if (!bandDef) return true; // VHF/UHF — pass through (no HF prop model)

  const { indices } = state.lastSolarData;
  const sfi = parseFloat(indices.sfi) || 70;
  const kIndex = parseInt(indices.kindex) || 2;
  const aIndex = parseInt(indices.aindex) || 5;

  const utcHour = new Date().getUTCHours();
  const dayFrac = dayFraction(state.myLat, state.myLon, utcHour);
  const muf = calculateMUF(sfi, dayFrac);
  const isDay = dayFrac > 0.5;

  const rel = calculateBandReliability(bandDef.freqMHz, muf, kIndex, aIndex, isDay);
  return rel >= 30; // Fair or better
}

function getCountryPrefix(ref) {
  if (!ref) return '';
  return ref.split('-')[0];
}

function getUSState(locationDesc) {
  if (!locationDesc) return '';
  if (locationDesc.startsWith('US-')) return locationDesc.substring(3);
  return '';
}

// --- Watch List Helpers ---

// Strip portable suffix (/P, /M, /QRP, etc.) for callsign matching
function normalizeCallsign(raw) {
  const call = (raw || '').toUpperCase().trim();
  const slash = call.lastIndexOf('/');
  return slash > 0 ? call.substring(0, slash) : call;
}

// Pure matcher — returns true if the spot satisfies the rule
function matchWatchRule(rule, spot) {
  const val = (rule.value || '').toUpperCase();
  if (!val) return false;

  switch (rule.type) {
    case 'callsign': {
      const spotCall = normalizeCallsign(spot.activator || spot.callsign);
      return spotCall === val;
    }
    case 'dxcc': {
      // DXC: country name in spot.name; POTA/SOTA: prefix of locationDesc (e.g. "US-TX" → "US")
      const country = (spot.name || '').toUpperCase();
      const locPrefix = (spot.locationDesc || '').split('-')[0].toUpperCase();
      return country.includes(val) || locPrefix === val;
    }
    case 'grid': {
      // Prefix match — rule "FN" matches "FN31", "FN42ab", etc.
      const grid = (spot.grid4 || spot.senderLocator || '').toUpperCase();
      return grid.startsWith(val);
    }
    case 'ref': {
      // Exact case-insensitive match on park/summit reference
      const ref = (spot.reference || '').toUpperCase();
      return ref === val;
    }
    default:
      return false;
  }
}

export function saveWatchLists() {
  localStorage.setItem('hamtab_watchlists', JSON.stringify(state.watchLists));
}

export function applyFilter() {
  state.watchRedSpotIds = new Set();
  const allowed = SOURCE_DEFS[state.currentSource].filters;
  // Pre-split watch rules by mode to avoid per-spot array allocations
  const wlRules = state.watchLists[state.currentSource] || [];
  const onlyRules = wlRules.filter(r => r.mode === 'only');
  const notRules = wlRules.filter(r => r.mode === 'not');
  const redRules = wlRules.filter(r => r.mode === 'red');

  state.sourceFiltered[state.currentSource] = (state.sourceData[state.currentSource] || []).filter(s => {
    // Band: multi-select — empty Set = all bands pass
    if (allowed.includes('band') && state.activeBands.size > 0) {
      const spotBand = freqToBand(s.frequency);
      if (!spotBand || !state.activeBands.has(spotBand)) return false;
    }
    // Mode: multi-select — empty Set = all modes pass
    if (allowed.includes('mode') && state.activeModes.size > 0) {
      if (!state.activeModes.has((s.mode || '').toUpperCase())) return false;
    }
    // Distance filter
    if (allowed.includes('distance') && !filterByDistance(s)) return false;
    // Age filter
    if (allowed.includes('age') && !filterByAge(s)) return false;
    // Propagation filter — applies to all sources (HF only; VHF/UHF pass through)
    if (state.propagationFilterEnabled && !filterByPropagation(s)) return false;
    // Dropdowns (single-select)
    if (allowed.includes('country') && state.activeCountry && getCountryPrefix(s.reference) !== state.activeCountry) return false;
    if (allowed.includes('state') && state.activeState && getUSState(s.locationDesc) !== state.activeState) return false;
    if (allowed.includes('grid') && state.activeGrid && (s.grid4 || '') !== state.activeGrid) return false;
    if (allowed.includes('continent') && state.activeContinent && (s.continent || '') !== state.activeContinent) return false;
    if (allowed.includes('privilege') && state.privilegeFilterEnabled && !filterByPrivileges(s)) return false;

    // Watch list — applied after all standard filters
    if (wlRules.length > 0) {
      // 1. Only rules: spot must match at least one (if any exist)
      if (onlyRules.length > 0 && !onlyRules.some(r => matchWatchRule(r, s))) return false;
      // 2. Not rules: discard if any match
      if (notRules.some(r => matchWatchRule(r, s))) return false;
      // 3. Red rules: flag for highlight (never filters)
      if (redRules.length > 0 && redRules.some(r => matchWatchRule(r, s))) {
        state.watchRedSpotIds.add(SOURCE_DEFS[state.currentSource].spotId(s));
      }
    }

    return true;
  });
}

export function getAvailableBands() {
  const bandSet = new Set();
  (state.sourceData[state.currentSource] || []).forEach(s => {
    const band = freqToBand(s.frequency);
    if (band) bandSet.add(band);
  });
  const order = ['160m','80m','60m','40m','30m','20m','17m','15m','12m','10m','6m','2m','70cm'];
  return order.filter(b => bandSet.has(b));
}

export function updateBandFilterButtons() {
  const bands = getAvailableBands();
  const bandFilters = $('bandFilters');
  bandFilters.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.textContent = 'All';
  allBtn.className = state.activeBands.size === 0 ? 'active' : '';
  allBtn.addEventListener('click', () => {
    state.activeBands.clear();
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
    updateBandFilterButtons();
  });
  bandFilters.appendChild(allBtn);

  bands.forEach(band => {
    const btn = document.createElement('button');
    btn.textContent = band;
    btn.className = state.activeBands.has(band) ? 'active' : '';
    btn.addEventListener('click', () => {
      // Toggle band in Set
      if (state.activeBands.has(band)) {
        state.activeBands.delete(band);
      } else {
        state.activeBands.add(band);
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

export function getAvailableModes() {
  const modeSet = new Set();
  (state.sourceData[state.currentSource] || []).forEach(s => {
    if (s.mode) modeSet.add(s.mode.toUpperCase());
  });
  return [...modeSet].sort();
}

export function updateModeFilterButtons() {
  const modes = getAvailableModes();
  const modeFilters = $('modeFilters');
  modeFilters.innerHTML = '';

  const allBtn = document.createElement('button');
  allBtn.textContent = 'All';
  allBtn.className = state.activeModes.size === 0 ? 'active' : '';
  allBtn.addEventListener('click', () => {
    state.activeModes.clear();
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
    updateModeFilterButtons();
  });
  modeFilters.appendChild(allBtn);

  modes.forEach(mode => {
    const btn = document.createElement('button');
    btn.textContent = mode;
    btn.className = state.activeModes.has(mode) ? 'active' : '';
    btn.addEventListener('click', () => {
      // Toggle mode in Set
      if (state.activeModes.has(mode)) {
        state.activeModes.delete(mode);
      } else {
        state.activeModes.add(mode);
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

export function getAvailableCountries() {
  const countrySet = new Set();
  (state.sourceData[state.currentSource] || []).forEach(s => {
    const prefix = getCountryPrefix(s.reference);
    if (prefix) countrySet.add(prefix);
  });
  return [...countrySet].sort();
}

export function updateCountryFilter() {
  const countries = getAvailableCountries();
  const current = state.activeCountry;
  const countryFilter = $('countryFilter');
  countryFilter.innerHTML = '<option value="">All Countries</option>';
  countries.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = c;
    if (c === current) opt.selected = true;
    countryFilter.appendChild(opt);
  });
}

export function getAvailableStates() {
  const stateSet = new Set();
  (state.sourceData[state.currentSource] || []).forEach(s => {
    const st = getUSState(s.locationDesc);
    if (st) stateSet.add(st);
  });
  return [...stateSet].sort();
}

export function updateStateFilter() {
  const states = getAvailableStates();
  const current = state.activeState;
  const stateFilter = $('stateFilter');
  stateFilter.innerHTML = '<option value="">All States</option>';
  states.forEach(st => {
    const opt = document.createElement('option');
    opt.value = st;
    opt.textContent = st;
    if (st === current) opt.selected = true;
    stateFilter.appendChild(opt);
  });
}

export function getAvailableGrids() {
  const gridSet = new Set();
  (state.sourceData[state.currentSource] || []).forEach(s => {
    if (s.grid4) gridSet.add(s.grid4);
  });
  return [...gridSet].sort();
}

export function updateGridFilter() {
  const grids = getAvailableGrids();
  const current = state.activeGrid;
  const gridFilter = $('gridFilter');
  gridFilter.innerHTML = '<option value="">All Grids</option>';
  grids.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g;
    opt.textContent = g;
    if (g === current) opt.selected = true;
    gridFilter.appendChild(opt);
  });
}

export function getAvailableContinents() {
  const contSet = new Set();
  (state.sourceData[state.currentSource] || []).forEach(s => {
    if (s.continent) contSet.add(s.continent);
  });
  // Sort by standard continent code order
  const order = ['AF', 'AN', 'AS', 'EU', 'NA', 'OC', 'SA'];
  return order.filter(c => contSet.has(c));
}

export function updateContinentFilter() {
  const continents = getAvailableContinents();
  const current = state.activeContinent;
  const continentFilter = $('continentFilter');
  if (!continentFilter) return;
  continentFilter.innerHTML = '<option value="">All Continents</option>';
  const labels = { AF: 'Africa', AN: 'Antarctica', AS: 'Asia', EU: 'Europe', NA: 'N. America', OC: 'Oceania', SA: 'S. America' };
  continents.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    opt.textContent = `${c} - ${labels[c] || c}`;
    if (c === current) opt.selected = true;
    continentFilter.appendChild(opt);
  });
}

export function updatePrivFilterVisibility() {
  const label = document.querySelector('.priv-filter-label');
  if (!label) return;
  const show = isUSCallsign(state.myCallsign) && !!state.licenseClass;
  label.classList.toggle('hidden', !show);
  if (!show) {
    state.privilegeFilterEnabled = false;
    const cb = $('privFilter');
    if (cb) cb.checked = false;
  }
}

export async function fetchLicenseClass(callsign) {
  if (!isUSCallsign(callsign)) {
    state.licenseClass = '';
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
      state.licenseClass = (data.class || '').toUpperCase();
      if (state.licenseClass) localStorage.setItem('hamtab_license_class', state.licenseClass);
      cacheCallsign(callsign.toUpperCase(), data);
    } else {
      state.licenseClass = '';
      localStorage.removeItem('hamtab_license_class');
    }
  } catch (e) {
    // keep existing value
  }
  updatePrivFilterVisibility();
  updateOperatorDisplay();
}

// Import lazily to avoid circular dep at module level
function updateOperatorDisplay() {
  // Inline the display logic to avoid circular imports
  const { esc } = require('./utils.js');
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
    const { latLonToGrid } = require('./geo.js');
    const grid = latLonToGrid(state.myLat, state.myLon);
    opLoc.textContent = `${state.myLat.toFixed(2)}, ${state.myLon.toFixed(2)} [${grid}]`;
  } else {
    opLoc.textContent = 'Location unknown';
  }
}

export function initFilterListeners() {
  const countryFilter = $('countryFilter');
  const stateFilter = $('stateFilter');
  const gridFilter = $('gridFilter');
  const continentFilter = $('continentFilter');

  countryFilter.addEventListener('change', () => {
    state.activeCountry = countryFilter.value || null;
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  stateFilter.addEventListener('change', () => {
    state.activeState = stateFilter.value || null;
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  gridFilter.addEventListener('change', () => {
    state.activeGrid = gridFilter.value || null;
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  if (continentFilter) {
    continentFilter.addEventListener('change', () => {
      state.activeContinent = continentFilter.value || null;
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
  }

  const privFilterCheckbox = $('privFilter');
  privFilterCheckbox.checked = state.privilegeFilterEnabled;
  updatePrivFilterVisibility();

  privFilterCheckbox.addEventListener('change', () => {
    state.privilegeFilterEnabled = privFilterCheckbox.checked;
    localStorage.setItem('hamtab_privilege_filter', String(state.privilegeFilterEnabled));
    saveCurrentFilters();
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  // Distance filter
  const distanceInput = $('distanceFilter');
  const distanceUnit = $('distanceUnit');
  if (distanceInput) {
    distanceInput.addEventListener('input', () => {
      const val = distanceInput.value.trim();
      state.activeMaxDistance = val === '' ? null : parseFloat(val);
      if (isNaN(state.activeMaxDistance)) state.activeMaxDistance = null;
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
  }
  if (distanceUnit) {
    distanceUnit.value = state.distanceUnit;
    distanceUnit.addEventListener('change', () => {
      state.distanceUnit = distanceUnit.value;
      localStorage.setItem('hamtab_distance_unit', state.distanceUnit);
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
  }

  // Age filter
  const ageFilter = $('ageFilter');
  if (ageFilter) {
    ageFilter.addEventListener('change', () => {
      const val = ageFilter.value;
      state.activeMaxAge = val === '' ? null : parseInt(val, 10);
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
  }

  // Propagation filter toggle
  const propBtn = $('propFilterBtn');
  if (propBtn) {
    propBtn.classList.toggle('active', state.propagationFilterEnabled);
    propBtn.addEventListener('click', () => {
      state.propagationFilterEnabled = !state.propagationFilterEnabled;
      propBtn.classList.toggle('active', state.propagationFilterEnabled);
      saveCurrentFilters();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
  }

  // Clear all filters button
  const clearBtn = $('clearFiltersBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearAllFilters();
    });
  }

  // Preset controls
  const presetSelect = $('presetFilter');
  const savePresetBtn = $('savePresetBtn');
  const deletePresetBtn = $('deletePresetBtn');

  if (presetSelect) {
    presetSelect.addEventListener('change', () => {
      const name = presetSelect.value;
      if (name) loadPreset(name);
      presetSelect.value = ''; // reset dropdown
    });
  }

  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
      const name = prompt('Preset name:');
      if (name && name.trim()) savePreset(name.trim());
    });
  }

  if (deletePresetBtn) {
    deletePresetBtn.addEventListener('click', () => {
      const name = prompt('Preset name to delete:');
      if (name && name.trim()) deletePreset(name.trim());
    });
  }

  if (state.myCallsign) {
    fetchLicenseClass(state.myCallsign);
  }
}

export function spotId(spot) {
  return SOURCE_DEFS[state.currentSource].spotId(spot);
}

// --- Filter Persistence ---

// Save current filter state for the active source to localStorage
export function saveCurrentFilters() {
  const source = state.currentSource;
  const filterState = {
    bands: [...state.activeBands],
    modes: [...state.activeModes],
    maxDistance: state.activeMaxDistance,
    distanceUnit: state.distanceUnit,
    maxAge: state.activeMaxAge,
    country: state.activeCountry,
    state: state.activeState,
    grid: state.activeGrid,
    continent: state.activeContinent,
    privilegeFilter: state.privilegeFilterEnabled,
    propagationFilter: state.propagationFilterEnabled,
    sortColumn: state.spotSortColumn,
    sortDirection: state.spotSortDirection,
  };
  localStorage.setItem(`hamtab_filter_${source}`, JSON.stringify(filterState));
}

// Load persisted filters for a source and apply to state
export function loadFiltersForSource(source) {
  try {
    const saved = JSON.parse(localStorage.getItem(`hamtab_filter_${source}`));
    if (saved) {
      state.activeBands = new Set(saved.bands || []);
      state.activeModes = new Set(saved.modes || []);
      state.activeMaxDistance = saved.maxDistance ?? null;
      state.activeMaxAge = saved.maxAge ?? null;
      state.activeCountry = saved.country ?? null;
      state.activeState = saved.state ?? null;
      state.activeGrid = saved.grid ?? null;
      state.activeContinent = saved.continent ?? null;
      state.privilegeFilterEnabled = saved.privilegeFilter ?? false;
      state.propagationFilterEnabled = saved.propagationFilter ?? false;
      state.spotSortColumn = saved.sortColumn ?? null;
      state.spotSortDirection = saved.sortDirection ?? 'desc';
      return;
    }
  } catch (e) {}
  // No saved filters — reset to defaults
  state.activeBands = new Set();
  state.activeModes = new Set();
  state.activeMaxDistance = null;
  state.activeMaxAge = null;
  state.activeCountry = null;
  state.activeState = null;
  state.activeGrid = null;
  state.activeContinent = null;
  state.privilegeFilterEnabled = false;
  state.propagationFilterEnabled = false;
  state.spotSortColumn = null;
  state.spotSortDirection = 'desc';
}

// Update all filter UI elements to match current state
export function updateAllFilterUI() {
  updateBandFilterButtons();
  updateModeFilterButtons();
  updateCountryFilter();
  updateStateFilter();
  updateGridFilter();
  updateContinentFilter();

  // Distance
  const distanceInput = $('distanceFilter');
  if (distanceInput) {
    distanceInput.value = state.activeMaxDistance !== null ? state.activeMaxDistance : '';
  }
  const distanceUnit = $('distanceUnit');
  if (distanceUnit) {
    distanceUnit.value = state.distanceUnit;
  }

  // Age
  const ageFilter = $('ageFilter');
  if (ageFilter) {
    ageFilter.value = state.activeMaxAge !== null ? String(state.activeMaxAge) : '';
  }

  // Privilege checkbox
  const privFilterCheckbox = $('privFilter');
  if (privFilterCheckbox) {
    privFilterCheckbox.checked = state.privilegeFilterEnabled;
  }

  // Propagation toggle
  const propBtn = $('propFilterBtn');
  if (propBtn) {
    propBtn.classList.toggle('active', state.propagationFilterEnabled);
  }
}

// Clear all filters and update UI
export function clearAllFilters() {
  state.activeBands.clear();
  state.activeModes.clear();
  state.activeMaxDistance = null;
  state.activeMaxAge = null;
  state.activeCountry = null;
  state.activeState = null;
  state.activeGrid = null;
  state.activeContinent = null;
  state.privilegeFilterEnabled = false;
  state.propagationFilterEnabled = false;

  saveCurrentFilters();
  applyFilter();
  renderSpots();
  renderMarkers();
  updateAllFilterUI();
}

// --- Filter Presets ---

// Update the preset dropdown to show available presets for current source
export function updatePresetDropdown() {
  const presetSelect = $('presetFilter');
  if (!presetSelect) return;

  const source = state.currentSource;
  const presets = state.filterPresets[source] || {};
  const names = Object.keys(presets).sort();

  presetSelect.innerHTML = '<option value="">Load Preset...</option>';
  names.forEach(name => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    presetSelect.appendChild(opt);
  });
}

// Save current filters as a named preset
export function savePreset(name) {
  const source = state.currentSource;
  const preset = {
    bands: [...state.activeBands],
    modes: [...state.activeModes],
    maxDistance: state.activeMaxDistance,
    distanceUnit: state.distanceUnit,
    maxAge: state.activeMaxAge,
    country: state.activeCountry,
    state: state.activeState,
    grid: state.activeGrid,
    continent: state.activeContinent,
    privilegeFilter: state.privilegeFilterEnabled,
    propagationFilter: state.propagationFilterEnabled,
    sortColumn: state.spotSortColumn,
    sortDirection: state.spotSortDirection,
  };
  if (!state.filterPresets[source]) state.filterPresets[source] = {};
  state.filterPresets[source][name] = preset;
  localStorage.setItem('hamtab_filter_presets', JSON.stringify(state.filterPresets));
  updatePresetDropdown();
}

// Load a named preset and apply it
export function loadPreset(name) {
  const source = state.currentSource;
  const preset = state.filterPresets[source]?.[name];
  if (!preset) return;

  state.activeBands = new Set(preset.bands || []);
  state.activeModes = new Set(preset.modes || []);
  state.activeMaxDistance = preset.maxDistance ?? null;
  state.activeMaxAge = preset.maxAge ?? null;
  state.activeCountry = preset.country ?? null;
  state.activeState = preset.state ?? null;
  state.activeGrid = preset.grid ?? null;
  state.activeContinent = preset.continent ?? null;
  state.privilegeFilterEnabled = preset.privilegeFilter ?? false;
  state.propagationFilterEnabled = preset.propagationFilter ?? false;
  state.spotSortColumn = preset.sortColumn ?? null;
  state.spotSortDirection = preset.sortDirection ?? 'desc';

  saveCurrentFilters();
  applyFilter();
  renderSpots();
  renderMarkers();
  updateAllFilterUI();
}

// Delete a named preset
export function deletePreset(name) {
  const source = state.currentSource;
  if (state.filterPresets[source]?.[name]) {
    delete state.filterPresets[source][name];
    localStorage.setItem('hamtab_filter_presets', JSON.stringify(state.filterPresets));
    updatePresetDropdown();
  }
}

// Update visibility of distance/age filter controls based on source
export function updateDistanceAgeVisibility() {
  const allowed = SOURCE_DEFS[state.currentSource].filters;
  const distWrap = $('distanceFilterWrap');
  const ageWrap = $('ageFilterWrap');
  const presetWrap = $('presetFilterWrap');

  if (distWrap) distWrap.style.display = allowed.includes('distance') ? '' : 'none';
  if (ageWrap) ageWrap.style.display = allowed.includes('age') ? '' : 'none';
  if (presetWrap) presetWrap.style.display = '';
}
