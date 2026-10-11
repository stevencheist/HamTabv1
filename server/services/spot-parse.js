// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// Pure spot-parsing helpers shared by the spot routes (no I/O, so unit tests can load them
// without starting the MQTT/TCP feeds in routes/spots.js).

// --- Timestamp normalization ---
// Several upstreams (POTA spotTime, WSPR, SWPC time_tag, ...) send UTC timestamps with no zone
// suffix. `new Date('2026-10-11T00:43:38')` would read those as server-local time, so normalize
// everything to an ISO string ending in Z here. Returns '' when the input can't be parsed.
const NAIVE_TS_RE = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?))?\s*(Z|UTC|GMT|[+-]\d{2}:?\d{2})?$/i;

function toUtcIso(value) {
  if (value == null || value === '') return '';
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? '' : value.toISOString();
  const str = String(value).trim();
  const m = NAIVE_TS_RE.exec(str);
  let d;
  if (m) {
    let zone = (m[3] || 'Z').toUpperCase();
    if (zone === 'UTC' || zone === 'GMT') zone = 'Z';
    d = new Date(`${m[1]}T${m[2] || '00:00:00'}${zone}`);
  } else if (/(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})$/i.test(str)) {
    // Other formats that carry an explicit zone (e.g. RFC 2822) are safe for Date to parse.
    d = new Date(str);
  } else {
    return '';
  }
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

// Convert frequency to band string
function freqToBandStr(freqMHz) {
  const freq = parseFloat(freqMHz);
  if (isNaN(freq)) return '';
  if (freq >= 1.8 && freq <= 2.0) return '160m';
  if (freq >= 3.5 && freq <= 4.0) return '80m';
  if (freq >= 5.3 && freq <= 5.4) return '60m';
  if (freq >= 7.0 && freq <= 7.3) return '40m';
  if (freq >= 10.1 && freq <= 10.15) return '30m';
  if (freq >= 14.0 && freq <= 14.35) return '20m';
  if (freq >= 18.068 && freq <= 18.168) return '17m';
  if (freq >= 21.0 && freq <= 21.45) return '15m';
  if (freq >= 24.89 && freq <= 24.99) return '12m';
  if (freq >= 28.0 && freq <= 29.7) return '10m';
  if (freq >= 50.0 && freq <= 54.0) return '6m';
  if (freq >= 144.0 && freq <= 148.0) return '2m';
  if (freq >= 420.0 && freq <= 450.0) return '70cm';
  return '';
}

// Extract mode from DXC comment field
function extractModeFromComment(comment) {
  if (!comment) return '';
  const c = comment.toUpperCase();
  // Common digital modes
  if (c.includes('FT8')) return 'FT8';
  if (c.includes('FT4')) return 'FT4';
  if (c.includes('JS8')) return 'JS8';
  if (c.includes('RTTY')) return 'RTTY';
  if (c.includes('PSK31') || c.includes('PSK')) return 'PSK';
  if (c.includes('JT65')) return 'JT65';
  if (c.includes('JT9')) return 'JT9';
  if (c.includes('WSPR')) return 'WSPR';
  if (c.includes('MFSK')) return 'MFSK';
  if (c.includes('OLIVIA')) return 'OLIVIA';
  // CW
  if (c.includes('CW') || c.includes('MORSE')) return 'CW';
  // Phone modes
  if (c.includes('SSB') || c.includes('USB') || c.includes('LSB')) return 'SSB';
  if (c.includes('FM')) return 'FM';
  if (c.includes('AM')) return 'AM';
  return '';
}

// --- HamQTH DX cluster CSV ---
// Caret-delimited. HamQTH's developer page lists "Call^Frequency^Date/Time^Spotter^...", but its own
// example and the live feed are: spotter^freqKHz^dxCall^comment^"HHMM YYYY-MM-DD"^L^E^continent^band^country^adifId
// (country/continent/adifId describe the DX station; LoTW/eQSL flags are 'L'/'E' or empty).
function hamqthTimeToIso(stamp) {
  const m = /^(\d{2})(\d{2})\s+(\d{4}-\d{2}-\d{2})$/.exec((stamp || '').trim());
  return m ? `${m[3]}T${m[1]}:${m[2]}:00Z` : '';
}

function parseHamqthDxcLine(line) {
  const parts = line.split('^');
  if (parts.length < 11) return null;
  const [spotter, freqKhz, dxCall, comment, stamp, lotw, eqsl, continent, band, country, adifId] = parts;
  const freqNum = parseFloat(freqKhz) / 1000;
  if (!dxCall || !Number.isFinite(freqNum)) return null;
  const freqMHz = freqNum.toFixed(3);

  return {
    callsign: dxCall.trim(),
    frequency: freqMHz,
    mode: extractModeFromComment(comment),
    spotter: (spotter || '').trim(),
    name: country || '',
    continent: continent || '',
    band: freqToBandStr(freqNum) || band || '',
    spotTime: hamqthTimeToIso(stamp),
    comments: comment || '',
    lotwUser: lotw === 'L',
    eqslUser: eqsl === 'E',
    latitude: null,
    longitude: null,
    adifId: adifId || '',
  };
}

module.exports = { toUtcIso, freqToBandStr, extractModeFromComment, parseHamqthDxcLine, hamqthTimeToIso };
