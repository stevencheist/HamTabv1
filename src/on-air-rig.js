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
import { BAND_SEGMENTS, getBandSegments, getBandEdges, getPositionInBand } from './cat/profiles/band-overlay-engine.js';
import { startScope, stopScope } from './scope/scope-renderer.js';

let unsubscribe = null;
let initialized = false;
let listenersAttached = false; // event listeners persist across show/hide — only attach once

// --- Band/Mode selector data ---

const BAND_IDS = ['160m', '80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m', '6m'];

// User-facing modes → CAT mode strings
const USER_MODES = [
  { label: 'LSB',  cat: 'LSB' },
  { label: 'USB',  cat: 'USB' },
  { label: 'CW',   cat: 'CW-U' },
  { label: 'AM',   cat: 'AM' },
  { label: 'FM',   cat: 'FM' },
  { label: 'DATA', cat: 'DATA-U' },
];

// Correct SSB sideband per band (ham convention)
// 160/80/40 → LSB, 60m → USB (by rule), 20m+ → USB, 30m → no SSB
const BAND_SIDEBAND = {
  '160m': 'LSB', '80m': 'LSB', '40m': 'LSB',
  '30m': null,   // CW/Data only — no SSB voice
  '20m': 'USB',  '17m': 'USB', '15m': 'USB',
  '12m': 'USB',  '10m': 'USB', '6m': 'USB',
};

// FT8 dial frequencies per band (Hz) — used for DATA mode defaults
const FT8_FREQUENCIES = {
  '160m': 1_840_000,  '80m': 3_573_000,  '40m': 7_074_000,  '30m': 10_136_000,
  '20m': 14_074_000,  '17m': 18_100_000, '15m': 21_074_000, '12m': 24_915_000,
  '10m': 28_074_000,  '6m': 50_313_000,
};

// --- Compute default frequency for a band+mode combo ---
// Uses BAND_SEGMENTS zones to land in the right part of the band.
function getDefaultFrequency(bandId, userMode) {
  const segments = BAND_SEGMENTS[bandId];
  if (!segments || segments.length === 0) return null;

  // Find zones by type
  const cwZone = segments.find(s => s.zone === 'CW');
  const dataZone = segments.find(s => s.zone === 'DATA');
  const phoneZone = segments.find(s => s.zone === 'PHONE');

  if (userMode === 'CW') {
    // CW zone midpoint, offset +25kHz into the zone
    if (cwZone) return cwZone.min + 25_000;
    return segments[0].min + 25_000;
  }

  if (userMode === 'DATA') {
    // Prefer known FT8 frequency, else DATA zone midpoint
    const ft8 = FT8_FREQUENCIES[bandId];
    if (ft8) return ft8;
    if (dataZone) return Math.round((dataZone.min + dataZone.max) / 2);
    return segments[0].min + 25_000;
  }

  // SSB/AM/FM → PHONE zone
  if (phoneZone) {
    return Math.round((phoneZone.min + phoneZone.max) / 2);
  }

  // 30m exception: no phone zone — fall back to CW zone midpoint
  if (cwZone) {
    return Math.round((cwZone.min + cwZone.max) / 2);
  }

  return Math.round((segments[0].min + segments[segments.length - 1].max) / 2);
}

// --- Map CAT mode string back to user-facing label ---
function catModeToUserLabel(catMode) {
  if (!catMode) return '';
  const upper = catMode.toUpperCase();
  if (upper === 'CW' || upper === 'CW-U' || upper === 'CW-L' || upper === 'CW-R') return 'CW';
  if (upper === 'LSB') return 'LSB';
  if (upper === 'USB') return 'USB';
  if (upper === 'AM') return 'AM';
  if (upper === 'FM' || upper === 'FM-N') return 'FM';
  if (upper.startsWith('DATA') || upper.startsWith('DIG') || upper === 'PKT-U' || upper === 'PKT-L'
    || upper === 'RTTY' || upper === 'RTTY-R' || upper === 'PSK') return 'DATA';
  // SSB without explicit sideband — guess from common usage
  if (upper === 'SSB') return 'USB';
  return '';
}

// --- Get the CAT mode string for a user selection + band ---
// For LSB/USB: auto-selects correct sideband based on band convention.
function userModeToCat(userMode, bandId) {
  const entry = USER_MODES.find(m => m.label === userMode);
  if (!entry) return 'USB';

  // SSB sideband: use band convention (160/80/40 → LSB, 20m+ → USB)
  if (userMode === 'LSB' || userMode === 'USB') {
    const correct = BAND_SIDEBAND[bandId];
    return correct || entry.cat; // fall back to user pick if band has no SSB
  }

  return entry.cat;
}

