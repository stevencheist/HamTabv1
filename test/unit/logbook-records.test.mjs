// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  META_KEY,
  SOURCE_IMPORT,
  SOURCE_HAMTAB,
  MIGRATED_BATCH_ID,
  withMeta,
  migrateV1Record,
  isHamtabLogged,
  countHamtabLogged,
  countUnexportedLogged,
  isProbableDuplicate,
  planImport,
} from '../../src/logbook-records.js';

const qso = (over = {}) => ({ CALL: 'W1AW', QSO_DATE: '20261004', TIME_ON: '1530', BAND: '20M', MODE: 'SSB', ...over });

describe('migrateV1Record', () => {
  test('keeps every ADIF field and tags the record as imported', () => {
    const v1 = { id: 7, ...qso({ NAME: 'Hiram', APP_N1MM_EXCHANGE1: 'X', MY_SIG_INFO: 'K-0001' }) };
    const out = migrateV1Record(v1, '2026-10-04T00:00:00Z');
    for (const [k, v] of Object.entries(v1)) assert.equal(out[k], v);
    assert.equal(out[META_KEY].source, SOURCE_IMPORT);
    assert.equal(out[META_KEY].importBatchId, MIGRATED_BATCH_ID);
    assert.ok(out[META_KEY].uuid);
  });

  test('is idempotent for records that already carry metadata', () => {
    const once = migrateV1Record(qso());
    assert.equal(migrateV1Record(once), once);
  });
});

describe('source helpers', () => {
  test('records without metadata count as imported', () => {
    assert.equal(isHamtabLogged(qso()), false);
  });

  test('counts HamTab-logged and unexported records', () => {
    const logged = withMeta(qso(), SOURCE_HAMTAB);
    const exported = withMeta(qso({ CALL: 'K1ABC' }), SOURCE_HAMTAB);
    exported[META_KEY].lastExportedAt = '2026-10-04T01:00:00Z';
    const imported = withMeta(qso({ CALL: 'N0CALL' }), SOURCE_IMPORT);
    const all = [logged, exported, imported];
    assert.equal(countHamtabLogged(all), 2);
    assert.equal(countUnexportedLogged(all), 1);
  });
});

describe('isProbableDuplicate', () => {
  test('same call/band/mode within the window is a duplicate', () => {
    assert.equal(isProbableDuplicate(qso(), qso({ TIME_ON: '153200' })), true);
  });

  test('outside the window is not', () => {
    assert.equal(isProbableDuplicate(qso(), qso({ TIME_ON: '1540' })), false);
  });

  test('different band or mode is a separate QSO', () => {
    assert.equal(isProbableDuplicate(qso(), qso({ BAND: '40M' })), false);
    assert.equal(isProbableDuplicate(qso(), qso({ MODE: 'CW' })), false);
  });

  test('different station callsigns are not duplicates', () => {
    assert.equal(isProbableDuplicate(qso({ STATION_CALLSIGN: 'KJ5MMO' }), qso({ STATION_CALLSIGN: 'KG5DPV' })), false);
  });

  test('case and whitespace are ignored', () => {
    assert.equal(isProbableDuplicate(qso(), qso({ CALL: ' w1aw ', band: undefined, BAND: '20m' })), true);
  });
});

describe('planImport', () => {
  const logged = withMeta(qso({ CALL: 'K2LOG' }), SOURCE_HAMTAB);
  const oldImport = withMeta(qso({ CALL: 'K3OLD' }), SOURCE_IMPORT, 'batch-1');

  test('replace-imported drops old imports but keeps HamTab-logged QSOs', () => {
    const plan = planImport([logged, oldImport], [qso({ CALL: 'K4NEW' })], 'replace-imported', 'batch-2');
    assert.deepEqual(plan.keep, [logged]);
    assert.deepEqual(plan.remove, [oldImport]);
    assert.equal(plan.add.length, 1);
    assert.equal(plan.add[0].CALL, 'K4NEW');
    assert.equal(plan.add[0][META_KEY].importBatchId, 'batch-2');
  });

  test('replace-imported skips incoming copies of HamTab-logged QSOs', () => {
    const plan = planImport([logged, oldImport], [qso({ CALL: 'K2LOG', TIME_ON: '1531' }), qso({ CALL: 'K4NEW' })], 'replace-imported', 'batch-4');
    assert.deepEqual(plan.add.map(r => r.CALL), ['K4NEW']);
    assert.deepEqual(plan.skipped.map(r => r.CALL), ['K2LOG']);
  });

  test('replace-imported with no HamTab-logged QSOs adds the whole file, duplicates included', () => {
    const plan = planImport([oldImport], [qso({ CALL: 'K3OLD' }), qso({ CALL: 'K3OLD' })], 'replace-imported', 'batch-5');
    assert.equal(plan.add.length, 2);
    assert.equal(plan.skipped.length, 0);
  });

  test('add-new skips duplicates of existing and of earlier rows in the same file', () => {
    const plan = planImport([oldImport], [qso({ CALL: 'K3OLD' }), qso({ CALL: 'K5ONE' }), qso({ CALL: 'K5ONE', TIME_ON: '1531' })], 'add-new', 'batch-3');
    assert.deepEqual(plan.remove, []);
    assert.deepEqual(plan.add.map(r => r.CALL), ['K5ONE']);
    assert.deepEqual(plan.skipped.map(r => r.CALL), ['K3OLD', 'K5ONE']);
  });

  test('unknown mode throws', () => {
    assert.throws(() => planImport([], [], 'merge', 'b'));
  });
});
