// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- POTA Hunter: Confirm QSO + Spot Reporter ---
// Adds "Confirm QSO" and "Spot" buttons to DX Detail when viewing POTA spots.
// Worked callsigns are tracked in localStorage and can be filtered from On the Air.
import state from './state.js';
import { $ } from './dom.js';
import { esc } from './utils.js';
import { isFeatureVisible } from './feature-flags.js';
import { applyFilter } from './filters.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';
import { openModal, closeModal } from './a11y.js';

const WORKED_TTL = 24 * 60 * 60 * 1000; // 24 hours

// --- Worked List Management ---

function cleanExpiredWorked() {
  const now = Date.now();
  state.workedList = state.workedList.filter(e => now - e.timestamp < WORKED_TTL);
  saveWorkedList();
}

function saveWorkedList() {
  localStorage.setItem('hamtab_worked_list', JSON.stringify(state.workedList));
}

export function isWorked(callsign) {
  if (!callsign) return false;
  const upper = callsign.toUpperCase();
  const now = Date.now();
  return state.workedList.some(e => e.callsign === upper && now - e.timestamp < WORKED_TTL);
}

export function addWorked(callsign) {
  if (!callsign) return;
  const upper = callsign.toUpperCase();
  // Don't double-add
  if (isWorked(upper)) return;
  state.workedList.push({ callsign: upper, timestamp: Date.now() });
  saveWorkedList();
}

export function clearWorkedList() {
  state.workedList = [];
  saveWorkedList();
}

export function getWorkedCount() {
  cleanExpiredWorked();
  return state.workedList.length;
}

// --- DX Detail Action Buttons ---

export function renderHunterButtons(spot, container) {
  if (!isFeatureVisible('pota_hunter')) return;
  if (state.currentSource !== 'pota') return;
  if (!spot || !spot.callsign) return;

  const displayCall = spot.callsign || spot.activator || '';
  const worked = isWorked(displayCall);

  const wrap = document.createElement('div');
  wrap.className = 'pota-hunter-actions';

  // Confirm QSO button
  const confirmBtn = document.createElement('button');
  confirmBtn.className = 'btn btn-sm pota-hunter-btn pota-hunter-confirm';
  if (worked) {
    confirmBtn.textContent = '✓ Worked';
    confirmBtn.disabled = true;
    confirmBtn.classList.add('pota-hunter-worked');
  } else {
    confirmBtn.textContent = 'Confirm QSO';
    confirmBtn.addEventListener('click', () => {
      addWorked(displayCall);
      confirmBtn.textContent = '✓ Worked';
      confirmBtn.disabled = true;
      confirmBtn.classList.add('pota-hunter-worked');
      // Re-filter if hide worked is on.
      if (state.hideWorked) {
        applyFilter();
        renderSpots();
        renderMarkers();
      }
      updateWorkedBadge();
    });
  }
  wrap.appendChild(confirmBtn);

  // Spot button
  const spotBtn = document.createElement('button');
  spotBtn.className = 'btn btn-sm pota-hunter-btn pota-hunter-spot';
  spotBtn.textContent = 'Spot';
  spotBtn.addEventListener('click', () => openSpotReporter(spot));
  wrap.appendChild(spotBtn);

  container.appendChild(wrap);
}

// --- Hide Worked Filter Toggle ---

export function renderWorkedFilterToggle() {
  if (!isFeatureVisible('pota_hunter')) return;

  const wrap = $('workedFilterWrap');
  if (!wrap) return;

  wrap.classList.toggle('hidden', state.currentSource !== 'pota');
  if (state.currentSource !== 'pota') return;

  const btn = $('workedFilterBtn');
  if (!btn) return;

  const count = getWorkedCount();
  btn.classList.toggle('active', state.hideWorked);
  btn.textContent = count > 0 ? `Worked (${count})` : 'Worked';
  btn.title = state.hideWorked ? 'Showing worked stations — click to show all' : 'Click to hide worked stations';
}

function updateWorkedBadge() {
  renderWorkedFilterToggle();
}

export function initWorkedFilterListeners() {
  if (!isFeatureVisible('pota_hunter')) return;

  const btn = $('workedFilterBtn');
  if (!btn) return;

  btn.addEventListener('click', () => {
    state.hideWorked = !state.hideWorked;
    localStorage.setItem('hamtab_hide_worked', state.hideWorked);
    renderWorkedFilterToggle();
    applyFilter();
    renderSpots();
    renderMarkers();
  });

  const clearBtn = $('clearWorkedBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      clearWorkedList();
      renderWorkedFilterToggle();
      applyFilter();
      renderSpots();
      renderMarkers();
    });
  }
}

