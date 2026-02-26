// --- CAT: Meter Stream Engine ---
// Adaptive polling for S-meter, SWR, and power readings.
// Rates adjust based on TX/RX state:
//   Idle (no signal): 600ms — save serial bandwidth
//   RX (signal present): 250ms — responsive S-meter
//   TX: 120ms — fast SWR/power feedback

export function createMeterStreamEngine(sendCommandFn, store, options = {}) {
  const idleInterval = options.idleInterval || 600;
  const rxInterval = options.rxInterval || 250;
  const txInterval = options.txInterval || 120;

  let timer = null;
  let running = false;
  let currentInterval = idleInterval;

  // --- Determine optimal polling rate from rig state ---
  function getInterval(state) {
    if (state.ptt) return txInterval;       // TX — fast SWR/power feedback
    if (state.signal > 10) return rxInterval; // RX with signal — responsive S-meter
    return idleInterval;                      // Idle — save bandwidth
  }

  // --- Poll cycle: send meter commands ---
  function poll() {
    if (!running) return;
    sendCommandFn('getSignal');

    // Only poll SWR/power during TX (or always if user wants continuous monitoring)
    const state = store.get();
    if (state.ptt) {
      sendCommandFn('getSWR');
      sendCommandFn('getPower');
    }
  }

  // --- Adaptive rate: adjust interval based on state changes ---
  function adapt() {
    if (!running) return;
    const state = store.get();
    const target = getInterval(state);

    if (target !== currentInterval) {
      currentInterval = target;
      if (timer) clearInterval(timer);
      timer = setInterval(poll, currentInterval);
    }
  }

  // --- Start meter streaming ---
  function start() {
    if (running) return;
    running = true;
    currentInterval = idleInterval;
    timer = setInterval(poll, currentInterval);

    // Subscribe to state changes for adaptive rate
    store.subscribe(adapt);
  }

  // --- Stop meter streaming ---
  function stop() {
    running = false;
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  return { start, stop };
}
