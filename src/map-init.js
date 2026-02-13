import state from './state.js';
import { latLonToGrid } from './geo.js';
import { esc } from './utils.js';
import { renderAllMapOverlays, renderTropicsLines } from './map-overlays.js';
import { BEACONS, getActiveBeacons } from './beacons.js';

// --- Tile URL constants ---
const TILE_DARK = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_VOYAGER = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';

export function initMap() {
  const hasLeaflet = typeof L !== 'undefined' && L.map;
  if (!hasLeaflet) return;

  try {
    state.map = L.map('map', {
      worldCopyJump: true,
      maxBoundsViscosity: 1.0,
      maxBounds: [[-90, -180], [90, 180]],
      minZoom: 1,
    }).setView([39.8, -98.5], 4);

    state.tileLayer = L.tileLayer(TILE_DARK, {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
    }).addTo(state.map);

    state.clusterGroup = L.markerClusterGroup({
      maxClusterRadius: 40, // px — merge markers within 40px; keeps clusters tight on a dark basemap
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        const sizeClass = childCount < 10 ? 'small' : childCount < 100 ? 'medium' : 'large';
        let extraClass = '';
        if (state.selectedSpotId && state.markers[state.selectedSpotId]) {
          const children = cluster.getAllChildMarkers();
          if (children.indexOf(state.markers[state.selectedSpotId]) !== -1) {
            extraClass = ' marker-cluster-selected';
          }
        }
        return L.divIcon({
          html: '<div><span>' + childCount + '</span></div>',
          className: 'marker-cluster marker-cluster-' + sizeClass + extraClass,
          iconSize: L.point(40, 40),
        });
      },
    });
    state.map.addLayer(state.clusterGroup);

    state.map.createPane('grayline');
    state.map.getPane('grayline').style.zIndex = 250;

    state.map.createPane('propagation');
    state.map.getPane('propagation').style.zIndex = 300;

    state.map.createPane('mapOverlays');
    state.map.getPane('mapOverlays').style.zIndex = 350;
    state.map.getPane('mapOverlays').style.pointerEvents = 'none';

    state.map.on('zoomend', () => {
      if (state.mapOverlays.latLonGrid) {
        const { renderLatLonGrid } = require('./map-overlays.js');
        renderLatLonGrid();
      }
      if (state.mapOverlays.maidenheadGrid) {
        clearTimeout(state.maidenheadDebounceTimer);
        const { renderMaidenheadGrid } = require('./map-overlays.js');
        state.maidenheadDebounceTimer = setTimeout(renderMaidenheadGrid, 150);
      }
      if (state.mapOverlays.tropicsLines) renderTropicsLines();
      if (state.hfPropOverlayBand && state.heatmapOverlayMode === 'heatmap') {
        clearTimeout(state.heatmapRenderTimer);
        const { renderHeatmapCanvas } = require('./rel-heatmap.js');
        state.heatmapRenderTimer = setTimeout(() => renderHeatmapCanvas(state.hfPropOverlayBand), 200);
      }
    });
    state.map.on('moveend', () => {
      if (state.mapOverlays.latLonGrid) {
        const { renderLatLonGrid } = require('./map-overlays.js');
        renderLatLonGrid();
      }
      if (state.mapOverlays.maidenheadGrid) {
        clearTimeout(state.maidenheadDebounceTimer);
        const { renderMaidenheadGrid } = require('./map-overlays.js');
        state.maidenheadDebounceTimer = setTimeout(renderMaidenheadGrid, 150);
      }
      if (state.mapOverlays.tropicsLines) renderTropicsLines();
      if (state.hfPropOverlayBand && state.heatmapOverlayMode === 'heatmap') {
        clearTimeout(state.heatmapRenderTimer);
        const { renderHeatmapCanvas } = require('./rel-heatmap.js');
        state.heatmapRenderTimer = setTimeout(() => renderHeatmapCanvas(state.hfPropOverlayBand), 200);
      }
    });

    setTimeout(renderAllMapOverlays, 200);
  } catch (e) {
    console.error('Map initialization failed:', e);
    state.map = null;
    state.clusterGroup = null;
  }
}

export function centerMapOnUser() {
  if (!state.map) return;
  if (state.mapCenterMode === 'pm') {
    state.map.setView([0, 0], 2);
  } else if (state.mapCenterMode === 'qth') {
    if (state.myLat !== null && state.myLon !== null) {
      state.map.setView([state.myLat, state.myLon], state.map.getZoom());
    }
  }
}

