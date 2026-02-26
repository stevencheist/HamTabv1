// --- CAT Driver: Icom CI-V (Computer Interface V) ---
// Covers: IC-7300, IC-7610, IC-9700, IC-705, IC-7100, IC-7851, etc.
// Protocol: Binary frames with BCD-encoded frequencies
// Frame: FE FE <to> <from> <cmd> [<sub>] [<data>...] FD
// Reference: Icom CI-V Protocol Specification

// --- Constants ---
const PREAMBLE = 0xFE;
const EOM = 0xFD;           // end of message
const CONTROLLER = 0xE0;    // default controller address (PC)
const ACK = 0xFB;
const NAK = 0xFA;

// --- Mode codes (CI-V) ---
const MODE_CODES = {
  0x00: 'LSB',
  0x01: 'USB',
  0x02: 'AM',
  0x03: 'CW',
  0x04: 'RTTY',
  0x05: 'FM',
  0x06: 'WFM',
  0x07: 'CW-R',
  0x08: 'RTTY-R',
  0x17: 'DATA-FM',
};

// Mode to code (reverse lookup)
const MODE_TO_CODE = {};
for (const [k, v] of Object.entries(MODE_CODES)) {
  MODE_TO_CODE[v] = parseInt(k, 10);
}

// Common aliases
MODE_TO_CODE['DATA-U'] = 0x01;   // USB data mode (needs filter cmd too)
MODE_TO_CODE['DATA-L'] = 0x00;   // LSB data mode
MODE_TO_CODE['CW-U'] = 0x03;
MODE_TO_CODE['CW-L'] = 0x07;
MODE_TO_CODE['FT8'] = 0x01;      // USB data
MODE_TO_CODE['FT4'] = 0x01;

// --- S-Meter calibration (raw 0-255 → S-units) ---
// From Hamlib icom.c
const SMETER_CAL = [
  [0, 0], [36, 1], [73, 3], [109, 5], [146, 7],
  [182, 9], [200, 10], [218, 12], [237, 14], [255, 15],
];

// --- SWR calibration ---
const SWR_CAL = [
  [0, 1.0], [48, 1.5], [80, 2.0], [120, 3.0],
  [160, 4.0], [200, 5.0], [255, 25.0],
];

// --- Power meter calibration (raw 0-255 → watts, 100W radio) ---
const POWER_CAL = [
  [0, 0], [51, 10], [102, 25], [153, 50], [204, 75], [255, 100],
];

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

// --- BCD encoding/decoding ---
// CI-V frequencies are 5 bytes BCD, LSB first (10 Hz digit first)
// Example: 14.074.000 → 00 40 07 14 00 (10Hz, 1kHz, 100kHz, 10MHz, 1GHz)

function freqToBCD(hz) {
  // Convert Hz to 10-digit BCD, then pack into 5 bytes (LSB first)
  const str = String(Math.round(hz / 10)).padStart(8, '0'); // in 10Hz units
  // str = "01407400" for 14074000 Hz
  // BCD bytes (LSB first): [00, 40, 07, 14, 00] but we pack as pairs
  const bytes = new Uint8Array(5);
  // Reverse pairs: str[6..7], str[4..5], str[2..3], str[0..1], pad 00
  const padded = str.padStart(10, '0'); // ensure 10 digits
  for (let i = 0; i < 5; i++) {
    const hi = parseInt(padded[9 - (i * 2 + 1)], 10);
    const lo = parseInt(padded[9 - (i * 2)], 10);
    bytes[i] = (hi << 4) | lo;
  }
  return bytes;
}

function bcdToFreq(bytes) {
  // 5 BCD bytes, LSB first → Hz
  let hz = 0;
  let mult = 10; // smallest digit is 10Hz
  for (let i = 0; i < bytes.length; i++) {
    const lo = bytes[i] & 0x0F;
    const hi = (bytes[i] >> 4) & 0x0F;
    hz += lo * mult;
    mult *= 10;
    hz += hi * mult;
    mult *= 10;
  }
  return hz;
}

// --- Build a CI-V frame ---
function buildFrame(toAddr, cmd, sub, data) {
  const parts = [PREAMBLE, PREAMBLE, toAddr, CONTROLLER, cmd];
  if (sub !== null && sub !== undefined) parts.push(sub);
  if (data) {
    for (const b of data) parts.push(b);
  }
  parts.push(EOM);
  return new Uint8Array(parts);
}

// --- Driver interface ---
// Note: CI-V uses binary transport (writeRaw/readBytes), not ASCII sendCommand.
// The rig-manager needs to handle this differently. For now, encode() returns
// a Uint8Array and parse() accepts a Uint8Array.
// We use a wrapper to bridge the ASCII sendCommand interface.

let civAddress = 0x94; // default IC-7300

