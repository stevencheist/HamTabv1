// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// --- Log QSO form (gated: qso_logging) ---
// Opened from DX Detail (prefilled from the selected spot), from the Logbook "+" button
// (blank), or from a logged row's edit button. Values are a snapshot taken when the form
// opens: later spot refreshes or rig changes don't alter an open form.
import state from './state.js';
import { $ } from './dom.js';
import { latLonToGrid } from './geo.js';
import { freqToBand } from './filters.js';
import { openModal, closeModal } from './a11y.js';
import { isFeatureVisible } from './feature-flags.js';
import { getRigStore, isRigConnected } from './cat/index.js';
import { markWorked, unmarkWorked, isWorked } from './pota-hunter.js';
import {
  BANDS, MODE_CHOICES, PARK_RE, WWFF_RE, SOTA_RE, modeFromRig, defaultRst, utcNow, dateToDisplay, timeToDisplay,
  hzToMhz, spotFreqToMhz, validateEntry, buildRecord, recordToFields, FORM_FIELDS,
} from './qso-entry.js';
import { withMeta, SOURCE_HAMTAB, META_KEY, countUnexportedLogged } from './logbook-records.js';
import { saveLoggedQSO, deleteLoggedQSO } from './logbook.js';
import { confirmDialog } from './dialog.js';

const ACTIVATING_KEY = 'hamtab_log_activating';
const MY_PARKS_KEY = 'hamtab_log_my_parks';
const MY_WWFF_KEY = 'hamtab_log_my_wwff';
const MY_SOTA_KEY = 'hamtab_log_my_sota';
const UNDO_MS = 6000; // ms — how long the "Logged … Undo" toast stays up
const BACKUP_NUDGE_EVERY = 25; // un-exported QSOs between backup reminders

let editing = null; // record being edited, or null for a new QSO
let fromSpot = null; // { call, potaSource } when opened from DX Detail
let rstTouched = false; // stop auto-updating RST once the operator types one
let bandTouched = false; // stop auto-deriving band from frequency once picked by hand
let persistRequested = false;
let toastTimer = null;

// --- Field helpers ---

const FIELD_IDS = {
  call: 'qsoCall', date: 'qsoDate', time: 'qsoTime', freq: 'qsoFreq', band: 'qsoBand', mode: 'qsoMode',
  rstSent: 'qsoRstSent', rstRcvd: 'qsoRstRcvd', theirPark: 'qsoTheirPark', theirWwff: 'qsoTheirWwff', theirSota: 'qsoTheirSota',
  grid: 'qsoGrid', name: 'qsoName', comment: 'qsoComment', activating: 'qsoActivating', myParks: 'qsoMyParks',
  myWwff: 'qsoMyWwff', mySota: 'qsoMySota', stationCall: 'qsoStationCall', myGrid: 'qsoMyGrid',
};

function setField(key, value) {
  const el = $(FIELD_IDS[key]);
  if (!el) return;
  if (el.type === 'checkbox') el.checked = Boolean(value);
  else el.value = value ?? '';
}

function readFields() {
  const f = {};
  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const el = $(id);
    if (!el) continue;
    f[key] = el.type === 'checkbox' ? el.checked : el.value;
  }
  return f;
}

// Small "from rig" / "from spot" note beside a prefilled field.
function setSource(key, text) {
  const el = document.querySelector(`.qso-src[data-for="${key}"]`);
  if (el) el.textContent = text ? `(${text})` : '';
}

function clearSources() {
  document.querySelectorAll('#qsoLogForm .qso-src').forEach(el => { el.textContent = ''; });
}

function showErrors(errors) {
  document.querySelectorAll('#qsoLogForm .qso-err').forEach(el => {
    el.textContent = errors[el.dataset.for] || '';
  });
  for (const [key, id] of Object.entries(FIELD_IDS)) {
    const el = $(id);
    if (el) el.classList.toggle('qso-invalid', Boolean(errors[key]));
  }
  const firstKey = Object.keys(FIELD_IDS).find(k => errors[k]);
  if (firstKey) $(FIELD_IDS[firstKey])?.focus();
}

