// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// Pure NOAA SWPC parsing helpers for /api/spacewx/history and the VOACAP SSN lookup (no I/O).

const { toUtcIso } = require('./spot-parse');

// --- Upstream feeds ---
// The products/solar-wind/{plasma,mag}-7-day.json feeds were retired (404 as of 2026-10); the
// RTSW 1-minute feeds replace them. They cover ~24 hours, list newest first, and interleave
// several spacecraft (ACE, DSCOVR/SOLAR1, IMAP) with an `active` flag marking the one SWPC uses.
const SPACEWX_URLS = {
  kp:   'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  xray: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json',
  sfi:  'https://services.swpc.noaa.gov/json/f107_cm_flux.json',
  wind: 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json',
  mag:  'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json',
};

// Standard GOES long-wave channel; flare classes (A/B/C/M/X) are defined on this band.
const XRAY_FLARE_CHANNEL = '0.1-0.8nm';

const SPACEWX_MAX_POINTS = 500; // Points per series sent to the client canvas.

// Downsample high-resolution data by bucket-averaging into ~targetPts points.
function downsampleSpacewx(arr, targetPts) {
  if (arr.length <= targetPts) return arr;
  const bucketSize = Math.ceil(arr.length / targetPts);
  const result = [];
  for (let i = 0; i < arr.length; i += bucketSize) {
    const bucket = arr.slice(i, i + bucketSize);
    const avgTime = bucket[Math.floor(bucket.length / 2)].time_tag;
    const keys = Object.keys(bucket[0]).filter(k => k !== 'time_tag');
    const avg = { time_tag: avgTime };
    for (const k of keys) {
      const vals = bucket.map(b => b[k]).filter(v => v !== null && v !== undefined && !Number.isNaN(v));
      avg[k] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    result.push(avg);
  }
  return result;
}

// Number or null (JSON can't carry NaN, and the client treats null as a gap).
function num(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

// SWPC "products" feeds historically were array-of-arrays with a header row; the json/ feeds are
// array-of-objects. Convert either into objects keyed by column name.
function rowsAsObjects(raw) {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  if (Array.isArray(raw[0])) {
    const header = raw[0].map(String);
    return raw.slice(1).filter(Array.isArray).map(r => {
      const o = {};
      header.forEach((h, i) => { o[h] = r[i]; });
      return o;
    });
  }
  return raw.filter(r => r && typeof r === 'object');
}

// RTSW feeds mix spacecraft; keep the active one. Older feeds have no flag, so keep everything.
function activeOnly(rows) {
  const hasFlag = rows.some(r => 'active' in r);
  return hasFlag ? rows.filter(r => r.active === true) : rows;
}

// Normalize NOAA data into uniform { time_tag, value, [value2] } rows, sorted oldest-first with
// ISO-Z time tags. Several SWPC feeds are newest-first, which made the canvas draw nothing.
function normalizeSpacewx(type, raw) {
  const rows = rowsAsObjects(raw);
  let out;
  switch (type) {
    case 'kp':
      out = rows.map(r => ({ time_tag: r.time_tag, value: num(r.Kp ?? r.kp) }));
      break;
    case 'xray':
      out = rows
        .filter(r => !r.energy || r.energy === XRAY_FLARE_CHANNEL)
        .map(r => ({ time_tag: r.time_tag, value: num(r.flux) }))
        .filter(r => r.value !== null && r.value > 0);
      break;
    case 'sfi':
      out = rows.map(r => ({ time_tag: r.time_tag, value: num(r.flux) }));
      break;
    case 'wind':
      out = activeOnly(rows).map(r => ({
        time_tag: r.time_tag,
        value: num(r.proton_speed ?? r.speed),
        value2: num(r.proton_density ?? r.density),
      }));
      break;
    case 'mag':
      out = activeOnly(rows).map(r => ({
        time_tag: r.time_tag,
        value: num(r.bz_gsm),
        value2: num(r.bt), // Total field magnitude.
      }));
      break;
    default:
      return [];
  }

  out = out
    .map(r => ({ ...r, time_tag: toUtcIso(r.time_tag) }))
    .filter(r => r.time_tag && r.value !== null)
    .sort((a, b) => Date.parse(a.time_tag) - Date.parse(b.time_tag));

  return (type === 'kp' || type === 'sfi') ? out : downsampleSpacewx(out, SPACEWX_MAX_POINTS);
}

// --- Predicted sunspot number (solar-cycle/predicted-solar-cycle.json) ---
// Rows look like { "time-tag": "2026-10", "predicted_ssn": 87.9, ... }. Returns the value for the
// given UTC year/month, or null if the feed has no row for it.
function pickPredictedSsn(raw, year, month) {
  if (!Array.isArray(raw)) return null;
  const key = `${year}-${String(month).padStart(2, '0')}`;
  const row = raw.find(r => r && typeof r['time-tag'] === 'string' && r['time-tag'].slice(0, 7) === key);
  return row ? num(row.predicted_ssn) : null;
}

module.exports = {
  SPACEWX_URLS,
  XRAY_FLARE_CHANNEL,
  downsampleSpacewx,
  normalizeSpacewx,
  pickPredictedSsn,
};
