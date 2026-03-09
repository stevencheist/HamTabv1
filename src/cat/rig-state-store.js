// --- CAT: Reactive Rig State Store ---
// Holds current rig state and notifies subscribers on change.
// Widgets subscribe here — never talk to drivers directly.

export function createRigStateStore() {
  const state = {
    connected: false,
    demo: false,
    radioId: null,
    sourceType: null,   // null for local radio, 'sdr' for network receiver
    rxOnly: false,      // true for SDR connections — hides TX controls
    remoteName: null,   // SDR server hostname for display
    capabilities: [],

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

    // Menu responses — keyed by address string (e.g. "010416" for P1=01 P2=04 P3=16)
    // Populated by EX command responses, used by digital setup to read/restore settings
    menuResponses: {},

    // --- Radio settings (populated by profile read commands) ---
    afGain: null,        // 0-255
    agc: null,           // 0=off, 1=fast, 2=mid, 3=slow, 4=auto
    noiseBlanker: null,  // 0=off, 1=on
    noiseReduction: null, // 0=off, 1=on
    attenuator: null,    // 0=off, 6/12/18 dB
    preamp: null,        // 0=IPO, 1=AMP1, 2=AMP2
    ifShift: null,       // 0-9999 (center varies by radio)
    width: null,         // filter width index
    narrow: null,        // 0=off, 1=on
    contour: null,       // contour setting
    voxGain: null,       // 0-100
    monitorLevel: null,  // 0-100
    micGain: null,       // 0-100
    processor: null,     // 0=off, 1=on
    processorLevel: null, // 0-100
  };

  const subscribers = [];

  function subscribe(callback) {
    subscribers.push(callback);
    // Immediately call with current state — wrapped so a bad subscriber
    // doesn't crash the caller (e.g. initOnAirRig)
    try { callback({ ...state }); } catch (err) {
      console.error('[rig-store] subscriber threw on initial call:', err);
    }
    // Return unsubscribe function
    return () => {
      const idx = subscribers.indexOf(callback);
      if (idx >= 0) subscribers.splice(idx, 1);
    };
  }

  function notify() {
    const snapshot = { ...state };
    for (const cb of subscribers) {
      try { cb(snapshot); } catch (err) {
        console.error('[rig-store] subscriber threw on notify:', err);
      }
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
        // Clear TX-only meters when returning to RX — SWR/power are only valid during TX
        if (!event.value) {
          state.swr = 0;
          state.swrRaw = 0;
          state.powerMeter = 0;
          state.tuneConfidence = 'unknown';
        }
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
      case 'capabilities':
        state.capabilities = Array.isArray(event.value) ? event.value : [];
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
      // --- Radio settings (profile-readable) ---
      case 'afGain':
        state.afGain = event.value;
        break;
      case 'agc':
        state.agc = event.value;
        break;
      case 'noiseBlanker':
        state.noiseBlanker = event.value;
        break;
      case 'noiseReduction':
        state.noiseReduction = event.value;
        break;
      case 'attenuator':
        state.attenuator = event.value;
        break;
      case 'preamp':
        state.preamp = event.value;
        break;
      case 'ifShift':
        state.ifShift = event.value;
        break;
      case 'width':
        state.width = event.value;
        break;
      case 'narrow':
        state.narrow = event.value;
        break;
      case 'contour':
        state.contour = event.value;
        break;
      case 'voxGain':
        state.voxGain = event.value;
        break;
      case 'monitorLevel':
        state.monitorLevel = event.value;
        break;
      case 'micGain':
        state.micGain = event.value;
        break;
      case 'processor':
        state.processor = event.value;
        break;
      case 'processorLevel':
        state.processorLevel = event.value;
        break;
      case 'menu':
        // Store latest menu response keyed by address (e.g. "010416")
        if (event.value) {
          const key = `${String(event.value.p1).padStart(2,'0')}${String(event.value.p2).padStart(2,'0')}${String(event.value.p3).padStart(2,'0')}`;
          state.menuResponses[key] = event.value;
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
    state.sourceType = null;
    state.rxOnly = false;
    state.remoteName = null;
    state.capabilities = [];
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
    state.menuResponses = {};
    state.afGain = null;
    state.agc = null;
    state.noiseBlanker = null;
    state.noiseReduction = null;
    state.attenuator = null;
    state.preamp = null;
    state.ifShift = null;
    state.width = null;
    state.narrow = null;
    state.contour = null;
    state.voxGain = null;
    state.monitorLevel = null;
    state.micGain = null;
    state.processor = null;
    state.processorLevel = null;
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
