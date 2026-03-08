// --- CAT Transport: Web Serial API ---
// Adapted from sffoundry/gmrsprogramming SerialConnection (MIT)
// Changes from GMRS: ASCII line-oriented reads, configurable serial params,
// continuous polling instead of bulk read/write, no programming mode state
//
// Architecture: persistent reader loop fills an internal buffer.
// readUntil / readUntilByte consume from the buffer without ever calling
// reader.cancel(), which in Chrome WebSerial permanently closes the
// ReadableStream and breaks all subsequent reads.

// --- Connection States ---
export const ConnectionState = {
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
};

// --- Helpers ---
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();

// --- WebSerialTransport ---
export class WebSerialTransport {
  constructor(config = {}) {
    this.port = null;
    this.state = ConnectionState.DISCONNECTED;
    this._onStateChange = null;
    this._hwFlowControl = false;

    // Serial config — defaults for FT-DX10
    this.config = {
      baudRate: config.baudRate || 38400,
      dataBits: config.dataBits || 8,
      stopBits: config.stopBits || 2,   // FT-DX10 uses 2 stop bits
      parity: config.parity || 'none',
      flowControl: config.flowControl || 'hardware',
    };

    // --- Internal read buffer (persistent reader loop) ---
    this._rawBuffer = new Uint8Array(0); // binary accumulator
    this._reader = null;                 // active ReadableStreamDefaultReader
    this._readLoopRunning = false;
    this._readLoopPromise = null;
    this._onData = null;                 // resolve() for waiters
  }

  // --- API check ---
  static isSupported() {
    return 'serial' in navigator;
  }

  // --- State management ---
  onStateChange(callback) {
    this._onStateChange = callback;
  }

  _setState(newState) {
    this.state = newState;
    if (this._onStateChange) this._onStateChange(newState);
  }

  // --- Start persistent reader loop ---
  // Runs in the background, continuously reads from the serial port into
  // _rawBuffer. Never calls reader.cancel() — the loop ends only when
  // disconnect() cancels the reader.
  _startReadLoop() {
    if (this._readLoopRunning) {
      console.debug('[cat] Read loop already running — skipping start');
      return;
    }
    if (!this.port || !this.port.readable) {
      console.warn('[cat] Cannot start read loop — port or readable missing',
        { port: !!this.port, readable: !!(this.port && this.port.readable) });
      return;
    }

    this._readLoopRunning = true;
    try {
      this._reader = this.port.readable.getReader();
    } catch (err) {
      console.error('[cat] Failed to get reader:', err.message);
      this._readLoopRunning = false;
      return;
    }
    console.debug('[cat] Read loop started');

    this._readLoopPromise = (async () => {
      let exitReason = 'unknown';
      try {
        while (this._readLoopRunning) {
          const { value, done } = await this._reader.read();
          if (done) { exitReason = 'done'; break; }
          if (value && value.length > 0) {
            // Append to buffer
            const combined = new Uint8Array(this._rawBuffer.length + value.length);
            combined.set(this._rawBuffer, 0);
            combined.set(value, this._rawBuffer.length);
            this._rawBuffer = combined;

            // Wake any waiter
            if (this._onData) {
              const resolve = this._onData;
              this._onData = null;
              resolve();
            }
          }
        }
        if (!this._readLoopRunning) exitReason = 'stopped';
      } catch (err) {
        exitReason = err.name || err.message;
        // Stream closed or cancelled — expected during disconnect
        if (err.name !== 'AbortError' && this._readLoopRunning) {
          console.warn('[cat] Read loop error:', err.message);
        }
      } finally {
        console.warn('[cat] Read loop ended — reason:', exitReason);
        this._readLoopRunning = false;
        if (this._reader) {
          // Cancel first to resolve any pending read(), then release the lock.
          // releaseLock() throws if there are pending reads — cancel ensures there aren't.
          try { await this._reader.cancel(); } catch { /* ignore */ }
          try { this._reader.releaseLock(); } catch { /* ignore */ }
        }
        this._reader = null;
      }
    })();
  }

