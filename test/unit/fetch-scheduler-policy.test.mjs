// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { validateSpec, shouldRun, nextDelay } from '../../src/fetch-scheduler-policy.js';

const noop = () => {};
const validSpec = { id: 'test', run: noop, intervalMs: 1000 };

describe('validateSpec', () => {
  test('accepts a minimal valid spec', () => {
    assert.doesNotThrow(() => validateSpec(validSpec));
  });

  test('accepts a fully populated spec', () => {
    assert.doesNotThrow(() => validateSpec({
      id: 'full',
      run: noop,
      intervalMs: 60_000,
      jitterMs: 5_000,
      requiresLeader: true,
      requiresVisible: false,
      widgetGate: 'widget-foo',
      widgetGateOr: () => false,
      featureFlag: 'feature-foo',
      kind: 'fetch',
    }));
  });

  test('rejects missing id', () => {
    assert.throws(() => validateSpec({ run: noop, intervalMs: 1000 }), /spec\.id/);
    assert.throws(() => validateSpec({ id: '', run: noop, intervalMs: 1000 }), /spec\.id/);
  });

  test('rejects non-function run', () => {
    assert.throws(() => validateSpec({ id: 'x', run: 'not a fn', intervalMs: 1000 }), /spec\.run/);
  });

  test('rejects missing/invalid intervalMs', () => {
    assert.throws(() => validateSpec({ id: 'x', run: noop }), /intervalMs/);
    assert.throws(() => validateSpec({ id: 'x', run: noop, intervalMs: 0 }), /intervalMs/);
    assert.throws(() => validateSpec({ id: 'x', run: noop, intervalMs: -1 }), /intervalMs/);
    assert.throws(() => validateSpec({ id: 'x', run: noop, intervalMs: Infinity }), /intervalMs/);
  });

  test('rejects negative jitterMs', () => {
    assert.throws(() => validateSpec({ id: 'x', run: noop, intervalMs: 1000, jitterMs: -1 }), /jitterMs/);
  });

  test('accepts jitterMs of 0', () => {
    assert.doesNotThrow(() => validateSpec({ id: 'x', run: noop, intervalMs: 1000, jitterMs: 0 }));
  });
});

describe('shouldRun — visibility gate', () => {
  test('runs when visible (default requiresVisible=true)', () => {
    assert.equal(shouldRun({ ...validSpec }, { hidden: false, isLeader: true }), true);
  });

  test('skips when hidden (default requiresVisible=true)', () => {
    assert.equal(shouldRun({ ...validSpec }, { hidden: true, isLeader: true }), false);
  });

  test('runs when hidden if requiresVisible is explicitly false', () => {
    assert.equal(shouldRun({ ...validSpec, requiresVisible: false }, { hidden: true, isLeader: true }), true);
  });
});

describe('shouldRun — leader gate', () => {
  test('runs when leader and requiresLeader=true', () => {
    assert.equal(shouldRun({ ...validSpec, requiresLeader: true }, { hidden: false, isLeader: true }), true);
  });

  test('skips when follower and requiresLeader=true', () => {
    assert.equal(shouldRun({ ...validSpec, requiresLeader: true }, { hidden: false, isLeader: false }), false);
  });

  test('runs when follower and requiresLeader is unset', () => {
    assert.equal(shouldRun({ ...validSpec }, { hidden: false, isLeader: false }), true);
  });
});

describe('shouldRun — widget gate', () => {
  const spec = { ...validSpec, widgetGate: 'widget-foo' };

  test('runs when widget visible', () => {
    assert.equal(shouldRun(spec, { hidden: false, isLeader: true, widgetVisible: true }), true);
  });

  test('skips when widget not visible', () => {
    assert.equal(shouldRun(spec, { hidden: false, isLeader: true, widgetVisible: false }), false);
  });

  test('runs when widget not visible but widgetGateOr returns true', () => {
    assert.equal(
      shouldRun(spec, { hidden: false, isLeader: true, widgetVisible: false, widgetGateOrResult: true }),
      true
    );
  });

  test('skips when both widgetVisible and widgetGateOr are false', () => {
    assert.equal(
      shouldRun(spec, { hidden: false, isLeader: true, widgetVisible: false, widgetGateOrResult: false }),
      false
    );
  });
});

describe('shouldRun — feature flag gate', () => {
  const spec = { ...validSpec, featureFlag: 'my-feature' };

  test('runs when feature visible', () => {
    assert.equal(shouldRun(spec, { hidden: false, isLeader: true, featureVisible: true }), true);
  });

  test('skips when feature not visible', () => {
    assert.equal(shouldRun(spec, { hidden: false, isLeader: true, featureVisible: false }), false);
  });
});

describe('shouldRun — combined gates', () => {
  test('all gates must pass', () => {
    const spec = {
      ...validSpec,
      requiresLeader: true,
      widgetGate: 'widget-foo',
      featureFlag: 'feat',
    };
    const allOk = { hidden: false, isLeader: true, widgetVisible: true, featureVisible: true };
    assert.equal(shouldRun(spec, allOk), true);
    assert.equal(shouldRun(spec, { ...allOk, hidden: true }), false);
    assert.equal(shouldRun(spec, { ...allOk, isLeader: false }), false);
    assert.equal(shouldRun(spec, { ...allOk, widgetVisible: false }), false);
    assert.equal(shouldRun(spec, { ...allOk, featureVisible: false }), false);
  });
});

describe('nextDelay', () => {
  test('returns intervalMs exactly when no jitter', () => {
    assert.equal(nextDelay({ ...validSpec, intervalMs: 1000 }), 1000);
    assert.equal(nextDelay({ ...validSpec, intervalMs: 60_000 }), 60_000);
  });

  test('jitter ranges symmetrically around intervalMs', () => {
    const spec = { ...validSpec, intervalMs: 1000, jitterMs: 100 };
    // random()=0   → intervalMs - jitterMs = 900
    assert.equal(nextDelay(spec, () => 0), 900);
    // random()=0.5 → intervalMs (centered)
    assert.equal(nextDelay(spec, () => 0.5), 1000);
    // random()=0.999 → intervalMs + jitterMs ≈ 1099
    assert.ok(nextDelay(spec, () => 0.999) >= 1099);
  });

  test('clamps to non-negative when jitter exceeds intervalMs', () => {
    const spec = { ...validSpec, intervalMs: 50, jitterMs: 200 };
    assert.equal(nextDelay(spec, () => 0), 0); // 50 - 200 = -150 → clamped to 0
  });

  test('many random samples stay in [intervalMs - jitterMs, intervalMs + jitterMs]', () => {
    const spec = { ...validSpec, intervalMs: 5000, jitterMs: 500 };
    for (let i = 0; i < 100; i++) {
      const d = nextDelay(spec);
      assert.ok(d >= 4500 && d <= 5500, `delay ${d} out of range`);
    }
  });
});
