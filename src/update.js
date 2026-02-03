import { $ } from './dom.js';

// Show static version string — no update polling in hosted mode
export function initUpdateDisplay() {
  const el = $('platformLabel');
  if (el) el.textContent = 'v' + __APP_VERSION__;
}
