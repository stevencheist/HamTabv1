// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT
// --- CAT Driver: Yaesu ASCII (NewCAT) ---
// Covers: FT-DX10, FT-991A, FT-710, FTDX101D, FT-891, FT-DX3000, etc.
// Protocol: ASCII commands terminated with ";".
// Reference: hamtab-planning/reference/ftdx10-cat-protocol.md
// --- Mode code mapping ---
const MODE_CODES = {
  '1': 'LSB',
  '2': 'USB',
  '3': 'CW-U',
  '4': 'FM',
  '5': 'AM',
  '6': 'RTTY-L',
  '7': 'CW-L',
  '8': 'DATA-L',
  '9': 'RTTY-U',
  'A': 'DATA-FM',
  'B': 'FM-N',
  'C': 'DATA-U',   // FT8/WSJT-X
  'D': 'AM-N',
};

const MODE_TO_CODE = Object.fromEntries(
  Object.entries(MODE_CODES).map(([k, v]) => [v, k])
);

// --- S-Meter calibration (raw 0-255 → S-units) ---
// From Hamlib ftdx10.h
const SMETER_CAL = [
  [0, 0], [30, 1], [60, 3], [90, 5], [120, 7],
  [150, 9], [170, 10], [190, 11], [210, 12], [230, 13], [255, 15],
];

// --- SWR calibration (raw 0-255 → SWR ratio) ---
// From Hamlib ftdx10.h FTDX10_SWR_CAL.
const SWR_CAL = [
  [0, 1.0], [26, 1.2], [52, 1.5], [89, 2.0],
  [126, 3.0], [173, 4.0], [236, 5.0], [255, 25.0],
];

// --- RF Power meter calibration (raw 0-255 → watts) ---
// From Hamlib ftdx10.h FTDX10_RFPOWER_METER_CAL.
const POWER_CAL = [
  [0, 0], [27, 5], [94, 25], [147, 50], [176, 75], [205, 100],
];

// --- Interpolate calibration table ---
function interpolate(cal, raw) {
  if (raw <= cal[0][0]) return cal[0][1];
  if (raw >= cal[cal.length - 1][0]) return cal[cal.length - 1][1];

  for (let i = 1; i < cal.length; i++) {
    if (raw <= cal[i][0]) {
      const [x0, y0] = cal[i - 1];
      const [x1, y1] = cal[i];
      return y0 + (raw - x0) * (y1 - y0) / (x1 - x0);
    }
  }
  return cal[cal.length - 1][1];
}

// --- Zero-padded number helper for EX command encoding ---
function pad(n, width) {
  return String(n).padStart(width, '0');
}

