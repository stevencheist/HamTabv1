// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// Pure scheduler policy helpers — no browser/DOM/state dependencies.
// Split out from fetch-scheduler.js so the gating + delay logic can be
// unit-tested in Node without a jsdom shim.

// Validate a job spec. Throws on invalid input.
export function validateSpec(spec) {
  if (!spec || typeof spec.id !== 'string' || !spec.id) {
    throw new Error('scheduler: spec.id is required');
  }
  if (typeof spec.run !== 'function') {
    throw new Error(`scheduler: ${spec.id}: spec.run must be a function`);
  }
  if (typeof spec.intervalMs !== 'number' || spec.intervalMs <= 0 || !Number.isFinite(spec.intervalMs)) {
    throw new Error(`scheduler: ${spec.id}: spec.intervalMs must be a positive finite number`);
  }
  if (spec.jitterMs != null && (typeof spec.jitterMs !== 'number' || spec.jitterMs < 0)) {
    throw new Error(`scheduler: ${spec.id}: spec.jitterMs must be a non-negative number`);
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
