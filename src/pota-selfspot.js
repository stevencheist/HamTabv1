// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- POTA Self-Spot: one-click activator spotting from the On-Air widget ---
// Spots YOU (activator = spotter = your callsign) at your current rig
// frequency/mode and saved park reference. Reuses the shared /api/pota/spot
// endpoint (see server/routes/spots.js) — the same one POTA Hunter posts to.
import state from './state.js';
import { $ } from './dom.js';
import { isFeatureVisible } from './feature-flags.js';
import { getRigStore, isRigConnected } from './cat/index.js';

// POTA park reference format, e.g. "US-1234", "GB-0001", "K-5678".
const PARK_RE = /^[A-Z0-9]+-\d{4,}$/;

let statusTimer = null;

// --- Map a CAT mode string to the mode POTA expects ---
// Rig modes are CAT strings (USB, LSB, CW-U, DATA-U, FM-N, ...). POTA wants a
// coarse mode. We can't tell FT8 from other DATA at the rig level, so DATA-family
// modes report the generic "DATA" — the operator's park page shows the detail.
function catModeToPotaMode(catMode) {
  if (!catMode) return '';
  const m = catMode.toUpperCase();
  if (m.startsWith('CW')) return 'CW';
  if (m === 'USB' || m === 'LSB' || m === 'SSB') return 'SSB';
  if (m.startsWith('FM')) return 'FM';
  if (m.startsWith('AM')) return 'AM';
  if (m.startsWith('DATA') || m.startsWith('DIG') || m.startsWith('PKT')
    || m === 'RTTY' || m === 'RTTY-R' || m === 'PSK') return 'DATA';
  return m;
}

// --- Show a transient status message in the self-spot row ---
function setStatus(text, kind) {
  const el = $('rigSelfSpotStatus');
  if (!el) return;
  el.textContent = text;
  el.className = 'rig-selfspot-status' + (kind ? ` rig-selfspot-${kind}` : '');
  if (statusTimer) clearTimeout(statusTimer);
  if (text) {
    // Success/info clears itself; errors linger a touch longer.
    statusTimer = setTimeout(() => {
      if (el.textContent === text) { el.textContent = ''; el.className = 'rig-selfspot-status'; }
    }, kind === 'err' ? 6000 : 4000);
  }
}

// --- Persist + normalize the park input ---
function handleParkInput() {
  const input = $('rigMyPark');
  if (!input) return;
  const val = input.value.trim().toUpperCase();
  input.value = val;
  state.myPark = val;
  localStorage.setItem('hamtab_my_park', val);
  // Live-validate: flag an obviously malformed reference without nagging on empty.
  input.classList.toggle('rig-input-invalid', val !== '' && !PARK_RE.test(val));
}

// --- One-click self-spot ---
function handleSelfSpot() {
  const btn = $('rigSelfSpotBtn');

  if (!isRigConnected()) {
    setStatus('Connect a radio first.', 'err');
    return;
  }

  const callsign = (state.myCallsign || '').trim().toUpperCase();
  if (!callsign) {
    setStatus('Set your callsign in config first.', 'err');
    return;
  }

  const park = (state.myPark || '').trim().toUpperCase();
  if (!PARK_RE.test(park)) {
    setStatus('Enter your park (e.g. US-1234).', 'err');
    $('rigMyPark')?.focus();
    return;
  }

  const rig = getRigStore().get();
  const freqHz = rig.frequency;
  if (!freqHz || freqHz <= 0) {
    setStatus('No frequency from the radio yet.', 'err');
    return;
  }
  // POTA API wants kHz as a string.
  const freqKhz = String(Math.round(freqHz / 1000));
  const mode = catModeToPotaMode(rig.mode);

  const body = {
    activator: callsign,
    spotter: callsign, // self-spot: you are your own spotter
    frequency: freqKhz,
    reference: park,
    mode,
    comments: state.spotterLocation ? `QRV from ${state.spotterLocation}` : 'QRV',
  };

  if (btn) { btn.disabled = true; btn.textContent = 'Spotting…'; }
  setStatus('', '');

  fetch('/api/pota/spot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(resp => {
      if (resp.ok) {
        const mhz = (freqHz / 1_000_000).toFixed(3);
        setStatus(`Spotted ${callsign} on ${mhz} ${mode} @ ${park}`, 'ok');
      } else {
        return resp.json()
          .then(data => { throw new Error(data.error || `HTTP ${resp.status}`); })
          .catch(() => { throw new Error(`HTTP ${resp.status}`); });
      }
    })
    .catch(err => setStatus(`Spot failed: ${err.message}`, 'err'))
    .finally(() => { if (btn) { btn.disabled = false; btn.textContent = 'Spot to POTA'; } });
}

// --- Init: wire up the self-spot row (called once from initOnAirRig) ---
export function initSelfSpot() {
  const row = $('rigSelfSpotRow');
  if (!row) return;

  if (!isFeatureVisible('pota_self_spot')) {
    row.classList.add('hidden');
    return;
  }
  row.classList.remove('hidden');

  const parkInput = $('rigMyPark');
  if (parkInput) {
    parkInput.value = state.myPark || '';
    parkInput.classList.toggle('rig-input-invalid',
      parkInput.value !== '' && !PARK_RE.test(parkInput.value));
    parkInput.addEventListener('input', handleParkInput);
  }

  $('rigSelfSpotBtn')?.addEventListener('click', handleSelfSpot);
}
