import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS, US_PRIVILEGES } from './constants.js';
import { cacheCallsign } from './utils.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';

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

function getCountryPrefix(ref) {
  if (!ref) return '';
  return ref.split('-')[0];
}

function getUSState(locationDesc) {
  if (!locationDesc) return '';
  if (locationDesc.startsWith('US-')) return locationDesc.substring(3);
  return '';
}

export function applyFilter() {
  const allowed = SOURCE_DEFS[state.currentSource].filters;
  state.sourceFiltered[state.currentSource] = (state.sourceData[state.currentSource] || []).filter(s => {
    if (allowed.includes('band') && state.activeBand && freqToBand(s.frequency) !== state.activeBand) return false;
    if (allowed.includes('mode') && state.activeMode && (s.mode || '').toUpperCase() !== state.activeMode) return false;
    if (allowed.includes('country') && state.activeCountry && getCountryPrefix(s.reference) !== state.activeCountry) return false;
    if (allowed.includes('state') && state.activeState && getUSState(s.locationDesc) !== state.activeState) return false;
    if (allowed.includes('grid') && state.activeGrid && (s.grid4 || '') !== state.activeGrid) return false;
    if (allowed.includes('privilege') && state.privilegeFilterEnabled && !filterByPrivileges(s)) return false;
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
  allBtn.className = state.activeBand === null ? 'active' : '';
  allBtn.addEventListener('click', () => {
    state.activeBand = null;
    applyFilter();
    renderSpots();
    renderMarkers();
    updateBandFilterButtons();
  });
  bandFilters.appendChild(allBtn);

  bands.forEach(band => {
    const btn = document.createElement('button');
    btn.textContent = band;
    btn.className = state.activeBand === band ? 'active' : '';
    btn.addEventListener('click', () => {
      state.activeBand = band;
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
  allBtn.className = state.activeMode === null ? 'active' : '';
  allBtn.addEventListener('click', () => {
    state.activeMode = null;
    applyFilter();
    renderSpots();
    renderMarkers();
    updateModeFilterButtons();
  });
  modeFilters.appendChild(allBtn);

  modes.forEach(mode => {
    const btn = document.createElement('button');
    btn.textContent = mode;
    btn.className = state.activeMode === mode ? 'active' : '';
    btn.addEventListener('click', () => {
      state.activeMode = mode;
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

  countryFilter.addEventListener('change', () => {
    state.activeCountry = countryFilter.value || null;
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  stateFilter.addEventListener('change', () => {
    state.activeState = stateFilter.value || null;
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  gridFilter.addEventListener('change', () => {
    state.activeGrid = gridFilter.value || null;
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  const privFilterCheckbox = $('privFilter');
  privFilterCheckbox.checked = state.privilegeFilterEnabled;
  updatePrivFilterVisibility();

  privFilterCheckbox.addEventListener('change', () => {
    state.privilegeFilterEnabled = privFilterCheckbox.checked;
    localStorage.setItem('hamtab_privilege_filter', String(state.privilegeFilterEnabled));
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  if (state.myCallsign) {
    fetchLicenseClass(state.myCallsign);
  }
}

export function spotId(spot) {
  return SOURCE_DEFS[state.currentSource].spotId(spot);
}
