// --- DE/DX Info Widget ---
// Displays operator (DE) info and selected spot (DX) info side by side.
// Shows callsign, grid, lat/lon, sunrise/sunset, bearing, distance.
// All data is client-side — no server fetch needed.

import state from './state.js';
import { $ } from './dom.js';
import { latLonToGrid, getSunTimes, bearingTo, bearingToCardinal, distanceMi } from './geo.js';
import { esc } from './utils.js';
import { freqToBand } from './filters.js';

let selectedSpot = null; // cached DX spot for re-render

// Listen for spot selection changes
export function initDedxListeners() {
  // No click handlers needed — we hook into selectSpot via renderDedxDx()
}

// Called by markers.js selectSpot when a spot is selected
export function setDedxSpot(spot) {
  selectedSpot = spot;
  renderDedxDx();
}

// Clear the DX side when spot is deselected
export function clearDedxSpot() {
  selectedSpot = null;
  renderDedxDx();
}

// Render both DE and DX panels
export function renderDedxInfo() {
  renderDedxDe();
  renderDedxDx();
}

// --- DE (operator) panel ---
function renderDedxDe() {
  const el = $('dedxDeContent');
  if (!el) return;

  const call = state.myCallsign || '—';
  const lat = state.myLat;
  const lon = state.myLon;

  let rows = `<div class="dedx-row"><span class="dedx-label-sm">Call</span><span class="dedx-value">${esc(call)}</span></div>`;

  if (lat !== null && lon !== null) {
    const grid = latLonToGrid(lat, lon).substring(0, 6).toUpperCase();
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Grid</span><span class="dedx-value">${esc(grid)}</span></div>`;
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Loc</span><span class="dedx-value">${lat.toFixed(2)}, ${lon.toFixed(2)}</span></div>`;

    const now = new Date();
    const sun = getSunTimes(lat, lon, now);
    if (sun.sunrise) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Rise</span><span class="dedx-value dedx-sunrise">${fmtSunTime(sun.sunrise)}</span></div>`;
    }
    if (sun.sunset) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Set</span><span class="dedx-value dedx-sunset">${fmtSunTime(sun.sunset)}</span></div>`;
    }
  } else {
    rows += `<div class="dedx-row dedx-empty">Set location in Config</div>`;
  }

  el.innerHTML = rows;
}

// --- DX (selected spot) panel ---
function renderDedxDx() {
  const el = $('dedxDxContent');
  if (!el) return;

  if (!selectedSpot) {
    el.innerHTML = '<div class="dedx-row dedx-empty">Select a spot</div>';
    return;
  }

  const spot = selectedSpot;
  const call = spot.callsign || spot.activator || '—';
  const freq = spot.frequency || '';
  const mode = spot.mode || '';
  const band = freqToBand(freq) || '';
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);

  let rows = `<div class="dedx-row"><span class="dedx-label-sm">Call</span><span class="dedx-value">${esc(call)}</span></div>`;

  if (freq) {
    const bandStr = band ? ` (${band})` : '';
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Freq</span><span class="dedx-value">${esc(freq)}${esc(bandStr)}</span></div>`;
  }
  if (mode) {
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Mode</span><span class="dedx-value">${esc(mode)}</span></div>`;
  }

  if (!isNaN(lat) && !isNaN(lon)) {
    const grid = latLonToGrid(lat, lon).substring(0, 4).toUpperCase();
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Grid</span><span class="dedx-value">${esc(grid)}</span></div>`;

    // Bearing & distance from DE
    if (state.myLat !== null && state.myLon !== null) {
      const deg = bearingTo(state.myLat, state.myLon, lat, lon);
      const mi = distanceMi(state.myLat, state.myLon, lat, lon);
      const dist = state.distanceUnit === 'km' ? Math.round(mi * 1.60934) : Math.round(mi);
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Brg</span><span class="dedx-value">${Math.round(deg)}\u00B0 ${bearingToCardinal(deg)}</span></div>`;
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Dist</span><span class="dedx-value">${dist.toLocaleString()} ${state.distanceUnit}</span></div>`;
    }

    // DX sunrise/sunset
    const now = new Date();
    const sun = getSunTimes(lat, lon, now);
    if (sun.sunrise) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Rise</span><span class="dedx-value dedx-sunrise">${fmtSunTime(sun.sunrise)}</span></div>`;
    }
    if (sun.sunset) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Set</span><span class="dedx-value dedx-sunset">${fmtSunTime(sun.sunset)}</span></div>`;
    }
  }

  el.innerHTML = rows;
}

// Format sun time as HH:MM UTC
function fmtSunTime(date) {
  if (!date) return '—';
  const h = String(date.getUTCHours()).padStart(2, '0');
  const m = String(date.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}z`;
}
