// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  validateSpec,
  shouldRun,
  nextDelay,
  nextBackoffDelay,
  isStale,
  newJobState,
} from '../../src/fetch-scheduler-policy.js';

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

describe('validateSpec — manual mode', () => {
  test('accepts manual job without intervalMs', () => {
    assert.doesNotThrow(() => validateSpec({ id: 'm', run: noop, manual: true }));
  });

  test('accepts manual job with intervalMs (ignored but allowed)', () => {
    assert.doesNotThrow(() => validateSpec({ id: 'm', run: noop, manual: true, intervalMs: 1000 }));
  });

  test('still rejects invalid intervalMs on auto-scheduled jobs', () => {
    assert.throws(() => validateSpec({ id: 'a', run: noop }), /intervalMs/);
    assert.throws(() => validateSpec({ id: 'a', run: noop, intervalMs: 0 }), /intervalMs/);
  });

  test('rejects invalid maxBackoffMs', () => {
    assert.throws(() => validateSpec({ id: 'x', run: noop, intervalMs: 1000, maxBackoffMs: 0 }), /maxBackoffMs/);
    assert.throws(() => validateSpec({ id: 'x', run: noop, intervalMs: 1000, maxBackoffMs: -1 }), /maxBackoffMs/);
  });

  test('rejects invalid staleAfterMs', () => {
    assert.throws(() => validateSpec({ id: 'x', run: noop, intervalMs: 1000, staleAfterMs: 0 }), /staleAfterMs/);
  });
});

describe('nextBackoffDelay', () => {
  const spec = { id: 'x', run: noop, intervalMs: 1000 };

  test('returns normal delay when no failures', () => {
    assert.equal(nextBackoffDelay(spec, 0), 1000);
  });

  test('doubles each consecutive failure', () => {
    assert.equal(nextBackoffDelay(spec, 1), 2000);   // 2^1
    assert.equal(nextBackoffDelay(spec, 2), 4000);   // 2^2
    assert.equal(nextBackoffDelay(spec, 3), 8000);   // 2^3
    assert.equal(nextBackoffDelay(spec, 4), 16000);  // 2^4
  });

  test('caps at default maxBackoffMs (30 minutes) when interval is large enough', () => {
    // With intervalMs = 1 hour, even one failure (2^1 = 2x = 2 hours) exceeds 30 min cap.
    const bigSpec = { id: 'big', run: noop, intervalMs: 60 * 60 * 1000 };
    assert.equal(nextBackoffDelay(bigSpec, 1), 30 * 60 * 1000);
    assert.equal(nextBackoffDelay(bigSpec, 5), 30 * 60 * 1000);
  });

  test('exponent is capped at 10 (so 1000ms base never exceeds ~17 min)', () => {
    // 1000 * 2^10 = 1,024,000ms ≈ 17 min — that's the effective ceiling for
    // small intervals because the exponent cap kicks in before the time cap.
    assert.equal(nextBackoffDelay(spec, 10), 1024000);
    assert.equal(nextBackoffDelay(spec, 100), 1024000); // exponent capped at 10
  });

  test('respects custom maxBackoffMs', () => {
    const custom = { ...spec, maxBackoffMs: 5000 };
    assert.equal(nextBackoffDelay(custom, 1), 2000);
    assert.equal(nextBackoffDelay(custom, 2), 4000);
    assert.equal(nextBackoffDelay(custom, 3), 5000); // capped
    assert.equal(nextBackoffDelay(custom, 99), 5000);
  });

  test('very high failure counts produce a finite delay (no Math.pow overflow)', () => {
    // The exponent is internally capped at 10, so even with 1000 failures
    // the math doesn't blow up. With intervalMs=1000 we hit the exponent cap.
    const result = nextBackoffDelay(spec, 1000);
    assert.equal(typeof result, 'number');
    assert.ok(Number.isFinite(result));
    assert.ok(result > 0);
  });

  test('applies symmetric jitter on top of backoff', () => {
    const jittery = { ...spec, jitterMs: 100 };
    // failures=1, base = 1000 * 2^1 = 2000, jitter ∈ [-100, +100]
    assert.equal(nextBackoffDelay(jittery, 1, () => 0), 1900);
    assert.equal(nextBackoffDelay(jittery, 1, () => 0.5), 2000);
    assert.ok(nextBackoffDelay(jittery, 1, () => 0.999) >= 2099);
  });

  test('clamps to non-negative even with destructive jitter', () => {
    const tiny = { id: 'x', run: noop, intervalMs: 50, jitterMs: 5000 };
    // 50 * 2^1 = 100, jitter -5000 → clamp to 0
    assert.equal(nextBackoffDelay(tiny, 1, () => 0), 0);
  });
});

describe('isStale', () => {
  const spec = { id: 'x', run: noop, intervalMs: 1000 };

  test('returns true when never succeeded', () => {
    assert.equal(isStale(spec, newJobState()), true);
  });

  test('returns false when last success was recent', () => {
    const now = 10_000;
    const state = { ...newJobState(), lastSucceededAt: now - 500 };
    assert.equal(isStale(spec, state, now), false);
  });

  test('returns true when last success was past staleAfterMs', () => {
    // default staleAfter = max(intervalMs * 2, 60s) = 60_000
    const now = 100_000;
    const state = { ...newJobState(), lastSucceededAt: now - 70_000 };
    assert.equal(isStale(spec, state, now), true);
  });

  test('respects custom staleAfterMs', () => {
    const customSpec = { ...spec, staleAfterMs: 5000 };
    const now = 100_000;
    const state = { ...newJobState(), lastSucceededAt: now - 6000 };
    assert.equal(isStale(customSpec, state, now), true);
  });

  test('boundary: exactly staleAfterMs ago is NOT stale', () => {
    const customSpec = { ...spec, staleAfterMs: 5000 };
    const now = 100_000;
    const state = { ...newJobState(), lastSucceededAt: now - 5000 };
    // (now - lastSucceededAt) > staleAfterMs → 5000 > 5000 → false
    assert.equal(isStale(customSpec, state, now), false);
  });
});

describe('newJobState', () => {
  test('returns a fresh state with all fields zeroed', () => {
    const s = newJobState();
    assert.equal(s.lastStartedAt, null);
    assert.equal(s.lastSucceededAt, null);
    assert.equal(s.lastFailedAt, null);
    assert.equal(s.consecutiveFailures, 0);
    assert.equal(s.nextEligibleAt, null);
    assert.equal(s.stale, true);
    assert.equal(s.lastError, null);
  });

  test('returns a new object each call (no shared mutation)', () => {
    const a = newJobState();
    const b = newJobState();
    a.consecutiveFailures = 5;
    assert.equal(b.consecutiveFailures, 0);
  });
});
