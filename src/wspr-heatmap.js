// --- WSPR QTH-Relative Propagation Heatmap ---
// Renders a canvas heatmap overlay showing measured propagation from real WSPR beacon data.
// Filters spots where TX or RX is within 500km of the user's QTH, then paints the
// distant end on the map colored by SNR. Shows "what bands are open for me right now"
// based on actual beacon reports — not predictions.

import state from './state.js';

// --- Constants ---
const QTH_RADIUS_KM = 500; // filter spots where TX or RX is within this of user QTH
const SNR_MIN = -30; // dB — color mapping floor
const SNR_MAX = 10;  // dB — color mapping ceiling

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

// --- Resolution by zoom level (matches rel-heatmap.js) ---
function cellSizeForZoom(zoom) {
  if (zoom <= 3) return 4;   // degrees
  if (zoom <= 5) return 2;
  if (zoom <= 7) return 1;
  return 0.5;
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

// --- SNR → RGBA pixel ---
// Maps SNR [-30, +10] dB to red→yellow→green gradient (same visual language as VOACAP heatmap).
// Lower SNR = red (weak/marginal), higher SNR = green (strong/reliable).
function snrToRGBA(snr) {
  const clamped = Math.max(SNR_MIN, Math.min(SNR_MAX, snr));
  // Map [-30, +10] → hue 0° (red) to 120° (green)
  const hue = ((clamped - SNR_MIN) / (SNR_MAX - SNR_MIN)) * 120;
  const { r, g, b } = hslToRgb(hue, 1.0, 0.50);
  // Alpha: brighter for stronger signals
  const alpha = Math.min(210, 140 + ((clamped - SNR_MIN) / (SNR_MAX - SNR_MIN)) * 70);
  return { r, g, b, a: Math.round(alpha) };
}

// --- Main render function ---
export function renderWsprHeatmapCanvas(band) {
  if (!state.map || state.myLat == null || state.myLon == null) return;

  const wspr = state.sourceData.wspr;
  if (!wspr || wspr.length === 0) return;

  const L = window.L;
  const map = state.map;

  // Remove previous overlay
  clearWsprHeatmap();

  // Filter spots by band
  const bandSpots = wspr.filter(s => s.band === band);
  if (bandSpots.length === 0) return;

  // Collect distant endpoints: for each spot, check if TX or RX is near QTH
  // If TX near QTH → record RX position (shows where my signal could reach)
  // If RX near QTH → record TX position (shows who I could hear)
  const endpoints = []; // { lat, lon, snr }

  for (const spot of bandSpots) {
    const txLat = spot.latitude;
    const txLon = spot.longitude;
    const rxLat = spot.rxLat;
    const rxLon = spot.rxLon;
    const snr = parseFloat(spot.snr);

    if (isNaN(snr)) continue;
    if (txLat == null || txLon == null || rxLat == null || rxLon == null) continue;

    const txDist = distanceKm(state.myLat, state.myLon, txLat, txLon);
    const rxDist = distanceKm(state.myLat, state.myLon, rxLat, rxLon);

    // TX near QTH → paint RX location
    if (txDist <= QTH_RADIUS_KM) {
      endpoints.push({ lat: rxLat, lon: rxLon, snr });
    }
    // RX near QTH → paint TX location
    if (rxDist <= QTH_RADIUS_KM) {
      endpoints.push({ lat: txLat, lon: txLon, snr });
    }
  }

  if (endpoints.length === 0) return;

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

  // Bucket endpoints into grid cells — accumulate SNR values for averaging
  const grid = {}; // key: "row,col" → { sum, count }

  for (const ep of endpoints) {
    const col = Math.floor((ep.lon - west) / cellSize);
    const row = Math.floor((north - ep.lat) / cellSize); // north at top
    if (col < 0 || col >= cols || row < 0 || row >= rows) continue;
    const key = row * cols + col;
    if (!grid[key]) grid[key] = { sum: 0, count: 0 };
    grid[key].sum += ep.snr;
    grid[key].count++;
  }

  // Create off-screen canvas
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d');
  const imageData = ctx.createImageData(cols, rows);
  const data = imageData.data;

  // Paint cells with averaged SNR
  for (const keyStr of Object.keys(grid)) {
    const key = parseInt(keyStr, 10);
    const cell = grid[key];
    const avgSnr = cell.sum / cell.count;
    const px = snrToRGBA(avgSnr);
    const idx = key * 4;
    data[idx] = px.r;
    data[idx + 1] = px.g;
    data[idx + 2] = px.b;
    data[idx + 3] = px.a;
  }

  ctx.putImageData(imageData, 0, 0);

  // Convert to data URL and create L.imageOverlay
  const dataUrl = canvas.toDataURL();
  const imageBounds = [[south, west], [north, east]];

  state.wsprHeatmapLayer = L.imageOverlay(dataUrl, imageBounds, {
    opacity: 0.7,
    pane: 'propagation', // z-index 300, below mapOverlays (350)
  });
  state.wsprHeatmapLayer.addTo(map);
}

// --- Clear heatmap overlay ---
export function clearWsprHeatmap() {
  if (state.wsprHeatmapLayer && state.map) {
    state.map.removeLayer(state.wsprHeatmapLayer);
    state.wsprHeatmapLayer = null;
  }
}

// --- Floating WSPR Heatmap Legend (Leaflet control) ---
// Displays band name, gradient bar (red→yellow→green), and SNR labels.

let wsprHeatmapLegendControl = null;

export function renderWsprHeatmapLegend(band) {
  clearWsprHeatmapLegend();
  if (!state.map) return;

  const L = window.L;

  const WsprLegend = L.Control.extend({
    options: { position: 'bottomleft' },
    onAdd() {
      const div = L.DomUtil.create('div', 'wspr-heatmap-legend');
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      div.innerHTML =
        '<div class="wspr-heatmap-legend-title">WSPR ' + (band || '20m') + ' from QTH</div>' +
        '<div class="wspr-heatmap-legend-bar"></div>' +
        '<div class="wspr-heatmap-legend-labels"><span>-30 dB</span><span>-10 dB</span><span>+10 dB</span></div>';
      return div;
    },
  });

  wsprHeatmapLegendControl = new WsprLegend();
  state.map.addControl(wsprHeatmapLegendControl);
}

export function clearWsprHeatmapLegend() {
  if (wsprHeatmapLegendControl && state.map) {
    state.map.removeControl(wsprHeatmapLegendControl);
    wsprHeatmapLegendControl = null;
  }
}
