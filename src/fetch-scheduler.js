// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

// Centralized fetch + render scheduler.
// Owns periodic work that previously lived as scattered setInterval calls
// in main.js and refresh.js. Each job is declared with its cadence, jitter,
// and gating policy (visibility, leader-tab, widget visibility, feature flag).
//
// PR 6 scope is behavior-preserving migration: same cadences, same gates.
// Backoff and freshness metadata land in PR 8; visibility/multi-tab policy
// consolidation lands in PR 9.
//
// Pure policy helpers live in fetch-scheduler-policy.js so they can be
// unit-tested in Node without a DOM shim.

import { isWidgetVisible } from './widgets.js';
import { isLeaderTab } from './cross-tab.js';
import { isFeatureVisible } from './feature-flags.js';
import { validateSpec, shouldRun, nextDelay } from './fetch-scheduler-policy.js';

// Job spec shape:
// {
//   id: string,                  // unique identifier
//   run: () => any,              // function to invoke (sync or async)
//   intervalMs: number,          // base cadence in ms
//   jitterMs?: number,           // ± random jitter in ms (default 0)
//   requiresLeader?: boolean,    // gate on isLeaderTab() (default false)
//   requiresVisible?: boolean,   // gate on !document.hidden (default true)
//   widgetGate?: string,         // gate on isWidgetVisible(widgetGate)
//   widgetGateOr?: () => boolean, // alternative gate (e.g., overlay band set)
//   featureFlag?: string,        // gate on isFeatureVisible(featureFlag)
//   kind?: 'fetch' | 'render',   // metadata for backoff (PR 8) and tooling
// }

const jobs = new Map(); // id -> { spec, timer }

function buildContext(spec) {
  return {
    hidden: typeof document !== 'undefined' ? document.hidden : false,
    isLeader: isLeaderTab(),
    widgetVisible: spec.widgetGate ? isWidgetVisible(spec.widgetGate) : undefined,
    widgetGateOrResult: spec.widgetGateOr ? !!spec.widgetGateOr() : undefined,
    featureVisible: spec.featureFlag ? isFeatureVisible(spec.featureFlag) : undefined,
  };
}

function scheduleNext(id) {
  const entry = jobs.get(id);
  if (!entry) return;
  entry.timer = setTimeout(() => {
    // Re-check entry — may have been unregistered while timer was pending.
    if (!jobs.has(id)) return;
    if (shouldRun(entry.spec, buildContext(entry.spec))) {
      try {
        entry.spec.run();
      } catch (err) {
        console.error(`[scheduler:${id}]`, err);
      }
    }
    scheduleNext(id);
  }, nextDelay(entry.spec));
}

// Register a job and start its timer immediately.
export function register(spec) {
  validateSpec(spec);
  if (jobs.has(spec.id)) {
    throw new Error(`scheduler.register: duplicate id "${spec.id}"`);
  }
  jobs.set(spec.id, { spec, timer: null });
  scheduleNext(spec.id);
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

// Run a job immediately (without changing its scheduled cadence).
// Returns false if the job is not registered.
export function runNow(id) {
  const entry = jobs.get(id);
  if (!entry) return false;
  try {
    entry.spec.run();
  } catch (err) {
    console.error(`[scheduler:${id}]`, err);
  }
  return true;
}
