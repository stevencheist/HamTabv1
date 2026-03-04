// --- CAT Transport: TCI WebSocket ---
// Connects to TCI-compatible SDR applications (Thetis, ExpertSDR, SunSDR)
// via native WebSocket on ws://{host}:{port}.
// TCI pushes state updates — polling reads from local cache (no network round-trip).
// Lanmode-first: ws:// from https:// only works for localhost (secure context).

import { ConnectionState } from './web-serial.js';

// --- TCI WebSocket Transport ---
export class TciWebSocketTransport {
  constructor(config = {}) {
    this.host = config.host || 'localhost';
    this.port = config.port || 50001;
    this.state = ConnectionState.DISCONNECTED;
    this._onStateChange = null;
    this._ws = null;
    this._ready = false; // true after TCI server sends READY

    // State cache — updated by WebSocket push notifications
    this.cache = {
      frequency: 0,
      frequencyB: 0,
      mode: '',
      ptt: false,
      signal: 0,      // S-meter (dBm or raw)
      swr: 0,
      power: 0,
    };
  }

  static isSupported() {
    return typeof WebSocket !== 'undefined';
  }

  onStateChange(callback) {
    this._onStateChange = callback;
  }

  _setState(newState) {
    this.state = newState;
    if (this._onStateChange) this._onStateChange(newState);
  }

