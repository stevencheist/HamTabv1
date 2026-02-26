// --- On-Air Rig Control Widget ---
// Displays live rig state: frequency, mode, TX/RX, S-meter, SWR, power, RST.
// Connect/disconnect via WebSerial. All state from RigStateStore.

import { $ } from './dom.js';
import { isWidgetVisible, onWidgetHide } from './widgets.js';
import state from './state.js';
import {
  connectRig,
  disconnectRig,
  sendRigCommand,
  isRigConnected,
  getRigStore,
} from './cat/index.js';
import { getBandSegments, getBandEdges, getPositionInBand } from './cat/profiles/band-overlay-engine.js';

let unsubscribe = null;
let initialized = false;
let listenersAttached = false; // event listeners persist across show/hide — only attach once
let lastBandOverlay = ''; // track last rendered band to avoid thrashing

// --- Format frequency in Hz to standard ham display ---
// Examples: 14074000 → "14.074.000", 7074000 → "7.074.000", 146520000 → "146.520.000"
// Format: MHz.kHz.Hz with dots as group separators
function formatFrequency(hz) {
  if (!hz || hz <= 0) return '----.---';
  const mhz = Math.floor(hz / 1_000_000);
  const khz = String(Math.floor((hz % 1_000_000) / 1_000)).padStart(3, '0');
  const hzPart = String(hz % 1_000).padStart(3, '0');
  return `${mhz}.${khz}.${hzPart}`;
}

// --- S-units to RST readability (1-5 scale) ---
// S0-S1 → 1, S2-S3 → 2, S4-S5 → 3, S6-S7 → 4, S8-S9+ → 5
function sUnitsToReadability(sUnits) {
  if (sUnits <= 1) return 1;
  if (sUnits <= 3) return 2;
  if (sUnits <= 5) return 3;
  if (sUnits <= 7) return 4;
  return 5;
}

// --- Build RST string from signal ---
// R (readability 1-5), S (signal 1-9), T (tone, always 9 for SSB/CW)
function buildRST(sUnits) {
  const r = sUnitsToReadability(sUnits);
  const s = Math.min(9, Math.max(1, Math.round(sUnits)));
  return `${r}${s}9`;
}

// --- Confidence ring class from tuneConfidence ---
function confidenceClass(confidence) {
  switch (confidence) {
    case 'good': return 'rig-confidence-good';
    case 'caution': return 'rig-confidence-caution';
    case 'unsafe': return 'rig-confidence-unsafe';
    default: return '';
  }
}

