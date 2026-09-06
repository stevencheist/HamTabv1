// --- Satellite tracking router ---
// N2YO satellite tracking, ISS position (SGP4 via satellite.js).
// Extracted from server.js.

const express = require('express');
const satellite = require('satellite.js');
const { fetchJSON, fetchText } = require('../services/http-fetch');
const { registerCache } = require('../services/cache-store');
const { setFreshnessHeaders } = require('../services/freshness-headers');

const router = express.Router();

// --- N2YO Satellite Tracking API ---

// Satellite list cache (category 18 = amateur radio)
let satListCache = { data: null, expires: 0 };
const SAT_LIST_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Satellite position cache
let satPosCache = { data: null, expires: 0, key: '' };
const SAT_POS_TTL = 10 * 1000; // 10 seconds

// Pass prediction cache (per satellite)
const satPassCache = registerCache({}); // { 'satId:lat:lon': { data, expires } }
const SAT_PASS_TTL = 5 * 60 * 1000; // 5 minutes
const SAT_PASS_MAX = 500; // max cached entries

// TLE cache (per satellite)
const satTleCache = registerCache({}); // { satId: { data, expires } }
const SAT_TLE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const SAT_TLE_MAX = 500; // max cached entries

// Fetch amateur radio satellite list (N2YO category 18)
router.get('/satellites/list', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  try {
    // Return cached data if fresh
    if (satListCache.data && Date.now() < satListCache.expires) {
      setFreshnessHeaders(res, { fetchedAt: satListCache.fetchedAt, expires: satListCache.expires, cacheHit: true });
      return res.json(satListCache.data);
    }

    const url = `https://api.n2yo.com/rest/v1/satellite/above/0/0/0/90/18/&apiKey=${apiKey}`;
    const data = await fetchJSON(url);

    // Extract satellite list from response
    const satellites = (data.above || []).map(s => ({
      satId: s.satid,
      name: s.satname,
      intDesignator: s.intDesignator,
    }));

    const now = Date.now();
    satListCache = { data: satellites, fetchedAt: now, expires: now + SAT_LIST_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: satListCache.expires, cacheHit: false });
    res.json(satellites);
  } catch (err) {
    console.error('Error fetching satellite list:', err.message);
    res.status(502).json({ error: 'Failed to fetch satellite list' });
  }
});

// Fetch positions for multiple satellites (batched)
router.get('/satellites/positions', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  const { ids, lat, lon, seconds } = req.query;
  if (!ids) {
    return res.status(400).json({ error: 'Provide satellite IDs' });
  }

  const obsLat = parseFloat(lat) || 0;
  const obsLon = parseFloat(lon) || 0;
  if (obsLat < -90 || obsLat > 90 || obsLon < -180 || obsLon > 180) {
    return res.status(400).json({ error: 'lat must be -90..90, lon must be -180..180' });
  }
  const secs = parseInt(seconds, 10) || 1;
  const satIds = ids.split(',').map(id => id.trim()).filter(Boolean).slice(0, 10); // max 10 satellites

  if (satIds.length === 0) {
    return res.status(400).json({ error: 'Provide at least one satellite ID' });
  }
  if (!satIds.every(id => /^\d+$/.test(id))) {
    return res.status(400).json({ error: 'Satellite IDs must be numeric' });
  }

  // Cache key includes IDs + rounded observer coords (~1.1 km granularity)
  const cacheKey = `${satIds.sort().join(',')}:${obsLat.toFixed(2)}:${obsLon.toFixed(2)}`;
  if (satPosCache.key === cacheKey && satPosCache.data && Date.now() < satPosCache.expires) {
    setFreshnessHeaders(res, { fetchedAt: satPosCache.fetchedAt, expires: satPosCache.expires, cacheHit: true });
    return res.json(satPosCache.data);
  }

  try {
    const positions = {};

    // Fetch positions for each satellite in parallel
    await Promise.all(satIds.map(async (satId) => {
      try {
        const url = `https://api.n2yo.com/rest/v1/satellite/positions/${encodeURIComponent(satId)}/${obsLat}/${obsLon}/0/${secs}/&apiKey=${apiKey}`;
        const data = await fetchJSON(url);
        if (data.positions && data.positions.length > 0) {
          const pos = data.positions[0];
          positions[satId] = {
            satId: data.info?.satid || parseInt(satId, 10),
            name: data.info?.satname || '',
            lat: pos.satlatitude,
            lon: pos.satlongitude,
            alt: pos.sataltitude,
            azimuth: pos.azimuth,
            elevation: pos.elevation,
            ra: pos.ra,
            dec: pos.dec,
            timestamp: pos.timestamp,
          };
        }
      } catch (err) {
        console.error(`Error fetching position for sat ${satId}:`, err.message);
      }
    }));

    const now = Date.now();
    satPosCache = { data: positions, fetchedAt: now, expires: now + SAT_POS_TTL, key: cacheKey };
    setFreshnessHeaders(res, { fetchedAt: now, expires: satPosCache.expires, cacheHit: false });
    res.json(positions);
  } catch (err) {
    console.error('Error fetching satellite positions:', err.message);
    res.status(502).json({ error: 'Failed to fetch satellite positions' });
  }
});

