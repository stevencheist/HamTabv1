// --- CAT: Rig Manager ---
// Orchestrator: wires a driver to a transport, runs the polling loop,
// dispatches parsed events to RigStateStore.
// UI never talks to this — it subscribes to RigStateStore.

import { createCommandQueue } from './command-queue.js';

export function createRigManager(transport, driver, store, options = {}) {
  const pollingInterval = options.pollingInterval || 500; // ms between poll cycles
  const meterInterval = options.meterInterval || 200;     // ms between meter reads
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
        } else if (command.startsWith('set')) {
          // Set commands (setFrequency, setMode, setPTT, etc.) don't get a
          // response from Yaesu radios — write without waiting for reply.
          // Queue rate-limiting (60ms) prevents buffer sync issues.
          console.debug('[cat] SET →', command, encoded);
          await transport.writeCommand(encoded);
          return; // no response to parse
        } else {
          // Meter reads get a shorter timeout — don't stall queue on missed responses
          const isMeter = command === 'getSignal' || command === 'getSWR' || command === 'getPower';
          response = await transport.sendCommand(encoded, isMeter ? 500 : 2000);
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
        console.warn('[cat] PARSED →', event.type, event.value);
        store.applyEvent(event);
      }
    }
  }

  // --- Initialization: send init commands and read initial state ---
  async function initialize() {
    const initCmds = driver.init();
    for (const cmd of initCmds) {
      try {
        if (isBinary) {
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
          // Short timeout for init — set commands like AI0; may not respond
          const response = await transport.sendCommand(cmd, 800);
          handleResponse(response);
        }
      } catch (err) {
        // Expected for write-only commands (AI0;) — not a real error
        if (err.message && err.message.includes('Read timeout')) {
          console.debug('[cat] Init command no response (expected for set commands):', cmd);
        } else {
          console.warn('[cat] Init command failed:', cmd, err.message);
        }
      }
    }

    // Flush any stale data after init, then settle before polling starts
    await transport.flush();
    await new Promise(r => setTimeout(r, 200));
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
  // S-meter (getSignal) polls always; SWR/power only poll during TX.
  // Yaesu RM commands (SWR/power meters) return nothing in RX mode,
  // causing 2s timeouts that stall the entire command queue.
  function startMeters() {
    if (meterTimer) return;
    if (!driver.meterCommands) return; // driver doesn't support meters

    meterTimer = setInterval(() => {
      if (!connected) return;
      queue.push('getSignal', null, 0);
      // SWR/power meters only respond during TX — skip in RX to avoid timeouts
      const rigState = store.get();
      if (rigState.ptt) {
        queue.push('getSWR', null, 0);
        queue.push('getPower', null, 0);
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

    console.warn('[cat] rig-manager.connect — opening transport');
    const opened = await transport.connect(existingPort);
    if (!opened) {
      console.warn('[cat] rig-manager.connect — transport.connect returned false');
      return false;
    }

    // Flush stale data before init
    console.warn('[cat] rig-manager.connect — flushing');
    await transport.flush();

    // Settle delay — USB serial needs time after open before the radio
    // is ready to accept commands (especially FTDI/CP210x adapters)
    await new Promise(r => setTimeout(r, 500));

    connected = true;
    store.set({ connected: true });

    console.warn('[cat] rig-manager.connect — initializing');
    await initialize();
    console.warn('[cat] rig-manager.connect — starting polling + meters');
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