// --- Render rig state into widget DOM ---
function render(state) {
  if (!isWidgetVisible('widget-on-air-rig')) return;

  const freqEl = $('rigFrequency');
  const modeEl = $('rigMode');
  const txEl = $('rigTxState');
  const sMeterEl = $('rigSMeter');
  const swrEl = $('rigSWR');
  const rstEl = $('rigRST');
  const powerEl = $('rigPower');
  const bandEl = $('rigBand');
  const statusEl = $('rigStatus');
  const connectBtn = $('rigConnectBtn');
  const confEl = $('rigConfidence');
  const lcdEl = $('rigLcd');

  if (!freqEl) return;

  // Frequency display with confidence ring
  freqEl.textContent = formatFrequency(state.frequency);
  if (confEl) {
    confEl.className = `rig-confidence ${state.ptt ? confidenceClass(state.tuneConfidence) : ''}`;
  }

  // Band indicator
  if (bandEl) {
    bandEl.textContent = state.band || '';
  }

  // Mode
  modeEl.textContent = state.mode || '---';

  // TX/RX state — toggles LCD color scheme
  if (state.ptt) {
    txEl.textContent = 'TX';
    txEl.classList.add('rig-tx-active');
    if (lcdEl) lcdEl.classList.add('rig-lcd-tx');
  } else {
    txEl.textContent = 'RX';
    txEl.classList.remove('rig-tx-active');
    if (lcdEl) lcdEl.classList.remove('rig-lcd-tx');
  }

  // RST badge
  if (rstEl) {
    if (state.signal > 0 && !state.ptt) {
      rstEl.textContent = `RST ${buildRST(state.sUnits)}`;
      rstEl.classList.remove('hidden');
    } else {
      rstEl.classList.add('hidden');
    }
  }

  // S-meter bar — scale matches labels: S1-S9 = first 71%, +20/+40 = rest
  // Raw 0-150 → S1-S9 (0-71%), raw 150-255 → S9+ (71-100%)
  let sMeterPct;
  if (state.signal <= 150) {
    sMeterPct = (state.signal / 150) * 71;  // S1-S9 range
  } else {
    sMeterPct = 71 + ((state.signal - 150) / 105) * 29; // S9+ range
  }
  sMeterPct = Math.min(100, Math.max(0, sMeterPct));
  sMeterEl.style.width = sMeterPct + '%';

  // Color: green up to S9, amber above
  if (state.signal > 150) {
    sMeterEl.classList.add('rig-meter-over');
  } else {
    sMeterEl.classList.remove('rig-meter-over');
  }

  // SWR display
  if (state.swr > 0) {
    swrEl.textContent = `SWR ${state.swr.toFixed(1)}`;
    if (state.swr > 3.0) {
      swrEl.classList.add('rig-swr-danger');
      swrEl.classList.remove('rig-swr-caution');
    } else if (state.swr > 1.5) {
      swrEl.classList.remove('rig-swr-danger');
      swrEl.classList.add('rig-swr-caution');
    } else {
      swrEl.classList.remove('rig-swr-danger', 'rig-swr-caution');
    }
  } else {
    swrEl.textContent = 'SWR ---';
    swrEl.classList.remove('rig-swr-danger', 'rig-swr-caution');
  }

  // TX Power display
  if (powerEl) {
    if (state.ptt && state.powerMeter > 0) {
      powerEl.textContent = `${Math.round(state.powerMeter)}W`;
      powerEl.classList.remove('hidden');
    } else if (state.rfPower > 0) {
      powerEl.textContent = `Set: ${state.rfPower}W`;
      powerEl.classList.remove('hidden');
    } else {
      powerEl.classList.add('hidden');
    }
  }

  // Band overlay — show CW/DIGI/PHONE zones with position indicator
  renderBandOverlay(state);

  // Power slider — show when connected and not in TX
  const powerRow = $('rigPowerRow');
  const powerSlider = $('rigPowerSlider');
  const powerValue = $('rigPowerValue');
  if (powerRow && state.connected) {
    powerRow.classList.remove('hidden');
    if (powerValue && state.rfPower > 0) {
      powerValue.textContent = `${state.rfPower}W`;
    }
    // Sync slider to rig power (don't fight user drag)
    if (powerSlider && !powerSlider.matches(':active') && state.rfPower > 0) {
      powerSlider.value = state.rfPower;
    }
  } else if (powerRow) {
    powerRow.classList.add('hidden');
  }

  // TX lock indicator
  if (state.txLocked && state.txLockReason) {
    statusEl.textContent = state.txLockReason;
    statusEl.classList.add('rig-status-warn');
  } else {
    statusEl.classList.remove('rig-status-warn');
  }

  // Connection status + demo badge
  if (state.connected) {
    if (!state.txLocked) {
      statusEl.textContent = state.demo
        ? 'DEMO MODE'
        : state.radioId ? `Connected (${state.radioId})` : 'Connected';
    }
    connectBtn.textContent = 'Disconnect';
  } else {
    statusEl.textContent = '';
    connectBtn.textContent = 'Connect';
  }

  // Demo badge in header
  const header = document.querySelector('#widget-on-air-rig .widget-header');
  if (header) {
    let badge = header.querySelector('.rig-demo-badge');
    if (state.demo && state.connected) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'rig-demo-badge';
        badge.textContent = 'DEMO';
        header.insertBefore(badge, header.querySelector('.widget-help-btn'));
      }
    } else if (badge) {
      badge.remove();
    }
  }
}