  // --- Connect: open WebSocket to TCI server ---
  async connect() {
    if (this._ws) return true;

    return new Promise((resolve) => {
      this._setState(ConnectionState.CONNECTING);

      const url = `ws://${this.host}:${this.port}`;
      try {
        this._ws = new WebSocket(url);
      } catch (err) {
        console.error('[tci] WebSocket constructor error:', err);
        this._setState(ConnectionState.ERROR);
        resolve(false);
        return;
      }

      // Timeout if server doesn't respond within 5s
      const timeout = setTimeout(() => {
        if (this.state === ConnectionState.CONNECTING) {
          console.warn('[tci] Connection timeout');
          this._cleanup();
          this._setState(ConnectionState.DISCONNECTED);
          resolve(false);
        }
      }, 5000);

      this._ws.onopen = () => {
        clearTimeout(timeout);
        this._setState(ConnectionState.CONNECTED);
        this._ready = true;
        resolve(true);
      };

      this._ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };

      this._ws.onclose = () => {
        clearTimeout(timeout);
        this._cleanup();
        if (this.state === ConnectionState.CONNECTING) {
          resolve(false);
        }
      };

      this._ws.onerror = (err) => {
        clearTimeout(timeout);
        console.error('[tci] WebSocket error:', err);
        this._cleanup();
        this._setState(ConnectionState.ERROR);
        if (this.state !== ConnectionState.CONNECTED) {
          resolve(false);
        }
      };
    });
  }

  // --- Parse TCI push notifications and update cache ---
  _handleMessage(data) {
    if (!data || typeof data !== 'string') return;

    // TCI messages are semicolon-terminated, may arrive in batches
    const messages = data.split(';').filter(Boolean);

    for (const msg of messages) {
      const trimmed = msg.trim();

      // VFO:receiver,sub_receiver,frequency
      // VFO:0,0,14074000 → VFO A frequency
      // VFO:0,1,14076000 → VFO B frequency
      if (trimmed.startsWith('VFO:')) {
        const parts = trimmed.slice(4).split(',');
        if (parts.length >= 3) {
          const sub = parseInt(parts[1], 10);
          const freq = parseInt(parts[2], 10);
          if (!isNaN(freq)) {
            if (sub === 0) this.cache.frequency = freq;
            else if (sub === 1) this.cache.frequencyB = freq;
          }
        }
        continue;
      }

      // MODULATION:receiver,mode
      // MODULATION:0,USB
      if (trimmed.startsWith('MODULATION:')) {
        const parts = trimmed.slice(11).split(',');
        if (parts.length >= 2) {
          this.cache.mode = parts[1].trim();
        }
        continue;
      }

      // TRX:receiver,enabled  (TX state)
      // TRX:0,true → transmitting
      // TRX:0,false → receiving
      if (trimmed.startsWith('TRX:')) {
        const parts = trimmed.slice(4).split(',');
        if (parts.length >= 2) {
          this.cache.ptt = parts[1].trim().toLowerCase() === 'true';
        }
        continue;
      }

      // RX_SENSORS:receiver,value  (S-meter in dBm)
      if (trimmed.startsWith('RX_SENSORS:')) {
        const parts = trimmed.slice(11).split(',');
        if (parts.length >= 2) {
          const val = parseFloat(parts[1]);
          if (!isNaN(val)) this.cache.signal = val;
        }
        continue;
      }

      // TX_SENSORS:receiver,power,swr
      if (trimmed.startsWith('TX_SENSORS:')) {
        const parts = trimmed.slice(11).split(',');
        if (parts.length >= 2) {
          const pwr = parseFloat(parts[1]);
          if (!isNaN(pwr)) this.cache.power = pwr;
        }
        if (parts.length >= 3) {
          const swr = parseFloat(parts[2]);
          if (!isNaN(swr)) this.cache.swr = swr;
        }
        continue;
      }

      // RX_CHANNEL_SENSORS:receiver,sub_receiver,dbm  (per-channel S-meter)
      if (trimmed.startsWith('RX_CHANNEL_SENSORS:')) {
        const parts = trimmed.slice(19).split(',');
        if (parts.length >= 3) {
          const dbm = parseFloat(parts[2]);
          if (!isNaN(dbm)) this.cache.signal = dbm;
        }
        continue;
      }
    }
  }

  // --- Send a TCI command ---
  // GET commands return cached values (no network round-trip).
  // SET commands are sent over the WebSocket.
  async sendCommand(cmd) {
    if (!cmd) return '';

    // GET commands → return cached value formatted as a TCI response
    // The TCI driver's parse() will turn these into rig state events
    if (cmd.startsWith('GET_VFO:0,0')) return `VFO:0,0,${this.cache.frequency};`;
    if (cmd.startsWith('GET_VFO:0,1')) return `VFO:0,1,${this.cache.frequencyB};`;
    if (cmd.startsWith('GET_MODULATION:')) return `MODULATION:0,${this.cache.mode};`;
    if (cmd.startsWith('GET_TRX:')) return `TRX:0,${this.cache.ptt};`;
    if (cmd.startsWith('GET_RX_SENSORS')) return `RX_SENSORS:0,${this.cache.signal};`;
    // TX_SENSORS returns power + SWR as separate "messages" so the
    // rig-manager's response splitter feeds both events to the driver parser
    if (cmd.startsWith('GET_TX_SENSORS')) return `TX_POWER:0,${this.cache.power};TX_SWR:0,${this.cache.swr};`;

    // SET commands → send over WebSocket
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(cmd);
    }
    return '';
  }

  // --- Write a command without reading response ---
  async writeCommand(cmd) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(cmd);
    }
  }

  // --- Disconnect ---
  async disconnect() {
    this._cleanup();
    this._setState(ConnectionState.DISCONNECTED);
  }

  _cleanup() {
    if (this._ws) {
      try { this._ws.close(); } catch { /* ignore */ }
      this._ws = null;
    }
    this._ready = false;
    this.cache = { frequency: 0, frequencyB: 0, mode: '', ptt: false, signal: 0, swr: 0, power: 0 };
  }

  // --- Stubs (not needed for WebSocket transport) ---
  async flush() {}
  async writeRaw() {}
  async readUntil() { return ''; }
  async readUntilByte() { return new Uint8Array(0); }
  async readBytes() { return new Uint8Array(0); }
  async sendBinaryCommand() { return new Uint8Array(0); }
}
