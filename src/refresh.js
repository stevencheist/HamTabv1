import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS } from './constants.js';
import { fmtTime } from './utils.js';
import { applyFilter, updateBandFilterButtons, updateModeFilterButtons, updateCountryFilter, updateStateFilter, updateGridFilter, updateContinentFilter } from './filters.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';
import { fetchSolar, fetchPropagation } from './solar.js';
import { fetchLunar } from './lunar.js';
import { fetchVoacapMatrixThrottled } from './voacap.js';
import { fetchSpaceWxData } from './spacewx-graphs.js';
import { fetchDxpeditions } from './dxpeditions.js';
import { fetchContests } from './contests.js';

export async function fetchSourceData(source) {
  const def = SOURCE_DEFS[source];
  if (!def) return;
  try {
    const resp = await fetch(def.endpoint);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    let data = await resp.json();
    if (source === 'pota') {
      data = (Array.isArray(data) ? data : []).map(s => {
        if (!s.callsign && s.activator) s.callsign = s.activator;
        return s;
      });
    }
    state.sourceData[source] = Array.isArray(data) ? data : [];
    if (source === state.currentSource) {
      applyFilter();
      renderSpots();
      renderMarkers();
      updateBandFilterButtons();
      updateModeFilterButtons();
      updateCountryFilter();
      updateStateFilter();
      updateGridFilter();
      updateContinentFilter();
      $('lastUpdated').textContent = 'Updated: ' + fmtTime(new Date());
    }
  } catch (err) {
    console.error(`Failed to fetch ${source} spots:`, err);
  }
}

export function refreshAll() {
  fetchSourceData('pota');
  fetchSourceData('sota');
  fetchSourceData('dxc');
  fetchSourceData('psk');
  fetchSolar();
  fetchLunar();
  fetchPropagation();
  fetchVoacapMatrixThrottled();
  fetchSpaceWxData();
  fetchDxpeditions();
  fetchContests();
  resetCountdown();
}

function resetCountdown() {
  state.countdownSeconds = 60;
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  if (state.autoRefreshEnabled) {
    $('countdown').textContent = `(${state.countdownSeconds}s)`;
  } else {
    $('countdown').textContent = '';
  }
}

export function startAutoRefresh() {
  stopAutoRefresh();
  state.autoRefreshEnabled = true;
  resetCountdown();
  state.countdownTimer = setInterval(() => {
    state.countdownSeconds--;
    if (state.countdownSeconds <= 0) {
      refreshAll();
    }
    updateCountdownDisplay();
  }, 1000);
}

export function stopAutoRefresh() {
  state.autoRefreshEnabled = false;
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
  $('countdown').textContent = '';
}

export function initRefreshListeners() {
  $('autoRefresh').addEventListener('change', () => {
    if ($('autoRefresh').checked) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }
  });

  $('refreshBtn').addEventListener('click', () => {
    refreshAll();
  });
}
