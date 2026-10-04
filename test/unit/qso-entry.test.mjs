// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  toAdifMode, fromAdifMode, modeFromRig, defaultRst, utcNow, hzToMhz, spotFreqToMhz,
  parseParks, validateEntry, buildRecord, recordToFields,
} from '../../src/qso-entry.js';
import { writeADIF } from '../../src/adif-writer.js';
import { parseADIF } from '../../src/logbook-records.js';

const fields = (over = {}) => ({
  call: 'w1aw', date: '2026-10-04', time: '15:30:12', freq: '14.250', band: '20m', mode: 'SSB',
  rstSent: '59', rstRcvd: '57', stationCall: 'kj5mmo', myGrid: 'EM12ab', grid: '', name: '', comment: '',
  theirPark: '', activating: false, myParks: '', ...over,
});

describe('modes', () => {
  test('submode names map to ADIF MODE/SUBMODE', () => {
    assert.deepEqual(toAdifMode('ft4'), { MODE: 'MFSK', SUBMODE: 'FT4' });
    assert.deepEqual(toAdifMode('USB'), { MODE: 'SSB', SUBMODE: 'USB' });
    assert.deepEqual(toAdifMode('FT8'), { MODE: 'FT8', SUBMODE: '' });
    assert.deepEqual(toAdifMode('cw'), { MODE: 'CW', SUBMODE: '' });
  });

  test('fromAdifMode reverses known submodes only', () => {
    assert.equal(fromAdifMode('MFSK', 'FT4'), 'FT4');
    assert.equal(fromAdifMode('SSB', ''), 'SSB');
    assert.equal(fromAdifMode('MFSK', 'FSQCALL'), 'MFSK');
  });

  test('rig modes: data modes are not guessed', () => {
    assert.equal(modeFromRig('CW-U'), 'CW');
    assert.equal(modeFromRig('USB'), 'USB');
    assert.equal(modeFromRig('FM-N'), 'FM');
    assert.equal(modeFromRig('DATA-U'), '');
    assert.equal(modeFromRig(''), '');
  });

  test('RST defaults by mode family', () => {
    assert.equal(defaultRst('SSB'), '59');
    assert.equal(defaultRst('FM'), '59');
    assert.equal(defaultRst('CW'), '599');
    assert.equal(defaultRst('FT8'), '');
  });
});

describe('time and frequency', () => {
  test('utcNow gives ADIF date and six-digit time', () => {
    assert.deepEqual(utcNow(new Date(Date.UTC(2026, 0, 2, 3, 4, 5))), { date: '20260102', time: '030405' });
  });

  test('frequency conversions', () => {
    assert.equal(hzToMhz(14074000), '14.074');
    assert.equal(hzToMhz(7030500), '7.0305');
    assert.equal(hzToMhz(146520000), '146.520');
    assert.equal(spotFreqToMhz('14074'), '14.074');     // kHz (POTA spots)
    assert.equal(spotFreqToMhz('14.074'), '14.074');    // MHz
    assert.equal(spotFreqToMhz(14074000), '14.074');    // Hz
    assert.equal(spotFreqToMhz(''), '');
  });

  test('parseParks splits on commas/spaces and dedupes', () => {
    assert.deepEqual(parseParks('us-1234, US-5678 us-1234'), ['US-1234', 'US-5678']);
  });
});

describe('validateEntry', () => {
  test('a complete entry is valid', () => {
    assert.deepEqual(validateEntry(fields()), {});
  });

  test('flags bad call, date, time, missing mode and band/freq', () => {
    const e = validateEntry(fields({ call: 'abc', date: '2026-13-01', time: '25:00', mode: '', freq: '', band: '' }));
    assert.deepEqual(Object.keys(e).sort(), ['band', 'call', 'date', 'mode', 'time']);
  });

  test('portable calls are accepted', () => {
    assert.deepEqual(validateEntry(fields({ call: 'VE3/W1AW/P' })), {});
  });

  test('band alone (no frequency) is enough', () => {
    assert.deepEqual(validateEntry(fields({ freq: '' })), {});
  });

  test('park references are checked', () => {
    assert.ok(validateEntry(fields({ theirPark: 'park 12' })).theirPark);
    assert.ok(validateEntry(fields({ activating: true, myParks: '' })).myParks);
    assert.deepEqual(validateEntry(fields({ activating: true, myParks: 'US-1234, US-5678' })), {});
  });
});

describe('buildRecord', () => {
  test('normalizes and drops empty fields', () => {
    const r = buildRecord(fields());
    assert.equal(r.CALL, 'W1AW');
    assert.equal(r.QSO_DATE, '20261004');
    assert.equal(r.TIME_ON, '153012');
    assert.equal(r.STATION_CALLSIGN, 'KJ5MMO');
    assert.equal('NAME' in r, false);
    assert.equal('SUBMODE' in r, false);
  });

  test('hunter POTA contact sets SIG/SIG_INFO/POTA_REF only', () => {
    const r = buildRecord(fields({ theirPark: 'us-1234' }));
    assert.equal(r.SIG, 'POTA');
    assert.equal(r.SIG_INFO, 'US-1234');
    assert.equal(r.POTA_REF, 'US-1234');
    assert.equal('MY_SIG' in r, false);
  });

  test('activator fields appear only when activating', () => {
    assert.equal('MY_SIG' in buildRecord(fields({ myParks: 'US-1234' })), false);
    const r = buildRecord(fields({ activating: true, myParks: 'US-1234, US-5678', theirPark: 'K-0001' }));
    assert.equal(r.MY_SIG, 'POTA');
    assert.equal(r.MY_SIG_INFO, 'US-1234');
    assert.equal(r.MY_POTA_REF, 'US-1234,US-5678');
    assert.equal(r.SIG_INFO, 'K-0001'); // park-to-park
  });

  test('recordToFields round-trips through buildRecord', () => {
    const f = fields({ mode: 'FT4', rstSent: '-10', rstRcvd: '-12', theirPark: 'US-0001', activating: true, myParks: 'US-1234, US-5678', name: 'Hiram' });
    const again = buildRecord(recordToFields(buildRecord(f)));
    assert.deepEqual(again, buildRecord(f));
  });

  test('a built record exports and re-imports intact', () => {
    const r = buildRecord(fields({ mode: 'FT4', theirPark: 'US-0001' }));
    const [back] = parseADIF(writeADIF([r]).text);
    assert.deepEqual(back, r);
  });
});
