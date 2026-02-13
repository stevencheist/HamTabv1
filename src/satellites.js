// --- Satellite Tracking Module ---
// Multi-satellite tracking using N2YO API

import state from './state.js';
import { $ } from './dom.js';
import { SAT_FREQUENCIES, DEFAULT_TRACKED_SATS } from './constants.js';
import { esc } from './utils.js';

// --- Constants ---

const EARTH_RADIUS_KM = 6371;
const SPEED_OF_LIGHT_KM_S = 299792.458;

// Typical LEO satellite altitude for footprint calculation when not provided
const DEFAULT_SAT_ALT_KM = 400;

// --- Initialization ---

export function initSatellites() {
  initSatelliteListeners();

  // ISS always uses free SGP4 endpoint (no API key needed)
  fetchIssPosition();

  // Other satellites need N2YO API key
  if (state.n2yoApiKey) {
    fetchSatellitePositions();
  }
}

function initSatelliteListeners() {
  // Satellite config button
  const cfgBtn = $('satCfgBtn');
  if (cfgBtn) {
    cfgBtn.addEventListener('click', showSatelliteConfig);
  }

  // Config OK button
  const cfgOk = $('satCfgOk');
  if (cfgOk) {
    cfgOk.addEventListener('click', dismissSatelliteConfig);
  }

  // Close config on overlay click
  const splash = $('satCfgSplash');
  if (splash) {
    splash.addEventListener('click', (e) => {
      if (e.target === splash) dismissSatelliteConfig();
    });
  }
}

// --- ISS Free Tracking (SGP4, no API key) ---

export async function fetchIssPosition() {
  try {
    const lat = state.myLat ?? 0;
    const lon = state.myLon ?? 0;
    const resp = await fetch(`/api/iss/position?lat=${lat}&lon=${lon}`);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Store position in same shape as N2YO data
    state.satellites.positions['25544'] = {
      satId: 25544,
      name: data.name,
      lat: data.lat,
      lon: data.lon,
      alt: data.alt,
      azimuth: data.azimuth,
      elevation: data.elevation,
      timestamp: data.timestamp,
      tleEpoch: data.tleEpoch || null,
    };

    // Store orbit path
    state.satellites.issOrbitPath = data.orbitPath || [];

    updateSatelliteMarkers();
    updateIssOrbitLine();
    renderSatelliteWidget();
  } catch (err) {
    if (state.debug) console.error('Failed to fetch ISS position:', err);
  }
}

// Split orbit path at international date line crossings for proper Leaflet rendering
function splitAtDateline(points) {
  const segments = [[]];
  for (let i = 0; i < points.length; i++) {
    segments[segments.length - 1].push([points[i].lat, points[i].lon]);
    if (i < points.length - 1) {
      if (Math.abs(points[i + 1].lon - points[i].lon) > 180) {
        segments.push([]); // start new segment after dateline crossing
      }
    }
  }
  return segments;
}

function updateIssOrbitLine() {
  if (!state.map) return;

  // Remove old orbit line
  if (state.satellites.orbitLines['25544']) {
    state.map.removeLayer(state.satellites.orbitLines['25544']);
    delete state.satellites.orbitLines['25544'];
  }

  const path = state.satellites.issOrbitPath;
  if (!path || path.length < 2) return;

  const segments = splitAtDateline(path);
  state.satellites.orbitLines['25544'] = L.polyline(segments, {
    color: '#00bcd4',
    weight: 1.5,
    opacity: 0.5,
    dashArray: '6 4',
    interactive: false,
  }).addTo(state.map);
}

// --- API Fetching ---

export async function fetchSatelliteList() {
  if (!state.n2yoApiKey) return;

  try {
    const url = `/api/satellites/list?apikey=${encodeURIComponent(state.n2yoApiKey)}`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    state.satellites.available = data;
    renderSatelliteSelectList();
  } catch (err) {
    console.error('Failed to fetch satellite list:', err);
  }
}