// --- Band overlay: shows CW/DIGI/PHONE zones for current band ---
function renderBandOverlay(state) {
  const container = $('rigBandOverlay');
  if (!container) return;

  if (!state.band || !state.connected) {
    container.innerHTML = '';
    lastBandOverlay = '';
    return;
  }

  // Only rebuild if band changed
  if (state.band !== lastBandOverlay) {
    lastBandOverlay = state.band;
    const segments = getBandSegments(state.band);
    const edges = getBandEdges(state.band);
    if (!segments.length || !edges) {
      container.innerHTML = '';
      return;
    }

    const totalSpan = edges.max - edges.min;
    let html = '';
    for (const seg of segments) {
      const left = ((seg.min - edges.min) / totalSpan) * 100;
      const width = ((seg.max - seg.min) / totalSpan) * 100;
      html += `<div class="rig-overlay-seg rig-overlay-${seg.color}" style="left:${left.toFixed(1)}%;width:${width.toFixed(1)}%"><span>${seg.zone}</span></div>`;
    }
    html += '<div class="rig-overlay-needle" id="rigOverlayNeedle"></div>';
    container.innerHTML = html;
  }

  // Update needle position
  const needle = document.getElementById('rigOverlayNeedle');
  if (needle) {
    const pos = getPositionInBand(state.frequency, state.band);
    needle.style.left = (pos * 100).toFixed(1) + '%';
  }
}

// --- Populate profile dropdown with config-aware options ---
// The rig widget dropdown shows a summary of what's configured in the config modal.
// Detailed settings (protocol, serial, etc.) are in the config modal Radio tab.
function populateProfiles() {
  const select = $('rigProfileSelect');
  if (!select) return;

  const existing = select.querySelectorAll('option[data-profile]');
  if (existing.length > 0) return;

  // Option: use configured settings (from config modal Radio tab)
  const cfgOpt = document.createElement('option');
  cfgOpt.value = 'configured';
  cfgOpt.textContent = 'Use Radio Settings';
  cfgOpt.dataset.profile = 'configured';
  select.appendChild(cfgOpt);

  // Option: demo mode
  const demoOpt = document.createElement('option');
  demoOpt.value = 'demo';
  demoOpt.textContent = 'Demo Mode';
  demoOpt.dataset.profile = 'demo';
  select.appendChild(demoOpt);

  // Set default based on configured connection type
  select.value = state.radioConnectionType === 'demo' ? 'demo' : 'configured';
}

// --- Build common safety/serial config from state ---
function buildConnectConfig() {
  return {
    // Serial settings
    baudRate: state.radioBaudRate,
    dataBits: state.radioDataBits,
    stopBits: state.radioStopBits,
    parity: state.radioParity,
    flowControl: state.radioFlowControl,
    // Control
    pttMethod: state.radioPttMethod,
    pollingInterval: state.radioPollingInterval,
    civAddress: state.radioCivAddress,
    // Safety
    safetyTxIntent: state.radioSafetyTxIntent,
    safetyBandLockout: state.radioSafetyBandLockout,
    safetyAutoPower: state.radioSafetyAutoPower,
    swrLimit: state.radioSwrLimit,
    safePower: state.radioSafePower,
  };
}

// --- Get a port (browser picker or pre-authorized) ---
async function acquirePort(statusEl) {
  if (state.radioPortMode === 'manual') {
    // Use a previously authorized port
    if (!navigator.serial || !navigator.serial.getPorts) return null;
    const ports = await navigator.serial.getPorts();
    if (ports.length === 0) {
      statusEl.textContent = 'No authorized ports — change to Auto in Radio settings';
      return null;
    }
    // Use first port (or specific index if port list was used)
    return ports[0];
  }

  // Auto mode: browser picker
  statusEl.textContent = 'Select serial port...';
  try {
    return await navigator.serial.requestPort();
  } catch (err) {
    if (err.name === 'NotFoundError') {
      statusEl.textContent = 'Cancelled';
      return null;
    }
    throw err;
  }
}

