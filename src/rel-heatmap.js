// --- REL Heatmap Overlay ---
// Renders a full-world propagation reliability heatmap on the Leaflet map.
// Each pixel represents the predicted reliability of a path from DE (user QTH) to that DX point,
// colored on a continuous HSL gradient (red→yellow→green).

import state from './state.js';
import { dayFraction, calculateMUF, VOACAP_BANDS, HF_BANDS } from './band-conditions.js';
import { getVoacapOpts } from './voacap.js';

// --- Great-circle midpoint (spherical) ---
// Returns the midpoint along the great-circle arc between two lat/lon pairs.
// Used to estimate the ionospheric reflection point for MUF/reliability calculation.
function greatCircleMidpoint(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const lat1r = lat1 * r, lon1r = lon1 * r;
  const lat2r = lat2 * r, lon2r = lon2 * r;
  const dLon = lon2r - lon1r;

  const Bx = Math.cos(lat2r) * Math.cos(dLon);
  const By = Math.cos(lat2r) * Math.sin(dLon);

  const midLat = Math.atan2(
    Math.sin(lat1r) + Math.sin(lat2r),
    Math.sqrt((Math.cos(lat1r) + Bx) ** 2 + By ** 2)
  );
  const midLon = lon1r + Math.atan2(By, Math.cos(lat1r) + Bx);

  return { lat: midLat / r, lon: midLon / r };
}

// --- Haversine distance in km ---
function distanceKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180;
  const R = 6371; // km — Earth mean radius
  const dLat = (lat2 - lat1) * r;
  const dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Distance modifier ---
// Adjusts reliability based on path distance: skip zone penalty, multi-hop attenuation.
function distanceModifier(distKm) {
  if (distKm < 100) return 0.3;    // ground wave only — skip zone
  if (distKm < 500) return 0.5;    // partial skip zone
  if (distKm < 1000) return 0.85;  // near skip — marginal
  if (distKm < 4000) return 1.0;   // optimal single/double hop range
  if (distKm < 8000) return 0.85;  // multi-hop attenuation
  if (distKm < 15000) return 0.7;  // long path attenuation
  return 0.5;                       // antipodal — severe attenuation
}

// --- Per-cell reliability for heatmap ---
// Uses a heatmap-specific model tuned for visual clarity on a dark basemap.
// The widget model's LUF threshold (50% of MUF) is too aggressive — it blanks
// everything below ~17 MHz during daytime, making 20m/40m/80m invisible.
//
// Physical model: any frequency below MUF CAN be reflected by the ionosphere.
// Optimal propagation occurs at 30-70% of MUF. Higher ratios approach MUF and
// risk penetration; lower ratios suffer increasing D-layer absorption (daytime).
// At night, D-layer recombines, so lower bands propagate much better.
function computeCellReliability(deLat, deLon, dxLat, dxLon, freqMHz, sfi, kIndex, aIndex, utcHour, opts) {
  const mid = greatCircleMidpoint(deLat, deLon, dxLat, dxLon);
  const df = dayFraction(mid.lat, mid.lon, utcHour);
  const muf = calculateMUF(sfi, df);
  const dist = distanceKm(deLat, deLon, dxLat, dxLon);

  let rel;
  const ratio = freqMHz / muf; // freq-to-MUF ratio

  if (ratio > 1.0) {
    // Above MUF — signal escapes ionosphere, rapid dropoff
    rel = Math.max(0, 15 - (ratio - 1.0) * 150);
  } else if (ratio > 0.85) {
    // Close to MUF — usable but risk of penetration increases
    rel = 90 - (ratio - 0.85) * 300; // 90 at 0.85 → ~45 at 1.0
  } else if (ratio >= 0.25) {
    // Main propagation zone (25-85% of MUF) — this is where most HF bands live.
    // Peak near 50% of MUF (sweet spot for ionospheric reflection).
    // D-layer absorption increases for lower ratios during daytime.
    const peak = 0.5;
    const distFromPeak = Math.abs(ratio - peak);
    const baseRel = 95 - distFromPeak * 60; // peaks at 95, tapers to edges
    // D-layer absorption penalty — scales with daylight and how low the frequency is
    const dLayerPenalty = df * Math.max(0, (0.5 - ratio)) * 80; // 0 penalty above peak, up to ~20 below
    rel = baseRel - dLayerPenalty;
  } else {
    // Very low ratio (<25% of MUF) — heavy absorption, marginal
    const nightBoost = (1 - df) * 30; // nighttime helps a lot
    rel = 20 + nightBoost - (0.25 - ratio) * 100;
  }

  // Geomagnetic disturbance penalty
  if (kIndex >= 6) rel -= (kIndex - 5) * 12;
  else if (kIndex >= 3) rel -= (kIndex - 2) * 5;
  if (aIndex > 30) rel -= Math.min(20, (aIndex - 30) / 2);
  else if (aIndex > 10) rel -= (aIndex - 10) / 4;

  // VOACAP parameter adjustments
  if (opts) {
    if (opts.mode === 'CW') rel += 8;
    else if (opts.mode === 'FT8') rel += 15;
    if (opts.powerWatts && opts.powerWatts !== 100) {
      rel += 10 * Math.log10(opts.powerWatts / 100) * 1.5;
    }
    if (opts.longPath) rel -= 30;
  }

  // Sensitivity adjustment — maps 1-5 to a reliability shift.
  // 1 (optimistic) = +20%, 3 (normal) = 0%, 5 (strict) = -20%
  const sens = state.voacapSensitivity || 3;
  rel += (3 - sens) * 10; // +20, +10, 0, -10, -20

  // Distance modifier
  const distMod = distanceModifier(dist);
  rel *= distMod;

  return Math.max(0, Math.min(100, Math.round(rel)));
}

