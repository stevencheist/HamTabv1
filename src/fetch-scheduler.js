// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// Centralized fetch + render scheduler.
// Owns periodic work that previously lived as scattered setInterval calls
// in main.js and refresh.js. Each job is declared with its cadence, jitter,
// and gating policy (visibility, leader-tab, widget visibility, feature flag).
//
// PR 8 added per-job state tracking and exponential backoff: when a job
// throws repeatedly, the next attempt is delayed exponentially (capped),
// so a flapping upstream doesn't cause synchronized retry storms.
//
// Pure policy helpers live in fetch-scheduler-policy.js so they can be
// unit-tested in Node without a DOM shim.

import { isWidgetVisible } from './widgets.js';
import { isLeaderTab } from './cross-tab.js';
import { isFeatureVisible } from './feature-flags.js';
import {
  validateSpec,
  shouldRun,
  nextDelay,
  nextBackoffDelay,
  isStale,
  newJobState,
} from './fetch-scheduler-policy.js';

// Job spec shape:
// {
//   id: string,                  // unique identifier
//   run: () => any,              // function to invoke (sync or async)
//   intervalMs: number,          // base cadence in ms (required unless manual)
//   jitterMs?: number,           // ± random jitter in ms (default 0)
//   maxBackoffMs?: number,       // cap for exponential backoff (default 30m)
//   staleAfterMs?: number,       // when to consider data stale (default 2x interval)
//   manual?: boolean,            // if true, never auto-fires; only via runNow()
//   requiresLeader?: boolean,    // gate on isLeaderTab() (default false)
//   requiresVisible?: boolean,   // gate on !document.hidden (default true)
//   widgetGate?: string,         // gate on isWidgetVisible(widgetGate)
//   widgetGateOr?: () => boolean, // alternative gate (e.g., overlay band set)
//   featureFlag?: string,        // gate on isFeatureVisible(featureFlag)
//   kind?: 'fetch' | 'render',   // metadata for tooling
// }
//
// Per-job state (read via getJobState):
// {
//   lastStartedAt: number | null,   // epoch ms of last invocation start
//   lastSucceededAt: number | null, // epoch ms of last success
//   lastFailedAt: number | null,    // epoch ms of last failure
//   consecutiveFailures: number,    // resets to 0 on success
//   nextEligibleAt: number | null,  // when the next auto-scheduled run will fire
//   stale: boolean,                 // computed via isStale() at read time
//   lastError: string | null,       // most recent error message
// }

const jobs = new Map(); // id -> { spec, timer, state }

function buildContext(spec) {
  return {
    hidden: typeof document !== 'undefined' ? document.hidden : false,
    isLeader: isLeaderTab(),
    widgetVisible: spec.widgetGate ? isWidgetVisible(spec.widgetGate) : undefined,
    widgetGateOrResult: spec.widgetGateOr ? !!spec.widgetGateOr() : undefined,
    featureVisible: spec.featureFlag ? isFeatureVisible(spec.featureFlag) : undefined,
  };
}

// Run a job's `run` function, handling both sync and async failures.
// Updates per-job state with start/success/failure timestamps.
// Resolves to true on success, false on failure. Never throws.
async function executeJob(id) {
  const entry = jobs.get(id);
  if (!entry) return false;
  const { spec, state: jobState } = entry;

  jobState.lastStartedAt = Date.now();
  try {
    const result = spec.run();
    // Await if it returned a Promise so we can capture async failures.
    if (result && typeof result.then === 'function') {
      await result;
    }
    jobState.lastSucceededAt = Date.now();
    jobState.consecutiveFailures = 0;
    jobState.lastError = null;
    return true;
  } catch (err) {
    jobState.lastFailedAt = Date.now();
    jobState.consecutiveFailures++;
    jobState.lastError = err && err.message ? err.message : String(err);
    console.error(`[scheduler:${id}]`, err);
    return false;
  }
}

function scheduleNext(id) {
  const entry = jobs.get(id);
  if (!entry || entry.spec.manual === true) return;
  const delay = nextBackoffDelay(entry.spec, entry.state.consecutiveFailures);
  entry.state.nextEligibleAt = Date.now() + delay;
  entry.timer = setTimeout(async () => {
    // Re-check entry — may have been unregistered while timer was pending.
    if (!jobs.has(id)) return;
    if (shouldRun(entry.spec, buildContext(entry.spec))) {
      await executeJob(id);
    }
    scheduleNext(id);
  }, delay);
}

