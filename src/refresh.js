// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS } from './constants.js';
import { applyFilter, updateBandFilterButtons, updateModeFilterButtons, updateCountryFilter, updateStateFilter, updateGridFilter, updateContinentFilter } from './filters.js';
import { renderSpots } from './spots.js';
import { renderMarkers } from './markers.js';
import { fetchSolar, fetchPropagation } from './solar.js';
import { fetchLunar } from './lunar.js';
import { fetchVoacapMatrixThrottled } from './voacap.js';
import { fetchSpaceWxData } from './spacewx-graphs.js';
import { fetchDxpeditions } from './dxpeditions.js';
import { fetchContests } from './contests.js';
import { isWidgetVisible } from './widgets.js';
import { isLeaderTab } from './cross-tab.js';
import { isFeatureVisible } from './feature-flags.js';
import { register as registerJob, unregister as unregisterJob, has as hasJob, runNow as runNowJob, getJobState } from './fetch-scheduler.js';

const AUTO_REFRESH_JOB_ID = 'auto-refresh-countdown';

// --- DXC/RBN SSE Live Connections ---

let dxcSse = null; // EventSource instance for DXC live TCP
let rbnSse = null; // EventSource instance for RBN live TCP

function handleSseEvents(source, eventSource, sourceName) {
  eventSource.addEventListener('init', (e) => {
    try {
      const spots = JSON.parse(e.data);
      if (Array.isArray(spots)) {
        state.sourceData[sourceName] = spots;
        if (state.currentSource === sourceName) {
          applyFilter(); renderSpots(); renderMarkers();
          updateBandFilterButtons(); updateModeFilterButtons();
        }
      }
    } catch (err) {
      if (state.debug) console.error(`[SSE:${sourceName}] init parse error:`, err);
    }
  });

  eventSource.addEventListener('message', (e) => {
    try {
      const spot = JSON.parse(e.data);
      state.sourceData[sourceName].push(spot);
      // Trim to 500 spots max (ring buffer parity)
      if (state.sourceData[sourceName].length > 500) {
        state.sourceData[sourceName].shift();
      }
      if (state.currentSource === sourceName) {
        applyFilter(); renderSpots(); renderMarkers();
      }
    } catch (err) {
      if (state.debug) console.error(`[SSE:${sourceName}] message parse error:`, err);
    }
  });

  eventSource.addEventListener('status', (e) => {
    if (state.debug) console.log(`[SSE:${sourceName}] status:`, e.data);
  });

  eventSource.onerror = () => {
    if (state.debug) console.warn(`[SSE:${sourceName}] connection error`);
  };
}

export function connectDxcSse() {
  if (dxcSse) return; // already connected
  if (!isFeatureVisible('dxc_live_tcp')) return;
  const callsign = encodeURIComponent(state.myCallsign || '');
  dxcSse = new EventSource(`/api/spots/dxc/stream?callsign=${callsign}`);
  handleSseEvents(dxcSse, dxcSse, 'dxc');
}

export function disconnectDxcSse() {
  if (dxcSse) { dxcSse.close(); dxcSse = null; }
}

export function connectRbnSse() {
  if (rbnSse) return;
  if (!isFeatureVisible('rbn_source')) return;
  const callsign = encodeURIComponent(state.myCallsign || '');
  rbnSse = new EventSource(`/api/spots/rbn/stream?callsign=${callsign}`);
  handleSseEvents(rbnSse, rbnSse, 'rbn');
}

export function disconnectRbnSse() {
  if (rbnSse) { rbnSse.close(); rbnSse = null; }
}

export function isDxcSseActive() { return dxcSse !== null; }
export function isRbnSseActive() { return rbnSse !== null; }

// --- Source job descriptors ---
//
// Each spot source is described declaratively. The list replaces the
// hardcoded fan-out in refreshAll(). Adding a new source = appending an
// entry here, no orchestrator changes required.
//
// Fields:
//   id          — scheduler-compatible job id (unique)
//   source      — key into SOURCE_DEFS / state.sourceData
//   featureFlag — optional feature flag gate
//   shortCircuit — optional () => boolean. When it returns true, the fetch
//                  is skipped (used to defer to an active SSE stream).
//   transform   — optional (data) => data, applied to the raw response
//                 before storing in state.sourceData
//   cacheable   — true if the endpoint is server-side cached and we can
//                 rely on edge cache hits (skip the _t cache-buster).
//
// Each entry has the same SHAPE as a fetch-scheduler job spec (id +
// gating fields), so PR 8 can register them with the scheduler when
// per-source backoff and freshness metadata are added.

