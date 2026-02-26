// --- CAT Safety: Smart Tune Assist ---
// Optional power reduction during antenna tuning.
// For rigs where 'auto_reduce' is the smartTuneMethod:
//   1. Detect tune-in-progress (SWR fluctuating rapidly)
//   2. Reduce TX power to safe level
//   3. Wait for SWR to stabilize
//   4. Restore original power
// For 'radio_managed' rigs (FT-DX10 with ATAS): no-op, radio handles everything.

export function createSmartTuneAssist(store, sendCommandFn, options = {}) {
  const tunePower = options.tunePower || 10;      // watts during tune
  const settleMs = options.settleMs || 3000;       // SWR must be stable for this long
  const swrThreshold = options.swrThreshold || 2.0; // SWR below this = tuned

  let active = false;
  let originalPower = null;
  let settleTimer = null;

  // --- Start a tune assist cycle ---
  function startTune() {
    if (active) return;
    active = true;

    const state = store.get();
    originalPower = state.rfPower || 100;

    // Reduce power
    sendCommandFn('setRFPower', tunePower, 2);
  }

  // --- Check if tune is complete ---
  function checkSettled(swr) {
    if (!active) return;

    if (swr > 0 && swr <= swrThreshold) {
      // SWR is good — start settle timer
      if (!settleTimer) {
        settleTimer = setTimeout(() => {
          finishTune();
        }, settleMs);
      }
    } else {
      // SWR still high — reset timer
      if (settleTimer) {
        clearTimeout(settleTimer);
        settleTimer = null;
      }
    }
  }

  // --- Restore power after successful tune ---
  function finishTune() {
    if (!active) return;
    active = false;

    if (originalPower !== null) {
      sendCommandFn('setRFPower', originalPower, 1);
    }
    originalPower = null;
    settleTimer = null;
  }

  // --- Cancel tune assist ---
  function cancel() {
    if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    if (active && originalPower !== null) {
      sendCommandFn('setRFPower', originalPower, 1);
    }
    active = false;
    originalPower = null;
  }

  return { startTune, checkSettled, finishTune, cancel, isActive: () => active };
}