// --- Driver interface ---
export const yaesuAscii = {
  name: 'yaesu_ascii',
  label: 'Yaesu (NewCAT)',
  terminator: ';',

  // --- Initialization commands ---

  // Sent once after connection to configure the radio for CAT control.
  init() {
    return [
      'ID;',    // Read radio ID — confirms communication
      'AI0;',   // Disable auto-information (prevents unsolicited data)
    ];
  },

  // --- Capabilities ---

  // Declares what this driver supports. UI auto-builds from this list.
  capabilities() {
    return [
      'frequency_read',
      'frequency_set',
      'mode_read',
      'mode_set',
      'ptt_read',
      'ptt_cat',
      'meter_signal',
      'meter_swr',
      'meter_power',
      'rf_power',
      'vfo_swap',
      'power_off',
      'menu_read',
      'menu_set',
      'profile_save',
    ];
  },

  // --- Command encoding ---

  // Converts a logical command + params into the ASCII string to send.
  encode(command, params) {
    switch (command) {
      case 'getFrequency':  return 'FA;';
      case 'setFrequency':  return `FA${String(params).padStart(9, '0')};`;
      case 'getFrequencyB': return 'FB;';
      case 'setFrequencyB': return `FB${String(params).padStart(9, '0')};`;
      case 'getMode':       return 'MD0;';
      case 'setMode': {
        const code = MODE_TO_CODE[params] || params;
        return `MD0${code};`;
      }
      case 'getPTT':        return 'TX;';
      case 'setPTT':        return params ? 'TX1;' : 'TX0;';
      case 'getSignal':     return 'SM0;';
      case 'getSWR':        return 'RM6;';
      case 'getPower':      return 'RM5;';
      case 'getRFPower':    return 'PC;';
      case 'setRFPower':    return `PC${String(params).padStart(3, '0')};`;
      case 'swapVfo':       return 'SV;';  // Swap VFO A ↔ B
      case 'powerOff':      return 'PS0;'; // Power off radio
      case 'getInfo':       return 'IF;';
      case 'getID':         return 'ID;';
      // --- Profile-readable settings ---
      case 'getAFGain':     return 'AG0;';
      case 'setAFGain':     return `AG0${String(params).padStart(3, '0')};`;
      case 'getAGC':        return 'GT0;';
      case 'setAGC':        return `GT0${params};`;
      case 'getNoiseBlanker': return 'NB00;';
      case 'setNoiseBlanker': return `NB00${params};`;
      case 'getNoiseReduction': return 'NR00;';
      case 'setNoiseReduction': return `NR00${params};`;
      case 'getAttenuator':  return 'RA00;';
      case 'setAttenuator':  return `RA00${String(params).padStart(2, '0')};`;
      case 'getPreamp':      return 'PA00;';
      case 'setPreamp':      return `PA00${params};`;
      case 'getIFShift':     return 'IS0;';
      case 'setIFShift':     return `IS0${String(params).padStart(4, '0')};`;
      case 'getWidth':       return 'SH00;';
      case 'setWidth':       return `SH00${String(params).padStart(2, '0')};`;
      case 'getNarrow':      return 'NA00;';
      case 'setNarrow':      return `NA00${params};`;
      case 'getContour':     return 'CO00;';
      case 'setContour':     return `CO00${String(params).padStart(4, '0')};`;
      case 'getVoxGain':     return 'VG;';
      case 'setVoxGain':     return `VG${String(params).padStart(3, '0')};`;
      case 'getMonitorLevel': return 'ML;';
      case 'setMonitorLevel': return `ML${String(params).padStart(3, '0')};`;
      case 'getMicGain':     return 'MG;';
      case 'setMicGain':     return `MG${String(params).padStart(3, '0')};`;
      case 'getProcessor':   return 'PR0;';
      case 'setProcessor':   return `PR0${params};`;  // 0=off, 1=on
      case 'getProcessorLevel': return 'PL;';
      case 'setProcessorLevel': return `PL${String(params).padStart(3, '0')};`;
      // EX (Menu) — read/write radio menu settings.
      // Params: { p1, p2, p3 } for read, { p1, p2, p3, value, digits } for set      // Format: EX P1P1 P2P2 P3P3 [P4~P4] ; (contiguous, no spaces)
      case 'getMenu': {
        const { p1, p2, p3 } = params;
        return `EX${pad(p1,2)}${pad(p2,2)}${pad(p3,2)};`;
      }
      case 'setMenu': {
        const { p1, p2, p3, value, digits } = params;
        // Handle signed values: string "-06" passes through, number -6 encodes as "-06".
        let valStr;
        if (typeof value === 'string') {
          valStr = value;
        } else if (typeof value === 'number' && value < 0) {
          valStr = '-' + String(Math.abs(value)).padStart((digits || 1) - 1, '0');
        } else {
          valStr = String(value).padStart(digits || 1, '0');
        }
        return `EX${pad(p1,2)}${pad(p2,2)}${pad(p3,2)}${valStr};`;
      }
      default:
        return null;
    }
  },

  // --- Response parsing ---

  // Parses an ASCII response string into a {type, value} event.
  // Returns null if response is not recognized.
  parse(response) {
    if (!response || response === '?;') {
      return { type: 'error', value: response };
    }

    // Strip trailing semicolons for parsing.

    const resp = response.endsWith(';') ? response.slice(0, -1) : response;

    // --- Frequency (FA/FB) ---
    if (resp.startsWith('FA')) {
      return { type: 'frequency', value: parseInt(resp.slice(2), 10) };
    }
    if (resp.startsWith('FB')) {
      return { type: 'frequencyB', value: parseInt(resp.slice(2), 10) };
    }

    // --- Mode (MD0x) ---
    if (resp.startsWith('MD0')) {
      const code = resp.slice(3);
      return { type: 'mode', value: MODE_CODES[code] || code };
    }

    // --- PTT (TX0/TX1/TX2) ---
    if (resp.startsWith('TX')) {
      const val = parseInt(resp.slice(2), 10);
      return { type: 'ptt', value: val > 0 };
    }

    // --- S-Meter (SM0nnn) ---
    if (resp.startsWith('SM0')) {
      const raw = parseInt(resp.slice(3), 10);
      return { type: 'signal', value: raw, sUnits: interpolate(SMETER_CAL, raw) };
    }

    // --- SWR (RM6nnn) ---
    if (resp.startsWith('RM6')) {
      const raw = parseInt(resp.slice(3), 10);
      return { type: 'swr', value: interpolate(SWR_CAL, raw), raw };
    }

    // --- Power meter (RM5nnn) ---
    if (resp.startsWith('RM5')) {
      const raw = parseInt(resp.slice(3), 10);
      return { type: 'powerMeter', value: interpolate(POWER_CAL, raw), raw };
    }

    // --- RF Power setting (PCnnn) ---
    if (resp.startsWith('PC')) {
      return { type: 'rfPower', value: parseInt(resp.slice(2), 10) };
    }

    // --- Radio ID (ID####) ---
    if (resp.startsWith('ID')) {
      return { type: 'radioId', value: resp.slice(2) };
    }

    // --- Information (IF...) ---
    if (resp.startsWith('IF')) {
      const data = resp.slice(2);
      return {
        type: 'info',
        value: {
          frequency: parseInt(data.slice(0, 9), 10),
          raw: data,
        },
      };
    }

    // --- AF Gain (AG0nnn) ---
    if (resp.startsWith('AG0')) {
      return { type: 'afGain', value: parseInt(resp.slice(3), 10) };
    }

    // --- AGC (GT0n) ---
    if (resp.startsWith('GT0')) {
      return { type: 'agc', value: parseInt(resp.slice(3), 10) };
    }

    // --- Noise Blanker (NB00n) ---
    if (resp.startsWith('NB00')) {
      return { type: 'noiseBlanker', value: parseInt(resp.slice(4), 10) };
    }

    // --- Noise Reduction (NR00n) ---
    if (resp.startsWith('NR00')) {
      return { type: 'noiseReduction', value: parseInt(resp.slice(4), 10) };
    }

    // --- RF Attenuator (RA00nn) ---
    if (resp.startsWith('RA00')) {
      return { type: 'attenuator', value: parseInt(resp.slice(4), 10) };
    }

    // --- Pre-amp (PA00n) ---
    if (resp.startsWith('PA00')) {
      return { type: 'preamp', value: parseInt(resp.slice(4), 10) };
    }

    // --- IF Shift (IS0nnnn) ---
    if (resp.startsWith('IS0')) {
      // Value is +/- offset from center, stored as 4 digits (center at ~1200)
      return { type: 'ifShift', value: parseInt(resp.slice(3), 10) };
    }

    // --- Width (SH00nn) ---
    if (resp.startsWith('SH00')) {
      return { type: 'width', value: parseInt(resp.slice(4), 10) };
    }

    // --- Narrow (NA00n) ---
    if (resp.startsWith('NA00')) {
      return { type: 'narrow', value: parseInt(resp.slice(4), 10) };
    }

    // --- Contour (CO00nnnn) ---
    if (resp.startsWith('CO00')) {
      return { type: 'contour', value: parseInt(resp.slice(4), 10) };
    }

    // --- VOX Gain (VGnnn) ---
    if (resp.startsWith('VG')) {
      return { type: 'voxGain', value: parseInt(resp.slice(2), 10) };
    }

    // --- Monitor Level (MLnnn) ---
    if (resp.startsWith('ML')) {
      return { type: 'monitorLevel', value: parseInt(resp.slice(2), 10) };
    }

    // --- Mic Gain (MGnnn) ---
    if (resp.startsWith('MG')) {
      return { type: 'micGain', value: parseInt(resp.slice(2), 10) };
    }

    // --- Speech Processor (PR0n) ---
    if (resp.startsWith('PR0')) {
      return { type: 'processor', value: parseInt(resp.slice(3), 10) };
    }

    // --- Processor Level (PLnnn) ---
    if (resp.startsWith('PL')) {
      return { type: 'processorLevel', value: parseInt(resp.slice(2), 10) };
    }

    // --- Menu (EX P1P1 P2P2 P3P3 P4~P4) ---

    // Response: EX + 6 digits (address) + value digits.
    if (resp.startsWith('EX') && resp.length >= 8) {
      const p1 = parseInt(resp.slice(2, 4), 10);
      const p2 = parseInt(resp.slice(4, 6), 10);
      const p3 = parseInt(resp.slice(6, 8), 10);
      const value = resp.length > 8 ? resp.slice(8) : '';
      return {
        type: 'menu',
        value: { p1, p2, p3, raw: value, numeric: parseInt(value, 10) || 0 },
      };
    }

    return null;
  },

  // --- Polling commands ---

  // Returns the list of commands to send each polling cycle.
  // Meter commands are separate (handled by MeterStreamEngine).
  pollCommands() {
    return [
      'getFrequency',
      'getFrequencyB',
      'getMode',
      'getPTT',
    ];
  },

  // --- Meter commands ---

  // Sent at adaptive rate by MeterStreamEngine.
  meterCommands() {
    return [
      'getSignal',
      'getSWR',
    ];
  },
};

// --- Export calibration tables for testing ---
export { MODE_CODES, MODE_TO_CODE, SMETER_CAL, SWR_CAL, POWER_CAL, interpolate };
