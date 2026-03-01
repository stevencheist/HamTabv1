// --- Logbook Widget (ADIF Import) ---
// Parses ADIF files, stores QSOs in IndexedDB, renders sortable table + map markers.

import state from './state.js';
import { $ } from './dom.js';
import { esc } from './utils.js';
import { gridToLatLon, geodesicPoints } from './geo.js';
import { freqToBand } from './filters.js';
import { getBandColor } from './constants.js';

// --- ADIF Parser ---

function parseADIF(text) {
  const records = [];
  // Strip header (everything before <eoh>)
  const headerEnd = text.search(/<eoh>/i);
  const body = headerEnd >= 0 ? text.substring(headerEnd + 5) : text;

  // Split on <eor> to get individual records
  const rawRecords = body.split(/<eor>/i);

  for (const raw of rawRecords) {
    const record = {};
    // Match field tags: <FIELD_NAME:LENGTH[:TYPE]>value
    const fieldRe = /<([A-Za-z_][A-Za-z0-9_]*):(\d+)(?::[A-Za-z])?>/gi;
    let m;
    while ((m = fieldRe.exec(raw)) !== null) {
      const name = m[1].toUpperCase();
      const len = parseInt(m[2], 10);
      const valStart = m.index + m[0].length;
      const val = raw.substring(valStart, valStart + len);
      record[name] = val;
    }
    if (record.CALL) records.push(record);
  }
  return records;
}

// --- Grid square → lat/lon (supports 4 and 6 char) ---

function gridToLL(grid) {
  if (!grid || grid.length < 4) return null;
  const g = grid.toUpperCase();
  if (!/^[A-R]{2}[0-9]{2}/.test(g)) return null;
  let lon = (g.charCodeAt(0) - 65) * 20 + parseInt(g[2]) * 2 - 180;
  let lat = (g.charCodeAt(1) - 65) * 10 + parseInt(g[3]) - 90;
  if (g.length >= 6 && /^[A-X]{2}$/.test(g.substring(4, 6))) {
    lon += (g.charCodeAt(4) - 65) * (2 / 24) + (1 / 24);
    lat += (g.charCodeAt(5) - 65) * (1 / 24) + (1 / 48);
  } else {
    lon += 1; // center of 4-char grid
    lat += 0.5;
  }
  return { lat, lon };
}

// --- IndexedDB Storage ---

const DB_NAME = 'hamtab_logbook';
const DB_VERSION = 1;
const STORE_NAME = 'qsos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('call', 'CALL', { unique: false });
        store.createIndex('date', 'QSO_DATE', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function saveQSOs(records) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  store.clear();
  for (const r of records) store.put(r);
  return new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
}

async function loadQSOs() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function clearQSOs() {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  return new Promise((resolve) => { tx.oncomplete = resolve; });
}

// --- Column Definitions ---

const LOGBOOK_COLS = [
  { key: 'QSO_DATE',  label: 'Date',     sortable: true },
  { key: 'TIME_ON',   label: 'Time',     sortable: true },
  { key: 'CALL',      label: 'Call',     sortable: true },
  { key: 'FREQ',      label: 'Freq',     sortable: true },
  { key: 'BAND',      label: 'Band',     sortable: true },
  { key: 'MODE',      label: 'Mode',     sortable: true },
  { key: 'RST_SENT',  label: 'S',        sortable: false },
  { key: 'RST_RCVD',  label: 'R',        sortable: false },
  { key: 'GRIDSQUARE', label: 'Grid',    sortable: true },
  { key: 'NAME',      label: 'Name',     sortable: true },
];

// --- Filtering ---

function getFilteredData() {
  let data = state.logbookData;
  if (state.logbookFilterBand) {
    data = data.filter(q => (q.BAND || '').toUpperCase() === state.logbookFilterBand.toUpperCase());
  }
  if (state.logbookFilterMode) {
    data = data.filter(q => (q.MODE || '').toUpperCase() === state.logbookFilterMode.toUpperCase());
  }
  return data;
}

// --- Sorting ---

function sortData(data) {
  const col = state.logbookSortColumn || 'QSO_DATE';
  const dir = state.logbookSortDirection === 'asc' ? 1 : -1;
  return [...data].sort((a, b) => {
    let aVal = (a[col] || '');
    let bVal = (b[col] || '');
    if (col === 'FREQ') {
      return dir * ((parseFloat(aVal) || 0) - (parseFloat(bVal) || 0));
    }
    if (col === 'QSO_DATE') {
      // Sort by date + time combined
      const aKey = (a.QSO_DATE || '') + (a.TIME_ON || '');
      const bKey = (b.QSO_DATE || '') + (b.TIME_ON || '');
      return dir * aKey.localeCompare(bKey);
    }
    return dir * aVal.toString().localeCompare(bVal.toString());
  });
}

