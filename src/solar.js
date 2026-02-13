import state from './state.js';
import { $ } from './dom.js';
import { esc } from './utils.js';

// Color functions (exported for constants.js)
export function aColor(val) {
  const n = parseInt(val);
  if (isNaN(n)) return '';
  if (n < 10) return 'var(--green)';
  if (n < 30) return 'var(--yellow)';
  return 'var(--red)';
}

export function kColor(val) {
  const n = parseInt(val);
  if (isNaN(n)) return '';
  if (n <= 2) return 'var(--green)';
  if (n <= 4) return 'var(--yellow)';
  return 'var(--red)';
}

export function solarWindColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '';
  if (n < 400) return 'var(--green)';
  if (n < 600) return 'var(--yellow)';
  return 'var(--red)';
}

export function bzColor(val) {
  const n = parseFloat(val);
  if (isNaN(n)) return '';
  if (n >= 0) return 'var(--green)';
  if (n > -10) return 'var(--yellow)';
  return 'var(--red)';
}

export function auroraColor(val) {
  const n = parseInt(val);
  if (isNaN(n)) return '';
  if (n <= 3) return 'var(--green)';
  if (n <= 6) return 'var(--yellow)';
  return 'var(--red)';
}

export function geomagColor(val) {
  const s = (val || '').toLowerCase();
  if (s.includes('quiet')) return 'var(--green)';
  if (s.includes('unsettled') || s.includes('active')) return 'var(--yellow)';
  if (s.includes('storm') || s.includes('major')) return 'var(--red)';
  return '';
}

const SOLAR_VIS_KEY = 'hamtab_solar_fields';

export function loadSolarFieldVisibility() {
  // Lazy import to break circular dependency
  const { SOLAR_FIELD_DEFS } = require('./constants.js');
  try {
    const saved = JSON.parse(localStorage.getItem(SOLAR_VIS_KEY));
    if (saved && typeof saved === 'object') return saved;
  } catch (e) {}
  const vis = {};
  SOLAR_FIELD_DEFS.forEach(f => vis[f.key] = f.defaultVisible);
  return vis;
}

export function saveSolarFieldVisibility() {
  localStorage.setItem(SOLAR_VIS_KEY, JSON.stringify(state.solarFieldVisibility));
}

// --- Animated SDO frame state ---
let solarFrames = [];       // Array of preloaded Image objects
let solarFrameNames = [];   // Filenames of loaded frames (for incremental updates)
let solarFrameIndex = 0;
let solarPlaying = true;
let solarIntervalId = null;
let solarLoadingFrames = false;
let solarCurrentType = '';   // Track which SDO type is loaded

export function initSolarImage() {
  const select = $('solarImageType');
  const canvas = $('solarCanvas');
  const playBtn = $('solarPlayBtn');
  if (!select || !canvas) return;

  const saved = localStorage.getItem('hamtab_sdo_type');
  if (saved) select.value = saved;

  select.addEventListener('change', () => {
    localStorage.setItem('hamtab_sdo_type', select.value);
    // Type changed — full reload
    solarFrames = [];
    solarFrameNames = [];
    solarCurrentType = '';
    loadSolarFrames();
  });

  if (playBtn) {
    playBtn.addEventListener('click', () => {
      solarPlaying = !solarPlaying;
      playBtn.innerHTML = solarPlaying ? '&#9646;&#9646;' : '&#9654;';
      if (solarPlaying) startSolarAnimation();
      else stopSolarAnimation();
    });
  }

  loadSolarFrames();
}

function startSolarAnimation() {
  stopSolarAnimation();
  if (solarFrames.length < 2) return;
  solarIntervalId = setInterval(() => {
    solarFrameIndex = (solarFrameIndex + 1) % solarFrames.length;
    drawSolarFrame();
  }, 200);
}

function stopSolarAnimation() {
  if (solarIntervalId) { clearInterval(solarIntervalId); solarIntervalId = null; }
}

function drawSolarFrame() {
  const canvas = $('solarCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const img = solarFrames[solarFrameIndex];
  if (!img || !img.complete || !img.naturalWidth) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return;
  }
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
}

function preloadImage(filename) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = '/api/solar/frame/' + encodeURIComponent(filename);
  });
}

