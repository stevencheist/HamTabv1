// --- CAT: Rig Manager ---
// Orchestrator: wires a driver to a transport, runs the polling loop,
// dispatches parsed events to RigStateStore.
// UI never talks to this — it subscribes to RigStateStore.

import { createCommandQueue } from './command-queue.js';

export function createRigManager(transport, driver, store, options = {}) {
  const pollingInterval = options.pollingInterval || 500; // ms between poll cycles
  const meterInterval = options.meterInterval || 300;     // ms between meter reads
  const commandInterval = options.commandInterval || 60;  // ms between serial commands

  let pollTimer = null;
  let meterTimer = null;
  let connected = false;

  const isBinary = !!driver.binary;

  // --- Binary CI-V helpers ---
  // CI-V drivers encode as "CIV:fefe..." hex strings.
  // We convert to/from raw bytes for binary transport.
  function hexToBytes(hex) {
    return new Uint8Array(hex.match(/.{2}/g).map(h => parseInt(h, 16)));
  }

  function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // --- Command queue: rate-limits all serial writes ---
  const queue = createCommandQueue(
    async (command, params) => {
      const encoded = driver.encode(command, params);
      if (!encoded) return;

      try {
        let response;
        if (isBinary && encoded.startsWith('CIV:')) {
          // Binary protocol: decode hex → raw bytes → sendBinaryCommand → hex encode response
          const bytes = hexToBytes(encoded.slice(4));
          const rawBytes = await transport.sendBinaryCommand(bytes, 0xFD);
          // Skip the echo frame (radio echoes our command) — find the response frame
          // CI-V echo: FE FE <from> <to> ..., response: FE FE <to> <from> ...
          const frames = splitCivFrames(rawBytes);
          for (const frame of frames) {
            // Parse each frame — the echo will return null (ACK), response has data
            const hexResp = 'CIV:' + bytesToHex(frame);
            const event = driver.parse(hexResp);
            if (event) {
              store.applyEvent(event);
            }
          }
          return; // already parsed above
        } else {
          response = await transport.sendCommand(encoded);
        }
        handleResponse(response);
      } catch (err) {
        // Timeout or read error — log but don't crash the polling loop
        if (err.message && err.message.includes('timeout')) {
          console.warn('[cat] Command timeout:', command);
        } else {
          console.error('[cat] Command error:', command, err);
        }
      }
    },
    { minInterval: commandInterval }
  );

  // --- Split concatenated CI-V frames ---
  // A single read may contain echo + response: FE FE ... FD FE FE ... FD
  function splitCivFrames(bytes) {
    const frames = [];
    let start = -1;
    for (let i = 0; i < bytes.length; i++) {
      if (i < bytes.length - 1 && bytes[i] === 0xFE && bytes[i + 1] === 0xFE) {
        start = i;
      }
      if (bytes[i] === 0xFD && start >= 0) {
        frames.push(bytes.slice(start, i + 1));
        start = -1;
      }
    }
    return frames;
  }

  // --- Parse a raw ASCII response and apply to store ---
  function handleResponse(raw) {
    if (!raw) return;

    // Response may contain multiple concatenated responses (e.g., "FA000014074000;MD0C;")
    const terminator = driver.terminator || ';';
    const parts = raw.split(terminator).filter(Boolean);

    for (const part of parts) {
      const event = driver.parse(part + terminator);
      if (event) {
        store.applyEvent(event);
      }
    }
  }

  // --- Initialization: send init commands and read initial state ---
  async function initialize() {
    // Send init commands (e.g., ID; AI0; for Yaesu, getID for Icom)
    const initCmds = driver.init();
    for (const cmd of initCmds) {
      try {
        if (isBinary) {
          // Binary init: encode the logical command, then use binary path
          const encoded = driver.encode(cmd);
          if (encoded && encoded.startsWith('CIV:')) {
            const bytes = hexToBytes(encoded.slice(4));
            const rawBytes = await transport.sendBinaryCommand(bytes, 0xFD);
            const frames = splitCivFrames(rawBytes);
            for (const frame of frames) {
              const event = driver.parse('CIV:' + bytesToHex(frame));
              if (event) store.applyEvent(event);
            }
          }
        } else {
          const response = await transport.sendCommand(cmd);
          handleResponse(response);
        }
      } catch (err) {
        console.warn('[cat] Init command failed:', cmd, err.message);
      }
    }
  }

  // --- Polling: periodic read of frequency/mode/ptt ---
  function startPolling() {
    if (pollTimer) return;
    pollTimer = setInterval(() => {
      if (!connected) return;
      const commands = driver.pollCommands();
      for (const cmd of commands) {
        queue.push(cmd, null, 0); // normal priority
      }
    }, pollingInterval);
  }

  function stopPolling() {
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  // --- Meter streaming: adaptive rate reads for S-meter, SWR ---
  function startMeters() {
    if (meterTimer) return;
    if (!driver.meterCommands) return; // driver doesn't support meters

    meterTimer = setInterval(() => {
      if (!connected) return;
      const commands = driver.meterCommands();
      for (const cmd of commands) {
        queue.push(cmd, null, 0); // normal priority
      }
    }, meterInterval);
  }

  function stopMeters() {
    if (meterTimer) {
      clearInterval(meterTimer);
      meterTimer = null;
    }
  }

  // --- Connect: open transport, init radio, start polling ---
  async function connect(existingPort) {
    if (connected) return true;

    const opened = await transport.connect(existingPort);
    if (!opened) return false; // user cancelled port picker

    // Flush stale data before init
    await transport.flush();

    connected = true;
    store.set({ connected: true });

    await initialize();
    startPolling();
    startMeters();

    return true;
  }

  // --- Disconnect: stop polling, close transport, reset state ---
  async function disconnect() {
    connected = false;
    stopPolling();
    stopMeters();
    queue.clear();

    try {
      await transport.disconnect();
    } catch (err) {
      console.warn('[cat] Disconnect error:', err);
    }

    store.set({ connected: false });
  }

  // --- Send a command from UI (e.g., setFrequency, setPTT) ---
  function sendCommand(command, params, priority = 1) {
    if (!connected) return;
    queue.push(command, params, priority);
  }

  // --- Check connection state ---
  function isConnected() {
    return connected;
  }

  return {
    connect,
    disconnect,
    sendCommand,
    isConnected,
  };
}
