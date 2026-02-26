// --- CAT: Smart Radio Detection ---
// Probes a serial port with manufacturer-specific commands to identify the radio.
// Returns { profileId, protocol, serialConfig } or null if no radio detected.
// Probe order optimized: most common configs first, then fallbacks.

import { WebSerialTransport } from './transports/web-serial.js';
import profiles from './rig-profiles.json';

// --- Probe definitions ---
// Each probe: { name, serialConfig, send, parse(response) → { profileId, protocol } | null }
const PROBES = [
  // 1. Yaesu 38400/8N1 — newer radios: FT-DX10, FT-710, FT-DX101D/MP
  {
    name: 'Yaesu 38400',
    serialConfig: { baudRate: 38400, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' },
    send: 'ID;',
    terminator: ';',
    parse(resp) { return parseAsciiId(resp, 'yaesu_ascii'); },
  },
  // 2. Kenwood 115200/8N1 — TS-890S, TS-590SG (also catches Elecraft responding to ID;)
  {
    name: 'Kenwood 115200',
    serialConfig: { baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' },
    send: 'ID;',
    terminator: ';',
    parse(resp) {
      // Try kenwood first, then elecraft (which also responds to ID;)
      return parseAsciiId(resp, 'kenwood_ascii') || parseAsciiId(resp, 'elecraft_ascii');
    },
  },
  // 3. Elecraft 38400/8N1 — K4, K3S, KX3, KX2 (OM; command for model identification)
  {
    name: 'Elecraft 38400',
    serialConfig: { baudRate: 38400, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' },
    send: 'OM;',
    terminator: ';',
    parse(resp) {
      if (!resp || !resp.startsWith('OM')) return null;
      // Elecraft OM response contains option flags + product ID
      return matchElecraftOM(resp);
    },
  },
  // 4. Icom 115200/8N1 — IC-7610, IC-9700, IC-705 (USB default)
  {
    name: 'Icom 115200',
    serialConfig: { baudRate: 115200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' },
    binary: true,
    send: null,
    sendBytes: new Uint8Array([0xFE, 0xFE, 0x00, 0xE0, 0x19, 0xFD]),
    parse(resp) {
      if (!resp || resp.length < 6) return null;
      if (resp[0] !== 0xFE || resp[1] !== 0xFE) return null;
      return matchCivProfile(resp[2]);
    },
  },
  // 5. Icom 19200/8N1 — IC-7300, IC-7100 (CI-V jack / older USB default)
  {
    name: 'Icom 19200',
    serialConfig: { baudRate: 19200, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' },
    binary: true,
    send: null,
    sendBytes: new Uint8Array([0xFE, 0xFE, 0x00, 0xE0, 0x19, 0xFD]),
    parse(resp) {
      if (!resp || resp.length < 6) return null;
      if (resp[0] !== 0xFE || resp[1] !== 0xFE) return null;
      return matchCivProfile(resp[2]);
    },
  },
  // 6. Yaesu 4800/8N2 — older radios: FT-891, FT-991A, FT-450D, FT-950
  {
    name: 'Yaesu 4800',
    serialConfig: { baudRate: 4800, dataBits: 8, stopBits: 2, parity: 'none', flowControl: 'none' },
    send: 'ID;',
    terminator: ';',
    parse(resp) { return parseAsciiId(resp, 'yaesu_ascii'); },
  },
  // 7. Kenwood 9600/8N1 — TS-480
  {
    name: 'Kenwood 9600',
    serialConfig: { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' },
    send: 'ID;',
    terminator: ';',
    parse(resp) { return parseAsciiId(resp, 'kenwood_ascii'); },
  },
  // 8. Fallback: Yaesu 9600/8N2 (user-changed baud on older Yaesu)
  {
    name: 'Yaesu 9600',
    serialConfig: { baudRate: 9600, dataBits: 8, stopBits: 2, parity: 'none', flowControl: 'none' },
    send: 'ID;',
    terminator: ';',
    parse(resp) { return parseAsciiId(resp, 'yaesu_ascii'); },
  },
  // 9. Fallback: Icom 9600 (rare CI-V jack config)
  {
    name: 'Icom 9600',
    serialConfig: { baudRate: 9600, dataBits: 8, stopBits: 1, parity: 'none', flowControl: 'none' },
    binary: true,
    send: null,
    sendBytes: new Uint8Array([0xFE, 0xFE, 0x00, 0xE0, 0x19, 0xFD]),
    parse(resp) {
      if (!resp || resp.length < 6) return null;
      if (resp[0] !== 0xFE || resp[1] !== 0xFE) return null;
      return matchCivProfile(resp[2]);
    },
  },
];

// --- Parse ASCII ID response and match to profile ---
function parseAsciiId(resp, protocolFamily) {
  if (!resp || typeof resp !== 'string') return null;

  // Yaesu format: ID####; (4-digit, zero-padded)
  // Kenwood format: ID###; (3-digit)
  const match = resp.match(/^ID(\d{3,4});?/);
  if (!match) return null;

  const modelId = match[1];

  // Disambiguate: 4-digit = Yaesu, 3-digit = Kenwood/Elecraft
  if (modelId.length === 4 && protocolFamily !== 'yaesu_ascii') return null;
  if (modelId.length === 3 && protocolFamily === 'yaesu_ascii') return null;

  return matchProfile(protocolFamily, modelId);
}

// --- Match Elecraft OM; response to a specific model ---
function matchElecraftOM(resp) {
  // OM response format varies: K4 has different format, K3/KX3/KX2 share a format
  // Common: OM AP----H$; where the product ID character identifies the model
  // KX2 product ID: 01, KX3 product ID: 02
  // K4: different OM format with "K4" in response
  // K3S: contains "S" flag distinguishing from K3

  if (resp.includes('K4')) {
    return matchProfile('elecraft_ascii', 'K4');
  }
  if (resp.includes('K3S') || (resp.includes('K3') && resp.includes('S'))) {
    return matchProfile('elecraft_ascii', 'K3S');
  }

  // Parse product ID from option flags — look for 2-digit product ID
  const pidMatch = resp.match(/OM\s*AP.*?(\d{2})/);
  if (pidMatch) {
    const pid = pidMatch[1];
    if (pid === '01') return matchProfile('elecraft_ascii', 'KX2');
    if (pid === '02') return matchProfile('elecraft_ascii', '017'); // KX3 uses modelId 017
  }

  // Fallback: detected Elecraft but can't determine specific model
  return matchProfile('elecraft_ascii', null);
}

// --- Match a modelId + protocol to a profile in rig-profiles.json ---
function matchProfile(protocolFamily, modelId) {
  for (const [id, profile] of Object.entries(profiles.profiles)) {
    if (id === 'demo') continue;
    if (profile.protocol.family !== protocolFamily) continue;
    if (modelId && profile.modelId && profile.modelId === modelId) {
      return { profileId: id, protocol: protocolFamily, serialConfig: profile.serial };
    }
    // If no modelId to compare, return first profile with matching protocol
    if (!modelId) {
      return { profileId: id, protocol: protocolFamily, serialConfig: profile.serial };
    }
  }

  // Partial match: right protocol family but unknown model — return first match
  if (modelId) {
    for (const [id, profile] of Object.entries(profiles.profiles)) {
      if (id === 'demo') continue;
      if (profile.protocol.family === protocolFamily) {
        return { profileId: id, protocol: protocolFamily, serialConfig: profile.serial, unknownModel: modelId };
      }
    }
  }

  return null;
}

// --- Match CI-V address to Icom profile ---
function matchCivProfile(civAddr) {
  const addrHex = '0x' + civAddr.toString(16).padStart(2, '0').toUpperCase();
  const addrShort = civAddr.toString(16).toUpperCase();

  for (const [id, profile] of Object.entries(profiles.profiles)) {
    if (id === 'demo') continue;
    if (profile.protocol.family !== 'icom_civ') continue;
    // Match by civAddress (e.g., "0x94") or modelId (e.g., "94")
    const profCiv = (profile.protocol.civAddress || '').toUpperCase();
    const profId = (profile.modelId || '').toUpperCase();
    if (profCiv === addrHex || profId === addrShort) {
      return { profileId: id, protocol: 'icom_civ', serialConfig: profile.serial };
    }
  }

  // Unknown Icom radio — return generic icom match
  for (const [id, profile] of Object.entries(profiles.profiles)) {
    if (id === 'demo') continue;
    if (profile.protocol.family === 'icom_civ') {
      return { profileId: id, protocol: 'icom_civ', serialConfig: profile.serial, unknownCivAddr: addrHex };
    }
  }

  return null;
}

// --- Smart Detect: probe a serial port ---
export async function smartDetect(port, onProgress) {
  const total = PROBES.length;

  for (let i = 0; i < PROBES.length; i++) {
    const probe = PROBES[i];

    if (onProgress) {
      onProgress({ step: i + 1, total, trying: probe.name });
    }

    try {
      const result = await runProbe(port, probe);
      if (result) {
        return result;
      }
    } catch (err) {
      // Probe failed — continue to next
      console.debug(`[smart-detect] ${probe.name} failed:`, err.message);
    }

    // 100ms delay between probes for port settle
    await new Promise(r => setTimeout(r, 100));
  }

  return null; // no radio detected
}

// --- Run a single probe ---
async function runProbe(port, probe) {
  const transport = new WebSerialTransport(probe.serialConfig);

  try {
    await transport.connect(port);
    await transport.flush();

    let response;
    if (probe.binary) {
      // Binary probe (Icom CI-V)
      await transport.writeRaw(probe.sendBytes);
      response = await readWithTimeout(transport, 'binary', 1500);
    } else {
      // ASCII probe
      response = await transport.sendCommand(probe.send);
      if (!response) {
        // Try reading separately if sendCommand returned empty
        response = await readWithTimeout(transport, 'ascii', 1500);
      }
    }

    const result = probe.parse(response);
    await transport.disconnect();
    return result;
  } catch (err) {
    try { await transport.disconnect(); } catch (_) { /* ignore */ }
    throw err;
  }
}

// --- Read with timeout ---
async function readWithTimeout(transport, mode, timeoutMs) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(mode === 'binary' ? new Uint8Array(0) : ''), timeoutMs);

    if (mode === 'binary') {
      transport.readUntilByte(0xFD).then(data => {
        clearTimeout(timer);
        resolve(data);
      }).catch(() => {
        clearTimeout(timer);
        resolve(new Uint8Array(0));
      });
    } else {
      transport.readUntil(';').then(data => {
        clearTimeout(timer);
        resolve(data);
      }).catch(() => {
        clearTimeout(timer);
        resolve('');
      });
    }
  });
}
