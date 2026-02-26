// --- CAT Safety: Antenna Tune Controller ---
// Detects band changes and alerts the user to tune their antenna.
// For ATAS-120/auto-tuners: shows a toast/alert.
// smartTuneMethod from rig profile determines behavior:
//   'radio_managed' — radio handles tuning (FT-DX10 with ATAS). Just alert.
//   'auto_reduce' — reduce power, send tune command, wait, restore.
//   'manual_alert' — show alert only, user handles tuning.

import { detectBand } from '../rig-state-store.js';

export function createAntennaTuneController(store, options = {}) {
  const method = options.smartTuneMethod || 'manual_alert';
  const onTuneNeeded = options.onTuneNeeded || null; // callback(fromBand, toBand)

  let lastBand = null;
  let unsubscribe = null;

  function start() {
    unsubscribe = store.subscribe(state => {
      const band = detectBand(state.frequency);
      if (band && lastBand && band !== lastBand) {
        handleBandChange(lastBand, band);
      }
      lastBand = band;
    });
  }

  function handleBandChange(fromBand, toBand) {
    switch (method) {
      case 'radio_managed':
        // Radio handles tuning automatically (ATAS-120 on FT-DX10).
        // Still notify UI so user sees what happened.
        if (onTuneNeeded) onTuneNeeded(fromBand, toBand);
        break;

      case 'auto_reduce':
        // Future: reduce power → send tune command → wait → restore
        // For now, just alert
        if (onTuneNeeded) onTuneNeeded(fromBand, toBand);
        break;

      case 'manual_alert':
      default:
        if (onTuneNeeded) onTuneNeeded(fromBand, toBand);
        break;
    }
  }

  function stop() {
    if (unsubscribe) { unsubscribe(); unsubscribe = null; }
  }

  return { start, stop };
}
