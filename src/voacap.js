// --- VOACAP DE→DX Module ---
// 24-hour x band reliability matrix with interactive parameters and map overlays.
// Fetches predictions from /api/voacap (real VOACAP engine or simplified fallback).

import state from './state.js';
import { $ } from './dom.js';
import { calculate24HourMatrix, getReliabilityColor, VOACAP_BANDS, HF_BANDS } from './band-conditions.js';
import { renderHeatmapCanvas, clearHeatmap } from './rel-heatmap.js';

// Store overlay circles on map
let bandOverlayCircles = [];

// Minimum interval between server fetches (5 min)
const FETCH_THROTTLE_MS = 5 * 60 * 1000;

// --- Parameter cycling constants ---

const POWER_OPTIONS = ['5', '100', '1000'];
const POWER_LABELS = { '5': '5W', '100': '100W', '1000': '1kW' };
const MODE_OPTIONS  = ['CW', 'SSB', 'FT8'];
const TOA_OPTIONS   = ['3', '5', '10', '15'];
const PATH_OPTIONS  = ['SP', 'LP'];
const TARGET_OPTIONS = ['overview', 'spot'];

// --- Initialization ---

export function initVoacapListeners() {
  const matrix = $('voacapMatrix');
  if (!matrix) return;

  // Delegated click handler for band rows and parameter bar
  matrix.addEventListener('click', (e) => {
    // Parameter cycling
    const param = e.target.closest('.voacap-param');
    if (param && param.dataset.param) {
      cycleParam(param.dataset.param);
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

  // Refetch from server with new parameters
  fetchVoacapMatrix();

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

  const params = new URLSearchParams({
    txLat: state.myLat,
    txLon: state.myLon,
    power: state.voacapPower,
    mode: state.voacapMode,
    toa: state.voacapToa,
    path: state.voacapPath,
  });

  // If in "spot" mode and a spot is selected, add RX coordinates
  if (state.voacapTarget === 'spot' && state.selectedSpotId) {
    const spot = findSelectedSpot();
    if (spot && spot.lat != null && spot.lon != null) {
      params.set('rxLat', spot.lat);
      params.set('rxLon', spot.lon);
    }
  }

  try {
    const resp = await fetch(`/api/voacap?${params}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    state.voacapServerData = data;
    state.voacapEngine = data.engine || 'simplified';
    state.voacapLastFetch = Date.now();
  } catch (err) {
    if (state.debug) console.error('VOACAP fetch error:', err);
    // Keep existing data or fall back to client-side model
  }

  renderVoacapMatrix();
}

// Throttled fetch — only fetches if enough time has passed
export function fetchVoacapMatrixThrottled() {
  if (Date.now() - state.voacapLastFetch < FETCH_THROTTLE_MS) return;
  fetchVoacapMatrix();
}

// Find the currently selected spot for DX target mode
function findSelectedSpot() {
  if (!state.selectedSpotId) return null;
  const source = state.currentSource;
  const spots = state.sourceData[source] || [];
  return spots.find(s => {
    // Different sources use different ID schemes
    if (source === 'pota') return s.spotId === state.selectedSpotId;
    if (source === 'sota') return s.id === state.selectedSpotId;
    return s.id === state.selectedSpotId || s.spotId === state.selectedSpotId;
  });
}

// --- Rendering ---

// Get the active matrix — prefer server data, fall back to client-side model
function getActiveMatrix() {
  // If we have recent server data, use it
  if (state.voacapServerData && state.voacapServerData.matrix) {
    return state.voacapServerData.matrix;
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
    : 'Showing best worldwide prediction (click for spot mode)';

  // SSN display — prefer server data
  const ssnDisplay = state.voacapServerData?.ssn
    ? Math.round(state.voacapServerData.ssn)
    : (state.lastSolarData?.indices?.sunspots || '--');

  // Parameter bar
  const overlayLabel = state.heatmapOverlayMode === 'heatmap' ? 'REL' : '\u25CB'; // ○ for circles
  const overlayTitle = state.heatmapOverlayMode === 'heatmap'
    ? 'Overlay: REL heatmap (click for circles)'
    : 'Overlay: circles (click for REL heatmap)';
  html += `<div class="voacap-params">`;
  html += `<span class="voacap-engine-badge ${engineClass}" title="${engineTitle}">${engineLabel}</span>`;
  html += `<span class="voacap-param" data-param="target" title="${targetTitle}">${targetLabel}</span>`;
  html += `<span class="voacap-param" data-param="overlay" title="${overlayTitle}">${overlayLabel}</span>`;
  html += `<span class="voacap-param" data-param="power" title="TX Power (click to cycle)">${POWER_LABELS[state.voacapPower] || state.voacapPower}</span>`;
  html += `<span class="voacap-param" data-param="mode" title="Mode (click to cycle)">${state.voacapMode}</span>`;
  html += `<span class="voacap-param" data-param="toa" title="Takeoff angle (click to cycle)">${state.voacapToa}\u00B0</span>`;
  html += `<span class="voacap-param" data-param="path" title="Path type (click to cycle)">${state.voacapPath}</span>`;
  html += `<span class="voacap-param-static" title="Smoothed sunspot number">S=${ssnDisplay}</span>`;
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