// --- Populate band quick-tune buttons ---
function populateBandButtons() {
  const container = $('rigBandButtons');
  if (!container || container.children.length > 0) return;

  for (const bandId of BAND_IDS) {
    const btn = document.createElement('button');
    btn.className = 'rig-band-btn';
    btn.textContent = bandId;
    btn.dataset.band = bandId;
    btn.addEventListener('click', () => onBandButtonClick(bandId));
    container.appendChild(btn);
  }
}

// --- Band quick-tune button click handler ---
function onBandButtonClick(bandId) {
  if (!isRigConnected()) return;

  // Get current mode from rig state, default to USB
  const store = getRigStore();
  const rigState = store.getState();
  let userMode = catModeToUserLabel(rigState.mode) || 'USB';

  // Auto-correct SSB sideband for target band
  if (userMode === 'LSB' || userMode === 'USB') {
    const correct = BAND_SIDEBAND[bandId];
    if (correct) userMode = correct;
  }

  const targetHz = getDefaultFrequency(bandId, userMode);
  if (!targetHz) return;

  const catMode = userModeToCat(userMode, bandId);
  sendRigCommand('setFrequency', targetHz, 1);
  sendRigCommand('setMode', catMode, 1);
}

// --- Populate band + mode dropdowns ---
function populateBandMode() {
  const bandSelect = $('rigBandSelect');
  const modeSelect = $('rigModeSelect');
  if (!bandSelect || !modeSelect) return;

  // Populate bands (skip if already populated)
  if (bandSelect.options.length <= 1) {
    for (const bandId of BAND_IDS) {
      const opt = document.createElement('option');
      opt.value = bandId;
      opt.textContent = bandId;
      bandSelect.appendChild(opt);
    }
  }

  // Populate modes (skip if already populated)
  if (modeSelect.options.length <= 1) {
    for (const mode of USER_MODES) {
      const opt = document.createElement('option');
      opt.value = mode.label;
      opt.textContent = mode.label;
      modeSelect.appendChild(opt);
    }
  }
}

