// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// Pure scheduler policy helpers — no browser/DOM/state dependencies.
// Split out from fetch-scheduler.js so the gating + delay logic can be
// unit-tested in Node without a jsdom shim.

// Validate a job spec. Throws on invalid input.
//
// Two job modes:
//   Auto-scheduled (default) — requires positive intervalMs; the scheduler
//     fires the job repeatedly with cadence `intervalMs` (± jitterMs).
//   Manual (spec.manual === true) — never auto-fires; intervalMs is
//     optional and ignored. Used for jobs that are dispatched explicitly
//     via runNow() (e.g., source fetches triggered by refreshAll()).
export function validateSpec(spec) {
  if (!spec || typeof spec.id !== 'string' || !spec.id) {
    throw new Error('scheduler: spec.id is required');
  }
  if (typeof spec.run !== 'function') {
    throw new Error(`scheduler: ${spec.id}: spec.run must be a function`);
  }
  if (spec.manual !== true) {
    if (typeof spec.intervalMs !== 'number' || spec.intervalMs <= 0 || !Number.isFinite(spec.intervalMs)) {
      throw new Error(`scheduler: ${spec.id}: spec.intervalMs must be a positive finite number`);
    }
  }
  if (spec.jitterMs != null && (typeof spec.jitterMs !== 'number' || spec.jitterMs < 0)) {
    throw new Error(`scheduler: ${spec.id}: spec.jitterMs must be a non-negative number`);
  }
  if (spec.maxBackoffMs != null && (typeof spec.maxBackoffMs !== 'number' || spec.maxBackoffMs <= 0)) {
    throw new Error(`scheduler: ${spec.id}: spec.maxBackoffMs must be a positive number`);
  }
  if (spec.staleAfterMs != null && (typeof spec.staleAfterMs !== 'number' || spec.staleAfterMs <= 0)) {
    throw new Error(`scheduler: ${spec.id}: spec.staleAfterMs must be a positive number`);
  }
}

// Decide whether a job should run given the current gating context.
// Pure function — takes ctx as a parameter so the caller can inject live
// values from the browser (or canned values from a test).
//
// ctx = {
//   hidden: boolean,                 // document.hidden
//   isLeader: boolean,               // isLeaderTab()
//   widgetVisible: boolean | undefined,  // isWidgetVisible(spec.widgetGate)
//   widgetGateOrResult: boolean | undefined,  // result of spec.widgetGateOr()
//   featureVisible: boolean | undefined,  // isFeatureVisible(spec.featureFlag)
// }
export function shouldRun(spec, ctx) {
  if (spec.requiresVisible !== false && ctx.hidden) return false;
  if (spec.requiresLeader && !ctx.isLeader) return false;
  if (spec.featureFlag && !ctx.featureVisible) return false;
  if (spec.widgetGate) {
    if (!ctx.widgetVisible && !ctx.widgetGateOrResult) return false;
  }
  return true;
}

// Compute the delay (in ms) for the next run of a job.
// Applies symmetric ± jitter if jitterMs is set. Pure function — uses
// the supplied random source so tests can pass in deterministic values.
export function nextDelay(spec, random = Math.random) {
  if (!spec.jitterMs) return spec.intervalMs;
  const jitter = Math.floor(random() * spec.jitterMs * 2) - spec.jitterMs;
  return Math.max(0, spec.intervalMs + jitter);
}

// Default cap for exponential backoff: 30 minutes.
const DEFAULT_MAX_BACKOFF_MS = 30 * 60 * 1000;
// Cap the exponent to avoid Math.pow overflow / absurd delays.
const MAX_BACKOFF_EXPONENT = 10; // 2^10 = 1024x base interval

// Compute the delay for the next attempt after one or more failures.
// Exponential backoff: intervalMs * 2^min(failures, cap), capped at
// spec.maxBackoffMs (default 30 min). Jitter (if any) is added on top.
//
// On the first attempt (consecutiveFailures === 0) returns the normal
// nextDelay so successful jobs use their unmodified cadence.
export function nextBackoffDelay(spec, consecutiveFailures, random = Math.random) {
  if (consecutiveFailures <= 0) return nextDelay(spec, random);
  const cap = spec.maxBackoffMs ?? DEFAULT_MAX_BACKOFF_MS;
  const exp = Math.min(consecutiveFailures, MAX_BACKOFF_EXPONENT);
  const backoff = Math.min(spec.intervalMs * Math.pow(2, exp), cap);
  // Symmetric jitter on top of the backoff (if jitterMs configured).
  if (spec.jitterMs) {
    const jitter = Math.floor(random() * spec.jitterMs * 2) - spec.jitterMs;
    return Math.max(0, backoff + jitter);
  }
  return backoff;
}

// Decide whether a job's last result is "stale" — i.e., it hasn't
// succeeded recently enough that consumers should trust the data.
// A job is stale if it has never succeeded, or if the last success was
// more than `staleAfterMs` ago. Default `staleAfterMs` is 2x intervalMs
// (with a 60s minimum) so a job is stale after missing roughly two cycles.
export function isStale(spec, jobState, now = Date.now()) {
  if (!jobState || !jobState.lastSucceededAt) return true;
  const defaultStale = spec.intervalMs ? Math.max(spec.intervalMs * 2, 60_000) : 60_000;
  const staleAfter = spec.staleAfterMs ?? defaultStale;
  return (now - jobState.lastSucceededAt) > staleAfter;
}

// Build a fresh per-job state object.
export function newJobState() {
  return {
    lastStartedAt: null,
    lastSucceededAt: null,
    lastFailedAt: null,
    consecutiveFailures: 0,
    nextEligibleAt: null,
    stale: true,
    lastError: null,
  };
}