const SOURCE_JOBS = [
  { id: 'source-pota', source: 'pota', cacheable: false,
    transform: (data) => (Array.isArray(data) ? data : []).map(s => {
      if (!s.callsign && s.activator) s.callsign = s.activator;
      return s;
    }),
  },
  { id: 'source-sota', source: 'sota', cacheable: false },
  { id: 'source-dxc',  source: 'dxc',  cacheable: false,
    shortCircuit: () => isDxcSseActive(),
  },
  { id: 'source-wwff', source: 'wwff', cacheable: false },
  { id: 'source-psk',  source: 'psk',  cacheable: true },
  { id: 'source-wspr', source: 'wspr', cacheable: true },
  { id: 'source-rbn',  source: 'rbn',  cacheable: false,
    featureFlag: 'rbn_source',
    shortCircuit: () => isRbnSseActive(),
  },
];

// --- Layer 1: source descriptor lookup ---

export function getSourceJob(source) {
  return SOURCE_JOBS.find(j => j.source === source) || null;
}

export function listSourceJobs() {
  return SOURCE_JOBS.slice();
}

// --- Layer 2: fetch execution ---
// Pure: builds the URL, hits the endpoint, returns parsed JSON.
// No state mutation, no DOM, no rendering. Returns null if the source
// short-circuits (e.g., SSE stream active).

