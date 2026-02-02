import state from './state.js';
import { latLonToGrid } from './geo.js';
import { esc } from './utils.js';
import { renderAllMapOverlays } from './map-overlays.js';

export function initMap() {
  const hasLeaflet = typeof L !== 'undefined' && L.map;
  if (!hasLeaflet) return;

  try {
    state.map = L.map('map', {
      worldCopyJump: true,
      maxBoundsViscosity: 1.0,
      maxBounds: [[-90, -180], [90, 180]],
      minZoom: 2,
    }).setView([39.8, -98.5], 4);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
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
