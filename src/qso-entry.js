// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// --- QSO entry model (pure, no DOM) ---
// Turns Log QSO form fields into a flat ADIF record and back. Modes follow the
// ADIF 3.1.7 enumeration: some everyday names are submodes (FT4 is MFSK/FT4,
// USB is SSB/USB), and there is no "DATA" mode, so a rig in a generic data mode
// leaves the mode for the operator to choose rather than guessing FT8.

export const BANDS = ['160m', '80m', '60m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m', '2m', '70cm'];

// Display name → ADIF MODE/SUBMODE when the name is a submode.
const SUBMODES = {
  USB: ['SSB', 'USB'], LSB: ['SSB', 'LSB'],
  FT4: ['MFSK', 'FT4'], JS8: ['MFSK', 'JS8'], Q65: ['MFSK', 'Q65'],
  PSK31: ['PSK', 'PSK31'], PSK63: ['PSK', 'PSK63'],
  C4FM: ['DIGITALVOICE', 'C4FM'], DMR: ['DIGITALVOICE', 'DMR'],
};

// Offered in the form's mode list (free text is still accepted).
export const MODE_CHOICES = ['SSB', 'USB', 'LSB', 'CW', 'FM', 'AM', 'FT8', 'FT4', 'JS8', 'RTTY', 'PSK31', 'Q65', 'SSTV', 'OLIVIA', 'DSTAR', 'C4FM', 'DMR'];

const PHONE_MODES = new Set(['SSB', 'USB', 'LSB', 'FM', 'AM', 'DSTAR', 'C4FM', 'DMR', 'DIGITALVOICE']);
const RST3_MODES = new Set(['CW', 'RTTY', 'PSK', 'PSK31', 'PSK63']);

// POTA park reference, e.g. US-1234, K-0001, GB-0001 (same rule as self-spot).
export const PARK_RE = /^[A-Z0-9]+-\d{4,}$/;

export function toAdifMode(displayMode) {
  const m = String(displayMode || '').trim().toUpperCase();
  if (!m) return { MODE: '', SUBMODE: '' };
  if (SUBMODES[m]) return { MODE: SUBMODES[m][0], SUBMODE: SUBMODES[m][1] };
  return { MODE: m, SUBMODE: '' };
}

// Inverse for editing: show the submode when it's one we offer, else the mode.
export function fromAdifMode(mode, submode) {
  const sub = String(submode || '').toUpperCase();
  if (sub && SUBMODES[sub]) return sub;
  return String(mode || '').toUpperCase();
}

// CAT mode string (USB, CW-U, DATA-U, FM-N, ...) → form mode, or '' when the rig can't tell us.
export function modeFromRig(catMode) {
  const m = String(catMode || '').toUpperCase();
  if (!m) return '';
  if (m.startsWith('CW')) return 'CW';
  if (m === 'USB' || m === 'LSB') return m;
  if (m.startsWith('FM')) return 'FM';
  if (m.startsWith('AM')) return 'AM';
  if (m.startsWith('RTTY')) return 'RTTY';
  return ''; // DATA-*, DIG, PKT: FT8 vs FT4 vs PSK is unknowable from CAT
}

export function defaultRst(displayMode) {
  const m = String(displayMode || '').toUpperCase();
  if (PHONE_MODES.has(m)) return '59';
  if (RST3_MODES.has(m)) return '599';
  return ''; // digital modes report dB (e.g. -12); leave for the operator
}

// UTC date/time parts in ADIF form.
export function utcNow(date = new Date()) {
  const p = n => String(n).padStart(2, '0');
  return {
    date: `${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}`,
    time: `${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}`,
  };
}

