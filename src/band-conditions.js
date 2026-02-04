// --- Per-Band Propagation Predictions ---
// Calculate band-specific propagation reliability based on solar indices

import state from './state.js';

// HF amateur bands (MHz)
const HF_BANDS = [
  { name: '160m', freqMHz: 1.9,   label: '160m' },
  { name: '80m',  freqMHz: 3.7,   label: '80m'  },
  { name: '60m',  freqMHz: 5.35,  label: '60m'  },
  { name: '40m',  freqMHz: 7.15,  label: '40m'  },
  { name: '30m',  freqMHz: 10.12, label: '30m'  },
  { name: '20m',  freqMHz: 14.15, label: '20m'  },
  { name: '17m',  freqMHz: 18.1,  label: '17m'  },
  { name: '15m',  freqMHz: 21.2,  label: '15m'  },
  { name: '12m',  freqMHz: 24.93, label: '12m'  },
  { name: '10m',  freqMHz: 28.5,  label: '10m'  },
];

// --- MUF Calculation ---

/**
 * Calculate Maximum Usable Frequency (MUF) estimate
 * Uses simplified model based on solar flux and time of day
 *
 * Based on:
 * - Ionospheric foF2 critical frequency correlates with SFI
 * - MUF = foF2 × obliquity factor (typically 3-4 for long paths)
 *
 * @param {number} sfi - Solar Flux Index (10.7cm)
 * @param {boolean} isDay - True if daytime at ionospheric reflection point
 * @returns {number} - Estimated MUF in MHz
 */
function calculateMUF(sfi, isDay) {
  // foF2 correlation with SFI (empirical)
  // Day: foF2 ≈ 0.9 × sqrt(SFI)
  // Night: foF2 ≈ 0.6 × sqrt(SFI)
  const foF2Factor = isDay ? 0.9 : 0.6;
  const foF2 = foF2Factor * Math.sqrt(Math.max(sfi, 50)); // MHz

  // Obliquity factor for mid-range DX paths (1000-3000 km)
  // Typical range 3-4; use 3.5 as average
  const obliquityFactor = 3.5;

  return foF2 * obliquityFactor;
}

// --- Band Reliability Calculation ---

/**
 * Calculate propagation reliability for a specific band
 *
 * Reliability factors:
 * - MUF relationship: bands near MUF have highest reliability
 * - Too low: absorption (especially during day)
 * - Too high: signal escapes ionosphere
 * - Geomagnetic disturbance reduces reliability
 *
 * @param {number} bandFreqMHz - Band center frequency
 * @param {number} muf - Maximum Usable Frequency
 * @param {number} kIndex - Geomagnetic K-index (0-9)
 * @param {number} aIndex - Planetary A-index
 * @param {boolean} isDay - True if daytime
 * @returns {number} - Reliability percentage (0-100)
 */
