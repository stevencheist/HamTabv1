import state from './state.js';

export function renderAllMapOverlays() {
  if (!state.map) return;
  renderLatLonGrid();
  renderMaidenheadGrid();
  renderTimezoneGrid();
  renderMufImageOverlay();
  renderTropicsLines();
  renderWeatherRadar();
  renderSymbolLegend();
}

export function renderLatLonGrid() {
  if (state.latLonLayer) { state.map.removeLayer(state.latLonLayer); state.latLonLayer = null; }
  if (!state.mapOverlays.latLonGrid) return;

  state.latLonLayer = L.layerGroup().addTo(state.map);
  const zoom = state.map.getZoom();
  let spacing = 30;
  if (zoom >= 8) spacing = 1;
  else if (zoom >= 6) spacing = 5;
  else if (zoom >= 3) spacing = 10;

  const bounds = state.map.getBounds();
  const labelLon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * 0.01;
  const labelLat = bounds.getSouth() + (bounds.getNorth() - bounds.getSouth()) * 0.01;
  const lineStyle = { color: '#4a90e2', weight: 1, opacity: 0.3, pane: 'mapOverlays', interactive: false };
  const equatorStyle = { color: '#4a90e2', weight: 3, opacity: 0.6, pane: 'mapOverlays', interactive: false };
  const pmStyle = { color: '#4a90e2', weight: 2, opacity: 0.5, pane: 'mapOverlays', interactive: false };

  for (let lat = -90; lat <= 90; lat += spacing) {
    const style = lat === 0 ? equatorStyle : lineStyle;
    L.polyline([[ lat, -180 ], [ lat, 180 ]], style).addTo(state.latLonLayer);
    if (lat >= bounds.getSouth() && lat <= bounds.getNorth()) {
      const ns = lat === 0 ? 'EQ' : (lat > 0 ? lat + '°N' : Math.abs(lat) + '°S');
      L.marker([lat, labelLon], {
        icon: L.divIcon({ className: 'grid-label latlon-label' + (lat === 0 ? ' latlon-equator' : ''), html: ns, iconSize: null }),
        pane: 'mapOverlays', interactive: false
      }).addTo(state.latLonLayer);
    }
  }
  for (let lon = -180; lon <= 180; lon += spacing) {
    const style = lon === 0 ? pmStyle : lineStyle;
    L.polyline([[ -85, lon ], [ 85, lon ]], style).addTo(state.latLonLayer);
    if (lon >= bounds.getWest() && lon <= bounds.getEast()) {
      const ew = lon === 0 ? 'PM' : (lon > 0 ? lon + '°E' : Math.abs(lon) + '°W');
      L.marker([labelLat, lon], {
        icon: L.divIcon({ className: 'grid-label latlon-label', html: ew, iconSize: null }),
        pane: 'mapOverlays', interactive: false
      }).addTo(state.latLonLayer);
    }
  }
}

export function renderMaidenheadGrid() {
  if (state.maidenheadLayer) { state.map.removeLayer(state.maidenheadLayer); state.maidenheadLayer = null; }
  if (!state.mapOverlays.maidenheadGrid) return;

  state.maidenheadLayer = L.layerGroup().addTo(state.map);
  const zoom = state.map.getZoom();
  const bounds = state.map.getBounds();
  const south = bounds.getSouth(), north = bounds.getNorth();
  const west = bounds.getWest(), east = bounds.getEast();

  if (zoom <= 5) {
    const lonStep = 20, latStep = 10;
    const lonStart = Math.floor((west + 180) / lonStep) * lonStep - 180;
    const latStart = Math.floor((south + 90) / latStep) * latStep - 90;
    for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
      for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
        const fieldLon = Math.floor((lon + 180) / 20);
        const fieldLat = Math.floor((lat + 90) / 10);
        if (fieldLon < 0 || fieldLon > 17 || fieldLat < 0 || fieldLat > 17) continue;
        const label = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat);
        L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
          color: '#ff6b35', weight: 1.5, fill: false, pane: 'mapOverlays', interactive: false
        }).addTo(state.maidenheadLayer);
        L.marker([lat + latStep / 2, lon + lonStep / 2], {
          icon: L.divIcon({ className: 'grid-label maidenhead-label', html: label, iconSize: null }),
          pane: 'mapOverlays', interactive: false
        }).addTo(state.maidenheadLayer);
      }
    }
  } else if (zoom <= 9) {
    const lonStep = 2, latStep = 1;
    const lonStart = Math.floor((west + 180) / lonStep) * lonStep - 180;
    const latStart = Math.floor((south + 90) / latStep) * latStep - 90;
    for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
      for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
        const fieldLon = Math.floor((lon + 180) / 20);
        const fieldLat = Math.floor((lat + 90) / 10);
        if (fieldLon < 0 || fieldLon > 17 || fieldLat < 0 || fieldLat > 17) continue;
        const sqLon = Math.floor(((lon + 180) % 20) / 2);
        const sqLat = Math.floor(((lat + 90) % 10) / 1);
        const label = String.fromCharCode(65 + fieldLon) + String.fromCharCode(65 + fieldLat) + sqLon + sqLat;
        L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
          color: '#ff6b35', weight: 1, fill: false, pane: 'mapOverlays', interactive: false
        }).addTo(state.maidenheadLayer);
        L.marker([lat + latStep / 2, lon + lonStep / 2], {
          icon: L.divIcon({ className: 'grid-label maidenhead-label-sm', html: label, iconSize: null }),
          pane: 'mapOverlays', interactive: false
        }).addTo(state.maidenheadLayer);
      }
    }
  } else {
    const lonStep = 5 / 60, latStep = 2.5 / 60;
    const lonStart = Math.floor(west / lonStep) * lonStep;
    const latStart = Math.floor(south / latStep) * latStep;
    for (let lon = lonStart; lon < east && lon < 180; lon += lonStep) {
      for (let lat = latStart; lat < north && lat < 90; lat += latStep) {
        const aLon = lon + 180, aLat = lat + 90;
        if (aLon < 0 || aLon >= 360 || aLat < 0 || aLat >= 180) continue;
        const fLon = Math.floor(aLon / 20), fLat = Math.floor(aLat / 10);
        const sLon = Math.floor((aLon % 20) / 2), sLat = Math.floor((aLat % 10) / 1);
        const ssLon = Math.floor(((aLon % 2) / (5 / 60))), ssLat = Math.floor(((aLat % 1) / (2.5 / 60)));
        L.rectangle([[lat, lon], [lat + latStep, lon + lonStep]], {
          color: '#ff6b35', weight: 0.5, fill: false, opacity: 0.5, pane: 'mapOverlays', interactive: false
        }).addTo(state.maidenheadLayer);
        if (zoom >= 12) {
          const label = String.fromCharCode(65 + fLon) + String.fromCharCode(65 + fLat) + sLon + sLat +
            String.fromCharCode(97 + Math.min(ssLon, 23)) + String.fromCharCode(97 + Math.min(ssLat, 23));
          L.marker([lat + latStep / 2, lon + lonStep / 2], {
            icon: L.divIcon({ className: 'grid-label maidenhead-label-xs', html: label, iconSize: null }),
            pane: 'mapOverlays', interactive: false
          }).addTo(state.maidenheadLayer);
        }
      }
    }
  }
}

