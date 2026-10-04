// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// --- ADIF (.adi) writer (pure, no DOM) ---
// ADIF 3.1.7 ADI format. ADI String fields are ASCII only (Unicode IntlString fields
// are ADX-only), so values are folded to printable ASCII ("José" → "Jose"). That keeps
// each length prefix equal to both the byte and the character count, which is what
// HamTab's own importer and other loggers expect.
// Spec: https://adif.org.uk/ADIF_Current

import { META_KEY } from './logbook-records.js';

export const ADIF_VERSION = '3.1.7';

// Written first, in this order; any other fields follow alphabetically.
const FIELD_ORDER = [
  'CALL', 'QSO_DATE', 'TIME_ON', 'QSO_DATE_OFF', 'TIME_OFF', 'BAND', 'BAND_RX', 'FREQ', 'FREQ_RX',
  'MODE', 'SUBMODE', 'RST_SENT', 'RST_RCVD', 'STATION_CALLSIGN', 'OPERATOR',
  'MY_SIG', 'MY_SIG_INFO', 'MY_POTA_REF', 'SIG', 'SIG_INFO', 'POTA_REF', 'MY_SOTA_REF', 'SOTA_REF',
  'MY_WWFF_REF', 'WWFF_REF', 'GRIDSQUARE', 'MY_GRIDSQUARE', 'MY_STATE', 'NAME', 'QTH', 'STATE', 'TX_PWR', 'COMMENT',
];

// MultilineString fields may keep line breaks; everything else is single-line.
const MULTILINE_FIELDS = new Set(['ADDRESS', 'NOTES', 'QSLMSG', 'RIG']);

// Letters that NFD decomposition doesn't split into base + accent.
const SPECIAL_FOLDS = {
  'ß': 'ss', 'Æ': 'AE', 'æ': 'ae', 'Ø': 'O', 'ø': 'o', 'Œ': 'OE', 'œ': 'oe', 'Þ': 'TH', 'þ': 'th',
  'Ð': 'D', 'ð': 'd', 'Đ': 'D', 'đ': 'd', 'Ł': 'L', 'ł': 'l', 'ı': 'i',
  '‘': "'", '’': "'", '“': '"', '”': '"', '–': '-', '—': '-', '…': '...', ' ': ' ',
};

// Fold to printable ASCII; returns { value, changed }.
export function toAscii(input, multiline = false) {
  const original = String(input);
  let s = original.normalize('NFD').replace(/[̀-ͯ]/g, '');
  s = s.replace(/[^\x00-\x7f]/g, ch => SPECIAL_FOLDS[ch] ?? '');
  if (multiline) {
    s = s.replace(/\r?\n/g, '\r\n').replace(/[^\x20-\x7e\r\n]/g, '');
  } else {
    s = s.replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e]/g, '');
  }
  return { value: s, changed: s !== original };
}

// ADIF field names: letters, digits, underscore. Skip HamTab metadata, the DB key,
// and _INTL fields (ADX-only per spec).
function isExportableField(name) {
  if (name === META_KEY || name === 'id') return false;
  if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) return false;
  return !/_INTL$/i.test(name);
}

function orderedFields(record) {
  const names = Object.keys(record).filter(isExportableField).map(n => n.toUpperCase());
  const unique = [...new Set(names)];
  const rest = unique.filter(n => !FIELD_ORDER.includes(n)).sort();
  return [...FIELD_ORDER.filter(n => unique.includes(n)), ...rest];
}

function lookup(record, upperName) {
  if (upperName in record) return record[upperName];
  const key = Object.keys(record).find(k => k.toUpperCase() === upperName);
  return key === undefined ? undefined : record[key];
}

export function formatField(name, rawValue) {
  if (rawValue === undefined || rawValue === null) return { text: '', changed: false };
  let { value, changed } = toAscii(rawValue, MULTILINE_FIELDS.has(name));
  if (name === 'FREQ' || name === 'FREQ_RX') value = value.replace(',', '.'); // ADIF decimals use '.'
  value = value.trim();
  if (value === '') return { text: '', changed };
  return { text: `<${name}:${value.length}>${value}`, changed };
}

// Fields an upload destination (POTA, LoTW, QRZ…) needs. Missing ones are reported, not fatal:
// an export is also a backup, so every record is written.
export function missingRequired(record) {
  const missing = [];
  const get = n => String(lookup(record, n) ?? '').trim();
  if (!get('CALL')) missing.push('CALL');
  if (!/^\d{8}$/.test(get('QSO_DATE'))) missing.push('QSO_DATE');
  if (!/^\d{4}(\d{2})?$/.test(get('TIME_ON'))) missing.push('TIME_ON');
  if (!get('BAND') && !get('FREQ')) missing.push('BAND/FREQ');
  if (!get('MODE')) missing.push('MODE');
  return missing;
}

function adifTimestamp(date) {
  const p = n => String(n).padStart(2, '0');
  return `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())} ` +
    `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`;
}

// Returns { text, recordCount, foldedRecords, incompleteRecords }.
export function writeADIF(records, { programVersion = '', now = new Date() } = {}) {
  const header = [
    `HamTab ADIF export ${adifTimestamp(now)} UTC`, // header text must not start with '<'
    formatField('ADIF_VER', ADIF_VERSION).text,
    formatField('PROGRAMID', 'HamTab').text,
    programVersion ? formatField('PROGRAMVERSION', programVersion).text : '',
    formatField('CREATED_TIMESTAMP', adifTimestamp(now)).text,
    '<EOH>',
  ].filter(Boolean).join('\n');

  let foldedRecords = 0;
  let incompleteRecords = 0;
  const lines = [header, ''];
  for (const record of records) {
    let folded = false;
    const parts = [];
    for (const name of orderedFields(record)) {
      const f = formatField(name, lookup(record, name));
      if (f.changed) folded = true;
      if (f.text) parts.push(f.text);
    }
    if (folded) foldedRecords++;
    if (missingRequired(record).length > 0) incompleteRecords++;
    lines.push(parts.join(' ') + ' <EOR>');
  }
  return {
    text: lines.join('\n') + '\n',
    recordCount: records.length,
    foldedRecords,
    incompleteRecords,
  };
}

// Safe download name, e.g. hamtab-KJ5MMO-20261004-logged.adi.
export function exportFilename(callsign, scope, now = new Date()) {
  const call = String(callsign || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const date = adifTimestamp(now).slice(0, 8);
  const safeScope = String(scope || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return ['hamtab', call, date, safeScope].filter(Boolean).join('-') + '.adi';
}

// Activation upload name, e.g. KJ5MMO@US-1234-20261004.adi (summits: W6/NC-423 → W6_NC-423).
export function activationFilename(callsign, ref, date) {
  const call = String(callsign || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const safeRef = String(ref || '').toUpperCase().replace(/\//g, '_').replace(/[^A-Z0-9_-]/g, '');
  const safeDate = String(date || '').replace(/\D/g, '').slice(0, 8);
  return `${call || 'HAMTAB'}@${safeRef}${safeDate ? '-' + safeDate : ''}.adi`;
}
