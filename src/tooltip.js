import state from './state.js';
import { $ } from './dom.js';
import { esc, cacheCallsign } from './utils.js';

const callTooltip = document.createElement('div');
callTooltip.className = 'call-tooltip';
document.body.appendChild(callTooltip);

async function fetchCallsignInfo(call) {
  if (!call) return null;
  const key = call.toUpperCase();
  if (state.callsignCache[key]) return state.callsignCache[key];
  if (state.callsignCache[key] === null) return null;
  try {
    const resp = await fetch(`/api/callsign/${encodeURIComponent(key)}`);
    if (!resp.ok) { cacheCallsign(key, null); return null; }
    const data = await resp.json();
    if (data.status !== 'VALID') { cacheCallsign(key, null); return null; }
    cacheCallsign(key, data);
    return data;
  } catch {
    cacheCallsign(key, null);
    return null;
  }
}

function showCallTooltip(td, info) {
  let html = '';
  if (info.name) html += `<div class="call-tooltip-name">${esc(info.name)}</div>`;
  if (info.addr2) html += `<div class="call-tooltip-loc">${esc(info.addr2)}</div>`;
  if (info.class) html += `<div class="call-tooltip-class">${esc(info.class)}</div>`;
  if (info.grid) html += `<div class="call-tooltip-grid">${esc(info.grid)}</div>`;
  if (!html) { hideCallTooltip(); return; }
  callTooltip.innerHTML = html;
  callTooltip.classList.add('visible');

  const rect = td.getBoundingClientRect();
  let left = rect.left;
  let top = rect.bottom + 4;
  const ttWidth = callTooltip.offsetWidth;
  const ttHeight = callTooltip.offsetHeight;
  if (left + ttWidth > window.innerWidth) left = window.innerWidth - ttWidth - 4;
  if (top + ttHeight > window.innerHeight) top = rect.top - ttHeight - 4;
  callTooltip.style.left = left + 'px';
  callTooltip.style.top = top + 'px';
}

function hideCallTooltip() {
  callTooltip.classList.remove('visible');
}

function handleCallMouseEnter(e) {
  clearTimeout(state.tooltipHideTimer);
  const td = e.currentTarget;
  const call = td.textContent.trim();
  if (!call) return;

  const cached = state.callsignCache[call.toUpperCase()];
  if (cached) {
    showCallTooltip(td, cached);
  } else if (cached === undefined) {
    callTooltip.innerHTML = '<div class="call-tooltip-loading">Loading...</div>';
    callTooltip.classList.add('visible');
    const rect = td.getBoundingClientRect();
    callTooltip.style.left = rect.left + 'px';
    callTooltip.style.top = (rect.bottom + 4) + 'px';
    fetchCallsignInfo(call).then(info => {
      if (callTooltip.classList.contains('visible')) {
        if (info) {
          showCallTooltip(td, info);
        } else {
          hideCallTooltip();
        }
      }
    });
  }
}

function handleCallMouseLeave() {
  state.tooltipHideTimer = setTimeout(hideCallTooltip, 150);
}

export function initTooltipListeners() {
  const spotsBody = $('spotsBody');

  spotsBody.addEventListener('mouseover', (e) => {
    const td = e.target.closest('td.callsign');
    if (!td || td === state.currentHoverTd) return;
    state.currentHoverTd = td;
    handleCallMouseEnter({ currentTarget: td });
  });

  spotsBody.addEventListener('mouseout', (e) => {
    const td = e.target.closest('td.callsign');
    if (td && td === state.currentHoverTd) {
      const related = e.relatedTarget;
      if (!td.contains(related)) {
        state.currentHoverTd = null;
        handleCallMouseLeave();
      }
    }
  });
}