function updateActivatingRow() {
  const row = $('qsoMyParksRow');
  if (row) row.classList.toggle('hidden', !$('qsoActivating')?.checked);
}

function myGridFromSettings() {
  if (state.myLat === null || state.myLon === null || Number.isNaN(state.myLat) || Number.isNaN(state.myLon)) return '';
  return latLonToGrid(state.myLat, state.myLon);
}

function setNow() {
  const { date, time } = utcNow();
  setField('date', dateToDisplay(date));
  setField('time', timeToDisplay(time));
  setSource('time', 'now');
}

// --- Open ---

// opts: { spot } to log a spot, { record } to edit a HamTab-logged QSO, or {} for a blank entry.
export function openLogForm(opts = {}) {
  if (!isFeatureVisible('qso_logging')) return;
  const popup = $('qsoLogPopup');
  if (!popup) return;

  editing = opts.record || null;
  fromSpot = null;
  rstTouched = false;
  bandTouched = false;
  clearSources();
  showErrors({});
  $('qsoLogTitle').textContent = editing ? 'Edit QSO' : 'Log QSO';
  $('qsoLogSave').textContent = editing ? 'Save changes' : 'Log QSO';

  if (editing) {
    const f = recordToFields(editing);
    for (const key of Object.keys(FIELD_IDS)) setField(key, f[key]);
    rstTouched = true;
    bandTouched = Boolean(f.band);
  } else {
    for (const key of Object.keys(FIELD_IDS)) setField(key, '');
    setNow();
    setField('stationCall', (state.myCallsign || '').toUpperCase());
    setField('myGrid', myGridFromSettings());
    setField('activating', localStorage.getItem(ACTIVATING_KEY) === 'true');
    setField('myParks', localStorage.getItem(MY_PARKS_KEY) ?? (state.myPark || localStorage.getItem('hamtab_my_park') || ''));
    setField('myWwff', localStorage.getItem(MY_WWFF_KEY) || '');
    setField('mySota', localStorage.getItem(MY_SOTA_KEY) || '');

    const spot = opts.spot || null;
    if (spot) {
      const call = (spot.callsign || spot.activator || '').toUpperCase();
      setField('call', call);
      setSource('call', 'spot');
      const potaSource = state.currentSource === 'pota';
      fromSpot = { call, potaSource };
      // The spot's reference belongs to whichever program the On the Air tab is showing.
      const ref = String(spot.reference || '').toUpperCase();
      if (potaSource && PARK_RE.test(ref)) {
        setField('theirPark', ref);
        setSource('theirPark', 'spot');
      } else if (state.currentSource === 'wwff' && WWFF_RE.test(ref)) {
        setField('theirWwff', ref);
        setSource('theirWwff', 'spot');
      } else if (state.currentSource === 'sota' && SOTA_RE.test(ref)) {
        setField('theirSota', ref);
        setSource('theirSota', 'spot');
      }
      const lat = parseFloat(spot.latitude);
      const lon = parseFloat(spot.longitude);
      if (!Number.isNaN(lat) && !Number.isNaN(lon)) {
        setField('grid', latLonToGrid(lat, lon).slice(0, 4)); // 4 chars — a spot's location is approximate
        setSource('grid', 'spot');
      }
    }

    // Frequency and mode: a connected rig is what you're actually on; otherwise use the spot.
    let freq = '';
    let mode = '';
    if (isRigConnected()) {
      const rig = getRigStore().get();
      freq = hzToMhz(rig.frequency);
      mode = modeFromRig(rig.mode);
      if (freq) setSource('freq', 'rig');
      if (mode) setSource('mode', 'rig');
    }
    if (spot && !freq) {
      freq = spotFreqToMhz(spot.frequency);
      if (freq) setSource('freq', 'spot');
    }
    if (spot && !mode && spot.mode) {
      mode = String(spot.mode).toUpperCase();
      setSource('mode', 'spot');
    }
    setField('freq', freq);
    setField('band', freq ? (freqToBand(freq) || '') : '');
    setField('mode', mode);
    setField('rstSent', defaultRst(mode));
    setField('rstRcvd', defaultRst(mode));
  }
  updateActivatingRow();

  const callEl = $('qsoCall');
  const focusEl = editing || !callEl.value ? callEl : ($('qsoRstSent').value ? $('qsoRstRcvd') : $('qsoMode'));
  openModal(popup, { focusEl });
}

