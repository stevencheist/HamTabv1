// --- VOACAP prediction router ---
// SSN fetch, VOACAP bridge predictions, simplified fallback model.
// Extracted from server.js.

const express = require('express');
const { XMLParser } = require('fast-xml-parser');
const { fetchJSON, fetchText } = require('../services/http-fetch');
const { registerCache } = require('../services/cache-store');
const { setFreshnessHeaders } = require('../services/freshness-headers');
const voacap = require('../../voacap-bridge.js');

const router = express.Router();

// --- SSN cache ---

const ssnCache = { data: null, fetchedAt: 0, expires: 0 };
const SSN_TTL = 24 * 60 * 60 * 1000; // 24 hours

async function getCurrentSSN() {
  if (ssnCache.data && Date.now() < ssnCache.expires) {
    return ssnCache.data;
  }

  try {
    // NOAA predicted monthly sunspot number (JSON array of [year, month, ssn, ...])
    const raw = await fetchJSON('https://services.swpc.noaa.gov/json/predicted_monthly_sunspot_number.json');
    const now = new Date();
    const currentYear = now.getUTCFullYear();
    const currentMonth = now.getUTCMonth() + 1;

    // Find entry matching current UTC month/year
    let entry = null;
    if (Array.isArray(raw)) {
      entry = raw.find(e =>
        e['time-tag'] &&
        new Date(e['time-tag']).getUTCFullYear() === currentYear &&
        (new Date(e['time-tag']).getUTCMonth() + 1) === currentMonth
      );
    }

    if (entry && entry['predicted_ssn'] != null) {
      ssnCache.data = {
        ssn: parseFloat(entry['predicted_ssn']),
        month: currentMonth,
        year: currentYear,
        source: 'noaa',
      };
    } else {
      // Fallback: use first entry or a reasonable default
      const fallbackSSN = Array.isArray(raw) && raw.length > 0 && raw[0]['predicted_ssn'] != null
        ? parseFloat(raw[0]['predicted_ssn'])
        : 50;
      ssnCache.data = {
        ssn: fallbackSSN,
        month: currentMonth,
        year: currentYear,
        source: 'noaa-fallback',
      };
    }

    ssnCache.fetchedAt = Date.now();
    ssnCache.expires = Date.now() + SSN_TTL;
    return ssnCache.data;
  } catch (err) {
    console.error('Error fetching SSN:', err.message);

    // If we have stale data, return it
    if (ssnCache.data) return ssnCache.data;

    // Last resort: reasonable default
    return {
      ssn: 50,
      month: new Date().getUTCMonth() + 1,
      year: new Date().getUTCFullYear(),
      source: 'default',
    };
  }
}

// --- K-index cache for real-time geomagnetic corrections ---
// K-index from HamQSL updates every 3 hours but conditions can change rapidly,
// so we use a 10-minute cache to balance freshness with API load.
const kIndexCache = { kindex: null, aindex: null, expires: 0 };
const KINDEX_TTL = 10 * 60 * 1000; // 10 minutes

async function getCurrentKIndex() {
  // Return cached data if still valid
  if (Date.now() < kIndexCache.expires && kIndexCache.kindex !== null) {
    return { kindex: kIndexCache.kindex, aindex: kIndexCache.aindex };
  }

  try {
    const xml = await fetchText('https://www.hamqsl.com/solarxml.php');
    const solar = parseSolarXML(xml);

    const kindex = parseInt(solar.indices.kindex, 10);
    const aindex = parseInt(solar.indices.aindex, 10);

    kIndexCache.kindex = isNaN(kindex) ? null : kindex;
    kIndexCache.aindex = isNaN(aindex) ? null : aindex;
    kIndexCache.expires = Date.now() + KINDEX_TTL;

    return { kindex: kIndexCache.kindex, aindex: kIndexCache.aindex };
  } catch (err) {
    console.error('Error fetching K-index:', err.message);

    // If we have stale data, return it
    if (kIndexCache.kindex !== null) {
      return { kindex: kIndexCache.kindex, aindex: kIndexCache.aindex };
    }

    // Return null if no data available (caller should handle gracefully)
    return { kindex: null, aindex: null };
  }
}

