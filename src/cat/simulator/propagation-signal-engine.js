// --- CAT Simulator: Propagation Signal Engine ---
// Generates band-realistic signal levels, SWR, and noise based on:
// - Time of day (sinusoidal day/night transition using UTC + longitude offset)
// - Band-specific propagation characteristics (night bands vs day bands)
// - Slow fade (random walk every 30s for band condition drift)
// - Fast QSB flutter (±15 random per reading)
// - Sporadic E openings on 6m
// - Parabolic SWR model from band center

const BAND_PROPS = {
  '160m': { min: 1_800_000, max: 2_000_000, center: 1_900_000, nightBonus: 60, dayPenalty: -40, baseSignal: 40, noiseFloor: 30 },
  '80m':  { min: 3_500_000, max: 4_000_000, center: 3_750_000, nightBonus: 50, dayPenalty: -30, baseSignal: 50, noiseFloor: 25 },
  '40m':  { min: 7_000_000, max: 7_300_000, center: 7_150_000, nightBonus: 30, dayPenalty: -10, baseSignal: 70, noiseFloor: 20 },
  '30m':  { min: 10_100_000, max: 10_150_000, center: 10_125_000, nightBonus: 20, dayPenalty: -5, baseSignal: 65, noiseFloor: 18 },
  '20m':  { min: 14_000_000, max: 14_350_000, center: 14_175_000, nightBonus: -20, dayPenalty: 30, baseSignal: 80, noiseFloor: 15 },
  '17m':  { min: 18_068_000, max: 18_168_000, center: 18_118_000, nightBonus: -25, dayPenalty: 25, baseSignal: 70, noiseFloor: 12 },
  '15m':  { min: 21_000_000, max: 21_450_000, center: 21_225_000, nightBonus: -30, dayPenalty: 35, baseSignal: 65, noiseFloor: 10 },
  '12m':  { min: 24_890_000, max: 24_990_000, center: 24_940_000, nightBonus: -35, dayPenalty: 30, baseSignal: 55, noiseFloor: 8 },
  '10m':  { min: 28_000_000, max: 29_700_000, center: 28_850_000, nightBonus: -40, dayPenalty: 40, baseSignal: 50, noiseFloor: 8 },
  '6m':   { min: 50_000_000, max: 54_000_000, center: 52_000_000, nightBonus: -50, dayPenalty: 20, baseSignal: 30, noiseFloor: 6 },
};

// Detect which band a frequency falls in
function detectBand(freq) {
  for (const [band, props] of Object.entries(BAND_PROPS)) {
    if (freq >= props.min && freq <= props.max) return band;
  }
  return null;
}

// Sinusoidal day factor: 0 = midnight, 1 = noon (smooth transition, not binary)
// Uses UTC hour + longitude offset to approximate local solar time
function getDayFactor(longitude) {
  const now = new Date();
  const utcHour = now.getUTCHours() + now.getUTCMinutes() / 60;
  const solarHour = (utcHour + longitude / 15 + 24) % 24; // local solar time
  // Sinusoidal: peaks at noon (12), troughs at midnight (0/24)
  return (Math.sin((solarHour - 6) * Math.PI / 12) + 1) / 2; // 0..1
}

export function createPropagationEngine(options = {}) {
  const latitude = options.latitude || 0;
  const longitude = options.longitude || 0;

  // Slow fade state: random walk updated every 30s
  let slowFadeOffset = 0;
  let slowFadeTimer = setInterval(() => {
    // Random walk: ±20 range, drift by ±5 each step
    slowFadeOffset += (Math.random() - 0.5) * 10;
    slowFadeOffset = Math.max(-20, Math.min(20, slowFadeOffset));
  }, 30_000);

  // Sporadic E state for 6m
  let sporadicEBoost = 0;
  let sporadicETimer = setInterval(() => {
    // 8% chance of sporadic E opening on each 30s tick
    if (Math.random() < 0.08) {
      sporadicEBoost = 60 + Math.random() * 40; // big signal boost
      // Opening lasts 15-60 seconds
      setTimeout(() => { sporadicEBoost = 0; }, 15_000 + Math.random() * 45_000);
    }
  }, 30_000);

  function getSignalLevel(frequency) {
    const band = detectBand(frequency);
    if (!band) return 40; // out-of-band: weak generic signal

    const props = BAND_PROPS[band];
    const dayFactor = getDayFactor(longitude);

    // Base signal + day/night modifier
    const dayNightMod = props.dayPenalty * dayFactor + props.nightBonus * (1 - dayFactor);
    let signal = props.baseSignal + dayNightMod;

    // Slow fade (band condition drift)
    signal += slowFadeOffset;

    // Fast QSB flutter: ±15 random
    signal += (Math.random() - 0.5) * 30;

    // Occasional stronger signals (DX pileup simulation)
    if (Math.random() < 0.03) {
      signal += Math.random() * 50;
    }

    // Sporadic E boost for 6m
    if (band === '6m') {
      signal += sporadicEBoost;
    }

    return Math.max(0, Math.min(255, Math.round(signal)));
  }

  function getSWR(frequency) {
    const band = detectBand(frequency);
    if (!band) return 3.5; // out-of-band: high SWR

    const props = BAND_PROPS[band];
    const bandWidth = props.max - props.min;
    const distFromCenter = Math.abs(frequency - props.center);
    const normalizedDist = distFromCenter / (bandWidth / 2); // 0 at center, 1 at edge

    // Parabolic: 1.1 at center → 2.5 at edges
    const baseSwr = 1.1 + 1.4 * normalizedDist * normalizedDist;

    // Small random variation
    const jitter = (Math.random() - 0.5) * 0.2;

    return Math.max(1.0, Math.round((baseSwr + jitter) * 10) / 10);
  }

  function getNoise(frequency) {
    const band = detectBand(frequency);
    if (!band) return 20;

    const props = BAND_PROPS[band];
    const dayFactor = getDayFactor(longitude);

    // Noise is higher on low bands, especially at night
    let noise = props.noiseFloor;
    if (props.nightBonus > 0) {
      // Low bands: more noise at night
      noise += (1 - dayFactor) * 15;
    }
    noise += (Math.random() - 0.5) * 6;

    return Math.max(0, Math.min(100, Math.round(noise)));
  }

  function destroy() {
    if (slowFadeTimer) { clearInterval(slowFadeTimer); slowFadeTimer = null; }
    if (sporadicETimer) { clearInterval(sporadicETimer); sporadicETimer = null; }
  }

  return { getSignalLevel, getSWR, getNoise, destroy };
}
