// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  toAdifMode, fromAdifMode, modeFromRig, defaultRst, utcNow, hzToMhz, spotFreqToMhz,
  parseParks, validateEntry, buildRecord, recordToFields, groupActivations,
} from '../../src/qso-entry.js';
import { writeADIF, activationFilename } from '../../src/adif-writer.js';
import { parseADIF } from '../../src/logbook-records.js';

const fields = (over = {}) => ({
  call: 'w1aw', date: '2026-10-04', time: '15:30:12', freq: '14.250', band: '20m', mode: 'SSB',
  rstSent: '59', rstRcvd: '57', stationCall: 'kj5mmo', myGrid: 'EM12ab', grid: '', name: '', comment: '',
  theirPark: '', theirWwff: '', theirSota: '', activating: false, myParks: '', myWwff: '', mySota: '', ...over,
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

describe('WWFF and SOTA references (step 4)', () => {
  test('their WWFF/SOTA refs use dedicated fields and are validated', () => {
    const r = buildRecord(fields({ theirWwff: 'kff-1234', theirSota: 'w6/nc-423' }));
    assert.equal(r.WWFF_REF, 'KFF-1234');
    assert.equal(r.SOTA_REF, 'W6/NC-423');
    assert.equal('SIG' in r, false); // SIG stays free for POTA
    assert.ok(validateEntry(fields({ theirWwff: 'K-1234' })).theirWwff);
    assert.ok(validateEntry(fields({ theirSota: 'W6NC423' })).theirSota);
  });

  test('activating with only a WWFF ref or summit is valid', () => {
    assert.deepEqual(validateEntry(fields({ activating: true, myWwff: 'KFF-0001' })), {});
    assert.deepEqual(validateEntry(fields({ activating: true, mySota: 'W5/NT-001' })), {});
    const r = buildRecord(fields({ activating: true, myWwff: 'KFF-0001', mySota: 'W5/NT-001' }));
    assert.equal(r.MY_WWFF_REF, 'KFF-0001');
    assert.equal(r.MY_SOTA_REF, 'W5/NT-001');
    assert.equal('MY_SIG' in r, false);
  });

  test('my WWFF/SOTA refs are ignored unless activating', () => {
    const r = buildRecord(fields({ myWwff: 'KFF-0001', mySota: 'W5/NT-001' }));
    assert.equal('MY_WWFF_REF' in r, false);
    assert.equal('MY_SOTA_REF' in r, false);
  });

  test('round trip keeps all award fields', () => {
    const f = fields({ theirPark: 'US-0001', theirWwff: 'KFF-0002', theirSota: 'W6/NC-423', activating: true, myParks: 'US-1234', myWwff: 'KFF-1234', mySota: 'W5/NT-001' });
    assert.deepEqual(buildRecord(recordToFields(buildRecord(f))), buildRecord(f));
  });
});

describe('groupActivations', () => {
  const act = (over) => buildRecord(fields({ activating: true, ...over }));

  test('an n-fer splits into one group per park, each carrying only that park', () => {
    const g = groupActivations([act({ myParks: 'US-1234, US-5678', theirPark: 'K-0001' }), act({ call: 'K1ABC', myParks: 'US-1234, US-5678' })]);
    assert.deepEqual(g.map(x => `${x.program} ${x.ref} ${x.records.length}`).sort(), ['POTA US-1234 2', 'POTA US-5678 2']);
    for (const grp of g) {
      for (const r of grp.records) {
        assert.equal(r.MY_SIG_INFO, grp.ref);
        assert.equal(r.MY_POTA_REF, grp.ref);
      }
      assert.equal(grp.records[0].SIG_INFO, 'K-0001'); // park-to-park survives
    }
  });

  test('groups by UTC date', () => {
    const g = groupActivations([act({ myParks: 'US-1234' }), act({ myParks: 'US-1234', date: '2026-10-05' })]);
    assert.deepEqual(g.map(x => x.date), ['20261005', '20261004']);
  });

  test('WWFF copies use MY_SIG=WWFF and drop POTA SIG pairs', () => {
    const [g] = groupActivations([act({ myWwff: 'KFF-1234', theirPark: 'K-0001' })]);
    assert.equal(g.program, 'WWFF');
    const r = g.records[0];
    assert.equal(r.MY_SIG, 'WWFF');
    assert.equal(r.MY_SIG_INFO, 'KFF-1234');
    assert.equal('SIG' in r, false);
  });

  test('POTA + WWFF at the same site produce one group per program', () => {
    const g = groupActivations([act({ myParks: 'US-1234', myWwff: 'KFF-1234', theirWwff: 'KFF-0002' })]);
    assert.deepEqual(g.map(x => x.program).sort(), ['POTA', 'WWFF']);
    const wwff = g.find(x => x.program === 'WWFF').records[0];
    assert.equal(wwff.SIG, 'WWFF');
    assert.equal(wwff.SIG_INFO, 'KFF-0002');
  });

  test('SOTA activations group by summit; non-activation QSOs are ignored', () => {
    const g = groupActivations([act({ mySota: 'W5/NT-001' }), buildRecord(fields())]);
    assert.equal(g.length, 1);
    assert.equal(g[0].ref, 'W5/NT-001');
  });

  test('imported records with legacy MY_SIG/MY_SIG_INFO are grouped too', () => {
    const g = groupActivations([{ CALL: 'W1AW', QSO_DATE: '20260101', TIME_ON: '1200', BAND: '20m', MODE: 'SSB', MY_SIG: 'POTA', MY_SIG_INFO: 'us-0009' }]);
    assert.equal(g[0].ref, 'US-0009');
  });
});

describe('activationFilename', () => {
  test('POTA convention and summit slash handling', () => {
    assert.equal(activationFilename('kj5mmo/p', 'US-1234', '20261004'), 'KJ5MMOP@US-1234-20261004.adi');
    assert.equal(activationFilename('KJ5MMO', 'W6/NC-423', '20261004'), 'KJ5MMO@W6_NC-423-20261004.adi');
  });
});
