// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// NOAA SWPC normalization — fixtures are trimmed copies of the live feeds as of 2026-10-11.
const { test } = require('node:test');
const assert = require('node:assert');
const { normalizeSpacewx, pickPredictedSsn, SPACEWX_URLS } = require('../../server/services/spacewx-parse');

const isAscending = (rows) => rows.every((r, i) => i === 0 || Date.parse(r.time_tag) >= Date.parse(rows[i - 1].time_tag));

test('Kp: new array-of-objects shape (no header row), zone-less time tags become ISO Z', () => {
  const raw = [
    { time_tag: '2026-10-04T00:00:00', Kp: 3.0, a_running: 15, station_count: 8 },
    { time_tag: '2026-10-04T03:00:00', Kp: 3.33, a_running: 18, station_count: 8 },
    { time_tag: '2026-10-04T06:00:00', Kp: 4.33, a_running: 32, station_count: 8 },
  ];
  const out = normalizeSpacewx('kp', raw);
  assert.deepStrictEqual(out.map(r => r.value), [3, 3.33, 4.33]);
  assert.strictEqual(out[0].time_tag, '2026-10-04T00:00:00.000Z');
});

test('Kp: legacy array-of-arrays with header row still parses', () => {
  const raw = [
    ['time_tag', 'Kp', 'a_running', 'station_count'],
    ['2026-10-04 00:00:00.000', '3.00', '15', '8'],
    ['2026-10-04 03:00:00.000', '3.33', '18', '8'],
  ];
  const out = normalizeSpacewx('kp', raw);
  assert.deepStrictEqual(out.map(r => r.value), [3, 3.33]);
  assert.strictEqual(out[1].time_tag, '2026-10-04T03:00:00.000Z');
});

test('X-ray: keeps only the 0.1-0.8 nm flare-class channel', () => {
  const raw = [
    { time_tag: '2026-10-04T01:49:00Z', satellite: 18, flux: 1.59e-09, energy: '0.05-0.4nm' },
    { time_tag: '2026-10-04T01:49:00Z', satellite: 18, flux: 2.83e-07, energy: '0.1-0.8nm' },
    { time_tag: '2026-10-04T01:50:00Z', satellite: 18, flux: 9.99e-10, energy: '0.05-0.4nm' },
    { time_tag: '2026-10-04T01:50:00Z', satellite: 18, flux: 2.79e-07, energy: '0.1-0.8nm' },
  ];
  const out = normalizeSpacewx('xray', raw);
  assert.deepStrictEqual(out.map(r => r.value), [2.83e-07, 2.79e-07]);
});

test('F10.7: newest-first feed is returned oldest-first', () => {
  const raw = [
    { time_tag: '2026-10-10T22:00:00', frequency: 2800, flux: 124.0, reporting_schedule: 'Afternoon' },
    { time_tag: '2026-10-10T20:00:00', frequency: 2800, flux: 126.0, reporting_schedule: 'Noon' },
    { time_tag: '2026-10-10T17:00:00', frequency: 2800, flux: 132.0, reporting_schedule: 'Morning' },
  ];
  const out = normalizeSpacewx('sfi', raw);
  assert.deepStrictEqual(out.map(r => r.value), [132, 126, 124]);
  assert.ok(isAscending(out));
});

test('Solar wind (RTSW): active spacecraft only, sorted ascending, speed + density', () => {
  const raw = [
    { time_tag: '2026-10-11T01:45:00', active: true, source: 'SOLAR1', proton_speed: 664.7, proton_density: 8.26 },
    { time_tag: '2026-10-11T01:44:03', active: false, source: 'IMAP', proton_speed: 686.03, proton_density: 25.02 },
    { time_tag: '2026-10-11T01:44:00', active: true, source: 'SOLAR1', proton_speed: 664.3, proton_density: 7.92 },
    { time_tag: '2026-10-11T01:43:03', active: false, source: 'ACE', proton_speed: 686.95, proton_density: 24.82 },
    { time_tag: '2026-10-11T01:43:00', active: true, source: 'SOLAR1', proton_speed: null, proton_density: 7.84 },
  ];
  const out = normalizeSpacewx('wind', raw);
  assert.deepStrictEqual(out, [
    { time_tag: '2026-10-11T01:44:00.000Z', value: 664.3, value2: 7.92 },
    { time_tag: '2026-10-11T01:45:00.000Z', value: 664.7, value2: 8.26 },
  ]);
});

test('Mag (RTSW): Bz GSM and Bt from the active spacecraft', () => {
  const raw = [
    { time_tag: '2026-10-11T01:45:01', active: false, source: 'IMAP', bt: 19.1, bz_gsm: 12.81 },
    { time_tag: '2026-10-11T01:45:00', active: true, source: 'SOLAR1', bt: 19.5, bz_gsm: 13.07 },
    { time_tag: '2026-10-11T01:44:00', active: true, source: 'SOLAR1', bt: 19.67, bz_gsm: -13.23 },
  ];
  const out = normalizeSpacewx('mag', raw);
  assert.deepStrictEqual(out.map(r => [r.value, r.value2]), [[-13.23, 19.67], [13.07, 19.5]]);
  assert.ok(isAscending(out));
});

test('large series are downsampled and stay ascending', () => {
  const raw = [];
  const t0 = Date.UTC(2026, 9, 10, 0, 0);
  for (let i = 1440; i >= 0; i--) {
    raw.push({ time_tag: new Date(t0 + i * 60000).toISOString().slice(0, 19), active: true, proton_speed: 400 + i % 10, proton_density: 5 });
  }
  const out = normalizeSpacewx('wind', raw);
  assert.ok(out.length <= 500 && out.length > 400);
  assert.ok(isAscending(out));
});

test('unknown type and garbage input return empty arrays', () => {
  assert.deepStrictEqual(normalizeSpacewx('nope', [{ time_tag: '2026-10-10T00:00:00', flux: 1 }]), []);
  assert.deepStrictEqual(normalizeSpacewx('sfi', { error: 'x' }), []);
  assert.deepStrictEqual(normalizeSpacewx('sfi', [{ time_tag: 'garbage', flux: 100 }]), []);
});

test('wind/mag no longer point at the retired 7-day products feeds', () => {
  assert.match(SPACEWX_URLS.wind, /rtsw_wind_1m\.json$/);
  assert.match(SPACEWX_URLS.mag, /rtsw_mag_1m\.json$/);
});

test('predicted SSN: picks the row for the requested YYYY-MM', () => {
  const raw = [
    { 'time-tag': '2026-09', predicted_ssn: 89.1, 'predicted_f10.7': 127.0 },
    { 'time-tag': '2026-10', predicted_ssn: 87.9, 'predicted_f10.7': 125.9 },
    { 'time-tag': '2026-11', predicted_ssn: 88.4, 'predicted_f10.7': 126.0 },
  ];
  assert.strictEqual(pickPredictedSsn(raw, 2026, 10), 87.9);
  assert.strictEqual(pickPredictedSsn(raw, 2027, 1), null);
  assert.strictEqual(pickPredictedSsn(null, 2026, 10), null);
});
