// --- DE/DX Info Widget ---
// Displays operator (DE) info and selected spot (DX) info side by side.
// Shows callsign, grid, lat/lon, sunrise/sunset countdowns, bearing, distance.
// All data is client-side — no server fetch needed.

import state from './state.js';
import { $ } from './dom.js';
import { latLonToGrid, getSunTimes, bearingTo, bearingToCardinal, distanceMi, latLonToCardinal, utcOffsetFromLon } from './geo.js';
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

// --- Sun countdown formatter ---
// Returns "R in H:MM" / "R H:MM ago" for sunrise, "S in H:MM" / "S H:MM ago" for sunset
function fmtSunCountdown(target, now, prefix) {
  if (!target) return null;
  const diffMs = target.getTime() - now.getTime();
  const absDiff = Math.abs(diffMs);
  const h = Math.floor(absDiff / 3600000);
  const m = Math.floor((absDiff % 3600000) / 60000);
  const mm = String(m).padStart(2, '0');
  if (diffMs > 0) {
    return `${prefix} in ${h}:${mm}`;
  }
  return `${prefix} ${h}:${mm} ago`;
}

// --- DE (operator) panel ---
function renderDedxDe() {
  const el = $('dedxDeContent');
  if (!el) return;

  const call = state.myCallsign || '\u2014';
  const lat = state.myLat;
  const lon = state.myLon;

  let rows = `<div class="dedx-row"><span class="dedx-callsign">${esc(call)}</span></div>`;

  if (lat !== null && lon !== null) {
    // Local time (browser local for DE)
    const now = new Date();
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayStr = days[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Time</span><span class="dedx-value">${dayStr} ${hh}:${mm}</span></div>`;

    const grid = latLonToGrid(lat, lon).substring(0, 6).toUpperCase();
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Grid</span><span class="dedx-value">${esc(grid)}</span></div>`;

    const cardinal = latLonToCardinal(lat, lon);
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Loc</span><span class="dedx-value">${cardinal}</span></div>`;

    const sun = getSunTimes(lat, lon, now);
    const rise = fmtSunCountdown(sun.sunrise, now, 'R');
    const set = fmtSunCountdown(sun.sunset, now, 'S');
    if (rise) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunrise">${rise}</span></div>`;
    }
    if (set) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunset">${set}</span></div>`;
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
  const call = spot.callsign || spot.activator || '\u2014';
  const freq = spot.frequency || '';
  const mode = spot.mode || '';
  const band = freqToBand(freq) || '';
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);

  let rows = `<div class="dedx-row"><span class="dedx-callsign">${esc(call)}</span></div>`;

  // Freq + band + mode on one line
  if (freq) {
    const parts = [freq];
    if (band) parts.push(`(${band})`);
    if (mode) parts.push(mode);
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Freq</span><span class="dedx-value">${esc(parts.join(' '))}</span></div>`;
  } else if (mode) {
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Mode</span><span class="dedx-value">${esc(mode)}</span></div>`;
  }

  if (!isNaN(lat) && !isNaN(lon)) {
    const grid = latLonToGrid(lat, lon).substring(0, 4).toUpperCase();
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Grid</span><span class="dedx-value">${esc(grid)}</span></div>`;

    const cardinal = latLonToCardinal(lat, lon);
    rows += `<div class="dedx-row"><span class="dedx-label-sm">Loc</span><span class="dedx-value">${cardinal}</span></div>`;

    // Bearing & distance from DE — compact single line
    if (state.myLat !== null && state.myLon !== null) {
      const deg = bearingTo(state.myLat, state.myLon, lat, lon);
      const mi = distanceMi(state.myLat, state.myLon, lat, lon);
      const dist = state.distanceUnit === 'km' ? Math.round(mi * 1.60934) : Math.round(mi);
      const card = bearingToCardinal(deg);
      rows += `<div class="dedx-row"><span class="dedx-label-sm">D/B</span><span class="dedx-value dedx-compact">${dist.toLocaleString()}${state.distanceUnit}@${Math.round(deg)}\u00B0${card}</span></div>`;
    }

    // DX sunrise/sunset countdowns
    const now = new Date();
    const sun = getSunTimes(lat, lon, now);
    const rise = fmtSunCountdown(sun.sunrise, now, 'R');
    const set = fmtSunCountdown(sun.sunset, now, 'S');
    if (rise) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunrise">${rise}</span></div>`;
    }
    if (set) {
      rows += `<div class="dedx-row"><span class="dedx-label-sm">Sun</span><span class="dedx-value dedx-sunset">${set}</span></div>`;
    }

    // UTC offset badge (approximate from longitude)
    const offset = utcOffsetFromLon(lon);
    const sign = offset >= 0 ? '+' : '';
    rows += `<div class="dedx-row"><span class="dedx-label-sm">TZ</span><span class="dedx-value dedx-utc-badge">UTC${sign}${offset}</span></div>`;
  }

  el.innerHTML = rows;
}
