// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- CAT: Trace Bus ---
// Ring buffer that captures structured events from the CAT command pipeline.
// Used for diagnostics panel display and debug bundle export.
// Each trace event records a command's full lifecycle: enqueue → sent → response → parse.
const DEFAULT_MAX_EVENTS = 500;

export function createTraceBus(options = {}) {
  const maxEvents = options.maxEvents || DEFAULT_MAX_EVENTS;

  let events = [];
  let seq = 0;           // monotonic sequence number
  let listeners = [];     // real-time subscribers

  // Error counters — summarize health at a glance.

  const counters = {
    commandsSent: 0,
    responsesOk: 0,
    parseErrors: 0,
    timeouts: 0,
    ioErrors: 0,
    queueDrops: 0,
  };

  // --- Record a trace event ---

  // Category: 'queue' | 'transport' | 'parse' | 'state' | 'error'  // Action:   'enqueue' | 'coalesce' | 'drop' | 'sent' | 'received' |  //           'parsed' | 'parse_error' | 'timeout' | 'io_error' | 'event_applied'.
  function record(category, action, detail = {}) {
    seq++;
    const entry = {
      seq,
      ts: Date.now(),
      category,
      action,
      ...detail,
    };

    events.push(entry);

    // Ring buffer eviction
    if (events.length > maxEvents) {
      events = events.slice(-maxEvents);
    }

    // Update counters
    if (action === 'sent') counters.commandsSent++;
    if (action === 'parsed') counters.responsesOk++;
    if (action === 'parse_error') counters.parseErrors++;
    if (action === 'timeout') counters.timeouts++;
    if (action === 'io_error') counters.ioErrors++;
    if (action === 'drop') counters.queueDrops++;

    // Notify real-time listeners
    for (const fn of listeners) {
      try { fn(entry); } catch (_) { /* don't crash trace bus */ }
    }
  }

  // --- Subscribe to real-time events ---
  function subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter(l => l !== fn);
    };
  }

  // --- Export for debug bundle ---
  function getEvents() {
    return events.slice(); // defensive copy
  }

  function getCounters() {
    return { ...counters };
  }

  // --- Clear all events (not counters) ---
  function clear() {
    events = [];
  }

  // --- Reset everything ---
  function reset() {
    events = [];
    seq = 0;
    Object.keys(counters).forEach(k => { counters[k] = 0; });
  }

  return {
    record,
    subscribe,
    getEvents,
    getCounters,
    clear,
    reset,
  };
}

// Singleton trace bus — shared across the CAT stack.
let _instance = null;

export function getTraceBus() {
  if (!_instance) {
    _instance = createTraceBus();
  }
  return _instance;
}
