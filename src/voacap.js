// --- HF Propagation (VOACAP-style) Module ---
// 24-hour x band reliability matrix with map overlays

import state from './state.js';
import { $ } from './dom.js';
import { calculate24HourMatrix, getReliabilityColor, HF_BANDS } from './band-conditions.js';

// Store overlay circles on map
let bandOverlayCircles = [];

// --- Initialization ---

export function initVoacapListeners() {
  // Click on band rows to toggle overlay
  const matrix = $('voacapMatrix');
  if (matrix) {
    matrix.addEventListener('click', (e) => {
      const row = e.target.closest('.voacap-row');
      if (row && row.dataset.band) {
        toggleBandOverlay(row.dataset.band);
      }
    });
  }
}

// --- Rendering ---

export function renderVoacapMatrix() {
  const container = $('voacapMatrix');
  if (!container) return;

  const matrix = calculate24HourMatrix();

  // Check if we have valid data
  const hasData = matrix.some(entry => Object.keys(entry.bands).length > 0);

  if (!hasData) {
    container.innerHTML = '<div class="voacap-no-data">Waiting for solar data...</div>';
    return;
  }

  // Current UTC hour
  const nowHour = new Date().getUTCHours();

  // Build table
  let html = '<table class="voacap-table">';

  // Header row with hours (every 2 hours to save space)
  html += '<thead><tr><th class="voacap-band-header"></th>';
  for (let h = 0; h < 24; h += 2) {
    const isNow = h === nowHour || h + 1 === nowHour;
    const nowClass = isNow ? 'voacap-now' : '';
    html += `<th class="voacap-hour-header ${nowClass}" colspan="2">${String(h).padStart(2, '0')}</th>`;
  }
  html += '</tr></thead>';

  // Band rows
  html += '<tbody>';
  for (const band of HF_BANDS) {
    const isOverlayActive = state.hfPropOverlayBand === band.name;
    const activeClass = isOverlayActive ? 'voacap-row-active' : '';

    html += `<tr class="voacap-row ${activeClass}" data-band="${band.name}">`;
    html += `<td class="voacap-band-label">${band.label}</td>`;

    for (let h = 0; h < 24; h++) {
      const hourData = matrix[h];
      const reliability = hourData.bands[band.name] || 0;
      const color = getReliabilityColor(reliability);
      const isNow = h === nowHour;
      const nowClass = isNow ? 'voacap-cell-now' : '';

      html += `<td class="voacap-cell ${nowClass}" style="background-color: ${color}" title="${band.label} @ ${String(h).padStart(2, '0')}z: ${reliability}%"></td>`;
    }

    html += '</tr>';
  }
  html += '</tbody></table>';

  // Legend
  html += `
    <div class="voacap-legend">
      <span class="voacap-legend-item"><span class="voacap-legend-color" style="background: #1a1a1a"></span>Closed</span>
      <span class="voacap-legend-item"><span class="voacap-legend-color" style="background: #c0392b"></span>Poor</span>
      <span class="voacap-legend-item"><span class="voacap-legend-color" style="background: #f1c40f"></span>Fair</span>
      <span class="voacap-legend-item"><span class="voacap-legend-color" style="background: #27ae60"></span>Good</span>
    </div>
  `;

  container.innerHTML = html;
}

// --- Map Overlay ---

export function toggleBandOverlay(band) {
  // Clear existing overlay
  clearBandOverlay();

  // If clicking the same band, just clear
  if (state.hfPropOverlayBand === band) {
    state.hfPropOverlayBand = null;
    renderVoacapMatrix(); // Re-render to update active state
    return;
  }

  // Set new active band
  state.hfPropOverlayBand = band;
  renderVoacapMatrix(); // Re-render to update active state

  // Draw circles based on reliability at current hour
  drawBandOverlay(band);
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
  const matrix = calculate24HourMatrix();
  const nowHour = new Date().getUTCHours();
  const hourData = matrix[nowHour];
  const reliability = hourData.bands[band] || 0;

  // Find the band frequency
  const bandDef = HF_BANDS.find(b => b.name === band);
  if (!bandDef) return;

  // Draw concentric circles representing propagation reach
  // Radius scales with reliability and frequency
  // Lower frequencies propagate farther at night, higher frequencies during day

  const baseRadius = 500; // km base radius
  const maxRadius = 15000; // km max radius (roughly half Earth circumference)

  // Scale radius by reliability percentage
  const radius = baseRadius + (maxRadius - baseRadius) * (reliability / 100);

  if (reliability < 10) {
    // Band is closed - draw small red circle
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
      radius: stepRadius * 1000, // Convert km to meters
      color: color,
      fillColor: color,
      fillOpacity: 0.05 + (0.1 * (steps - i) / steps),
      weight: 1,
      dashArray: i === steps ? null : '4 4',
    });

    circle.addTo(state.map);
    bandOverlayCircles.push(circle);
  }

  // Add a center marker with band info
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
  state.hfPropOverlayBand = null;
}
