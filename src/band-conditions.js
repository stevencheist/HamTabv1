// --- Per-Band Propagation Predictions ---
// Calculate band-specific propagation reliability based on solar indices

import state from './state.js';
import { $ } from './dom.js';
import { esc } from './utils.js';

// Day/night toggle state
let dayNightTime = 'day'; // 'day' or 'night'

// Load preference
const saved = localStorage.getItem('hamtab_band_time');
if (saved === 'day' || saved === 'night') {
  dayNightTime = saved;
}

// HF amateur bands (MHz)
export const HF_BANDS = [
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

// VOACAP subset — excludes 160m and 60m (8 bands matching VOACAP DE-DX reference)
export const VOACAP_BANDS = HF_BANDS.filter(b => b.name !== '160m' && b.name !== '60m');

// --- Solar Zenith & Day Fraction ---

// Calculate solar zenith angle at a given location and UTC hour.
// Uses simplified solar position from Meeus, "Astronomical Algorithms" Ch. 25.
// Returns zenith in degrees (0 = sun at zenith, 90 = horizon, 180 = midnight).
export function calculateSolarZenith(lat, lon, utcHour) {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - start) / 86400000) + 1; // ms per day

  // Solar declination (simplified, accurate to ~1°)
  // Meeus Ch. 25 — axial tilt ≈ 23.44°
  const declRad = Math.asin(
    Math.sin(23.44 * Math.PI / 180) * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180)
  );

  // Hour angle: how far the sun is from local solar noon
  const solarNoonOffset = lon / 15; // hours — longitude offset from UTC
  const hourAngle = (utcHour - 12 + solarNoonOffset) * 15; // degrees
  const haRad = hourAngle * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  // cos(zenith) = sin(lat)*sin(decl) + cos(lat)*cos(decl)*cos(ha)
  const cosZenith = Math.sin(latRad) * Math.sin(declRad) +
                    Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);

  return Math.acos(Math.max(-1, Math.min(1, cosZenith))) * 180 / Math.PI;
}

// Returns 0.0 (full night) to 1.0 (full day) with smooth twilight blending.
// Zenith 80° → 1.0 (bright day), 100° → 0.0 (full night), linear blend between.
// Falls back to hardcoded UTC model when no location is available.
export function dayFraction(lat, lon, utcHour) {
  if (lat == null || lon == null) {
    // Fallback: simple UTC-based model (0° longitude assumption)
    return (utcHour >= 6 && utcHour < 18) ? 1.0 : 0.0;
  }
  const zenith = calculateSolarZenith(lat, lon, utcHour);
  if (zenith <= 80) return 1.0;  // degrees — full daylight
  if (zenith >= 100) return 0.0; // degrees — full night
  return (100 - zenith) / 20;    // linear twilight blend over 20° range
}

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
export function calculateMUF(sfi, dayFrac) {
  // Backward compat: boolean callers pass true/false → map to 1.0/0.0
  if (dayFrac === true) dayFrac = 1.0;
  else if (dayFrac === false) dayFrac = 0.0;

  // foF2 correlation with SFI (empirical)
  // Blend foF2 factor smoothly between night (0.6) and day (0.9)
  const foF2Factor = 0.6 + 0.3 * dayFrac;
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
function calculateBandReliability(bandFreqMHz, muf, kIndex, aIndex, isDay, opts) {
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

  let adjusted = baseReliability - geomagPenalty - aIndexPenalty;

  // --- VOACAP parameter adjustments (when opts provided) ---
  if (opts) {
    // Mode bonus: CW +10%, SSB baseline, FT8 +30% (reflects ~40dB SNR advantage)
    if (opts.mode === 'CW') adjusted += 10;
    else if (opts.mode === 'FT8') adjusted += 30;

    // Power adjustment: 10 * log10(power/100) dB → map to % (100W = baseline)
    if (opts.powerWatts && opts.powerWatts !== 100) {
      const dBdiff = 10 * Math.log10(opts.powerWatts / 100); // dB relative to 100W
      adjusted += dBdiff * 1.5; // ~1.5% per dB
    }

    // TOA adjustment: ±1.5% per degree from reference 5°
    if (opts.toaDeg != null) {
      adjusted += (opts.toaDeg - 5) * 1.5; // higher TOA = more reliability (steeper angle)
    }

    // Long path penalty: -25%
    if (opts.longPath) adjusted -= 25;
  }

  const finalReliability = Math.max(0, Math.min(100, adjusted));

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
 * @param {string} timeOfDay - 'day' or 'night' to override auto-detection
 * @returns {Array} - Array of band condition objects
 */
export function calculateBandConditions(timeOfDay = null) {
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

  // Determine if daytime
  // If timeOfDay is specified (from toggle), use that; otherwise auto-detect
  let isDay;
  if (timeOfDay === 'day') {
    isDay = true;
  } else if (timeOfDay === 'night') {
    isDay = false;
  } else {
    // Auto-detect based on UTC time (simple approximation)
    const utcHour = new Date().getUTCHours();
    isDay = utcHour >= 6 && utcHour < 18; // Rough day = 06:00-18:00 UTC
  }

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

// --- 24-Hour Propagation Matrix ---

/**
 * Get reliability color for a given percentage
 * @param {number} rel - Reliability percentage (0-100)
 * @returns {string} - CSS color string
 */
export function getReliabilityColor(rel) {
  if (rel < 10) return '#1a1a1a';  // Black — band closed
  if (rel < 33) return '#c0392b';  // Red — poor
  if (rel < 66) return '#f1c40f';  // Yellow — fair
  return '#27ae60';                 // Green — good
}

/**
 * Calculate 24-hour propagation matrix for all HF bands
 * Returns predictions for each hour based on estimated solar conditions
 *
 * @returns {Array} - Array of 24 entries: { hour, bands: { '20m': reliability%, ... }, muf }
 */
export function calculate24HourMatrix(opts) {
  if (!state.lastSolarData || !state.lastSolarData.indices) {
    // Return placeholder data if no solar data available
    return Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      bands: {},
      muf: 0,
    }));
  }

  const { indices } = state.lastSolarData;
  const sfi = parseFloat(indices.sfi) || 70;
  const kIndex = parseInt(indices.kindex) || 2;
  const aIndex = parseInt(indices.aindex) || 5;

  // Use location-aware day fraction when lat/lon provided in opts
  const lat = opts && opts.lat != null ? opts.lat : null;
  const lon = opts && opts.lon != null ? opts.lon : null;

  // Choose which bands to compute — VOACAP_BANDS when opts given, else all HF_BANDS
  const bandList = opts ? VOACAP_BANDS : HF_BANDS;

  const matrix = [];

  for (let hour = 0; hour < 24; hour++) {
    // Use solar zenith–based day fraction when location available
    const df = dayFraction(lat, lon, hour);
    const muf = calculateMUF(sfi, df);

    // Calculate reliability for each band at this hour
    const bands = {};
    for (const band of bandList) {
      const reliability = calculateBandReliability(
        band.freqMHz,
        muf,
        kIndex,
        aIndex,
        df >= 0.5, // boolean isDay for absorption branch
        opts
      );
      bands[band.name] = reliability;
    }

    matrix.push({
      hour,
      bands,
      muf: Math.round(muf * 10) / 10,
    });
  }

  return matrix;
}

