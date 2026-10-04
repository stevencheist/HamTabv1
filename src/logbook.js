// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- Logbook Widget (ADIF Import) ---
// Parses ADIF files, stores QSOs in IndexedDB, renders sortable table + map markers.
import state from './state.js';
import { $ } from './dom.js';
import { esc } from './utils.js';
import { gridToLatLon, geodesicPoints } from './geo.js';
import { freqToBand } from './filters.js';
import { getBandColor } from './constants.js';
import { parseADIF, migrateV1Record, planImport, countHamtabLogged, countUnexportedLogged, isHamtabLogged, newId, META_KEY } from './logbook-records.js';
import { writeADIF, exportFilename } from './adif-writer.js';
import { isFeatureVisible } from './feature-flags.js';

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
const DB_VERSION = 2; // v2 (v0.71.0): `_hamtab` metadata + source index, non-destructive import
const STORE_NAME = 'qsos';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      const tx = e.target.transaction;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? tx.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      if (!store.indexNames.contains('call')) store.createIndex('call', 'CALL', { unique: false });
      if (!store.indexNames.contains('date')) store.createIndex('date', 'QSO_DATE', { unique: false });
      if (e.oldVersion < 2) {
        if (!store.indexNames.contains('source')) store.createIndex('source', '_hamtab.source', { unique: false });
        // Tag v1 rows as imported inside the upgrade transaction — if anything fails the
        // upgrade aborts and the v1 data is left exactly as it was.
        const now = new Date().toISOString();
        store.openCursor().onsuccess = (ev) => {
          const cursor = ev.target.result;
          if (!cursor) return;
          cursor.update(migrateV1Record(cursor.value, now));
          cursor.continue();
        };
      }
    };
    req.onblocked = () => console.warn('Logbook upgrade waiting — close other HamTab tabs to finish it.');
    req.onsuccess = () => {
      const db = req.result;
      // Let a newer HamTab tab upgrade the database instead of being blocked by this one.
      db.onversionchange = () => db.close();
      resolve(db);
    };
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Logbook transaction aborted'));
  });
}

// Apply an import plan (from planImport) in one transaction so a failure leaves the old log intact.
async function applyImportPlan(plan) {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const r of plan.remove) store.delete(r.id);
  for (const r of plan.add) store.add(r);
  return txDone(tx);
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

// scope 'all' empties the log; 'imported' keeps HamTab-logged QSOs.
async function clearQSOs(scope = 'all') {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  if (scope === 'all') {
    store.clear();
  } else {
    store.openCursor().onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (!cursor) return;
      if (!isHamtabLogged(cursor.value)) cursor.delete();
      cursor.continue();
    };
  }
  return txDone(tx);
}

// Stamp lastExportedAt on the HamTab-logged QSOs that were just exported.
async function markExported(uuids, when) {
  if (uuids.size === 0) return;
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).openCursor().onsuccess = (ev) => {
    const cursor = ev.target.result;
    if (!cursor) return;
    const meta = cursor.value[META_KEY];
    if (meta && uuids.has(meta.uuid)) {
      cursor.update({ ...cursor.value, [META_KEY]: { ...meta, lastExportedAt: when } });
    }
    cursor.continue();
  };
  return txDone(tx);
}

// --- Inline choice prompt ---
// Shown inside the Logbook widget; resolves with the chosen value, or null on Cancel/Escape.
function askChoice(message, choices) {
  return new Promise((resolve) => {
    const body = document.querySelector('#widget-logbook .widget-body');
    if (!body) { resolve(null); return; }
    const old = body.querySelector('.logbook-choice');
    if (old) old.remove();

    const panel = document.createElement('div');
    panel.className = 'logbook-choice';
    panel.setAttribute('role', 'alertdialog');
    const msg = document.createElement('div');
    msg.className = 'logbook-choice-msg';
    msg.textContent = message;
    panel.appendChild(msg);
    const row = document.createElement('div');
    row.className = 'logbook-choice-actions';

    const finish = (value) => {
      panel.removeEventListener('keydown', onKey);
      panel.remove();
      resolve(value);
    };
    const onKey = (e) => { if (e.key === 'Escape') finish(null); };
    panel.addEventListener('keydown', onKey);

    for (const c of [...choices, { label: 'Cancel', value: null }]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = c.label;
      if (c.primary) btn.className = 'primary';
      btn.addEventListener('click', () => finish(c.value));
      row.appendChild(btn);
    }
    panel.appendChild(row);
    body.prepend(panel);
    const first = row.querySelector('button');
    if (first) first.focus();
  });
}

