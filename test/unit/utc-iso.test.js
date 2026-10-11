// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// toUtcIso — upstream timestamps without a zone (POTA, WSPR, SWPC) are UTC.
const { test } = require('node:test');
const assert = require('node:assert');
const { toUtcIso } = require('../../server/services/spot-parse');

test('zone-less ISO and space-separated forms are treated as UTC', () => {
  assert.strictEqual(toUtcIso('2026-10-11T00:43:38'), '2026-10-11T00:43:38.000Z');
  assert.strictEqual(toUtcIso('2026-10-11 01:14:00'), '2026-10-11T01:14:00.000Z');
  assert.strictEqual(toUtcIso('2026-10-04 00:00:00.000'), '2026-10-04T00:00:00.000Z');
  assert.strictEqual(toUtcIso('2026-10-11'), '2026-10-11T00:00:00.000Z');
});

test('explicit zones are honoured', () => {
  assert.strictEqual(toUtcIso('2026-10-04T01:49:00Z'), '2026-10-04T01:49:00.000Z');
  assert.strictEqual(toUtcIso('2026-10-11T02:43:38+02:00'), '2026-10-11T00:43:38.000Z');
  assert.strictEqual(toUtcIso('Sun, 11 Oct 2026 00:00:00 +0000'), '2026-10-11T00:00:00.000Z');
});

test('unparseable input returns empty string', () => {
  for (const v of [null, undefined, '', 'garbage', '2026-13-45T00:00:00', 'Oct 11 01:14']) {
    assert.strictEqual(toUtcIso(v), '');
  }
});
