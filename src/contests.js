// --- Contests Widget ---
// Fetches contest calendar from /api/contests (WA7BNM RSS feed) and renders card list.

import state from './state.js';
import { $ } from './dom.js';

export function initContestListeners() {
  const list = $('contestList');
  if (!list) return;
  // Delegate click on cards to open contest detail page
  list.addEventListener('click', (e) => {
    const card = e.target.closest('.contest-card');
    if (!card) return;
    const url = card.dataset.link;
    if (url) window.open(url, '_blank', 'noopener');
  });
}

export async function fetchContests() {
  try {
    const resp = await fetch('/api/contests');
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    state.lastContestData = await resp.json();
    renderContests();
  } catch (err) {
    if (state.debug) console.error('Failed to fetch contests:', err);
  }
}

export function renderContests() {
  const list = $('contestList');
  const countEl = $('contestCount');
  if (!list) return;

  const data = state.lastContestData;
  if (!Array.isArray(data) || data.length === 0) {
    list.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'contest-empty';
    empty.textContent = 'No upcoming contests found';
    list.appendChild(empty);
    if (countEl) countEl.textContent = '';
    return;
  }

  if (countEl) countEl.textContent = data.length;

  list.textContent = '';
  for (const c of data) {
    const card = document.createElement('div');
    card.className = 'contest-card';
    if (c.status === 'active') card.classList.add('contest-active-card');
    if (c.link) card.dataset.link = c.link;

    const header = document.createElement('div');
    header.className = 'contest-header';

    const name = document.createElement('span');
    name.className = 'contest-name';
    name.textContent = c.name || '??';
    header.appendChild(name);

    if (c.mode && c.mode !== 'mixed') {
      const modeBadge = document.createElement('span');
      modeBadge.className = 'contest-mode contest-mode-' + c.mode;
      modeBadge.textContent = c.mode.toUpperCase();
      header.appendChild(modeBadge);
    }

    if (c.status === 'active') {
      const badge = document.createElement('span');
      badge.className = 'contest-now-badge';
      badge.textContent = 'NOW';
      header.appendChild(badge);
    }

    card.appendChild(header);

    const detail = document.createElement('div');
    detail.className = 'contest-detail';
    detail.textContent = c.dateStr || '';
    card.appendChild(detail);

    list.appendChild(card);
  }
}
