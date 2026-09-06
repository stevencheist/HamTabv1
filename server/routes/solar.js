// --- Solar / Space Weather / Lunar / DXpeditions / Contests / Propagation / DRAP router ---
// Extracted from server.js.

const https = require('https');
const { URL } = require('url');
const express = require('express');
const { XMLParser } = require('fast-xml-parser');
const { fetchJSON, fetchText, isPrivateIP, resolveHost, secureFetch } = require('../services/http-fetch');
const { registerCache } = require('../services/cache-store');
const { setFreshnessHeaders } = require('../services/freshness-headers');

const router = express.Router();

// =====================================================================
//  parseSolarXML — parse hamqsl.com solar XML into structured object
// =====================================================================

function parseSolarXML(xml) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  });

  const doc = parser.parse(xml);
  const sd = doc.solar.solardata;

  const str = (v) => (v != null ? String(v).trim() : ''); // normalize XML text nodes to trimmed strings (or '' if missing)

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

// =====================================================================
//  /solar — fetch and parse solar XML data
// =====================================================================

router.get('/solar', async (req, res) => {
  try {
    const xml = await fetchText('https://www.hamqsl.com/solarxml.php');
    const solar = parseSolarXML(xml);
    res.json(solar);
  } catch (err) {
    console.error('Error fetching solar data:', err.message);
    res.status(502).json({ error: 'Failed to fetch solar data' });
  }
});

// =====================================================================
//  Space Weather History (NOAA SWPC)
// =====================================================================

// Per-type in-memory cache, 15-minute TTL
const spacewxCache = registerCache({}); // { type: { data, expires } }
const SPACEWX_TTL = 15 * 60 * 1000; // 15 minutes

const SPACEWX_URLS = {
  kp:   'https://services.swpc.noaa.gov/products/noaa-planetary-k-index.json',
  xray: 'https://services.swpc.noaa.gov/json/goes/primary/xrays-7-day.json',
  sfi:  'https://services.swpc.noaa.gov/json/f107_cm_flux.json',
  wind: 'https://services.swpc.noaa.gov/products/solar-wind/plasma-7-day.json',
  mag:  'https://services.swpc.noaa.gov/products/solar-wind/mag-7-day.json',
};

// Downsample high-resolution data by bucket-averaging into ~targetPts points
function downsampleSpacewx(arr, targetPts) {
  if (arr.length <= targetPts) return arr;
  const bucketSize = Math.ceil(arr.length / targetPts);
  const result = [];
  for (let i = 0; i < arr.length; i += bucketSize) {
    const bucket = arr.slice(i, i + bucketSize);
    const avgTime = bucket[Math.floor(bucket.length / 2)].time_tag;
    // Average each numeric field in the bucket
    const keys = Object.keys(bucket[0]).filter(k => k !== 'time_tag');
    const avg = { time_tag: avgTime };
    for (const k of keys) {
      const vals = bucket.map(b => b[k]).filter(v => v !== null && !isNaN(v));
      avg[k] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    }
    result.push(avg);
  }
  return result;
}

// Normalize NOAA data into uniform { time_tag, value, [value2] } format
function normalizeSpacewx(type, raw) {
  switch (type) {
    case 'kp': {
      // First row is header: ["time_tag","Kp","Kp_fraction",...]
      const rows = raw.slice(1);
      return rows.map(r => ({
        time_tag: r[0],
        value: parseFloat(r[1]),
      })).filter(r => !isNaN(r.value));
    }
    case 'xray': {
      // Array of objects: { time_tag, flux }
      const parsed = raw.map(r => ({
        time_tag: r.time_tag,
        value: parseFloat(r.flux),
      })).filter(r => !isNaN(r.value) && r.value > 0);
      return downsampleSpacewx(parsed, 500);
    }
    case 'sfi': {
      // Array of objects: { time_tag, flux }
      return raw.map(r => ({
        time_tag: r.time_tag,
        value: parseFloat(r.flux),
      })).filter(r => !isNaN(r.value));
    }
    case 'wind': {
      // First row is header: ["time_tag","density","speed","temperature"]
      const rows = raw.slice(1);
      const parsed = rows.map(r => ({
        time_tag: r[0],
        value: parseFloat(r[2]), // speed column
      })).filter(r => !isNaN(r.value));
      return downsampleSpacewx(parsed, 500);
    }
    case 'mag': {
      // First row is header: ["time_tag","bx_gsm","by_gsm","bz_gsm","lon_gsm","lat_gsm","bt"]
      const rows = raw.slice(1);
      const parsed = rows.map(r => ({
        time_tag: r[0],
        value: parseFloat(r[3]),  // bz_gsm
        value2: parseFloat(r[6]), // bt (total field magnitude)
      })).filter(r => !isNaN(r.value));
      return downsampleSpacewx(parsed, 500);
    }
    default:
      return [];
  }
}

router.get('/spacewx/history', async (req, res) => {
  const type = req.query.type;
  if (!type || !SPACEWX_URLS[type]) {
    return res.status(400).json({ error: 'Invalid type. Use: kp, xray, sfi, wind, mag' });
  }

  try {
    // Return cached data if fresh
    const cached = spacewxCache[type];
    if (cached && Date.now() < cached.expires) {
      setFreshnessHeaders(res, { fetchedAt: cached.fetchedAt, expires: cached.expires, cacheHit: true });
      return res.json(cached.data);
    }

    const raw = await fetchJSON(SPACEWX_URLS[type]);
    const data = normalizeSpacewx(type, raw);

    const now = Date.now();
    spacewxCache[type] = { data, fetchedAt: now, expires: now + SPACEWX_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: spacewxCache[type].expires, cacheHit: false });
    res.json(data);
  } catch (err) {
    console.error(`Error fetching spacewx ${type}:`, err.message);
    res.status(502).json({ error: `Failed to fetch space weather ${type} data` });
  }
});

// =====================================================================
//  Lunar math (simplified Meeus algorithms)
// =====================================================================

// Greenwich Mean Sidereal Time in degrees from Julian Date
// Meeus, Chapter 12
function gmst(JD) {
  const T = (JD - 2451545.0) / 36525.0;
  return mod360(280.46061837 + 360.98564736629 * (JD - 2451545.0)
    + 0.000387933 * T * T - T * T * T / 38710000);
}

