// --- VOACAP DE→DX Module ---
// 24-hour x band reliability matrix with interactive parameters and map overlays.
// Fetches predictions from /api/voacap (real VOACAP engine or simplified fallback).

import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS } from './constants.js';
import { calculate24HourMatrix, getReliabilityColor, VOACAP_BANDS, HF_BANDS } from './band-conditions.js';
import { renderHeatmapCanvas, clearHeatmap } from './rel-heatmap.js';

// Store overlay circles on map
let bandOverlayCircles = [];

// Abort controller — cancel in-flight fetch when a new one starts
let activeFetchController = null;

// Retry state for transient server errors (500, network hiccups, cold starts)
let retryTimer = null;
let retryCount = 0;
const MAX_RETRIES = 3;

// Minimum interval between server fetches
const FETCH_THROTTLE_MS = 5 * 60 * 1000;      // 5 min when we have real VOACAP data
const FETCH_RETRY_MS = 30 * 1000;              // 30s retry when server returned simplified or error

// --- Parameter cycling constants ---

const POWER_OPTIONS = ['5', '100', '1000'];
const POWER_LABELS = { '5': '5W', '100': '100W', '1000': '1kW' };
const MODE_OPTIONS  = ['CW', 'SSB', 'FT8'];
const TOA_OPTIONS   = ['3', '5', '10', '15'];
const PATH_OPTIONS  = ['SP', 'LP'];
const TARGET_OPTIONS = ['overview', 'spot'];

// SNR sensitivity presets: level → { SSB, CW, FT8 } required SNR (dB)
// Higher SNR = more strict = fewer paths show as workable
// Lower SNR = more lenient = more paths show as workable
const SENSITIVITY_LEVELS = {
  1: { SSB: 42, CW: 18, FT8: -4, label: 'Optimistic',    desc: 'Beam antenna, low noise — most paths show as workable' },
  2: { SSB: 48, CW: 24, FT8:  0, label: 'Relaxed',       desc: 'Good antenna, reasonable noise floor' },
  3: { SSB: 54, CW: 30, FT8:  2, label: 'Normal',        desc: 'Typical amateur station (default)' },
  4: { SSB: 60, CW: 36, FT8:  8, label: 'Conservative',  desc: 'Compromise antenna, urban noise' },
  5: { SSB: 66, CW: 42, FT8: 14, label: 'Strict',        desc: 'Small antenna, high noise — only strong paths show' },
};
const DEFAULT_SENSITIVITY = 3;
const MAX_SENSITIVITY = 5;

// --- Initialization ---

export function initVoacapListeners() {
  const matrix = $('voacapMatrix');
  if (!matrix) return;

  // Delegated click handler for band rows and parameter bar
  matrix.addEventListener('click', (e) => {
    // Parameter cycling (shift+click on sensitivity = reset)
    const param = e.target.closest('.voacap-param');
    if (param && param.dataset.param) {
      if (param.dataset.param === 'sensitivity' && e.shiftKey) {
        cycleParam('sensitivity-reset');
      } else {
        cycleParam(param.dataset.param);
      }
      return;
    }

    // Band row click → toggle map overlay
    const row = e.target.closest('.voacap-row');
    if (row && row.dataset.band) {
      toggleBandOverlay(row.dataset.band);
    }
  });
}

// --- Parameter Cycling ---

