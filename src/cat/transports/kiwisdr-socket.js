// --- CAT Transport: KiwiSDR WebSocket ---
// Connects to a KiwiSDR receiver via WebSocket.
// Maintains a cached state (frequency, mode, S-meter) updated by incoming
// WebSocket messages. When RigManager polls via sendCommand(), the transport
// returns cached state instantly — no round-trip needed.
// This mirrors the InMemoryTransport + FakeRadioEngine pattern for demo mode.

import { ConnectionState } from './web-serial.js';

// --- KiwiSDR mode strings → HamTab CAT mode strings ---
const KIWI_MODE_MAP = {
  am:   'AM',
  usb:  'USB',
  lsb:  'LSB',
  cw:   'CW-U',
  cwn:  'CW-U',
  nbfm: 'FM',
  iq:   'USB',
};

// --- HamTab CAT mode strings → KiwiSDR mode strings ---
const CAT_TO_KIWI_MODE = {
  'AM':     'am',
  'USB':    'usb',
  'LSB':    'lsb',
  'CW-U':   'cw',
  'CW-L':   'cw',
  'FM':     'nbfm',
  'DATA-U': 'usb',
  'DATA-L': 'lsb',
};

export class KiwiSdrSocketTransport {
  constructor({ host, port = 8073, password = '' } = {}) {
    this.host = host;
    this.port = port;
    this.password = password;
    this.state = ConnectionState.DISCONNECTED;
    this._onStateChange = null;

    // WebSocket internals
    this._ws = null;
    this._keepaliveTimer = null;
    this._connectTimeout = null;

    // Cached receiver state — updated by incoming messages
    this._frequency = 14074000; // Hz — default 20m FT8
    this._mode = 'USB';
    this._smeter = 0;           // raw 0-255 scale
    this._serverName = '';
    this._onAudioData = null;   // callback(Int16Array) — receives PCM samples
    this._audioInitDone = false; // gate: only respond to audio_init once
  }

  static isSupported() {
    return typeof WebSocket !== 'undefined';
  }

  onStateChange(callback) {
    this._onStateChange = callback;
  }

  onAudioData(callback) {
    this._onAudioData = callback;
  }

  _setState(newState) {
    this.state = newState;
    if (this._onStateChange) this._onStateChange(newState);
  }

  // --- Connect to KiwiSDR WebSocket ---
  async connect() {
    if (!KiwiSdrSocketTransport.isSupported()) {
      throw new Error('WebSocket not supported');
    }

    this._setState(ConnectionState.CONNECTING);

    return new Promise((resolve, reject) => {
      // KiwiSDR SND endpoint — NNNN is a random 4-digit session ID
      const session = Math.floor(1000 + Math.random() * 9000);
      const url = `ws://${this.host}:${this.port}/kiwi/${session}/SND`;

      try {
        this._ws = new WebSocket(url);
        this._ws.binaryType = 'arraybuffer';
      } catch (err) {
        this._setState(ConnectionState.ERROR);
        reject(new Error(`WebSocket creation failed: ${err.message}`));
        return;
      }

      // 10s connection timeout
      this._connectTimeout = setTimeout(() => {
        if (this.state === ConnectionState.CONNECTING) {
          this._ws.close();
          this._setState(ConnectionState.ERROR);
          reject(new Error('KiwiSDR connection timeout'));
        }
      }, 10000);

      this._ws.onopen = () => {
        clearTimeout(this._connectTimeout);
        // Only send auth on open — remaining setup (AR OK, tune, compression)
        // is deferred until the server sends audio_init (see _handleTextMsg)
        this._send(`SET auth t=kiwi p=${this.password}`);

        // 30s keepalive to prevent server disconnect
        this._keepaliveTimer = setInterval(() => {
          this._send('SET keepalive');
        }, 30000);

        this._setState(ConnectionState.CONNECTED);
        resolve(true);
      };

      this._ws.onmessage = (event) => {
        this._handleMessage(event);
      };

      this._ws.onerror = () => {
        clearTimeout(this._connectTimeout);
        if (this.state === ConnectionState.CONNECTING) {
          this._setState(ConnectionState.ERROR);
          reject(new Error('KiwiSDR WebSocket error'));
        }
      };

      this._ws.onclose = () => {
        clearTimeout(this._connectTimeout);
        this._cleanupTimers();
        if (this.state !== ConnectionState.DISCONNECTED) {
          this._setState(ConnectionState.DISCONNECTED);
        }
      };
    });
  }

