import state from './state.js';
import { SOURCE_DEFS, getBandColor } from './constants.js';
import { esc } from './utils.js';
import { bearingTo, bearingToCardinal, distanceMi, localTimeAtLon, geodesicPoints, gridToLatLon } from './geo.js';
import { spotId, freqToBand } from './filters.js';
import { updateSpotDetail, clearSpotDetail } from './spot-detail.js';
import { setDedxSpot, clearDedxSpot } from './dedx-info.js';
import { onSpotSelected, onSpotDeselected } from './voacap.js';
import { broadcastSpotSelection } from './cross-tab.js';

let defaultIcon = null;
let selectedIcon = null;
let _suppressBroadcast = false; // true during remote selection to prevent re-broadcast

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

// --- Band-colored DX path lines ---

function clearBandPaths() {
  for (const line of state.dxPathLines) {
    state.map.removeLayer(line);
  }
  state.dxPathLines = [];
}

function drawBandPaths() {
  clearBandPaths();
  if (!state.mapOverlays.bandPaths) return;
  if (state.myLat == null || state.myLon == null || !state.map) return;

  const filtered = state.sourceFiltered[state.currentSource] || [];

  // Helper: split points at dateline crossings
  function splitAtDateline(points) {
    const segments = [[]];
    for (let i = 0; i < points.length; i++) {
      segments[segments.length - 1].push(points[i]);
      if (i < points.length - 1 && Math.abs(points[i + 1][1] - points[i][1]) > 180) {
        segments.push([]);
      }
    }
    return segments;
  }

  for (const spot of filtered) {
    let spotLat, spotLon;
    const lat = parseFloat(spot.latitude);
    const lon = parseFloat(spot.longitude);
    if (!isNaN(lat) && !isNaN(lon)) {
      spotLat = lat;
      spotLon = lon;
    } else if (spot.grid4) {
      const center = gridToLatLon(spot.grid4);
      if (!center) continue;
      spotLat = center.lat;
      spotLon = center.lon;
    } else {
      continue;
    }

    const band = freqToBand(spot.frequency);
    const color = band ? getBandColor(band) : '#888';
    const pts = geodesicPoints(state.myLat, state.myLon, spotLat, spotLon, 32); // fewer points for performance

    const line = L.polyline(splitAtDateline(pts), {
      color,
      weight: 1.5,
      opacity: 0.45,
      interactive: false,
    });
    line.addTo(state.map);
    state.dxPathLines.push(line);
  }
}

export function renderMarkers() {
  if (!state.map) return;
  ensureIcons();
  clearGeodesicLine();
  clearBandPaths();
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

  drawBandPaths();
}