async function loadSolarFrames() {
  if (solarLoadingFrames) return;
  solarLoadingFrames = true;

  const select = $('solarImageType');
  const type = select ? select.value : '0193';
  const isFullReload = (type !== solarCurrentType || solarFrames.length === 0);

  // Only stop animation for full reloads
  if (isFullReload) stopSolarAnimation();

  try {
    const resp = await fetch('/api/solar/frames?type=' + encodeURIComponent(type));
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const filenames = await resp.json();

    if (!filenames.length) {
      loadSolarImageFallback(type);
      return;
    }

    if (isFullReload) {
      // Full load — preload all frames
      const loaded = await Promise.all(filenames.map(preloadImage));
      solarFrames = loaded.filter(Boolean);
      solarFrameNames = filenames.filter((fn, i) => loaded[i] !== null);
      solarFrameIndex = 0;
      solarCurrentType = type;
    } else {
      // Incremental — find new frames not yet loaded and append them
      const existingSet = new Set(solarFrameNames);
      const newNames = filenames.filter(fn => !existingSet.has(fn));
      if (newNames.length > 0) {
        const newImgs = await Promise.all(newNames.map(preloadImage));
        for (let i = 0; i < newNames.length; i++) {
          if (newImgs[i]) {
            solarFrames.push(newImgs[i]);
            solarFrameNames.push(newNames[i]);
          }
        }
        // Trim to last 48 frames if grown too large
        if (solarFrames.length > 48) {
          const excess = solarFrames.length - 48;
          solarFrames.splice(0, excess);
          solarFrameNames.splice(0, excess);
          if (solarFrameIndex >= excess) solarFrameIndex -= excess;
          else solarFrameIndex = 0;
        }
      }
    }

    if (solarFrames.length < 2) {
      loadSolarImageFallback(type);
      return;
    }

    if (isFullReload) {
      drawSolarFrame();
      const playBtn = $('solarPlayBtn');
      if (playBtn) playBtn.innerHTML = '&#9646;&#9646;';
      solarPlaying = true;
      startSolarAnimation();
    }
  } catch (err) {
    console.error('Failed to load SDO frames:', err);
    if (solarFrames.length === 0) loadSolarImageFallback(type);
  } finally {
    solarLoadingFrames = false;
  }
}

// Fall back to single latest image if frames fail
function loadSolarImageFallback(type) {
  solarCurrentType = type;
  const canvas = $('solarCanvas');
  if (!canvas) return;
  const img = new Image();
  img.onload = () => {
    solarFrames = [img];
    solarFrameNames = ['__fallback__'];
    solarFrameIndex = 0;
    drawSolarFrame();
  };
  img.src = '/api/solar/image?type=' + encodeURIComponent(type) + '&t=' + Date.now();
}

// Called by fetchSolar() on each refresh — do incremental update, not full reload
export function loadSolarImage() {
  loadSolarFrames();
}

export async function fetchSolar() {
  try {
    const resp = await fetch('/api/solar');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.lastSolarData = data;
    renderSolar(data);
    loadSolarImage();
    // Also update propagation widgets since they depend on solar data
    const { renderPropagationWidget } = await import('./band-conditions.js');
    renderPropagationWidget();
    const { renderVoacapMatrix } = await import('./voacap.js');
    renderVoacapMatrix();
    // Auto-enable D-RAP overlay when Kp ≥ 5 (geomagnetic storm)
    checkAutoStormOverlay(data);
  } catch (err) {
    console.error('Failed to fetch solar:', err);
  }
}

export function renderSolar(data) {
  const { SOLAR_FIELD_DEFS } = require('./constants.js');
  const { indices, bands } = data;
  const solarIndices = $('solarIndices');

  solarIndices.innerHTML = '';

  SOLAR_FIELD_DEFS.forEach(f => {
    if (state.solarFieldVisibility[f.key] === false) return;

    const rawVal = indices[f.key];
    const displayVal = (rawVal === '' || rawVal === undefined || rawVal === 'NoRpt')
      ? '-'
      : String(rawVal) + (f.unit || '');
    const color = f.colorFn ? f.colorFn(rawVal) : '';

    const div = document.createElement('div');
    div.className = 'solar-card';
    const labelDiv = document.createElement('div');
    labelDiv.className = 'label';
    labelDiv.textContent = f.label;
    const valueDiv = document.createElement('div');
    valueDiv.className = 'value';
    if (color) valueDiv.style.color = color;
    valueDiv.textContent = displayVal;
    div.appendChild(labelDiv);
    div.appendChild(valueDiv);
    solarIndices.appendChild(div);
  });
}

