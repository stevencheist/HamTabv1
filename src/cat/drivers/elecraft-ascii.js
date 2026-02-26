// --- CAT Driver: Elecraft ASCII ---
// Covers: KX3, KX2, K3, K3S, K4, K4D
// Protocol: ASCII commands terminated with ";"
// Elecraft commands are very close to Kenwood but with Elecraft-specific extensions.
// Key differences: 2-letter commands, mode codes differ slightly, BW command.
// Reference: Elecraft K3/KX3 Programmer's Reference

// --- Mode code mapping ---
// Elecraft uses Kenwood-style MD command with slight differences
const MODE_CODES = {
  '1': 'LSB',
  '2': 'USB',
  '3': 'CW',
  '4': 'FM',
  '5': 'AM',
  '6': 'DATA',       // RTTY / DATA
  '7': 'CW-R',
  '9': 'DATA-R',     // DATA reverse
};

const MODE_TO_CODE = Object.fromEntries(
  Object.entries(MODE_CODES).map(([k, v]) => [v, k])
);

// Common aliases
MODE_TO_CODE['FT8'] = '2';       // USB (data mode set via DT command)
MODE_TO_CODE['FT4'] = '2';
MODE_TO_CODE['DATA-U'] = '2';
MODE_TO_CODE['DATA-L'] = '1';
MODE_TO_CODE['CW-U'] = '3';
MODE_TO_CODE['CW-L'] = '7';
MODE_TO_CODE['RTTY'] = '6';
MODE_TO_CODE['RTTY-R'] = '9';
MODE_TO_CODE['FSK'] = '6';

// --- S-Meter calibration (raw 0-21 → S-units) ---
// Elecraft SM returns 0000-0021 (0-21)
const SMETER_CAL = [
  [0, 0], [2, 1], [5, 3], [7, 5], [9, 7],
  [12, 9], [15, 10], [18, 13], [21, 15],
];

// --- SWR calibration (raw 0-20 → SWR ratio) ---
// Elecraft SWR via SW command (0-20 scale)
const SWR_CAL = [
  [0, 1.0], [3, 1.5], [6, 2.0], [9, 3.0],
  [12, 4.0], [15, 5.0], [20, 25.0],
];

// --- Power meter calibration (raw → watts, KX3 max 15W) ---
const POWER_CAL = [
  [0, 0], [3, 1], [6, 3], [10, 5], [15, 10], [20, 15],
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

// --- Driver interface ---
export const elecraftAscii = {
  name: 'elecraft_ascii',
  label: 'Elecraft (K/KX Series)',
  terminator: ';',

  // --- Initialization commands ---
  init() {
    return [
      'OM;',     // Read option module info (confirms communication)
      'AI0;',    // Disable auto-information
      'K31;',    // Extended mode: enable K3-extended responses
    ];
  },

  // --- Capabilities ---
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
      'rf_power',
    ];
  },

  // --- Command encoding ---
  // Elecraft uses 11-digit frequency fields like Kenwood
  encode(command, params) {
    switch (command) {
      case 'getFrequency':  return 'FA;';
      case 'setFrequency':  return `FA${String(params).padStart(11, '0')};`;
      case 'getFrequencyB': return 'FB;';
      case 'setFrequencyB': return `FB${String(params).padStart(11, '0')};`;
      case 'getMode':       return 'MD;';
      case 'setMode': {
        const code = MODE_TO_CODE[params] || params;
        return `MD${code};`;
      }
      case 'getPTT':        return 'TQ;';  // Elecraft: TQ = TX query
      case 'setPTT':        return params ? 'TX;' : 'RX;';  // TX; to transmit, RX; to receive
      case 'getSignal':     return 'SM;';
      case 'getSWR':        return 'SW;';   // Elecraft SWR command
      case 'getRFPower':    return 'PC;';
      case 'setRFPower':    return `PC${String(params).padStart(3, '0')};`;
      case 'getBandwidth':  return 'BW;';
      case 'getID':         return 'OM;';   // Option module as ID proxy
      default:
        return null;
    }
  },

  // --- Response parsing ---
  parse(response) {
    if (!response || response === '?;') {
      return { type: 'error', value: response };
    }

    const resp = response.endsWith(';') ? response.slice(0, -1) : response;

    // --- Frequency (FA/FB) — 11 digits ---
    if (resp.startsWith('FA')) {
      return { type: 'frequency', value: parseInt(resp.slice(2), 10) };
    }
    if (resp.startsWith('FB')) {
      return { type: 'frequencyB', value: parseInt(resp.slice(2), 10) };
    }

    // --- Mode (MDx) ---
    if (resp.startsWith('MD')) {
      const code = resp.slice(2);
      return { type: 'mode', value: MODE_CODES[code] || code };
    }

    // --- PTT (TQ0/TQ1) ---
    if (resp.startsWith('TQ')) {
      const val = parseInt(resp.slice(2), 10);
      return { type: 'ptt', value: val > 0 };
    }

    // --- S-Meter (SMnnnn) ---
    if (resp.startsWith('SM')) {
      const raw = parseInt(resp.slice(2), 10);
      return { type: 'signal', value: raw, sUnits: interpolate(SMETER_CAL, raw) };
    }

    // --- SWR (SWnnn) ---
    if (resp.startsWith('SW')) {
      const raw = parseInt(resp.slice(2), 10);
      return { type: 'swr', value: interpolate(SWR_CAL, raw), raw };
    }

    // --- RF Power setting (PCnnn) ---
    if (resp.startsWith('PC')) {
      return { type: 'rfPower', value: parseInt(resp.slice(2), 10) };
    }

    // --- Bandwidth (BWnnnn) ---
    if (resp.startsWith('BW')) {
      return { type: 'bandwidth', value: parseInt(resp.slice(2), 10) * 10 }; // in Hz
    }

    // --- Option module (OM...) — used as ID response ---
    if (resp.startsWith('OM')) {
      return { type: 'radioId', value: resp.slice(2) };
    }

    return null;
  },

  // --- Polling commands ---
  pollCommands() {
    return [
      'getFrequency',
      'getMode',
      'getPTT',
    ];
  },

  // --- Meter commands ---
  meterCommands() {
    return [
      'getSignal',
      'getSWR',
    ];
  },
};

export { MODE_CODES, MODE_TO_CODE, SMETER_CAL, SWR_CAL, POWER_CAL, interpolate };
