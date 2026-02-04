import state from './state.js';
import { $ } from './dom.js';
import { fmtTime } from './utils.js';
import { isDaytime } from './geo.js';

function updateDayNight() {
  const now = new Date();
  if (state.myLat !== null && state.myLon !== null) {
    state.lastLocalDay = isDaytime(state.myLat, state.myLon, now);
  } else {
    state.lastLocalDay = null;
  }
  state.lastUtcDay = isDaytime(51.48, 0, now);
}

export function updateClocks() {
  const now = new Date();
  const localTime = fmtTime(now);
  const utcTime = fmtTime(now, { timeZone: 'UTC' });
  // Render simplified time-only displays in header
  $('clockLocalTime').textContent = localTime;
  $('clockUtcTime').textContent = utcTime;
  updateDayNight();
}
