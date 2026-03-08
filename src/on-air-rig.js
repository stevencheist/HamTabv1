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
  getSdrAudioPlayer,
} from './cat/index.js';
import { BAND_SEGMENTS, getBandSegments, getBandEdges, getPositionInBand } from './cat/profiles/band-overlay-engine.js';
import { startScope, stopScope } from './scope/scope-renderer.js';

let unsubscribe = null;
let initialized = false;
let listenersAttached = false; // event listeners persist across show/hide — only attach once

// --- Cached DOM refs (populated once in initOnAirRig) ---
// Avoids repeated $() lookups on every 200-500ms render cycle
const dom = {};

// --- Last rendered values for diff-based updates ---
// Only write to DOM when a value actually changed
let prev = {};

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

// FT4 dial frequencies per band (Hz) — WSJT-X conventional frequencies
const FT4_FREQUENCIES = {
  '80m': 3_575_000,  '40m': 7_047_500,  '30m': 10_140_000,
  '20m': 14_080_000, '17m': 18_104_000, '15m': 21_140_000, '12m': 24_919_000,
  '10m': 28_180_000, '6m': 50_318_000,
};

// --- Digital Setup frequency lookup ---
// Returns the conventional dial frequency (Hz) for a digital mode + band combo
function getDigitalFrequency(mode, bandId) {
  if (mode === 'FT8') return FT8_FREQUENCIES[bandId] || null;
  if (mode === 'FT4') return FT4_FREQUENCIES[bandId] || null;
  return null; // Custom — user must set frequency manually
}

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
  const rigState = store.get();
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

// --- Cache DOM element references (called once from initOnAirRig) ---
function cacheDomRefs() {
  dom.freq = $('rigFrequency');
  dom.mode = $('rigMode');
  dom.tx = $('rigTxState');
  dom.sMeter = $('rigSMeter');
  dom.swr = $('rigSWR');
  dom.rst = $('rigRST');
  dom.power = $('rigPower');
  dom.band = $('rigBand');
  dom.status = $('rigStatus');
  dom.connectBtn = $('rigConnectBtn');
  dom.conf = $('rigConfidence');
  dom.lcd = $('rigLcd');
  dom.vfoBRow = $('rigVfoBRow');
  dom.freqB = $('rigFrequencyB');
  dom.swapBtn = $('rigVfoSwapBtn');
  dom.bandModeRow = $('rigBandModeRow');
  dom.bandSelect = $('rigBandSelect');
  dom.modeSelect = $('rigModeSelect');
  dom.powerRow = $('rigPowerRow');
  dom.powerSlider = $('rigPowerSlider');
  dom.powerValue = $('rigPowerValue');
  dom.powerOffBtn = $('rigPowerOffBtn');
  dom.muteBtn = $('rigSdrMute');
  dom.bandOverlay = $('rigBandOverlay');
  // Band buttons: cache once, avoids querySelectorAll each render
  const container = $('rigBandButtons');
  dom.bandBtns = container ? Array.from(container.querySelectorAll('.rig-band-btn')) : [];
}

