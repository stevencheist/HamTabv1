// --- DXpeditions Widget ---
// Fetches DXpedition data from /api/dxpeditions (NG3K RSS feed) and renders card list.
// Also plots DXpedition locations on the map as circle markers.

import state from './state.js';
import { $ } from './dom.js';

// Time filter cutoffs in milliseconds from now
const TIME_FILTER_MS = {
  active: 0,       // special case — only items where active === true
  '7d':  7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '180d': 180 * 24 * 60 * 60 * 1000,
  all: Infinity,
};

function filterByTime(data) {
  const filter = state.dxpedTimeFilter || 'all';
  if (filter === 'all') return data;
  if (filter === 'active') return data.filter(d => d.active);

  const cutoff = TIME_FILTER_MS[filter];
  if (!cutoff) return data;

  const now = Date.now();
  return data.filter(d => {
    if (d.active) return true; // always show active
    // Show if starts within the time window
    if (d.startDate) {
      const start = new Date(d.startDate).getTime();
      return start - now <= cutoff;
    }
    return false; // no date info — exclude when filtering
  });
}

export function initDxpeditionListeners() {
  const list = $('dxpedList');
  if (!list) return;
  // Delegate click on cards to open link in new tab
  list.addEventListener('click', (e) => {
    const card = e.target.closest('.dxped-card');
    if (!card) return;
    const url = card.dataset.link;
    if (url) window.open(url, '_blank', 'noopener');
  });

  // Time filter dropdown
  const filterSel = $('dxpedTimeFilter');
  if (filterSel) {
    filterSel.value = state.dxpedTimeFilter;
    filterSel.addEventListener('change', () => {
      state.dxpedTimeFilter = filterSel.value;
      localStorage.setItem('hamtab_dxped_time_filter', filterSel.value);
      renderDxpeditions();
    });
    // Prevent widget drag when interacting with dropdown
    filterSel.addEventListener('mousedown', (e) => { e.stopPropagation(); });
  }
}

export async function fetchDxpeditions() {
  try {
    const resp = await fetch('/api/dxpeditions');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.lastDxpeditionData = await resp.json();
    renderDxpeditions();
  } catch (err) {
    if (state.debug) console.error('Failed to fetch DXpeditions:', err);
  }
}

export function renderDxpeditions() {
  const list = $('dxpedList');
  const countEl = $('dxpeditionCount');
  if (!list) return;

  const data = state.lastDxpeditionData;
  if (!Array.isArray(data) || data.length === 0) {
    list.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'dxped-empty';
    empty.textContent = 'No DXpeditions found';
    list.appendChild(empty);
    if (countEl) countEl.textContent = '';
    updateDxpeditionMarkers([]);
    return;
  }

  const filtered = filterByTime(data);
  if (countEl) countEl.textContent = filtered.length;

  list.textContent = '';
  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'dxped-empty';
    empty.textContent = 'No DXpeditions match the selected time filter';
    list.appendChild(empty);
    updateDxpeditionMarkers([]);
    return;
  }

  for (const dx of filtered) {
    const card = document.createElement('div');
    card.className = 'dxped-card';
    if (dx.active) card.classList.add('dxped-active-card');
    if (dx.link) card.dataset.link = dx.link;

    const header = document.createElement('div');
    header.className = 'dxped-header';

    const call = document.createElement('span');
    call.className = 'dxped-call';
    call.textContent = dx.callsign || '??';
    header.appendChild(call);

    const entity = document.createElement('span');
    entity.className = 'dxped-entity';
    entity.textContent = dx.entity || '';
    header.appendChild(entity);

    if (dx.active) {
      const badge = document.createElement('span');
      badge.className = 'dxped-badge';
      badge.textContent = 'ACTIVE';
      header.appendChild(badge);
    }

    card.appendChild(header);

    const detail = document.createElement('div');
    detail.className = 'dxped-detail';
    const parts = [];
    if (dx.dateStr) parts.push(dx.dateStr);
    if (dx.qsl) parts.push('QSL: ' + dx.qsl);
    detail.textContent = parts.join('  \u00B7  ');
    card.appendChild(detail);

    list.appendChild(card);
  }

  // Map markers show same filtered set
  updateDxpeditionMarkers(filtered);
}

// --- DXpedition Map Markers ---

function updateDxpeditionMarkers(data) {
  if (!state.map || typeof L === 'undefined') return;

  // Remove old markers
  for (const m of state.dxpedMarkers) {
    state.map.removeLayer(m);
  }
  state.dxpedMarkers = [];

  if (!Array.isArray(data)) return;
  if (!state.mapOverlays.dxpedMarkers) return; // overlay disabled

  for (const dx of data) {
    if (dx.lat == null || dx.lon == null) continue;

    const isActive = !!dx.active;
    const marker = L.circleMarker([dx.lat, dx.lon], {
      radius: isActive ? 6 : 4,
      color: isActive ? '#ff9800' : '#9e6b00',       // orange outline
      fillColor: isActive ? '#ff9800' : '#9e6b00',
      fillOpacity: isActive ? 0.8 : 0.4,
      weight: isActive ? 2 : 1,
      interactive: true,
    }).addTo(state.map);

    const lines = [dx.callsign || '??'];
    if (dx.entity) lines.push(dx.entity);
    if (dx.dateStr) lines.push(dx.dateStr);
    if (isActive) lines.push('ACTIVE NOW');
    marker.bindTooltip(lines.join('\n'));

    state.dxpedMarkers.push(marker);
  }
}
