import state from './state.js';

export async function fetchISS() {
  try {
    const resp = await fetch('/api/iss');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    updateISS(data);
  } catch (err) {
    console.error('Failed to fetch ISS:', err);
  }
}

function updateISS(data) {
  if (!state.map) return;
  const lat = data.latitude;
  const lon = data.longitude;
  const footprintKm = data.footprint || 0;
  const radiusMeters = (footprintKm / 2) * 1000;

  if (state.issMarker) {
    state.issMarker.setLatLng([lat, lon]);
  } else {
    const icon = L.divIcon({
      className: 'iss-icon',
      html: 'ISS',
      iconSize: [40, 20],
      iconAnchor: [20, 10],
    });
    state.issMarker = L.marker([lat, lon], { icon, zIndexOffset: 10000 }).addTo(state.map);
    state.issMarker.bindPopup('', { maxWidth: 280 });
  }

  state.issMarker.setPopupContent(
    `<div class="iss-popup">` +
    `<div class="iss-popup-title">ISS (ZARYA)</div>` +
    `<div class="iss-popup-row">Lat: ${lat.toFixed(2)}, Lon: ${lon.toFixed(2)}</div>` +
    `<div class="iss-popup-row">Alt: ${Math.round(data.altitude)} km &bull; Vel: ${Math.round(data.velocity)} km/h</div>` +
    `<div class="iss-popup-row">Visibility: ${data.visibility || 'N/A'}</div>` +
    `<div class="iss-radio-header">Amateur Radio (ARISS)</div>` +
    `<table class="iss-freq-table">` +
    `<tr><td>V/U Repeater &#8593;</td><td>145.990 MHz FM</td></tr>` +
    `<tr><td>V/U Repeater &#8595;</td><td>437.800 MHz FM</td></tr>` +
    `<tr><td>Voice Downlink</td><td>145.800 MHz FM</td></tr>` +
    `<tr><td>APRS / Packet</td><td>145.825 MHz</td></tr>` +
    `<tr><td>SSTV Events</td><td>145.800 MHz PD120</td></tr>` +
    `</table>` +
    `<div class="iss-radio-note">Repeater &amp; APRS typically active. SSTV during special events. Use &#177;10 kHz Doppler shift.</div>` +
    `</div>`
  );

  if (state.issCircle) {
    state.issCircle.setLatLng([lat, lon]);
    state.issCircle.setRadius(radiusMeters);
  } else {
    state.issCircle = L.circle([lat, lon], {
      radius: radiusMeters,
      color: '#00bcd4',
      fillColor: '#00bcd4',
      fillOpacity: 0.08,
      weight: 1,
    }).addTo(state.map);
  }

  state.issTrail.push([lat, lon]);
  if (state.issTrail.length > 20) state.issTrail.shift();
  if (state.issTrailLine) state.map.removeLayer(state.issTrailLine);
  if (state.issTrail.length > 1) {
    const segs = [[]];
    for (let i = 0; i < state.issTrail.length; i++) {
      segs[segs.length - 1].push(state.issTrail[i]);
      if (i < state.issTrail.length - 1) {
        if (Math.abs(state.issTrail[i + 1][1] - state.issTrail[i][1]) > 180) {
          segs.push([]);
        }
      }
    }
    state.issTrailLine = L.polyline(segs, {
      color: '#00bcd4',
      weight: 2,
      opacity: 0.6,
      dashArray: '4 6',
    }).addTo(state.map);
  }
}

export async function fetchISSOrbit() {
  try {
    const resp = await fetch('/api/iss/orbit');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    renderISSOrbit(data);
  } catch (err) {
    console.error('Failed to fetch ISS orbit:', err);
  }
}

function renderISSOrbit(positions) {
  if (!state.map) return;
  if (state.issOrbitLine) state.map.removeLayer(state.issOrbitLine);
  if (!positions || positions.length < 2) return;

  const segments = [[]];
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i];
    segments[segments.length - 1].push([p.latitude, p.longitude]);

    if (i < positions.length - 1) {
      const lonDiff = Math.abs(positions[i + 1].longitude - p.longitude);
      if (lonDiff > 180) {
        segments.push([]);
      }
    }
  }

  state.issOrbitLine = L.polyline(segments, {
    color: '#00bcd4',
    weight: 1.5,
    opacity: 0.35,
    dashArray: '8 8',
    interactive: false,
  }).addTo(state.map);
}