// --- HSL to RGB conversion ---
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

// --- Reliability → RGBA pixel ---
// Maps 0-100 reliability to a vivid gradient readable on a dark basemap.
// Uses bright, saturated colors at high alpha for clear visual contrast.
// 0-10 = dark purple (closed), 10-40 = red, 40-60 = orange/yellow, 60-80 = yellow-green, 80-100 = bright green
function reliabilityToRGBA(rel) {
  if (rel < 3) return { r: 20, g: 0, b: 40, a: 60 }; // dark purple tint — band closed

  // Bright, vivid gradient: red (0°) → yellow (60°) → green (120°)
  // Map 3-100 → hue 0° to 120°
  const hue = (Math.min(rel, 100) - 3) / 97 * 120;
  const { r, g, b } = hslToRgb(hue, 1.0, 0.50); // full saturation, medium-bright lightness

  // Higher constant alpha so the overlay pops against the dark basemap
  const alpha = Math.min(210, 140 + (rel / 100) * 70); // 140–210 range
  return { r, g, b, a: Math.round(alpha) };
}

// --- Resolution by zoom level ---
function cellSizeForZoom(zoom) {
  if (zoom <= 3) return 4;   // degrees
  if (zoom <= 5) return 2;
  if (zoom <= 7) return 1;
  return 0.5;
}

// --- Main render function ---
export function renderHeatmapCanvas(band) {
  if (!state.map || state.myLat == null || state.myLon == null) return;
  if (!state.lastSolarData || !state.lastSolarData.indices) return;

  const L = window.L;
  const map = state.map;

  // Remove previous overlay
  clearHeatmap();

  // Find band frequency
  const bandDef = VOACAP_BANDS.find(b => b.name === band) || HF_BANDS.find(b => b.name === band);
  if (!bandDef) return;

  const { indices } = state.lastSolarData;
  const sfi = parseFloat(indices.sfi) || 70;
  const kIndex = parseInt(indices.kindex) || 2;
  const aIndex = parseInt(indices.aindex) || 5;
  const utcHour = new Date().getUTCHours();
  const opts = getVoacapOpts();

  // Viewport bounds
  const bounds = map.getBounds();
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());
  const west = bounds.getWest();
  const east = bounds.getEast();

  const zoom = map.getZoom();
  const cellSize = cellSizeForZoom(zoom);

  // Grid dimensions
  const cols = Math.ceil((east - west) / cellSize);
  const rows = Math.ceil((north - south) / cellSize);

  if (cols <= 0 || rows <= 0) return;

  // Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(cols, rows);
  const data = imageData.data;

  // Compute reliability per cell
  for (let row = 0; row < rows; row++) {
    // Latitude goes from north (top) to south (bottom)
    const dxLat = north - (row + 0.5) * cellSize;
    for (let col = 0; col < cols; col++) {
      const dxLon = west + (col + 0.5) * cellSize;

      const rel = computeCellReliability(
        state.myLat, state.myLon,
        dxLat, dxLon,
        bandDef.freqMHz, sfi, kIndex, aIndex, utcHour, opts
      );

      const px = reliabilityToRGBA(rel);
      const idx = (row * cols + col) * 4;
      data[idx] = px.r;
      data[idx + 1] = px.g;
      data[idx + 2] = px.b;
      data[idx + 3] = px.a;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Convert to data URL and create L.imageOverlay
  const dataUrl = canvas.toDataURL();
  const imageBounds = [[south, west], [north, east]];

  state.heatmapLayer = L.imageOverlay(dataUrl, imageBounds, {
    opacity: 0.7,
    pane: 'propagation',
  });
  state.heatmapLayer.addTo(map);
}

// --- Clear heatmap overlay ---
export function clearHeatmap() {
  if (state.heatmapLayer && state.map) {
    state.map.removeLayer(state.heatmapLayer);
    state.heatmapLayer = null;
  }
}

// --- Floating Heatmap Legend (Leaflet control) ---
// Displays band name, gradient bar (red→yellow→green), and 0%/50%/100% labels.

let heatmapLegendControl = null;

export function renderHeatmapLegend(band) {
  clearHeatmapLegend();
  if (!state.map) return;

  const L = window.L;

  const HeatmapLegend = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd() {
      const div = L.DomUtil.create('div', 'prop-heatmap-legend');
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      div.innerHTML =
        '<div class="prop-heatmap-legend-title">' + (band || '20m') + ' from QTH</div>' +
        '<div class="prop-heatmap-legend-bar"></div>' +
        '<div class="prop-heatmap-legend-labels"><span>0%</span><span>50%</span><span>100%</span></div>';
      return div;
    },
  });

  heatmapLegendControl = new HeatmapLegend();
  state.map.addControl(heatmapLegendControl);
}

export function clearHeatmapLegend() {
  if (heatmapLegendControl && state.map) {
    state.map.removeControl(heatmapLegendControl);
    heatmapLegendControl = null;
  }
}

// --- Init (placeholder for future listeners) ---
export function initHeatmapListeners() {
  // Zoom/move re-render is handled in map-init.js
}