export function renderTimezoneGrid() {
  if (state.timezoneLayer) { state.map.removeLayer(state.timezoneLayer); state.timezoneLayer = null; }
  if (!state.mapOverlays.timezoneGrid) return;

  state.timezoneLayer = L.layerGroup().addTo(state.map);
  const lineStyle = { color: '#9b59b6', weight: 1.5, opacity: 0.4, dashArray: '5,5', pane: 'mapOverlays', interactive: false };

  for (let i = -12; i <= 12; i++) {
    const lon = i * 15;
    L.polyline([[-85, lon], [85, lon]], lineStyle).addTo(state.timezoneLayer);
    const label = 'UTC' + (i === 0 ? '' : (i > 0 ? '+' + i : '' + i));
    L.marker([70, lon], {
      icon: L.divIcon({ className: 'grid-label timezone-label', html: label, iconSize: null }),
      pane: 'mapOverlays', interactive: false
    }).addTo(state.timezoneLayer);
  }
}

// --- MUF Image Overlay (prop.kc2g.com bare JPG) ---

let mufImageLayer = null;
let mufImageRefreshTimer = null;

export function renderMufImageOverlay() {
  // Remove existing layer
  if (mufImageLayer) { state.map.removeLayer(mufImageLayer); mufImageLayer = null; }
  if (mufImageRefreshTimer) { clearInterval(mufImageRefreshTimer); mufImageRefreshTimer = null; }
  if (!state.mapOverlays.mufImageOverlay) return;

  const L = window.L;
  const type = state.propMetric === 'fof2' ? 'fof2' : 'mufd';
  const url = `/api/propagation/image?type=${type}&_t=${Date.now()}`; // cache-bust
  const bounds = [[-90, -180], [90, 180]]; // Plate Carree covers full world

  mufImageLayer = L.imageOverlay(url, bounds, {
    opacity: 0.45,
    pane: 'propagation', // z-index 300, below mapOverlays (350)
    interactive: false,
  }).addTo(state.map);

  // Refresh every 15 minutes (prop.kc2g.com regenerates renders on that cadence)
  mufImageRefreshTimer = setInterval(() => {
    if (!state.mapOverlays.mufImageOverlay || !mufImageLayer) return;
    const freshUrl = `/api/propagation/image?type=${type}&_t=${Date.now()}`;
    mufImageLayer.setUrl(freshUrl);
  }, 15 * 60 * 1000); // 15 minutes
}

// --- Tropics & Arctic Lines ---

let tropicsLayer = null;

