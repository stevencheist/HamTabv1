// --- CAT Simulator: In-Memory Transport ---
// Browser-only transport that wraps FakeRadioEngine.
// Implements the same interface as WebSerialTransport.
// No serial port needed — commands route to the simulator.

import { ConnectionState } from '../transports/web-serial.js';
import { createFakeRadioEngine } from './fake-radio-engine.js';

export class InMemoryTransport {
  constructor(options = {}) {
    this.state = ConnectionState.DISCONNECTED;
    this._onStateChange = null;
    this.engine = null;
    this._responseDelay = options.responseDelay || 15; // ms — simulate serial latency
    this._engineOptions = options.engineOptions || {};
  }

  static isSupported() {
    return true; // always available — no hardware needed
  }

  onStateChange(callback) {
    this._onStateChange = callback;
  }

  _setState(newState) {
    this.state = newState;
    if (this._onStateChange) this._onStateChange(newState);
  }

  // --- Connect: create a fake radio engine ---
  async connect() {
    this._setState(ConnectionState.CONNECTING);
    this.engine = createFakeRadioEngine(this._engineOptions);
    this._setState(ConnectionState.CONNECTED);
    return true;
  }

  // --- Disconnect ---
  async disconnect() {
    this.engine = null;
    this._setState(ConnectionState.DISCONNECTED);
  }

  // --- Write a command (no response) ---
  async writeCommand(cmd) {
    if (!this.engine) throw new Error('Not connected');
    // Process but don't return response (matches write-only behavior)
    this.engine.processCommand(cmd);
  }

  // --- Write raw bytes (no-op for simulator) ---
  async writeRaw() {
    // No-op
  }

  // --- Read until terminator (not used directly in sim) ---
  async readUntil() {
    return '';
  }

  // --- Read exact bytes (not used directly in sim) ---
  async readBytes() {
    return new Uint8Array(0);
  }

  // --- Read until sentinel byte (not used directly in sim) ---
  async readUntilByte() {
    return new Uint8Array(0);
  }

  // --- Send binary command (not used — demo uses ASCII) ---
  async sendBinaryCommand() {
    return new Uint8Array(0);
  }

  // --- Send command and get response ---
  async sendCommand(cmd) {
    if (!this.engine) throw new Error('Not connected');

    // Simulate serial latency
    if (this._responseDelay > 0) {
      await new Promise(r => setTimeout(r, this._responseDelay));
    }

    const response = this.engine.processCommand(cmd);
    return response || '';
  }

  // --- Flush (no-op for simulator) ---
  async flush() {
    // Nothing to flush
  }
}