// Compute moon equatorial coordinates (RA, Dec) and horizontal parallax
// at an arbitrary Date. Extracted from computeLunar for reuse in rise/set.
function moonEquatorial(date) {
  const JD = julianDate(date);
  const T = (JD - 2451545.0) / 36525.0;
  const rad = Math.PI / 180;

  const Lp = mod360(218.3165 + 481267.8813 * T);
  const Mp = mod360(134.9634 + 477198.8676 * T);
  const D = mod360(297.8502 + 445267.1115 * T);
  const M = mod360(357.5291 + 35999.0503 * T);
  const F = mod360(93.2720 + 483202.0175 * T);

  let lambda = Lp
    + 6.289 * Math.sin(Mp * rad)
    - 1.274 * Math.sin((2 * D - Mp) * rad)
    + 0.658 * Math.sin(2 * D * rad)
    - 0.214 * Math.sin(2 * Mp * rad)
    - 0.186 * Math.sin(M * rad)
    - 0.114 * Math.sin(2 * F * rad);
  lambda = mod360(lambda);

  const beta = 5.128 * Math.sin(F * rad)
    + 0.281 * Math.sin((Mp + F) * rad)
    - 0.277 * Math.sin((Mp - F) * rad)
    - 0.173 * Math.sin((2 * D - F) * rad);

  const horizParallax = 0.9508
    + 0.0518 * Math.cos(Mp * rad)
    + 0.0095 * Math.cos((2 * D - Mp) * rad)
    + 0.0078 * Math.cos(2 * D * rad)
    + 0.0028 * Math.cos(2 * Mp * rad);

  const epsilon = 23.4393 - 0.0130 * T;
  const lambdaRad = lambda * rad;
  const betaRad = beta * rad;
  const epsilonRad = epsilon * rad;

  const sinDec = Math.sin(betaRad) * Math.cos(epsilonRad)
    + Math.cos(betaRad) * Math.sin(epsilonRad) * Math.sin(lambdaRad);
  const declination = Math.asin(sinDec) / rad;

  const sinRA = Math.cos(betaRad) * Math.sin(lambdaRad) * Math.cos(epsilonRad)
    - Math.sin(betaRad) * Math.sin(epsilonRad);
  const cosRA = Math.cos(betaRad) * Math.cos(lambdaRad);
  const rightAscension = mod360(Math.atan2(sinRA, cosRA) / rad);

  // Sun's ecliptic longitude (approximate) — needed for phase/illumination
  const sunLongitude = mod360(280.4665 + 36000.7698 * T);

  return { rightAscension, declination, horizParallax, lambda, beta, JD, T,
    sunLongitude, Mp, D, M, F, Lp };
}

// Compute moon horizontal coordinates (azimuth, elevation) from observer
// Meeus, Chapter 13 — sidereal time + coordinate transformation
function moonHorizontal(date, lat, lon) {
  const eq = moonEquatorial(date);
  const rad = Math.PI / 180;

  const lst = mod360(gmst(eq.JD) + lon); // local sidereal time (degrees)
  const ha = mod360(lst - eq.rightAscension); // hour angle (degrees)

  const haRad = ha * rad;
  const decRad = eq.declination * rad;
  const latRad = lat * rad;

  const sinAlt = Math.sin(latRad) * Math.sin(decRad)
    + Math.cos(latRad) * Math.cos(decRad) * Math.cos(haRad);
  const altitude = Math.asin(sinAlt) / rad;

  // Azimuth measured from North, clockwise
  const cosAlt = Math.cos(altitude * rad);
  let azimuth = 0;
  if (Math.abs(cosAlt) > 1e-10) {
    const sinAz = -Math.cos(decRad) * Math.sin(haRad) / cosAlt;
    const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) / (Math.cos(latRad) * cosAlt);
    azimuth = mod360(Math.atan2(sinAz, cosAz) / rad);
  }

  return { azimuth, elevation: altitude, horizParallax: eq.horizParallax };
}

// Compute next moonrise and moonset from current time
// Searches forward 48 hours in 5-minute steps, then linear-interpolates
// Standard altitude: h0 = 0.7275 * parallax - 34/60 (refraction + semidiameter)
function computeMoonRiseSet(lat, lon) {
  const now = new Date();
  const STEP_MS = 5 * 60000; // 5 minutes
  const STEPS = 576; // 48 hours / 5 min = 576 steps

  let prevCorr = null;
  let rise = null, set = null;

  for (let i = 0; i <= STEPS && (!rise || !set); i++) {
    const t = new Date(now.getTime() + i * STEP_MS);
    const horiz = moonHorizontal(t, lat, lon);
    const h0 = 0.7275 * horiz.horizParallax - 34 / 60; // degrees
    const corr = horiz.elevation - h0;

    if (prevCorr !== null) {
      if (prevCorr < 0 && corr >= 0 && !rise) {
        // Moon rising — interpolate
        const frac = -prevCorr / (corr - prevCorr);
        rise = Math.floor((now.getTime() + ((i - 1) + frac) * STEP_MS) / 1000);
      }
      if (prevCorr >= 0 && corr < 0 && !set) {
        // Moon setting — interpolate
        const frac = prevCorr / (prevCorr - corr);
        set = Math.floor((now.getTime() + ((i - 1) + frac) * STEP_MS) / 1000);
      }
    }
    prevCorr = corr;
  }

  return { moonrise: rise, moonset: set };
}

function computeLunar(lat, lon) {
  const now = new Date();
  const eq = moonEquatorial(now);
  const rad = Math.PI / 180;

  const distance = 6378.14 / Math.sin(eq.horizParallax * rad); // km

  let elongation = eq.lambda - eq.sunLongitude;
  elongation = mod360(elongation + 180) - 180;

  const illumination = (1 - Math.cos(elongation * rad)) / 2 * 100;
  const phase = moonPhaseName(elongation);

  const avgDistance = 384400; // km — mean Earth-Moon distance
  const pathLoss = 20 * Math.log10(distance / avgDistance);

  const result = {
    phase,
    illumination: Math.round(illumination * 10) / 10,
    declination: Math.round(eq.declination * 10) / 10,
    distance: Math.round(distance),
    pathLoss: Math.round(pathLoss * 100) / 100,
    elongation: Math.round(elongation * 10) / 10,
    eclipticLon: Math.round(eq.lambda * 10) / 10,
    eclipticLat: Math.round(eq.beta * 100) / 100,
    rightAscension: Math.round(eq.rightAscension * 10) / 10,
  };

  // Observer-dependent fields — only computed when lat/lon provided
  if (lat !== undefined && lon !== undefined) {
    const horiz = moonHorizontal(now, lat, lon);
    result.azimuth = Math.round(horiz.azimuth * 10) / 10;
    result.elevation = Math.round(horiz.elevation * 10) / 10;

    const riseSet = computeMoonRiseSet(lat, lon);
    result.moonrise = riseSet.moonrise; // Unix timestamp or null
    result.moonset = riseSet.moonset;   // Unix timestamp or null
  }

  return result;
}

