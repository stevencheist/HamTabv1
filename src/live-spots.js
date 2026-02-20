// --- Live Spots Module ---
// Shows where YOUR signal is being received via PSKReporter

import state from './state.js';
import { $ } from './dom.js';
import { geodesicPoints } from './geo.js';
import { esc } from './utils.js';
import { getBandColor } from './constants.js';

// --- Initialization ---

export function initLiveSpotsListeners() {
  // Config button
  const cfgBtn = $('liveSpotsCfgBtn');
  if (cfgBtn) {
    cfgBtn.addEventListener('click', showLiveSpotsConfig);
  }

  // Config OK button
  const cfgOk = $('liveSpotsCfgOk');
  if (cfgOk) {
    cfgOk.addEventListener('click', dismissLiveSpotsConfig);
  }

  // Close config on overlay click
  const splash = $('liveSpotsCfgSplash');
  if (splash) {
    splash.addEventListener('click', (e) => {
      if (e.target === splash) dismissLiveSpotsConfig();
    });
  }

  // Mode toggle
  const modeSelect = $('liveSpotsModeSelect');
  if (modeSelect) {
    modeSelect.value = state.liveSpots.displayMode;
    modeSelect.addEventListener('change', () => {
      state.liveSpots.displayMode = modeSelect.value;
      localStorage.setItem('hamtab_livespots_mode', modeSelect.value);
      renderLiveSpots();
    });
  }
}

// --- Config Modal ---

function showLiveSpotsConfig() {
  const splash = $('liveSpotsCfgSplash');
  if (splash) splash.classList.remove('hidden');

  const modeSelect = $('liveSpotsModeSelect');
  if (modeSelect) modeSelect.value = state.liveSpots.displayMode;
}

function dismissLiveSpotsConfig() {
  const splash = $('liveSpotsCfgSplash');
  if (splash) splash.classList.add('hidden');
}

// --- Data Fetching ---

