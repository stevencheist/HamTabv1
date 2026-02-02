import state from './state.js';

export function esc(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function fmtTime(date, options) {
  const opts = Object.assign({ hour12: !state.use24h }, options || {});
  return date.toLocaleTimeString([], opts);
}

const CALLSIGN_CACHE_MAX = 500;

export function cacheCallsign(key, value) {
  const keys = Object.keys(state.callsignCache);
  if (keys.length >= CALLSIGN_CACHE_MAX) {
    // Evict oldest half to avoid thrashing
    const toRemove = keys.slice(0, Math.floor(keys.length / 2));
    toRemove.forEach(k => delete state.callsignCache[k]);
  }
  state.callsignCache[key] = value;
}

export function formatAge(spotTime) {
  if (!spotTime) return '';
  const ts = spotTime.endsWith('Z') ? spotTime : spotTime + 'Z';
  const diffMs = Date.now() - new Date(ts).getTime();
  if (diffMs < 0) return '0s';
  const totalSec = Math.floor(diffMs / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return m > 0 ? `${h}h${m}m` : `${h}h`;
  if (m > 0) return s > 0 ? `${m}m${s}s` : `${m}m`;
  return `${s}s`;
}
