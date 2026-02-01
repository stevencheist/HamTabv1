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