export async function fetchLiveSpots() {
  if (!state.myCallsign) {
    renderLiveSpots();
    return;
  }

  try {
    const url = `/api/spots/psk/heard?callsign=${encodeURIComponent(state.myCallsign)}&_t=${Date.now()}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    state.liveSpots.data = data.spots || [];
    state.liveSpots.summary = data.summary || {};
    state.liveSpots.lastFetch = Date.now();
    state.liveSpots.error = false;

    renderLiveSpots();
  } catch (err) {
    if (state.debug) console.error('Failed to fetch Live Spots:', err);
    state.liveSpots.error = true;
    renderLiveSpots();
  }
}

// --- Rendering ---

export function renderLiveSpots() {
  const status = $('liveSpotsStatus');
  const summary = $('liveSpotsSummary');
  const count = $('liveSpotsCount');

  if (!summary) return;

  // Show status if no callsign configured
  if (!state.myCallsign) {
    if (status) {
      status.textContent = 'Set your callsign in Config';
      status.classList.add('visible');
    }
    summary.innerHTML = '';
    if (count) count.textContent = '';
    return;
  }

  // Show status messages
  if (status) {
    if (state.liveSpots.error && !state.liveSpots.lastFetch) {
      status.textContent = 'PSKReporter unavailable — retrying';
      status.classList.add('visible');
    } else if (state.liveSpots.data.length === 0 && state.liveSpots.lastFetch) {
      status.textContent = 'No spots in last hour';
      status.classList.add('visible');
    } else if (!state.liveSpots.lastFetch) {
      status.textContent = 'Loading...';
      status.classList.add('visible');
    } else {
      status.textContent = '';
      status.classList.remove('visible');
    }
  }

  // Update spot count
  if (count) {
    const total = state.liveSpots.data.length;
    count.textContent = total > 0 ? `(${total})` : '';
  }

  // Build band cards
  const bands = Object.keys(state.liveSpots.summary).sort((a, b) => {
    const order = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '70cm'];
    return order.indexOf(a) - order.indexOf(b);
  });

  if (bands.length === 0) {
    summary.innerHTML = '';
    return;
  }

  let html = '';
  for (const band of bands) {
    const info = state.liveSpots.summary[band];
    const isActive = state.liveSpots.visibleBands.has(band);
    const activeClass = isActive ? 'active' : '';
    const color = getBandColor(band);

    let valueHtml;
    if (state.liveSpots.displayMode === 'distance') {
      const km = info.farthestKm || 0;
      const mi = Math.round(km * 0.621371);
      valueHtml = `<span class="live-spots-value">${state.distanceUnit === 'km' ? km : mi} ${state.distanceUnit}</span>`;
    } else {
      valueHtml = `<span class="live-spots-value">${info.count}</span>`;
    }

    html += `
      <div class="live-spots-band-card ${activeClass}" data-band="${esc(band)}" style="border-color: ${color}">
        <span class="live-spots-band-name">${esc(band)}</span>
        ${valueHtml}
        ${state.liveSpots.displayMode === 'distance' && info.farthestCall ? `<span class="live-spots-farthest">${esc(info.farthestCall)}</span>` : ''}
      </div>
    `;
  }

  summary.innerHTML = html;

  // Add click listeners to band cards
  const cards = summary.querySelectorAll('.live-spots-band-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const band = card.dataset.band;
      toggleBandOnMap(band);
      card.classList.toggle('active');
    });
  });
}

// --- Map Integration ---

export function toggleBandOnMap(band) {
  if (state.liveSpots.visibleBands.has(band)) {
    state.liveSpots.visibleBands.delete(band);
  } else {
    state.liveSpots.visibleBands.add(band);
  }
  renderLiveSpotsOnMap();
}

export function renderLiveSpotsOnMap() {
  if (!state.map) return;

  // Clear existing markers and lines
  clearLiveSpotsFromMap();

  if (state.myLat == null || state.myLon == null) return;
  if (state.liveSpots.visibleBands.size === 0) return;

  const L = window.L;

  // Group spots by band
  const spotsByBand = {};
  for (const spot of state.liveSpots.data) {
    if (!spot.band || !state.liveSpots.visibleBands.has(spot.band)) continue;
    if (spot.receiverLat == null || spot.receiverLon == null) continue;
    if (!spotsByBand[spot.band]) spotsByBand[spot.band] = [];
    spotsByBand[spot.band].push(spot);
  }

  // Draw lines and markers for each band
  for (const band of Object.keys(spotsByBand)) {
    const color = getBandColor(band);
    const spots = spotsByBand[band];

    for (const spot of spots) {
      // Draw geodesic line
      const pts = geodesicPoints(state.myLat, state.myLon, spot.receiverLat, spot.receiverLon, 50);

      // Handle antimeridian crossing
      const segments = [[]];
      let lastLon = pts[0][1];
      for (const pt of pts) {
        if (Math.abs(pt[1] - lastLon) > 180) {
          segments.push([]);
        }
        segments[segments.length - 1].push([pt[0], pt[1]]);
        lastLon = pt[1];
      }

      const line = L.polyline(segments, {
        color,
        weight: 2,
        opacity: 0.6,
        dashArray: '4 3',
      });

      line.addTo(state.map);

      // Store line reference
      const lineKey = `${spot.receiver}-${spot.spotTime}`;
      if (!state.liveSpotsLines) state.liveSpotsLines = {};
      state.liveSpotsLines[lineKey] = line;

      // Create RX marker (square)
      const marker = L.marker([spot.receiverLat, spot.receiverLon], {
        icon: L.divIcon({
          className: 'live-spots-rx-marker',
          html: `<div class="live-spots-rx-icon" style="background: ${color}">&#9632;</div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      });

      // Popup content
      const popupHtml = `
        <div class="live-spots-popup">
          <div class="live-spots-popup-call">${esc(spot.receiver)}</div>
          <div class="live-spots-popup-grid">${esc(spot.receiverLocator || '')}</div>
          <div class="live-spots-popup-details">
            ${spot.distanceKm ? `${spot.distanceKm} km` : ''}
            ${spot.snr ? ` / SNR: ${esc(spot.snr)} dB` : ''}
          </div>
          <div class="live-spots-popup-mode">${esc(spot.mode)} on ${esc(band)}</div>
        </div>
      `;
      marker.bindPopup(popupHtml);

      marker.addTo(state.map);

      // Store marker reference
      const markerKey = `${spot.receiver}-${spot.spotTime}`;
      state.liveSpotsMarkers[markerKey] = marker;
    }
  }
}

export function clearLiveSpotsFromMap() {
  // Remove all markers
  for (const key of Object.keys(state.liveSpotsMarkers)) {
    if (state.map && state.liveSpotsMarkers[key]) {
      state.map.removeLayer(state.liveSpotsMarkers[key]);
    }
  }
  state.liveSpotsMarkers = {};

  // Remove all lines
  if (state.liveSpotsLines) {
    for (const key of Object.keys(state.liveSpotsLines)) {
      if (state.map && state.liveSpotsLines[key]) {
        state.map.removeLayer(state.liveSpotsLines[key]);
      }
    }
    state.liveSpotsLines = null;
  }
}