// --- Save ---

async function handleSave(e) {
  e.preventDefault();
  const f = readFields();
  const errors = validateEntry(f);
  showErrors(errors);
  if (Object.keys(errors).length > 0) return;

  const built = buildRecord(f);
  localStorage.setItem(ACTIVATING_KEY, String(Boolean(f.activating)));
  if (f.activating) {
    // Remember what was entered (including blanks) so the next QSO of this activation starts the same.
    localStorage.setItem(MY_PARKS_KEY, f.myParks.trim().toUpperCase());
    localStorage.setItem(MY_WWFF_KEY, f.myWwff.trim().toUpperCase());
    localStorage.setItem(MY_SOTA_KEY, f.mySota.trim().toUpperCase());
  }

  const saveBtn = $('qsoLogSave');
  saveBtn.disabled = true;
  try {
    if (editing) {
      // Replace the fields this form owns; keep anything else on the record.
      const merged = { ...editing };
      for (const k of FORM_FIELDS) delete merged[k];
      Object.assign(merged, built);
      // An edited QSO counts as not yet exported, so the corrected version gets exported again.
      merged[META_KEY] = { ...editing[META_KEY], updatedAt: new Date().toISOString(), lastExportedAt: null };
      await saveLoggedQSO(merged);
      closeModal($('qsoLogPopup'));
      showToast(`Updated ${built.CALL}`);
      return;
    }

    const record = withMeta(built, SOURCE_HAMTAB);
    const id = await saveLoggedQSO(record);
    requestPersistentStorage();

    // Logging a POTA spot also marks it worked, exactly like Confirm QSO.
    let markedWorked = false;
    if (fromSpot && fromSpot.potaSource && fromSpot.call === built.CALL && isFeatureVisible('pota_hunter') && !isWorked(built.CALL)) {
      markWorked(built.CALL);
      markedWorked = true;
    }
    closeModal($('qsoLogPopup'));
    // Nudge a backup every BACKUP_NUDGE_EVERY un-exported QSOs (browser storage can be cleared).
    const unexported = countUnexportedLogged(state.logbookData);
    const nudge = unexported > 0 && unexported % BACKUP_NUDGE_EVERY === 0
      ? ` · ${unexported} QSOs not exported yet — use Export (⤓) to back them up` : '';
    showToast(`Logged ${built.CALL}${nudge}`, async () => {
      await deleteLoggedQSO(id);
      if (markedWorked) unmarkWorked(built.CALL);
      showToast(`Removed ${built.CALL}`);
    });
  } catch (err) {
    console.error('Log QSO failed:', err);
    showErrors({ call: 'Could not save: ' + err.message });
  } finally {
    saveBtn.disabled = false;
  }
}

// Ask the browser not to evict the logbook under storage pressure (once per session).
function requestPersistentStorage() {
  if (persistRequested) return;
  persistRequested = true;
  try {
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().catch(() => {});
    }
  } catch { /* not supported */ }
}

// --- Toast with optional Undo ---

function showToast(message, onUndo) {
  let toast = $('qsoToast');
  if (!toast) return;
  toast.innerHTML = '';
  const text = document.createElement('span');
  text.textContent = message;
  toast.appendChild(text);
  if (onUndo) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = 'Undo';
    btn.addEventListener('click', () => {
      toast.classList.add('hidden');
      onUndo().catch(err => console.error('Undo failed:', err));
    }, { once: true });
    toast.appendChild(btn);
  }
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('hidden'), UNDO_MS);
}

// --- DX Detail button ---

