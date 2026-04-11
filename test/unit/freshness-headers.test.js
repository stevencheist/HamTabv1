// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');

const {
  setFreshnessHeaders,
  HEADER_FETCHED_AT,
  HEADER_SOURCE_AGE,
  HEADER_CACHE_HIT,
  HEADER_STALE,
} = require('../../server/services/freshness-headers');

// Build a fake Express response that records header sets.
function fakeRes() {
  const headers = {};
  return {
    headers,
    set: (k, v) => { headers[k] = v; },
  };
}

describe('setFreshnessHeaders — defaults', () => {
  test('with no opts: cache miss, fetched now, age 0, not stale', () => {
    const res = fakeRes();
    setFreshnessHeaders(res);
    assert.equal(res.headers[HEADER_CACHE_HIT], 'false');
    assert.equal(res.headers[HEADER_SOURCE_AGE], '0');
    assert.equal(res.headers[HEADER_STALE], 'false');
    // Fetched-at is an ISO string near "now"
    const ms = Date.parse(res.headers[HEADER_FETCHED_AT]);
    assert.ok(Math.abs(Date.now() - ms) < 5000);
  });
});

describe('setFreshnessHeaders — cache hit', () => {
  test('reports correct age for a cache entry from 30 seconds ago', () => {
    const res = fakeRes();
    const fetchedAt = Date.now() - 30_000;
    const expires = Date.now() + 30_000;
    setFreshnessHeaders(res, { fetchedAt, expires, cacheHit: true });
    assert.equal(res.headers[HEADER_CACHE_HIT], 'true');
    assert.equal(res.headers[HEADER_STALE], 'false');
    // Age should be ~30s (allow small clock drift)
    const age = parseInt(res.headers[HEADER_SOURCE_AGE], 10);
    assert.ok(age >= 29 && age <= 31, `expected age ~30, got ${age}`);
    assert.equal(res.headers[HEADER_FETCHED_AT], new Date(fetchedAt).toISOString());
  });

  test('reports stale=true when expires has passed', () => {
    const res = fakeRes();
    const fetchedAt = Date.now() - 120_000;
    const expires = Date.now() - 60_000; // expired a minute ago
    setFreshnessHeaders(res, { fetchedAt, expires, cacheHit: true });
    assert.equal(res.headers[HEADER_STALE], 'true');
    assert.equal(res.headers[HEADER_CACHE_HIT], 'true');
    const age = parseInt(res.headers[HEADER_SOURCE_AGE], 10);
    assert.ok(age >= 119 && age <= 121);
  });
});

describe('setFreshnessHeaders — cache miss', () => {
  test('after fresh fetch with explicit timestamps', () => {
    const res = fakeRes();
    const now = Date.now();
    setFreshnessHeaders(res, { fetchedAt: now, expires: now + 60_000, cacheHit: false });
    assert.equal(res.headers[HEADER_CACHE_HIT], 'false');
    assert.equal(res.headers[HEADER_STALE], 'false');
    assert.equal(res.headers[HEADER_SOURCE_AGE], '0');
    assert.equal(res.headers[HEADER_FETCHED_AT], new Date(now).toISOString());
  });
});

describe('setFreshnessHeaders — edge cases', () => {
  test('clamps negative age to 0 (clock skew)', () => {
    const res = fakeRes();
    // fetchedAt in the future (clock skew or test artifact)
    setFreshnessHeaders(res, { fetchedAt: Date.now() + 5000 });
    assert.equal(res.headers[HEADER_SOURCE_AGE], '0');
  });

  test('omitting expires defaults to stale=false', () => {
    const res = fakeRes();
    setFreshnessHeaders(res, { fetchedAt: Date.now() - 1000, cacheHit: false });
    assert.equal(res.headers[HEADER_STALE], 'false');
  });

  test('cacheHit defaults to false on truthy non-boolean inputs', () => {
    const res = fakeRes();
    setFreshnessHeaders(res, { cacheHit: 'true' }); // string, not boolean
    assert.equal(res.headers[HEADER_CACHE_HIT], 'false');
  });

  test('always sets all four headers (clients can rely on presence)', () => {
    const res = fakeRes();
    setFreshnessHeaders(res);
    assert.ok(HEADER_FETCHED_AT in res.headers);
    assert.ok(HEADER_SOURCE_AGE in res.headers);
    assert.ok(HEADER_CACHE_HIT in res.headers);
    assert.ok(HEADER_STALE in res.headers);
  });
});