// Calculate effective SSN with K-index degradation for geomagnetic storms.
// During storms, absorption increases and MUF decreases. We model this
// by reducing the "effective" SSN used for propagation calculations.
//
// Research basis (NOAA G-scale, SWSC aviation study):
// - G1 (Kp=5): Minor storm, degradation begins
// - G2 (Kp=6): "HF fading at higher latitudes"
// - G3 (Kp=7): "HF may be intermittent" — ~50% MUF drop threshold
// - G4 (Kp=8): "HF sporadic" — severe degradation
// - G5 (Kp=9): "HF may be impossible" — near blackout
// Sources: swpc.noaa.gov/noaa-scales-explanation, swsc-journal.org 2022
function calculateEffectiveSSN(baseSSN, kIndex) {
  // K-index to degradation factor mapping based on NOAA G-scale research:
  // - MOD threshold: 30% MUF drop, SEV threshold: 50% MUF drop
  // - "Storm-time decrease falls to 0.3-0.5 of undisturbed levels"
  const degradationMap = {
    0: 1.00,  // quiet — no effect
    1: 1.00,  // quiet — no effect
    2: 1.00,  // quiet — no measurable HF impact per research
    3: 0.95,  // unsettled — minimal effect (~5%)
    4: 0.90,  // unsettled/active — minor effect (~10%)
    5: 0.80,  // G1 minor storm — degradation begins (~20%)
    6: 0.65,  // G2 moderate — "fading at higher latitudes" (~35%)
    7: 0.50,  // G3 strong — "intermittent" = ~50% MUF drop threshold
    8: 0.30,  // G4 severe — "sporadic" (~70% loss)
    9: 0.15,  // G5 extreme — "may be impossible" (~85% loss)
  };

  // If K-index unavailable, use base SSN unchanged
  if (kIndex === null || kIndex === undefined || kIndex < 0 || kIndex > 9) {
    return {
      effectiveSSN: baseSSN,
      baseSSN,
      kIndex: null,
      degradationFactor: 1.0,
      degradationPercent: 0,
    };
  }

  const factor = degradationMap[kIndex] || 1.0;
  const effectiveSSN = Math.round(baseSSN * factor * 10) / 10;
  const degradationPercent = Math.round((1 - factor) * 100);

  return {
    effectiveSSN,
    baseSSN,
    kIndex,
    degradationFactor: factor,
    degradationPercent,
  };
}

// Classify K-index into bands for cache key partitioning:
// q=quiet (K<=2), u=unsettled (K=3), s=storm (K=4-5), x=extreme (K>=6)
function getKBand(kIndex) {
  if (kIndex === null || kIndex === undefined) return 'q'; // assume quiet if unknown
  if (kIndex <= 2) return 'q';
  if (kIndex === 3) return 'u';
  if (kIndex <= 5) return 's';
  return 'x';
}

// --- VOACAP prediction cache ---

const voacapCache = registerCache({}); // { key: { data, expires } }
const VOACAP_TTL = 60 * 60 * 1000; // 1 hour

// --- Simplified propagation model (server-side fallback when Python unavailable) ---
// Mirrors the client-side calculate24HourMatrix from band-conditions.js

function simplifiedVoacapMatrix(txLat, txLon, ssn, month, power, mode, toaDeg, longPath) {
  // Mode SNR/bandwidth mapping
  const modeParams = {
    CW:  { snr: 39, bw: 500 },
    SSB: { snr: 73, bw: 2700 },
    FT8: { snr: 2,  bw: 50 },
  };
  const mp = modeParams[mode] || modeParams.SSB;

  // Simplified solar flux estimate from SSN (empirical: SFI ≈ 63 + 0.73 * SSN)
  const sfi = 63 + 0.73 * ssn;

  // VOACAP band subset (no 160m, no 60m)
  const bands = [
    { name: '80m',  freq: 3.7 },
    { name: '40m',  freq: 7.15 },
    { name: '30m',  freq: 10.12 },
    { name: '20m',  freq: 14.15 },
    { name: '17m',  freq: 18.1 },
    { name: '15m',  freq: 21.2 },
    { name: '12m',  freq: 24.93 },
    { name: '10m',  freq: 28.5 },
  ];

  const matrix = [];

  for (let hour = 0; hour < 24; hour++) {
    // Solar zenith–based day fraction
    const df = dayFractionServer(txLat, txLon, hour);
    const muf = calculateMUFServer(sfi, df);

    const bandResults = {};
    for (const band of bands) {
      let rel = calculateBandReliabilityServer(band.freq, muf, df >= 0.5, {
        mode, powerWatts: power, toaDeg, longPath,
      });
      bandResults[band.name] = { rel: Math.round(rel), snr: 0, mode: '' };
    }

    matrix.push({
      hour,
      bands: bandResults,
      muf: Math.round(muf * 10) / 10,
    });
  }

  return matrix;
}

