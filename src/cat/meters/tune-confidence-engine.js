// --- CAT: Tune Confidence Engine ---
// Maps SWR readings to confidence levels for UI display.
// Levels: good (green), caution (amber), unsafe (red), unknown (gray)
// Thresholds are configurable per rig profile.

const DEFAULT_THRESHOLDS = {
  good: 1.5,     // SWR ≤ 1.5 — well-matched
  caution: 3.0,  // SWR ≤ 3.0 — needs attention
  // Above caution = unsafe
};

export function createTuneConfidenceEngine(store, thresholds = {}) {
  const good = thresholds.good || DEFAULT_THRESHOLDS.good;
  const caution = thresholds.caution || DEFAULT_THRESHOLDS.caution;

  // --- Evaluate confidence from SWR ---
  function evaluate(swr) {
    if (!swr || swr <= 0) return 'unknown';
    if (swr <= good) return 'good';
    if (swr <= caution) return 'caution';
    return 'unsafe';
  }

  // --- Subscribe to store and auto-update confidence ---
  let unsubscribe = null;

  function start() {
    unsubscribe = store.subscribe(state => {
      const confidence = evaluate(state.swr);
      if (state.tuneConfidence !== confidence) {
        store.applyEvent({ type: 'tuneConfidence', value: confidence });
      }
    });
  }

  function stop() {
    if (unsubscribe) {
      unsubscribe();
      unsubscribe = null;
    }
  }

  return { start, stop, evaluate };
}
