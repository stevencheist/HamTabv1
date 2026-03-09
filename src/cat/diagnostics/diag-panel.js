// --- CAT: Diagnostics Panel UI ---
// Real-time command trace viewer and debug bundle export.
// Shown via the magnifying glass button on the On-Air Rig widget.

import { getTraceBus } from './trace-bus.js';
import { downloadSnapshot, captureSnapshot } from './snapshot.js';
import { getRigStore } from '../connection-orchestrator.js';
import { $ } from '../../dom.js';
import { openModal, closeModal } from '../../a11y.js';
import { esc } from '../../utils.js';

let unsubTrace = null;

// --- Initialize event listeners ---
export function initDiagPanel() {
  const btn = $('rigDiagBtn');
  if (btn) btn.addEventListener('click', openDiagPanel);

  const closeBtn = $('rigDiagClose');
  if (closeBtn) closeBtn.addEventListener('click', closeDiagPanel);

  const exportBtn = $('rigDiagExport');
  if (exportBtn) exportBtn.addEventListener('click', () => downloadSnapshot());

  const clearBtn = $('rigDiagClear');
  if (clearBtn) clearBtn.addEventListener('click', () => {
    getTraceBus().clear();
    const traceEl = $('rigDiagTrace');
    if (traceEl) traceEl.innerHTML = '';
  });

  // Close on overlay click
  const splash = $('rigDiagSplash');
  if (splash) {
    splash.addEventListener('click', (e) => {
      if (e.target === splash) closeDiagPanel();
    });
  }

  // Escape to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && splash && !splash.classList.contains('hidden')) {
      closeDiagPanel();
    }
  });
}

// --- Open the diagnostics panel ---
function openDiagPanel() {
  const splash = $('rigDiagSplash');
  if (!splash) return;
  openModal(splash);

  // Populate current state
  updateSummary();
  updateCounters();
  renderExistingEvents();

  // Subscribe to real-time trace events
  if (unsubTrace) unsubTrace();
  unsubTrace = getTraceBus().subscribe(appendTraceEntry);
}

// --- Close the diagnostics panel ---
function closeDiagPanel() {
  const splash = $('rigDiagSplash');
  if (splash) closeModal(splash);

  if (unsubTrace) {
    unsubTrace();
    unsubTrace = null;
  }
}

// --- Update connection summary ---
function updateSummary() {
  const el = $('rigDiagSummary');
  if (!el) return;

  const store = getRigStore();
  const state = store.get();

  const profile = localStorage.getItem('hamtab_radio_profile') || 'unknown';
  const protocol = localStorage.getItem('hamtab_radio_protocol') || 'unknown';
  const baud = localStorage.getItem('hamtab_radio_baud') || '?';

  const connected = state.connected ? 'Connected' : 'Disconnected';
  const freq = state.frequency ? `${(state.frequency / 1e6).toFixed(6)} MHz` : '---';
  const mode = state.mode || '---';

  el.innerHTML = `
    <div><strong>Status:</strong> ${esc(connected)} | <strong>Profile:</strong> ${esc(profile)} | <strong>Protocol:</strong> ${esc(protocol)} | <strong>Baud:</strong> ${esc(baud)}</div>
    <div><strong>Frequency:</strong> ${esc(freq)} | <strong>Mode:</strong> ${esc(mode)} | <strong>PTT:</strong> ${state.ptt ? 'TX' : 'RX'}</div>
  `;
}

// --- Update error counters ---
function updateCounters() {
  const el = $('rigDiagCounters');
  if (!el) return;

  const c = getTraceBus().getCounters();

  const items = [
    { label: 'Sent', val: c.commandsSent, cls: '' },
    { label: 'OK', val: c.responsesOk, cls: 'ok' },
    { label: 'Parse Err', val: c.parseErrors, cls: c.parseErrors > 0 ? 'error' : '' },
    { label: 'Timeouts', val: c.timeouts, cls: c.timeouts > 0 ? 'warn' : '' },
    { label: 'IO Err', val: c.ioErrors, cls: c.ioErrors > 0 ? 'error' : '' },
    { label: 'Dropped', val: c.queueDrops, cls: c.queueDrops > 0 ? 'warn' : '' },
  ];

  el.innerHTML = items.map(i => `
    <div class="rig-diag-counter">
      <span class="rig-diag-counter-val ${i.cls}">${i.val}</span>
      <span class="rig-diag-counter-label">${i.label}</span>
    </div>
  `).join('');
}

// --- Render existing buffered events ---
function renderExistingEvents() {
  const traceEl = $('rigDiagTrace');
  if (!traceEl) return;

  traceEl.innerHTML = '';
  const events = getTraceBus().getEvents();

  // Show last 200 to avoid overwhelming the DOM on open
  const recent = events.slice(-200);
  for (const ev of recent) {
    appendTraceEntry(ev, false);
  }

  // Scroll to bottom
  traceEl.scrollTop = traceEl.scrollHeight;
}

// --- Append a single trace entry to the log ---
function appendTraceEntry(entry, autoScroll = true) {
  const traceEl = $('rigDiagTrace');
  if (!traceEl) return;

  // Update counters on each event
  updateCounters();

  const time = new Date(entry.ts).toLocaleTimeString('en-US', { hour12: false, fractionalSecondDigits: 1 });
  const category = entry.category || '';
  const action = entry.action || '';

  // Build detail string
  let detail = '';
  if (entry.command) detail += entry.command;
  if (entry.encoded) detail += ` [${entry.encoded}]`;
  if (entry.raw) detail += ` → ${entry.raw}`;
  if (entry.eventType) detail += ` → ${entry.eventType}`;
  if (entry.value !== undefined) {
    const v = typeof entry.value === 'object' ? JSON.stringify(entry.value) : entry.value;
    detail += `=${v}`;
  }
  if (entry.elapsedMs !== undefined) detail += ` (${entry.elapsedMs}ms)`;
  if (entry.message) detail += ` ${entry.message}`;
  if (entry.queueSize !== undefined) detail += ` [q:${entry.queueSize}]`;

  const div = document.createElement('div');
  div.className = `rig-diag-trace-entry ${category}`;
  div.textContent = `${time} [${category}/${action}] ${detail}`;

  traceEl.appendChild(div);

  // Cap DOM entries
  while (traceEl.children.length > 500) {
    traceEl.removeChild(traceEl.firstChild);
  }

  // Auto-scroll
  const autoScrollCb = $('rigDiagAutoScroll');
  if (autoScroll && autoScrollCb && autoScrollCb.checked) {
    traceEl.scrollTop = traceEl.scrollHeight;
  }
}

// --- Show/hide the diagnostics button based on connection state ---
export function updateDiagButtonVisibility(connected) {
  const btn = $('rigDiagBtn');
  if (btn) btn.style.display = connected ? '' : 'none';
}