export async function fetchSatellitePositions() {
  if (!state.n2yoApiKey || state.satellites.tracked.length === 0) return;

  // Filter out ISS — it uses the free SGP4 endpoint
  const n2yoIds = state.satellites.tracked.filter(id => id !== 25544);
  if (n2yoIds.length === 0) return; // only ISS tracked, already handled

  try {
    const ids = n2yoIds.join(',');
    const lat = state.myLat ?? 0;
    const lon = state.myLon ?? 0;
    const url = `/api/satellites/positions?apikey=${encodeURIComponent(state.n2yoApiKey)}&ids=${ids}&lat=${lat}&lon=${lon}&seconds=1`;

    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    // Merge N2YO positions while preserving ISS position from free endpoint
    const issPos = state.satellites.positions['25544'];
    state.satellites.positions = data;
    if (issPos) state.satellites.positions['25544'] = issPos;

    updateSatelliteMarkers();
    renderSatelliteWidget();
  } catch (err) {
    console.error('Failed to fetch satellite positions:', err);
  }
}

export async function fetchSatellitePasses(satId) {
  if (!state.n2yoApiKey || state.myLat === null || state.myLon === null) return;

  try {
    const url = `/api/satellites/passes?apikey=${encodeURIComponent(state.n2yoApiKey)}&id=${satId}&lat=${state.myLat}&lon=${state.myLon}&days=2&minEl=10`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();

    state.satellites.passes[satId] = {
      ...data,
      expires: Date.now() + 5 * 60 * 1000, // 5 min cache
    };

    renderSatellitePasses(satId);
  } catch (err) {
    console.error('Failed to fetch satellite passes:', err);
  }
}

// --- Map Markers ---

export function updateSatelliteMarkers() {
  if (!state.map) return;

  const positions = state.satellites.positions;

  // Remove markers for satellites no longer tracked
  for (const satId of Object.keys(state.satellites.markers)) {
    if (!positions[satId]) {
      state.map.removeLayer(state.satellites.markers[satId]);
      delete state.satellites.markers[satId];
    }
  }
  for (const satId of Object.keys(state.satellites.circles)) {
    if (!positions[satId]) {
      state.map.removeLayer(state.satellites.circles[satId]);
      delete state.satellites.circles[satId];
    }
  }
  for (const satId of Object.keys(state.satellites.orbitLines)) {
    if (!positions[satId]) {
      state.map.removeLayer(state.satellites.orbitLines[satId]);
      delete state.satellites.orbitLines[satId];
    }
  }

  // Update or create markers for each satellite
  for (const [satId, pos] of Object.entries(positions)) {
    const satInfo = SAT_FREQUENCIES[satId] || { name: pos.name || `SAT ${satId}` };
    const name = satInfo.name || pos.name || `SAT ${satId}`;
    const isAboveHorizon = pos.elevation > 0;

    // Calculate footprint radius (visible horizon from satellite)
    const altKm = pos.alt || DEFAULT_SAT_ALT_KM;
    const footprintRadiusKm = calculateFootprintRadius(altKm);
    const radiusMeters = footprintRadiusKm * 1000;

    // Marker — ISS gets special styling
    const isISS = satId === '25544' || satId === 25544;
    if (state.satellites.markers[satId]) {
      state.satellites.markers[satId].setLatLng([pos.lat, pos.lon]);
    } else {
      let iconClass;
      if (isISS) {
        iconClass = 'iss-icon'; // ISS uses original cyan styling
      } else {
        iconClass = isAboveHorizon ? 'sat-icon' : 'sat-icon below-horizon';
      }
      const shortName = isISS ? 'ISS' : esc(name.split(' ')[0].split('(')[0].trim());
      const icon = L.divIcon({
        className: iconClass,
        html: shortName,
        iconSize: isISS ? [40, 20] : [50, 20],
        iconAnchor: isISS ? [20, 10] : [25, 10],
      });
      state.satellites.markers[satId] = L.marker([pos.lat, pos.lon], {
        icon,
        zIndexOffset: isISS ? 10000 : (isAboveHorizon ? 9000 : 8000),
      }).addTo(state.map);
      state.satellites.markers[satId].bindPopup('', { maxWidth: 300 });
    }

    // Update popup content
    state.satellites.markers[satId].setPopupContent(buildSatellitePopup(satId, pos, satInfo));

    // Update marker icon class for above/below horizon
    const markerEl = state.satellites.markers[satId].getElement();
    if (markerEl) {
      const iconEl = markerEl.querySelector('.sat-icon');
      if (iconEl) {
        iconEl.classList.toggle('below-horizon', !isAboveHorizon);
      }
    }

    // Footprint circle
    if (state.satellites.circles[satId]) {
      state.satellites.circles[satId].setLatLng([pos.lat, pos.lon]);
      state.satellites.circles[satId].setRadius(radiusMeters);
    } else {
      const color = satId === '25544' ? '#00bcd4' : '#4caf50'; // ISS gets cyan, others green
      state.satellites.circles[satId] = L.circle([pos.lat, pos.lon], {
        radius: radiusMeters,
        color: color,
        fillColor: color,
        fillOpacity: 0.06,
        weight: 1,
        interactive: false,
      }).addTo(state.map);
    }
  }
}