export const icomCiv = {
  name: 'icom_civ',
  label: 'Icom (CI-V)',
  terminator: null,  // binary protocol, no terminator
  binary: true,       // flag for rig-manager to use binary transport

  // --- Set the CI-V address for the target radio ---
  setCivAddress(addr) {
    civAddress = typeof addr === 'string' ? parseInt(addr, 16) : addr;
  },

  // --- Initialization commands ---
  init() {
    return [
      'getID',
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
  // Returns an ASCII command string that the rig-manager will process.
  // For CI-V, we encode to hex string representation of the binary frame,
  // then the transport layer converts to raw bytes.
  encode(command, params) {
    let frame;
    switch (command) {
      case 'getFrequency':
        frame = buildFrame(civAddress, 0x03, null, null);  // Cmd 03: read frequency
        break;
      case 'setFrequency':
        frame = buildFrame(civAddress, 0x05, null, freqToBCD(params));  // Cmd 05: set frequency
        break;
      case 'getMode':
        frame = buildFrame(civAddress, 0x04, null, null);  // Cmd 04: read mode
        break;
      case 'setMode': {
        const code = MODE_TO_CODE[params];
        if (code !== undefined) {
          frame = buildFrame(civAddress, 0x06, null, new Uint8Array([code, 0x01]));  // Cmd 06: set mode + filter
        }
        break;
      }
      case 'getPTT':
        frame = buildFrame(civAddress, 0x1C, 0x00, null);  // Cmd 1C sub 00: read TX state
        break;
      case 'setPTT':
        frame = buildFrame(civAddress, 0x1C, 0x00, new Uint8Array([params ? 0x01 : 0x00]));
        break;
      case 'getSignal':
        frame = buildFrame(civAddress, 0x15, 0x02, null);  // Cmd 15 sub 02: S-meter
        break;
      case 'getSWR':
        frame = buildFrame(civAddress, 0x15, 0x12, null);  // Cmd 15 sub 12: SWR meter
        break;
      case 'getRFPower':
        frame = buildFrame(civAddress, 0x14, 0x0A, null);  // Cmd 14 sub 0A: RF power
        break;
      case 'setRFPower': {
        // Power as 0-255 (percentage of max)
        const pctByte = Math.min(255, Math.max(0, Math.round((params / 100) * 255)));
        frame = buildFrame(civAddress, 0x14, 0x0A, new Uint8Array([pctByte >> 4, pctByte & 0x0F]));
        break;
      }
      case 'getID':
        frame = buildFrame(civAddress, 0x19, 0x00, null);  // Cmd 19 sub 00: read transceiver ID
        break;
      default:
        return null;
    }

    if (!frame) return null;

    // Encode binary frame as hex string for transport through ASCII command queue
    // The transport layer will convert back to bytes
    return 'CIV:' + Array.from(frame).map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // --- Response parsing ---
  // Accepts either a hex-encoded string (CIV:...) or raw response string
  parse(response) {
    if (!response) return null;

    let bytes;
    if (typeof response === 'string' && response.startsWith('CIV:')) {
      // Hex-encoded CI-V frame
      const hex = response.slice(4);
      bytes = new Uint8Array(hex.match(/.{2}/g).map(h => parseInt(h, 16)));
    } else if (response instanceof Uint8Array) {
      bytes = response;
    } else {
      return null;
    }

    // Validate frame: FE FE <from> <to> <cmd> ... FD
    if (bytes.length < 6 || bytes[0] !== PREAMBLE || bytes[1] !== PREAMBLE) {
      return null;
    }

    const cmd = bytes[4];
    const eomIdx = bytes.indexOf(EOM);
    if (eomIdx < 0) return null;

    const data = bytes.slice(5, eomIdx);

    // --- ACK/NAK ---
    if (cmd === ACK) return null;  // command accepted, no data
    if (cmd === NAK) return { type: 'error', value: 'NAK' };

    // --- Frequency response (Cmd 03 echo or unsolicited) ---
    if (cmd === 0x03 || cmd === 0x00) {
      if (data.length >= 5) {
        return { type: 'frequency', value: bcdToFreq(data.slice(0, 5)) };
      }
    }

    // --- Mode response (Cmd 04 echo) ---
    if (cmd === 0x04 || cmd === 0x01) {
      if (data.length >= 1) {
        return { type: 'mode', value: MODE_CODES[data[0]] || `mode_${data[0]}` };
      }
    }

    // --- PTT response (Cmd 1C sub 00) ---
    if (cmd === 0x1C) {
      if (data.length >= 2 && data[0] === 0x00) {
        return { type: 'ptt', value: data[1] > 0 };
      }
    }

    // --- Meter readings (Cmd 15) ---
    if (cmd === 0x15 && data.length >= 3) {
      const sub = data[0];
      const raw = ((data[1] & 0x0F) * 100) + (((data[2] >> 4) & 0x0F) * 10) + (data[2] & 0x0F);

      if (sub === 0x02) {
        return { type: 'signal', value: raw, sUnits: interpolate(SMETER_CAL, raw) };
      }
      if (sub === 0x12) {
        return { type: 'swr', value: interpolate(SWR_CAL, raw), raw };
      }
    }

    // --- RF Power (Cmd 14 sub 0A) ---
    if (cmd === 0x14 && data.length >= 3 && data[0] === 0x0A) {
      const raw = ((data[1] & 0x0F) * 100) + (((data[2] >> 4) & 0x0F) * 10) + (data[2] & 0x0F);
      return { type: 'rfPower', value: Math.round((raw / 255) * 100) };
    }

    // --- Transceiver ID (Cmd 19) ---
    if (cmd === 0x19 && data.length >= 1) {
      return { type: 'radioId', value: data[0].toString(16).padStart(2, '0') };
    }

    return null;
  },

  pollCommands() {
    return [
      'getFrequency',
      'getMode',
      'getPTT',
    ];
  },

  meterCommands() {
    return [
      'getSignal',
      'getSWR',
    ];
  },
};

export { MODE_CODES, MODE_TO_CODE, SMETER_CAL, SWR_CAL, POWER_CAL, interpolate, freqToBCD, bcdToFreq };