// Fetch pass predictions for a single satellite
router.get('/satellites/passes', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  const { id, lat, lon, days, minEl } = req.query;
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Provide a valid numeric satellite ID' });
  }

  const obsLat = parseFloat(lat);
  const obsLon = parseFloat(lon);
  if (isNaN(obsLat) || isNaN(obsLon) || obsLat < -90 || obsLat > 90 || obsLon < -180 || obsLon > 180) {
    return res.status(400).json({ error: 'Provide valid lat (-90..90) and lon (-180..180)' });
  }

  const numDays = Math.min(parseInt(days, 10) || 2, 10); // max 10 days
  const minElevation = Math.min(parseInt(minEl, 10) || 10, 90);

  // Check cache
  const cacheKey = `${id}:${obsLat.toFixed(2)}:${obsLon.toFixed(2)}`;
  const cached = satPassCache[cacheKey];
  if (cached && Date.now() < cached.expires) {
    setFreshnessHeaders(res, { fetchedAt: cached.fetchedAt, expires: cached.expires, cacheHit: true });
    return res.json(cached.data);
  }

  try {
    const url = `https://api.n2yo.com/rest/v1/satellite/radiopasses/${encodeURIComponent(id)}/${obsLat}/${obsLon}/0/${numDays}/${minElevation}/&apiKey=${apiKey}`;
    const data = await fetchJSON(url);

    const passes = (data.passes || []).map(p => ({
      startUTC: p.startUTC,
      startAz: p.startAz,
      startAzCompass: p.startAzCompass,
      maxUTC: p.maxUTC,
      maxAz: p.maxAz,
      maxAzCompass: p.maxAzCompass,
      maxEl: p.maxEl,
      endUTC: p.endUTC,
      endAz: p.endAz,
      endAzCompass: p.endAzCompass,
    }));

    const result = {
      satId: data.info?.satid,
      name: data.info?.satname,
      passesCount: data.info?.passescount || passes.length,
      passes,
    };

    if (Object.keys(satPassCache).length >= SAT_PASS_MAX) {
      const evictNow = Date.now();
      for (const k of Object.keys(satPassCache)) {
        if (satPassCache[k].expires < evictNow) delete satPassCache[k];
      }
    }
    const now = Date.now();
    satPassCache[cacheKey] = { data: result, fetchedAt: now, expires: now + SAT_PASS_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: satPassCache[cacheKey].expires, cacheHit: false });
    res.json(result);
  } catch (err) {
    console.error('Error fetching satellite passes:', err.message);
    res.status(502).json({ error: 'Failed to fetch satellite passes' });
  }
});