function showLogbookContent(hasData) {
  const zone = $('logbookImportZone');
  const content = $('logbook-content');
  if (zone) zone.classList.toggle('hidden', hasData);
  if (content) content.classList.toggle('hidden', !hasData);
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
      // Sort by date + time combined.
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

// --- ADIF Export ---

function updateExportButton() {
  const btn = $('logbookExportBtn');
  if (!btn) return;
  btn.style.display = isFeatureVisible('qso_logging') && state.logbookData.length > 0 ? '' : 'none';
}

function downloadText(filename, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/plain;charset=us-ascii' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000); // ms — give the browser time to start the download
}

async function exportLogbook() {
  const all = state.logbookData;
  const filtered = getFilteredData();
  const logged = all.filter(isHamtabLogged);
  const unexported = logged.filter(r => !r[META_KEY].lastExportedAt);
  const scopes = { all, view: filtered, logged, unexported };

  const choices = [{ label: `All (${all.length})`, value: 'all', primary: true }];
  if (filtered.length !== all.length) choices.push({ label: `Current view (${filtered.length})`, value: 'view' });
  if (logged.length > 0) choices.push({ label: `Logged in HamTab (${logged.length})`, value: 'logged' });
  if (unexported.length > 0) choices.push({ label: `Not yet exported (${unexported.length})`, value: 'unexported' });

  const scope = choices.length === 1 ? 'all' : await askChoice('Export which QSOs as an ADIF (.adi) file?', choices);
  if (!scope) return;
  const records = scopes[scope];
  if (records.length === 0) return;

  const now = new Date();
  const out = writeADIF(records, { programVersion: __APP_VERSION__, now });
  downloadText(exportFilename(state.myCallsign, scope, now), out.text);

  const exportedUuids = new Set(records.filter(isHamtabLogged).map(r => r[META_KEY].uuid));
  if (exportedUuids.size > 0) {
    await markExported(exportedUuids, now.toISOString());
    state.logbookData = await loadQSOs();
    renderLogbook();
  }

  const notes = [];
  if (out.foldedRecords > 0) notes.push(`${out.foldedRecords} QSO${out.foldedRecords === 1 ? ' had' : 's had'} accented or non-English characters converted to plain ASCII (ADIF .adi files are ASCII-only).`);
  if (out.incompleteRecords > 0) notes.push(`${out.incompleteRecords} QSO${out.incompleteRecords === 1 ? ' is' : 's are'} missing a call, date, time, band/frequency or mode; upload sites such as POTA or LoTW may reject ${out.incompleteRecords === 1 ? 'it' : 'them'}.`);
  if (notes.length > 0) alert(`Exported ${out.recordCount} QSOs.\n\n` + notes.join('\n\n'));
}

export function renderLogbook() {
  updateExportButton();
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
      th.scope = 'col';
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
          th.setAttribute('aria-sort', state.logbookSortDirection === 'asc' ? 'ascending' : 'descending');
        } else {
          th.setAttribute('aria-sort', 'none');
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

  // Only rebuild if options changed.

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

    // Geodesic path from QTH to contact.

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

    // With no HamTab-logged QSOs this is exactly the old behavior: the file replaces the log.
    let mode = 'replace-imported';
    const loggedCount = countHamtabLogged(state.logbookData);
    if (loggedCount > 0) {
      mode = await askChoice(
        `Import ${records.length} QSOs. Your ${loggedCount} QSO${loggedCount === 1 ? '' : 's'} logged in HamTab will be kept either way.`,
        [
          { label: 'Replace previous import', value: 'replace-imported', primary: true },
          { label: 'Add new only (skip duplicates)', value: 'add-new' },
        ]
      );
      if (!mode) return;
    }

    const plan = planImport(state.logbookData, records, mode, newId());
    await applyImportPlan(plan);
    state.logbookData = await loadQSOs();
    renderLogbook();
    renderLogbookOnMap();
    showLogbookContent(state.logbookData.length > 0);
    if (plan.skipped.length > 0) {
      alert(`Imported ${plan.add.length} QSOs; skipped ${plan.skipped.length} probable duplicate${plan.skipped.length === 1 ? '' : 's'}.`);
    }
  } catch (err) {
    console.error('ADIF import error:', err);
    alert('Failed to parse ADIF file: ' + err.message);
  }
}

// --- Init ---

export async function initLogbook() {
  // Load saved data from IndexedDB.
  const saved = await loadQSOs();
  if (saved.length > 0) {
    state.logbookData = saved;
    const zone = $('logbookImportZone');
    const content = $('logbook-content');
    if (zone) zone.classList.add('hidden');
    if (content) content.classList.remove('hidden');
    renderLogbook();
    renderLogbookOnMap();
  }

  // Import zone — drag and drop.

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

  // Export button (gated: qso_logging)
  const exportBtn = $('logbookExportBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      exportLogbook().catch(err => {
        console.error('ADIF export error:', err);
        alert('Export failed: ' + err.message);
      });
    });
  }
  updateExportButton();

  // Clear button
  const clearBtn = $('logbookClearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const loggedCount = countHamtabLogged(state.logbookData);
      let scope = 'all';
      if (loggedCount > 0) {
        const unexported = countUnexportedLogged(state.logbookData);
        const choices = [
          { label: 'Clear imported only', value: 'imported', primary: true },
          { label: 'Clear everything', value: 'all' },
        ];
        if (unexported > 0 && isFeatureVisible('qso_logging')) {
          choices.unshift({ label: `Export backup first (${unexported} not yet exported)`, value: 'backup' });
        }
        scope = await askChoice(
          `You have ${loggedCount} QSO${loggedCount === 1 ? '' : 's'} logged in HamTab. Clearing everything deletes them permanently.`,
          choices
        );
        if (scope === 'backup') {
          await exportLogbook();
          return;
        }
        if (!scope) return;
      } else if (!confirm('Clear all imported QSO data?')) {
        return;
      }
      await clearQSOs(scope);
      state.logbookData = scope === 'all' ? [] : await loadQSOs();
      clearLogbookFromMap();
      renderLogbook();
      renderLogbookOnMap();
      showLogbookContent(state.logbookData.length > 0);
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