function julianDate(date) {
  const Y = date.getUTCFullYear();
  const M = date.getUTCMonth() + 1;
  const D = date.getUTCDate()
    + date.getUTCHours() / 24
    + date.getUTCMinutes() / 1440
    + date.getUTCSeconds() / 86400;

  let y = Y, m = M;
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + D + B - 1524.5;
}

function mod360(x) {
  return ((x % 360) + 360) % 360;
}

function moonPhaseName(elongation) {
  const e = mod360(elongation);
  if (e < 22.5) return 'New Moon';
  if (e < 67.5) return 'Waxing Crescent';
  if (e < 112.5) return 'First Quarter';
  if (e < 157.5) return 'Waxing Gibbous';
  if (e < 202.5) return 'Full Moon';
  if (e < 247.5) return 'Waning Gibbous';
  if (e < 292.5) return 'Last Quarter';
  if (e < 337.5) return 'Waning Crescent';
  return 'New Moon';
}

// =====================================================================
//  /lunar — lunar data computation
// =====================================================================

router.get('/lunar', (req, res) => {
  try {
    // Optional observer coordinates for az/el and rise/set
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    const hasObserver = !isNaN(lat) && !isNaN(lon)
      && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
    const lunar = hasObserver ? computeLunar(lat, lon) : computeLunar();
    res.json(lunar);
  } catch (err) {
    console.error('Error computing lunar data:', err.message);
    res.status(500).json({ error: 'Failed to compute lunar data' });
  }
});

// =====================================================================
//  SDO solar image frames
// =====================================================================

const SDO_TYPES = new Set(['0193', '0171', '0304', 'HMIIC']);

// --- SDO browse frame list (animated time-lapse) ---
// Cache per-day directory listings to avoid re-scraping
const sdoDirCache = registerCache({}); // { 'YYYY/MM/DD:type': { frames: [], expires: timestamp } }

// Scrape one day's directory listing for frame filenames
async function scrapeSDODay(dateKey, type) {
  const cacheKey = `${dateKey}:${type}`;
  const cached = sdoDirCache[cacheKey];
  if (cached && Date.now() < cached.expires) return cached.frames;

  const html = await fetchText(`https://sdo.gsfc.nasa.gov/assets/img/browse/${dateKey}/`);
  const pattern = new RegExp(`\\d{8}_\\d{6}_512_${type}\\.jpg`, 'g');
  const frames = [];
  let match;
  while ((match = pattern.exec(html)) !== null) frames.push(match[0]);

  // Yesterday's listing is immutable — cache for 6 hours; today's for 10 minutes
  const now = new Date();
  const todayKey = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`;
  const ttl = (dateKey === todayKey) ? 10 * 60 * 1000 : 6 * 3600 * 1000;
  sdoDirCache[cacheKey] = { frames, expires: Date.now() + ttl };
  return frames;
}

router.get('/solar/frames', async (req, res) => {
  try {
    const type = SDO_TYPES.has(req.query.type) ? req.query.type : '0193';
    const now = new Date();
    const todayKey = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}/${String(now.getUTCDate()).padStart(2, '0')}`;

    // Yesterday's date
    const yesterday = new Date(now);
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    const yesterdayKey = `${yesterday.getUTCFullYear()}/${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}/${String(yesterday.getUTCDate()).padStart(2, '0')}`;

    // Fetch both days in parallel
    const [yesterdayFrames, todayFrames] = await Promise.all([
      scrapeSDODay(yesterdayKey, type).catch(() => []),
      scrapeSDODay(todayKey, type).catch(() => []),
    ]);

    // Combine and return last 48 frames (~8 hours of coverage)
    const allFrames = [...yesterdayFrames, ...todayFrames];
    const frames = allFrames.slice(-48);
    res.json(frames);
  } catch (err) {
    console.error('Error fetching SDO frame list:', err.message);
    res.status(502).json({ error: 'Failed to fetch SDO frame list' });
  }
});

// Proxy individual SDO browse frames
const SDO_FRAME_RE = /^\d{8}_\d{6}_512_\w+\.jpg$/;

router.get('/solar/frame/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    if (!SDO_FRAME_RE.test(filename)) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    // Extract date from filename (YYYYMMDD_HHMMSS_512_type.jpg)
    const yyyy = filename.substring(0, 4);
    const mm = filename.substring(4, 6);
    const dd = filename.substring(6, 8);
    const url = `https://sdo.gsfc.nasa.gov/assets/img/browse/${yyyy}/${mm}/${dd}/${filename}`;
    const parsed = new URL(url);
    const resolvedIP = await resolveHost(parsed.hostname);
    if (isPrivateIP(resolvedIP)) {
      return res.status(403).json({ error: 'Blocked' });
    }
    const proxyReq = https.get({
      hostname: resolvedIP,
      path: parsed.pathname,
      port: 443,
      headers: { 'User-Agent': 'HamTab/1.0', 'Host': parsed.hostname },
      servername: parsed.hostname,
    }, (upstream) => {
      if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
        upstream.resume();
        return res.status(502).json({ error: 'Failed to fetch SDO frame' });
      }
      res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=86400');
      upstream.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('SDO frame proxy error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to fetch SDO frame' });
    });
    proxyReq.setTimeout(15000, () => { proxyReq.destroy(); });
  } catch (err) {
    console.error('Error fetching SDO frame:', err.message);
    res.status(502).json({ error: 'Failed to fetch SDO frame' });
  }
});

