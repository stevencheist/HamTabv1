// --- Scope Signal Generator ---
// Synthetic spectrum data source for demo mode panadapter.
// Noise generator ported from VirtualHam noise-generator.ts.
// createSpectrumDataSource uses BAND_PROPS/getDayFactor from propagation engine.

import { BAND_PROPS, getDayFactor } from '../cat/simulator/propagation-signal-engine.js';

// --- Ported noise-generator primitives ---

// Box-Muller Gaussian random (mean=0, stddev=1)
function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** Generate a simulated noise floor with Gaussian noise per bin */
export function generateNoiseFloor(bins, floorDb, varianceDb) {
  const buffer = new Float32Array(bins);
  for (let i = 0; i < bins; i++) {
    buffer[i] = floorDb + gaussianRandom() * varianceDb;
  }
  return buffer;
}

/** Inject a Gaussian signal peak into a magnitude buffer */
export function addSignal(buffer, centerBin, widthBins, peakDb) {
  const sigma = widthBins / 2.355; // FWHM to sigma
  const sigmaSq2 = 2 * sigma * sigma;
  // Convert peak to linear once, then apply Gaussian envelope in linear domain
  const peakLinear = Math.pow(10, peakDb / 10);

  const start = Math.max(0, Math.floor(centerBin - widthBins * 2));
  const end = Math.min(buffer.length - 1, Math.ceil(centerBin + widthBins * 2));

  for (let i = start; i <= end; i++) {
    const d = i - centerBin;
    const gaussianFactor = Math.exp(-(d * d) / sigmaSq2);
    const signalLinear = peakLinear * gaussianFactor;
    // Power sum in linear domain, then back to dB
    const existing = Math.pow(10, buffer[i] / 10);
    buffer[i] = 10 * Math.log10(existing + signalLinear);
  }
}

/** Exponential moving average blend for temporal coherence */
export function blendFrames(prev, current, alpha) {
  const result = new Float32Array(current.length);
  for (let i = 0; i < current.length; i++) {
    result[i] = prev.length === current.length
      ? alpha * current[i] + (1 - alpha) * prev[i]
      : current[i];
  }
  return result;
}

// --- Known FT8/digital frequencies (Hz) ---
const FT8_FREQS = [
  1_840_000, 3_573_000, 5_357_000, 7_074_000, 10_136_000,
  14_074_000, 18_100_000, 21_074_000, 24_915_000, 28_074_000, 50_313_000,
];

// Deterministic seed from band name
function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return h;
}