// Form shows YYYY-MM-DD and HH:MM:SS; ADIF stores YYYYMMDD and HHMMSS.
export const dateToDisplay = d => (/^\d{8}$/.test(d || '') ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : (d || ''));
export const timeToDisplay = t => {
  const s = String(t || '');
  if (/^\d{6}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}:${s.slice(4, 6)}`;
  if (/^\d{4}$/.test(s)) return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
  return s;
};
const digitsOnly = s => String(s || '').replace(/\D/g, '');

// Hz (rig) → MHz string without trailing zeros, keeping at least 3 decimals: 14074000 → "14.074".
export function hzToMhz(hz) {
  const n = Number(hz);
  if (!Number.isFinite(n) || n <= 0) return '';
  const s = (n / 1e6).toFixed(6).replace(/0+$/, '');
  const [whole, frac = ''] = s.split('.');
  return `${whole}.${frac.padEnd(3, '0')}`;
}

// Any spot frequency (Hz, kHz or MHz) → MHz string.
export function spotFreqToMhz(freq) {
  const v = parseFloat(freq);
  if (!Number.isFinite(v) || v <= 0) return '';
  if (v > 1_000_000) return hzToMhz(v);
  if (v > 1000) return hzToMhz(v * 1000);
  return hzToMhz(v * 1_000_000);
}

export function parseParks(text) {
  return [...new Set(String(text || '').toUpperCase().split(/[\s,;]+/).filter(Boolean))];
}

const CALL_RE = /^[A-Z0-9]+(\/[A-Z0-9]+)*$/;

// Returns { field: message } for anything blocking a save.
export function validateEntry(f) {
  const errors = {};
  const call = String(f.call || '').trim().toUpperCase();
  if (!call || !CALL_RE.test(call) || !/\d/.test(call) || call.length < 3) errors.call = 'Enter a valid callsign.';
  const date = digitsOnly(f.date);
  if (!/^\d{8}$/.test(date) || Number(date.slice(4, 6)) < 1 || Number(date.slice(4, 6)) > 12 || Number(date.slice(6, 8)) < 1 || Number(date.slice(6, 8)) > 31) errors.date = 'Use YYYY-MM-DD (UTC).';
  const time = digitsOnly(f.time);
  if (!/^\d{4}(\d{2})?$/.test(time) || Number(time.slice(0, 2)) > 23 || Number(time.slice(2, 4)) > 59 || (time.length === 6 && Number(time.slice(4, 6)) > 59)) errors.time = 'Use HH:MM or HH:MM:SS (UTC).';
  const freq = String(f.freq || '').trim();
  if (freq && !(parseFloat(freq) > 0)) errors.freq = 'Frequency in MHz, e.g. 14.074.';
  if (!freq && !f.band) errors.band = 'Enter a frequency or pick a band.';
  if (!String(f.mode || '').trim()) errors.mode = 'Pick a mode.';
  const theirPark = String(f.theirPark || '').trim().toUpperCase();
  if (theirPark && !PARK_RE.test(theirPark)) errors.theirPark = 'Park reference like US-1234.';
  if (f.activating) {
    const parks = parseParks(f.myParks);
    if (parks.length === 0 || parks.some(p => !PARK_RE.test(p))) errors.myParks = 'Your park(s), e.g. US-1234 or US-1234, US-5678.';
  }
  return errors;
}

// Form fields → flat ADIF record (empty values left out).
export function buildRecord(f) {
  const { MODE, SUBMODE } = toAdifMode(f.mode);
  const theirPark = String(f.theirPark || '').trim().toUpperCase();
  const myParks = f.activating ? parseParks(f.myParks) : [];
  const freq = String(f.freq || '').trim().replace(',', '.');
  const rec = {
    CALL: String(f.call || '').trim().toUpperCase(),
    QSO_DATE: digitsOnly(f.date),
    TIME_ON: digitsOnly(f.time),
    FREQ: freq,
    BAND: f.band || '',
    MODE,
    SUBMODE,
    RST_SENT: String(f.rstSent || '').trim(),
    RST_RCVD: String(f.rstRcvd || '').trim(),
    STATION_CALLSIGN: String(f.stationCall || '').trim().toUpperCase(),
    MY_GRIDSQUARE: String(f.myGrid || '').trim(),
    GRIDSQUARE: String(f.grid || '').trim(),
    NAME: String(f.name || '').trim(),
    COMMENT: String(f.comment || '').trim(),
  };
  if (theirPark) Object.assign(rec, { SIG: 'POTA', SIG_INFO: theirPark, POTA_REF: theirPark });
  if (myParks.length > 0) {
    // One park per MY_SIG_INFO; the full list lives in MY_POTA_REF. Per-park files come from the export step.
    Object.assign(rec, { MY_SIG: 'POTA', MY_SIG_INFO: myParks[0], MY_POTA_REF: myParks.join(',') });
  }
  for (const k of Object.keys(rec)) if (rec[k] === '') delete rec[k];
  return rec;
}

// Fields this form owns. On edit, these are replaced; anything else on the record is kept.
export const FORM_FIELDS = ['CALL', 'QSO_DATE', 'TIME_ON', 'FREQ', 'BAND', 'MODE', 'SUBMODE', 'RST_SENT', 'RST_RCVD',
  'STATION_CALLSIGN', 'MY_GRIDSQUARE', 'GRIDSQUARE', 'NAME', 'COMMENT', 'SIG', 'SIG_INFO', 'POTA_REF', 'MY_SIG', 'MY_SIG_INFO', 'MY_POTA_REF'];

// Record → form fields, for editing.
export function recordToFields(r) {
  const myParks = r.MY_POTA_REF || (r.MY_SIG === 'POTA' ? r.MY_SIG_INFO : '') || '';
  return {
    call: r.CALL || '',
    date: dateToDisplay(r.QSO_DATE),
    time: timeToDisplay(r.TIME_ON),
    freq: r.FREQ || '',
    band: (r.BAND || '').toLowerCase(),
    mode: fromAdifMode(r.MODE, r.SUBMODE),
    rstSent: r.RST_SENT || '',
    rstRcvd: r.RST_RCVD || '',
    stationCall: r.STATION_CALLSIGN || '',
    myGrid: r.MY_GRIDSQUARE || '',
    grid: r.GRIDSQUARE || '',
    name: r.NAME || '',
    comment: r.COMMENT || '',
    theirPark: r.POTA_REF || (r.SIG === 'POTA' ? r.SIG_INFO : '') || '',
    activating: Boolean(myParks),
    myParks: String(myParks).split(',').join(', '),
  };
}
