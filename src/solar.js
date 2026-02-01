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

function condClass(cond) {
  const c = (cond || '').toLowerCase();
  if (c === 'good') return 'cond-good';
  if (c === 'fair') return 'cond-fair';
  if (c === 'poor') return 'cond-poor';
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

export async function fetchSolar() {
  try {
    const resp = await fetch('/api/solar');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    state.lastSolarData = data;
    renderSolar(data);
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

  // Band conditions in header strip
  const headerBandsRow = $('headerBandsRow');
  headerBandsRow.innerHTML = '';
  const bandMap = {};
  bands.forEach(b => {
    if (!bandMap[b.band]) bandMap[b.band] = {};
    bandMap[b.band][b.time] = b.condition;
  });

  const bandOrder = ['80m-40m', '30m-20m', '17m-15m', '12m-10m'];
  bandOrder.forEach(band => {
    if (!bandMap[band]) return;
    const day = bandMap[band]['day'] || '-';
    const night = bandMap[band]['night'] || '-';
    const item = document.createElement('div');
    item.className = 'header-band-item';
    const nameSpan = document.createElement('span');
    nameSpan.className = 'header-band-name';
    nameSpan.textContent = band;
    const daySpan = document.createElement('span');
    daySpan.className = 'header-band-day ' + condClass(day);
    daySpan.textContent = day;
    const sep = document.createElement('span');
    sep.textContent = '/';
    sep.style.color = 'var(--text-dim)';
    const nightSpan = document.createElement('span');
    nightSpan.className = 'header-band-night ' + condClass(night);
    nightSpan.textContent = night;
    item.appendChild(nameSpan);
    item.appendChild(daySpan);
    item.appendChild(sep);
    item.appendChild(nightSpan);
    headerBandsRow.appendChild(item);
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
      const coords = feature.geometry.coordinates;
      if (!coords || coords.length < 2) return;
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

  const rad = Math.PI / 180;
  const dec = Math.abs(sunDec) < 0.1 ? 0.1 : sunDec;
  const tanDec = Math.tan(dec * rad);

  const points = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / tanDec) / rad;
    points.push([lat, lon]);
  }

  if (dec >= 0) {
    points.push([-90, 180]);
    points.push([-90, -180]);
  } else {
    points.push([90, 180]);
    points.push([90, -180]);
  }

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

  const dayPoints = [];
  for (let lon = -180; lon <= 180; lon += 2) {
    const lat = Math.atan(-Math.cos((lon - sunLon) * rad) / tanDec) / rad;
    dayPoints.push([lat, lon]);
  }
  if (dec >= 0) {
    dayPoints.push([90, 180]);
    dayPoints.push([90, -180]);
  } else {
    dayPoints.push([-90, 180]);
    dayPoints.push([-90, -180]);
  }

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