function buildSatellitePopup(satId, pos, satInfo) {
  const name = satInfo.name || pos.name || `SAT ${satId}`;
  const isAbove = pos.elevation > 0;
  const statusText = isAbove ? 'Above Horizon' : 'Below Horizon';
  const statusColor = isAbove ? 'var(--green)' : 'var(--text-dim)';
  const isISS = satId === '25544' || satId === 25544;

  // Use ISS-specific styling for ISS popup
  const popupClass = isISS ? 'iss-popup' : 'sat-popup';
  const titleClass = isISS ? 'iss-popup-title' : 'sat-popup-title';
  const rowClass = isISS ? 'iss-popup-row' : 'sat-popup-row';
  const headerClass = isISS ? 'iss-radio-header' : 'sat-radio-header';
  const tableClass = isISS ? 'iss-freq-table' : 'sat-freq-table';

  let html = `<div class="${popupClass}">`;
  html += `<div class="${titleClass}">${esc(name)}</div>`;
  html += `<div class="${rowClass}">Lat: ${pos.lat.toFixed(2)}, Lon: ${pos.lon.toFixed(2)}</div>`;
  html += `<div class="${rowClass}">Alt: ${Math.round(pos.alt)} km</div>`;
  html += `<div class="${rowClass}">Az: ${pos.azimuth.toFixed(1)}&deg; &bull; El: ${pos.elevation.toFixed(1)}&deg;</div>`;
  html += `<div class="${rowClass}" style="color:${statusColor}">${statusText}</div>`;

  // TLE epoch age — color uses configurable maxTleAge threshold
  if (pos.tleEpoch) {
    const ageDays = Math.floor((Date.now() / 1000 - pos.tleEpoch) / 86400);
    const maxAge = state.maxTleAge || 7;
    const ageColor = ageDays <= Math.floor(maxAge * 0.4) ? 'var(--green)'
      : ageDays <= maxAge ? 'var(--yellow)' : 'var(--red)';
    const epochDate = new Date(pos.tleEpoch * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    const warn = ageDays > maxAge ? ' \u26A0' : '';
    html += `<div class="${rowClass}">TLE: <span style="color:${ageColor}">${ageDays}d old${warn}</span> (${epochDate})</div>`;
  }

  // Radio frequencies if known
  if (satInfo.uplinks || satInfo.downlinks) {
    html += `<div class="${headerClass}">${isISS ? 'Amateur Radio (ARISS)' : 'Amateur Radio Frequencies'}</div>`;
    html += `<table class="${tableClass}">`;

    if (satInfo.uplinks) {
      for (const ul of satInfo.uplinks) {
        const doppler = calculateDopplerShift(ul.freq, pos);
        const dopplerStr = doppler !== null ? ` (${doppler > 0 ? '+' : ''}${doppler.toFixed(1)} kHz)` : '';
        html += `<tr><td>&#8593; ${esc(ul.desc || ul.mode)}</td><td>${ul.freq.toFixed(3)} MHz${dopplerStr}</td></tr>`;
      }
    }

    if (satInfo.downlinks) {
      for (const dl of satInfo.downlinks) {
        const doppler = calculateDopplerShift(dl.freq, pos);
        const dopplerStr = doppler !== null ? ` (${doppler > 0 ? '+' : ''}${doppler.toFixed(1)} kHz)` : '';
        html += `<tr><td>&#8595; ${esc(dl.desc || dl.mode)}</td><td>${dl.freq.toFixed(3)} MHz${dopplerStr}</td></tr>`;
      }
    }

    html += `</table>`;

    // Add ISS-specific note
    if (isISS) {
      html += `<div class="iss-radio-note">Repeater &amp; APRS typically active. SSTV during special events. Doppler shown above.</div>`;
    }
  }

  html += `</div>`;
  return html;
}

// --- Footprint Calculation ---

// Calculate the radius of the satellite's radio footprint (visible horizon)
// Based on spherical geometry: radius = Earth_radius * arccos(Earth_radius / (Earth_radius + altitude))
function calculateFootprintRadius(altitudeKm) {
  const ratio = EARTH_RADIUS_KM / (EARTH_RADIUS_KM + altitudeKm);
  const angleRad = Math.acos(ratio);
  return EARTH_RADIUS_KM * angleRad;
}

// --- Doppler Shift Calculation ---

// Calculate Doppler shift for a given frequency based on satellite elevation
// Uses a simplified model based on elevation angle and typical LEO velocity (~7.8 km/s)
function calculateDopplerShift(freqMHz, pos) {
  if (pos.elevation === undefined || pos.elevation === null) return null;

  // Typical LEO orbital velocity (ISS is about 7.66 km/s)
  const orbitalVelocityKmS = 7.8;

  // Radial velocity component depends on elevation angle
  // At horizon (0°): maximum Doppler (approaching or receding)
  // At zenith (90°): zero Doppler (perpendicular to observer)
  // Simplified: radial_v ≈ orbital_v * cos(elevation)
  const elevRad = (pos.elevation * Math.PI) / 180;
  const radialVelocity = orbitalVelocityKmS * Math.cos(elevRad);

  // Doppler formula: Δf = f * (v/c)
  const dopplerMHz = freqMHz * (radialVelocity / SPEED_OF_LIGHT_KM_S);
  return dopplerMHz * 1000; // Convert to kHz
}

// --- Widget Rendering ---

export function renderSatelliteWidget() {
  const satList = $('satList');
  if (!satList) return;

  const positions = state.satellites.positions;
  const tracked = state.satellites.tracked;

  if (Object.keys(positions).length === 0) {
    if (!state.n2yoApiKey) {
      satList.innerHTML = '<div class="sat-no-data">Loading ISS...</div>';
    } else {
      satList.innerHTML = '<div class="sat-no-data">No satellite data</div>';
    }
    return;
  }

  let html = '';

  for (const satId of tracked) {
    const pos = positions[satId];
    if (!pos) continue;

    const satInfo = SAT_FREQUENCIES[satId] || {};
    const name = satInfo.name || pos.name || `SAT ${satId}`;
    const shortName = name.split(' ')[0].split('(')[0].trim();
    const isAbove = pos.elevation > 0;
    const isSelected = state.satellites.selectedSatId === parseInt(satId, 10);

    // Calculate Doppler for primary downlink
    let dopplerStr = '';
    if (satInfo.downlinks && satInfo.downlinks.length > 0) {
      const doppler = calculateDopplerShift(satInfo.downlinks[0].freq, pos);
      if (doppler !== null) {
        dopplerStr = `${doppler > 0 ? '+' : ''}${doppler.toFixed(1)}`;
      }
    }

    // TLE age badge — days since TLE epoch, color uses configurable threshold
    let tleAgeHtml = '';
    if (pos.tleEpoch) {
      const ageDays = Math.floor((Date.now() / 1000 - pos.tleEpoch) / 86400);
      const maxAge = state.maxTleAge || 7;
      const cls = ageDays <= Math.floor(maxAge * 0.4) ? 'tle-fresh'
        : ageDays <= maxAge ? 'tle-aging' : 'tle-stale';
      const warn = ageDays > maxAge ? ' \u26A0' : ''; // ⚠ warning when exceeded
      tleAgeHtml = `<span class="sat-tle-age ${cls}" title="TLE age: ${ageDays}d (max: ${maxAge}d)">${ageDays}d${warn}</span>`;
    }

    const rowClass = `sat-row${isSelected ? ' selected' : ''}${isAbove ? '' : ' below-horizon'}`;
    html += `<div class="${rowClass}" data-sat-id="${satId}">`;
    html += `<span class="sat-name">${esc(shortName)}${tleAgeHtml}</span>`;
    html += `<span class="sat-azel">Az ${pos.azimuth.toFixed(0)}&deg; El ${pos.elevation.toFixed(0)}&deg;</span>`;
    if (dopplerStr) {
      html += `<span class="sat-doppler">${dopplerStr} kHz</span>`;
    }
    html += `</div>`;
  }

  // Show hint if user has non-ISS satellites tracked but no N2YO key
  if (!state.n2yoApiKey && tracked.some(id => id !== 25544)) {
    html += '<div class="sat-no-key" style="font-size:0.85em;margin-top:4px">N2YO key needed for other satellites</div>';
  }

  satList.innerHTML = html;

  // Add click handlers
  satList.querySelectorAll('.sat-row').forEach(row => {
    row.addEventListener('click', () => {
      const satId = parseInt(row.dataset.satId, 10);
      selectSatellite(satId);
    });
  });
}

export function selectSatellite(satId) {
  state.satellites.selectedSatId = satId;

  // Update widget selection styling
  const satList = $('satList');
  if (satList) {
    satList.querySelectorAll('.sat-row').forEach(row => {
      row.classList.toggle('selected', parseInt(row.dataset.satId, 10) === satId);
    });
  }

  // Pan map to satellite
  const pos = state.satellites.positions[satId];
  if (pos && state.map) {
    state.map.panTo([pos.lat, pos.lon]);
    if (state.satellites.markers[satId]) {
      state.satellites.markers[satId].openPopup();
    }
  }

  // Fetch and display passes
  const cached = state.satellites.passes[satId];
  if (!cached || Date.now() > cached.expires) {
    fetchSatellitePasses(satId);
  } else {
    renderSatellitePasses(satId);
  }
}

function renderSatellitePasses(satId) {
  const passesDiv = $('satPasses');
  if (!passesDiv) return;

  const cached = state.satellites.passes[satId];
  if (!cached || !cached.passes || cached.passes.length === 0) {
    passesDiv.innerHTML = '<div class="sat-no-passes">No upcoming passes</div>';
    return;
  }

  let html = `<div class="sat-passes-title">Upcoming Passes</div>`;

  for (const pass of cached.passes.slice(0, 5)) {
    const startDate = new Date(pass.startUTC * 1000);
    const maxDate = new Date(pass.maxUTC * 1000);
    const timeStr = formatPassTime(startDate);
    const durationMin = Math.round((pass.endUTC - pass.startUTC) / 60);

    html += `<div class="pass-item">`;
    html += `<div class="pass-time">${timeStr}</div>`;
    html += `<div class="pass-details">Max El: ${pass.maxEl}&deg; &bull; ${durationMin} min</div>`;
    html += `<div class="pass-azimuth">${pass.startAzCompass} &rarr; ${pass.maxAzCompass} &rarr; ${pass.endAzCompass}</div>`;
    html += `</div>`;
  }

  passesDiv.innerHTML = html;
}

function formatPassTime(date) {
  const now = new Date();
  const diffMs = date - now;
  const diffMin = Math.round(diffMs / 60000);

  if (diffMin < 60) {
    return `In ${diffMin} min`;
  } else if (diffMin < 1440) {
    const hours = Math.floor(diffMin / 60);
    const mins = diffMin % 60;
    return `In ${hours}h ${mins}m`;
  } else {
    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

// --- Configuration Modal ---

function showSatelliteConfig() {
  const splash = $('satCfgSplash');
  if (!splash) return;

  // Populate API key field
  const apiKeyInput = $('satApiKey');
  if (apiKeyInput) {
    apiKeyInput.value = state.n2yoApiKey;
  }

  // Populate max TLE age
  const tleAgeInput = $('satMaxTleAge');
  if (tleAgeInput) {
    tleAgeInput.value = state.maxTleAge;
  }

  // Fetch satellite list if we have a key
  if (state.n2yoApiKey && state.satellites.available.length === 0) {
    fetchSatelliteList();
  }

  renderSatelliteSelectList();
  splash.classList.remove('hidden');
}

function dismissSatelliteConfig() {
  const splash = $('satCfgSplash');
  if (!splash) return;

  // Save API key
  const apiKeyInput = $('satApiKey');
  if (apiKeyInput) {
    state.n2yoApiKey = apiKeyInput.value.trim();
    localStorage.setItem('hamtab_n2yo_apikey', state.n2yoApiKey);

    // Persist to server .env
    if (state.n2yoApiKey) {
      fetch('/api/config/env', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ N2YO_API_KEY: state.n2yoApiKey }),
      }).catch(() => {});
    }
  }

  // Save max TLE age
  const tleAgeInput = $('satMaxTleAge');
  if (tleAgeInput) {
    const age = parseInt(tleAgeInput.value, 10);
    if (!isNaN(age) && age >= 1 && age <= 30) {
      state.maxTleAge = age;
      localStorage.setItem('hamtab_max_tle_age', String(age));
    }
  }

  // Save tracked satellites
  const selectList = $('satSelectList');
  if (selectList) {
    const tracked = [];
    selectList.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
      const id = parseInt(cb.dataset.satId, 10);
      if (!isNaN(id)) tracked.push(id);
    });
    state.satellites.tracked = tracked.length > 0 ? tracked : [25544]; // Default to ISS
    localStorage.setItem('hamtab_sat_tracked', JSON.stringify(state.satellites.tracked));
  }

  splash.classList.add('hidden');

  // Refresh positions with new settings
  fetchIssPosition(); // ISS always uses free endpoint
  if (state.n2yoApiKey) {
    fetchSatellitePositions();
  }
}