// --- Connect/disconnect handler ---
async function handleConnectClick() {
  const connectBtn = $('rigConnectBtn');
  const statusEl = $('rigStatus');
  const select = $('rigProfileSelect');

  if (isRigConnected()) {
    connectBtn.disabled = true;
    statusEl.textContent = 'Disconnecting...';
    try {
      await disconnectRig();
    } catch (err) {
      console.error('[rig] Disconnect error:', err);
      statusEl.textContent = 'Disconnect error';
    }
    connectBtn.disabled = false;
    return;
  }

  connectBtn.disabled = true;

  // Determine mode from widget dropdown or state
  const widgetSelection = select ? select.value : '';
  const isDemo = widgetSelection === 'demo' || state.radioConnectionType === 'demo';

  try {
    if (isDemo) {
      // --- Demo mode ---
      statusEl.textContent = 'Connecting (demo)...';
      const success = await connectRig({
        profileId: 'demo',
        demo: true,
        propagation: state.radioDemoPropagation,
        latitude: state.myLat,
        longitude: state.myLon,
      });
      if (!success) statusEl.textContent = 'Cancelled';

    } else {
      // --- Real radio: protocol-family-first connect ---
      const config = buildConnectConfig();
      const protocolFamily = state.radioProtocolFamily;
      const modelPreset = state.radioModelPreset;
      const isAutoProtocol = protocolFamily === 'auto' && !modelPreset;

      // Acquire serial port
      const port = await acquirePort(statusEl);
      if (!port) {
        connectBtn.disabled = false;
        return;
      }

      if (isAutoProtocol) {
        // Auto-detect: probe port to identify protocol + radio
        statusEl.textContent = 'Detecting radio...';
        const success = await connectRig({
          ...config,
          autoDetect: true,
          existingPort: port,
          onDetectProgress: (info) => {
            statusEl.textContent = `Probing ${info.step}/${info.total}: ${info.trying}`;
          },
        });
        if (!success) statusEl.textContent = 'No radio detected';

      } else if (modelPreset) {
        // Specific model preset — use profileId for driver lookup
        statusEl.textContent = 'Connecting...';
        const success = await connectRig({
          ...config,
          profileId: modelPreset,
          existingPort: port,
        });
        if (!success) statusEl.textContent = 'Connection failed';

      } else {
        // Protocol family set, no specific model — connect with protocol family + serial overrides
        statusEl.textContent = 'Connecting...';
        const success = await connectRig({
          ...config,
          protocolFamily,
          existingPort: port,
        });
        if (!success) statusEl.textContent = 'Connection failed';
      }
    }
  } catch (err) {
    console.error('[rig] Connect error:', err);
    statusEl.textContent = `Error: ${err.message}`;
  }

  connectBtn.disabled = false;
}

// --- Initialize widget (idempotent — safe to call multiple times) ---
export function initOnAirRig() {
  if (initialized) return;
  if (!isWidgetVisible('widget-on-air-rig')) return;

  const connectBtn = $('rigConnectBtn');
  if (!connectBtn) return;

  // Attach DOM listeners once — they persist across show/hide cycles
  // (DOM elements stay in the page, just hidden via display:none)
  if (!listenersAttached) {
    populateProfiles();
    connectBtn.addEventListener('click', handleConnectClick);

    // Power slider
    const powerSlider = $('rigPowerSlider');
    if (powerSlider) {
      powerSlider.addEventListener('input', () => {
        const val = parseInt(powerSlider.value, 10);
        const powerValue = $('rigPowerValue');
        if (powerValue) powerValue.textContent = `${val}W`;
      });
      powerSlider.addEventListener('change', () => {
        const val = parseInt(powerSlider.value, 10);
        if (isRigConnected()) {
          sendRigCommand('setRFPower', val, 1);
        }
      });
    }
    listenersAttached = true;
  }

  // Subscribe to rig state — this is the active part we start/stop
  const store = getRigStore();
  unsubscribe = store.subscribe(render);
  initialized = true;
}

// --- Tear down widget: disconnect rig, unsubscribe, stop all CAT activity ---
export async function destroyOnAirRig() {
  if (!initialized) return;

  // Disconnect rig if connected (stops polling, safety modules, propagation engine)
  if (isRigConnected()) {
    try {
      await disconnectRig();
    } catch (err) {
      console.error('[rig] Disconnect on destroy:', err);
    }
  }

  // Unsubscribe from store
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }

  lastBandOverlay = '';
  initialized = false;
}

// Register close-button callback so hiding the widget via × also tears down CAT
onWidgetHide('widget-on-air-rig', destroyOnAirRig);
