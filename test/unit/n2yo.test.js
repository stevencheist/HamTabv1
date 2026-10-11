// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// N2YO returns HTTP 200 with {"error": "..."} for bad keys (live shape, 2026-10-11).
const { test } = require('node:test');
const assert = require('node:assert');
const { N2yoError, checkN2yoResponse } = require('../../server/services/n2yo');

test('error body is thrown as N2yoError with the upstream message', () => {
  assert.throws(() => checkN2yoResponse({ error: 'Invalid API Key!' }),
    (err) => err instanceof N2yoError && err.message === 'N2YO: Invalid API Key!');
});

test('empty or non-object responses are errors', () => {
  assert.throws(() => checkN2yoResponse(null), N2yoError);
  assert.throws(() => checkN2yoResponse('oops'), N2yoError);
});

test('normal responses pass through unchanged', () => {
  const data = { info: { satid: 25544, satname: 'SPACE STATION', transactionscount: 1 }, tle: '1 25544U ...' };
  assert.strictEqual(checkN2yoResponse(data), data);
});