export function selectSpot(sid) {
  ensureIcons();
  clearGeodesicLine();
  const oldSid = state.selectedSpotId;

  // Toggle: clicking the already-selected spot deselects it
  const newSid = (sid && sid === oldSid) ? null : sid;

  if (oldSid && state.markers[oldSid]) {
    state.markers[oldSid].setIcon(defaultIcon);
  }

  state.selectedSpotId = newSid;

  if (newSid && state.markers[newSid]) {
    state.markers[newSid].setIcon(selectedIcon);
  }

  if (state.clusterGroup) {
    if (oldSid && state.markers[oldSid]) {
      const oldParent = state.clusterGroup.getVisibleParent(state.markers[oldSid]);
      if (oldParent && oldParent !== state.markers[oldSid] && oldParent._icon) {
        oldParent._icon.classList.remove('marker-cluster-selected');
      }
    }
    if (newSid && state.markers[newSid]) {
      const newParent = state.clusterGroup.getVisibleParent(state.markers[newSid]);
      if (newParent && newParent !== state.markers[newSid] && newParent._icon) {
        newParent._icon.classList.add('marker-cluster-selected');
      }
    }
  }

  document.querySelectorAll('#spotsBody tr').forEach(tr => {
    tr.classList.toggle('selected', tr.dataset.spotId === newSid);
  });

  if (newSid) {
    const selectedRow = document.querySelector(`#spotsBody tr[data-spot-id="${CSS.escape(newSid)}"]`);
    if (selectedRow) {
      selectedRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  // Update spot detail and DE/DX widgets
  let selectedSpot = null;
  if (newSid) {
    const filtered = state.sourceFiltered[state.currentSource] || [];
    selectedSpot = filtered.find(s => spotId(s) === newSid) || null;
    if (selectedSpot) {
      updateSpotDetail(selectedSpot);
      setDedxSpot(selectedSpot);
      drawGeodesicLine(selectedSpot);
    } else {
      clearSpotDetail();
      clearDedxSpot();
    }
    onSpotSelected();
  } else {
    clearSpotDetail();
    clearDedxSpot();
    onSpotDeselected();
  }

  // Broadcast to other tabs (skipped when applying a remote selection)
  if (!_suppressBroadcast) {
    broadcastSpotSelection(selectedSpot);
  }
}

export function flyToSpot(spot) {
  const sid = spotId(spot);
  selectSpot(sid);

  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  if (!state.map || isNaN(lat) || isNaN(lon)) return;

  if (state.mapCenterMode === 'spot') {
    state.map.flyTo([lat, lon], 5, { duration: 0.8 });
  }

  const marker = state.markers[sid];
  if (marker) {
    marker.openPopup();
  }
}

// --- Cross-tab remote spot selection ---
// Applies a spot selection from another tab. The spot object is broadcast
// in full because this tab may not have it in its local sourceFiltered data.

function selectSpotFromRemote(spot) {
  ensureIcons();
  clearGeodesicLine();
  const oldSid = state.selectedSpotId;

  // Clear old marker highlight
  if (oldSid && state.markers[oldSid]) {
    state.markers[oldSid].setIcon(defaultIcon);
    if (state.clusterGroup) {
      const oldParent = state.clusterGroup.getVisibleParent(state.markers[oldSid]);
      if (oldParent && oldParent !== state.markers[oldSid] && oldParent._icon) {
        oldParent._icon.classList.remove('marker-cluster-selected');
      }
    }
  }

  if (!spot) {
    // Deselection
    state.selectedSpotId = null;
    clearSpotDetail();
    clearDedxSpot();
    onSpotDeselected();
    document.querySelectorAll('#spotsBody tr.selected').forEach(tr => tr.classList.remove('selected'));
    return;
  }

  const sid = spotId(spot);
  state.selectedSpotId = sid;

  // Highlight marker if this tab has one for this spot
  if (state.markers[sid]) {
    state.markers[sid].setIcon(selectedIcon);
    if (state.clusterGroup) {
      const newParent = state.clusterGroup.getVisibleParent(state.markers[sid]);
      if (newParent && newParent !== state.markers[sid] && newParent._icon) {
        newParent._icon.classList.add('marker-cluster-selected');
      }
    }
  }

  // Table row highlighting (works if this tab shows the same source)
  document.querySelectorAll('#spotsBody tr').forEach(tr => {
    tr.classList.toggle('selected', tr.dataset.spotId === sid);
  });

  // Populate DX Detail, DE/DX Info, geodesic lines from the broadcast spot data
  updateSpotDetail(spot);
  setDedxSpot(spot);
  drawGeodesicLine(spot);
  onSpotSelected();

  // Map fly-to (if center mode is set to follow selected spot)
  const lat = parseFloat(spot.latitude);
  const lon = parseFloat(spot.longitude);
  if (state.map && !isNaN(lat) && !isNaN(lon) && state.mapCenterMode === 'spot') {
    state.map.flyTo([lat, lon], 5, { duration: 0.8 });
  }
}

// Listen for remote spot selections dispatched by cross-tab.js
document.addEventListener('hamtab:remote-spot-selected', (e) => {
  _suppressBroadcast = true;
  try {
    selectSpotFromRemote(e.detail.spot);
  } finally {
    _suppressBroadcast = false;
  }
});
