// --- CAT Driver: TCI (Network) ---
// Covers: Thetis, ExpertSDR2/3, SunSDR2 — any app exposing a TCI WebSocket server.
// Protocol: ASCII commands terminated with ";" over WebSocket.
// TCI pushes state changes — GET commands read from transport cache.
// Reference: https://github.com/ExpertElectronics/TCI

// --- TCI mode names → HamTab normalized mode names ---
// TCI uses standard mode names (USB, LSB, CW, AM, FM, etc.)
// Map non-standard variants to HamTab conventions
const TCI_MODE_MAP = {
  'USB':    'USB',
  'LSB':    'LSB',
  'CW':     'CW-U',
  'CWL':    'CW-L',
  'CWU':    'CW-U',
  'AM':     'AM',
  'SAM':    'AM',
  'FM':     'FM',
  'NFM':    'FM-N',
  'WFM':    'FM',
  'DIGU':   'DATA-U',  // Digital upper (FT8, etc.)
  'DIGL':   'DATA-L',  // Digital lower
  'DSB':    'USB',
  'DRM':    'DATA-U',
  'SPEC':   'USB',
};

// Reverse: HamTab mode → TCI mode name
const MODE_TO_TCI = {
  'USB':    'USB',
  'LSB':    'LSB',
  'CW-U':   'CW',
  'CW-L':   'CWL',
  'AM':     'AM',
  'FM':     'FM',
  'FM-N':   'NFM',
  'DATA-U': 'DIGU',
  'DATA-L': 'DIGL',
  'RTTY-U': 'DIGU',
  'RTTY-L': 'DIGL',
};

// --- S-meter: dBm → S-units conversion ---
// TCI sends RX_SENSORS as dBm. Convert to S-units for the UI.
// S9 = -73 dBm, each S-unit = 6 dB
function dbmToSUnits(dbm) {
  if (dbm >= -73) {
    // S9 and above — report as S9 + dB over
    return 9 + (dbm + 73) / 6;
  }
  // Below S9 — S1 = -121 dBm
  const sUnits = (dbm + 127) / 6;
  return Math.max(0, Math.min(9, sUnits));
}

// --- Driver interface ---
export const tciDriver = {
  name: 'tci',
  label: 'TCI (Network)',
  terminator: ';',
  binary: false,

  // --- Initialization commands ---
  // After WebSocket connects, subscribe to TCI push notifications
  init() {
    return [
      'VFO:0,0;',          // Request initial VFO A frequency
      'VFO:0,1;',          // Request initial VFO B frequency
      'MODULATION:0;',     // Request initial mode
      'TRX:0;',            // Request initial TX state
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
    ];
  },

  // --- Polling commands ---
  // These read from the TCI transport's cache — effectively free
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

  // --- Command encoding ---
  // Converts HamTab logical commands → TCI wire format
  encode(command, params) {
    switch (command) {
      case 'getFrequency':  return 'GET_VFO:0,0;';
      case 'setFrequency':  return `VFO:0,0,${params};`;
      case 'getFrequencyB': return 'GET_VFO:0,1;';
      case 'setFrequencyB': return `VFO:0,1,${params};`;
      case 'getMode':       return 'GET_MODULATION:0;';
      case 'setMode': {
        const tciMode = MODE_TO_TCI[params] || params;
        return `MODULATION:0,${tciMode};`;
      }
      case 'getPTT':        return 'GET_TRX:0;';
      case 'setPTT':        return `TRX:0,${params ? 'true' : 'false'};`;
      case 'getSignal':     return 'GET_RX_SENSORS;';
      case 'getSWR':        return 'GET_TX_SENSORS;';
      case 'getPower':      return 'GET_TX_SENSORS;';
      // TCI init commands pass through as-is (they're already TCI format)
      default:
        if (command.endsWith(';')) return command;
        return null;
    }
  },

  // --- Response parsing ---
  // Parses TCI response strings into {type, value} events for RigStateStore
  parse(response) {
    if (!response) return null;

    // Strip trailing semicolons
    const resp = response.endsWith(';') ? response.slice(0, -1) : response;

    // VFO:receiver,sub_receiver,frequency
    if (resp.startsWith('VFO:')) {
      const parts = resp.slice(4).split(',');
      if (parts.length >= 3) {
        const sub = parseInt(parts[1], 10);
        const freq = parseInt(parts[2], 10);
        if (isNaN(freq)) return null;
        return { type: sub === 0 ? 'frequency' : 'frequencyB', value: freq };
      }
      return null;
    }

    // MODULATION:receiver,mode
    if (resp.startsWith('MODULATION:')) {
      const parts = resp.slice(11).split(',');
      if (parts.length >= 2) {
        const rawMode = parts[1].trim();
        const mapped = TCI_MODE_MAP[rawMode] || rawMode;
        return { type: 'mode', value: mapped };
      }
      return null;
    }

    // TRX:receiver,enabled
    if (resp.startsWith('TRX:')) {
      const parts = resp.slice(4).split(',');
      if (parts.length >= 2) {
        return { type: 'ptt', value: parts[1].trim().toLowerCase() === 'true' };
      }
      return null;
    }

    // RX_SENSORS:receiver,dbm
    if (resp.startsWith('RX_SENSORS:')) {
      const parts = resp.slice(11).split(',');
      if (parts.length >= 2) {
        const dbm = parseFloat(parts[1]);
        if (isNaN(dbm)) return null;
        const sUnits = dbmToSUnits(dbm);
        // Map to raw 0-255 scale (same as Yaesu SM0) for UI compatibility
        const raw = Math.round(Math.min(255, Math.max(0, sUnits * 17)));
        return { type: 'signal', value: raw, sUnits };
      }
      return null;
    }

    // RX_CHANNEL_SENSORS:receiver,sub_receiver,dbm
    if (resp.startsWith('RX_CHANNEL_SENSORS:')) {
      const parts = resp.slice(19).split(',');
      if (parts.length >= 3) {
        const dbm = parseFloat(parts[2]);
        if (isNaN(dbm)) return null;
        const sUnits = dbmToSUnits(dbm);
        const raw = Math.round(Math.min(255, Math.max(0, sUnits * 17)));
        return { type: 'signal', value: raw, sUnits };
      }
      return null;
    }

    // TX_SENSORS:receiver,power,swr (from WebSocket push)
    if (resp.startsWith('TX_SENSORS:')) {
      const parts = resp.slice(11).split(',');
      if (parts.length >= 2) {
        const pwr = parseFloat(parts[1]);
        if (!isNaN(pwr)) return { type: 'powerMeter', value: pwr, raw: pwr };
      }
      return null;
    }

    // TX_POWER / TX_SWR — synthetic split messages from TCI transport cache reads
    if (resp.startsWith('TX_POWER:')) {
      const parts = resp.slice(9).split(',');
      if (parts.length >= 2) {
        const pwr = parseFloat(parts[1]);
        if (!isNaN(pwr)) return { type: 'powerMeter', value: pwr, raw: pwr };
      }
      return null;
    }
    if (resp.startsWith('TX_SWR:')) {
      const parts = resp.slice(7).split(',');
      if (parts.length >= 2) {
        const swr = parseFloat(parts[1]);
        if (!isNaN(swr)) return { type: 'swr', value: swr, raw: swr };
      }
      return null;
    }

    return null;
  },
};