// Register a job. Auto-scheduled jobs (default) start their timer
// immediately. Manual jobs (spec.manual === true) are tracked but
// never auto-fire — they only run when invoked via runNow().
export function register(spec) {
  validateSpec(spec);
  if (jobs.has(spec.id)) {
    throw new Error(`scheduler.register: duplicate id "${spec.id}"`);
  }
  jobs.set(spec.id, { spec, timer: null, state: newJobState() });
  if (spec.manual !== true) {
    scheduleNext(spec.id);
  }
}

// Stop and remove a job.
export function unregister(id) {
  const entry = jobs.get(id);
  if (!entry) return false;
  if (entry.timer) clearTimeout(entry.timer);
  jobs.delete(id);
  return true;
}

// Returns true if a job with this id is currently registered.
export function has(id) {
  return jobs.has(id);
}

// List currently registered job ids (for debugging / introspection).
export function listJobs() {
  return Array.from(jobs.keys());
}

// Number of currently registered jobs.
export function jobCount() {
  return jobs.size;
}

// Get a snapshot of a job's tracking state. Returns null if the job
// is not registered. The `stale` field is computed at read time so
// callers always see the freshest assessment.
export function getJobState(id) {
  const entry = jobs.get(id);
  if (!entry) return null;
  return {
    ...entry.state,
    stale: isStale(entry.spec, entry.state),
  };
}

// Get tracking state snapshots for all registered jobs.
// Returns an object: { [id]: jobState }.
export function getAllJobStates() {
  const result = {};
  for (const [id, entry] of jobs) {
    result[id] = {
      ...entry.state,
      stale: isStale(entry.spec, entry.state),
    };
  }
  return result;
}

// Run a job immediately, bypassing all gates (visibility, leader, etc.).
// Used by manual override paths like the Refresh button. Updates the
// job's tracking state. Returns false if the job is not registered.
export async function runNow(id) {
  if (!jobs.has(id)) return false;
  await executeJob(id);
  return true;
}

// Catch-up on tab visibility return.
//
// Browsers throttle setTimeout/setInterval in background tabs, so when
// a tab returns to the foreground there can be up to `intervalMs` of
// staleness before the next scheduled tick fires. This walks all
// auto-scheduled render-kind jobs, runs the eligible ones immediately,
// and reschedules the regular cadence.
//
// Only `kind: 'render'` jobs are caught up — fetch-kind jobs are
// deliberately NOT caught up to avoid synchronized network bursts on
// tab return. They tick on their normal cadence after visibility
// returns; freshness comes from the next scheduled run, not catch-up.
export function catchUpRenderJobs() {
  for (const [id, entry] of jobs) {
    if (entry.spec.manual) continue;
    if (entry.spec.kind !== 'render') continue;
    if (!shouldRun(entry.spec, buildContext(entry.spec))) continue;
    // Skip jobs that started running very recently (avoid double-fire
    // when a visibility event lands right next to a scheduled tick).
    const sinceLastStart = Date.now() - (entry.state.lastStartedAt || 0);
    if (sinceLastStart < 250) continue;
    // Cancel any pending tick — we're firing immediately and will
    // reschedule a fresh interval afterwards.
    if (entry.timer) {
      clearTimeout(entry.timer);
      entry.timer = null;
    }
    // Fire-and-reschedule. executeJob is async but we don't need to
    // await — we just want each job to start its own promise chain.
    executeJob(id).then(() => scheduleNext(id));
  }
}

// Dev/debug helper: expose scheduler introspection on window so it's
// reachable from the browser console as `__hamtabScheduler`.
if (typeof window !== 'undefined') {
  window.__hamtabScheduler = {
    list: listJobs,
    state: getJobState,
    all: getAllJobStates,
    runNow,
    has,
    catchUp: catchUpRenderJobs,
  };
}

// Attach the visibility catch-up listener once at module load.
// Browser-only — guarded by typeof checks so the module still loads
// cleanly under Node test runtime.
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    catchUpRenderJobs();
  });
}