// Server-side day fraction (mirrors client band-conditions.js dayFraction)
function dayFractionServer(lat, lon, utcHour) {
  if (lat == null || lon == null) {
    return (utcHour >= 6 && utcHour < 18) ? 1.0 : 0.0;
  }
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now - start) / 86400000) + 1;
  const declRad = Math.asin(
    Math.sin(23.44 * Math.PI / 180) * Math.sin((360 / 365) * (dayOfYear - 81) * Math.PI / 180)
  );
  const solarNoonOffset = lon / 15;
  const hourAngle = (utcHour - 12 + solarNoonOffset) * 15;
  const haRad = hourAngle * Math.PI / 180;
  const latRad = lat * Math.PI / 180;
  const cosZenith = Math.sin(latRad) * Math.sin(declRad) +
                    Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
  const zenith = Math.acos(Math.max(-1, Math.min(1, cosZenith))) * 180 / Math.PI;
  if (zenith <= 80) return 1.0;
  if (zenith >= 100) return 0.0;
  return (100 - zenith) / 20;
}

// Server-side MUF calculation (mirrors client band-conditions.js)
function calculateMUFServer(sfi, dayFrac) {
  if (dayFrac === true) dayFrac = 1.0;
  else if (dayFrac === false) dayFrac = 0.0;
  const foF2Factor = 0.6 + 0.3 * dayFrac;
  const foF2 = foF2Factor * Math.sqrt(Math.max(sfi, 50));
  return foF2 * 3.5; // obliquity factor
}

// Server-side band reliability (mirrors client band-conditions.js)
// Tuned to be more realistic — original was too optimistic (all green).
// Key changes:
// - Above MUF: much steeper dropoff (was 40% base, now 15%)
// - FT8 bonus: reduced from +30 to +15 (still significant but not magic)
// - Below optimal: reduced daytime floor, increased night bonus modestly
function calculateBandReliabilityServer(freqMHz, muf, isDay, opts) {
  const mufLower = muf * 0.5;   // LUF approximation
  const mufOptimal = muf * 0.85; // optimal frequency ~85% of MUF
  let base = 0;

  if (freqMHz < mufLower) {
    // Below LUF: heavy D-layer absorption during day, better at night
    if (isDay) {
      base = Math.max(0, 10 - (mufLower - freqMHz) * 3); // was 20, now 10 max
    } else {
      base = Math.min(70, 40 + (mufLower - freqMHz) * 1.0); // reduced from 85/60
    }
  } else if (freqMHz <= mufOptimal) {
    // Between LUF and optimal: good propagation zone
    const position = (freqMHz - mufLower) / (mufOptimal - mufLower);
    base = 50 + (35 * Math.sin(position * Math.PI)); // was 70+30, now 50+35
  } else if (freqMHz <= muf) {
    // Between optimal and MUF: still usable but degrading
    const position = (freqMHz - mufOptimal) / (muf - mufOptimal);
    base = 75 - (position * 35); // was 90-40, now 75-35 (ends at 40% at MUF)
  } else {
    // Above MUF: rapid dropoff — signals won't reflect
    const excess = freqMHz - muf;
    base = Math.max(0, 15 - excess * 5); // was 40-3x, now 15-5x (much steeper)
  }

  if (opts) {
    // Mode adjustments — FT8 helps but isn't magic
    if (opts.mode === 'CW') base += 8;      // was +10
    else if (opts.mode === 'FT8') base += 15; // was +30 (way too high)

    // Power adjustment (±10 dB = ±15% reliability)
    if (opts.powerWatts && opts.powerWatts !== 100) {
      base += 10 * Math.log10(opts.powerWatts / 100) * 1.5;
    }

    // TOA adjustment — higher angles slightly better for skip
    if (opts.toaDeg != null) {
      base += (opts.toaDeg - 5) * 0.5; // reduced from 1.5
    }

    // Long path penalty
    if (opts.longPath) base -= 30; // was -25
  }

  return Math.max(0, Math.min(100, base));
}

