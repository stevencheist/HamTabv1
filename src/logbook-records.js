// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// --- Logbook record model (pure, no DOM/IndexedDB) ---
// Records stay flat ADIF objects (CALL, QSO_DATE, ...) so the table, filters and
// map overlay read them unchanged. HamTab-owned metadata lives under one reserved
// key, `_hamtab`, which the ADIF writer never emits.

export const META_KEY = '_hamtab';
export const SOURCE_IMPORT = 'import';
export const SOURCE_HAMTAB = 'hamtab';
export const MIGRATED_BATCH_ID = 'v1-migrated';
export const DUP_WINDOW_MIN = 2; // minutes — same call/band/mode this close together is a probable duplicate

export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // crypto.randomUUID needs a secure context; plain-HTTP LAN access falls back to this.
  return 'id-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
}

// Attach metadata without touching any ADIF field.
export function withMeta(record, source, importBatchId = null, now = new Date().toISOString()) {
  return {
    ...record,
    [META_KEY]: {
      uuid: newId(),
      source,
      importBatchId,
      createdAt: now,
      updatedAt: now,
      lastExportedAt: null,
    },
  };
}

// v1 records were all imported and carry no metadata. Records that already have it are left alone.
export function migrateV1Record(record, now = new Date().toISOString()) {
  if (record && record[META_KEY]) return record;
  return withMeta(record, SOURCE_IMPORT, MIGRATED_BATCH_ID, now);
}

export function getSource(record) {
  return (record && record[META_KEY] && record[META_KEY].source) || SOURCE_IMPORT;
}

export function isHamtabLogged(record) {
  return getSource(record) !== SOURCE_IMPORT;
}

export function countHamtabLogged(records) {
  return records.filter(isHamtabLogged).length;
}

export function countUnexportedLogged(records) {
  return records.filter(r => isHamtabLogged(r) && !r[META_KEY].lastExportedAt).length;
}

// --- Duplicate detection ---

function norm(v) {
  return (v == null ? '' : String(v)).trim().toUpperCase();
}

// Minutes since midnight from HHMM or HHMMSS; null if unparseable.
function timeToMinutes(t) {
  const s = norm(t);
  if (!/^\d{4}(\d{2})?$/.test(s)) return null;
  return parseInt(s.slice(0, 2), 10) * 60 + parseInt(s.slice(2, 4), 10);
}

// Same station, call, date, band and mode, and start times within DUP_WINDOW_MIN.
// This is a warning signal, not a uniqueness rule: the same call on another band or mode is a separate QSO.
export function isProbableDuplicate(a, b) {
  if (norm(a.CALL) !== norm(b.CALL)) return false;
  if (norm(a.QSO_DATE) !== norm(b.QSO_DATE)) return false;
  if (norm(a.BAND) !== norm(b.BAND)) return false;
  if (norm(a.MODE) !== norm(b.MODE)) return false;
  const sa = norm(a.STATION_CALLSIGN || a.OPERATOR);
  const sb = norm(b.STATION_CALLSIGN || b.OPERATOR);
  if (sa && sb && sa !== sb) return false;
  const ta = timeToMinutes(a.TIME_ON);
  const tb = timeToMinutes(b.TIME_ON);
  if (ta === null || tb === null) return ta === tb && norm(a.TIME_ON) === norm(b.TIME_ON);
  return Math.abs(ta - tb) <= DUP_WINDOW_MIN;
}

// --- Import planning ---
// mode 'replace-imported': drop previously imported records, keep HamTab-logged ones, add incoming records
//   except probable duplicates of the kept HamTab-logged QSOs (e.g. a desktop-logger export that already
//   contains contacts first logged in HamTab). With no HamTab-logged QSOs this is the pre-v2 behavior.
// mode 'add-new': keep everything, add only incoming records that aren't probable duplicates.
export function planImport(existing, incoming, mode, importBatchId, now = new Date().toISOString()) {
  const tagged = incoming.map(r => withMeta(r, SOURCE_IMPORT, importBatchId, now));
  if (mode === 'replace-imported') {
    const keep = existing.filter(isHamtabLogged);
    const remove = existing.filter(r => !isHamtabLogged(r));
    const add = [];
    const skipped = [];
    for (const r of tagged) (keep.some(k => isProbableDuplicate(k, r)) ? skipped : add).push(r);
    return { keep, remove, add, skipped };
  }
  if (mode === 'add-new') {
    const add = [];
    const skipped = [];
    for (const r of tagged) {
      const dup = existing.some(e => isProbableDuplicate(e, r)) || add.some(a => isProbableDuplicate(a, r));
      (dup ? skipped : add).push(r);
    }
    return { keep: existing, remove: [], add, skipped };
  }
  throw new Error('Unknown import mode: ' + mode);
}