async function fetchSourceRaw(job) {
  const def = SOURCE_DEFS[job.source];
  if (!def) throw new Error(`Unknown source: ${job.source}`);
  if (job.shortCircuit && job.shortCircuit()) return null;
  const url = job.cacheable
    ? def.endpoint
    : def.endpoint + (def.endpoint.includes('?') ? '&' : '?') + '_t=' + Date.now();
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// --- Layer 3: UI/state application ---
// Takes already-parsed data and updates state.sourceData + re-renders if
// this source is currently visible. Pure-ish: only side effects are state
// mutation and DOM updates via the existing render functions.

function applySourceData(job, rawData) {
  const transformed = job.transform ? job.transform(rawData) : rawData;
  state.sourceData[job.source] = Array.isArray(transformed) ? transformed : [];

  // Re-render WSPR heatmap when fresh WSPR data arrives.
  if (job.source === 'wspr' && state.mapOverlays.wsprHeatmap) {
    clearTimeout(state.wsprHeatmapRenderTimer);
    const { renderWsprHeatmapCanvas } = require('./wspr-heatmap.js');
    state.wsprHeatmapRenderTimer = setTimeout(
      () => renderWsprHeatmapCanvas(state.wsprHeatmapBand),
      200
    );
  }

  if (job.source === state.currentSource) {
    applyFilter();
    renderSpots();
    renderMarkers();
    updateBandFilterButtons();
    updateModeFilterButtons();
    updateCountryFilter();
    updateStateFilter();
    updateGridFilter();
    updateContinentFilter();
  }
}

// --- Job runner: orchestrates fetch + apply with feature-flag gate ---
//
// runSourceJob throws on fetch errors so the scheduler's executeJob can
// record the failure (lastFailedAt, consecutiveFailures, lastError).
// Callers that don't want exceptions (e.g., direct invocations from
// source-tab switching) should go through fetchSourceData() instead.

async function runSourceJob(job) {
  if (job.featureFlag && !isFeatureVisible(job.featureFlag)) return;
  const data = await fetchSourceRaw(job);
  if (data === null) return; // short-circuited
  applySourceData(job, data);
}

// Register each source job with the scheduler in manual mode. They
// don't auto-fire — they're invoked via runNow() from refreshAll() or
// fetchSourceData(). Manual mode gives us per-job state tracking
// (lastSucceededAt, consecutiveFailures, etc.) without changing trigger
// semantics.
SOURCE_JOBS.forEach(job => {
  registerJob({
    id: job.id,
    run: () => runSourceJob(job),
    manual: true,
    kind: 'fetch',
  });
});

// Backward-compatible API: callers (e.g., source.js when switching tabs)
// invoke fetchSourceData(source) by name. Routes through the scheduler's
// runNow() so success/failure are tracked. Catches errors so callers
// don't need to handle them.
export async function fetchSourceData(source) {
  const job = getSourceJob(source);
  if (!job) return;
  await runNowJob(job.id);
}

// Get tracking state for a source job (for widget freshness display).
// Returns null if the source isn't registered.
export function getSourceJobState(source) {
  const job = getSourceJob(source);
  if (!job) return null;
  return getJobState(job.id);
}

// --- Manual override / orchestrator ---
// refreshAll iterates the registered source jobs (no more hardcoded
// fan-out) and also kicks the auxiliary widget fetches that aren't yet
// modeled as source jobs. Same trigger semantics as before — fired by
// the auto-refresh countdown and the manual refresh button.

export function refreshAll() {
  // Brief "Refreshing..." feedback
  const btn = $('refreshBtn');
  if (btn) btn.textContent = 'Refreshing...';

  // Fan out to all registered source jobs via the scheduler so
  // success/failure are tracked uniformly.
  for (const job of SOURCE_JOBS) {
    runNowJob(job.id);
  }

  // Auxiliary widget fetches — not yet modeled as source jobs because
  // they don't share the SOURCE_DEFS shape and have widget-specific gates.
  if (isWidgetVisible('widget-solar') || isWidgetVisible('widget-propagation') || isWidgetVisible('widget-voacap')) fetchSolar();
  if (isWidgetVisible('widget-lunar')) fetchLunar();
  fetchPropagation(); // map overlay, always useful
  if (isWidgetVisible('widget-voacap') || state.hfPropOverlayBand) fetchVoacapMatrixThrottled();
  if (isWidgetVisible('widget-spacewx')) fetchSpaceWxData();
  if (isWidgetVisible('widget-dxpeditions') || state.mapOverlays.dxpedMarkers) fetchDxpeditions();
  if (isWidgetVisible('widget-contests')) fetchContests();
  resetCountdown();
}

function resetCountdown() {
  state.countdownSeconds = 60;
  updateCountdownDisplay();
}

function updateCountdownDisplay() {
  const btn = $('refreshBtn');
  if (!btn) return;
  if (state.autoRefreshEnabled) {
    btn.textContent = 'Refresh (' + state.countdownSeconds + 's)';
  } else {
    btn.textContent = 'Refresh';
  }
}

// Auto-refresh countdown — ticks once per second when visible. Followers
// tick the countdown for display parity but defer the actual refreshAll()
// to the leader tab. The leader-tab gate stays inside the run function
// (not on the scheduler job) so that follower tabs still update the
// visible "Refresh (Ns)" button.
function autoRefreshTick() {
  state.countdownSeconds--;
  if (state.countdownSeconds <= 0) {
    if (isLeaderTab()) {
      refreshAll();
    } else {
      resetCountdown(); // restart countdown without fetching
    }
  }
  updateCountdownDisplay();
}

export function startAutoRefresh() {
  stopAutoRefresh();
  state.autoRefreshEnabled = true;
  localStorage.setItem('hamtab_auto_refresh', 'true');
  resetCountdown();
  registerJob({
    id: AUTO_REFRESH_JOB_ID,
    intervalMs: 1000,
    run: autoRefreshTick,
    kind: 'render',
  });
}

export function stopAutoRefresh() {
  state.autoRefreshEnabled = false;
  localStorage.setItem('hamtab_auto_refresh', 'false');
  if (hasJob(AUTO_REFRESH_JOB_ID)) {
    unregisterJob(AUTO_REFRESH_JOB_ID);
  }
  // Clean up legacy state.countdownTimer in case it lingers across hot reloads.
  if (state.countdownTimer) {
    clearInterval(state.countdownTimer);
    state.countdownTimer = null;
  }
  const btn = $('refreshBtn');
  if (btn) btn.textContent = 'Refresh';
}

export function initRefreshListeners() {
  $('refreshBtn').addEventListener('click', () => {
    refreshAll();
  });
}