function cycleParam(name) {
  // Overlay mode toggle (circles ↔ heatmap)
  if (name === 'overlay') {
    const next = state.heatmapOverlayMode === 'circles' ? 'heatmap' : 'circles';
    state.heatmapOverlayMode = next;
    localStorage.setItem('hamtab_heatmap_mode', next);
    renderVoacapMatrix();

    // Re-draw in the new mode if an overlay is active
    if (state.hfPropOverlayBand) {
      clearBandOverlay();
      clearHeatmap();
      if (next === 'heatmap') {
        renderHeatmapCanvas(state.hfPropOverlayBand);
      } else {
        drawBandOverlay(state.hfPropOverlayBand);
      }
    }
    return;
  }

  // Auto-spot toggle
  if (name === 'autospot') {
    state.voacapAutoSpot = !state.voacapAutoSpot;
    localStorage.setItem('hamtab_voacap_auto_spot', state.voacapAutoSpot);
    renderVoacapMatrix();
    return;
  }

  // Sensitivity reset (shift+click on sensitivity badge)
  if (name === 'sensitivity-reset') {
    state.voacapSensitivity = DEFAULT_SENSITIVITY;
    localStorage.setItem('hamtab_voacap_sensitivity', DEFAULT_SENSITIVITY);
    renderVoacapMatrix();
    clearTimeout(state.voacapParamTimer);
    state.voacapParamTimer = setTimeout(() => fetchVoacapMatrix(), 300);
    return;
  }

  // Sensitivity cycling
  if (name === 'sensitivity') {
    const current = state.voacapSensitivity;
    const next = current >= MAX_SENSITIVITY ? 1 : current + 1;
    state.voacapSensitivity = next;
    localStorage.setItem('hamtab_voacap_sensitivity', next);
    renderVoacapMatrix();
    clearTimeout(state.voacapParamTimer);
    state.voacapParamTimer = setTimeout(() => fetchVoacapMatrix(), 300);
    return;
  }

  // Target toggle (overview ↔ spot)
  if (name === 'target') {
    const current = state.voacapTarget;
    const next = current === 'overview' ? 'spot' : 'overview';
    state.voacapTarget = next;
    localStorage.setItem('hamtab_voacap_target', next);
    fetchVoacapMatrix(); // refetch with new target mode
    return;
  }

  let options, key, stateKey;
  if (name === 'power') {
    options = POWER_OPTIONS; key = 'hamtab_voacap_power'; stateKey = 'voacapPower';
  } else if (name === 'mode') {
    options = MODE_OPTIONS; key = 'hamtab_voacap_mode'; stateKey = 'voacapMode';
  } else if (name === 'toa') {
    options = TOA_OPTIONS; key = 'hamtab_voacap_toa'; stateKey = 'voacapToa';
  } else if (name === 'path') {
    options = PATH_OPTIONS; key = 'hamtab_voacap_path'; stateKey = 'voacapPath';
  } else return;

  const current = state[stateKey];
  const idx = options.indexOf(current);
  const next = options[(idx + 1) % options.length];

  state[stateKey] = next;
  localStorage.setItem(key, next);

  renderVoacapMatrix(); // instant UI feedback — update parameter bar labels

  // Debounce server fetch — batch rapid button clicks into one request (300 ms)
  clearTimeout(state.voacapParamTimer);
  state.voacapParamTimer = setTimeout(() => fetchVoacapMatrix(), 300);

  // Re-draw map overlay if one is active
  if (state.hfPropOverlayBand) {
    clearBandOverlay();
    clearHeatmap();
    if (state.heatmapOverlayMode === 'heatmap') {
      renderHeatmapCanvas(state.hfPropOverlayBand);
    } else {
      drawBandOverlay(state.hfPropOverlayBand);
    }
  }
}

// Build opts object from current VOACAP state for calculation functions
export function getVoacapOpts() {
  return {
    lat: state.myLat,
    lon: state.myLon,
    mode: state.voacapMode,
    powerWatts: parseInt(state.voacapPower, 10),
    toaDeg: parseInt(state.voacapToa, 10),
    longPath: state.voacapPath === 'LP',
  };
}

// --- Server Fetch ---