// --- UI Rendering ---

/**
 * Initialize day/night toggle listeners
 */
export function initDayNightToggle() {
  const dayBtn = $('dayToggle');
  const nightBtn = $('nightToggle');

  if (!dayBtn || !nightBtn) return;

  // Set initial state
  updateToggleButtons();

  dayBtn.addEventListener('click', () => {
    dayNightTime = 'day';
    localStorage.setItem('hamtab_band_time', dayNightTime);
    updateToggleButtons();
    renderPropagationWidget();
  });

  nightBtn.addEventListener('click', () => {
    dayNightTime = 'night';
    localStorage.setItem('hamtab_band_time', dayNightTime);
    updateToggleButtons();
    renderPropagationWidget();
  });
}

function updateToggleButtons() {
  const dayBtn = $('dayToggle');
  const nightBtn = $('nightToggle');

  if (dayBtn) dayBtn.classList.toggle('active', dayNightTime === 'day');
  if (nightBtn) nightBtn.classList.toggle('active', dayNightTime === 'night');
}

/**
 * Render the propagation widget with band conditions
 */
export function renderPropagationWidget() {
  const grid = $('bandConditionsGrid');
  const mufValue = $('propMufValue');
  const sfiValue = $('propSfiValue');
  const kindexValue = $('propKindexValue');

  if (!grid) return;

  // Calculate per-band conditions using selected day/night mode
  const conditions = calculateBandConditions(dayNightTime);

  // Update summary values
  if (mufValue) {
    const muf = conditions[0]?.muf || 0;
    mufValue.textContent = muf > 0 ? `${muf} MHz` : '--';
  }

  if (state.lastSolarData && state.lastSolarData.indices) {
    const { indices } = state.lastSolarData;
    if (sfiValue) sfiValue.textContent = indices.sfi || '--';
    if (kindexValue) {
      const kindex = indices.kindex || '--';
      kindexValue.textContent = kindex;
      // Color-code K-index
      if (kindex !== '--') {
        const k = parseInt(kindex);
        if (k <= 2) kindexValue.style.color = 'var(--green)';
        else if (k <= 4) kindexValue.style.color = 'var(--yellow)';
        else kindexValue.style.color = 'var(--red)';
      }
    }
  }

  // Render per-band prediction cards with day/night indicator
  grid.innerHTML = '';
  conditions.forEach(band => {
    const card = document.createElement('div');
    const timeClass = dayNightTime === 'day' ? 'band-card-day' : 'band-card-night';
    card.className = `band-card ${conditionColorClass(band.condition)} ${timeClass}`;

    const name = document.createElement('span');
    name.className = 'band-name';
    name.textContent = band.label;

    const reliability = document.createElement('span');
    reliability.className = 'band-reliability';
    reliability.textContent = `${band.reliability}%`;

    const condLabel = document.createElement('span');
    condLabel.className = 'band-condition-label';
    condLabel.textContent = conditionLabel(band.condition);

    card.appendChild(name);
    card.appendChild(reliability);
    card.appendChild(condLabel);
    grid.appendChild(card);
  });
}