  // --- Stop reader loop ---
  async _stopReadLoop() {
    this._readLoopRunning = false;
    if (this._reader) {
      try { await this._reader.cancel(); } catch { /* ignore */ }
    }
    if (this._readLoopPromise) {
      try { await this._readLoopPromise; } catch { /* ignore */ }
    }
    this._reader = null;
    this._readLoopPromise = null;
  }

  // --- Wait for NEW data with timeout ---
  // Always waits for the read loop to deliver new bytes — never returns
  // early based on existing buffer content (the caller already checked).
  // This prevents busy-looping when the buffer has partial data without
  // the expected terminator.
  _waitForData(timeoutMs) {
    return new Promise(resolve => {
      const timer = setTimeout(() => {
        this._onData = null;
        resolve(false);
      }, timeoutMs);

      this._onData = () => {
        clearTimeout(timer);
        resolve(true);
      };
    });
  }

  // --- Connect ---
  // Opens the browser serial port picker, then opens with configured params.
  // Asserts DTR after open. Falls back to no flow control if HW not supported.
  // If the port is already open (reused from smart-detect), skips open and
  // just adopts the port reference.
  async connect(existingPort) {
    if (!WebSerialTransport.isSupported()) {
      throw new Error('Web Serial API not supported in this browser');
    }

    try {
      this._setState(ConnectionState.CONNECTING);

      // Use existing port or prompt user to pick one
      this.port = existingPort || await navigator.serial.requestPort();

      // If port is already open (reused transport from smart-detect), skip open
      if (this.port.readable && this.port.writable) {
        console.warn('[cat] Port already open — reusing connection',
          { readLoopRunning: this._readLoopRunning, hasReader: !!this._reader });
        // Restart read loop if not already running (e.g. when rig-manager
        // calls connect on the transport that smart-detect returned)
        if (!this._readLoopRunning) {
          this._startReadLoop();
          // If read loop failed to start (stream locked by stale reader),
          // close and reopen the port to get fresh readable/writable streams.
          // reader.cancel() in Chrome WebSerial can permanently close the
          // ReadableStream, so we can't just release — must reopen.
          if (!this._readLoopRunning) {
            console.warn('[cat] Stream locked — closing and reopening port');
            try { await this.port.close(); } catch { /* ignore */ }
            await this.port.open(this.config);
            await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
            this._startReadLoop();
          }
        }
        this._setState(ConnectionState.CONNECTED);
        return true;
      }

      // Try with configured flow control
      this._hwFlowControl = false;
      try {
        await this.port.open(this.config);
        if (this.config.flowControl === 'hardware') {
          this._hwFlowControl = true;
        }
      } catch (openErr) {
        // Fallback: some USB adapters don't support hardware flow control
        if (openErr.message && openErr.message.includes('flowControl')) {
          console.warn('[cat] HW flow control not supported, falling back');
          await this.port.open({ ...this.config, flowControl: 'none' });
        } else {
          throw openErr;
        }
      }

      // Assert DTR (and RTS if no HW flow control)
      if (this._hwFlowControl) {
        await this.port.setSignals({ dataTerminalReady: true });
      } else {
        await this.port.setSignals({ dataTerminalReady: true, requestToSend: true });
      }

      // Start persistent reader loop
      this._startReadLoop();

      this._setState(ConnectionState.CONNECTED);
      return true;
    } catch (err) {
      if (err.name === 'NotFoundError') {
        // User cancelled port picker — not an error
        this._setState(ConnectionState.DISCONNECTED);
        return false;
      }
      this._setState(ConnectionState.ERROR);
      throw err;
    }
  }

  // --- Disconnect ---
  // Stops read loop, deasserts DTR/RTS, closes port.
  async disconnect() {
    // Stop read loop first (cancels the reader — only place cancel is called)
    await this._stopReadLoop();
    this._rawBuffer = new Uint8Array(0);

    try {
      if (this.port) {
        try {
          const signals = { dataTerminalReady: false };
          if (!this._hwFlowControl) signals.requestToSend = false;
          await this.port.setSignals(signals);
        } catch { /* ignore signal errors */ }

        try {
          await this.port.close();
        } catch { /* ignore close errors */ }

        this.port = null;
      }
    } catch { /* ignore */ }
    this._setState(ConnectionState.DISCONNECTED);
  }