  // --- Disconnect ---
  async disconnect() {
    this._cleanupTimers();
    if (this._ws) {
      try { this._ws.close(); } catch { /* ignore */ }
      this._ws = null;
    }
    this._setState(ConnectionState.DISCONNECTED);
  }

  // --- Send command (cached-state model) ---
  // GET commands return cached state immediately.
  // SET commands forward to WebSocket.
  async sendCommand(cmd) {
    if (!cmd) return '';

    // --- GET commands: return cached state ---
    if (cmd === 'KIWI:FREQ') {
      return `FREQ:${this._frequency}`;
    }
    if (cmd === 'KIWI:MODE') {
      return `MODE:${this._mode}`;
    }
    if (cmd === 'KIWI:SIGNAL') {
      return `SIGNAL:${this._smeter}`;
    }

    // --- SET commands: forward to KiwiSDR ---
    if (cmd.startsWith('KIWI:SET_FREQ:')) {
      const hz = parseInt(cmd.slice(14), 10);
      if (!isNaN(hz) && hz > 0) {
        const khz = hz / 1000; // KiwiSDR expects kHz
        const kiwiMode = CAT_TO_KIWI_MODE[this._mode] || 'usb';
        this._send(`SET mod=${kiwiMode} low_cut=300 high_cut=3000 freq=${khz.toFixed(3)}`);
        this._frequency = hz;
      }
      return '';
    }
    if (cmd.startsWith('KIWI:SET_MODE:')) {
      const mode = cmd.slice(14);
      const kiwiMode = CAT_TO_KIWI_MODE[mode] || 'usb';
      const khz = this._frequency / 1000;
      // Adjust passband for mode
      const passband = this._getPassband(kiwiMode);
      this._send(`SET mod=${kiwiMode} low_cut=${passband.low} high_cut=${passband.high} freq=${khz.toFixed(3)}`);
      this._mode = mode;
      return '';
    }

    return '';
  }

  // --- Write command (no response) ---
  async writeCommand(cmd) {
    // SET commands that don't expect a response
    if (cmd && cmd.startsWith('KIWI:SET_')) {
      await this.sendCommand(cmd);
    }
  }

  // --- No-ops for interface compatibility ---
  async writeRaw() {}
  async readUntil() { return ''; }
  async readBytes() { return new Uint8Array(0); }
  async readUntilByte() { return new Uint8Array(0); }
  async sendBinaryCommand() { return new Uint8Array(0); }
  async flush() {}

  // --- Internal: handle incoming WebSocket message ---
  // KiwiSDR sends ALL frames as binary ArrayBuffers with a 3-byte ASCII tag:
  //   "SND" — audio + S-meter data
  //   "MSG" — text key=value protocol messages (sent as binary, not WS text)
  _handleMessage(event) {
    if (event.data instanceof ArrayBuffer) {
      const len = event.data.byteLength;
      if (len < 3) return;

      const view = new DataView(event.data);
      const t0 = view.getUint8(0), t1 = view.getUint8(1), t2 = view.getUint8(2);

      // --- SND frame: audio + S-meter ---
      // Layout: "SND"(3) + flags(1) + seq(4 LE) + smeter(2 BE) + PCM(rest)
      if (t0 === 0x53 && t1 === 0x4E && t2 === 0x44) { // "SND"
        if (len < 10) return;

        try {
          const smeterRaw = view.getUint16(8, false); // big-endian, offset 8
          const dbm = (smeterRaw - 1270) / 10; // decode: raw = dBm*10 + 1270
          this._smeter = this._dbToRaw(dbm);
        } catch { /* ignore malformed frames */ }

        // Extract PCM audio samples after 10-byte header
        if (len > 10 && this._onAudioData) {
          try {
            const flags = view.getUint8(3);
            const audioBytes = len - 10;
            const sampleCount = Math.floor(audioBytes / 2);
            const samples = new Int16Array(sampleCount);
            const littleEndian = (flags & 0x80) !== 0;
            for (let i = 0; i < sampleCount; i++) {
              samples[i] = view.getInt16(10 + i * 2, littleEndian);
            }
            this._onAudioData(samples);
          } catch { /* ignore malformed audio frames */ }
        }
        return;
      }

      // --- MSG frame: text protocol messages sent as binary ---
      if (t0 === 0x4D && t1 === 0x53 && t2 === 0x47) { // "MSG"
        // Decode bytes after "MSG " (4 bytes) as UTF-8 text
        if (len <= 4) return;
        const textBytes = new Uint8Array(event.data, 4);
        const msg = new TextDecoder().decode(textBytes);
        this._handleTextMsg(msg);
        return;
      }

      // Other binary tags (e.g. W/F waterfall) — ignore
      return;
    }

    // Text frames — fallback (some KiwiSDR versions may send text WS frames)
    if (typeof event.data === 'string') {
      this._handleTextMsg(event.data);
    }
  }