// Representative global targets for multi-target VOACAP overview.
// 4 targets x 24 hours = 96 predictions — fits within container CPU budget.
const VOACAP_TARGETS = [
  { name: 'Europe',        lat: 50.0,  lon: 10.0 },
  { name: 'East Asia',     lat: 35.0,  lon: 135.0 },
  { name: 'South America', lat: -15.0, lon: -47.0 },
  { name: 'North America', lat: 40.0,  lon: -100.0 },
];

// --- parseSolarXML (needed for K-index fetch) ---
// Parses HamQSL solar XML using fast-xml-parser (same as server.js).
function parseSolarXML(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const doc = parser.parse(xml);
  const sd = doc.solar.solardata;

  const str = (v) => (v != null ? String(v).trim() : '');

  const indices = {
    sfi:           str(sd.solarflux),
    sunspots:      str(sd.sunspots),
    aindex:        str(sd.aindex),
    kindex:        str(sd.kindex),
    xray:          str(sd.xray),
    signalnoise:   str(sd.signalnoise),
    updated:       str(sd.updated),
    solarwind:     str(sd.solarwind),
    magneticfield: str(sd.magneticfield),
    protonflux:    str(sd.protonflux),
    electonflux:   str(sd.electonflux),
    aurora:        str(sd.aurora),
    latdegree:     str(sd.latdegree),
    heliumline:    str(sd.heliumline),
    geomagfield:   str(sd.geomagfield),
    kindexnt:      str(sd.kindexnt),
    fof2:          str(sd.fof2),
    muffactor:     str(sd.muffactor),
    muf:           str(sd.muf),
  };

  // Parse HF band conditions
  const bands = [];
  const rawBands = sd.calculatedconditions?.band;
  if (rawBands) {
    const bandArr = Array.isArray(rawBands) ? rawBands : [rawBands];
    bandArr.forEach(b => {
      bands.push({
        band:      b['@_name']  || '',
        time:      b['@_time']  || '',
        condition: String(typeof b === 'object' ? b['#text'] : b || '').trim(),
      });
    });
  }

  // Parse VHF conditions
  const vhf = [];
  const rawVhf = sd.calculatedvhfconditions?.phenomenon;
  if (rawVhf) {
    const vhfArr = Array.isArray(rawVhf) ? rawVhf : [rawVhf];
    vhfArr.forEach(p => {
      vhf.push({
        name:      p['@_name']     || '',
        location:  p['@_location'] || '',
        condition: String(typeof p === 'object' ? p['#text'] : p || '').trim(),
      });
    });
  }

  return { indices, bands, vhf };
}

// --- Routes ---

// Return SSN data
router.get('/voacap/ssn', async (req, res) => {
  try {
    // Snapshot cache state before getCurrentSSN may overwrite it.
    const wasCached = ssnCache.data && Date.now() < ssnCache.expires;
    const ssn = await getCurrentSSN();
    setFreshnessHeaders(res, {
      fetchedAt: ssnCache.fetchedAt || Date.now(),
      expires: ssnCache.expires,
      cacheHit: wasCached,
    });
    res.json(ssn);
  } catch (err) {
    console.error('Error fetching SSN:', err.message);
    res.status(502).json({ error: 'Failed to fetch SSN data' });
  }
});

// VOACAP bridge diagnostics — helps debug container startup issues
router.get('/voacap/status', (req, res) => {
  res.json(voacap.getStatus());
});

