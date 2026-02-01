import state from './state.js';
import { SOURCE_DEFS } from './constants.js';
import { esc } from './utils.js';
import { bearingTo, bearingToCardinal, distanceMi, localTimeAtLon } from './geo.js';
import { spotId } from './filters.js';
import { updateSpotDetail, clearSpotDetail } from './spot-detail.js';

let defaultIcon = null;
let selectedIcon = null;

function ensureIcons() {
  if (defaultIcon) return;
  defaultIcon = L.icon({
    iconUrl: 'vendor/images/marker-icon.png',
    iconRetinaUrl: 'vendor/images/marker-icon-2x.png',
    shadowUrl: 'vendor/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  selectedIcon = L.icon({
    iconUrl: 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41"><path d="M12.5 0C5.6 0 0 5.6 0 12.5C0 22 12.5 41 12.5 41S25 22 25 12.5C25 5.6 19.4 0 12.5 0z" fill="#ff9800"/><circle cx="12.5" cy="12.5" r="5" fill="#fff"/></svg>'),
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowUrl: 'vendor/images/marker-shadow.png',
    shadowSize: [41, 41],
  });
}

export function renderMarkers() {
  if (!state.map) return;
  ensureIcons();
  state.clusterGroup.clearLayers();
  state.markers = {};

  if (!SOURCE_DEFS[state.currentSource].hasMap) return;

  const filtered = state.sourceFiltered[state.currentSource] || [];

  filtered.forEach(spot => {
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (isNaN(lat) || isNaN(lon)) return;

    const sid = spotId(spot);
    const marker = L.marker([lat, lon], { icon: sid === state.selectedSpotId ? selectedIcon : defaultIcon });

    const displayCall = spot.callsign || spot.activator || '';
    const callsign = esc(displayCall);
    const qrzUrl = `https://www.qrz.com/db/${encodeURIComponent(displayCall)}`;
    let dirLine = '';
    let distLine = '';
    if (state.myLat !== null && state.myLon !== null) {
      const deg = bearingTo(state.myLat, state.myLon, lat, lon);
      const mi = Math.round(distanceMi(state.myLat, state.myLon, lat, lon));
      dirLine = `<div class="popup-dir">Direction: ${bearingToCardinal(deg)}</div>`;
      distLine = `<div class="popup-dist">Distance: ~${mi.toLocaleString()} mi</div>`;
    }
    const localTime = localTimeAtLon(lon, state.use24h);
    marker.bindPopup(`
      <div class="popup-call"><a href="${qrzUrl}" target="_blank" rel="noopener">${callsign}</a></div>
      <div class="popup-freq">${esc(spot.frequency || '')} ${esc(spot.mode || '')}</div>
      <div class="popup-park"><strong>${esc(spot.reference || '')}</strong> ${esc(spot.name || '')}</div>
      ${dirLine}
      ${distLine}
      <div class="popup-time">Local time: ${esc(localTime)}</div>
      ${spot.comments ? '<div style="margin-top:4px;font-size:0.78rem;color:#8899aa;">' + esc(spot.comments) + '</div>' : ''}
    `);

    marker.on('click', () => {
      selectSpot(sid);
    });

    state.markers[sid] = marker;
    state.clusterGroup.addLayer(marker);
  });
}

export function selectSpot(sid) {
  ensureIcons();
  const oldSid = state.selectedSpotId;

  if (oldSid && state.markers[oldSid]) {
    state.markers[oldSid].setIcon(defaultIcon);
  }

  state.selectedSpotId = sid;

  if (sid && state.markers[sid]) {
    state.markers[sid].setIcon(selectedIcon);
  }

  if (state.clusterGroup) {
    if (oldSid && state.markers[oldSid]) {
      const oldParent = state.clusterGroup.getVisibleParent(state.markers[oldSid]);
      if (oldParent && oldParent !== state.markers[oldSid] && oldParent._icon) {
        oldParent._icon.classList.remove('marker-cluster-selected');
      }
    }
    if (sid && state.markers[sid]) {
      const newParent = state.clusterGroup.getVisibleParent(state.markers[sid]);
      if (newParent && newParent !== state.markers[sid] && newParent._icon) {
        newParent._icon.classList.add('marker-cluster-selected');
      }
    }
  }

  document.querySelectorAll('#spotsBody tr').forEach(tr => {
    tr.classList.toggle('selected', tr.dataset.spotId === sid);
  });

  const selectedRow = document.querySelector(`#spotsBody tr[data-spot-id="${CSS.escape(sid)}"]`);
  if (selectedRow) {
    selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // Update spot detail widget
  if (sid) {
    const filtered = state.sourceFiltered[state.currentSource] || [];
    const spot = filtered.find(s => spotId(s) === sid);
    if (spot) updateSpotDetail(spot);
    else clearSpotDetail();
  } else {
    clearSpotDetail();
  }
}

export function flyToSpot(spot) {
  if (!state.map) return;
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  if (isNaN(lat) || isNaN(lon)) return;

  const sid = spotId(spot);
  selectSpot(sid);

  if (state.mapCenterMode === 'spot') {
    state.map.flyTo([lat, lon], 5, { duration: 0.8 });
  }

  const marker = state.markers[sid];
  if (marker) {
    marker.openPopup();
  }
}
