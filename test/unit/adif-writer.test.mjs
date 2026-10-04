// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { writeADIF, formatField, toAscii, missingRequired, exportFilename, ADIF_VERSION } from '../../src/adif-writer.js';
import { parseADIF, withMeta, SOURCE_HAMTAB, META_KEY } from '../../src/logbook-records.js';

const NOW = new Date(Date.UTC(2026, 9, 4, 5, 6, 7));
const qso = (over = {}) => ({ CALL: 'W1AW', QSO_DATE: '20261004', TIME_ON: '153012', BAND: '20m', FREQ: '14.250', MODE: 'SSB', ...over });

describe('header and structure', () => {
  test('header has version, program, timestamp, and exactly one <EOH>', () => {
    const { text } = writeADIF([qso()], { programVersion: '0.71.0', now: NOW });
    assert.ok(!text.startsWith('<'));
    assert.match(text, new RegExp(`<ADIF_VER:5>${ADIF_VERSION.replace(/\./g, '\\.')}`));
    assert.match(text, /<PROGRAMID:6>HamTab/);
    assert.match(text, /<PROGRAMVERSION:6>0\.71\.0/);
    assert.match(text, /<CREATED_TIMESTAMP:15>20261004 050607/);
    assert.equal(text.match(/<EOH>/g).length, 1);
  });

  test('one <EOR> per record', () => {
    const { text, recordCount } = writeADIF([qso(), qso({ CALL: 'K1ABC' }), qso({ CALL: 'N0CALL' })]);
    assert.equal(recordCount, 3);
    assert.equal(text.match(/<EOR>/g).length, 3);
  });

  test('core fields come first in a fixed order', () => {
    const { text } = writeADIF([{ ZZZ_APP: 'x', MODE: 'CW', CALL: 'K1ABC', QSO_DATE: '20261004', TIME_ON: '1200', BAND: '40m' }]);
    const rec = text.split('<EOH>')[1];
    assert.ok(rec.indexOf('<CALL:') < rec.indexOf('<QSO_DATE:'));
    assert.ok(rec.indexOf('<BAND:') < rec.indexOf('<MODE:'));
    assert.ok(rec.indexOf('<MODE:') < rec.indexOf('<ZZZ_APP:'));
  });
});

describe('field content', () => {
  test('never writes HamTab metadata or the DB id', () => {
    const r = { id: 42, ...withMeta(qso(), SOURCE_HAMTAB) };
    const { text } = writeADIF([r]);
    assert.ok(!/_hamtab/i.test(text));
    assert.ok(!/<ID:/i.test(text));
  });

  test('skips _INTL fields (ADX-only) and empty values', () => {
    const { text } = writeADIF([qso({ NAME_INTL: 'José', COMMENT: '   ' })]);
    assert.ok(!/_INTL/.test(text));
    assert.ok(!/<COMMENT:/.test(text));
  });

  test('keeps unknown and application fields from imports', () => {
    const { text } = writeADIF([qso({ APP_N1MM_EXCHANGE1: '5NN', MY_SIG: 'POTA', MY_SIG_INFO: 'K-0001' })]);
    assert.match(text, /<APP_N1MM_EXCHANGE1:3>5NN/);
    assert.match(text, /<MY_SIG_INFO:6>K-0001/);
  });

  test('non-ASCII is folded and length matches bytes and characters', () => {
    const f = formatField('NAME', 'José Müller-Łukasz ßtraße');
    assert.equal(f.text, '<NAME:27>Jose Muller-Lukasz sstrasse');
    assert.equal(f.changed, true);
    const value = f.text.split('>')[1];
    assert.equal(new TextEncoder().encode(value).length, value.length);
  });

  test('characters with no ASCII equivalent are dropped', () => {
    assert.equal(toAscii('73 \u{1F600} de 東京').value, '73  de ');
  });

  test('line breaks: kept in multiline fields, flattened elsewhere', () => {
    assert.equal(formatField('NOTES', 'a\nb').text, '<NOTES:4>a\r\nb');
    assert.equal(formatField('COMMENT', 'a\nb').text, '<COMMENT:3>a b');
  });

  test('FREQ uses a dot decimal', () => {
    assert.equal(formatField('FREQ', '14,074').text, '<FREQ:6>14.074');
  });

  test('values are written as-is apart from ASCII folding (no case changes)', () => {
    const { text } = writeADIF([qso({ BAND: '20m', MODE: 'SSB' })]);
    assert.match(text, /<BAND:3>20m/);
  });
});

describe('round trip through HamTab importer', () => {
  test('parseADIF reads back the same records', () => {
    const records = [
      qso({ NAME: 'Hiram', GRIDSQUARE: 'FN31', COMMENT: 'Thanks <for> the QSO: 73' }),
      qso({ CALL: 'K1ABC', MODE: 'CW', BAND: '40m', FREQ: '7.030', RST_SENT: '599', RST_RCVD: '579' }),
      qso({ CALL: 'N0CALL', NAME: 'José', SIG: 'POTA', SIG_INFO: 'US-0001' }),
    ];
    const back = parseADIF(writeADIF(records).text);
    assert.equal(back.length, 3);
    assert.equal(back[0].COMMENT, 'Thanks <for> the QSO: 73');
    assert.equal(back[1].RST_RCVD, '579');
    assert.equal(back[2].NAME, 'Jose');
    for (let i = 0; i < records.length; i++) {
      for (const k of ['CALL', 'QSO_DATE', 'TIME_ON', 'BAND', 'FREQ', 'MODE']) assert.equal(back[i][k], records[i][k]);
    }
  });
});

describe('missingRequired and incomplete count', () => {
  test('complete record has nothing missing', () => {
    assert.deepEqual(missingRequired(qso()), []);
  });

  test('band or freq satisfies the frequency requirement', () => {
    assert.deepEqual(missingRequired(qso({ BAND: '' })), []);
    assert.deepEqual(missingRequired(qso({ BAND: '', FREQ: '' })), ['BAND/FREQ']);
  });

  test('bad date/time and missing mode are reported, and still exported', () => {
    const bad = qso({ QSO_DATE: '2026-10-04', TIME_ON: '9', MODE: '' });
    assert.deepEqual(missingRequired(bad), ['QSO_DATE', 'TIME_ON', 'MODE']);
    const out = writeADIF([qso(), bad]);
    assert.equal(out.incompleteRecords, 1);
    assert.equal(out.text.match(/<EOR>/g).length, 2);
  });
});

describe('exportFilename', () => {
  test('allow-lists callsign and scope characters', () => {
    assert.equal(exportFilename('kj5mmo/p', 'Logged!', NOW), 'hamtab-KJ5MMOP-20261004-logged.adi');
    assert.equal(exportFilename('', 'all', NOW), 'hamtab-20261004-all.adi');
  });
});

describe('metadata is untouched by export', () => {
  test('writer does not mutate input records', () => {
    const r = withMeta(qso(), SOURCE_HAMTAB);
    const before = JSON.stringify(r);
    writeADIF([r]);
    assert.equal(JSON.stringify(r), before);
    assert.equal(r[META_KEY].lastExportedAt, null);
  });
});