router.get('/solar/image', async (req, res) => {
  try {
    const type = SDO_TYPES.has(req.query.type) ? req.query.type : '0193';
    const url = `https://sdo.gsfc.nasa.gov/assets/img/latest/latest_512_${type}.jpg`;
    const parsed = new URL(url);
    const resolvedIP = await resolveHost(parsed.hostname);
    if (isPrivateIP(resolvedIP)) {
      return res.status(403).json({ error: 'Blocked' });
    }
    const proxyReq = https.get({
      hostname: resolvedIP,
      path: parsed.pathname,
      port: 443,
      headers: { 'User-Agent': 'HamTab/1.0', 'Host': parsed.hostname },
      servername: parsed.hostname,
    }, (upstream) => {
      if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
        upstream.resume();
        return res.status(502).json({ error: 'Failed to fetch SDO image' });
      }
      res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=300');
      upstream.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('SDO image proxy error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to fetch SDO image' });
    });
    proxyReq.setTimeout(15000, () => { proxyReq.destroy(); });
  } catch (err) {
    console.error('Error fetching SDO image:', err.message);
    res.status(502).json({ error: 'Failed to fetch SDO image' });
  }
});

// =====================================================================
//  /lunar/image — proxy NASA SVS moon phase image
// =====================================================================

// Frame number = hour of year (1-8760), gives accurate texture + libration + lighting
router.get('/lunar/image', async (req, res) => {
  try {
    const now = new Date();
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const hourOfYear = Math.floor((now - startOfYear) / 3600000) + 1;
    const frame = String(Math.min(hourOfYear, 8760)).padStart(4, '0');
    const url = `https://svs.gsfc.nasa.gov/vis/a000000/a005500/a005587/frames/730x730_1x1_30p/moon.${frame}.jpg`;
    const parsed = new URL(url);
    const resolvedIP = await resolveHost(parsed.hostname);
    if (isPrivateIP(resolvedIP)) {
      return res.status(403).json({ error: 'Blocked' });
    }
    const proxyReq = https.get({
      hostname: resolvedIP,
      path: parsed.pathname,
      port: 443,
      headers: { 'User-Agent': 'HamTab/1.0', 'Host': parsed.hostname },
      servername: parsed.hostname,
    }, (upstream) => {
      if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
        upstream.resume();
        return res.status(502).json({ error: 'Failed to fetch moon image' });
      }
      res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
      // Cache 1 hour — frame changes hourly
      res.set('Cache-Control', 'public, max-age=3600');
      upstream.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('Moon image proxy error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to fetch moon image' });
    });
    proxyReq.setTimeout(15000, () => { proxyReq.destroy(); });
  } catch (err) {
    console.error('Error fetching moon image:', err.message);
    res.status(502).json({ error: 'Failed to fetch moon image' });
  }
});

// =====================================================================
//  DXpeditions (NG3K ADXO feed)
// =====================================================================

const dxpeditionCache = registerCache({ data: null, expires: 0 });
const DXPEDITION_TTL = 2 * 60 * 60 * 1000; // 2 hours

