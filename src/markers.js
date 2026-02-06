import state from './state.js';
import { SOURCE_DEFS } from './constants.js';
import { esc } from './utils.js';
import { bearingTo, bearingToCardinal, distanceMi, localTimeAtLon, geodesicPoints, gridToLatLon } from './geo.js';
import { spotId } from './filters.js';
import { updateSpotDetail, clearSpotDetail } from './spot-detail.js';
import { setDedxSpot, clearDedxSpot } from './dedx-info.js';

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

// --- Geodesic line helpers ---

function clearGeodesicLine() {
  if (state.geodesicLine) {
    state.map.removeLayer(state.geodesicLine);
    state.geodesicLine = null;
  }
  if (state.geodesicLineLong) {
    state.map.removeLayer(state.geodesicLineLong);
    state.geodesicLineLong = null;
  }
}

function drawGeodesicLine(spot) {
  if (state.myLat == null || state.myLon == null || !state.map) return;

  let spotLat, spotLon;
  let fromGrid = false;

  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  if (!isNaN(lat) && !isNaN(lon)) {
    spotLat = lat;
    spotLon = lon;
  } else if (spot.grid4) {
    const center = gridToLatLon(spot.grid4);
    if (!center) return;
    spotLat = center.lat;
    spotLon = center.lon;
    fromGrid = true;
  } else {
    return;
  }

  const pts = geodesicPoints(state.myLat, state.myLon, spotLat, spotLon, 64); // 64 intermediate points for smooth arc

  // Helper: split points at dateline crossings
  function splitAtDateline(points) {
    const segments = [[]];
    for (let i = 0; i < points.length; i++) {
      segments[segments.length - 1].push(points[i]);
      if (i < points.length - 1) {
        if (Math.abs(points[i + 1][1] - points[i][1]) > 180) {
          segments.push([]);
        }
      }
    }
    return segments;
  }

  // Draw short path
  state.geodesicLine = L.polyline(splitAtDateline(pts), {
    color: '#ff9800',
    weight: 2,
    opacity: 0.7,
    dashArray: '6 4',
  });
  state.geodesicLine.addTo(state.map);

  // Draw long path (opposite direction around the great circle)
  // Compute via antipode of the short path midpoint
  const midIdx = Math.floor(pts.length / 2);
  const midPt = pts[midIdx];
  // Antipode: negate latitude, add 180° to longitude (normalize to -180,180)
  const antiLat = -midPt[0];
  let antiLon = midPt[1] + 180;
  if (antiLon > 180) antiLon -= 360;

  // Long path: QTH → antipode → spot
  const ptsToAnti = geodesicPoints(state.myLat, state.myLon, antiLat, antiLon, 48);
  const ptsFromAnti = geodesicPoints(antiLat, antiLon, spotLat, spotLon, 48);
  const longPts = [...ptsToAnti.slice(0, -1), ...ptsFromAnti]; // avoid duplicate middle point

  state.geodesicLineLong = L.polyline(splitAtDateline(longPts), {
    color: '#ff9800',
    weight: 1.5,
    opacity: 0.35,
    dashArray: '4 6',
  });
  state.geodesicLineLong.addTo(state.map);
}

export function renderMarkers() {
  if (!state.map) return;
  ensureIcons();
  clearGeodesicLine();
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
      const longPath = (Math.round(deg) + 180) % 360; // reverse azimuth
      const mi = distanceMi(state.myLat, state.myLon, lat, lon);
      const dist = state.distanceUnit === 'km' ? Math.round(mi * 1.60934) : Math.round(mi);
      dirLine = `<div class="popup-dir">SP: ${Math.round(deg)}° ${bearingToCardinal(deg)} · LP: ${longPath}° ${bearingToCardinal(longPath)}</div>`;
      distLine = `<div class="popup-dist">Distance: ~${dist.toLocaleString()} ${state.distanceUnit}</div>`;
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
  clearGeodesicLine();
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

  // Update spot detail and DE/DX widgets
  if (sid) {
    const filtered = state.sourceFiltered[state.currentSource] || [];
    const spot = filtered.find(s => spotId(s) === sid);
    if (spot) {
      updateSpotDetail(spot);
      setDedxSpot(spot);
      drawGeodesicLine(spot);
    } else {
      clearSpotDetail();
      clearDedxSpot();
    }
  } else {
    clearSpotDetail();
    clearDedxSpot();
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
