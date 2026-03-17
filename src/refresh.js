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

export async function fetchSourceData(source) {
  const def = SOURCE_DEFS[source];
  if (!def) return;
  // Skip HTTP polling when SSE stream is active for this source
  if (source === 'dxc' && isDxcSseActive()) return;
  if (source === 'rbn' && isRbnSseActive()) return;
  try {
    // PSK and WSPR use server-side caching with appropriate TTLs — skip _t to allow edge cache hits
    const cacheable = source === 'psk' || source === 'wspr';
    const url = cacheable ? def.endpoint : def.endpoint + (def.endpoint.includes('?') ? '&' : '?') + '_t=' + Date.now();
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    let data = await resp.json();
    if (source === 'pota') {
      data = (Array.isArray(data) ? data : []).map(s => {
        if (!s.callsign && s.activator) s.callsign = s.activator;
        return s;
      });
    }
    state.sourceData[source] = Array.isArray(data) ? data : [];
    // Re-render WSPR heatmap when fresh WSPR data arrives
    if (source === 'wspr' && state.mapOverlays.wsprHeatmap) {
      clearTimeout(state.wsprHeatmapRenderTimer);
      const { renderWsprHeatmapCanvas } = require('./wspr-heatmap.js');
      state.wsprHeatmapRenderTimer = setTimeout(() => renderWsprHeatmapCanvas(state.wsprHeatmapBand), 200);
    }
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
    }
  } catch (err) {
    console.error(`Failed to fetch ${source} spots:`, err);
  }
}

export function refreshAll() {
  // Brief "Refreshing..." feedback
  const btn = $('refreshBtn');
  if (btn) btn.textContent = 'Refreshing...';

  fetchSourceData('pota');
  fetchSourceData('sota');
  fetchSourceData('dxc');
  fetchSourceData('wwff');
  fetchSourceData('psk');
  fetchSourceData('wspr');
  if (isFeatureVisible('rbn_source')) fetchSourceData('rbn');
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

export function startAutoRefresh() {
  stopAutoRefresh();
  state.autoRefreshEnabled = true;
  localStorage.setItem('hamtab_auto_refresh', 'true');
  resetCountdown();
  state.countdownTimer = setInterval(() => {
    if (document.hidden) return; // skip countdown ticks while hidden
    state.countdownSeconds--;
    if (state.countdownSeconds <= 0) {
      // Follower tabs skip auto-refresh — leader/solo tabs fetch for everyone.
      // Followers still show countdown and catch up on manual refresh or tab focus.
      if (isLeaderTab()) {
        refreshAll();
      } else {
        resetCountdown(); // restart countdown without fetching
      }
    }
    updateCountdownDisplay();
  }, 1000);
}

export function stopAutoRefresh() {
  state.autoRefreshEnabled = false;
  localStorage.setItem('hamtab_auto_refresh', 'false');
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