// DXCC entity name -> approximate [lat, lon] for DXpedition map markers.
// Keys are lowercase. Covers ~300 current DXCC entities + common NG3K name variants.
const DXCC_COORDS = {
  'afghanistan': [34.5, 69.2], 'agalega & st brandon': [-10.4, 56.6], 'aland is.': [60.2, 20.0],
  'aland islands': [60.2, 20.0], 'alaska': [64.2, -152.5], 'albania': [41.3, 20.0],
  'algeria': [28.0, 3.0], 'american samoa': [-14.3, -170.7], 'amsterdam & st paul': [-37.8, 77.6],
  'amsterdam & st. paul': [-37.8, 77.6], 'andaman & nicobar': [12.0, 92.8],
  'andorra': [42.5, 1.5], 'angola': [-12.5, 18.5], 'anguilla': [18.2, -63.1],
  'annobon': [-1.4, 5.6], 'annobon island': [-1.4, 5.6], 'antarctica': [-82.0, 0.0],
  'antigua & barbuda': [17.1, -61.8], 'argentina': [-34.6, -58.4], 'armenia': [40.2, 44.5],
  'aruba': [12.5, -70.0], 'ascension island': [-7.9, -14.4], 'asiatic russia': [60.0, 100.0],
  'asiatic turkey': [39.9, 32.9], 'australia': [-25.3, 133.8], 'austria': [47.5, 13.3],
  'aves island': [15.7, -63.6], 'azerbaijan': [40.4, 49.9], 'azores': [38.7, -27.2],
  'bahamas': [25.0, -77.4], 'bahrain': [26.0, 50.6], 'baker & howland is.': [0.2, -176.5],
  'balearic islands': [39.6, 2.9], 'bangladesh': [23.7, 90.4], 'barbados': [13.2, -59.5],
  'barbuda': [17.6, -61.8], 'belarus': [53.9, 27.6], 'belgium': [50.8, 4.4],
  'belize': [17.2, -88.7], 'benin': [9.3, 2.3], 'bermuda': [32.3, -64.8],
  'bhutan': [27.5, 90.4], 'bolivia': [-16.5, -68.2], 'bonaire': [12.1, -68.3],
  'bonaire, curacao': [12.1, -68.3], 'bosnia-herzegovina': [43.9, 17.7],
  'botswana': [-22.3, 24.7], 'bouvet': [-54.4, 3.4], 'bouvet island': [-54.4, 3.4],
  'brazil': [-15.8, -47.9], 'british virgin islands': [18.4, -64.6],
  'brunei': [4.9, 114.9], 'bulgaria': [42.7, 25.5], 'burkina faso': [12.4, -1.5],
  'burundi': [-3.4, 29.4], 'cambodia': [11.6, 104.9], 'cameroon': [3.9, 11.5],
  'canada': [56.1, -106.3], 'canary islands': [28.1, -15.4], 'cape verde': [16.0, -24.0],
  'cayman islands': [19.3, -81.3], 'central african republic': [4.4, 18.6],
  'ceuta & melilla': [35.9, -5.3], 'chad': [12.1, 15.0], 'chagos islands': [-7.3, 72.4],
  'chatham islands': [-44.0, -176.5], 'chile': [-33.4, -70.7], 'china': [35.9, 104.2],
  'christmas island': [-10.5, 105.7], 'clipperton island': [10.3, -109.2],
  'cocos (keeling)': [-12.2, 96.8], 'cocos island': [-12.2, 96.8],
  'cocos-keeling': [-12.2, 96.8], 'colombia': [4.6, -74.1],
  'comoros': [-12.2, 44.3], 'congo': [-4.3, 15.3], 'congo, dem. rep.': [-4.3, 15.3],
  'congo, republic': [-0.2, 15.8], 'cook islands': [-21.2, -159.8],
  'corsica': [42.0, 9.0], 'costa rica': [9.9, -84.1], 'cote d\'ivoire': [5.3, -4.0],
  'crete': [35.2, 24.9], 'croatia': [45.1, 15.2], 'crozet island': [-46.4, 51.8],
  'cuba': [21.5, -77.8], 'curacao': [12.2, -69.0], 'cyprus': [35.1, 33.4],
  'czech republic': [49.8, 15.5], 'denmark': [56.3, 9.5], 'desecheo island': [18.4, -67.5],
  'djibouti': [11.6, 43.1], 'dodecanese': [36.4, 28.0], 'dominica': [15.4, -61.4],
  'dominican republic': [18.7, -70.2], 'ducie island': [-24.7, -124.8],
  'east kiribati': [1.9, -157.5], 'east malaysia': [4.0, 114.0],
  'east timor': [-8.6, 125.7], 'easter island': [-27.1, -109.4],
  'ecuador': [-0.2, -78.5], 'egypt': [26.8, 30.8], 'el salvador': [13.8, -88.9],
  'england': [51.5, -0.1], 'equatorial guinea': [1.9, 10.0], 'eritrea': [15.3, 38.9],
  'estonia': [58.6, 25.0], 'eswatini': [-26.5, 31.5], 'ethiopia': [9.0, 38.7],
  'european russia': [55.8, 37.6], 'european turkey': [41.0, 28.0],
  'falkland islands': [-51.8, -59.0], 'faroe islands': [62.0, -6.8],
  'fiji': [-18.1, 178.0], 'finland': [60.2, 24.9], 'fr. polynesia': [-17.7, -149.4],
  'france': [46.2, 2.2], 'franz josef land': [80.0, 50.0],
  'french guiana': [4.0, -53.0], 'french polynesia': [-17.7, -149.4],
  'gabon': [-0.8, 11.6], 'galapagos islands': [-0.8, -91.1], 'gambia': [13.4, -16.6],
  'georgia': [42.3, 43.4], 'germany': [51.2, 10.5], 'ghana': [5.6, -0.2],
  'gibraltar': [36.1, -5.4], 'glorioso islands': [-11.6, 47.3],
  'greece': [39.1, 21.8], 'greenland': [71.7, -42.6], 'grenada': [12.1, -61.7],
  'guadeloupe': [16.3, -61.5], 'guam': [13.4, 144.8], 'guatemala': [14.6, -90.5],
  'guernsey': [49.5, -2.5], 'guinea': [9.9, -13.7], 'guinea-bissau': [12.0, -15.0],
  'guyana': [4.9, -58.9], 'haiti': [18.5, -72.3], 'hawaii': [19.9, -155.6],
  'heard island': [-53.1, 73.5], 'honduras': [14.1, -87.2], 'hong kong': [22.3, 114.2],
  'hungary': [47.5, 19.1], 'iceland': [65.0, -18.0], 'india': [20.6, 78.9],
  'indonesia': [-6.2, 106.8], 'iran': [35.7, 51.4], 'iraq': [33.3, 44.4],
  'ireland': [53.4, -8.2], 'isle of man': [54.2, -4.5], 'israel': [31.0, 34.8],
  'italy': [41.9, 12.5], 'jamaica': [18.1, -77.3], 'jan mayen': [71.0, -8.5],
  'japan': [36.2, 138.3], 'jarvis island': [-0.4, -160.0], 'jersey': [49.2, -2.1],
  'johnston island': [16.7, -169.5], 'jordan': [30.6, 36.2],
  'juan de nova & europa': [-17.1, 42.7], 'juan fernandez is.': [-33.6, -78.8],
  'kaliningrad': [54.7, 20.5], 'kampuchea': [11.6, 104.9], 'kazakhstan': [48.0, 68.0],
  'kenya': [-1.3, 36.8], 'kerguelen islands': [-49.4, 69.3],
  'kermadec islands': [-29.3, -177.9], 'kingman reef': [6.4, -162.4],
  'kiribati': [1.9, -157.5], 'korea': [37.6, 127.0], 'kosovo': [42.6, 20.9],
  'kuwait': [29.4, 47.9], 'kure island': [28.4, -178.3], 'kyrgyzstan': [41.2, 74.8],
  'lakshadweep islands': [10.1, 72.3], 'laos': [18.0, 102.6], 'latvia': [56.9, 24.1],
  'lebanon': [33.9, 35.5], 'lesotho': [-29.6, 28.2], 'liberia': [6.4, -9.4],
  'libya': [26.3, 17.2], 'liechtenstein': [47.1, 9.6], 'lithuania': [55.2, 23.9],
  'lord howe island': [-31.6, 159.1], 'luxembourg': [49.8, 6.1],
  'macao': [22.2, 113.5], 'macquarie island': [-54.6, 158.9],
  'madagascar': [-18.8, 47.5], 'madeira islands': [32.6, -16.9], 'malawi': [-13.3, 34.3],
  'malaysia': [3.1, 101.7], 'maldives': [3.2, 73.2], 'mali': [17.6, -4.0],
  'malpelo island': [4.0, -81.6], 'malta': [35.9, 14.5], 'mariana islands': [15.2, 145.8],
  'market reef': [60.3, 19.1], 'marquesas islands': [-9.8, -139.0],
  'marshall islands': [7.1, 171.4], 'martinique': [14.6, -61.0], 'mauritania': [18.1, -15.9],
  'mauritius': [-20.2, 57.5], 'mayotte': [-12.8, 45.2], 'mellish reef': [-17.4, 155.9],
  'mexico': [23.6, -102.6], 'micronesia': [6.9, 158.2], 'midway island': [28.2, -177.4],
  'minami torishima': [24.3, 154.0], 'moldova': [47.4, 28.4], 'monaco': [43.7, 7.4],
  'mongolia': [47.9, 106.9], 'montenegro': [42.5, 19.3], 'montserrat': [16.7, -62.2],
  'morocco': [31.8, -7.1], 'mozambique': [-25.9, 32.6], 'myanmar': [19.8, 96.2],
  'namibia': [-22.6, 17.1], 'nauru': [-0.5, 166.9], 'navassa island': [18.4, -75.0],
  'nepal': [28.4, 84.1], 'netherlands': [52.1, 5.3], 'new caledonia': [-22.3, 166.5],
  'new zealand': [-41.3, 174.8], 'nicaragua': [12.1, -86.3], 'niger': [17.6, 8.1],
  'nigeria': [9.1, 7.5], 'niue': [-19.1, -170.0], 'norfolk island': [-29.0, 167.9],
  'north korea': [39.0, 125.8], 'north macedonia': [41.5, 21.7],
  'northern ireland': [54.6, -5.9], 'norway': [60.5, 8.5],
  'ogasawara': [27.1, 142.2], 'oman': [23.6, 58.5],
  'pakistan': [30.4, 69.3], 'palau': [7.5, 134.6], 'palestine': [31.9, 35.2],
  'palmyra & jarvis': [5.9, -162.1], 'panama': [9.0, -79.5],
  'papua new guinea': [-6.3, 143.9], 'paraguay': [-23.4, -58.4], 'peru': [-12.0, -77.1],
  'peter 1 island': [-68.8, -90.6], 'philippines': [14.6, 121.0],
  'pitcairn island': [-25.1, -130.1], 'poland': [51.9, 19.1],
  'portugal': [39.4, -8.2], 'pratas island': [20.7, 116.7],
  'prince edward & marion': [-46.9, 37.7], 'puerto rico': [18.2, -66.6],
  'qatar': [25.4, 51.2], 'reunion': [-21.1, 55.5], 'reunion island': [-21.1, 55.5],
  'rodriguez island': [-19.7, 63.4], 'romania': [45.9, 25.0],
  'rotuma island': [-12.5, 177.1], 'rwanda': [-1.9, 29.9],
  'saba & st. eustatius': [17.6, -63.2], 'samoa': [-13.8, -172.0],
  'san andres & providencia': [12.6, -81.7], 'san felix & san ambrosio': [-26.3, -80.1],
  'san marino': [43.9, 12.4], 'sao tome & principe': [0.2, 6.6],
  'sardinia': [40.1, 9.1], 'saudi arabia': [23.9, 45.1],
  'scarborough reef': [15.1, 117.8], 'scotland': [56.5, -4.2],
  'senegal': [14.7, -17.5], 'serbia': [44.0, 20.9], 'seychelles': [-4.7, 55.5],
  'sierra leone': [8.5, -11.8], 'singapore': [1.4, 103.8],
  'sint maarten': [18.0, -63.1], 'slovakia': [48.7, 19.7], 'slovenia': [46.2, 14.8],
  'solomon islands': [-9.4, 160.0], 'somalia': [2.0, 45.3],
  'south africa': [-30.6, 22.9], 'south cook islands': [-21.2, -159.8],
  'south georgia island': [-54.3, -36.5], 'south korea': [35.9, 127.8],
  'south orkney islands': [-60.6, -45.6], 'south sandwich islands': [-56.3, -26.4],
  'south shetland islands': [-62.1, -58.7], 'south sudan': [4.9, 31.6],
  'spain': [40.5, -3.7], 'spratly islands': [10.0, 114.0], 'sri lanka': [7.9, 80.8],
  'st. barthelemy': [17.9, -62.8], 'st. helena': [-16.0, -5.7],
  'st. kitts & nevis': [17.4, -62.7], 'st. lucia': [14.0, -61.0],
  'st. martin': [18.1, -63.1], 'st. paul island': [57.2, -170.3],
  'st. peter & st. paul': [1.0, -29.3], 'st. pierre & miquelon': [46.8, -56.2],
  'st. vincent': [13.3, -61.2], 'sudan': [15.5, 32.6], 'suriname': [4.0, -56.0],
  'svalbard': [77.6, 15.6], 'sweden': [60.1, 18.6], 'switzerland': [46.8, 8.2],
  'syria': [35.0, 38.0], 'taiwan': [23.7, 120.9], 'tajikistan': [38.6, 68.8],
  'tanzania': [-6.4, 34.9], 'temotu province': [-10.7, 166.0], 'thailand': [15.9, 100.5],
  'togo': [6.1, 1.2], 'tokelau islands': [-9.2, -172.0], 'tonga': [-21.2, -175.2],
  'trinidad & tobago': [10.5, -61.3], 'trindade & martim vaz': [-20.5, -29.3],
  'tristan da cunha & gough': [-37.1, -12.3], 'tromelin island': [-15.9, 54.5],
  'tunisia': [33.9, 9.5], 'turkey': [39.9, 32.9], 'turkmenistan': [38.0, 58.4],
  'turks & caicos islands': [21.8, -71.8], 'tuvalu': [-7.5, 178.0],
  'uganda': [1.4, 32.3], 'uk base areas on cyprus': [34.6, 32.9],
  'ukraine': [48.4, 31.2], 'united arab emirates': [23.4, 53.8],
  'united nations hq': [40.7, -74.0], 'united states': [38.9, -77.0],
  'uruguay': [-34.9, -56.2], 'us virgin islands': [18.3, -64.9],
  'uzbekistan': [41.3, 69.3], 'vanuatu': [-17.7, 168.3], 'vatican city': [41.9, 12.5],
  'venezuela': [10.5, -66.9], 'vietnam': [14.1, 108.3], 'wake island': [19.3, 166.6],
  'wales': [52.1, -3.8], 'wallis & futuna': [-13.3, -176.2],
  'west kiribati': [1.4, 173.0], 'west malaysia': [3.1, 101.7],
  'western sahara': [24.2, -13.0], 'willis island': [-16.3, 150.0],
  'yemen': [15.4, 44.2], 'zambia': [-15.4, 28.3], 'zanzibar': [-6.2, 39.2],
  'zimbabwe': [-17.8, 31.0],
};