function renderSatelliteSelectList() {
  const selectList = $('satSelectList');
  if (!selectList) return;

  // Combine known satellites with any from API
  const allSats = new Map();

  // Add known satellites from our frequency database
  for (const [id, info] of Object.entries(SAT_FREQUENCIES)) {
    allSats.set(parseInt(id, 10), info.name);
  }

  // Add satellites from API
  for (const sat of state.satellites.available) {
    if (!allSats.has(sat.satId)) {
      allSats.set(sat.satId, sat.name);
    }
  }

  let html = '';
  for (const [satId, name] of allSats) {
    const isTracked = state.satellites.tracked.includes(satId);
    html += `<label class="sat-select-item">`;
    html += `<input type="checkbox" data-sat-id="${satId}" ${isTracked ? 'checked' : ''} />`;
    html += `${esc(name)} (${satId})`;
    html += `</label>`;
  }

  selectList.innerHTML = html;
}

// --- Cleanup ---

export function cleanupSatelliteMarkers() {
  if (!state.map) return;

  for (const marker of Object.values(state.satellites.markers)) {
    state.map.removeLayer(marker);
  }
  for (const circle of Object.values(state.satellites.circles)) {
    state.map.removeLayer(circle);
  }
  for (const line of Object.values(state.satellites.orbitLines)) {
    state.map.removeLayer(line);
  }

  state.satellites.markers = {};
  state.satellites.circles = {};
  state.satellites.orbitLines = {};
}
