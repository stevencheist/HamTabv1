// --- REL Heatmap Overlay ---
// Renders a full-world propagation reliability heatmap on the Leaflet map.
// Each pixel represents the predicted reliability of a path from DE (user QTH) to that DX point,
// colored on a continuous HSL gradient (red→yellow→green).

import state from './state.js';
import { dayFraction, calculateMUF, calculateBandReliability, VOACAP_BANDS, HF_BANDS } from './band-conditions.js';
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

// --- Per-cell reliability pipeline ---
function computeCellReliability(deLat, deLon, dxLat, dxLon, freqMHz, sfi, kIndex, aIndex, utcHour, opts) {
  const mid = greatCircleMidpoint(deLat, deLon, dxLat, dxLon);
  const df = dayFraction(mid.lat, mid.lon, utcHour);
  const muf = calculateMUF(sfi, df);
  const isDay = df >= 0.5;
  const baseRel = calculateBandReliability(freqMHz, muf, kIndex, aIndex, isDay, opts);
  const dist = distanceKm(deLat, deLon, dxLat, dxLon);
  const distMod = distanceModifier(dist);

  return Math.max(0, Math.min(100, Math.round(baseRel * distMod)));
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
// Maps 0-100 reliability to a continuous HSL gradient:
// 0 = dark/transparent, 10 = red (hue 0), 50 = yellow (hue 60), 100 = green (hue 120)
function reliabilityToRGBA(rel) {
  if (rel < 5) return { r: 0, g: 0, b: 0, a: 30 }; // nearly transparent dark — band closed

  // Map 5-100 → hue 0° (red) to 120° (green)
  const hue = ((rel - 5) / 95) * 120;
  const { r, g, b } = hslToRgb(hue, 0.85, 0.45);

  // Alpha ramps up from low reliability
  const alpha = Math.min(200, 80 + (rel / 100) * 120); // 80–200 range
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

// --- Init (placeholder for future listeners) ---
export function initHeatmapListeners() {
  // Zoom/move re-render is handled in map-init.js
}