function parseDxpeditionItem(item) {
  // Title format: "Entity: Dates -- Callsign -- QSL via: Method"
  const title = (item.title || '').trim();
  const parts = title.split(/\s*--\s*/);
  let entity = '', dateStr = '', callsign = '', qsl = '';

  if (parts.length >= 1) {
    // First segment: "Entity: Dates" or just "Entity"
    const colonIdx = parts[0].indexOf(':');
    if (colonIdx > 0) {
      entity = parts[0].substring(0, colonIdx).trim();
      dateStr = parts[0].substring(colonIdx + 1).trim();
    } else {
      entity = parts[0].trim();
    }
  }
  if (parts.length >= 2) callsign = parts[1].trim();
  if (parts.length >= 3) {
    qsl = parts[2].replace(/^QSL\s*via:\s*/i, '').trim();
  }

  // Parse date range with best-effort regex
  // Patterns: "Jan 1-Feb 16, 2026", "January 1 - February 16, 2026"
  let startDate = null, endDate = null;
  const now = new Date();
  const year = now.getUTCFullYear();

  const rangeMatch = dateStr.match(/(\w+)\s+(\d+)\s*[-\u2013]\s*(\w+)\s+(\d+)(?:\s*,?\s*(\d{4}))?/);
  if (rangeMatch) {
    const yr = rangeMatch[5] ? parseInt(rangeMatch[5]) : year;
    startDate = parseDatePart(rangeMatch[1], parseInt(rangeMatch[2]), yr);
    endDate = parseDatePart(rangeMatch[3], parseInt(rangeMatch[4]), yr);
    if (endDate) endDate.setUTCHours(23, 59, 59);
  } else {
    // Single month range: "Jan 1-16, 2026"
    const singleMatch = dateStr.match(/(\w+)\s+(\d+)\s*[-\u2013]\s*(\d+)(?:\s*,?\s*(\d{4}))?/);
    if (singleMatch) {
      const yr = singleMatch[4] ? parseInt(singleMatch[4]) : year;
      startDate = parseDatePart(singleMatch[1], parseInt(singleMatch[2]), yr);
      endDate = parseDatePart(singleMatch[1], parseInt(singleMatch[3]), yr);
      if (endDate) endDate.setUTCHours(23, 59, 59);
    }
  }

  const active = startDate && endDate && now >= startDate && now <= endDate;

  // Look up approximate coordinates from DXCC entity name
  const coords = DXCC_COORDS[entity.toLowerCase().trim()] || null;

  return {
    callsign,
    entity,
    dateStr,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    qsl,
    link: (item.link || '').trim(),
    active: !!active,
    lat: coords ? coords[0] : null,
    lon: coords ? coords[1] : null,
  };
}

