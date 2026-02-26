// --- CAT: Band Auto-Profile ---
// Maps spot type/mode to rig settings (mode, power hints).
// When a user clicks a spot, this determines what mode the rig should use.

// --- Spot mode → rig mode mapping ---
// Spot modes come from POTA/SOTA/DXC sources. Rig modes are driver-level.
// Below 10 MHz: LSB for voice. Above 10 MHz: USB for voice.
const SPOT_TO_RIG_MODE = {
  'FT8':    'DATA-U',   // FT8 uses upper sideband data mode
  'FT4':    'DATA-U',
  'JS8':    'DATA-U',
  'WSPR':   'DATA-U',
  'MSK144': 'DATA-U',
  'JT65':   'DATA-U',
  'JT9':    'DATA-U',
  'RTTY':   'RTTY-L',
  'PSK31':  'DATA-L',
  'PSK63':  'DATA-L',
  'OLIVIA': 'DATA-U',
  'CW':     'CW-U',
  'SSB':    null,        // resolved by frequency (USB/LSB)
  'USB':    'USB',
  'LSB':    'LSB',
  'FM':     'FM',
  'AM':     'AM',
  'DSTAR':  'DATA-FM',
  'DMR':    'DATA-FM',
  'C4FM':   'DATA-FM',
};

// --- Frequency-dependent SSB mode ---
// Convention: LSB below 10 MHz, USB at 10 MHz and above
const SSB_CROSSOVER = 10_000_000; // Hz

// --- Resolve rig mode from spot data ---
// spotMode: string from spot source (e.g., "FT8", "SSB", "CW")
// freqHz: frequency in Hz (used for SSB → USB/LSB decision)
export function resolveRigMode(spotMode, freqHz) {
  if (!spotMode) return null;

  const upper = spotMode.toUpperCase().trim();

  // Direct lookup
  const mapped = SPOT_TO_RIG_MODE[upper];
  if (mapped) return mapped;

  // SSB: resolve by frequency
  if (upper === 'SSB' || upper === 'PH' || upper === 'PHONE') {
    return freqHz >= SSB_CROSSOVER ? 'USB' : 'LSB';
  }

  // Unknown mode — don't change rig mode
  return null;
}

// --- Convert spot frequency to Hz integer ---
// Spot sources use inconsistent units:
//   POTA/SOTA: MHz string ("14.074")
//   DXC/some sources: kHz string ("14074" or "14074.0")
// Mirrors the logic in filters.js freqToBand(): if > 1000, it's kHz
export function spotFreqToHz(freq) {
  let val;
  if (typeof freq === 'number') {
    val = freq;
  } else {
    val = parseFloat(freq);
  }
  if (isNaN(val) || val <= 0) return 0;

  // Already in Hz (e.g., 14074000)
  if (val > 1_000_000) return Math.round(val);
  // In kHz (e.g., 14074 or 14074.0)
  if (val > 1000) return Math.round(val * 1_000);
  // In MHz (e.g., 14.074)
  return Math.round(val * 1_000_000);
}
