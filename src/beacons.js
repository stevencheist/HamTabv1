// --- NCDXF Beacon Schedule Widget ---
// Displays the NCDXF/IARU International Beacon Project's real-time rotation.
// 18 beacons cycle through 5 HF frequencies every 3 minutes. Pure client-side — no server endpoint.
// Reference: https://www.ncdxf.org/beacon/

import state from './state.js';
import { $ } from './dom.js';

// 18 beacons in transmission order (per NCDXF schedule)
export const BEACONS = [
  { call: '4U1UN',  location: 'New York',     lat: 40.75,  lon: -73.97 },
  { call: 'VE8AT',  location: 'Inuvik',       lat: 68.32,  lon: -133.52 },
  { call: 'W6WX',   location: 'Mt. Umunhum',  lat: 37.16,  lon: -121.90 },
  { call: 'KH6RS',  location: 'Maui',         lat: 20.75,  lon: -156.43 },
  { call: 'ZL6B',   location: 'Masterton',    lat: -41.06, lon: 175.58 },
  { call: 'VK6RBP', location: 'Rolystone',    lat: -32.11, lon: 116.05 },
  { call: 'JA2IGY', location: 'Mt. Asama',    lat: 34.46,  lon: 136.78 },
  { call: 'RR9O',   location: 'Novosibirsk',  lat: 54.98,  lon: 82.90 },
  { call: 'VR2B',   location: 'Hong Kong',    lat: 22.28,  lon: 114.17 },
  { call: '4S7B',   location: 'Colombo',      lat: 6.88,   lon: 79.87 },
  { call: 'ZS6DN',  location: 'Pretoria',     lat: -25.73, lon: 28.18 },
  { call: '5Z4B',   location: 'Kikuyu',       lat: -1.25,  lon: 36.67 },
  { call: '4X6TU',  location: 'Tel Aviv',     lat: 32.08,  lon: 34.78 },
  { call: 'OH2B',   location: 'Lohja',        lat: 60.25,  lon: 24.03 },
  { call: 'CS3B',   location: 'Madeira',      lat: 32.65,  lon: -16.90 },
  { call: 'LU4AA',  location: 'Buenos Aires', lat: -34.62, lon: -58.44 },
  { call: 'OA4B',   location: 'Lima',         lat: -12.08, lon: -76.98 },
  { call: 'YV5B',   location: 'Caracas',      lat: 10.50,  lon: -66.92 },
];

const FREQUENCIES = [14100, 18110, 21150, 24930, 28200]; // kHz

const CYCLE = 180; // seconds — full rotation period
const SLOT  = 10;  // seconds — each beacon transmits per frequency

// Calculate which beacon is active on each frequency right now
export function getActiveBeacons() {
  const now = new Date();
  const T = now.getUTCHours() * 3600 + now.getUTCMinutes() * 60 + now.getUTCSeconds();
  const slot = Math.floor((T % CYCLE) / SLOT); // 0–17: which slot in the 3-min cycle
  const elapsed = T % SLOT;                     // 0–9: seconds into current slot

  return FREQUENCIES.map((freq, f) => ({
    freq,
    beacon: BEACONS[(slot - f + 18) % 18], // each freq is offset by one beacon in the rotation
    secondsLeft: SLOT - elapsed,
  }));
}

// Render the 5-row beacon table
function renderBeacons() {
  const tbody = $('beaconTbody');
  if (!tbody) return;

  const active = getActiveBeacons();

  // Reuse existing rows if count matches, otherwise rebuild
  if (tbody.children.length !== active.length) {
    tbody.textContent = '';
    for (const entry of active) {
      const tr = document.createElement('tr');

      const tdFreq = document.createElement('td');
      tdFreq.textContent = (entry.freq / 1000).toFixed(3);
      tr.appendChild(tdFreq);

      const tdCall = document.createElement('td');
      tdCall.className = 'beacon-call';
      tdCall.textContent = entry.beacon.call;
      tr.appendChild(tdCall);

      const tdLoc = document.createElement('td');
      tdLoc.className = 'beacon-loc';
      tdLoc.textContent = entry.beacon.location;
      tr.appendChild(tdLoc);

      const tdTime = document.createElement('td');
      tdTime.className = 'beacon-time';
      tdTime.textContent = entry.secondsLeft + 's';
      tr.appendChild(tdTime);

      tbody.appendChild(tr);
    }
  } else {
    // Update in place — avoids DOM churn every second
    for (let i = 0; i < active.length; i++) {
      const cells = tbody.children[i].children;
      cells[1].textContent = active[i].beacon.call;
      cells[2].textContent = active[i].beacon.location;
      cells[3].textContent = active[i].secondsLeft + 's';
    }
  }
}

export function initBeaconListeners() {
  // No click handlers needed for now — pure display widget
}

export function startBeaconTimer() {
  renderBeacons(); // initial render
  state.beaconTimer = setInterval(renderBeacons, 1000); // 1 s — beacon countdown refresh
}

export function stopBeaconTimer() {
  if (state.beaconTimer) {
    clearInterval(state.beaconTimer);
    state.beaconTimer = null;
  }
}