function parseDatePart(monthStr, day, year) {
  const months = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
    january: 0, february: 1, march: 2, april: 3, june: 5, july: 6, august: 7, september: 8, october: 9, november: 10, december: 11 };
  const m = months[monthStr.toLowerCase()];
  if (m === undefined || isNaN(day)) return null;
  return new Date(Date.UTC(year, m, day));
}

router.get('/dxpeditions', async (req, res) => {
  try {
    if (dxpeditionCache.data && Date.now() < dxpeditionCache.expires) {
      setFreshnessHeaders(res, { fetchedAt: dxpeditionCache.fetchedAt, expires: dxpeditionCache.expires, cacheHit: true });
      return res.json(dxpeditionCache.data);
    }

    const xml = await fetchText('https://www.ng3k.com/adxo.xml');
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);

    const channel = parsed.rss && parsed.rss.channel;
    let items = channel && channel.item;
    if (!items) items = [];
    if (!Array.isArray(items)) items = [items];

    const results = items
      .map(parseDxpeditionItem)
      .filter(d => d.callsign) // skip items without a callsign
      .sort((a, b) => {
        // Active first, then by start date ascending
        if (a.active !== b.active) return a.active ? -1 : 1;
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        return aDate - bDate;
      });

    const now = Date.now();
    dxpeditionCache.data = results;
    dxpeditionCache.fetchedAt = now;
    dxpeditionCache.expires = now + DXPEDITION_TTL;
    setFreshnessHeaders(res, { fetchedAt: now, expires: dxpeditionCache.expires, cacheHit: false });
    res.json(results);
  } catch (err) {
    console.error('Error fetching DXpeditions:', err.message);
    res.status(502).json({ error: 'Failed to fetch DXpedition data' });
  }
});

// =====================================================================
//  Contests (WA7BNM Contest Calendar)
// =====================================================================

const contestCache = registerCache({ data: null, expires: 0 });
const CONTEST_TTL = 6 * 60 * 60 * 1000; // 6 hours

function parseContestItem(item) {
  const name = (item.title || '').trim();
  const description = (item.description || '').trim();
  const link = (item.link || '').trim();

  // Parse dates from description: "0000Z, Feb 7 to 2400Z, Feb 8"
  let startDate = null, endDate = null, dateStr = description;
  const now = new Date();
  const year = now.getUTCFullYear();

  const dateMatch = description.match(/(\d{4})Z\s*,?\s*(\w+)\s+(\d+)\s+to\s+(\d{4})Z\s*,?\s*(\w+)\s+(\d+)/i);
  if (dateMatch) {
    const startHour = parseInt(dateMatch[1].substring(0, 2));
    const startMin = parseInt(dateMatch[1].substring(2));
    const endHourRaw = parseInt(dateMatch[4].substring(0, 2));
    const endMin = parseInt(dateMatch[4].substring(2));

    startDate = parseDatePart(dateMatch[2], parseInt(dateMatch[3]), year);
    endDate = parseDatePart(dateMatch[5], parseInt(dateMatch[6]), year);

    if (startDate) {
      startDate.setUTCHours(startHour, startMin);
    }
    if (endDate) {
      // 2400Z means midnight of the next day
      if (endHourRaw === 24) {
        endDate.setUTCDate(endDate.getUTCDate() + 1);
        endDate.setUTCHours(0, 0);
      } else {
        endDate.setUTCHours(endHourRaw, endMin);
      }
    }
  }

  // Infer mode from contest name
  const upper = name.toUpperCase();
  let mode = 'mixed';
  if (/\bCW\b/.test(upper)) mode = 'cw';
  else if (/\b(SSB|PHONE)\b/.test(upper)) mode = 'phone';
  else if (/\b(RTTY|FT[48]|DIGITAL|PSK|DATA)\b/.test(upper)) mode = 'digital';

  // Determine status
  let status = 'upcoming';
  if (startDate && endDate) {
    if (now >= startDate && now <= endDate) status = 'active';
    else if (now > endDate) status = 'past';
  }

  return {
    name,
    dateStr,
    startDate: startDate ? startDate.toISOString() : null,
    endDate: endDate ? endDate.toISOString() : null,
    link,
    mode,
    status,
  };
}

