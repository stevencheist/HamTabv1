// --- CAT Transport: Web Serial API ---
// Adapted from sffoundry/gmrsprogramming SerialConnection (MIT)
// Changes from GMRS: ASCII line-oriented reads, configurable serial params,
// continuous polling instead of bulk read/write, no programming mode state

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

  // --- Connect ---
  // Opens the browser serial port picker, then opens with configured params.
  // Asserts DTR after open. Falls back to no flow control if HW not supported.
  async connect(existingPort) {
    if (!WebSerialTransport.isSupported()) {
      throw new Error('Web Serial API not supported in this browser');
    }

    try {
      this._setState(ConnectionState.CONNECTING);

      // Use existing port or prompt user to pick one
      this.port = existingPort || await navigator.serial.requestPort();

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
  // Deasserts DTR/RTS before closing to prevent radio hangs.
  async disconnect() {
    try {
      if (this.port) {
        try {
          const signals = { dataTerminalReady: false };
          if (!this._hwFlowControl) signals.requestToSend = false;
          await this.port.setSignals(signals);
        } catch { /* ignore signal errors */ }

        try {
          // Cancel any active reader
          if (this.port.readable && this.port.readable.locked) {
            // Reader will be released by whoever holds the lock
          }
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
  // Reads ASCII data until the terminator character (default ";") is found.
  // Returns the complete response string including terminator.
  // Used for Yaesu/Kenwood/Elecraft ASCII protocols.
  async readUntil(terminator = ';', timeoutMs = 2000) {
    if (!this.port || !this.port.readable) {
      throw new Error('Serial port not open');
    }

    let buffer = '';
    const reader = this.port.readable.getReader();
    const timer = setTimeout(() => reader.cancel(), timeoutMs);

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          if (buffer.includes(terminator)) break;
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    } finally {
      clearTimeout(timer);
      reader.releaseLock();
    }

    if (!buffer.includes(terminator)) {
      throw new Error(`Read timeout: no terminator in response ("${buffer}")`);
    }

    return buffer;
  }

  // --- Read until sentinel byte ---
  // For binary protocols (Icom CI-V). Reads until a specific byte is found.
  // Returns the complete frame including the sentinel.
  async readUntilByte(sentinel, timeoutMs = 2000) {
    if (!this.port || !this.port.readable) {
      throw new Error('Serial port not open');
    }

    const chunks = [];
    let totalLen = 0;
    let found = false;

    const reader = this.port.readable.getReader();
    const timer = setTimeout(() => reader.cancel(), timeoutMs);

    try {
      while (!found) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLen += value.length;
          // Check if sentinel byte is in this chunk
          for (let i = 0; i < value.length; i++) {
            if (value[i] === sentinel) {
              found = true;
              break;
            }
          }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') throw err;
    } finally {
      clearTimeout(timer);
      reader.releaseLock();
    }

    if (!found) {
      throw new Error(`Read timeout: sentinel 0x${sentinel.toString(16)} not found`);
    }

    // Assemble into single Uint8Array
    const result = new Uint8Array(totalLen);
    let offset = 0;
    for (const chunk of chunks) {
      result.set(chunk, offset);
      offset += chunk.length;
    }

    // Trim to just after the sentinel byte
    const sentinelIdx = result.indexOf(sentinel);
    return result.slice(0, sentinelIdx + 1);
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
    if (!this.port || !this.port.readable) {
      throw new Error('Serial port not open');
    }

    const result = new Uint8Array(length);
    let offset = 0;

    const reader = this.port.readable.getReader();
    const timer = setTimeout(() => reader.cancel(), timeoutMs);

    try {
      while (offset < length) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const remaining = length - offset;
          const chunk = value.length > remaining ? value.slice(0, remaining) : value;
          result.set(chunk, offset);
          offset += chunk.length;
        }
      }
    } finally {
      clearTimeout(timer);
      reader.releaseLock();
    }

    if (offset < length) {
      throw new Error(`Read timeout: got ${offset}/${length} bytes`);
    }

    return result;
  }

  // --- Send command and read response ---
  // Writes an ASCII command and reads until terminator.
  async sendCommand(cmd, timeoutMs = 2000) {
    await this.writeCommand(cmd);
    return this.readUntil(';', timeoutMs);
  }

  // --- Flush ---
  // Clear stale data from the serial buffer before starting.
  async flush() {
    if (!this.port || !this.port.readable) return;

    const reader = this.port.readable.getReader();
    const timer = setTimeout(() => reader.cancel(), 200);

    try {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    } catch { /* expected — timeout cancels the read */ }
    finally {
      clearTimeout(timer);
      reader.releaseLock();
    }
  }
}
