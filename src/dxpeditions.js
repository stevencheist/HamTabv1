// --- DXpeditions Widget ---
// Fetches DXpedition data from /api/dxpeditions (NG3K RSS feed) and renders card list.

import state from './state.js';
import { $ } from './dom.js';

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
    return;
  }

  if (countEl) countEl.textContent = data.length;

  list.textContent = '';
  for (const dx of data) {
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
}