  // --- Process a text protocol message (from MSG binary frame or text WS frame) ---
  _handleTextMsg(msg) {
    // Server audio_init — respond with full config to start audio stream.
    // KiwiSDR requires AR OK + AGC + mod + gen + squelch + compression
    // before cmd_recv_ok is set and SND frames begin.
    if (msg.includes('audio_init=')) {
      if (!this._audioInitDone) {
        this._audioInitDone = true;
        const rateMatch = msg.match(/audio_rate=(\d+)/);
        const rate = rateMatch ? rateMatch[1] : '12000';
        this._send(`SET AR OK in=${rate} out=${rate}`);
        this._send('SET agc=1 hang=0 thresh=-100 slope=6 decay=1000 manGain=50');
        this._send(`SET mod=usb low_cut=300 high_cut=3000 freq=${(this._frequency / 1000).toFixed(3)}`);
        this._send('SET gen=0 mix=-1');
        this._send('SET lms_autonotch=0');
        this._send('SET squelch=0 max=0');
        this._send('SET de_emp=0');
        this._send('SET compression=0');
        this._send('SET OVERRIDE inactivity_timeout=0');
      }
    }

    // Server name
    if (msg.includes('server_de_id=')) {
      const match = msg.match(/server_de_id="?([^"]+)"?/);
      if (match) this._serverName = match[1].trim();
    }

    // Frequency update from server
    if (msg.includes('freq=')) {
      const match = msg.match(/freq=([\d.]+)/);
      if (match) {
        const khz = parseFloat(match[1]);
        if (!isNaN(khz) && khz > 0) {
          this._frequency = Math.round(khz * 1000); // kHz → Hz
        }
      }
    }

    // Mode update from server
    if (msg.includes('mode=')) {
      const match = msg.match(/mode=(\w+)/);
      if (match && KIWI_MODE_MAP[match[1]]) {
        this._mode = KIWI_MODE_MAP[match[1]];
      }
    }
  }

  // --- Convert dBm to raw 0-255 scale for S-meter compatibility ---
  // KiwiSDR range: roughly -130 dBm (noise floor) to -10 dBm (strong)
  // Maps linearly: -130 → 0, -10 → 255
  _dbToRaw(dbm) {
    const clamped = Math.max(-130, Math.min(-10, dbm));
    return Math.round(((clamped + 130) / 120) * 255);
  }

  // --- Get passband for KiwiSDR mode ---
  _getPassband(kiwiMode) {
    switch (kiwiMode) {
      case 'am':   return { low: -4500, high: 4500 };
      case 'cw':   return { low: 300, high: 800 };
      case 'cwn':  return { low: 400, high: 700 };
      case 'nbfm': return { low: -6000, high: 6000 };
      case 'lsb':  return { low: -3000, high: -300 };
      case 'usb':
      default:     return { low: 300, high: 3000 };
    }
  }

  // --- Send text to WebSocket ---
  _send(text) {
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      this._ws.send(text);
    }
  }

  // --- Cleanup timers ---
  _cleanupTimers() {
    if (this._keepaliveTimer) {
      clearInterval(this._keepaliveTimer);
      this._keepaliveTimer = null;
    }
    if (this._connectTimeout) {
      clearTimeout(this._connectTimeout);
      this._connectTimeout = null;
    }
  }

  // --- Get server name (for UI display) ---
  get serverName() {
    return this._serverName || this.host;
  }
}
