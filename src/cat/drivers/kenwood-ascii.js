// --- CAT Driver: Kenwood ASCII ---
// Covers: TS-890S, TS-590SG, TS-480, TS-2000, TS-990S, etc.
// Protocol: ASCII commands terminated with ";"
// Very similar to Yaesu NewCAT — Kenwood originated this style.
// Reference: Kenwood TS-890S CAT Command Reference

// --- Mode code mapping ---
// Kenwood uses numeric mode codes in MD command
const MODE_CODES = {
  '1': 'LSB',
  '2': 'USB',
  '3': 'CW',
  '4': 'FM',
  '5': 'AM',
  '6': 'FSK',        // RTTY
  '7': 'CW-R',       // CW reverse
  '8': 'DATA',       // alias for FSK-R on some models
  '9': 'FSK-R',      // RTTY reverse
  'A': 'DATA-LSB',   // PSK/DATA on LSB
  'B': 'FM-N',
  'C': 'DATA-USB',   // FT8/WSJT-X — DATA on USB
  'D': 'DATA-FM',
};

const MODE_TO_CODE = Object.fromEntries(
  Object.entries(MODE_CODES).map(([k, v]) => [v, k])
);

// Add common aliases
MODE_TO_CODE['FT8'] = 'C';
MODE_TO_CODE['FT4'] = 'C';
MODE_TO_CODE['DATA-U'] = 'C';
MODE_TO_CODE['DATA-L'] = 'A';
MODE_TO_CODE['RTTY-L'] = '6';
MODE_TO_CODE['RTTY-U'] = '9';
MODE_TO_CODE['CW-U'] = '3';
MODE_TO_CODE['CW-L'] = '7';

// --- S-Meter calibration (raw 0-30 → S-units) ---
// Kenwood SM command returns 0000-0030
const SMETER_CAL = [
  [0, 0], [3, 1], [6, 3], [9, 5], [12, 7],
  [15, 9], [20, 10], [25, 13], [30, 15],
];

// --- SWR calibration (raw 0-30 → SWR ratio) ---
const SWR_CAL = [
  [0, 1.0], [4, 1.5], [8, 2.0], [12, 3.0],
  [16, 4.0], [20, 5.0], [30, 25.0],
];

// --- Power meter calibration (raw 0-30 → watts, 100W radio) ---
const POWER_CAL = [
  [0, 0], [5, 10], [10, 25], [15, 50], [20, 75], [25, 100], [30, 120],
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
export const kenwoodAscii = {
  name: 'kenwood_ascii',
  label: 'Kenwood (TS Series)',
  terminator: ';',

  // --- Initialization commands ---
  init() {
    return [
      'ID;',     // Read radio ID
      'AI0;',    // Disable auto-information
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
      'meter_power',
      'rf_power',
    ];
  },

  // --- Command encoding ---
  // Kenwood uses 11-digit frequency fields (vs Yaesu's 9)
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
      case 'getPTT':        return 'TX;';
      case 'setPTT':        return params ? 'TX1;' : 'TX0;';
      case 'getSignal':     return 'SM0;';
      case 'getSWR':        return 'RM1;';    // Kenwood: RM1 = SWR meter
      case 'getPower':      return 'RM0;';    // Kenwood: RM0 = output power
      case 'getRFPower':    return 'PC;';
      case 'setRFPower':    return `PC${String(params).padStart(3, '0')};`;
      case 'getInfo':       return 'IF;';
      case 'getID':         return 'ID;';
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

    // --- PTT (TX0/TX1) ---
    if (resp.startsWith('TX')) {
      const val = parseInt(resp.slice(2), 10);
      return { type: 'ptt', value: val > 0 };
    }

    // --- S-Meter (SM0xxxx) ---
    if (resp.startsWith('SM')) {
      const raw = parseInt(resp.slice(2), 10);
      return { type: 'signal', value: raw, sUnits: interpolate(SMETER_CAL, raw) };
    }

    // --- SWR meter (RM1xxxx) ---
    if (resp.startsWith('RM1')) {
      const raw = parseInt(resp.slice(3), 10);
      return { type: 'swr', value: interpolate(SWR_CAL, raw), raw };
    }

    // --- Power meter (RM0xxxx) ---
    if (resp.startsWith('RM0')) {
      const raw = parseInt(resp.slice(3), 10);
      return { type: 'powerMeter', value: interpolate(POWER_CAL, raw), raw };
    }

    // --- RF Power setting (PCnnn) ---
    if (resp.startsWith('PC')) {
      return { type: 'rfPower', value: parseInt(resp.slice(2), 10) };
    }

    // --- Radio ID (ID###) ---
    if (resp.startsWith('ID')) {
      return { type: 'radioId', value: resp.slice(2) };
    }

    // --- Information (IF...) ---
    // Kenwood IF response: 37 chars of packed data
    if (resp.startsWith('IF')) {
      const data = resp.slice(2);
      return {
        type: 'info',
        value: {
          frequency: parseInt(data.slice(0, 11), 10),
          raw: data,
        },
      };
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
