// --- CAT Safety: TX Intent System ---
// Prevents accidental TX after rapid tuning (click-to-tune).
// After the frequency changes rapidly (multiple changes in short window),
// TX is locked until the frequency stabilizes for a configurable period.

export function createTxIntentSystem(store, options = {}) {
  const rapidThreshold = options.rapidThreshold || 3;    // freq changes within window = "rapid"
  const rapidWindowMs = options.rapidWindowMs || 2000;    // window to count changes
  const settleMs = options.settleMs || 1500;              // must be stable for this long to unlock

  let freqChanges = [];  // timestamps of recent frequency changes
  let lastFreq = 0;
  let settleTimer = null;
  let locked = false;
  let unsubscribe = null;

  function start() {
    unsubscribe = store.subscribe(state => {
      if (state.frequency !== lastFreq && lastFreq > 0) {
        lastFreq = state.frequency;
        const now = Date.now();
        freqChanges.push(now);

        // Prune old entries
        freqChanges = freqChanges.filter(t => now - t < rapidWindowMs);

        if (freqChanges.length >= rapidThreshold && !locked) {
          // Rapid tuning detected — lock TX
          locked = true;
          store.set({ txLocked: true, txLockReason: 'Rapid tuning — wait for settle' });
        }

        // Reset settle timer on every change
        if (locked) {
          if (settleTimer) clearTimeout(settleTimer);
          settleTimer = setTimeout(() => {
            locked = false;
            const current = store.get();
            if (current.txLockReason === 'Rapid tuning — wait for settle') {
              store.set({ txLocked: false, txLockReason: '' });
            }
          }, settleMs);
        }
      }
      if (lastFreq === 0) lastFreq = state.frequency;
    });
  }

  function stop() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (settleTimer) { clearTimeout(settleTimer); settleTimer = null; }
    locked = false;
  }

  return { start, stop };
}