export function renderLogQsoButton(spot, container) {
  if (!isFeatureVisible('qso_logging') || !container || !spot) return;
  if (!(spot.callsign || spot.activator)) return;
  const btn = document.createElement('button');
  btn.className = 'btn btn-sm pota-hunter-btn qso-log-btn';
  btn.textContent = 'Log QSO';
  btn.addEventListener('click', () => openLogForm({ spot }));
  // Sit beside Confirm QSO / Spot when those are shown; otherwise in its own row.
  const row = container.querySelector('.pota-hunter-actions');
  if (row) {
    row.appendChild(btn);
  } else {
    const wrap = document.createElement('div');
    wrap.className = 'pota-hunter-actions';
    wrap.appendChild(btn);
    container.appendChild(wrap);
  }
}

// --- Init ---

export function initLogForm() {
  const popup = $('qsoLogPopup');
  if (!popup) return;

  const modeList = $('qsoModeList');
  if (modeList && !modeList.children.length) {
    for (const m of MODE_CHOICES) {
      const opt = document.createElement('option');
      opt.value = m;
      modeList.appendChild(opt);
    }
  }
  const bandSel = $('qsoBand');
  if (bandSel && bandSel.options.length <= 1) {
    for (const b of BANDS) {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = b;
      bandSel.appendChild(opt);
    }
  }

  $('qsoLogForm')?.addEventListener('submit', handleSave);
  $('qsoLogCancel')?.addEventListener('click', () => closeModal(popup));
  $('qsoNowBtn')?.addEventListener('click', setNow);
  $('qsoActivating')?.addEventListener('change', updateActivatingRow);
  popup.addEventListener('click', (e) => { if (e.target === popup) closeModal(popup); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.classList.contains('hidden') && state.a11yEscapeClose) closeModal(popup);
  });

  // Clear a field's error as soon as it's edited (frequency also satisfies the band check).
  for (const [key, id] of Object.entries(FIELD_IDS)) {
    $(id)?.addEventListener(id === 'qsoBand' || id === 'qsoActivating' ? 'change' : 'input', () => {
      const linked = {
        freq: ['freq', 'band'], band: ['band', 'freq'],
        // Any one of my park / WWFF / summit satisfies "activating", so editing one clears that shared error.
        activating: ['myParks', 'myWwff', 'mySota'], myWwff: ['myWwff', 'myParks'], mySota: ['mySota', 'myParks'],
      };
      const keys = linked[key] || [key];
      for (const k of keys) {
        const err = document.querySelector(`#qsoLogForm .qso-err[data-for="${k}"]`);
        if (err) err.textContent = '';
        $(FIELD_IDS[k])?.classList.remove('qso-invalid');
      }
    });
  }

  $('qsoFreq')?.addEventListener('input', () => {
    setSource('freq', '');
    if (bandTouched) return;
    const band = freqToBand($('qsoFreq').value);
    if (band) $('qsoBand').value = band;
  });
  $('qsoBand')?.addEventListener('change', () => { bandTouched = true; });
  $('qsoMode')?.addEventListener('input', () => {
    setSource('mode', '');
    if (rstTouched) return;
    const rst = defaultRst($('qsoMode').value);
    $('qsoRstSent').value = rst;
    $('qsoRstRcvd').value = rst;
  });
  for (const id of ['qsoRstSent', 'qsoRstRcvd']) {
    $(id)?.addEventListener('input', () => { rstTouched = true; });
  }
  for (const id of ['qsoDate', 'qsoTime']) {
    $(id)?.addEventListener('input', () => setSource('time', ''));
  }
}

// For the Logbook table: edit and delete a HamTab-logged row.
export function editLoggedQSO(record) {
  openLogForm({ record });
}

export async function removeLoggedQSO(record) {
  if (!record || !record[META_KEY]) return;
  const ok = await confirmDialog({
    title: 'Delete this QSO?',
    message: `Delete the QSO with ${record.CALL || 'this station'} on ${dateToDisplay(record.QSO_DATE)}? You can undo right after.`,
    confirmLabel: 'Delete',
    danger: true,
  });
  if (!ok) return;
  const snapshot = { ...record };
  await deleteLoggedQSO(record.id);
  showToast(`Deleted ${record.CALL || 'QSO'}`, async () => {
    await saveLoggedQSO(snapshot); // put() with the same id restores it
    showToast(`Restored ${snapshot.CALL || 'QSO'}`);
  });
}