// Fetch TLE data for a satellite (used for Doppler calculations)
router.get('/satellites/tle', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  const { id } = req.query;
  if (!id || !/^\d+$/.test(id)) {
    return res.status(400).json({ error: 'Provide a valid numeric satellite ID' });
  }

  // Check cache
  const cached = satTleCache[id];
  if (cached && Date.now() < cached.expires) {
    setFreshnessHeaders(res, { fetchedAt: cached.fetchedAt, expires: cached.expires, cacheHit: true });
    return res.json(cached.data);
  }

  try {
    const url = `https://api.n2yo.com/rest/v1/satellite/tle/${encodeURIComponent(id)}/&apiKey=${apiKey}`;
    const data = await fetchJSON(url);

    const result = {
      satId: data.info?.satid,
      name: data.info?.satname,
      tle: data.tle,
    };

    if (Object.keys(satTleCache).length >= SAT_TLE_MAX) {
      const evictNow = Date.now();
      for (const k of Object.keys(satTleCache)) {
        if (satTleCache[k].expires < evictNow) delete satTleCache[k];
      }
    }
    const now = Date.now();
    satTleCache[id] = { data: result, fetchedAt: now, expires: now + SAT_TLE_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: satTleCache[id].expires, cacheHit: false });
    res.json(result);
  } catch (err) {
    console.error('Error fetching satellite TLE:', err.message);
    res.status(502).json({ error: 'Failed to fetch satellite TLE' });
  }
});

// --- Keyless ISS Tracking (SGP4 via satellite.js) ---

// ISS TLE cache — fetched from CelesTrak, no API key needed
let issTleCache = { data: null, expires: 0 };
const ISS_TLE_TTL = 6 * 60 * 60 * 1000; // 6h — TLE doesn't change often

// ISS computed position/orbit cache — recomputed every 10s
let issComputedCache = { data: null, expires: 0, obsKey: '' };
const ISS_COMPUTED_TTL = 10 * 1000; // 10s — matches satellite position refresh

// Fetch ISS TLE from CelesTrak (free, no API key)
async function fetchIssTle() {
  if (issTleCache.data && Date.now() < issTleCache.expires) {
    return issTleCache.data;
  }

  const url = 'https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle';
  const text = await fetchText(url);
  const lines = text.trim().split('\n').map(l => l.trim());

  if (lines.length < 3) {
    throw new Error('Invalid TLE response from CelesTrak');
  }

  // 3-line TLE format: name, line1, line2
  const tle = { name: lines[0], line1: lines[1], line2: lines[2] };
  issTleCache = { data: tle, expires: Date.now() + ISS_TLE_TTL };
  return tle;
}

// Compute ISS orbit ground track — 100 points over ~92.5 min (one full orbit)
// Starts 10 min in the past to show where ISS came from
function computeIssOrbitPath(satrec) {
  const points = [];
  const now = new Date();
  const startOffset = -10 * 60 * 1000; // 10 min ago
  const endOffset = 82.5 * 60 * 1000;  // 82.5 min ahead (total ~92.5 min = 1 orbit)
  const step = (endOffset - startOffset) / 99; // 100 points

  for (let i = 0; i < 100; i++) {
    const t = new Date(now.getTime() + startOffset + step * i);
    const posVel = satellite.propagate(satrec, t);
    if (!posVel.position) continue;

    const gmst = satellite.gstime(t);
    const geo = satellite.eciToGeodetic(posVel.position, gmst);
    const lat = satellite.degreesLat(geo.latitude);
    const lon = satellite.degreesLong(geo.longitude);

    if (!isNaN(lat) && !isNaN(lon)) {
      points.push({ lat: parseFloat(lat.toFixed(4)), lon: parseFloat(lon.toFixed(4)) });
    }
  }

  return points;
}

