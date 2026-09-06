// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// X-Hamtab-* freshness headers.
//
// Routes that serve cached upstream data call setFreshnessHeaders(res, opts)
// to expose freshness metadata to clients without changing response shape.
// Headers set:
//
//   X-Hamtab-Fetched-At    ISO timestamp of when the data was originally
//                          fetched from upstream (or "now" for non-cached).
//   X-Hamtab-Source-Age-Sec  Integer seconds since X-Hamtab-Fetched-At.
//   X-Hamtab-Cache-Hit     "true" if served from cache, "false" if fresh.
//   X-Hamtab-Stale         "true" if past expires, "false" otherwise.
//
// Clients (browser, curl, monitoring) can use these to detect stale data
// without parsing response bodies. The fetch-scheduler client also tracks
// success/failure independently in PR 8 — these headers are complementary.

const HEADER_FETCHED_AT = 'X-Hamtab-Fetched-At';
const HEADER_SOURCE_AGE = 'X-Hamtab-Source-Age-Sec';
const HEADER_CACHE_HIT = 'X-Hamtab-Cache-Hit';
const HEADER_STALE = 'X-Hamtab-Stale';

// Set freshness headers on an Express response.
//
// opts:
//   fetchedAt?: number    epoch ms of original fetch (defaults to now)
//   expires?:   number    epoch ms of TTL expiry (optional)
//   cacheHit?:  boolean   was this served from cache? (defaults to false)
//
// All four headers are always set so clients can rely on them being
// present. If `expires` is omitted, X-Hamtab-Stale is "false".
function setFreshnessHeaders(res, opts = {}) {
  const now = Date.now();
  const fetchedAt = typeof opts.fetchedAt === 'number' ? opts.fetchedAt : now;
  const cacheHit = opts.cacheHit === true;
  const ageSec = Math.max(0, Math.floor((now - fetchedAt) / 1000));
  const stale = opts.expires != null && now > opts.expires;

  res.set(HEADER_FETCHED_AT, new Date(fetchedAt).toISOString());
  res.set(HEADER_SOURCE_AGE, String(ageSec));
  res.set(HEADER_CACHE_HIT, cacheHit ? 'true' : 'false');
  res.set(HEADER_STALE, stale ? 'true' : 'false');
}

module.exports = {
  setFreshnessHeaders,
  HEADER_FETCHED_AT,
  HEADER_SOURCE_AGE,
  HEADER_CACHE_HIT,
  HEADER_STALE,
};
