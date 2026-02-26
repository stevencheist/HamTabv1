// --- CAT Safety: Band Transition Guard ---
// Locks TX during band changes to prevent transmitting on the wrong frequency.
// Detects band change from frequency updates, applies TX lockout for a brief window.

import { detectBand } from '../rig-state-store.js';

export function createBandTransitionGuard(store, options = {}) {
  const lockoutMs = options.lockoutMs || 2000; // 2s lockout after band change

  let lastBand = null;
  let lockoutTimer = null;
  let unsubscribe = null;

  function start() {
    unsubscribe = store.subscribe(state => {
      const band = detectBand(state.frequency);
      if (band && lastBand && band !== lastBand) {
        // Band changed — lock TX
        store.set({ txLocked: true, txLockReason: `Band change: ${lastBand} → ${band}` });

        if (lockoutTimer) clearTimeout(lockoutTimer);
        lockoutTimer = setTimeout(() => {
          // Only unlock if still locked for this reason
          const current = store.get();
          if (current.txLockReason && current.txLockReason.startsWith('Band change:')) {
            store.set({ txLocked: false, txLockReason: '' });
          }
        }, lockoutMs);
      }
      lastBand = band;
    });
  }

  function stop() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
    if (lockoutTimer) { clearTimeout(lockoutTimer); lockoutTimer = null; }
  }

  return { start, stop };
}