// --- Handle band/mode selection changes ---
function onBandModeChange() {
  const bandSelect = $('rigBandSelect');
  const modeSelect = $('rigModeSelect');
  if (!bandSelect || !modeSelect) return;
  if (!isRigConnected()) return;

  const bandId = bandSelect.value;
  let userMode = modeSelect.value;
  if (!bandId || !userMode) return;

  // Auto-correct sideband when band changes
  // If user has LSB or USB selected, switch to the correct one for this band
  if (userMode === 'LSB' || userMode === 'USB') {
    const correct = BAND_SIDEBAND[bandId];
    if (correct && correct !== userMode) {
      userMode = correct;
      modeSelect.value = correct;
    }
  }

  const targetHz = getDefaultFrequency(bandId, userMode);
  if (!targetHz) return;

  const catMode = userModeToCat(userMode, bandId);

  // Send frequency first, then mode
  sendRigCommand('setFrequency', targetHz, 1);
  sendRigCommand('setMode', catMode, 1);
}
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

  // Band quick-tune button active state
  const bandBtns = document.querySelectorAll('#rigBandButtons .rig-band-btn');
  for (const btn of bandBtns) {
    btn.classList.toggle('active', btn.dataset.band === state.band);
  }

  // Mode
  modeEl.textContent = state.mode || '---';

  // TX/RX state — toggles LCD color scheme (force RX for SDR)
  if (state.rxOnly) {
    txEl.textContent = 'RX';
    txEl.classList.remove('rig-tx-active');
    if (lcdEl) lcdEl.classList.remove('rig-lcd-tx');
  } else if (state.ptt) {
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

  // SWR display — hide for RX-only or if radio lacks meter_swr capability
  const caps = state.capabilities || [];
  const hasSwr = caps.includes('meter_swr');
  if (swrEl) {
    if (state.rxOnly || !hasSwr) {
      swrEl.style.display = 'none';
    } else {
      swrEl.style.display = '';
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
    }
  }

  // TX Power display — hide for RX-only or if radio lacks meter_power capability
  if (powerEl) {
    if (state.rxOnly || !caps.includes('meter_power')) {
      powerEl.style.display = 'none';
    } else {
      powerEl.style.display = '';
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
  }

  // Band overlay — show CW/DIGI/PHONE zones with position indicator
  renderBandOverlay(state);

  // Band + Mode selectors
  const bandModeRow = $('rigBandModeRow');
  const bandSelect = $('rigBandSelect');
  const modeSelect = $('rigModeSelect');
  if (bandModeRow) {
    if (state.connected) {
      bandModeRow.classList.remove('hidden');
      if (bandSelect && !bandSelect.matches(':focus') && state.band) {
        bandSelect.value = state.band;
      }
      if (modeSelect && !modeSelect.matches(':focus') && state.mode) {
        modeSelect.value = catModeToUserLabel(state.mode);
      }
    } else {
      bandModeRow.classList.add('hidden');
    }
  }

  // Power slider — show when connected and radio supports rf_power
  const powerRow = $('rigPowerRow');
  const powerSlider = $('rigPowerSlider');
  const powerValue = $('rigPowerValue');
  if (powerRow && state.connected && !state.rxOnly && caps.includes('rf_power')) {
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

  // Connection status + demo/SDR badge
  if (state.connected) {
    if (!state.txLocked) {
      if (state.sourceType === 'sdr') {
        statusEl.textContent = `KiwiSDR: ${state.remoteName || 'connected'}`;
      } else if (state.demo) {
        statusEl.textContent = 'DEMO MODE';
      } else {
        statusEl.textContent = state.radioId ? `Connected (${state.radioId})` : 'Connected';
      }
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

    // SDR RX ONLY badge
    let sdrBadge = header.querySelector('.rig-sdr-badge');
    if (state.rxOnly && state.connected) {
      if (!sdrBadge) {
        sdrBadge = document.createElement('span');
        sdrBadge.className = 'rig-sdr-badge';
        sdrBadge.textContent = 'RX ONLY';
        header.insertBefore(sdrBadge, header.querySelector('.widget-help-btn'));
      }
    } else if (sdrBadge) {
      sdrBadge.remove();
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

  // Option: KiwiSDR (online RX)
  const sdrOpt = document.createElement('option');
  sdrOpt.value = 'kiwisdr';
  sdrOpt.textContent = 'KiwiSDR (Online RX)';
  sdrOpt.dataset.profile = 'kiwisdr';
  select.appendChild(sdrOpt);

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
    stopScope();
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
    if (widgetSelection === 'kiwisdr') {
      // --- KiwiSDR online receiver ---
      const urlInput = $('rigSdrUrl');
      const rawUrl = urlInput ? urlInput.value.trim() : '';
      if (!rawUrl) {
        statusEl.textContent = 'Enter a KiwiSDR host address';
        connectBtn.disabled = false;
        return;
      }

      const parsed = parseSdrUrl(rawUrl);
      statusEl.textContent = `Connecting to ${parsed.host}...`;

      const success = await connectRig({
        sdrType: 'kiwisdr',
        sdrHost: parsed.host,
        sdrPort: parsed.port,
        sdrPassword: state.radioSdrPassword || '',
        pollingInterval: 1000,
      });

      if (success) {
        localStorage.setItem('hamtab_radio_sdr_url', rawUrl);
      } else {
        statusEl.textContent = 'KiwiSDR connection failed';
      }

    } else if (isDemo) {
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

  // Start scope if connection succeeded
  if (isRigConnected()) {
    if (isDemo) {
      // Demo mode — always start synthetic scope
      startScope({ longitude: state.myLon || 0, useAudio: false });
    } else if (state.radioAudioScopeEnabled) {
      // Real radio + audio enabled — start audio scope, hide on failure
      startScope({
        longitude: state.myLon || 0,
        useAudio: true,
        hideOnAudioFail: true,
      });
    }
    // Real radio + audio not enabled → no scope at all
  }

  connectBtn.disabled = false;
}

// --- Parse SDR URL input ---
// Strips http(s):// prefix, splits host:port, defaults port 8073.
function parseSdrUrl(input) {
  let cleaned = input.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const parts = cleaned.split(':');
  return {
    host: parts[0],
    port: parts[1] ? parseInt(parts[1], 10) : 8073,
  };
}

// --- Toggle SDR URL row visibility based on profile selection ---
function updateSdrUrlVisibility() {
  const select = $('rigProfileSelect');
  const sdrRow = $('rigSdrUrlRow');
  if (!select || !sdrRow) return;
  sdrRow.style.display = select.value === 'kiwisdr' ? '' : 'none';
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
    populateBandMode();
    populateBandButtons();
    connectBtn.addEventListener('click', handleConnectClick);

    // SDR URL row: toggle visibility on profile change, restore saved URL
    const rigSelect = $('rigProfileSelect');
    if (rigSelect) {
      rigSelect.addEventListener('change', updateSdrUrlVisibility);
    }
    const sdrUrlInput = $('rigSdrUrl');
    if (sdrUrlInput && state.radioSdrUrl) {
      sdrUrlInput.value = state.radioSdrUrl;
    }

    // Band + Mode selectors
    const bandSelect = $('rigBandSelect');
    const modeSelect = $('rigModeSelect');
    if (bandSelect) bandSelect.addEventListener('change', onBandModeChange);
    if (modeSelect) modeSelect.addEventListener('change', onBandModeChange);

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

  // Stop scope before disconnecting
  stopScope();

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
