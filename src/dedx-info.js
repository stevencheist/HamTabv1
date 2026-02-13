// --- DE/DX Info Widget ---
// Displays operator (DE) info and selected spot (DX) info side by side.
// Shows large live clocks, callsign, grid, sunrise/sunset countdowns, bearing, distance.
// All data is client-side — no server fetch needed.
// Timer runs at 1 Hz for live clock updates; managed via startDedxTimer/stopDedxTimer.

import state from './state.js';
import { $ } from './dom.js';
import { isWidgetVisible } from './widgets.js';
import { latLonToGrid, getSunTimes, bearingTo, bearingToCardinal, distanceMi, latLonToCardinal, utcOffsetFromLon } from './geo.js';
import { esc } from './utils.js';
import { freqToBand } from './filters.js';

let selectedSpot = null; // cached DX spot for re-render

// Listen for spot selection changes
export function initDedxListeners() {
  // No click handlers needed — we hook into selectSpot via setDedxSpot()
}

// Called by markers.js selectSpot when a spot is selected
export function setDedxSpot(spot) {
  selectedSpot = spot;
  renderDedxInfo();
}

// Clear the DX side when spot is deselected
export function clearDedxSpot() {
  selectedSpot = null;
  renderDedxInfo();
}

// --- Timer management (1 Hz for live clocks) ---

export function startDedxTimer() {
  renderDedxInfo();
  if (state.dedxTimer) return; // already running
  state.dedxTimer = setInterval(renderDedxInfo, 1000); // 1 s refresh
}

export function stopDedxTimer() {
  if (state.dedxTimer) {
    clearInterval(state.dedxTimer);
    state.dedxTimer = null;
  }
}

// --- Time formatting ---

function fmtTime(date, use24h) {
  const h = date.getHours();
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  if (use24h) return `${String(h).padStart(2, '0')}:${m}:${s}`;
  const h12 = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h12}:${m}:${s} ${ampm}`;
}

// Local time at a given longitude (approximate, no DST)
function localTimeAtLonDate(lon) {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const offsetMs = (lon / 15) * 3600000; // ms per hour of longitude
  return new Date(utcMs + offsetMs);
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

// Render both DE and DX panels
export function renderDedxInfo() {
  if (!isWidgetVisible('widget-dedx')) return;
  renderDedxDe();
  renderDedxDx();
}

// --- DE (operator) panel ---
function renderDedxDe() {
  const timeEl = $('dedxDeTime');
  const el = $('dedxDeContent');
  if (!el) return;

  // Large clock — browser local time
  const now = new Date();
  if (timeEl) timeEl.textContent = fmtTime(now, state.use24h);

  const call = state.myCallsign || '\u2014';
  const lat = state.myLat;
  const lon = state.myLon;

  let rows = `<div class="dedx-row"><span class="dedx-callsign">${esc(call)}</span></div>`;

  if (lat !== null && lon !== null) {
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
  const timeEl = $('dedxDxTime');
  const el = $('dedxDxContent');
  if (!el) return;

  if (!selectedSpot) {
    // No spot selected — show UTC on the clock
    if (timeEl) {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      timeEl.textContent = `${h}:${m}:${s}`;
    }
    el.innerHTML = '<div class="dedx-utc-label">UTC</div><div class="dedx-row dedx-empty">Select a spot</div>';
    return;
  }

  const spot = selectedSpot;
  const call = spot.callsign || spot.activator || '\u2014';
  const freq = spot.frequency || '';
  const mode = spot.mode || '';
  const band = freqToBand(freq) || '';
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);

  // DX clock — approximate local time from longitude
  if (timeEl) {
    if (!isNaN(lat) && !isNaN(lon)) {
      const dxLocal = localTimeAtLonDate(lon);
      timeEl.textContent = fmtTime(dxLocal, state.use24h);
    } else {
      timeEl.textContent = '--:--:--';
    }
  }

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