export function updateUserMarker() {
  if (!state.map || state.myLat === null || state.myLon === null) return;
  const call = state.myCallsign || 'ME';
  const grid = latLonToGrid(state.myLat, state.myLon).substring(0, 4).toUpperCase();
  const popupHtml =
    `<div class="user-popup">` +
    `<div class="user-popup-title">${esc(call)}</div>` +
    `<div class="user-popup-row">${state.myLat.toFixed(4)}, ${state.myLon.toFixed(4)}</div>` +
    `<div class="user-popup-row">Grid: ${esc(grid)}</div>` +
    `<div class="user-popup-row">${state.manualLoc ? 'Manual override' : 'GPS'}</div>` +
    `</div>`;

  if (state.userMarker) {
    state.userMarker.setLatLng([state.myLat, state.myLon]);
    state.userMarker.setPopupContent(popupHtml);
    state.userMarker.setIcon(L.divIcon({
      className: 'user-icon',
      html: `<span class="user-icon-diamond">&#9889;</span><span class="user-icon-call">${esc(call)}</span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    }));
  } else {
    const icon = L.divIcon({
      className: 'user-icon',
      html: `<span class="user-icon-diamond">&#9889;</span><span class="user-icon-call">${esc(call)}</span>`,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    state.userMarker = L.marker([state.myLat, state.myLon], { icon, zIndexOffset: 9000 }).addTo(state.map); // high z-index keeps user marker above spot markers
    state.userMarker.bindPopup(popupHtml, { maxWidth: 200 });
  }
}

// --- Sun marker ---
export function updateSunMarker() {
  if (!state.map || state.sunLat === null || state.sunLon === null) return;
  const icon = L.divIcon({
    className: 'sun-marker-icon',
    html: '<span class="sun-marker-dot"></span>',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
  const tooltip = `Sub-solar point\n${state.sunLat.toFixed(1)}\u00B0, ${state.sunLon.toFixed(1)}\u00B0`;
  if (state.sunMarker) {
    state.sunMarker.setLatLng([state.sunLat, state.sunLon]);
  } else {
    state.sunMarker = L.marker([state.sunLat, state.sunLon], { icon, zIndexOffset: 8000, interactive: true })
      .addTo(state.map);
    state.sunMarker.bindTooltip(tooltip);
  }
  state.sunMarker.setTooltipContent(tooltip);
}

// --- Moon marker ---
// GMST calculation — Meeus, Astronomical Algorithms, Ch. 12
function gmstDegrees(date) {
  const JD = date.getTime() / 86400000 + 2440587.5; // Julian Date from Unix ms
  const T = (JD - 2451545.0) / 36525; // Julian centuries from J2000.0
  let gmst = 280.46061837 + 360.98564736629 * (JD - 2451545.0)
             + 0.000387933 * T * T - T * T * T / 38710000;
  return ((gmst % 360) + 360) % 360;
}

export function updateMoonMarker() {
  if (!state.map || !state.lastLunarData) return;
  const data = state.lastLunarData;
  const dec = data.declination; // sub-lunar latitude
  const ra = data.rightAscension; // degrees
  if (dec == null || ra == null) return;

  const now = new Date();
  const gmst = gmstDegrees(now);
  let moonLon = ra - gmst;
  // Normalize to [-180, 180]
  moonLon = ((moonLon + 180) % 360 + 360) % 360 - 180;

  state.moonLat = dec;
  state.moonLon = moonLon;

  const icon = L.divIcon({
    className: 'moon-marker-icon',
    html: '<span class="moon-marker-dot"></span>',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
  const tooltip = `Sub-lunar point\n${dec.toFixed(1)}\u00B0, ${moonLon.toFixed(1)}\u00B0`;
  if (state.moonMarker) {
    state.moonMarker.setLatLng([dec, moonLon]);
  } else {
    state.moonMarker = L.marker([dec, moonLon], { icon, zIndexOffset: 7500, interactive: true })
      .addTo(state.map);
    state.moonMarker.bindTooltip(tooltip);
  }
  state.moonMarker.setTooltipContent(tooltip);
}

// --- NCDXF Beacon markers ---
// Band → color mapping for the 5 beacon frequencies
const BEACON_COLORS = {
  14100: '#ff4444', // 20m — red
  18110: '#ff8800', // 17m — orange
  21150: '#ffff00', // 15m — yellow
  24930: '#00cc44', // 12m — green
  28200: '#4488ff', // 10m — blue
};

export function updateBeaconMarkers() {
  if (!state.map) return;
  const active = getActiveBeacons();

  // Remove old markers that are no longer active
  for (const key of Object.keys(state.beaconMarkers)) {
    state.map.removeLayer(state.beaconMarkers[key]);
    delete state.beaconMarkers[key];
  }

  // Add current active beacons
  for (const entry of active) {
    const { freq, beacon } = entry;
    const color = BEACON_COLORS[freq] || '#ffffff';
    const marker = L.circleMarker([beacon.lat, beacon.lon], {
      radius: 5,
      color,
      fillColor: color,
      fillOpacity: 0.8,
      weight: 1,
      interactive: true,
    }).addTo(state.map);
    marker.bindTooltip(`${beacon.call}\n${(freq / 1000).toFixed(3)} MHz\n${beacon.location}`);
    state.beaconMarkers[freq] = marker;
  }
}

// Swap map tiles based on theme (HamClock uses political/colored tiles)
export function swapMapTiles(themeId) {
  if (!state.tileLayer) return;
  const url = themeId === 'hamclock' ? TILE_VOYAGER : TILE_DARK;
  state.tileLayer.setUrl(url);
}
