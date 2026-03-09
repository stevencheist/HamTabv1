// --- CAT: Debug Snapshot Generator ---
// Captures a JSON bundle of connection metadata, rig state, trace events,
// and error counters. Designed for: (1) user bug reports, (2) AI diagnostics.

import { getTraceBus } from './trace-bus.js';
import { getRigStore } from '../connection-orchestrator.js';

// --- Build the debug snapshot ---
export function captureSnapshot(extras = {}) {
  const store = getRigStore();
  const traceBus = getTraceBus();
  const rigState = store.get();
  const counters = traceBus.getCounters();
  const traceEvents = traceBus.getEvents();

  // Connection metadata from localStorage
  const connectionMeta = {
    profileId: localStorage.getItem('hamtab_radio_profile') || null,
    protocol: localStorage.getItem('hamtab_radio_protocol') || null,
    baudRate: localStorage.getItem('hamtab_radio_baud') || null,
    dataBits: localStorage.getItem('hamtab_radio_databits') || null,
    stopBits: localStorage.getItem('hamtab_radio_stopbits') || null,
    parity: localStorage.getItem('hamtab_radio_parity') || null,
    flowControl: localStorage.getItem('hamtab_radio_flow') || null,
    portMode: localStorage.getItem('hamtab_radio_portmode') || null,
    civAddress: localStorage.getItem('hamtab_radio_civaddr') || null,
    pollingInterval: localStorage.getItem('hamtab_radio_polling') || null,
  };

  // Sanitize rig state — remove internal/sensitive fields
  const safeState = { ...rigState };
  delete safeState._subscribers; // internal

  const snapshot = {
    version: 1,
    generator: 'hamtab-cat-diagnostics',
    appVersion: typeof APP_VERSION !== 'undefined' ? APP_VERSION : 'unknown',
    capturedAt: new Date().toISOString(),
    capturedAtMs: Date.now(),

    connection: connectionMeta,

    rigState: safeState,

    counters,

    // Last N trace events (most recent last)
    traceEvents,
    traceEventCount: traceEvents.length,

    // Caller can inject extra data (e.g., smart-detect probe results)
    ...extras,
  };

  return snapshot;
}

// --- Download snapshot as JSON file ---
export function downloadSnapshot(extras = {}) {
  const snapshot = captureSnapshot(extras);
  const json = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  a.download = `hamtab-cat-debug-${ts}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
