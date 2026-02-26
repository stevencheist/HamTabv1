// --- CAT: Reactive Rig State Store ---
// Holds current rig state and notifies subscribers on change.
// Widgets subscribe here — never talk to drivers directly.

export function createRigStateStore() {
  const state = {
    connected: false,
    demo: false,
    radioId: null,

    // Core
    frequency: 0,
    frequencyB: 0,
    mode: '',
    ptt: false,

    // Meters
    signal: 0,        // raw 0-255
    sUnits: 0,        // interpolated S-units
    swr: 0,           // interpolated SWR ratio
    swrRaw: 0,        // raw 0-255
    powerMeter: 0,    // interpolated watts (TX meter)
    rfPower: 0,       // set power (watts)
    txPower: 0,       // alias for rfPower

    // Derived
    tuneConfidence: 'unknown', // good | caution | unsafe | unknown
    band: null,                // detected band name (e.g., "20m")

    // Safety
    txLocked: false,
    txLockReason: '',
  };

  const subscribers = [];

  function subscribe(callback) {
    subscribers.push(callback);
    // Immediately call with current state
    callback({ ...state });
    // Return unsubscribe function
    return () => {
      const idx = subscribers.indexOf(callback);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  }

  function notify() {
    const snapshot = { ...state };
    for (const cb of subscribers) {
      try { cb(snapshot); } catch { /* don't let subscriber errors kill updates */ }
    }
  }

  // Apply a parsed driver event to the store
  function applyEvent(event) {
    if (!event || !event.type) return;

    switch (event.type) {
      case 'frequency':
        state.frequency = event.value;
        state.band = detectBand(event.value);
        break;
      case 'frequencyB':
        state.frequencyB = event.value;
        break;
      case 'mode':
        state.mode = event.value;
        break;
      case 'ptt':
        state.ptt = event.value;
        break;
      case 'signal':
        state.signal = event.value;
        state.sUnits = event.sUnits || 0;
        break;
      case 'swr':
        state.swr = event.value;
        state.swrRaw = event.raw || 0;
        updateTuneConfidence();
        break;
      case 'powerMeter':
        state.powerMeter = event.value;
        break;
      case 'rfPower':
        state.rfPower = event.value;
        state.txPower = event.value;
        break;
      case 'radioId':
        state.radioId = event.value;
        break;
      case 'tuneConfidence':
        state.tuneConfidence = event.value;
        break;
      case 'info':
        if (event.value && event.value.frequency) {
          state.frequency = event.value.frequency;
          state.band = detectBand(event.value.frequency);
        }
        break;
      case 'error':
        // Log but don't crash
        break;
      default:
        break;
    }

    notify();
  }

  function set(partial) {
    Object.assign(state, partial);
    notify();
  }

  function get() {
    return { ...state };
  }

  function reset() {
    state.connected = false;
    state.demo = false;
    state.radioId = null;
    state.frequency = 0;
    state.frequencyB = 0;
    state.mode = '';
    state.ptt = false;
    state.signal = 0;
    state.sUnits = 0;
    state.swr = 0;
    state.swrRaw = 0;
    state.powerMeter = 0;
    state.rfPower = 0;
    state.txPower = 0;
    state.tuneConfidence = 'unknown';
    state.band = null;
    state.txLocked = false;
    state.txLockReason = '';
    notify();
  }

  // --- Tune confidence from SWR ---
  function updateTuneConfidence() {
    if (state.swr <= 0) {
      state.tuneConfidence = 'unknown';
    } else if (state.swr <= 1.5) {
      state.tuneConfidence = 'good';
    } else if (state.swr <= 3.0) {
      state.tuneConfidence = 'caution';
    } else {
      state.tuneConfidence = 'unsafe';
    }
  }

  return { subscribe, applyEvent, set, get, reset };
}

// --- Band detection from frequency (Hz) ---
const BANDS = [
  { name: '160m', min: 1800000,  max: 2000000 },
  { name: '80m',  min: 3500000,  max: 4000000 },
  { name: '60m',  min: 5330500,  max: 5406400 },
  { name: '40m',  min: 7000000,  max: 7300000 },
  { name: '30m',  min: 10100000, max: 10150000 },
  { name: '20m',  min: 14000000, max: 14350000 },
  { name: '17m',  min: 18068000, max: 18168000 },
  { name: '15m',  min: 21000000, max: 21450000 },
  { name: '12m',  min: 24890000, max: 24990000 },
  { name: '10m',  min: 28000000, max: 29700000 },
  { name: '6m',   min: 50000000, max: 54000000 },
];

function detectBand(freq) {
  for (const b of BANDS) {
    if (freq >= b.min && freq <= b.max) return b.name;
  }
  return null;
}

export { BANDS, detectBand };