// --- Spot Reporter Popup ---

function getDefaultRst() {
  // Try to get RST from rig S-meter if available.
  try {
    const smeterEl = document.querySelector('.rig-smeter-value');
    if (smeterEl && smeterEl.textContent) {
      const raw = smeterEl.textContent.trim();
      // S-meter values like "S7", "S9+10" etc — convert to RST.
      const match = raw.match(/S(\d)/);
      if (match) {
        const s = parseInt(match[1], 10);
        return `5${s}`;
      }
    }
  } catch (e) {}
  return '59'; // default RST
}

function openSpotReporter(spot) {
  const popup = $('potaSpotPopup');
  if (!popup) return;

  const displayCall = spot.callsign || spot.activator || '';
  const freq = spot.frequency || '';
  const mode = spot.mode || '';
  const ref = spot.reference || '';

  // Populate fields
  const callEl = $('potaSpotCall');
  const freqEl = $('potaSpotFreq');
  const modeEl = $('potaSpotMode');
  const refEl = $('potaSpotRef');
  const commentEl = $('potaSpotComment');

  if (callEl) callEl.textContent = displayCall;
  if (freqEl) freqEl.textContent = `${freq} MHz`;
  if (modeEl) modeEl.textContent = mode;
  if (refEl) refEl.textContent = ref;

  // Build default comment
  const rst = getDefaultRst();
  const loc = state.spotterLocation || '';
  const comment = loc ? `${rst} from ${loc}` : rst;
  if (commentEl) commentEl.value = comment;

  openModal(popup, { focusEl: commentEl || $('potaSpotSubmit') });
}

function submitSpot() {
  const popup = $('potaSpotPopup');
  const callEl = $('potaSpotCall');
  const freqEl = $('potaSpotFreq');
  const modeEl = $('potaSpotMode');
  const refEl = $('potaSpotRef');
  const commentEl = $('potaSpotComment');
  const statusEl = $('potaSpotStatus');
  const submitBtn = $('potaSpotSubmit');

  if (!callEl || !freqEl || !refEl) return;

  const activator = callEl.textContent.trim();
  // Parse frequency — POTA API wants kHz string.
  const freqText = freqEl.textContent.replace(/[^\d.]/g, '').trim();
  const freqKhz = (parseFloat(freqText) * 1000).toFixed(0);
  const mode = modeEl ? modeEl.textContent.trim() : '';
  const reference = refEl.textContent.trim();
  const comments = commentEl ? commentEl.value.trim() : '';

  if (!activator || !reference) {
    if (statusEl) statusEl.textContent = 'Missing activator or reference.';
    return;
  }

  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
  if (statusEl) statusEl.textContent = '';

  const body = {
    activator,
    spotter: state.myCallsign || '',
    frequency: freqKhz,
    reference,
    mode,
    comments,
  };

  fetch('/api/pota/spot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
    .then(resp => {
      if (resp.ok) {
        if (statusEl) statusEl.textContent = 'Spot submitted!';
        if (statusEl) statusEl.className = 'pota-spot-status pota-spot-ok';
        setTimeout(() => closeModal(popup), 1500);
      } else {
        return resp.json().then(data => {
          throw new Error(data.error || `HTTP ${resp.status}`);
        }).catch(() => { throw new Error(`HTTP ${resp.status}`); });
      }
    })
    .catch(err => {
      if (statusEl) { statusEl.textContent = `Failed: ${err.message}`; statusEl.className = 'pota-spot-status pota-spot-err'; }
    })
    .finally(() => {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Submit Spot'; }
    });
}

// --- Init ---

export function initPotaHunter() {
  if (!isFeatureVisible('pota_hunter')) return;

  initWorkedFilterListeners();

  // Spot reporter popup listeners.

  const popup = $('potaSpotPopup');
  if (!popup) return;

  $('potaSpotSubmit')?.addEventListener('click', submitSpot);
  $('potaSpotCancel')?.addEventListener('click', () => closeModal(popup));
  popup.addEventListener('click', (e) => { if (e.target === popup) closeModal(popup); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.classList.contains('hidden')) {
      if (!state.a11yEscapeClose) return;
      closeModal(popup);
    }
  });

  // Clean expired on startup.
  cleanExpiredWorked();
  renderWorkedFilterToggle();
}
