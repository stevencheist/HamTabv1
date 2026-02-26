// --- CAT Simulator: Fake Radio Engine ---
// Stateful radio simulator. Responds to CAT commands like a real radio.
// Simulates: frequency, mode, PTT, S-meter, SWR, power.
// Signal fluctuates realistically. SWR spikes on band changes.
// Optional propagation engine for band-realistic signals.

import { createPropagationEngine } from './propagation-signal-engine.js';

export function createFakeRadioEngine(options = {}) {
  // --- State ---
  let frequency = options.frequency || 14_074_000;   // 20m FT8
  let frequencyB = options.frequencyB || 7_074_000;   // 40m FT8
  let mode = options.mode || 'DATA-U';
  let ptt = false;
  let rfPower = options.rfPower || 50;
  let radioId = '0761';  // FT-DX10

  // Simulated signal/noise
  let baseSignal = 80;     // base S-meter reading
  let signalNoise = 0;     // random fluctuation
  let swr = 1.3;           // base SWR
  let lastBand = '20m';

  // --- Propagation engine (optional) ---
  // options.propagation: 'off' | 'basic' | 'location'
  // options.latitude, options.longitude: for location-aware mode
  let propEngine = null;
  const propMode = options.propagation || 'off';
  if (propMode === 'basic') {
    propEngine = createPropagationEngine({ latitude: 0, longitude: 0 });
  } else if (propMode === 'location' && options.latitude != null) {
    propEngine = createPropagationEngine({ latitude: options.latitude, longitude: options.longitude });
  }

  // --- Noise generator: signal fluctuates ±20 around base ---
  function updateSignal() {
    signalNoise = Math.round((Math.random() - 0.5) * 40);
    // Occasional stronger signals
    if (Math.random() < 0.05) {
      signalNoise += Math.round(Math.random() * 60);
    }
  }

  // --- SWR changes on band change ---
  function updateSWR(newBand) {
    if (newBand && newBand !== lastBand) {
      // Simulate high SWR on band change (antenna not tuned)
      swr = 2.5 + Math.random() * 3.0;
      lastBand = newBand;
      // SWR settles after a few seconds
      setTimeout(() => { swr = 1.1 + Math.random() * 0.5; }, 3000);
    }
  }

  // --- Handle CAT commands ---
  // Returns ASCII response string (same format as real radio)
  function processCommand(cmd) {
    if (!cmd) return null;

    // Strip terminator
    const c = cmd.endsWith(';') ? cmd.slice(0, -1) : cmd;

    // --- Frequency ---
    if (c === 'FA') return `FA${String(frequency).padStart(9, '0')};`;
    if (c.startsWith('FA')) {
      frequency = parseInt(c.slice(2), 10);
      const band = detectSimBand(frequency);
      updateSWR(band);
      return null; // set commands return nothing on Yaesu
    }

    if (c === 'FB') return `FB${String(frequencyB).padStart(9, '0')};`;
    if (c.startsWith('FB')) {
      frequencyB = parseInt(c.slice(2), 10);
      return null;
    }

    // --- Mode ---
    if (c === 'MD0') {
      const modeMap = { 'DATA-U': 'C', 'USB': '2', 'LSB': '1', 'CW-U': '3', 'FM': '4', 'AM': '5' };
      return `MD0${modeMap[mode] || 'C'};`;
    }
    if (c.startsWith('MD0')) {
      const codeMap = { '1': 'LSB', '2': 'USB', '3': 'CW-U', '4': 'FM', '5': 'AM', 'C': 'DATA-U' };
      mode = codeMap[c.slice(3)] || mode;
      return null;
    }

    // --- PTT ---
    if (c === 'TX') return `TX${ptt ? '1' : '0'};`;
    if (c === 'TX1') { ptt = true; return null; }
    if (c === 'TX0') { ptt = false; return null; }

    // --- S-Meter ---
    if (c === 'SM0') {
      let raw;
      if (propEngine) {
        raw = propEngine.getSignalLevel(frequency);
      } else {
        updateSignal();
        raw = Math.max(0, Math.min(255, baseSignal + signalNoise));
      }
      return `SM0${String(raw).padStart(3, '0')};`;
    }

    // --- SWR ---
    if (c === 'RM6') {
      let swrVal;
      if (propEngine) {
        swrVal = propEngine.getSWR(frequency);
      } else {
        swrVal = swr;
      }
      // Map SWR ratio to raw value (inverse of calibration table)
      const raw = Math.min(255, Math.max(0, Math.round(swrVal * 40)));
      return `RM6${String(raw).padStart(3, '0')};`;
    }

    // --- Power meter ---
    if (c === 'RM5') {
      const watts = ptt ? rfPower * (0.85 + Math.random() * 0.15) : 0;
      const raw = Math.min(255, Math.round(watts * 2.05));
      return `RM5${String(raw).padStart(3, '0')};`;
    }

    // --- RF Power setting ---
    if (c === 'PC') return `PC${String(rfPower).padStart(3, '0')};`;
    if (c.startsWith('PC')) {
      rfPower = parseInt(c.slice(2), 10);
      return null;
    }

    // --- ID ---
    if (c === 'ID') return `ID${radioId};`;

    // --- Info ---
    if (c === 'IF') {
      return `IF${String(frequency).padStart(9, '0')}${'0'.repeat(10)};`;
    }

    // --- AI (auto info) ---
    if (c === 'AI0') return null; // acknowledge

    // Unknown command
    return '?;';
  }

  // --- Band detection for SWR sim ---
  function detectSimBand(freq) {
    if (freq >= 1_800_000 && freq <= 2_000_000) return '160m';
    if (freq >= 3_500_000 && freq <= 4_000_000) return '80m';
    if (freq >= 7_000_000 && freq <= 7_300_000) return '40m';
    if (freq >= 10_100_000 && freq <= 10_150_000) return '30m';
    if (freq >= 14_000_000 && freq <= 14_350_000) return '20m';
    if (freq >= 18_068_000 && freq <= 18_168_000) return '17m';
    if (freq >= 21_000_000 && freq <= 21_450_000) return '15m';
    if (freq >= 24_890_000 && freq <= 24_990_000) return '12m';
    if (freq >= 28_000_000 && freq <= 29_700_000) return '10m';
    if (freq >= 50_000_000 && freq <= 54_000_000) return '6m';
    return null;
  }

  function destroy() {
    if (propEngine) { propEngine.destroy(); propEngine = null; }
  }

  return { processCommand, destroy };
}