// VOACAP prediction endpoint
router.get('/voacap', async (req, res) => {
  try {
    // Validate params
    const txLat = parseFloat(req.query.txLat);
    const txLon = parseFloat(req.query.txLon);
    if (isNaN(txLat) || isNaN(txLon) || txLat < -90 || txLat > 90 || txLon < -180 || txLon > 180) {
      return res.status(400).json({ error: 'Invalid or missing txLat/txLon' });
    }

    const rxLat = req.query.rxLat != null ? parseFloat(req.query.rxLat) : null;
    const rxLon = req.query.rxLon != null ? parseFloat(req.query.rxLon) : null;
    if (rxLat != null && (isNaN(rxLat) || rxLat < -90 || rxLat > 90)) {
      return res.status(400).json({ error: 'Invalid rxLat' });
    }
    if (rxLon != null && (isNaN(rxLon) || rxLon < -180 || rxLon > 180)) {
      return res.status(400).json({ error: 'Invalid rxLon' });
    }

    const validPowers = [5, 100, 1000];
    const power = validPowers.includes(parseInt(req.query.power)) ? parseInt(req.query.power) : 100;

    const validModes = ['CW', 'SSB', 'FT8'];
    const mode = validModes.includes(req.query.mode) ? req.query.mode : 'SSB';

    const validToa = [3, 5, 10, 15];
    const toa = validToa.includes(parseInt(req.query.toa)) ? parseInt(req.query.toa) : 5;

    const validPath = ['SP', 'LP'];
    const pathType = validPath.includes(req.query.path) ? req.query.path : 'SP';
    const longPath = pathType === 'LP';

    // Optional client-provided SNR override (integer dB, clamped to safe range)
    const clientSnr = req.query.snr != null ? parseInt(req.query.snr, 10) : null;
    const snrOverride = (clientSnr != null && !isNaN(clientSnr)) ? Math.max(-10, Math.min(100, clientSnr)) : null;

    // API token validation — if VOACAP_API_TOKENS is set in .env, require a valid token.
    // Format: comma-separated list of tokens, e.g. VOACAP_API_TOKENS=abc123,def456
    // Client sends token via X-Voacap-Token header or ?token= query param.
    // When not configured (lanmode default), all requests are allowed.
    const allowedTokens = process.env.VOACAP_API_TOKENS;
    if (allowedTokens) {
      const tokenSet = new Set(allowedTokens.split(',').map(t => t.trim()).filter(Boolean));
      const clientToken = req.headers['x-voacap-token'] || req.query.token || '';
      if (!tokenSet.has(clientToken)) {
        return res.status(401).json({ error: 'Invalid or missing API token' });
      }
    }

    // Fetch SSN and K-index in parallel for real-time corrections
    const [ssnData, kIndexData] = await Promise.all([
      getCurrentSSN(),
      getCurrentKIndex(),
    ]);

    const baseSSN = ssnData.ssn;
    const month = ssnData.month;
    const kIndex = kIndexData.kindex;

    // Calculate effective SSN with K-index degradation
    const ssnCorrection = calculateEffectiveSSN(baseSSN, kIndex);
    const ssn = ssnCorrection.effectiveSSN;
    const kBand = getKBand(kIndex);

    // Cache key — round lat/lon to 1 decimal, include K-band for storm transitions
    const cacheKey = [
      Math.round(txLat * 10) / 10,
      Math.round(txLon * 10) / 10,
      rxLat != null ? Math.round(rxLat * 10) / 10 : 'all',
      rxLon != null ? Math.round(rxLon * 10) / 10 : 'all',
      power, mode, toa, pathType, kBand,
      snrOverride != null ? snrOverride : 'default',
    ].join(':');

    const cached = voacapCache[cacheKey];
    if (cached && Date.now() < cached.expires) {
      setFreshnessHeaders(res, { fetchedAt: cached.fetchedAt, expires: cached.expires, cacheHit: true });
      return res.json(cached.data);
    }

    // Mode → default required SNR (dB above noise in BW) and bandwidth.
    // These are the "Normal" (level 3) defaults. Client can override via ?snr= param.
    // See SENSITIVITY_LEVELS in voacap.js for the full 1-5 preset table.
    const modeMap = {
      CW:  { snr: 30, bw: 500 },
      SSB: { snr: 54, bw: 2700 },
      FT8: { snr: 2,  bw: 50 },
    };
    const modeDefaults = modeMap[mode] || modeMap.SSB;
    const requiredSnr = snrOverride != null ? snrOverride : modeDefaults.snr;
    const bandwidthHz = modeDefaults.bw;

    // VOACAP band frequencies (no 160m, no 60m)
    const frequencies = [3.7, 7.15, 10.12, 14.15, 18.1, 21.2, 24.93, 28.5];
    const bandNames = ['80m', '40m', '30m', '20m', '17m', '15m', '12m', '10m'];

    // Determine targets
    let targets;
    if (rxLat != null && rxLon != null) {
      targets = [{ name: 'target', lat: rxLat, lon: rxLon }];
    } else {
      // Use representative global targets; swap NA for Caribbean if TX is in NA
      targets = VOACAP_TARGETS.map(t => {
        if (t.name === 'North America' && txLat > 24 && txLat < 50 && txLon > -130 && txLon < -60) {
          return { name: 'Caribbean', lat: 18.0, lon: -66.0 };
        }
        return t;
      });
    }

    // Hybrid approach: try dvoacap with a short inline timeout.
    // On lanmode (fast CPU), dvoacap completes in seconds — return it inline.
    // On hostedmode (slow container), timeout fires — return simplified immediately,
    // let dvoacap continue in the background and cache for the next request.
    const INLINE_TIMEOUT_MS = 15000; // 15 seconds — enough for lanmode, fast-fail for container

    let engine = 'simplified';
    let matrix;
    let fallbackReason = null;

    const predictionParams = {
      tx_lat: txLat,
      tx_lon: txLon,
      targets: targets.map(t => ({ name: t.name, lat: t.lat, lon: t.lon })),
      ssn,
      month,
      power,
      min_angle_deg: toa,
      long_path: longPath,
      required_snr: requiredSnr,
      bandwidth_hz: bandwidthHz,
      frequencies,
      band_names: bandNames,
    };

    if (voacap.isAvailable()) {
      // Start the prediction — we'll race it against a timeout
      const predictionPromise = voacap.predictMatrix(predictionParams);

      try {
        const result = await Promise.race([
          predictionPromise,
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('inline timeout')), INLINE_TIMEOUT_MS)
          ),
        ]);

        // dvoacap completed in time — use it
        if (result.ok && result.matrix) {
          engine = 'dvoacap';
          matrix = result.matrix;
        } else {
          fallbackReason = `predictMatrix returned: ${result.error || 'no matrix'}`;
          matrix = simplifiedVoacapMatrix(txLat, txLon, ssn, month, power, mode, toa, longPath);
        }
      } catch (err) {
        // Inline timeout or prediction error — return simplified now
        matrix = simplifiedVoacapMatrix(txLat, txLon, ssn, month, power, mode, toa, longPath);

        if (err.message === 'inline timeout') {
          fallbackReason = 'dvoacap too slow — running in background';
          // Let the prediction continue in the background — cache result when done
          predictionPromise.then(result => {
            if (result.ok && result.matrix) {
              console.log('[VOACAP] Background prediction complete — caching dvoacap result');
              const bgResponse = {
                engine: 'dvoacap',
                ssn: Math.round(ssn * 10) / 10,
                ssnBase: Math.round(baseSSN * 10) / 10,
                kIndex: ssnCorrection.kIndex,
                kDegradation: ssnCorrection.degradationPercent,
                month,
                matrix: result.matrix,
              };
              voacapCache[cacheKey] = { data: bgResponse, fetchedAt: Date.now(), expires: Date.now() + VOACAP_TTL };
            }
          }).catch(bgErr => {
            console.error(`[VOACAP] Background prediction error: ${bgErr.message}`);
            if (bgErr.message === 'Request timed out') {
              voacap.killAndRespawn('Background prediction timed out after 180s');
            }
          });
        } else {
          fallbackReason = `predictMatrix threw: ${err.message}`;
        }
      }
    } else {
      fallbackReason = 'bridge not available';
      matrix = simplifiedVoacapMatrix(txLat, txLon, ssn, month, power, mode, toa, longPath);
    }

    const response = {
      engine,
      ssn: Math.round(ssn * 10) / 10,
      ssnBase: Math.round(baseSSN * 10) / 10,
      kIndex: ssnCorrection.kIndex,
      kDegradation: ssnCorrection.degradationPercent,
      month,
      matrix,
    };
    if (fallbackReason) response.fallbackReason = fallbackReason;

    const ttl = engine === 'dvoacap' ? VOACAP_TTL : 30 * 1000; // 1h vs 30s
    const now = Date.now();
    voacapCache[cacheKey] = { data: response, fetchedAt: now, expires: now + ttl };
    setFreshnessHeaders(res, { fetchedAt: now, expires: voacapCache[cacheKey].expires, cacheHit: false });
    res.json(response);
  } catch (err) {
    console.error('Error in /api/voacap:', err.message);
    res.status(500).json({ error: 'Failed to compute VOACAP predictions' });
  }
});

module.exports = router;
