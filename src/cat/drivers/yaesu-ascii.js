// --- CAT Driver: Yaesu ASCII (NewCAT) ---
// Covers: FT-DX10, FT-991A, FT-710, FTDX101D, FT-891, FT-DX3000, etc.
// Protocol: ASCII commands terminated with ";"
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
// From Hamlib ftdx10.h FTDX10_SWR_CAL
const SWR_CAL = [
  [0, 1.0], [26, 1.2], [52, 1.5], [89, 2.0],
  [126, 3.0], [173, 4.0], [236, 5.0], [255, 25.0],
];

// --- RF Power meter calibration (raw 0-255 → watts) ---
// From Hamlib ftdx10.h FTDX10_RFPOWER_METER_CAL
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

// --- Driver interface ---
export const yaesuAscii = {
  name: 'yaesu_ascii',
  label: 'Yaesu (NewCAT)',
  terminator: ';',

  // --- Initialization commands ---
  // Sent once after connection to configure the radio for CAT control
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
      case 'getInfo':       return 'IF;';
      case 'getID':         return 'ID;';
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

    // Strip trailing semicolons for parsing
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

    return null;
  },

  // --- Polling commands ---
  // Returns the list of commands to send each polling cycle.
  // Meter commands are separate (handled by MeterStreamEngine).
  pollCommands() {
    return [
      'getFrequency',
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
