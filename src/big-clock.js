// --- Big Clock Mode ---
// Fullscreen clock overlay showing UTC and local time in large font.
// Toggle by clicking the header clock group.

import state from './state.js';
import { $ } from './dom.js';
import { fmtTime } from './utils.js';

let active = false;

function fmtDate(date, options) {
  return date.toLocaleDateString(undefined, Object.assign({
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  }, options || {}));
}

export function updateBigClock() {
  if (!active) return;
  const now = new Date();
  const localEl = $('bigClockLocal');
  const utcEl = $('bigClockUtc');
  const dateEl = $('bigClockDate');
  const utcDateEl = $('bigClockUtcDate');
  if (localEl) localEl.textContent = fmtTime(now);
  if (utcEl) utcEl.textContent = fmtTime(now, { timeZone: 'UTC' });
  if (dateEl) dateEl.textContent = fmtDate(now);
  if (utcDateEl) utcDateEl.textContent = fmtDate(now, { timeZone: 'UTC' });
}

function show() {
  const overlay = $('bigClockOverlay');
  if (!overlay) return;
  active = true;
  overlay.classList.remove('hidden');
  updateBigClock();
}

function hide() {
  const overlay = $('bigClockOverlay');
  if (!overlay) return;
  active = false;
  overlay.classList.add('hidden');
}

export function toggleBigClock() {
  if (active) hide(); else show();
}

export function initBigClock() {
  // Toggle on header clock click
  const clockGroup = $('headerClockLocal');
  const clockUtc = $('headerClockUtc');
  if (clockGroup) clockGroup.addEventListener('click', toggleBigClock);
  if (clockUtc) clockUtc.addEventListener('click', toggleBigClock);

  // Close on overlay click or Escape
  const overlay = $('bigClockOverlay');
  if (overlay) {
    overlay.addEventListener('click', hide);
    // Prevent clicks on inner content from closing
    const inner = overlay.querySelector('.big-clock-inner');
    if (inner) inner.addEventListener('click', (e) => e.stopPropagation());
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) hide();
  });
}