export async function fetchVoacapMatrix() {
  if (state.myLat == null || state.myLon == null) {
    // No location — render from client-side model
    renderVoacapMatrix();
    return;
  }

  console.log(`[VOACAP] fetchVoacapMatrix called, target=${state.voacapTarget}, selectedSpot=${state.selectedSpotId}, sensitivity=${state.voacapSensitivity}`);

  // Cancel any in-flight fetch to prevent stale responses overwriting newer data
  if (activeFetchController) activeFetchController.abort();
  if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  const controller = new AbortController();
  activeFetchController = controller;

  // Compute the required SNR for the current mode and sensitivity level
  const sensLevel = SENSITIVITY_LEVELS[state.voacapSensitivity] || SENSITIVITY_LEVELS[DEFAULT_SENSITIVITY];
  const currentSnr = sensLevel[state.voacapMode] ?? sensLevel.SSB;

  const params = new URLSearchParams({
    txLat: state.myLat,
    txLon: state.myLon,
    power: state.voacapPower,
    mode: state.voacapMode,
    toa: state.voacapToa,
    path: state.voacapPath,
    snr: currentSnr,
  });

  // If in "spot" mode and a spot is selected, add RX coordinates
  if (state.voacapTarget === 'spot' && state.selectedSpotId) {
    try {
      const spot = findSelectedSpot();
      const spotLat = parseFloat(spot?.latitude);
      const spotLon = parseFloat(spot?.longitude);
      console.log(`[VOACAP] Spot lookup: found=${!!spot}, lat=${spotLat}, lon=${spotLon}`);
      if (!isNaN(spotLat) && !isNaN(spotLon)) {
        params.set('rxLat', spotLat);
        params.set('rxLon', spotLon);
      }
    } catch (err) {
      console.warn('[VOACAP] Spot lookup error:', err);
    }
  }

  try {
    const timeout = setTimeout(() => controller.abort(), 25000);
    const resp = await fetch(`/api/voacap?${params}`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Only store if this is still the active request (not superseded)
    if (activeFetchController === controller) {
      state.voacapServerData = data;
      state.voacapEngine = data.engine || 'simplified';
      state.voacapLastFetch = Date.now();
      retryCount = 0; // reset on success

      // Diagnostic: log what the server returned for spot mode debugging
      if (state.voacapTarget === 'spot') {
        const hasSignal = matrixHasSignal(data.matrix);
        const peakRel = Math.max(...data.matrix.flatMap(e =>
          Object.values(e.bands).map(b => typeof b === 'object' ? (b.rel || 0) : (b || 0))
        ));
        console.log(`[VOACAP] SPOT fetch: engine=${data.engine}, rxLat=${params.get('rxLat')}, rxLon=${params.get('rxLon')}, peakRel=${peakRel}%, hasSignal=${hasSignal}${data.fallbackReason ? ', fallback=' + data.fallbackReason : ''}`);
      }
    }
  } catch (err) {
    // Ignore aborts from superseded requests
    if (err.name === 'AbortError') { console.log('[VOACAP] Fetch aborted (superseded)'); return; }
    console.warn(`[VOACAP] Fetch error: ${err.message}`);

    // Schedule retry for transient errors (HTTP 500, cold starts, network hiccups)
    if (retryCount < MAX_RETRIES && activeFetchController === controller) {
      retryCount++;
      console.log(`[VOACAP] Retry ${retryCount}/${MAX_RETRIES} in ${FETCH_RETRY_MS / 1000}s`);
      retryTimer = setTimeout(() => {
        retryTimer = null;
        fetchVoacapMatrix();
      }, FETCH_RETRY_MS);
    }
    // Keep existing data or fall back to client-side model
  }

  renderVoacapMatrix();
}

// Throttled fetch — retries sooner if last response was simplified (server still starting)
export function fetchVoacapMatrixThrottled() {
  const throttle = state.voacapEngine === 'dvoacap' ? FETCH_THROTTLE_MS : FETCH_RETRY_MS;
  if (Date.now() - state.voacapLastFetch < throttle) return;
  fetchVoacapMatrix();
}

// Find the currently selected spot for DX target mode
function findSelectedSpot() {
  if (!state.selectedSpotId) return null;
  const source = state.currentSource;
  const spots = state.sourceData[source] || [];
  const def = SOURCE_DEFS[source];
  if (!def || !def.spotId) return null;
  return spots.find(s => def.spotId(s) === state.selectedSpotId);
}

// --- Rendering ---

// Check if a matrix has any meaningful propagation (any band > 5% at any hour)
function matrixHasSignal(matrix) {
  for (const entry of matrix) {
    for (const val of Object.values(entry.bands)) {
      const rel = typeof val === 'object' ? (val.rel || 0) : (val || 0);
      if (rel >= 5) return true;
    }
  }
  return false;
}

// Get the active matrix — prefer server data, fall back to client-side model
function getActiveMatrix() {
  // If we have recent server data, use it
  if (state.voacapServerData && state.voacapServerData.matrix) {
    const serverMatrix = state.voacapServerData.matrix;

    // In SPOT mode, if dvoacap returned all-zero for this path (skip zone,
    // dead path, etc.), fall back to overview band conditions so the widget
    // stays useful. The "no-prop" badge will indicate the specific path is dead.
    if (state.voacapTarget === 'spot' && !matrixHasSignal(serverMatrix)) {
      const opts = getVoacapOpts();
      return calculate24HourMatrix(opts);
    }

    return serverMatrix;
  }

  // Fall back to client-side simplified model
  const opts = getVoacapOpts();
  return calculate24HourMatrix(opts);
}

// Extract reliability from a matrix entry's band data
// Server format: { rel, snr, mode }; client format: number (plain reliability)
function getBandReliability(hourData, bandName) {
  const bandVal = hourData.bands[bandName];
  if (bandVal == null) return 0;
  if (typeof bandVal === 'object') return bandVal.rel || 0;
  return bandVal; // plain number from client-side model
}

export function renderVoacapMatrix() {
  const container = $('voacapMatrix');
  if (!container) return;

  const matrix = getActiveMatrix();

  // Check if we have valid data
  const hasData = matrix.some(entry => Object.keys(entry.bands).length > 0);

  if (!hasData) {
    container.innerHTML = '<div class="voacap-no-data">Waiting for solar data...</div>';
    return;
  }

  // In SPOT mode, check if the server returned all-zero for this path (skip zone, dead path).
  // getActiveMatrix() already falls back to overview data in that case, so the table renders
  // useful band conditions — but we flag it so the user knows the specific path is dead.
  const spotPathDead = state.voacapTarget === 'spot'
    && state.voacapServerData?.matrix
    && !matrixHasSignal(state.voacapServerData.matrix);

  // Current UTC hour
  const nowHour = new Date().getUTCHours();

  // Build hour order starting from current hour (now at left edge)
  const hourOrder = [];
  for (let i = 0; i < 24; i++) {
    hourOrder.push((nowHour + i) % 24);
  }

  // Bands reversed: 10m at top, 80m at bottom
  const bandsReversed = [...VOACAP_BANDS].reverse();

  // Build table
  let html = '<table class="voacap-table"><tbody>';

  // Band rows
  for (const band of bandsReversed) {
    const isOverlayActive = state.hfPropOverlayBand === band.name;
    const activeClass = isOverlayActive ? 'voacap-row-active' : '';

    html += `<tr class="voacap-row ${activeClass}" data-band="${band.name}">`;
    html += `<td class="voacap-band-label">${band.label}</td>`;

    for (let i = 0; i < 24; i++) {
      const h = hourOrder[i];
      const hourData = matrix[h];
      const reliability = getBandReliability(hourData, band.name);
      const color = getReliabilityColor(reliability);
      const isNow = i === 0; // first column = current hour
      const nowClass = isNow ? 'voacap-cell-now' : '';

      html += `<td class="voacap-cell ${nowClass}" style="background-color: ${color}" title="${band.label} @ ${String(h).padStart(2, '0')}z: ${reliability}%"></td>`;
    }

    html += '</tr>';
  }

  // Hour labels row at bottom (every 3 hours for compactness)
  html += '<tr class="voacap-hour-row"><td class="voacap-band-label"></td>';
  for (let i = 0; i < 24; i++) {
    const h = hourOrder[i];
    if (i % 3 === 0) {
      const isNow = i === 0;
      const nowClass = isNow ? 'voacap-hour-now' : '';
      html += `<td class="voacap-hour-label ${nowClass}" colspan="3">${String(h).padStart(2, '0')}</td>`;
    }
  }
  html += '</tr>';

  html += '</tbody></table>';

  // Engine badge
  const engineLabel = state.voacapEngine === 'dvoacap' ? 'VOACAP' : 'SIM';
  const engineClass = state.voacapEngine === 'dvoacap' ? 'voacap-engine-real' : 'voacap-engine-sim';
  const engineTitle = state.voacapEngine === 'dvoacap'
    ? 'Using real VOACAP propagation model'
    : 'Using simplified propagation model';

  // Target toggle
  const targetLabel = state.voacapTarget === 'spot' ? 'SPOT' : 'OVW';
  const targetTitle = state.voacapTarget === 'spot'
    ? 'Showing prediction to selected spot (click for overview)'
    : 'Showing average worldwide prediction (click for spot mode)';

  // SSN display — prefer server data, show K-index degradation warning
  const serverData = state.voacapServerData;
  const effectiveSSN = serverData?.ssn ? Math.round(serverData.ssn) : null;
  const baseSSN = serverData?.ssnBase ? Math.round(serverData.ssnBase) : null;
  const kIndex = serverData?.kIndex;
  const kDegradation = serverData?.kDegradation || 0;
  const ssnDisplay = effectiveSSN ?? (state.lastSolarData?.indices?.sunspots || '--');

  // Show warning indicator for K>=4 (storm conditions causing significant degradation)
  const isStorm = kIndex !== null && kIndex >= 4;
  const ssnWarningClass = isStorm ? ' voacap-k-warning' : '';
  const ssnWarningIndicator = isStorm ? '!' : '';

  // Build tooltip explaining SSN and K-index correction
  let ssnTitle = 'Smoothed sunspot number';
  if (kIndex !== null && baseSSN !== null) {
    if (kDegradation > 0) {
      ssnTitle = `K-index ${kIndex}: Base SSN ${baseSSN} \u2192 ${effectiveSSN} (-${kDegradation}%)`;
    } else {
      ssnTitle = `K-index ${kIndex}: SSN ${baseSSN} (no degradation)`;
    }
  }

  // Parameter bar
  const overlayLabel = state.heatmapOverlayMode === 'heatmap' ? 'REL' : '\u25CB'; // ○ for circles
  const overlayTitle = state.heatmapOverlayMode === 'heatmap'
    ? 'Overlay: REL heatmap (click for circles)'
    : 'Overlay: circles (click for REL heatmap)';
  html += `<div class="voacap-params">`;
  html += `<span class="voacap-engine-badge ${engineClass}" title="${engineTitle}">${engineLabel}</span>`;
  html += `<span class="voacap-param" data-param="target" title="${targetTitle}">${targetLabel}</span>`;
  const autoClass = state.voacapAutoSpot ? ' voacap-param-active' : '';
  const autoTitle = state.voacapAutoSpot
    ? 'Auto-SPOT: ON \u2014 clicking a spot refreshes VOACAP to that path (click to disable)'
    : 'Auto-SPOT: OFF \u2014 click to auto-refresh VOACAP when selecting a spot';
  html += `<span class="voacap-param${autoClass}" data-param="autospot" title="${autoTitle}">AUTO</span>`;
  html += `<span class="voacap-param" data-param="overlay" title="${overlayTitle}">${overlayLabel}</span>`;
  html += `<span class="voacap-param" data-param="power" title="TX Power (click to cycle)">${POWER_LABELS[state.voacapPower] || state.voacapPower}</span>`;
  html += `<span class="voacap-param" data-param="mode" title="Mode (click to cycle)">${state.voacapMode}</span>`;
  html += `<span class="voacap-param" data-param="toa" title="Takeoff angle (click to cycle)">${state.voacapToa}\u00B0</span>`;
  html += `<span class="voacap-param" data-param="path" title="Path type (click to cycle)">${state.voacapPath}</span>`;
  html += `<span class="voacap-param-static${ssnWarningClass}" title="${ssnTitle}">S=${ssnDisplay}${ssnWarningIndicator}</span>`;

  // Sensitivity level badge
  const sensLvl = state.voacapSensitivity;
  const sensInfo = SENSITIVITY_LEVELS[sensLvl] || SENSITIVITY_LEVELS[DEFAULT_SENSITIVITY];
  const sensDefault = sensLvl === DEFAULT_SENSITIVITY;
  const sensActiveClass = !sensDefault ? ' voacap-param-active' : '';
  const sensTooltip = `SNR Sensitivity: ${sensInfo.label} (${sensLvl}/${MAX_SENSITIVITY})\n`
    + `${sensInfo.desc}\n\n`
    + `Required S/N for ${state.voacapMode}: ${sensInfo[state.voacapMode]}dB\n\n`
    + `Higher = stricter (fewer paths workable)\n`
    + `Lower = more lenient (more paths workable)\n\n`
    + `Click to cycle \u2022 Shift+click to reset to Normal`;
  html += `<span class="voacap-param${sensActiveClass}" data-param="sensitivity" title="${sensTooltip}">SN${sensLvl}</span>`;

  html += `</div>`;

  // "No propagation" note when SPOT mode path is dead (showing overview fallback)
  if (spotPathDead) {
    html += `<div class="voacap-no-prop">No HF path to this station \u2014 showing overview</div>`;
  }

  // Color legend
  html += `<div class="voacap-legend">`;
  html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(0)}"></span>Closed</span>`;
  html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(20)}"></span>Poor</span>`;
  html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(50)}"></span>Fair</span>`;
  html += `<span class="voacap-legend-item"><span class="voacap-legend-swatch" style="background:${getReliabilityColor(80)}"></span>Good</span>`;
  html += `</div>`;

  container.innerHTML = html;
}