export function renderTropicsLines() {
  if (tropicsLayer) { state.map.removeLayer(tropicsLayer); tropicsLayer = null; }
  if (!state.mapOverlays.tropicsLines) return;

  tropicsLayer = L.layerGroup().addTo(state.map);

  const lines = [
    { lat: 66.5634,  name: 'Arctic Circle',        color: '#6ec6ff', dash: '8,6' },
    { lat: 23.4362,  name: 'Tropic of Cancer',      color: '#f0a050', dash: '8,6' },
    { lat: 0,        name: 'Equator',                color: '#f0d060', dash: null },
    { lat: -23.4362, name: 'Tropic of Capricorn',    color: '#f0a050', dash: '8,6' },
    { lat: -66.5634, name: 'Antarctic Circle',       color: '#6ec6ff', dash: '8,6' },
  ];

  const bounds = state.map.getBounds();
  const labelLon = bounds.getWest() + (bounds.getEast() - bounds.getWest()) * 0.02;

  for (const ln of lines) {
    const style = {
      color: ln.color, weight: ln.dash ? 1.5 : 2, opacity: 0.6,
      dashArray: ln.dash || undefined,
      pane: 'mapOverlays', interactive: false,
    };
    L.polyline([[ln.lat, -180], [ln.lat, 180]], style).addTo(tropicsLayer);

    // Label at left edge of viewport
    if (ln.lat >= bounds.getSouth() && ln.lat <= bounds.getNorth()) {
      const isArctic = Math.abs(ln.lat) > 60;
      L.marker([ln.lat, labelLon], {
        icon: L.divIcon({
          className: 'grid-label tropics-label' + (isArctic ? ' tropics-arctic' : ''),
          html: ln.name,
          iconSize: null,
        }),
        pane: 'mapOverlays', interactive: false,
      }).addTo(tropicsLayer);
    }
  }
}

// --- Weather Radar (RainViewer tile layer) ---

let weatherRadarLayer = null;
let weatherRadarTimer = null;

export function renderWeatherRadar() {
  if (weatherRadarLayer) { state.map.removeLayer(weatherRadarLayer); weatherRadarLayer = null; }
  if (weatherRadarTimer) { clearInterval(weatherRadarTimer); weatherRadarTimer = null; }
  if (!state.mapOverlays.weatherRadar) return;

  fetchRadarAndShow();
  weatherRadarTimer = setInterval(fetchRadarAndShow, 5 * 60 * 1000); // 5min refresh
}

async function fetchRadarAndShow() {
  try {
    const res = await fetch('/api/weather/radar');
    if (!res.ok) return;
    const data = await res.json();
    if (!data.host || !data.path) return;

    const tileUrl = `${data.host}${data.path}/256/{z}/{x}/{y}/2/1_1.png`;

    // Remove old layer before adding new one
    if (weatherRadarLayer) state.map.removeLayer(weatherRadarLayer);

    weatherRadarLayer = L.tileLayer(tileUrl, {
      opacity: 0.35,
      pane: 'propagation', // z-300, below mapOverlays (350)
      interactive: false,
      attribution: '&copy; RainViewer',
    }).addTo(state.map);
  } catch (e) {
    if (state.debug) console.error('Weather radar fetch failed:', e);
  }
}

// --- Symbol Legend (L.Control) ---

let legendControl = null;

export function renderSymbolLegend() {
  if (legendControl) { state.map.removeControl(legendControl); legendControl = null; }
  if (!state.mapOverlays.symbolLegend) return;

  const LegendControl = L.Control.extend({
    options: { position: 'bottomright' },
    onAdd() {
      const div = L.DomUtil.create('div', 'map-legend');
      L.DomEvent.disableClickPropagation(div);
      L.DomEvent.disableScrollPropagation(div);

      const items = [
        { symbol: '<span class="legend-dot" style="background:#4CAF50"></span>', label: 'POTA' },
        { symbol: '<span class="legend-dot" style="background:#FF9800"></span>', label: 'SOTA' },
        { symbol: '<span class="legend-dot" style="background:#f44336"></span>', label: 'DX Cluster' },
        { symbol: '<span class="legend-dot" style="background:#009688"></span>', label: 'WWFF' },
        { symbol: '<span class="legend-dot" style="background:#9C27B0"></span>', label: 'PSKReporter' },
        { symbol: '<span class="legend-circle" style="border-color:#FF9800"></span>', label: 'DXped (active)' },
        { symbol: '<span class="legend-circle" style="border-color:#888"></span>', label: 'DXped (upcoming)' },
        { symbol: '<span class="legend-dot legend-sun"></span>', label: 'Sun sub-point' },
        { symbol: '<span class="legend-dot legend-moon"></span>', label: 'Moon sub-point' },
        { symbol: '<span class="legend-line" style="border-color:#666"></span>', label: 'Gray line' },
        { symbol: '<span class="legend-line" style="border-color:#4a90e2"></span>', label: 'Geodesic path' },
        { symbol: '<span class="legend-dot legend-beacon"></span>', label: 'NCDXF beacon' },
      ];

      div.innerHTML = '<div class="legend-title">Legend</div>' +
        items.map(i => `<div class="legend-row">${i.symbol}<span class="legend-label">${i.label}</span></div>`).join('');
      return div;
    },
  });

  legendControl = new LegendControl();
  state.map.addControl(legendControl);
}

export function saveMapOverlays() {
  localStorage.setItem('hamtab_map_overlays', JSON.stringify(state.mapOverlays));
}