// --- Rendering ---

function formatDate(d) {
  if (!d || d.length !== 8) return d || '';
  return d.substring(0, 4) + '-' + d.substring(4, 6) + '-' + d.substring(6, 8);
}

function formatTime(t) {
  if (!t || t.length < 4) return t || '';
  return t.substring(0, 2) + ':' + t.substring(2, 4);
}

export function renderLogbook() {
  const tbody = $('logbookBody');
  const thead = $('logbookHead');
  const countEl = $('logbookCount');
  const statsEl = $('logbookStats');
  if (!tbody) return;

  const filtered = getFilteredData();
  const sorted = sortData(filtered);

  // Render header
  if (thead) {
    thead.innerHTML = '';
    const tr = document.createElement('tr');
    for (const col of LOGBOOK_COLS) {
      const th = document.createElement('th');
      th.textContent = col.label;
      if (col.sortable) {
        th.classList.add('sortable');
        const key = col.key;
        th.addEventListener('click', () => {
          if (state.logbookSortColumn === key) {
            state.logbookSortDirection = state.logbookSortDirection === 'asc' ? 'desc' : 'asc';
          } else {
            state.logbookSortColumn = key;
            state.logbookSortDirection = key === 'QSO_DATE' ? 'desc' : 'asc';
          }
          renderLogbook();
        });
        if (state.logbookSortColumn === key) {
          th.classList.add(state.logbookSortDirection === 'asc' ? 'sort-asc' : 'sort-desc');
        }
      }
      tr.appendChild(th);
    }
    thead.appendChild(tr);
  }

  // Render body (cap at 500 rows for performance)
  const maxRows = 500;
  tbody.innerHTML = '';
  const slice = sorted.slice(0, maxRows);
  for (const q of slice) {
    const tr = document.createElement('tr');
    for (const col of LOGBOOK_COLS) {
      const td = document.createElement('td');
      let val = q[col.key] || '';
      if (col.key === 'QSO_DATE') val = formatDate(val);
      else if (col.key === 'TIME_ON') val = formatTime(val);
      td.textContent = val;
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }

  // Count badge
  if (countEl) {
    countEl.textContent = state.logbookData.length > 0
      ? `(${filtered.length}${filtered.length !== state.logbookData.length ? '/' + state.logbookData.length : ''})`
      : '';
  }

  // Stats bar
  if (statsEl) {
    if (state.logbookData.length === 0) {
      statsEl.textContent = '';
    } else {
      const calls = new Set(filtered.map(q => q.CALL));
      const dxcc = new Set(filtered.map(q => q.DXCC).filter(Boolean));
      const parts = [filtered.length + ' QSOs', calls.size + ' calls'];
      if (dxcc.size > 0) parts.push(dxcc.size + ' DXCC');
      if (sorted.length > maxRows) parts.push('showing first ' + maxRows);
      statsEl.textContent = parts.join(' \u00b7 ');
    }
  }

  // Update filter dropdowns
  populateFilterDropdowns();
}

function populateFilterDropdowns() {
  const bandSel = $('logbookBandFilter');
  const modeSel = $('logbookModeFilter');
  if (!bandSel || !modeSel) return;

  const bands = new Set();
  const modes = new Set();
  for (const q of state.logbookData) {
    if (q.BAND) bands.add(q.BAND.toUpperCase());
    if (q.MODE) modes.add(q.MODE.toUpperCase());
  }

  const sortedBands = [...bands].sort((a, b) => {
    const na = parseFloat(a) || 0;
    const nb = parseFloat(b) || 0;
    return na - nb;
  });
  const sortedModes = [...modes].sort();

  // Only rebuild if options changed
  const bandKey = sortedBands.join(',');
  const modeKey = sortedModes.join(',');
  if (bandSel.dataset.keys !== bandKey) {
    const cur = state.logbookFilterBand;
    bandSel.innerHTML = '<option value="">All Bands</option>';
    for (const b of sortedBands) {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      if (b === cur) opt.selected = true;
      bandSel.appendChild(opt);
    }
    bandSel.dataset.keys = bandKey;
  }
  if (modeSel.dataset.keys !== modeKey) {
    const cur = state.logbookFilterMode;
    modeSel.innerHTML = '<option value="">All Modes</option>';
    for (const m of sortedModes) {
      const opt = document.createElement('option');
      opt.value = m;
      opt.textContent = m;
      if (m === cur) opt.selected = true;
      modeSel.appendChild(opt);
    }
    modeSel.dataset.keys = modeKey;
  }
}

// --- Map Integration ---

export function renderLogbookOnMap() {
  clearLogbookFromMap();
  if (!state.map || state.logbookData.length === 0) return;
  if (!state.mapOverlays.logbookQsos) return;

  const L = window.L;
  const filtered = getFilteredData();

  for (const q of filtered) {
    const grid = q.GRIDSQUARE || '';
    const ll = gridToLL(grid);
    if (!ll) continue;

    const band = q.BAND || freqToBand(q.FREQ || '') || '';
    const color = getBandColor(band) || '#888';

    // Geodesic path from QTH to contact
    if (state.myLat !== null && state.myLon !== null) {
      const pts = geodesicPoints(state.myLat, state.myLon, ll.lat, ll.lon, 32);
      const line = L.polyline(pts, { color, weight: 1.2, opacity: 0.3, interactive: false });
      line.addTo(state.map);
      state.logbookLines.push(line);
    }

    // Marker
    const marker = L.circleMarker([ll.lat, ll.lon], {
      radius: 5, fillColor: color, color: '#fff', weight: 1.5, opacity: 0.8, fillOpacity: 0.6,
    });
    const dateStr = formatDate(q.QSO_DATE);
    const timeStr = formatTime(q.TIME_ON);
    marker.bindPopup(
      '<div class="logbook-popup">' +
      '<strong>' + esc(q.CALL || '') + '</strong><br>' +
      esc(dateStr) + ' ' + esc(timeStr) + 'Z<br>' +
      esc(q.FREQ || '') + ' ' + esc(q.MODE || '') +
      (q.RST_SENT ? '<br>RST: ' + esc(q.RST_SENT) + '/' + esc(q.RST_RCVD || '') : '') +
      (q.NAME ? '<br>' + esc(q.NAME) : '') +
      '</div>'
    );
    marker.addTo(state.map);
    state.logbookMarkers.push(marker);
  }
}

function clearLogbookFromMap() {
  for (const m of state.logbookMarkers) { if (state.map) state.map.removeLayer(m); }
  for (const l of state.logbookLines) { if (state.map) state.map.removeLayer(l); }
  state.logbookMarkers = [];
  state.logbookLines = [];
}

// --- File Import ---

async function handleFile(file) {
  try {
    const text = await file.text();
    const records = parseADIF(text);
    if (records.length === 0) {
      alert('No QSO records found in file.');
      return;
    }
    state.logbookData = records;
    await saveQSOs(records);
    renderLogbook();
    renderLogbookOnMap();

    // Show table, hide import zone
    const zone = $('logbookImportZone');
    const content = $('logbookContent');
    if (zone) zone.classList.add('hidden');
    if (content) content.classList.remove('hidden');
  } catch (err) {
    console.error('ADIF import error:', err);
    alert('Failed to parse ADIF file: ' + err.message);
  }
}

// --- Init ---

export async function initLogbook() {
  // Load saved data from IndexedDB
  const saved = await loadQSOs();
  if (saved.length > 0) {
    state.logbookData = saved;
    const zone = $('logbookImportZone');
    const content = $('logbookContent');
    if (zone) zone.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    renderLogbook();
    renderLogbookOnMap();
  }

  // Import zone — drag and drop
  const zone = $('logbookImportZone');
  if (zone) {
    zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    });
    zone.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.adi,.adif';
      input.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); });
      input.click();
    });
  }

  // Import button (gear icon in header)
  const importBtn = $('logbookImportBtn');
  if (importBtn) {
    importBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.adi,.adif';
      input.addEventListener('change', (ev) => { if (ev.target.files[0]) handleFile(ev.target.files[0]); });
      input.click();
    });
  }

  // Clear button
  const clearBtn = $('logbookClearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!confirm('Clear all imported QSO data?')) return;
      await clearQSOs();
      state.logbookData = [];
      clearLogbookFromMap();
      renderLogbook();
      const zn = $('logbookImportZone');
      const ct = $('logbookContent');
      if (zn) zn.classList.remove('hidden');
      if (ct) ct.classList.add('hidden');
    });
  }

  // Filter dropdowns
  const bandSel = $('logbookBandFilter');
  const modeSel = $('logbookModeFilter');
  if (bandSel) {
    bandSel.addEventListener('change', () => {
      state.logbookFilterBand = bandSel.value;
      renderLogbook();
      renderLogbookOnMap();
    });
  }
  if (modeSel) {
    modeSel.addEventListener('change', () => {
      state.logbookFilterMode = modeSel.value;
      renderLogbook();
      renderLogbookOnMap();
    });
  }
}
