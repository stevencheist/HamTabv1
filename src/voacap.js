// --- VOACAP DE→DX Module ---
// 24-hour x band reliability matrix with interactive parameters and map overlays

import state from './state.js';
import { $ } from './dom.js';
import { calculate24HourMatrix, getReliabilityColor, VOACAP_BANDS, HF_BANDS } from './band-conditions.js';
import { renderHeatmapCanvas, clearHeatmap } from './rel-heatmap.js';

// Store overlay circles on map
let bandOverlayCircles = [];

// --- Parameter cycling constants ---

const POWER_OPTIONS = ['5', '100', '1000'];
const POWER_LABELS = { '5': '5W', '100': '100W', '1000': '1kW' };
const MODE_OPTIONS  = ['CW', 'SSB', 'FT8'];
const TOA_OPTIONS   = ['3', '5', '10', '15'];
const PATH_OPTIONS  = ['SP', 'LP'];

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

  renderVoacapMatrix();

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

// --- Rendering ---

export function renderVoacapMatrix() {
  const container = $('voacapMatrix');
  if (!container) return;

  const opts = getVoacapOpts();
  const matrix = calculate24HourMatrix(opts);

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
      const reliability = hourData.bands[band.name] || 0;
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

  // Parameter bar
  const sn = state.lastSolarData?.indices?.sunspots || '--';
  const overlayLabel = state.heatmapOverlayMode === 'heatmap' ? 'REL' : '\u25CB'; // ○ for circles
  const overlayTitle = state.heatmapOverlayMode === 'heatmap'
    ? 'Overlay: REL heatmap (click for circles)'
    : 'Overlay: circles (click for REL heatmap)';
  html += `<div class="voacap-params">`;
  html += `<span class="voacap-param" data-param="overlay" title="${overlayTitle}">${overlayLabel}</span>`;
  html += `<span class="voacap-param" data-param="power" title="TX Power (click to cycle)">${POWER_LABELS[state.voacapPower] || state.voacapPower}</span>`;
  html += `<span class="voacap-param" data-param="mode" title="Mode (click to cycle)">${state.voacapMode}</span>`;
  html += `<span class="voacap-param" data-param="toa" title="Takeoff angle (click to cycle)">${state.voacapToa}\u00B0</span>`;
  html += `<span class="voacap-param" data-param="path" title="Path type (click to cycle)">${state.voacapPath}</span>`;
  html += `<span class="voacap-param-static" title="Sunspot number">S=${sn}</span>`;
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
  const opts = getVoacapOpts();
  const matrix = calculate24HourMatrix(opts);
  const nowHour = new Date().getUTCHours();
  const hourData = matrix[nowHour];
  const reliability = hourData.bands[band] || 0;

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
