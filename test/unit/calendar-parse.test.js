// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// Contest (WA7BNM calendar.rss) and DXpedition (NG3K adxo.xml) date parsing.
// Description/title strings are copied from the live feeds as of 2026-10-11.
const { test } = require('node:test');
const assert = require('node:assert');
const { parseContestDates, parseDxpedDates } = require('../../server/services/calendar-parse');

const NOW = new Date('2026-10-11T01:00:00Z');
const iso = (r) => r && [r.start.toISOString(), r.end.toISOString()];

test('contest: multi-day range', () => {
  assert.deepStrictEqual(iso(parseContestDates('0600Z, Oct 10 to 0600Z, Oct 11', NOW)),
    ['2026-10-10T06:00:00.000Z', '2026-10-11T06:00:00.000Z']);
});

test('contest: 2400Z means the following midnight', () => {
  assert.deepStrictEqual(iso(parseContestDates('1200Z, Oct 10 to 2400Z, Oct 11', NOW)),
    ['2026-10-10T12:00:00.000Z', '2026-10-12T00:00:00.000Z']);
});

test('contest: single-day window', () => {
  assert.deepStrictEqual(iso(parseContestDates('0600Z-1000Z, Oct 11', NOW)),
    ['2026-10-11T06:00:00.000Z', '2026-10-11T10:00:00.000Z']);
});

test('contest: multi-segment takes first start and last end', () => {
  assert.deepStrictEqual(
    iso(parseContestDates('0000Z-0800Z, Oct 10 and 1600Z-2400Z, Oct 10 and 0800Z-1600Z, Oct 11', NOW)),
    ['2026-10-10T00:00:00.000Z', '2026-10-11T16:00:00.000Z']);
  assert.deepStrictEqual(
    iso(parseContestDates('1600Z, Oct 10 to 0400Z, Oct 11 and 1300Z-2200Z, Oct 11', NOW)),
    ['2026-10-10T16:00:00.000Z', '2026-10-11T22:00:00.000Z']);
});

test('contest: local-time window widens to cover every zone', () => {
  assert.deepStrictEqual(iso(parseContestDates('0800 local - 1400 local, Oct 17', NOW)),
    ['2026-10-16T18:00:00.000Z', '2026-10-18T02:00:00.000Z']);
});

test('contest: year boundary (late December feed with January dates)', () => {
  const dec = new Date('2026-12-30T12:00:00Z');
  assert.deepStrictEqual(iso(parseContestDates('1500Z, Dec 31 to 1500Z, Jan 1', dec)),
    ['2026-12-31T15:00:00.000Z', '2027-01-01T15:00:00.000Z']);
  assert.deepStrictEqual(iso(parseContestDates('0000Z-2400Z, Jan 2', dec)),
    ['2027-01-02T00:00:00.000Z', '2027-01-03T00:00:00.000Z']);
  // And early January looking back at an item that started on Dec 31.
  const jan = new Date('2027-01-01T03:00:00Z');
  assert.deepStrictEqual(iso(parseContestDates('2000Z, Dec 31 to 2000Z, Jan 1', jan)),
    ['2026-12-31T20:00:00.000Z', '2027-01-01T20:00:00.000Z']);
});

test('contest: unparseable descriptions return null', () => {
  for (const s of ['', 'TBA', 'See rules', '0600Z, Foo 10 to 0600Z, Oct 11', '2500Z-2600Z, Oct 11']) {
    assert.strictEqual(parseContestDates(s, NOW), null, s);
  }
});

test('dxped: same-month and month-change ranges', () => {
  assert.deepStrictEqual(iso(parseDxpedDates('Oct 1-20, 2026', NOW)),
    ['2026-10-01T00:00:00.000Z', '2026-10-20T23:59:59.000Z']);
  assert.deepStrictEqual(iso(parseDxpedDates('Sep 26-Oct 17, 2026', NOW)),
    ['2026-09-26T00:00:00.000Z', '2026-10-17T23:59:59.000Z']);
});

test('dxped: cross-year with a year on both ends', () => {
  assert.deepStrictEqual(iso(parseDxpedDates('Dec 23, 2026-Jan 6, 2027', NOW)),
    ['2026-12-23T00:00:00.000Z', '2027-01-06T23:59:59.000Z']);
});

test('dxped: cross-year with only the trailing year', () => {
  assert.deepStrictEqual(iso(parseDxpedDates('Nov 20-Jan 5, 2027', NOW)),
    ['2026-11-20T00:00:00.000Z', '2027-01-05T23:59:59.000Z']);
});

test('dxped: no year resolves near now', () => {
  assert.deepStrictEqual(iso(parseDxpedDates('Jan 2-9', new Date('2026-12-20T00:00:00Z'))),
    ['2027-01-02T00:00:00.000Z', '2027-01-09T23:59:59.000Z']);
});

test('dxped: unparseable returns null', () => {
  for (const s of ['', 'TBD', 'QRT', 'Oct 20-1, 2026']) assert.strictEqual(parseDxpedDates(s, NOW), null, s);
});
