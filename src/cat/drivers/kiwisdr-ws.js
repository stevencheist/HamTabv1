// --- CAT Driver: KiwiSDR WebSocket ---
// RX-only driver for KiwiSDR online receivers.
// Uses KIWI: marker protocol — transport maintains cached state,
// driver encodes/parses the marker strings.
// No init commands needed — transport handles WebSocket handshake.

// --- Mode mapping: internal CAT → display ---
const MODE_MAP = {
  'AM':     'AM',
  'USB':    'USB',
  'LSB':    'LSB',
  'CW-U':   'CW-U',
  'CW-L':   'CW-L',
  'FM':     'FM',
  'DATA-U': 'DATA-U',
  'DATA-L': 'DATA-L',
};

export const kiwisdrWs = {
  name: 'kiwisdr_ws',
  label: 'KiwiSDR (WebSocket)',

  // No init commands — transport handles WebSocket handshake + auth
  init() {
    return [];
  },

  // RX-only capabilities — no PTT, no SWR, no power
  capabilities() {
    return [
      'frequency_read',
      'frequency_set',
      'mode_read',
      'mode_set',
      'meter_signal',
    ];
  },

  // Encode logical command → KIWI: marker string
  encode(command, params) {
    switch (command) {
      case 'getFrequency':  return 'KIWI:FREQ';
      case 'getMode':       return 'KIWI:MODE';
      case 'getSignal':     return 'KIWI:SIGNAL';
      case 'setFrequency':  return `KIWI:SET_FREQ:${params}`;
      case 'setMode':       return `KIWI:SET_MODE:${params}`;
      default:              return null;
    }
  },

  // Parse KIWI response → event object for RigStateStore
  parse(response) {
    if (!response) return null;

    if (response.startsWith('FREQ:')) {
      const hz = parseInt(response.slice(5), 10);
      return isNaN(hz) ? null : { type: 'frequency', value: hz };
    }

    if (response.startsWith('MODE:')) {
      const mode = response.slice(5);
      return { type: 'mode', value: MODE_MAP[mode] || mode };
    }

    if (response.startsWith('SIGNAL:')) {
      const raw = parseInt(response.slice(7), 10);
      if (isNaN(raw)) return null;
      // Approximate S-units from raw 0-255 (linear estimate)
      const sUnits = Math.min(15, (raw / 255) * 15);
      return { type: 'signal', value: raw, sUnits };
    }

    return null;
  },

  // Commands sent each polling cycle
  pollCommands() {
    return [
      'getFrequency',
      'getMode',
      'getSignal',
    ];
  },

  // No meter commands — S-meter handled via pollCommands
  // (KiwiSDR pushes S-meter in binary frames; no separate meter cycle needed)
};
