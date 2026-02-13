// --- Contests Widget ---
// Fetches contest calendar from /api/contests (WA7BNM RSS feed) and renders card list.
// Client-side real-time status evaluation using startDate/endDate so contests
// transition active→past without waiting for the 6-hour server cache to refresh.

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

// Format contest date range: "Sat Feb 8, 00:00z – Sun Feb 9, 23:59z"
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
function fmtContestRange(startISO, endISO) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  if (isNaN(s) || isNaN(e)) return '';
  const fmt = (d) => {
    const day = SHORT_DAYS[d.getUTCDay()];
    const mon = SHORT_MONTHS[d.getUTCMonth()];
    const date = d.getUTCDate();
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    return `${day} ${mon} ${date}, ${hh}:${mm}z`;
  };
  return `${fmt(s)} \u2013 ${fmt(e)}`;
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

  // Re-evaluate status client-side for real-time accuracy
  const now = Date.now();
  const visible = [];
  for (const c of data) {
    const start = c.startDate ? new Date(c.startDate).getTime() : null;
    const end = c.endDate ? new Date(c.endDate).getTime() : null;
    if (end && now > end) continue; // auto-remove past contests
    const isActive = start && end && now >= start && now <= end;
    visible.push({ ...c, _active: isActive });
  }

  if (visible.length === 0) {
    list.textContent = '';
    const empty = document.createElement('div');
    empty.className = 'contest-empty';
    empty.textContent = 'No upcoming contests found';
    list.appendChild(empty);
    if (countEl) countEl.textContent = '';
    return;
  }

  // Sort: active first, then by start date ascending
  visible.sort((a, b) => {
    if (a._active !== b._active) return a._active ? -1 : 1;
    const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
    const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
    return aDate - bDate;
  });

  if (countEl) countEl.textContent = visible.length;

  list.textContent = '';
  for (const c of visible) {
    const card = document.createElement('div');
    card.className = 'contest-card';
    if (c._active) card.classList.add('contest-active-card');
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

    if (c._active) {
      const badge = document.createElement('span');
      badge.className = 'contest-now-badge';
      badge.textContent = 'NOW';
      header.appendChild(badge);
    }

    card.appendChild(header);

    // Formatted date line — show start/end in compact readable format
    const detail = document.createElement('div');
    detail.className = 'contest-detail';
    if (c.startDate && c.endDate) {
      detail.textContent = fmtContestRange(c.startDate, c.endDate);
    } else {
      detail.textContent = c.dateStr || '';
    }
    card.appendChild(detail);

    list.appendChild(card);
  }
}
