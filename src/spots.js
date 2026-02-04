import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS } from './constants.js';
import { esc, fmtTime, formatAge } from './utils.js';
import { spotId } from './filters.js';
import { flyToSpot } from './markers.js';

const SPOT_COL_VIS_KEY = 'hamtab_spot_columns';

export function loadSpotColumnVisibility() {
  try {
    const saved = JSON.parse(localStorage.getItem(SPOT_COL_VIS_KEY));
    if (saved && typeof saved === 'object') return saved;
  } catch (e) {}
  // Default: all columns visible
  const vis = {};
  SOURCE_DEFS.pota.columns.forEach(c => vis[c.key] = true);
  return vis;
}

export function saveSpotColumnVisibility() {
  localStorage.setItem(SPOT_COL_VIS_KEY, JSON.stringify(state.spotColumnVisibility));
}

export function renderSpots() {
  const filtered = state.sourceFiltered[state.currentSource] || [];
  const spotsBody = $('spotsBody');
  spotsBody.innerHTML = '';
  $('spotCount').textContent = `(${filtered.length})`;

  const cols = SOURCE_DEFS[state.currentSource].columns
    .filter(c => state.spotColumnVisibility[c.key] !== false);
  const sortKey = SOURCE_DEFS[state.currentSource].sortKey;

  const sorted = [...filtered].sort((a, b) => {
    return new Date(b[sortKey]) - new Date(a[sortKey]);
  });

  sorted.forEach(spot => {
    const tr = document.createElement('tr');
    const sid = spotId(spot);
    tr.dataset.spotId = sid;
    if (sid === state.selectedSpotId) tr.classList.add('selected');

    cols.forEach(col => {
      const td = document.createElement('td');
      if (col.class) td.className = col.class;
      if (col.key === 'spotTime') {
        const time = spot.spotTime ? new Date(spot.spotTime) : null;
        td.textContent = time ? fmtTime(time, { hour: '2-digit', minute: '2-digit' }) : '';
      } else if (col.key === 'age') {
        td.textContent = formatAge(spot.spotTime);
      } else if (col.key === 'callsign') {
        td.textContent = spot.activator || spot.callsign || '';
      } else if (col.key === 'reference') {
        const ref = spot[col.key] || '';
        if (ref) {
          const a = document.createElement('a');
          a.textContent = ref;
          a.target = '_blank';
          a.rel = 'noopener';
          if (state.currentSource === 'sota') {
            a.href = `https://www.sota.org.uk/Summit/${ref}`;
          } else {
            a.href = `https://pota.app/#/park/${ref}`;
          }
          a.addEventListener('click', e => e.stopPropagation());
          td.appendChild(a);
        }
      } else if (col.key === 'spotter' && state.currentSource === 'dxc') {
        const spotter = spot.spotter || '';
        if (spotter) {
          const a = document.createElement('a');
          a.textContent = spotter;
          a.href = `https://www.qrz.com/db/${encodeURIComponent(spotter)}`;
          a.target = '_blank';
          a.rel = 'noopener';
          a.addEventListener('click', e => e.stopPropagation());
          td.appendChild(a);
        }
      } else if (col.key === 'name') {
        const val = spot[col.key] || '';
        td.textContent = val;
        td.title = val;
      } else {
        td.textContent = spot[col.key] || '';
      }
      tr.appendChild(td);
    });

    tr.addEventListener('click', () => flyToSpot(spot));
    spotsBody.appendChild(tr);
  });
}