// --- Render rig state into widget DOM ---
function render(state) {
  if (!isWidgetVisible('widget-on-air-rig')) return;
  if (!dom.freq) return;

  // Frequency display with confidence ring — diff: only update if changed
  const freqText = formatFrequency(state.frequency);
  if (freqText !== prev.freqText) {
    console.warn('[rig-ui] freq update:', state.frequency, '→', freqText, 'dom.freq=', !!dom.freq);
    dom.freq.textContent = freqText;
    prev.freqText = freqText;
  }
  if (dom.conf) {
    const confClass = `rig-confidence ${state.ptt ? confidenceClass(state.tuneConfidence) : ''}`;
    if (confClass !== prev.confClass) {
      dom.conf.className = confClass;
      prev.confClass = confClass;
    }
  }

  // VFO B — show only when radio provides a secondary frequency
  if (dom.vfoBRow && dom.freqB) {
    if (state.frequencyB > 0) {
      const freqBText = formatFrequency(state.frequencyB);
      if (freqBText !== prev.freqBText) {
        dom.freqB.textContent = freqBText;
        prev.freqBText = freqBText;
      }
      if (prev.vfoBVisible !== true) { dom.vfoBRow.style.display = ''; prev.vfoBVisible = true; }
      if (dom.swapBtn) {
        const hasSwap = (state.capabilities || []).includes('vfo_swap');
        dom.swapBtn.style.display = hasSwap ? '' : 'none';
      }
    } else {
      if (prev.vfoBVisible !== false) { dom.vfoBRow.style.display = 'none'; prev.vfoBVisible = false; }
    }
  }

  // Band indicator
  if (dom.band && state.band !== prev.band) {
    dom.band.textContent = state.band || '';
    // Band quick-tune button active state — only update when band changes
    for (const btn of dom.bandBtns) {
      btn.classList.toggle('active', btn.dataset.band === state.band);
    }
    prev.band = state.band;
  }

  // Mode — diff update
  const modeText = state.mode || '---';
  if (modeText !== prev.modeText) {
    dom.mode.textContent = modeText;
    prev.modeText = modeText;
  }

  // TX/RX state — diff: only toggle classes when ptt/rxOnly changes
  const txKey = state.rxOnly ? 'rx-only' : state.ptt ? 'tx' : 'rx';
  if (txKey !== prev.txKey) {
    if (state.rxOnly || !state.ptt) {
      dom.tx.textContent = 'RX';
      dom.tx.classList.remove('rig-tx-active');
      if (dom.lcd) dom.lcd.classList.remove('rig-lcd-tx');
    } else {
      dom.tx.textContent = 'TX';
      dom.tx.classList.add('rig-tx-active');
      if (dom.lcd) dom.lcd.classList.add('rig-lcd-tx');
    }
    prev.txKey = txKey;
  }

  // RST badge — diff update
  if (dom.rst) {
    const rstVisible = state.signal > 0 && !state.ptt;
    const rstText = rstVisible ? `RST ${buildRST(state.sUnits)}` : '';
    if (rstText !== prev.rstText) {
      if (rstVisible) {
        dom.rst.textContent = rstText;
        dom.rst.classList.remove('hidden');
      } else {
        dom.rst.classList.add('hidden');
      }
      prev.rstText = rstText;
    }
  }

  // S-meter bar — throttle to rAF since this updates at meter cadence (200ms)
  const rawSignal = state.signal;
  if (rawSignal !== prev.rawSignal) {
    prev.rawSignal = rawSignal;
    if (!prev.sMeterRafPending) {
      prev.sMeterRafPending = true;
      requestAnimationFrame(() => {
        prev.sMeterRafPending = false;
        let pct;
        if (rawSignal <= 150) {
          pct = (rawSignal / 150) * 71;
        } else {
          pct = 71 + ((rawSignal - 150) / 105) * 29;
        }
        pct = Math.min(100, Math.max(0, pct));
        dom.sMeter.style.width = pct + '%';
        if (rawSignal > 150) {
          dom.sMeter.classList.add('rig-meter-over');
        } else {
          dom.sMeter.classList.remove('rig-meter-over');
        }
      });
    }
  }

  // SWR display — only show during TX, hide for RX-only or if radio lacks meter_swr
  const caps = state.capabilities || [];
  const hasSwr = caps.includes('meter_swr');
  if (dom.swr) {
    const swrVisible = !state.rxOnly && hasSwr && state.ptt;
    if (swrVisible !== prev.swrVisible) {
      dom.swr.style.display = swrVisible ? '' : 'none';
      if (!swrVisible) dom.swr.classList.remove('rig-swr-danger', 'rig-swr-caution');
      prev.swrVisible = swrVisible;
    }
    if (swrVisible) {
      const swrRounded = state.swr > 0 && state.swr < 20 ? state.swr.toFixed(1) : null;
      if (swrRounded !== prev.swrRounded) {
        if (swrRounded) {
          const swrLabel = state.swr > 3.0 ? ' DANGER' : state.swr > 1.5 ? ' CAUTION' : '';
          dom.swr.textContent = `SWR ${swrRounded}:1${swrLabel}`;
          dom.swr.classList.toggle('rig-swr-danger', state.swr > 3.0);
          dom.swr.classList.toggle('rig-swr-caution', state.swr > 1.5 && state.swr <= 3.0);
        } else {
          dom.swr.textContent = 'SWR ---';
          dom.swr.classList.remove('rig-swr-danger', 'rig-swr-caution');
        }
        prev.swrRounded = swrRounded;
      }
    }
  }

  // TX Power display — hide for RX-only or if radio lacks meter_power capability
  if (dom.power) {
    const hasPowerMeter = caps.includes('meter_power');
    if (state.rxOnly || !hasPowerMeter) {
      if (prev.powerDisplay !== 'none') { dom.power.style.display = 'none'; prev.powerDisplay = 'none'; }
    } else {
      if (prev.powerDisplay !== '') { dom.power.style.display = ''; prev.powerDisplay = ''; }
      let powerText;
      if (state.ptt && state.powerMeter > 0) {
        powerText = `${Math.round(state.powerMeter)}W`;
      } else if (state.rfPower > 0) {
        powerText = `Set: ${state.rfPower}W`;
      } else {
        powerText = null;
      }
      if (powerText !== prev.powerText) {
        if (powerText) {
          dom.power.textContent = powerText;
          dom.power.classList.remove('hidden');
        } else {
          dom.power.classList.add('hidden');
        }
        prev.powerText = powerText;
      }
    }
  }

  // Band overlay — show CW/DIGI/PHONE zones with position indicator
  renderBandOverlay(state);

  // Band + Mode selectors
  if (dom.bandModeRow) {
    if (state.connected) {
      dom.bandModeRow.classList.remove('hidden');
      if (dom.bandSelect && !dom.bandSelect.matches(':focus') && state.band) {
        dom.bandSelect.value = state.band;
      }
      if (dom.modeSelect && !dom.modeSelect.matches(':focus') && state.mode) {
        dom.modeSelect.value = catModeToUserLabel(state.mode);
      }
    } else {
      dom.bandModeRow.classList.add('hidden');
    }
  }

  // Power slider — show when connected and radio supports rf_power
  if (dom.powerRow && state.connected && !state.rxOnly && caps.includes('rf_power')) {
    dom.powerRow.classList.remove('hidden');
    if (dom.powerValue && state.rfPower > 0) {
      dom.powerValue.textContent = `${state.rfPower}W`;
    }
    // Sync slider to rig power (don't fight user drag)
    if (dom.powerSlider && !dom.powerSlider.matches(':active') && state.rfPower > 0) {
      dom.powerSlider.value = state.rfPower;
    }
  } else if (dom.powerRow) {
    dom.powerRow.classList.add('hidden');
  }

  // TX lock indicator
  if (state.txLocked && state.txLockReason) {
    dom.status.textContent = state.txLockReason;
    dom.status.classList.add('rig-status-warn');
  } else {
    dom.status.classList.remove('rig-status-warn');
  }

  // Connection status + demo/SDR badge
  if (state.connected) {
    if (!state.txLocked) {
      if (state.sourceType === 'sdr') {
        dom.status.textContent = `KiwiSDR: ${state.remoteName || 'connected'}`;
      } else if (state.demo) {
        dom.status.textContent = 'DEMO MODE';
      } else {
        dom.status.textContent = state.radioId ? `Connected (${state.radioId})` : 'Connected';
      }
    }
    dom.connectBtn.textContent = 'Disconnect';
  } else {
    dom.status.textContent = '';
    dom.connectBtn.textContent = 'Connect';
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

  // Power off button — show when connected to a real radio with power_off capability
  if (dom.powerOffBtn) {
    const hasPowerOff = state.connected && !state.demo && !state.rxOnly
      && (state.capabilities || []).includes('power_off');
    dom.powerOffBtn.style.display = hasPowerOff ? '' : 'none';
  }

  // SDR mute button — show only when KiwiSDR is connected
  if (dom.muteBtn) {
    if (state.rxOnly && state.connected) {
      dom.muteBtn.style.display = '';
      const player = getSdrAudioPlayer();
      const isMuted = player ? player.isMuted() : false;
      dom.muteBtn.textContent = isMuted ? '\u{1F507}' : '\u{1F50A}';
      dom.muteBtn.classList.toggle('muted', isMuted);
    } else {
      dom.muteBtn.style.display = 'none';
    }
  }
}

// --- Band overlay: shows CW/DIGI/PHONE zones for current band ---
function renderBandOverlay(state) {
  const container = dom.bandOverlay;
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

  // Option: KiwiSDR (online RX) — hidden on HTTPS (ws:// blocked by mixed content)
  if (location.protocol !== 'https:') {
    const sdrOpt = document.createElement('option');
    sdrOpt.value = 'kiwisdr';
    sdrOpt.textContent = 'KiwiSDR (Online RX)';
    sdrOpt.dataset.profile = 'kiwisdr';
    select.appendChild(sdrOpt);
  }

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
    // TCI (network)
    tciHost: state.radioTciHost,
    tciPort: state.radioTciPort,
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

    } else if (state.radioProtocolFamily === 'tci') {
      // --- TCI (network): WebSocket connection, no serial port ---
      const tciHost = state.radioTciHost || 'localhost';
      const tciPort = state.radioTciPort || 50001;
      statusEl.textContent = `Connecting via TCI to ${tciHost}:${tciPort}...`;
      const config = buildConnectConfig();
      const success = await connectRig({
        ...config,
        protocolFamily: 'tci',
        tciHost,
        tciPort,
      });
      if (!success) {
        // ws:// from https:// is blocked by browsers (mixed content) unless target is localhost/127.0.0.1
        const isSecure = location.protocol === 'https:';
        const isLoopback = tciHost === 'localhost' || tciHost === '127.0.0.1';
        if (isSecure && !isLoopback) {
          statusEl.textContent = `TCI failed — ws:// blocked from HTTPS. Use Host: localhost or 127.0.0.1`;
        } else {
          statusEl.textContent = `TCI failed — check TCI is enabled on ${tciHost}:${tciPort}`;
        }
      }

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
    const isSdr = widgetSelection === 'kiwisdr';
    if (isDemo) {
      // Demo mode — always start synthetic scope
      startScope({ longitude: state.myLon || 0, useAudio: false });
    } else if (isSdr) {
      // SDR — synthetic scope (no microphone — SDR audio is via its own player)
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

// --- Digital Setup Assistant ---
// Manages enable/disable cycle: snapshot current rig state, apply digital config,
// restore previous state on disable. Starts disabled every session.

// Snapshot the current rig state before applying digital settings
function snapshotRigState() {
  const store = getRigStore();
  const s = store.getState();
  return {
    frequency: s.frequency,
    mode: s.mode,
    rfPower: s.rfPower,
  };
}

// Apply digital mode settings to the radio
function applyDigitalSetup() {
  const mode = state.digitalSetupMode;
  const band = state.digitalSetupBand;
  const power = state.digitalSetupPower;

  const freq = getDigitalFrequency(mode, band);

  // Send frequency + mode. For Custom mode, only set mode + power (user tunes manually)
  if (freq) {
    sendRigCommand('setFrequency', freq, 1);
  }
  sendRigCommand('setMode', 'DATA-U', 1); // all digital modes use DATA-U (upper sideband data)

  // Set power if radio supports it
  const store = getRigStore();
  const caps = store.getState().capabilities || [];
  if (caps.includes('rf_power') && power > 0) {
    sendRigCommand('setRFPower', power, 1);
  }
}

// Restore rig to pre-digital state
function restoreRigState() {
  const snapshot = state.digitalRestoreState;
  if (!snapshot) return;

  if (snapshot.frequency > 0) {
    sendRigCommand('setFrequency', snapshot.frequency, 1);
  }
  if (snapshot.mode) {
    sendRigCommand('setMode', snapshot.mode, 1);
  }
  const store = getRigStore();
  const caps = store.getState().capabilities || [];
  if (caps.includes('rf_power') && snapshot.rfPower > 0) {
    sendRigCommand('setRFPower', snapshot.rfPower, 1);
  }

  state.digitalRestoreState = null;
}

// Handle enable/disable toggle
function handleDigitalToggle() {
  const toggle = $('rigDigitalToggle');
  if (!toggle) return;

  if (!isRigConnected()) {
    toggle.checked = false;
    return;
  }

  if (toggle.checked) {
    // Enable — snapshot then apply
    state.digitalSetupEnabled = true;
    state.digitalRestoreState = snapshotRigState();
    applyDigitalSetup();
    updateDigitalUI();
  } else {
    // Disable — restore previous state
    state.digitalSetupEnabled = false;
    restoreRigState();
    updateDigitalUI();
  }
}

// Handle Apply button — re-apply current digital settings without toggling
function handleDigitalApply() {
  if (!state.digitalSetupEnabled || !isRigConnected()) return;
  applyDigitalSetup();
}

// Handle mode/band/power changes — persist and re-apply if enabled
function handleDigitalModeChange() {
  const modeSelect = $('rigDigitalMode');
  if (modeSelect) {
    state.digitalSetupMode = modeSelect.value;
    localStorage.setItem('hamtab_digital_mode', modeSelect.value);
  }
  // Update band options (FT4 doesn't have 160m)
  populateDigitalBands();
  if (state.digitalSetupEnabled && isRigConnected()) applyDigitalSetup();
}

function handleDigitalBandChange() {
  const bandSelect = $('rigDigitalBand');
  if (bandSelect) {
    state.digitalSetupBand = bandSelect.value;
    localStorage.setItem('hamtab_digital_band', bandSelect.value);
  }
  if (state.digitalSetupEnabled && isRigConnected()) applyDigitalSetup();
}

function handleDigitalPowerClick(e) {
  const btn = e.target.closest('.rig-digital-power-chip');
  if (!btn) return;
  const watts = parseInt(btn.dataset.watts, 10);
  if (isNaN(watts)) return;

  state.digitalSetupPower = watts;
  localStorage.setItem('hamtab_digital_power', String(watts));

  // Update active chip highlight
  const container = $('rigDigitalPowerChips');
  if (container) {
    for (const chip of container.querySelectorAll('.rig-digital-power-chip')) {
      chip.classList.toggle('active', parseInt(chip.dataset.watts, 10) === watts);
    }
  }

  if (state.digitalSetupEnabled && isRigConnected()) {
    const store = getRigStore();
    const caps = store.getState().capabilities || [];
    if (caps.includes('rf_power')) {
      sendRigCommand('setRFPower', watts, 1);
    }
  }
}

// Handle "Release for WSJT-X" — disconnect CAT so WSJT-X can claim the port
async function handleReleaseForWSJTX() {
  if (!isRigConnected()) return;
  if (!confirm('Disconnect from the radio so WSJT-X can connect?\n\nYour digital settings have been applied. Reconnect when your WSJT-X session is over to restore your previous radio settings.')) return;

  stopScope();
  try { await disconnectRig(); } catch (_) { /* ignore */ }

  // Update status to show what happened
  const statusEl = $('rigStatus');
  if (statusEl) statusEl.textContent = 'Released for WSJT-X — reconnect when done';
}

// Populate digital band dropdown based on selected mode
function populateDigitalBands() {
  const bandSelect = $('rigDigitalBand');
  if (!bandSelect) return;

  const mode = state.digitalSetupMode;
  const freqTable = mode === 'FT4' ? FT4_FREQUENCIES : FT8_FREQUENCIES;
  const currentBand = bandSelect.value || state.digitalSetupBand;

  bandSelect.innerHTML = '';
  for (const band of BAND_IDS) {
    // For Custom mode, show all bands. For FT8/FT4, only show bands with defined frequencies
    if (mode === 'Custom' || freqTable[band]) {
      const opt = document.createElement('option');
      opt.value = band;
      opt.textContent = band;
      if (freqTable[band]) {
        opt.textContent += ` (${(freqTable[band] / 1_000_000).toFixed(3)})`;
      }
      bandSelect.appendChild(opt);
    }
  }

  // Restore selection if still valid, otherwise pick first
  if (bandSelect.querySelector(`option[value="${currentBand}"]`)) {
    bandSelect.value = currentBand;
  } else if (bandSelect.options.length > 0) {
    bandSelect.value = bandSelect.options[0].value;
    state.digitalSetupBand = bandSelect.value;
    localStorage.setItem('hamtab_digital_band', bandSelect.value);
  }
}

// Update digital setup UI visibility and state indicators
function updateDigitalUI() {
  const section = $('rigDigitalSection');
  const toggle = $('rigDigitalToggle');
  const controls = $('rigDigitalControls');
  const releaseBtn = $('rigDigitalRelease');
  const statusBadge = $('rigDigitalStatus');
  if (!section) return;

  const connected = isRigConnected();
  const store = getRigStore();
  const s = store.getState();
  const isRealRadio = connected && !s.demo && !s.rxOnly;

  // Show section only when connected to a real radio
  section.style.display = isRealRadio ? '' : 'none';

  // Auto-disable digital mode when rig disconnects (prevents stale snapshot)
  if (!connected && state.digitalSetupEnabled) {
    state.digitalSetupEnabled = false;
    state.digitalRestoreState = null;
  }

  // Toggle state
  if (toggle) toggle.checked = state.digitalSetupEnabled;

  // Controls enabled only when toggle is on
  if (controls) {
    controls.classList.toggle('rig-digital-disabled', !state.digitalSetupEnabled);
  }

  // Release button visible only when enabled and connected
  if (releaseBtn) {
    releaseBtn.style.display = (state.digitalSetupEnabled && connected) ? '' : 'none';
  }

  // Status badge
  if (statusBadge) {
    if (state.digitalSetupEnabled) {
      statusBadge.textContent = 'DIGITAL';
      statusBadge.className = 'rig-digital-status rig-digital-active';
    } else {
      statusBadge.textContent = '';
      statusBadge.className = 'rig-digital-status';
    }
  }
}

// --- Initialize widget (idempotent — safe to call multiple times) ---
export function initOnAirRig() {
  if (initialized) return;
  if (!isWidgetVisible('widget-on-air-rig')) return;

  const connectBtn = $('rigConnectBtn');
  if (!connectBtn) return;

  // Cache DOM refs once — avoids repeated $() lookups in render()
  cacheDomRefs();
  prev = {}; // reset diff state

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

    // SDR mute button
    const muteBtn = $('rigSdrMute');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const player = getSdrAudioPlayer();
        if (!player) return;
        player.setMuted(!player.isMuted());
        muteBtn.textContent = player.isMuted() ? '\u{1F507}' : '\u{1F50A}';
        muteBtn.classList.toggle('muted', player.isMuted());
      });
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
    // VFO A ↔ B swap button
    const vfoSwapBtn = $('rigVfoSwapBtn');
    if (vfoSwapBtn) {
      vfoSwapBtn.addEventListener('click', () => {
        if (isRigConnected()) sendRigCommand('swapVfo', null, 1);
      });
    }
    // Power off button — sends powerOff command then disconnects
    const powerOffBtn = $('rigPowerOffBtn');
    if (powerOffBtn) {
      powerOffBtn.addEventListener('click', async () => {
        if (!isRigConnected()) return;
        if (!confirm('Power off the radio?')) return;
        sendRigCommand('powerOff', null, 1);
        // Brief delay for command to reach radio, then disconnect CAT
        setTimeout(async () => {
          stopScope();
          try { await disconnectRig(); } catch (_) { /* ignore */ }
        }, 500); // 500ms — enough for serial/TCI round-trip
      });
    }

    // --- Digital Setup Assistant listeners ---
    const digitalToggle = $('rigDigitalToggle');
    if (digitalToggle) digitalToggle.addEventListener('change', handleDigitalToggle);

    const digitalModeSelect = $('rigDigitalMode');
    if (digitalModeSelect) {
      digitalModeSelect.value = state.digitalSetupMode;
      digitalModeSelect.addEventListener('change', handleDigitalModeChange);
    }

    const digitalBandSelect = $('rigDigitalBand');
    if (digitalBandSelect) digitalBandSelect.addEventListener('change', handleDigitalBandChange);

    const digitalPowerChips = $('rigDigitalPowerChips');
    if (digitalPowerChips) digitalPowerChips.addEventListener('click', handleDigitalPowerClick);

    const digitalApplyBtn = $('rigDigitalApply');
    if (digitalApplyBtn) digitalApplyBtn.addEventListener('click', handleDigitalApply);

    const digitalReleaseBtn = $('rigDigitalRelease');
    if (digitalReleaseBtn) digitalReleaseBtn.addEventListener('click', handleReleaseForWSJTX);

    // Populate band dropdown and power chip active state
    populateDigitalBands();
    const initPowerChips = $('rigDigitalPowerChips');
    if (initPowerChips) {
      for (const chip of initPowerChips.querySelectorAll('.rig-digital-power-chip')) {
        chip.classList.toggle('active', parseInt(chip.dataset.watts, 10) === state.digitalSetupPower);
      }
    }

    listenersAttached = true;
  }

  // Subscribe to rig state — this is the active part we start/stop
  const store = getRigStore();
  unsubscribe = store.subscribe(render);

  // Update digital UI on every rig state change (show/hide based on connection)
  store.subscribe(updateDigitalUI);
  updateDigitalUI(); // initial state

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
  prev = {}; // reset diff state for next init
  initialized = false;
}

// Register close-button callback so hiding the widget via × also tears down CAT
onWidgetHide('widget-on-air-rig', destroyOnAirRig);