router.get('/contests', async (req, res) => {
  try {
    if (contestCache.data && Date.now() < contestCache.expires) {
      setFreshnessHeaders(res, { fetchedAt: contestCache.fetchedAt, expires: contestCache.expires, cacheHit: true });
      return res.json(contestCache.data);
    }

    const xml = await fetchText('https://www.contestcalendar.com/contestcal.php?rss');
    const parser = new XMLParser({ ignoreAttributes: false });
    const parsed = parser.parse(xml);

    const channel = parsed.rss && parsed.rss.channel;
    let items = channel && channel.item;
    if (!items) items = [];
    if (!Array.isArray(items)) items = [items];

    const results = items
      .map(parseContestItem)
      .filter(c => c.status !== 'past') // exclude past contests
      .sort((a, b) => {
        // Active first, then upcoming by start date
        if (a.status !== b.status) {
          if (a.status === 'active') return -1;
          if (b.status === 'active') return 1;
        }
        const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
        const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
        return aDate - bDate;
      });

    const now = Date.now();
    contestCache.data = results;
    contestCache.fetchedAt = now;
    contestCache.expires = now + CONTEST_TTL;
    setFreshnessHeaders(res, { fetchedAt: now, expires: contestCache.expires, cacheHit: false });
    res.json(results);
  } catch (err) {
    console.error('Error fetching contests:', err.message);
    res.status(502).json({ error: 'Failed to fetch contest data' });
  }
});

// =====================================================================
//  Propagation (prop.kc2g.com)
// =====================================================================

// Proxy prop.kc2g.com propagation GeoJSON contours
router.get('/propagation', async (req, res) => {
  try {
    const validTypes = ['mufd', 'fof2'];
    const type = validTypes.includes(req.query.type) ? req.query.type : 'mufd';
    const data = await fetchJSON(`https://prop.kc2g.com/renders/current/${type}-normal-now.geojson`);
    res.json(data);
  } catch (err) {
    console.error('Error fetching propagation data:', err.message);
    res.status(502).json({ error: 'Failed to fetch propagation data' });
  }
});

// Proxy prop.kc2g.com MUF/foF2 bare image overlay (4096x2048 Plate Carree)
router.get('/propagation/image', async (req, res) => {
  try {
    const validTypes = ['mufd', 'fof2'];
    const type = validTypes.includes(req.query.type) ? req.query.type : 'mufd';
    const url = `https://prop.kc2g.com/renders/current/${type}-bare-now.jpg`;
    const parsed = new URL(url);
    const resolvedIP = await resolveHost(parsed.hostname);
    if (isPrivateIP(resolvedIP)) {
      return res.status(403).json({ error: 'Blocked' });
    }
    const proxyReq = https.get({
      hostname: resolvedIP,
      path: parsed.pathname,
      port: 443,
      headers: { 'User-Agent': 'HamTab/1.0', 'Host': parsed.hostname },
      servername: parsed.hostname,
    }, (upstream) => {
      if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
        upstream.resume();
        return res.status(502).json({ error: 'Failed to fetch propagation image' });
      }
      res.set('Content-Type', upstream.headers['content-type'] || 'image/jpeg');
      res.set('Cache-Control', 'public, max-age=300, s-maxage=900'); // 5m browser, 15m edge
      upstream.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('Propagation image proxy error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to fetch propagation image' });
    });
    proxyReq.setTimeout(15000, () => { proxyReq.destroy(); });
  } catch (err) {
    console.error('Error fetching propagation image:', err.message);
    res.status(502).json({ error: 'Failed to fetch propagation image' });
  }
});

// =====================================================================
//  D-RAP (D Region Absorption Prediction) — NOAA SWPC
// =====================================================================

// D-RAP image overlay — shows HF radio absorption caused by solar X-ray and proton events
router.get('/drap/image', async (req, res) => {
  try {
    const url = 'https://services.swpc.noaa.gov/images/animations/d-rap/global/latest.png';
    const parsed = new URL(url);
    const resolvedIP = await resolveHost(parsed.hostname);
    if (isPrivateIP(resolvedIP)) {
      return res.status(403).json({ error: 'Blocked' });
    }
    const proxyReq = https.get({
      hostname: resolvedIP,
      path: parsed.pathname,
      port: 443,
      headers: { 'User-Agent': 'HamTab/1.0', 'Host': parsed.hostname },
      servername: parsed.hostname,
    }, (upstream) => {
      if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
        upstream.resume();
        return res.status(502).json({ error: 'Failed to fetch D-RAP image' });
      }
      res.set('Content-Type', upstream.headers['content-type'] || 'image/png');
      res.set('Cache-Control', 'public, max-age=300, s-maxage=900'); // 5m browser, 15m edge
      upstream.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('D-RAP image proxy error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to fetch D-RAP image' });
    });
    proxyReq.setTimeout(15000, () => { proxyReq.destroy(); });
  } catch (err) {
    console.error('Error fetching D-RAP image:', err.message);
    res.status(502).json({ error: 'Failed to fetch D-RAP image' });
  }
});

// D-RAP text grid — parsed frequency data for client-side heatmap rendering
// 4 deg lat/lon grid of "Highest Frequency Affected by 1dB Absorption" in MHz
const drapDataCache = registerCache({ data: null, expires: 0 });
const DRAP_TTL = 5 * 60 * 1000; // 5 min — SWPC updates ~every 1-2 min but data changes slowly

router.get('/drap/data', async (req, res) => {
  try {
    if (drapDataCache.data && Date.now() < drapDataCache.expires) {
      setFreshnessHeaders(res, { fetchedAt: drapDataCache.fetchedAt, expires: drapDataCache.expires, cacheHit: true });
      return res.json(drapDataCache.data);
    }
    const url = 'https://services.swpc.noaa.gov/text/drap_global_frequencies.txt';
    const text = await secureFetch(url);

    // Parse the NOAA text grid into a structured object
    const lines = text.split('\n');
    const lons = []; // longitude values from header
    const rows = []; // { lat, values[] }

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('---')) continue;

      // Header row: longitude values
      if (lons.length === 0 && /^\s*-?\d+/.test(trimmed) && !trimmed.includes('|')) {
        trimmed.split(/\s+/).forEach(v => lons.push(parseFloat(v)));
        continue;
      }

      // Data row: "lat | val val val ..."
      const match = trimmed.match(/^\s*(-?\d+)\s*\|\s*(.+)$/);
      if (match) {
        const lat = parseInt(match[1]);
        const values = match[2].trim().split(/\s+/).map(Number);
        rows.push({ lat, values });
      }
    }

    const result = { lons, rows };
    const now = Date.now();
    drapDataCache.data = result;
    drapDataCache.fetchedAt = now;
    drapDataCache.expires = now + DRAP_TTL;
    setFreshnessHeaders(res, { fetchedAt: now, expires: drapDataCache.expires, cacheHit: false });
    res.json(result);
  } catch (err) {
    console.error('Error fetching D-RAP data:', err.message);
    res.status(502).json({ error: 'Failed to fetch D-RAP data' });
  }
});

module.exports = router;
