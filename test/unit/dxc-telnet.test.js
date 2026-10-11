// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// DX cluster / RBN telnet line parsing and login-prompt detection.
// Line shapes copied from telnet.reversebeacon.net and AR-Cluster/DXSpider nodes (2026-10).
const { test } = require('node:test');
const assert = require('node:assert');
const { parseDxcSpot, parseRbnSpot, isLoginPrompt } = require('../../server/services/spot-parse');

const NOW = new Date('2026-10-11T01:50:00Z');

test('skimmer spotter with no space after the colon parses', () => {
  const s = parseRbnSpot('DX de JI1HFJ-#:430066.10  JA4WWO/1     CW 12 dB 22 WPM CQ          0142Z', NOW);
  assert.ok(s);
  assert.strictEqual(s.spotter, 'JI1HFJ-#');
  assert.strictEqual(s.callsign, 'JA4WWO/1');
  assert.strictEqual(s.frequency, '430.066');
  assert.strictEqual(s.band, '70cm');
  assert.strictEqual(s.db, 12);
  assert.strictEqual(s.wpm, 22);
  assert.strictEqual(s.spotType, 'CQ');
  assert.strictEqual(s.spotTime, '2026-10-11T01:42:00.000Z');
});

test('classic spaced DX cluster line parses', () => {
  const s = parseDxcSpot('DX de N0CALL:     14025.0  K0XX         CW 10 dB 25 WPM             0123Z', NOW);
  assert.strictEqual(s.spotter, 'N0CALL');
  assert.strictEqual(s.callsign, 'K0XX');
  assert.strictEqual(s.frequency, '14.025');
  assert.strictEqual(s.mode, 'CW');
  assert.strictEqual(s.source, 'dxc-tcp');
});

test('empty comment and trailing spotter grid are accepted', () => {
  const s = parseDxcSpot('DX de N0CALL:    7074.0  K0XX         0101Z FN42', NOW);
  assert.ok(s);
  assert.strictEqual(s.comments, '');
  assert.strictEqual(s.band, '40m');
});

test('HHMM later than now belongs to the previous UTC day', () => {
  const s = parseDxcSpot('DX de N0CALL:    7074.0  K0XX   FT8   2359Z', NOW);
  assert.strictEqual(s.spotTime, '2026-10-10T23:59:00.000Z');
});

test('non-spot lines are ignored', () => {
  for (const l of ['Hello N0CALL, this is W3LPL', 'login:', 'DX de N0CALL: abc K0XX x 0101Z', 'To ALL de N0CALL: hi']) {
    assert.strictEqual(parseDxcSpot(l, NOW), null, l);
  }
});

test('login prompts are detected without a trailing newline', () => {
  for (const p of ['login: ', 'Please enter your call: ', 'Please enter your callsign:', 'Enter your callsign\n\nlogin:', 'login:\r']) {
    assert.strictEqual(isLoginPrompt(p), true, JSON.stringify(p));
  }
  for (const p of ['', 'Welcome to the cluster', 'DX de N0CALL:  14025.0  K0XX  0101Z', 'last login: yesterday']) {
    assert.strictEqual(isLoginPrompt(p), false, JSON.stringify(p));
  }
});