// Simple seeded pseudo-random (Mulberry32)
function seededRandom(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Create a spectrum data source that generates per-frame synthetic spectrum data.
 * @param {object} opts - { bins, spanHz, longitude }
 * @returns {{ generateFrame(centerHz, band), destroy() }}
 */
export function createSpectrumDataSource(opts) {
  if (!opts) opts = {};
  const bins = opts.bins || 512;
  const spanHz = opts.spanHz || 48000;
  const longitude = opts.longitude || 0;

  let prevFrame = new Float32Array(bins);
  let signalCache = null; // cached persistent signals per band
  let cachedBand = null;

  // Detect band from frequency
  function detectBand(freq) {
    for (const [band, props] of Object.entries(BAND_PROPS)) {
      if (freq >= props.min && freq <= props.max) return band;
    }
    return null;
  }

  // Map propagation engine noiseFloor (0-30 scale) to dB
  // noiseFloor 6 → -112 dB, noiseFloor 30 → -80 dB
  function noiseFloorToDb(nf) {
    return -112 + ((nf - 6) / 24) * 32;
  }

  // Build persistent signals for a band (deterministic, seeded by band name)
  function buildSignals(band, centerHz) {
    const props = BAND_PROPS[band];
    if (!props) return [];

    const rng = seededRandom(hashSeed(band));
    const signals = [];
    const hzPerBin = spanHz / bins;

    // FT8 frequencies that fall within the visible span
    const startHz = centerHz - spanHz / 2;
    const endHz = centerHz + spanHz / 2;

    for (const ft8 of FT8_FREQS) {
      if (ft8 >= startHz && ft8 <= endHz) {
        const bin = Math.round((ft8 - startHz) / hzPerBin);
        signals.push({
          bin,
          widthBins: Math.max(2, Math.round(3000 / hzPerBin)), // ~3kHz wide FT8 cluster
          basePeakDb: -55,
          qsbPeriod: 8000 + rng() * 12000,
          qsbDepth: 4,
          seed: rng() * 1000,
        });
      }
    }

    // CW signals — clustered in lower portion of band
    const cwZoneStart = props.min;
    const cwZoneEnd = props.min + (props.max - props.min) * 0.15;
    const cwCount = 2 + Math.floor(rng() * 4);
    for (let i = 0; i < cwCount; i++) {
      const freq = cwZoneStart + rng() * (cwZoneEnd - cwZoneStart);
      if (freq >= startHz && freq <= endHz) {
        const bin = Math.round((freq - startHz) / hzPerBin);
        signals.push({
          bin,
          widthBins: Math.max(1, Math.round(200 / hzPerBin)), // narrow CW
          basePeakDb: -65 + rng() * 20,
          qsbPeriod: 5000 + rng() * 15000,
          qsbDepth: 6,
          seed: rng() * 1000,
        });
      }
    }

    // SSB signals — scattered in phone zone (upper portion)
    const phoneZoneStart = props.min + (props.max - props.min) * 0.3;
    const phoneZoneEnd = props.max;
    const ssbCount = 3 + Math.floor(rng() * 5);
    for (let i = 0; i < ssbCount; i++) {
      const freq = phoneZoneStart + rng() * (phoneZoneEnd - phoneZoneStart);
      if (freq >= startHz && freq <= endHz) {
        const bin = Math.round((freq - startHz) / hzPerBin);
        signals.push({
          bin,
          widthBins: Math.max(2, Math.round(2400 / hzPerBin)), // SSB ~2.4kHz
          basePeakDb: -60 + rng() * 25,
          qsbPeriod: 6000 + rng() * 20000,
          qsbDepth: 6,
          seed: rng() * 1000,
        });
      }
    }

    return signals;
  }

  function generateFrame(centerHz, band) {
    if (!band) band = detectBand(centerHz);
    const props = band ? BAND_PROPS[band] : null;

    // Noise floor from band props
    const baseNoiseDb = props ? noiseFloorToDb(props.noiseFloor) : -100;
    const dayFactor = getDayFactor(longitude);

    // Day/night noise modulation: low bands noisier at night, high bands quieter at night
    let noiseMod = 0;
    if (props) {
      if (props.nightBonus > 0) {
        // Low bands: more noise at night
        noiseMod = (1 - dayFactor) * 8;
      } else {
        // High bands: slightly less noise at night
        noiseMod = dayFactor * 3;
      }
    }

    const frame = generateNoiseFloor(bins, baseNoiseDb + noiseMod, 3);

    // Rebuild signal cache if band changed
    if (band !== cachedBand) {
      signalCache = buildSignals(band || '20m', centerHz);
      cachedBand = band;
    }

    // Inject persistent signals with QSB fading
    const now = Date.now();
    for (const sig of signalCache) {
      const qsb = Math.sin(now / sig.qsbPeriod + sig.seed) * sig.qsbDepth;

      // Day/night strength modulation for signals
      let dayMod = 0;
      if (props) {
        dayMod = (props.dayPenalty * dayFactor + props.nightBonus * (1 - dayFactor)) * 0.15;
      }

      addSignal(frame, sig.bin, sig.widthBins, sig.basePeakDb + qsb + dayMod);
    }

    // Temporal smoothing for coherent waterfall
    const blended = blendFrames(prevFrame, frame, 0.4);
    prevFrame = blended;

    return blended;
  }

  function destroy() {
    prevFrame = new Float32Array(bins);
    signalCache = null;
    cachedBand = null;
  }

  return { generateFrame, destroy };
}
