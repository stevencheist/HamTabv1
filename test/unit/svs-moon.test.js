// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
const { test } = require('node:test');
const assert = require('node:assert');
const { svsMoonFrameUrl } = require('../../server/services/svs-moon');

test('2026 uses the a005587 set, frame = hour of year', () => {
  assert.strictEqual(svsMoonFrameUrl(new Date('2026-01-01T00:30:00Z')),
    'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/frames/730x730_1x1_30p/moon.0001.jpg');
  assert.strictEqual(svsMoonFrameUrl(new Date('2026-12-31T23:59:00Z')),
    'https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/frames/730x730_1x1_30p/moon.8760.jpg');
});

test('other verified years map to their own ids; leap years run to frame 8784', () => {
  assert.match(svsMoonFrameUrl(new Date('2025-06-01T00:00:00Z')), /\/a005400\/a005415\//);
  assert.match(svsMoonFrameUrl(new Date('2024-12-31T23:30:00Z')), /\/a005100\/a005187\/.*moon\.8784\.jpg$/);
});

test('unknown year returns null so the route can fail soft', () => {
  assert.strictEqual(svsMoonFrameUrl(new Date('2031-03-01T00:00:00Z')), null);
});