// --- Map Overlay ---

export function toggleBandOverlay(band) {
  // Clear existing overlays (both modes)
  clearBandOverlay();
  clearHeatmap();

  // If clicking the same band, just clear
  if (state.hfPropOverlayBand === band) {
    state.hfPropOverlayBand = null;
    renderVoacapMatrix();
    return;
  }

  // Set new active band
  state.hfPropOverlayBand = band;
  renderVoacapMatrix();

  // Dispatch to correct overlay mode
  if (state.heatmapOverlayMode === 'heatmap') {
    renderHeatmapCanvas(band);
  } else {
    drawBandOverlay(band);
  }
}

function clearBandOverlay() {
  if (!state.map) return;

  for (const circle of bandOverlayCircles) {
    state.map.removeLayer(circle);
  }
  bandOverlayCircles = [];
}

function drawBandOverlay(band) {
  if (!state.map || state.myLat == null || state.myLon == null) return;

  const L = window.L;
  const matrix = getActiveMatrix();
  const nowHour = new Date().getUTCHours();
  const hourData = matrix[nowHour];
  const reliability = getBandReliability(hourData, band);

  // Find the band definition (check VOACAP_BANDS first, fall back to HF_BANDS)
  const bandDef = VOACAP_BANDS.find(b => b.name === band) || HF_BANDS.find(b => b.name === band);
  if (!bandDef) return;

  // Draw concentric circles representing propagation reach
  const baseRadius = 500; // km — minimum radius
  const maxRadius = 15000; // km — roughly half Earth circumference

  // Scale radius by reliability percentage
  const radius = baseRadius + (maxRadius - baseRadius) * (reliability / 100);

  if (reliability < 10) {
    // Band is closed — draw small red circle
    const circle = L.circle([state.myLat, state.myLon], {
      radius: 500 * 1000, // 500 km in meters
      color: '#c0392b',
      fillColor: '#c0392b',
      fillOpacity: 0.1,
      weight: 1,
    });
    circle.addTo(state.map);
    bandOverlayCircles.push(circle);
    return;
  }

  // Draw graduated circles
  const steps = 4;
  for (let i = steps; i >= 1; i--) {
    const stepRadius = (radius / steps) * i;
    const stepReliability = reliability * (i / steps);
    const color = getReliabilityColor(stepReliability);

    const circle = L.circle([state.myLat, state.myLon], {
      radius: stepRadius * 1000, // km → meters
      color: color,
      fillColor: color,
      fillOpacity: 0.05 + (0.1 * (steps - i) / steps),
      weight: 1,
      dashArray: i === steps ? null : '4 4',
    });

    circle.addTo(state.map);
    bandOverlayCircles.push(circle);
  }

  // Center marker with band info
  const marker = L.marker([state.myLat, state.myLon], {
    icon: L.divIcon({
      className: 'voacap-center-marker',
      html: `<div class="voacap-center-label">${band}: ${reliability}%</div>`,
      iconSize: [80, 20],
      iconAnchor: [40, 10],
    }),
  });
  marker.addTo(state.map);
  bandOverlayCircles.push(marker);
}

// Export for cleanup on source change
export function clearVoacapOverlay() {
  clearBandOverlay();
  clearHeatmap();
  state.hfPropOverlayBand = null;
}

// Called by markers.js when a spot is selected — auto-switch to SPOT mode if enabled
export function onSpotSelected() {
  if (!state.voacapAutoSpot) return;
  if (state.voacapTarget !== 'spot') {
    state.voacapTarget = 'spot';
    localStorage.setItem('hamtab_voacap_target', 'spot');
  }
  fetchVoacapMatrix();
}

// Called by markers.js when a spot is deselected — revert to overview mode
export function onSpotDeselected() {
  if (!state.voacapAutoSpot) return;
  if (state.voacapTarget === 'spot') {
    state.voacapTarget = 'overview';
    localStorage.setItem('hamtab_voacap_target', 'overview');
  }
  state.voacapServerData = null; // clear stale spot-specific data
  fetchVoacapMatrix();
}
