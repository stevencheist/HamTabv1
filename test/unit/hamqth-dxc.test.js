// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// HamQTH dxc_csv.php parsing — field order taken from the live feed (spotter first, DX call third).
const { test } = require('node:test');
const assert = require('node:assert');
const { parseHamqthDxcLine } = require('../../server/services/spot-parse');

test('parses DX call, spotter and HHMM YYYY-MM-DD time from a live-format line', () => {
  const s = parseHamqthDxcLine('N0CALL^18101.0^FW1XX^ft8^0109 2026-10-11^L^E^OC^17M^Wallis & Futuna Islands^298');
  assert.strictEqual(s.callsign, 'FW1XX');
  assert.strictEqual(s.spotter, 'N0CALL');
  assert.strictEqual(s.frequency, '18.101');
  assert.strictEqual(s.band, '17m');
  assert.strictEqual(s.spotTime, '2026-10-11T01:09:00Z');
  assert.ok(!Number.isNaN(Date.parse(s.spotTime)));
  assert.strictEqual(s.comments, 'ft8');
  assert.strictEqual(s.name, 'Wallis & Futuna Islands');
  assert.strictEqual(s.continent, 'OC');
  assert.strictEqual(s.lotwUser, true);
  assert.strictEqual(s.eqslUser, true);
  assert.strictEqual(s.adifId, '298');
});

test('empty LoTW/eQSL flags are false', () => {
  const s = parseHamqthDxcLine('N0CALL^14033.0^N0CALL^^0109 2026-10-11^^^NA^20M^United States^291');
  assert.strictEqual(s.lotwUser, false);
  assert.strictEqual(s.eqslUser, false);
  assert.strictEqual(s.callsign, 'N0CALL');
});

test('unparseable time yields empty spotTime rather than an invalid date', () => {
  const s = parseHamqthDxcLine('N0CALL^7035.8^K0XX^test^garbage^^^NA^40M^United States^291');
  assert.strictEqual(s.spotTime, '');
});

test('short or malformed lines are skipped', () => {
  assert.strictEqual(parseHamqthDxcLine('N0CALL^7035.8^K0XX'), null);
  assert.strictEqual(parseHamqthDxcLine('N0CALL^abc^K0XX^c^0109 2026-10-11^^^NA^40M^US^291'), null);
});
