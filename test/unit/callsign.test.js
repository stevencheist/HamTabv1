// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const { isUSCallsign, gridToLatLon } = require('../../server/routes/callsign');

describe('isUSCallsign', () => {
  test('matches K/N/W single-letter prefixes', () => {
    assert.equal(isUSCallsign('K1ABC'), true);
    assert.equal(isUSCallsign('N1ABC'), true);
    assert.equal(isUSCallsign('W1AW'), true);
    assert.equal(isUSCallsign('W7XYZ'), true);
  });

  test('matches K/N/W two-letter prefixes', () => {
    assert.equal(isUSCallsign('KA1ABC'), true);
    assert.equal(isUSCallsign('NW7DR'), true);
    assert.equal(isUSCallsign('WB6QVU'), true);
  });

  test('matches A[A-L] prefixes', () => {
    assert.equal(isUSCallsign('AA1A'), true);
    assert.equal(isUSCallsign('AL7Q'), true);
    assert.equal(isUSCallsign('AB1XYZ'), true);
  });

  test('rejects A[M-Z] prefixes (reserved for other countries)', () => {
    assert.equal(isUSCallsign('AM1ABC'), false);
    assert.equal(isUSCallsign('AZ1ABC'), false);
  });

  test('rejects non-US prefixes', () => {
    assert.equal(isUSCallsign('VE3ABC'), false); // Canada
    assert.equal(isUSCallsign('G0ABC'), false);  // UK
    assert.equal(isUSCallsign('JA1ABC'), false); // Japan
    assert.equal(isUSCallsign('DL1ABC'), false); // Germany
  });

  test('handles lowercase input (case-insensitive)', () => {
    assert.equal(isUSCallsign('w1aw'), true);
    assert.equal(isUSCallsign('k1abc'), true);
  });

  test('rejects empty/falsy input', () => {
    assert.equal(isUSCallsign(''), false);
    assert.equal(isUSCallsign(null), false);
    assert.equal(isUSCallsign(undefined), false);
  });
});

describe('gridToLatLon (Maidenhead grid square)', () => {
  test('CN87 — Seattle area (4-character grid)', () => {
    const { lat, lon } = gridToLatLon('CN87');
    // Field C (lon -160), N (lat 40); square 8 (+16 lon), 7 (+7 lat)
    // = lon -160 + 16 + 1 = -143... wait
    // Actually: CN87 → lon = (C-A)*20 + (8-0)*2 + 1 - 180 = 2*20 + 16 + 1 - 180 = -123
    //          lat = (N-A)*10 + (7-0) + 0.5 - 90 = 13*10 + 7 + 0.5 - 90 = 47.5
    assert.ok(Math.abs(lat - 47.5) < 0.01);
    assert.ok(Math.abs(lon - (-123)) < 0.01);
  });

  test('FN31 — Boston area', () => {
    const { lat, lon } = gridToLatLon('FN31');
    // F=5, N=13, 3, 1
    // lon = 5*20 + 3*2 + 1 - 180 = 100 + 6 + 1 - 180 = -73
    // lat = 13*10 + 1 + 0.5 - 90 = 130 + 1.5 - 90 = 41.5
    assert.ok(Math.abs(lat - 41.5) < 0.01);
    assert.ok(Math.abs(lon - (-73)) < 0.01);
  });

  test('JJ00 — equator/prime meridian region', () => {
    const { lat, lon } = gridToLatLon('JJ00');
    // J=9, J=9, 0, 0
    // lon = 9*20 + 0 + 1 - 180 = 1
    // lat = 9*10 + 0 + 0.5 - 90 = 0.5
    assert.ok(Math.abs(lat - 0.5) < 0.01);
    assert.ok(Math.abs(lon - 1) < 0.01);
  });

  test('returns null for too-short input', () => {
    assert.equal(gridToLatLon(''), null);
    assert.equal(gridToLatLon('AB'), null);
    assert.equal(gridToLatLon('ABC'), null);
  });

  test('returns null for null/undefined', () => {
    assert.equal(gridToLatLon(null), null);
    assert.equal(gridToLatLon(undefined), null);
  });

  test('accepts 6+ character grids (only uses first 4)', () => {
    const r = gridToLatLon('CN87up');
    assert.ok(r !== null);
    assert.ok(typeof r.lat === 'number');
    assert.ok(typeof r.lon === 'number');
  });
});