export async function fetchPropagation() {
  if (!state.map) return;

  if (state.propLayer) { state.map.removeLayer(state.propLayer); state.propLayer = null; }
  if (state.propLabelLayer) { state.map.removeLayer(state.propLabelLayer); state.propLabelLayer = null; }

  if (state.propMetric === 'off') return;

  try {
    const resp = await fetch(`/api/propagation?type=${encodeURIComponent(state.propMetric)}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    state.propLayer = L.geoJSON(data, {
      pane: 'propagation',
      interactive: false,
      style: (feature) => ({
        color: feature.properties.stroke || '#00ff00',
        weight: 2,
        opacity: 0.7,
        fill: false,
      }),
    }).addTo(state.map);

    state.propLabelLayer = L.layerGroup({ pane: 'propagation' }).addTo(state.map);
    data.features.forEach(feature => {
      // Flatten MultiLineString to a single coordinate array
      let coords = feature.geometry.coordinates;
      if (!coords || coords.length === 0) return;
      if (feature.geometry.type === 'MultiLineString') {
        coords = coords.reduce((a, b) => a.length >= b.length ? a : b, coords[0]);
      }
      if (coords.length < 2) return;
      const label = feature.properties.title || String(feature.properties['level-value']);
      const color = feature.properties.stroke || '#00ff00';
      const mid = coords[Math.floor(coords.length / 2)];
      const icon = L.divIcon({
        className: 'prop-label',
        html: `<span style="color:${color}">${esc(label.trim())} MHz</span>`,
        iconSize: null,
      });
      L.marker([mid[1], mid[0]], { icon, pane: 'propagation', interactive: false }).addTo(state.propLabelLayer);
    });
  } catch (err) {
    console.error('Failed to fetch propagation:', err);
  }
}

export function updateGrayLine() {
  if (!state.map) return;
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const dayOfYear = Math.floor((now - start) / 86400000);

  const sunDec = -23.44 * Math.cos((2 * Math.PI / 365) * (dayOfYear + 10));
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60 + now.getUTCSeconds() / 3600;
  const sunLon = -(utcHours - 12) * 15;

  // Store sub-solar position for sun marker
  state.sunLat = sunDec;
  state.sunLon = sunLon;

  const rad = Math.PI / 180;
  const dec = Math.abs(sunDec) < 0.1 ? 0.1 : sunDec;
  const tanDec = Math.tan(dec * rad);

  // Compute terminator once, reuse for night and day polygons
  const terminator = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / tanDec) / rad;
    terminator.push([lat, lon]);
  }

  const nightPole = dec >= 0 ? -90 : 90;
  const dayPole = -nightPole;

  const points = [...terminator, [nightPole, 180], [nightPole, -180]];

  if (state.grayLinePolygon) {
    state.grayLinePolygon.setLatLngs(points);
  } else {
    state.grayLinePolygon = L.polygon(points, {
      pane: 'grayline',
      color: '#445',
      weight: 1,
      fillColor: '#000',
      fillOpacity: 0.25,
      interactive: false,
    }).addTo(state.map);
  }

  const dayPoints = [...terminator, [dayPole, 180], [dayPole, -180]];

  if (state.dayPolygon) {
    state.dayPolygon.setLatLngs(dayPoints);
  } else {
    state.dayPolygon = L.polygon(dayPoints, {
      pane: 'grayline',
      color: 'transparent',
      weight: 0,
      fillColor: '#ffd54f',
      fillOpacity: 0.06,
      interactive: false,
    }).addTo(state.map);
  }
}

export function initPropListeners() {
  document.querySelectorAll('.prop-metric-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      state.propMetric = btn.dataset.metric;
      localStorage.setItem('hamtab_prop_metric', state.propMetric);
      document.querySelectorAll('.prop-metric-btn').forEach(b => b.classList.toggle('active', b.dataset.metric === state.propMetric));
      fetchPropagation();
    });
  });
  document.querySelectorAll('.prop-metric-btn').forEach(b => b.classList.toggle('active', b.dataset.metric === state.propMetric));

  document.querySelectorAll('.map-center-btn').forEach(btn => {
    btn.addEventListener('mousedown', (e) => e.stopPropagation());
    btn.addEventListener('click', () => {
      state.mapCenterMode = btn.dataset.center;
      localStorage.setItem('hamtab_map_center', state.mapCenterMode);
      document.querySelectorAll('.map-center-btn').forEach(b => b.classList.toggle('active', b.dataset.center === state.mapCenterMode));
      centerMap();
    });
  });
  document.querySelectorAll('.map-center-btn').forEach(b => b.classList.toggle('active', b.dataset.center === state.mapCenterMode));
}

export function centerMap() {
  if (!state.map) return;
  if (state.mapCenterMode === 'qth') {
    if (state.myLat !== null && state.myLon !== null) state.map.flyTo([state.myLat, state.myLon], 6, { duration: 0.8 });
  } else if (state.mapCenterMode === 'pm') {
    state.map.flyTo([0, 0], 2, { duration: 0.8 });
  } else if (state.mapCenterMode === 'spot') {
    if (state.selectedSpotId) {
      const allSpots = state.sourceFiltered[state.currentSource] || [];
      const { spotId } = require('./filters.js');
      const spot = allSpots.find(s => spotId(s) === state.selectedSpotId);
      if (spot) {
        const lat = parseFloat(spot.latitude);
        const lon = parseFloat(spot.longitude);
        if (!isNaN(lat) && !isNaN(lon)) state.map.flyTo([lat, lon], 5, { duration: 0.8 });
      }
    }
  }
}

// --- Auto Storm Overlay ---
// When Kp ≥ 5, auto-enable D-RAP absorption overlay to show HF blackout zones.
// Only auto-enables — never auto-disables (user may have turned it on manually).
let lastStormAutoEnabled = false;

async function checkAutoStormOverlay(data) {
  const kp = parseInt(data?.indices?.kindex);
  if (isNaN(kp)) return;

  if (kp >= 5 && !state.mapOverlays.drapOverlay && !lastStormAutoEnabled) {
    state.mapOverlays.drapOverlay = true;
    lastStormAutoEnabled = true;
    const { saveMapOverlays, renderDrapOverlay } = await import('./map-overlays.js');
    saveMapOverlays();
    renderDrapOverlay();
  } else if (kp < 5) {
    lastStormAutoEnabled = false; // reset so it can auto-enable again next storm
  }
}