  // --- Write ASCII command ---
  // Sends a string command (e.g., "FA;" or "MD02;")
  async writeCommand(cmd) {
    if (!this.port || !this.port.writable) {
      throw new Error('Serial port not open');
    }
    const writer = this.port.writable.getWriter();
    try {
      await writer.write(encoder.encode(cmd));
    } finally {
      writer.releaseLock();
    }
  }

  // --- Write raw bytes ---
  async writeRaw(data) {
    if (!this.port || !this.port.writable) {
      throw new Error('Serial port not open');
    }
    const writer = this.port.writable.getWriter();
    try {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
      await writer.write(bytes);
    } finally {
      writer.releaseLock();
    }
  }

  // --- Read until terminator ---
  // Reads ASCII data from the internal buffer until the terminator character
  // (default ";") is found. Returns the complete response string including
  // terminator. Used for Yaesu/Kenwood/Elecraft ASCII protocols.
  async readUntil(terminator = ';', timeoutMs = 2000) {
    if (!this.port) {
      throw new Error('Serial port not open');
    }

    const deadline = Date.now() + timeoutMs;
    const termByte = terminator.charCodeAt(0);

    while (Date.now() < deadline) {
      // Check buffer for terminator byte
      const idx = this._rawBuffer.indexOf(termByte);
      if (idx >= 0) {
        // Extract up to and including the terminator
        const result = decoder.decode(this._rawBuffer.slice(0, idx + 1));
        this._rawBuffer = this._rawBuffer.slice(idx + 1);
        return result;
      }

      // Wait for more data (with remaining timeout)
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await this._waitForData(remaining);
    }

    // Timeout — dump whatever we have for debugging
    const partial = decoder.decode(this._rawBuffer);
    throw new Error(`Read timeout (readLoop=${this._readLoopRunning}): no terminator in response ("${partial}")`);
  }

  // --- Read until sentinel byte ---
  // For binary protocols (Icom CI-V). Reads until a specific byte is found.
  // Returns the complete frame including the sentinel.
  async readUntilByte(sentinel, timeoutMs = 2000) {
    if (!this.port) {
      throw new Error('Serial port not open');
    }

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      // Check buffer for sentinel byte
      const idx = this._rawBuffer.indexOf(sentinel);
      if (idx >= 0) {
        // Extract up to and including the sentinel
        const result = this._rawBuffer.slice(0, idx + 1);
        this._rawBuffer = this._rawBuffer.slice(idx + 1);
        return result;
      }

      // Wait for more data
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await this._waitForData(remaining);
    }

    throw new Error(`Read timeout: sentinel 0x${sentinel.toString(16)} not found`);
  }

  // --- Send binary command and read until sentinel ---
  // For CI-V: sends raw bytes and reads until EOM (0xFD).
  async sendBinaryCommand(data, sentinel = 0xFD, timeoutMs = 2000) {
    await this.writeRaw(data);
    return this.readUntilByte(sentinel, timeoutMs);
  }

  // --- Read exact bytes ---
  // For binary protocols (Icom CI-V). Reads exactly N bytes.
  async readBytes(length, timeoutMs = 2000) {
    if (!this.port) {
      throw new Error('Serial port not open');
    }

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      if (this._rawBuffer.length >= length) {
        const result = this._rawBuffer.slice(0, length);
        this._rawBuffer = this._rawBuffer.slice(length);
        return result;
      }

      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await this._waitForData(remaining);
    }

    throw new Error(`Read timeout: got ${this._rawBuffer.length}/${length} bytes`);
  }

  // --- Send command and read response ---
  // Writes an ASCII command and reads until terminator.
  async sendCommand(cmd, timeoutMs = 2000) {
    await this.writeCommand(cmd);
    return this.readUntil(';', timeoutMs);
  }

  // --- Flush ---
  // Clear stale data from the internal buffer.
  async flush() {
    this._rawBuffer = new Uint8Array(0);
    // Brief wait for any in-flight serial data to arrive, then clear again
    await new Promise(r => setTimeout(r, 200));
    this._rawBuffer = new Uint8Array(0);
  }
}
