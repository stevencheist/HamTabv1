// --- CAT Safety: TX Power Guard ---
// Auto-reduces power when SWR is dangerously high.
// Configurable SWR limit and safe power level.
// Only acts during TX — doesn't change power while in RX.

export function createTxPowerGuard(store, sendCommandFn, options = {}) {
  const swrLimit = options.swrLimit || 3.0;       // SWR above this triggers guard
  const safePower = options.safePower || 20;       // watts — reduced power level
  const restoreDelay = options.restoreDelay || 5000; // ms before restoring original power

  let originalPower = null;
  let reduced = false;
  let restoreTimer = null;
  let unsubscribe = null;

  function start() {
    unsubscribe = store.subscribe(state => {
      // Only act during TX
      if (!state.ptt) {
        // If we reduced power and TX stopped, restore after delay
        if (reduced && !restoreTimer) {
          restoreTimer = setTimeout(() => {
            if (originalPower !== null) {
              sendCommandFn('setRFPower', originalPower, 1);
            }
            reduced = false;
            originalPower = null;
            restoreTimer = null;
          }, restoreDelay);
        }
        return;
      }

      // TX is active — check SWR
      if (state.swr > swrLimit && !reduced) {
        // Save original power and reduce
        originalPower = state.rfPower || state.txPower;
        if (originalPower && originalPower > safePower) {
          sendCommandFn('setRFPower', safePower, 2); // urgent priority
          reduced = true;
          store.set({
            txLocked: false, // don't lock TX, just reduce power
            txLockReason: `Power reduced: SWR ${state.swr.toFixed(1)} > ${swrLimit}`,
          });
        }
      }
    });
  }

  function stop() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (restoreTimer) { clearTimeout(restoreTimer); restoreTimer = null; }
    reduced = false;
    originalPower = null;
  }

  return { start, stop };
}
