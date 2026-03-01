import state from './state.js';
import { $ } from './dom.js';
import { SOURCE_DEFS } from './constants.js';
import { esc, fmtTime, formatAge } from './utils.js';
import { spotId, saveCurrentFilters } from './filters.js';
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

// Toggle sort column/direction when clicking a header
function toggleSort(colKey) {
  if (state.spotSortColumn === colKey) {
    // Toggle direction
    state.spotSortDirection = state.spotSortDirection === 'asc' ? 'desc' : 'asc';
  } else {
    // New column — default to desc for time/age, asc for others
    state.spotSortColumn = colKey;
    state.spotSortDirection = (colKey === 'spotTime' || colKey === 'age') ? 'desc' : 'asc';
  }
  saveCurrentFilters();
  renderSpots();
}

// Render table headers with sort indicators
export function renderSpotsHeader() {
  const cols = SOURCE_DEFS[state.currentSource].columns
    .filter(c => state.spotColumnVisibility[c.key] !== false);

  const thead = $('spotsHead');
  thead.innerHTML = '';
  const tr = document.createElement('tr');

  cols.forEach(col => {
    const th = document.createElement('th');
    th.textContent = col.label;

    if (col.sortable) {
      th.classList.add('sortable');
      th.addEventListener('click', () => toggleSort(col.key));

      // Determine effective sort column (null means use default sortKey)
      const effectiveCol = state.spotSortColumn || SOURCE_DEFS[state.currentSource].sortKey;
      if (effectiveCol === col.key || (col.key === 'age' && effectiveCol === 'spotTime' && !state.spotSortColumn)) {
        th.classList.add(state.spotSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    }
    tr.appendChild(th);
  });
  thead.appendChild(tr);
}

export function renderSpots() {
  const filtered = state.sourceFiltered[state.currentSource] || [];
  const spotsBody = $('spotsBody');
  spotsBody.innerHTML = '';
  $('spotCount').textContent = `(${filtered.length})`;

  // Render headers with sort indicators
  renderSpotsHeader();

  const cols = SOURCE_DEFS[state.currentSource].columns
    .filter(c => state.spotColumnVisibility[c.key] !== false);

  // Determine sort column and direction
  const sortCol = state.spotSortColumn || SOURCE_DEFS[state.currentSource].sortKey;
  const dir = state.spotSortDirection === 'asc' ? 1 : -1;

  const sorted = [...filtered].sort((a, b) => {
    // Handle different column types
    if (sortCol === 'spotTime' || sortCol === 'age') {
      // Sort by actual spotTime for both time and age columns
      return dir * (new Date(a.spotTime) - new Date(b.spotTime));
    } else if (sortCol === 'frequency') {
      // Numeric sort for frequency
      return dir * ((parseFloat(a.frequency) || 0) - (parseFloat(b.frequency) || 0));
    } else {
      // String comparison for callsign, mode, etc.
      const aVal = (a[sortCol] || a.activator || '').toString().toLowerCase();
      const bVal = (b[sortCol] || b.activator || '').toString().toLowerCase();
      return dir * aVal.localeCompare(bVal);
    }
  });

  sorted.forEach(spot => {
    const tr = document.createElement('tr');
    const sid = spotId(spot);
    tr.dataset.spotId = sid;
    if (sid === state.selectedSpotId) tr.classList.add('selected');
    // Highlight spots where user's callsign is the activator
    const spotCall = (spot.activator || spot.callsign || '').toUpperCase();
    if (state.myCallsign && spotCall === state.myCallsign.toUpperCase()) {
      tr.classList.add('my-spot');
    }
    // Watch list red highlight
    if (state.watchRedSpotIds.has(sid)) {
      tr.classList.add('spot-watch-red');
    }

    cols.forEach(col => {
      const td = document.createElement('td');
      if (col.class) td.className = col.class;
      if (col.key === 'spotTime') {
        const time = spot.spotTime ? new Date(spot.spotTime) : null;
        td.textContent = time ? fmtTime(time, { hour: '2-digit', minute: '2-digit' }) : '';
      } else if (col.key === 'age') {
        td.dataset.col = 'age';
        td.dataset.spotTime = spot.spotTime || '';
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
          } else if (state.currentSource === 'wwff') {
            a.href = `https://wwff.co/directory/?showRef=${encodeURIComponent(ref)}`;
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

// --- Incremental age cell update ---
// Patches only the age column text in place, avoiding a full table rebuild every 30s.
export function updateSpotAges() {
  const cells = $('spotsBody').querySelectorAll('td[data-col="age"]');
  for (const td of cells) {
    td.textContent = formatAge(td.dataset.spotTime);
  }
}