function calculateBandReliability(bandFreqMHz, muf, kIndex, aIndex, isDay) {
  // Usable frequency range is typically 50-90% of MUF
  const mufLower = muf * 0.5;  // 50% of MUF (minimum usable)
  const mufOptimal = muf * 0.85; // 85% of MUF (optimal)

  let baseReliability = 0;

  if (bandFreqMHz < mufLower) {
    // Below 50% MUF: low bands, high absorption
    // Worse during day, better at night
    if (isDay) {
      // Daytime absorption significant for low bands
      baseReliability = Math.max(0, 20 - (mufLower - bandFreqMHz) * 2);
    } else {
      // Nighttime: low bands work better
      baseReliability = Math.min(85, 60 + (mufLower - bandFreqMHz) * 1.5);
    }
  } else if (bandFreqMHz <= mufOptimal) {
    // 50-85% of MUF: optimal range, high reliability
    const position = (bandFreqMHz - mufLower) / (mufOptimal - mufLower);
    // Peak reliability around 70-80% of MUF
    baseReliability = 70 + (30 * Math.sin(position * Math.PI));
  } else if (bandFreqMHz <= muf) {
    // 85-100% of MUF: usable but variable
    const position = (bandFreqMHz - mufOptimal) / (muf - mufOptimal);
    baseReliability = 90 - (position * 40); // 90% down to 50%
  } else {
    // Above MUF: signal escapes, poor propagation
    const excess = bandFreqMHz - muf;
    baseReliability = Math.max(0, 40 - excess * 3);
  }

  // Apply geomagnetic disturbance penalty
  // K-index 0-2: no penalty
  // K-index 3-5: moderate penalty
  // K-index 6-9: severe penalty
  let geomagPenalty = 0;
  if (kIndex >= 6) {
    geomagPenalty = (kIndex - 5) * 12; // -12% to -48%
  } else if (kIndex >= 3) {
    geomagPenalty = (kIndex - 2) * 5; // -5% to -15%
  }

  // A-index penalty (planetary disturbance)
  // A < 10: quiet
  // A 10-30: unsettled
  // A > 30: disturbed
  let aIndexPenalty = 0;
  if (aIndex > 30) {
    aIndexPenalty = Math.min(20, (aIndex - 30) / 2);
  } else if (aIndex > 10) {
    aIndexPenalty = (aIndex - 10) / 4;
  }

  const finalReliability = Math.max(0, Math.min(100,
    baseReliability - geomagPenalty - aIndexPenalty
  ));

  return Math.round(finalReliability);
}

// --- Condition Classification ---

/**
 * Classify reliability percentage into condition category
 * @param {number} reliability - Reliability percentage (0-100)
 * @returns {string} - 'excellent', 'good', 'fair', 'poor', or 'closed'
 */
function classifyCondition(reliability) {
  if (reliability >= 80) return 'excellent';
  if (reliability >= 60) return 'good';
  if (reliability >= 40) return 'fair';
  if (reliability >= 20) return 'poor';
  return 'closed';
}

// --- Public API ---

/**
 * Calculate current band conditions for all HF bands
 * @returns {Array} - Array of band condition objects
 */
export function calculateBandConditions() {
  if (!state.lastSolarData || !state.lastSolarData.indices) {
    return HF_BANDS.map(band => ({
      ...band,
      reliability: 0,
      condition: 'unknown',
      muf: 0,
    }));
  }

  const { indices } = state.lastSolarData;

  // Parse solar indices
  const sfi = parseFloat(indices.sfi) || 70; // Solar flux (default ~70 for solar minimum)
  const kIndex = parseInt(indices.kindex) || 2;
  const aIndex = parseInt(indices.aindex) || 5;

  // Determine if daytime (simple UTC-based approximation)
  // For better accuracy, this could use user location and solar zenith angle
  const utcHour = new Date().getUTCHours();
  const isDay = utcHour >= 6 && utcHour < 18; // Rough day = 06:00-18:00 UTC

  // Calculate MUF
  const muf = calculateMUF(sfi, isDay);

  // Calculate reliability for each band
  return HF_BANDS.map(band => {
    const reliability = calculateBandReliability(
      band.freqMHz,
      muf,
      kIndex,
      aIndex,
      isDay
    );

    return {
      ...band,
      reliability,
      condition: classifyCondition(reliability),
      muf: Math.round(muf * 10) / 10, // Round to 1 decimal
    };
  });
}

/**
 * Get color class for condition
 * @param {string} condition - Condition category
 * @returns {string} - CSS class name
 */
export function conditionColorClass(condition) {
  const map = {
    'excellent': 'band-excellent',
    'good': 'band-good',
    'fair': 'band-fair',
    'poor': 'band-poor',
    'closed': 'band-closed',
    'unknown': 'band-unknown',
  };
  return map[condition] || 'band-unknown';
}

/**
 * Get display label for condition
 * @param {string} condition - Condition category
 * @returns {string} - Human-readable label
 */
export function conditionLabel(condition) {
  const map = {
    'excellent': 'Excellent',
    'good': 'Good',
    'fair': 'Fair',
    'poor': 'Poor',
    'closed': 'Closed',
    'unknown': 'Unknown',
  };
  return map[condition] || 'Unknown';
}