// ISS position endpoint — free, no API key required
router.get('/iss/position', async (req, res) => {
  const obsLat = parseFloat(req.query.lat) || 0;
  const obsLon = parseFloat(req.query.lon) || 0;
  if (obsLat < -90 || obsLat > 90 || obsLon < -180 || obsLon > 180) {
    return res.status(400).json({ error: 'lat must be -90..90, lon must be -180..180' });
  }
  const obsKey = `${obsLat.toFixed(2)}:${obsLon.toFixed(2)}`;

  // Return cached data if fresh and same observer
  if (issComputedCache.data && Date.now() < issComputedCache.expires && issComputedCache.obsKey === obsKey) {
    setFreshnessHeaders(res, { fetchedAt: issComputedCache.fetchedAt, expires: issComputedCache.expires, cacheHit: true });
    return res.json(issComputedCache.data);
  }

  try {
    const tle = await fetchIssTle();
    const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

    // Current position
    const now = new Date();
    const posVel = satellite.propagate(satrec, now);
    if (!posVel.position) {
      return res.status(500).json({ error: 'SGP4 propagation failed' });
    }

    const gmst = satellite.gstime(now);
    const geo = satellite.eciToGeodetic(posVel.position, gmst);
    const lat = satellite.degreesLat(geo.latitude);
    const lon = satellite.degreesLong(geo.longitude);
    const alt = geo.height; // km

    // Velocity magnitude (km/s) from ECI velocity vector
    const vx = posVel.velocity.x, vy = posVel.velocity.y, vz = posVel.velocity.z;
    const velocity = Math.sqrt(vx * vx + vy * vy + vz * vz);

    // Observer look angles (azimuth/elevation)
    let azimuth = 0, elevation = -90;
    if (obsLat !== 0 || obsLon !== 0) {
      const obsGeo = {
        longitude: satellite.degreesToRadians(obsLon),
        latitude: satellite.degreesToRadians(obsLat),
        height: 0, // km above sea level
      };
      const obsEcf = satellite.geodeticToEcf(obsGeo);
      const lookAngles = satellite.ecfToLookAngles(obsGeo, satellite.eciToEcf(posVel.position, gmst));
      azimuth = satellite.radiansToDegrees(lookAngles.azimuth);
      elevation = satellite.radiansToDegrees(lookAngles.elevation);
    }

    // Orbit path (100 points over ~1 orbit)
    const orbitPath = computeIssOrbitPath(satrec);

    // TLE epoch — satellite.js stores epochyr (2-digit year) and epochdays (fractional day of year)
    const epochYear = satrec.epochyr < 57 ? 2000 + satrec.epochyr : 1900 + satrec.epochyr;
    const epochDate = new Date(Date.UTC(epochYear, 0, 1));
    epochDate.setUTCDate(epochDate.getUTCDate() + Math.floor(satrec.epochdays) - 1);
    const tleEpoch = Math.floor(epochDate.getTime() / 1000); // Unix timestamp (seconds)

    const result = {
      satId: 25544,
      name: 'ISS (ZARYA)',
      lat: parseFloat(lat.toFixed(4)),
      lon: parseFloat(lon.toFixed(4)),
      alt: parseFloat(alt.toFixed(1)),
      azimuth: parseFloat(azimuth.toFixed(1)),
      elevation: parseFloat(elevation.toFixed(1)),
      velocity: parseFloat(velocity.toFixed(2)),
      timestamp: Math.floor(now.getTime() / 1000),
      tleEpoch,
      orbitPath,
    };

    const cacheNow = Date.now();
    issComputedCache = { data: result, fetchedAt: cacheNow, expires: cacheNow + ISS_COMPUTED_TTL, obsKey };
    setFreshnessHeaders(res, { fetchedAt: cacheNow, expires: issComputedCache.expires, cacheHit: false });
    res.json(result);
  } catch (err) {
    console.error('Error computing ISS position:', err.message);
    res.status(502).json({ error: 'Failed to compute ISS position' });
  }
});

module.exports = router;
