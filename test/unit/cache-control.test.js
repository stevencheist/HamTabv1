// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const cacheControl = require('../../server/middleware/cache-control');
const { CACHE_RULES } = cacheControl;

// Build a fake req/res/next to drive the middleware.
function run(method, path) {
  const headers = {};
  const req = { method, path };
  const res = { set: (k, v) => { headers[k] = v; } };
  let nextCalled = false;
  cacheControl(req, res, () => { nextCalled = true; });
  return { headers, nextCalled };
}

describe('cache-control middleware', () => {
  test('always calls next()', () => {
    assert.equal(run('GET', '/api/spots').nextCalled, true);
    assert.equal(run('POST', '/api/feedback').nextCalled, true);
    assert.equal(run('GET', '/no-rule').nextCalled, true);
  });

  test('skips non-GET/HEAD requests', () => {
    const { headers } = run('POST', '/api/spots');
    assert.equal(headers['Cache-Control'], undefined);
  });

  test('applies HEAD requests like GET', () => {
    const { headers } = run('HEAD', '/api/spots');
    assert.equal(headers['Cache-Control'], 'public, max-age=30, s-maxage=60');
  });

  test('matches exact prefix', () => {
    const { headers } = run('GET', '/api/spots');
    assert.equal(headers['Cache-Control'], 'public, max-age=30, s-maxage=60');
  });

  test('matches subpath under prefix', () => {
    const { headers } = run('GET', '/api/spots/dxc');
    assert.equal(headers['Cache-Control'], 'public, max-age=15, s-maxage=30');
  });

  test('uses first matching rule (more specific prefixes come first)', () => {
    // /api/spots/psk/heard is more specific than /api/spots/psk
    const { headers } = run('GET', '/api/spots/psk/heard');
    assert.equal(headers['Cache-Control'], 'public, max-age=120, s-maxage=300');
  });

  test('does not match prefix as a substring of a path segment', () => {
    // /api/solar should not match /api/solarflare (defensive — we use prefix + "/")
    const { headers } = run('GET', '/api/solarflare');
    assert.equal(headers['Cache-Control'], undefined);
  });

  test('returns no header for unmatched path', () => {
    const { headers } = run('GET', '/health');
    assert.equal(headers['Cache-Control'], undefined);
  });

  test('CACHE_RULES contains all expected route prefixes', () => {
    const prefixes = new Set(CACHE_RULES.map(r => r.prefix));
    // Sanity check: a few representative prefixes from each tier
    assert.ok(prefixes.has('/api/spots'));
    assert.ok(prefixes.has('/api/solar'));
    assert.ok(prefixes.has('/api/satellites/positions'));
    assert.ok(prefixes.has('/api/weather'));
    assert.ok(prefixes.has('/api/voacap'));
  });

  test('every CACHE_RULES entry has a valid Cache-Control directive', () => {
    for (const rule of CACHE_RULES) {
      assert.match(rule.cc, /^public, max-age=\d+, s-maxage=\d+$/);
    }
  });
});
