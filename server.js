require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
const { URL } = require('url');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const selfsigned = require('selfsigned');
const { XMLParser } = require('fast-xml-parser');
const dns = require('dns');
const voacap = require('./voacap-bridge.js');
const satellite = require('satellite.js');

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const HOST = process.env.HOST || '0.0.0.0';

// --- Security middleware ---

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https://*.basemaps.cartocdn.com"],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      upgradeInsecureRequests: null,
    },
  },
  strictTransportSecurity: false,
}));

// CORS — restrict to same-origin, localhost, and RFC 1918 private ranges
app.use(cors({
  origin(origin, callback) {
    // Allow requests with no Origin header (same-origin, curl, etc.)
    if (!origin) return callback(null, true);

    try {
      const { hostname } = new URL(origin);
      if (hostname === 'localhost' || isPrivateIP(hostname)) {
        return callback(null, true);
      }
      callback(new Error('CORS not allowed'));
    } catch {
      callback(new Error('CORS not allowed'));
    }
  },
}));

// Rate limiting — /api/ routes only, 60 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api/', apiLimiter);

// Stricter rate limit for feedback endpoint (3 submissions per day per IP)
const feedbackLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions. Please try again tomorrow.' },
});

app.use(express.json());
app.use(express.static('public'));

// Proxy POTA spots API
app.get('/api/spots', async (req, res) => {
  try {
    const data = await fetchJSON('https://api.pota.app/spot/activator');
    res.json(data);
  } catch (err) {
    console.error('Error fetching spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch POTA spots' });
  }
});

// --- DX Cluster callsign coordinate cache ---

const dxcCallCache = {};  // { 'W1AW': { lat, lon, expires }, ... }
const DXC_CALL_TTL_OK   = 24 * 60 * 60 * 1000; // 24 hours for successful lookups
const DXC_CALL_TTL_FAIL =      60 * 60 * 1000; // 1 hour for failed lookups

async function fetchCallCoords(callsign) {
  const key = callsign.toUpperCase();
  const cached = dxcCallCache[key];
  if (cached && Date.now() < cached.expires) return cached;
  try {
    const data = await fetchJSON(`https://callook.info/${encodeURIComponent(key)}/json`);
    if (data.status === 'VALID' && data.location) {
      const entry = {
        lat: parseFloat(data.location.latitude) || null,
        lon: parseFloat(data.location.longitude) || null,
        expires: Date.now() + DXC_CALL_TTL_OK,
      };
      dxcCallCache[key] = entry;
      return entry;
    }
    const entry = { lat: null, lon: null, expires: Date.now() + DXC_CALL_TTL_FAIL };
    dxcCallCache[key] = entry;
    return entry;
  } catch {
    const entry = { lat: null, lon: null, expires: Date.now() + DXC_CALL_TTL_FAIL };
    dxcCallCache[key] = entry;
    return entry;
  }
}

// --- DX Cluster spot cache ---

let dxcCache = { data: null, expires: 0 };
const DXC_CACHE_TTL = 10 * 1000; // 10 seconds — HamQTH minimum polling interval

// --- PSKReporter spot cache ---

let pskCache = { data: null, expires: 0 };
const PSK_CACHE_TTL = 5 * 60 * 1000; // 5 minutes — PSKReporter recommended minimum

// Extract mode from DXC comment field
function extractModeFromComment(comment) {
  if (!comment) return '';
  const c = comment.toUpperCase();
  // Common digital modes
  if (c.includes('FT8')) return 'FT8';
  if (c.includes('FT4')) return 'FT4';
  if (c.includes('JS8')) return 'JS8';
  if (c.includes('RTTY')) return 'RTTY';
  if (c.includes('PSK31') || c.includes('PSK')) return 'PSK';
  if (c.includes('JT65')) return 'JT65';
  if (c.includes('JT9')) return 'JT9';
  if (c.includes('WSPR')) return 'WSPR';
  if (c.includes('MFSK')) return 'MFSK';
  if (c.includes('OLIVIA')) return 'OLIVIA';
  // CW
  if (c.includes('CW') || c.includes('MORSE')) return 'CW';
  // Phone modes
  if (c.includes('SSB') || c.includes('USB') || c.includes('LSB')) return 'SSB';
  if (c.includes('FM')) return 'FM';
  if (c.includes('AM')) return 'AM';
  return '';
}

// Convert frequency to band string
function freqToBandStr(freqMHz) {
  const freq = parseFloat(freqMHz);
  if (isNaN(freq)) return '';
  if (freq >= 1.8 && freq <= 2.0) return '160m';
  if (freq >= 3.5 && freq <= 4.0) return '80m';
  if (freq >= 5.3 && freq <= 5.4) return '60m';
  if (freq >= 7.0 && freq <= 7.3) return '40m';
  if (freq >= 10.1 && freq <= 10.15) return '30m';
  if (freq >= 14.0 && freq <= 14.35) return '20m';
  if (freq >= 18.068 && freq <= 18.168) return '17m';
  if (freq >= 21.0 && freq <= 21.45) return '15m';
  if (freq >= 24.89 && freq <= 24.99) return '12m';
  if (freq >= 28.0 && freq <= 29.7) return '10m';
  if (freq >= 50.0 && freq <= 54.0) return '6m';
  if (freq >= 144.0 && freq <= 148.0) return '2m';
  if (freq >= 420.0 && freq <= 450.0) return '70cm';
  return '';
}

// Convert Maidenhead grid square to lat/lon
function gridToLatLon(grid) {
  if (!grid || grid.length < 4) return null;
  const A = 'A'.charCodeAt(0);
  const ZERO = '0'.charCodeAt(0);
  // Field (AA): 20° longitude, 10° latitude per field
  const lon = (grid.charCodeAt(0) - A) * 20 + (grid.charCodeAt(2) - ZERO) * 2 + 1 - 180;
  const lat = (grid.charCodeAt(1) - A) * 10 + (grid.charCodeAt(3) - ZERO) + 0.5 - 90;
  return { lat, lon };
}

// Proxy HamQTH DX Cluster spots
app.get('/api/spots/dxc', async (req, res) => {
  try {
    // Return cached data if fresh
    if (dxcCache.data && Date.now() < dxcCache.expires) {
      return res.json(dxcCache.data);
    }

    const raw = await fetchText('https://www.hamqth.com/dxc_csv.php');
    const lines = raw.split('\n').filter(l => l.trim());

    const spots = [];
    for (const line of lines) {
      // HamQTH CSV is caret-delimited: callsign^freq^datetime^spotter^comment^lotw^eqsl^continent^band^country^adif_id
      const parts = line.split('^');
      if (parts.length < 11) continue;

      const [callsign, freqKhz, datetime, spotter, comment, lotw, eqsl, continent, band, country, adifId] = parts;

      // Convert frequency from kHz to MHz
      const freqMHz = (parseFloat(freqKhz) / 1000).toFixed(3);

      // Parse datetime (format: YYYY-MM-DD HH:MM:SS)
      let spotTime = '';
      if (datetime) {
        spotTime = datetime.replace(' ', 'T') + 'Z';
      }

      spots.push({
        callsign: callsign || '',
        frequency: freqMHz,
        mode: extractModeFromComment(comment),
        spotter: spotter || '',
        name: country || '',
        continent: continent || '',
        band: freqToBandStr(parseFloat(freqMHz)) || band || '',
        spotTime,
        comments: comment || '',
        lotwUser: lotw === '1',
        eqslUser: eqsl === '1',
        latitude: null,
        longitude: null,
        adifId: adifId || '',
      });
    }

    // Batch lookup coordinates for unique US callsigns
    const usCallsigns = new Set();
    for (const s of spots) {
      if (s.callsign && /^[AKNW][A-Z]?\d/.test(s.callsign.toUpperCase())) {
        usCallsigns.add(s.callsign.toUpperCase());
      }
    }

    // Limit concurrent lookups to avoid overwhelming callook.info
    const callsignArray = [...usCallsigns].slice(0, 50); // max 50 lookups per refresh
    await Promise.allSettled(callsignArray.map(c => fetchCallCoords(c)));

    // Merge coordinates
    for (const s of spots) {
      const key = s.callsign.toUpperCase();
      const coords = dxcCallCache[key];
      if (coords && coords.lat !== null && coords.lon !== null) {
        s.latitude = coords.lat;
        s.longitude = coords.lon;
      }
    }

    // Cache the result
    dxcCache = { data: spots, expires: Date.now() + DXC_CACHE_TTL };

    res.json(spots);
  } catch (err) {
    console.error('Error fetching DXC spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch DX Cluster spots' });
  }
});

// Proxy PSKReporter API
app.get('/api/spots/psk', async (req, res) => {
  try {
    // Return cached data if fresh
    if (pskCache.data && Date.now() < pskCache.expires) {
      return res.json(pskCache.data);
    }

    // Build query params
    const params = new URLSearchParams({
      flowStartSeconds: '-3600',  // Last hour
      rrlimit: '500',             // Max 500 reports
      rronly: '1',                // Reception reports only
      nolocator: '0',             // Include grid squares
    });

    const url = `https://retrieve.pskreporter.info/query?${params}`;
    const xml = await fetchText(url);

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });
    const doc = parser.parse(xml);

    // Extract reception reports array
    const reports = doc.receptionReports?.receptionReport;
    if (!reports) {
      pskCache = { data: [], expires: Date.now() + PSK_CACHE_TTL };
      return res.json([]);
    }

    const reportArray = Array.isArray(reports) ? reports : [reports];

    // Transform to spot format
    const spots = reportArray.map(r => {
      const freqHz = parseInt(r.frequency, 10) || 0;
      const freqMHz = (freqHz / 1000000).toFixed(3);
      const flowStartSec = parseInt(r.flowStartSeconds, 10) || 0;
      const spotTime = new Date(flowStartSec * 1000).toISOString();

      const senderCoords = gridToLatLon(r.senderLocator || '');
      const receiverCoords = gridToLatLon(r.receiverLocator || '');

      const snrVal = parseInt(r.sNR, 10);
      const snrStr = isNaN(snrVal) ? '' : `${snrVal > 0 ? '+' : ''}${snrVal}`;

      return {
        callsign: r.senderCallsign || '',
        frequency: freqMHz,
        mode: r.mode || '',
        reporter: r.receiverCallsign || '',
        reporterLocator: r.receiverLocator || '',
        reporterLat: receiverCoords?.lat || null,
        reporterLon: receiverCoords?.lon || null,
        senderLocator: r.senderLocator || '',
        latitude: senderCoords?.lat || null,
        longitude: senderCoords?.lon || null,
        snr: snrStr,
        band: freqToBandStr(freqMHz),
        spotTime,
        name: `Heard by ${r.receiverCallsign || 'unknown'}`,
        comments: snrStr ? `SNR: ${snrStr} dB` : '',
      };
    });

    // Filter out spots with no valid transmitter coordinates
    const validSpots = spots.filter(s => s.latitude !== null && s.longitude !== null);

    pskCache = { data: validSpots, expires: Date.now() + PSK_CACHE_TTL };
    res.json(validSpots);
  } catch (err) {
    console.error('Error fetching PSKReporter spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch PSKReporter spots' });
  }
});

// --- Live Spots (PSKReporter "heard" query) ---

// Per-callsign cache for Live Spots
const pskHeardCache = {}; // { 'CALLSIGN': { data, expires }, ... }
const PSK_HEARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Haversine distance calculation (km)
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Live Spots: Query PSKReporter for spots where YOUR signal was received
app.get('/api/spots/psk/heard', async (req, res) => {
  try {
    const callsign = (req.query.callsign || '').toUpperCase().trim();

    // Validate callsign format
    if (!callsign || !/^[A-Z0-9]{3,10}$/i.test(callsign)) {
      return res.status(400).json({ error: 'Provide a valid callsign' });
    }

    // Check cache
    const cached = pskHeardCache[callsign];
    if (cached && Date.now() < cached.expires) {
      return res.json(cached.data);
    }

    // Build query params for PSKReporter
    const params = new URLSearchParams({
      senderCallsign: callsign,
      flowStartSeconds: '-3600', // Last hour
      rrlimit: '500',
      rronly: '1',
      nolocator: '0',
    });

    const url = `https://retrieve.pskreporter.info/query?${params}`;
    const xml = await fetchText(url);

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });
    const doc = parser.parse(xml);

    const reports = doc.receptionReports?.receptionReport;
    if (!reports) {
      const result = { spots: [], summary: {} };
      pskHeardCache[callsign] = { data: result, expires: Date.now() + PSK_HEARD_CACHE_TTL };
      return res.json(result);
    }

    const reportArray = Array.isArray(reports) ? reports : [reports];

    // Transform to spot format
    const spots = reportArray.map(r => {
      const freqHz = parseInt(r.frequency, 10) || 0;
      const freqMHz = (freqHz / 1000000).toFixed(3);
      const flowStartSec = parseInt(r.flowStartSeconds, 10) || 0;
      const spotTime = new Date(flowStartSec * 1000).toISOString();

      const senderCoords = gridToLatLon(r.senderLocator || '');
      const receiverCoords = gridToLatLon(r.receiverLocator || '');

      const snrVal = parseInt(r.sNR, 10);
      const snrStr = isNaN(snrVal) ? '' : `${snrVal > 0 ? '+' : ''}${snrVal}`;

      // Calculate distance if both coords available
      let distanceKm = null;
      if (senderCoords && receiverCoords) {
        distanceKm = Math.round(haversineKm(
          senderCoords.lat, senderCoords.lon,
          receiverCoords.lat, receiverCoords.lon
        ));
      }

      return {
        callsign: r.senderCallsign || '',
        frequency: freqMHz,
        mode: r.mode || '',
        receiver: r.receiverCallsign || '',
        receiverLocator: r.receiverLocator || '',
        receiverLat: receiverCoords?.lat || null,
        receiverLon: receiverCoords?.lon || null,
        senderLocator: r.senderLocator || '',
        senderLat: senderCoords?.lat || null,
        senderLon: senderCoords?.lon || null,
        snr: snrStr,
        band: freqToBandStr(freqMHz),
        spotTime,
        distanceKm,
      };
    });

    // Filter out spots with no valid receiver coordinates
    const validSpots = spots.filter(s => s.receiverLat !== null && s.receiverLon !== null);

    // Build summary by band
    const summary = {};
    for (const spot of validSpots) {
      if (!spot.band) continue;
      if (!summary[spot.band]) {
        summary[spot.band] = { count: 0, farthestKm: 0, farthestCall: '' };
      }
      summary[spot.band].count++;
      if (spot.distanceKm !== null && spot.distanceKm > summary[spot.band].farthestKm) {
        summary[spot.band].farthestKm = spot.distanceKm;
        summary[spot.band].farthestCall = spot.receiver;
      }
    }

    const result = { spots: validSpots, summary };
    pskHeardCache[callsign] = { data: result, expires: Date.now() + PSK_HEARD_CACHE_TTL };
    res.json(result);
  } catch (err) {
    console.error('Error fetching PSKReporter heard spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch PSKReporter spots' });
  }
});

// Proxy SOTA spots API
app.get('/api/spots/sota', async (req, res) => {
  try {
    const data = await fetchJSON('https://api2.sota.org.uk/api/spots/50/all');
    const spots = (Array.isArray(data) ? data : []).map(s => ({
      callsign:    s.activatorCallsign || '',
      frequency:   s.frequency ? String(s.frequency) : '',
      mode:        s.mode || '',
      reference:   s.associationCode && s.summitCode
                     ? s.associationCode + '/' + s.summitCode : (s.summitCode || ''),
      name:        s.summitDetails || '',
      spotTime:    s.timeStamp || '',
      comments:    s.comments || '',
      points:      s.points || 0,
      latitude:    null,
      longitude:   null,
      _assoc:      s.associationCode || '',
      _summit:     s.summitCode || '',
    }));

    // Look up coordinates for each unique summit
    const unique = new Map();
    for (const s of spots) {
      if (s._assoc && s._summit) {
        const key = `${s._assoc}/${s._summit}`;
        if (!unique.has(key)) unique.set(key, { assoc: s._assoc, summit: s._summit });
      }
    }
    await Promise.allSettled(
      [...unique.values()].map(u => fetchSummitCoords(u.assoc, u.summit))
    );

    // Merge coordinates and strip internal fields
    const enriched = spots.map(s => {
      if (s._assoc && s._summit) {
        const coords = sotaSummitCache[`${s._assoc}/${s._summit}`];
        if (coords) {
          s.latitude = coords.lat;
          s.longitude = coords.lon;
        }
      }
      delete s._assoc;
      delete s._summit;
      return s;
    });

    res.json(enriched);
  } catch (err) {
    console.error('Error fetching SOTA spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch SOTA spots' });
  }
});

// Fetch and parse solar XML data
app.get('/api/solar', async (req, res) => {
  try {
    const xml = await fetchText('https://www.hamqsl.com/solarxml.php');
    const solar = parseSolarXML(xml);
    res.json(solar);
  } catch (err) {
    console.error('Error fetching solar data:', err.message);
    res.status(502).json({ error: 'Failed to fetch solar data' });
  }
});

// --- N2YO Satellite Tracking API ---

// Satellite list cache (category 18 = amateur radio)
let satListCache = { data: null, expires: 0 };
const SAT_LIST_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Satellite position cache
let satPosCache = { data: null, expires: 0, key: '' };
const SAT_POS_TTL = 10 * 1000; // 10 seconds

// Pass prediction cache (per satellite)
const satPassCache = {}; // { 'satId:lat:lon': { data, expires } }
const SAT_PASS_TTL = 5 * 60 * 1000; // 5 minutes

// TLE cache (per satellite)
const satTleCache = {}; // { satId: { data, expires } }
const SAT_TLE_TTL = 6 * 60 * 60 * 1000; // 6 hours

// Fetch amateur radio satellite list (N2YO category 18)
app.get('/api/satellites/list', async (req, res) => {
  const apiKey = req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  try {
    // Return cached data if fresh
    if (satListCache.data && Date.now() < satListCache.expires) {
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

    satListCache = { data: satellites, expires: Date.now() + SAT_LIST_TTL };
    res.json(satellites);
  } catch (err) {
    console.error('Error fetching satellite list:', err.message);
    res.status(502).json({ error: 'Failed to fetch satellite list' });
  }
});

// Fetch positions for multiple satellites (batched)
app.get('/api/satellites/positions', async (req, res) => {
  const apiKey = req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  const { ids, lat, lon, seconds } = req.query;
  if (!ids) {
    return res.status(400).json({ error: 'Provide satellite IDs' });
  }

  const obsLat = parseFloat(lat) || 0;
  const obsLon = parseFloat(lon) || 0;
  const secs = parseInt(seconds, 10) || 1;
  const satIds = ids.split(',').map(id => id.trim()).filter(Boolean).slice(0, 10); // max 10 satellites

  if (satIds.length === 0) {
    return res.status(400).json({ error: 'Provide at least one satellite ID' });
  }

  // Cache key based on IDs
  const cacheKey = satIds.sort().join(',');
  if (satPosCache.key === cacheKey && satPosCache.data && Date.now() < satPosCache.expires) {
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

    satPosCache = { data: positions, expires: Date.now() + SAT_POS_TTL, key: cacheKey };
    res.json(positions);
  } catch (err) {
    console.error('Error fetching satellite positions:', err.message);
    res.status(502).json({ error: 'Failed to fetch satellite positions' });
  }
});

// Fetch pass predictions for a single satellite
app.get('/api/satellites/passes', async (req, res) => {
  const apiKey = req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  const { id, lat, lon, days, minEl } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Provide satellite ID' });
  }

  const obsLat = parseFloat(lat);
  const obsLon = parseFloat(lon);
  if (isNaN(obsLat) || isNaN(obsLon)) {
    return res.status(400).json({ error: 'Provide valid lat and lon' });
  }

  const numDays = Math.min(parseInt(days, 10) || 2, 10); // max 10 days
  const minElevation = Math.min(parseInt(minEl, 10) || 10, 90);

  // Check cache
  const cacheKey = `${id}:${obsLat.toFixed(2)}:${obsLon.toFixed(2)}`;
  const cached = satPassCache[cacheKey];
  if (cached && Date.now() < cached.expires) {
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

    satPassCache[cacheKey] = { data: result, expires: Date.now() + SAT_PASS_TTL };
    res.json(result);
  } catch (err) {
    console.error('Error fetching satellite passes:', err.message);
    res.status(502).json({ error: 'Failed to fetch satellite passes' });
  }
});

// Fetch TLE data for a satellite (used for Doppler calculations)
app.get('/api/satellites/tle', async (req, res) => {
  const apiKey = req.query.apikey || process.env.N2YO_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No N2YO API key configured' });
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ error: 'Provide satellite ID' });
  }

  // Check cache
  const cached = satTleCache[id];
  if (cached && Date.now() < cached.expires) {
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

    satTleCache[id] = { data: result, expires: Date.now() + SAT_TLE_TTL };
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
app.get('/api/iss/position', async (req, res) => {
  const obsLat = parseFloat(req.query.lat) || 0;
  const obsLon = parseFloat(req.query.lon) || 0;
  const obsKey = `${obsLat.toFixed(2)}:${obsLon.toFixed(2)}`;

  // Return cached data if fresh and same observer
  if (issComputedCache.data && Date.now() < issComputedCache.expires && issComputedCache.obsKey === obsKey) {
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
      orbitPath,
    };

    issComputedCache = { data: result, expires: Date.now() + ISS_COMPUTED_TTL, obsKey };
    res.json(result);
  } catch (err) {
    console.error('Error computing ISS position:', err.message);
    res.status(502).json({ error: 'Failed to compute ISS position' });
  }
});

// Lunar / EME conditions
app.get('/api/lunar', (req, res) => {
  try {
    const lunar = computeLunar();
    res.json(lunar);
  } catch (err) {
    console.error('Error computing lunar data:', err.message);
    res.status(500).json({ error: 'Failed to compute lunar data' });
  }
});

// Proxy Weather Underground API
app.get('/api/weather', async (req, res) => {
  const apiKey = req.query.apikey || process.env.WU_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'No weather API key configured' });
  }
  try {
    const { station } = req.query;
    if (!station) {
      return res.status(400).json({ error: 'Provide a station ID' });
    }

    // Try current observations first
    const currentUrl = `https://api.weather.com/v2/pws/observations/current?stationId=${encodeURIComponent(station)}&format=json&units=e&apiKey=${apiKey}`;
    let raw = await fetchText(currentUrl);

    // If 204 / empty, fall back to today's observations and use the latest
    if (!raw || !raw.trim()) {
      const dayUrl = `https://api.weather.com/v2/pws/observations/all/1day?stationId=${encodeURIComponent(station)}&format=json&units=e&apiKey=${apiKey}`;
      raw = await fetchText(dayUrl);
    }

    if (!raw || !raw.trim()) {
      return res.json({ temp: null, condition: 'No data', windSpeed: null, windDir: '', humidity: null });
    }

    const data = JSON.parse(raw);
    const obsList = data.observations;
    if (!obsList || !obsList.length) {
      return res.json({ temp: null, condition: 'No data', windSpeed: null, windDir: '', humidity: null });
    }

    // Use the most recent observation
    const obs = obsList[obsList.length - 1];
    const imp = obs.imperial || {};
    res.json({
      temp: imp.temp ?? imp.tempAvg ?? null,
      condition: null,
      windSpeed: imp.windSpeed ?? imp.windspeedAvg ?? null,
      windDir: obs.winddir != null ? degToCompass(obs.winddir) : (obs.winddirAvg != null ? degToCompass(obs.winddirAvg) : ''),
      humidity: obs.humidity ?? obs.humidityAvg ?? null,
      neighborhood: obs.neighborhood || null,
    });
  } catch (err) {
    console.error('Error fetching weather:', err.message);
    res.status(502).json({ error: 'Failed to fetch weather data' });
  }
});

function degToCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16] || '';
}

// NWS weather conditions (background gradient for local clock)
const nwsGridCache = {}; // { 'lat,lon': { forecastUrl, expires } }

app.get('/api/weather/conditions', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Provide lat and lon' });
    }
    const key = `${lat.toFixed(4)},${lon.toFixed(4)}`;
    let grid = nwsGridCache[key];
    if (!grid || Date.now() > grid.expires) {
      const pointsUrl = `https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`;
      const pointsRaw = await nwsFetch(pointsUrl);
      const data = JSON.parse(pointsRaw);
      const forecastUrl = data && data.properties && data.properties.forecastHourly;
      if (!forecastUrl) {
        console.error('NWS points response missing forecastHourly:', JSON.stringify(data).substring(0, 500));
        return res.status(502).json({ error: 'NWS returned no forecast URL for this location' });
      }
      grid = { forecastUrl, expires: Date.now() + 6 * 3600 * 1000 };
      nwsGridCache[key] = grid;
    }
    const forecast = JSON.parse(await nwsFetch(grid.forecastUrl));
    const period = forecast.properties.periods[0];
    res.json({
      shortForecast: period.shortForecast,
      temperature: period.temperature,
      temperatureUnit: period.temperatureUnit,
      isDaytime: period.isDaytime,
      windSpeed: period.windSpeed,
      windDirection: period.windDirection,
      relativeHumidity: period.relativeHumidity ? period.relativeHumidity.value : null,
    });
  } catch (err) {
    console.error('Error fetching NWS conditions:', err.message);
    res.status(502).json({ error: 'Failed to fetch weather conditions' });
  }
});

// NWS weather alerts
app.get('/api/weather/alerts', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Provide lat and lon' });
    }
    const raw = await nwsFetch(`https://api.weather.gov/alerts/active?point=${lat},${lon}`);
    const data = JSON.parse(raw);
    const alerts = (data.features || []).map(f => {
      const p = f.properties;
      return {
        event: p.event,
        severity: p.severity,
        headline: p.headline,
        description: p.description,
        web: p.web,
        urgency: p.urgency,
        expires: p.expires,
      };
    });
    res.json(alerts);
  } catch (err) {
    console.error('Error fetching NWS alerts:', err.message);
    res.status(502).json({ error: 'Failed to fetch weather alerts' });
  }
});

function nwsFetchOnce(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('Too many NWS redirects'));
    }
    if (!url || typeof url !== 'string') {
      return reject(new Error(`nwsFetchOnce called with invalid url: ${JSON.stringify(url)}`));
    }
    let parsed;
    try { parsed = new URL(url); } catch (e) {
      return reject(new Error(`Invalid URL passed to nwsFetch: "${url}" — ${e.message}`));
    }
    if (parsed.protocol !== 'https:') {
      return reject(new Error('Only HTTPS URLs are allowed for NWS requests'));
    }
    resolveHost(parsed.hostname).then((resolvedIP) => {
      if (isPrivateIP(resolvedIP)) {
        return reject(new Error('Requests to private addresses are blocked'));
      }
      const options = {
        hostname: resolvedIP,
        path: parsed.pathname + parsed.search,
        port: 443,
        headers: {
          'User-Agent': 'HamTab/1.0 (ham radio dashboard)',
          'Host': parsed.hostname,
          'Accept': 'application/geo+json',
        },
        servername: parsed.hostname,
      };
      const req = https.get(options, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          resp.resume();
          // Handle relative redirects by resolving against the original URL
          let redirectUrl;
          try { redirectUrl = new URL(resp.headers.location, url).href; } catch (e) {
            return reject(new Error(`Bad redirect Location: "${resp.headers.location}" from ${url}`));
          }
          return nwsFetchOnce(redirectUrl, redirectCount + 1).then(resolve).catch(reject);
        }
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          resp.resume();
          return reject(new Error(`HTTP ${resp.statusCode} from ${parsed.hostname}${parsed.pathname}`));
        }
        let data = '';
        let bytes = 0;
        resp.on('data', chunk => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) {
            resp.destroy();
            return reject(new Error('NWS response too large'));
          }
          data += chunk;
        });
        resp.on('end', () => resolve(data));
        resp.on('error', reject);
      });
      req.on('error', (err) => reject(new Error(`${err.message} (${parsed.hostname})`)));
      req.setTimeout(15000, () => { req.destroy(); reject(new Error(`Request timed out (${parsed.hostname}${parsed.pathname})`)); });
    }).catch(reject);
  });
}

async function nwsFetch(url, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await nwsFetchOnce(url);
    } catch (err) {
      if (i < retries) {
        console.log(`NWS fetch retry ${i + 1}/${retries}: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
}

// Proxy callook.info license lookup
app.get('/api/callsign/:call', async (req, res) => {
  try {
    const call = encodeURIComponent(req.params.call.toUpperCase());
    const data = await fetchJSON(`https://callook.info/${call}/json`);
    const addr = data.address || {};
    const loc = data.location || {};
    res.json({
      status: data.status || 'INVALID',
      class: (data.current && data.current.operClass) || '',
      name: (data.name || ''),
      addr1: addr.line1 || '',
      addr2: addr.line2 || '',
      grid: loc.gridsquare || '',
    });
  } catch (err) {
    console.error('Error fetching callsign data:', err.message);
    res.status(502).json({ error: 'Failed to fetch callsign data' });
  }
});

// --- Mode-Specific Endpoints ---
// (Empty on main - populated on deployment branches)
// Lanmode adds: /api/update/*, /api/restart
// Hostedmode adds: /api/settings-sync (future)

// --- Configuration Endpoints ---
app.post('/api/config/env', (req, res) => {
  try {
    const envPath = path.join(__dirname, '.env');
    const updates = req.body; // { key: value, ... }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid body' });
    }

    // Read existing .env lines
    let lines = [];
    if (fs.existsSync(envPath)) {
      lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    }

    // Update or append each key
    const allowedKeys = ['WU_API_KEY', 'N2YO_API_KEY'];
    for (const [key, value] of Object.entries(updates)) {
      // Only allow known env keys
      if (!allowedKeys.includes(key)) continue;
      // Sanitize: reject control chars (newline injection), enforce max length
      const sanitized = String(value).replace(/[\r\n\0]/g, '').trim();
      if (sanitized.length > 128 || sanitized.length === 0) continue;
      const idx = lines.findIndex(l => l.startsWith(key + '='));
      const entry = `${key}=${sanitized}`;
      if (idx >= 0) {
        lines[idx] = entry;
      } else {
        lines.push(entry);
      }
    }

    fs.writeFileSync(envPath, lines.filter(l => l.trim() !== '').join('\n') + '\n');
    // Update process.env so it takes effect immediately (with same sanitization)
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;
      const sanitized = String(value).replace(/[\r\n\0]/g, '').trim();
      if (sanitized.length > 128 || sanitized.length === 0) continue;
      process.env[key] = sanitized;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update .env:', err.message);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// --- Feedback endpoint (creates GitHub issue) ---
app.post('/api/feedback', feedbackLimiter, async (req, res) => {
  try {
    const { name, email, feedback, website } = req.body;

    // 1. Honeypot check (bots fill hidden "website" field)
    if (website) {
      console.log('Feedback spam blocked (honeypot)');
      return res.status(400).json({ error: 'Invalid submission' });
    }

    // 2. Validate feedback content
    if (!feedback || typeof feedback !== 'string') {
      return res.status(400).json({ error: 'Feedback is required' });
    }

    const feedbackTrimmed = feedback.trim();
    if (feedbackTrimmed.length < 10) {
      return res.status(400).json({ error: 'Feedback must be at least 10 characters' });
    }

    if (feedbackTrimmed.length > 5000) {
      return res.status(400).json({ error: 'Feedback must be less than 5000 characters' });
    }

    // 3. Simple spam keyword filter
    const spamKeywords = ['viagra', 'casino', 'lottery', 'crypto wallet', 'buy bitcoin'];
    const lowerFeedback = feedbackTrimmed.toLowerCase();
    if (spamKeywords.some(kw => lowerFeedback.includes(kw))) {
      console.log('Feedback spam blocked (keywords)');
      return res.status(400).json({ error: 'Invalid content' });
    }

    // 4. Validate optional fields
    const nameSafe = (name || '').trim().substring(0, 100);
    const emailSafe = (email || '').trim().substring(0, 100);

    // 5. Check for GitHub token
    const githubToken = process.env.GITHUB_FEEDBACK_TOKEN;
    if (!githubToken) {
      console.error('GITHUB_FEEDBACK_TOKEN not configured');
      return res.status(500).json({ error: 'Feedback system not configured. Please contact the developer.' });
    }

    // 6. Build GitHub issue body
    let issueBody = feedbackTrimmed;
    if (nameSafe || emailSafe) {
      issueBody += '\n\n---\n\n**Submitted by:**';
      if (nameSafe) issueBody += `\nName: ${nameSafe}`;
      if (emailSafe) issueBody += `\nEmail: ${emailSafe}`;
    }

    // 7. Create GitHub issue
    const issueData = JSON.stringify({
      title: `[Feedback] ${feedbackTrimmed.substring(0, 50)}${feedbackTrimmed.length > 50 ? '...' : ''}`,
      body: issueBody,
      labels: ['feedback']
    });

    const options = {
      hostname: 'api.github.com',
      path: '/repos/stevencheist/HamTabv1/issues',
      method: 'POST',
      headers: {
        'User-Agent': 'HamTab-Feedback',
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(issueData)
      }
    };

    // Make GitHub API request
    const githubReq = https.request(options, (githubRes) => {
      let data = '';
      githubRes.on('data', chunk => data += chunk);
      githubRes.on('end', () => {
        if (githubRes.statusCode === 201) {
          console.log('Feedback submitted successfully');
          res.json({ success: true, message: 'Feedback submitted successfully' });
        } else {
          console.error('GitHub API error:', githubRes.statusCode, data);
          res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
        }
      });
    });

    githubReq.on('error', (err) => {
      console.error('GitHub API request error:', err.message);
      res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
    });

    githubReq.write(issueData);
    githubReq.end();

  } catch (err) {
    console.error('Feedback endpoint error:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
  }
});

// Proxy NASA SDO solar images
const SDO_TYPES = new Set(['0193', '0171', '0304', 'HMIIC']);

// --- SDO browse frame list (animated time-lapse) ---
// Cache per-day directory listings to avoid re-scraping
const sdoDirCache = {}; // { 'YYYY/MM/DD:type': { frames: [], expires: timestamp } }

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

app.get('/api/solar/frames', async (req, res) => {
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

app.get('/api/solar/frame/:filename', async (req, res) => {
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

app.get('/api/solar/image', async (req, res) => {
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

// Proxy NASA SVS moon phase image (pre-rendered LROC frames for current year)
// Frame number = hour of year (1–8760), gives accurate texture + libration + lighting
app.get('/api/lunar/image', async (req, res) => {
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

// Proxy prop.kc2g.com propagation GeoJSON contours
app.get('/api/propagation', async (req, res) => {
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

// --- VOACAP prediction engine ---

// SSN cache — refreshed every 24 hours from NOAA predicted monthly sunspot number
const ssnCache = { data: null, expires: 0 };
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

// VOACAP prediction cache — keyed by rounded params, TTL 1 hour
const voacapCache = {}; // { key: { data, expires } }
const VOACAP_TTL = 60 * 60 * 1000; // 1 hour

// Simplified propagation model (server-side fallback when Python unavailable)
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
function calculateBandReliabilityServer(freqMHz, muf, isDay, opts) {
  const mufLower = muf * 0.5;
  const mufOptimal = muf * 0.85;
  let base = 0;

  if (freqMHz < mufLower) {
    if (isDay) {
      base = Math.max(0, 20 - (mufLower - freqMHz) * 2);
    } else {
      base = Math.min(85, 60 + (mufLower - freqMHz) * 1.5);
    }
  } else if (freqMHz <= mufOptimal) {
    const position = (freqMHz - mufLower) / (mufOptimal - mufLower);
    base = 70 + (30 * Math.sin(position * Math.PI));
  } else if (freqMHz <= muf) {
    const position = (freqMHz - mufOptimal) / (muf - mufOptimal);
    base = 90 - (position * 40);
  } else {
    const excess = freqMHz - muf;
    base = Math.max(0, 40 - excess * 3);
  }

  if (opts) {
    if (opts.mode === 'CW') base += 10;
    else if (opts.mode === 'FT8') base += 30;
    if (opts.powerWatts && opts.powerWatts !== 100) {
      base += 10 * Math.log10(opts.powerWatts / 100) * 1.5;
    }
    if (opts.toaDeg != null) {
      base += (opts.toaDeg - 5) * 1.5;
    }
    if (opts.longPath) base -= 25;
  }

  return Math.max(0, Math.min(100, base));
}

// Representative global targets for multi-target VOACAP overview
const VOACAP_TARGETS = [
  { name: 'Europe',        lat: 50.0,  lon: 10.0 },
  { name: 'East Asia',     lat: 35.0,  lon: 135.0 },
  { name: 'South America', lat: -15.0, lon: -47.0 },
  { name: 'Oceania',       lat: -33.0, lon: 151.0 },
  { name: 'Africa',        lat: 0.0,   lon: 30.0 },
  { name: 'North America', lat: 40.0,  lon: -100.0 },
];

// Return SSN data
app.get('/api/voacap/ssn', async (req, res) => {
  try {
    const ssn = await getCurrentSSN();
    res.json(ssn);
  } catch (err) {
    console.error('Error fetching SSN:', err.message);
    res.status(502).json({ error: 'Failed to fetch SSN data' });
  }
});

// VOACAP prediction endpoint
app.get('/api/voacap', async (req, res) => {
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

    // Cache key — round lat/lon to 1 decimal to improve hit rate
    const cacheKey = [
      Math.round(txLat * 10) / 10,
      Math.round(txLon * 10) / 10,
      rxLat != null ? Math.round(rxLat * 10) / 10 : 'all',
      rxLon != null ? Math.round(rxLon * 10) / 10 : 'all',
      power, mode, toa, pathType,
    ].join(':');

    const cached = voacapCache[cacheKey];
    if (cached && Date.now() < cached.expires) {
      return res.json(cached.data);
    }

    // Fetch current SSN
    const ssnData = await getCurrentSSN();
    const ssn = ssnData.ssn;
    const month = ssnData.month;

    // Mode → required SNR and bandwidth
    const modeMap = {
      CW:  { snr: 39, bw: 500 },
      SSB: { snr: 73, bw: 2700 },
      FT8: { snr: 2,  bw: 50 },
    };
    const { snr: requiredSnr, bw: bandwidthHz } = modeMap[mode] || modeMap.SSB;

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

    let engine = 'simplified';
    let matrix;

    if (voacap.isAvailable()) {
      // Batch predict: send all 24 hours × all targets in a single IPC call
      try {
        const result = await voacap.predictMatrix({
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
        });

        if (result.ok && result.matrix) {
          engine = 'dvoacap';
          matrix = result.matrix;
        } else {
          console.error('[VOACAP] Matrix prediction failed:', result.error || 'unknown');
          matrix = simplifiedVoacapMatrix(txLat, txLon, ssn, month, power, mode, toa, longPath);
        }
      } catch (err) {
        console.error(`[VOACAP] Matrix prediction error: ${err.message}`);
        matrix = simplifiedVoacapMatrix(txLat, txLon, ssn, month, power, mode, toa, longPath);
      }
    } else {
      // Simplified fallback
      matrix = simplifiedVoacapMatrix(txLat, txLon, ssn, month, power, mode, toa, longPath);
    }

    const response = {
      engine,
      ssn: Math.round(ssn * 10) / 10,
      month,
      matrix,
    };

    // Cache result — only cache dvoacap responses long-term.
    // Simplified responses use a short TTL so we re-check once the worker is ready.
    const ttl = engine === 'dvoacap' ? VOACAP_TTL : 30 * 1000; // 1h vs 30s
    voacapCache[cacheKey] = { data: response, expires: Date.now() + ttl };

    res.json(response);
  } catch (err) {
    console.error('Error in /api/voacap:', err.message);
    res.status(500).json({ error: 'Failed to compute VOACAP predictions' });
  }
});

// --- Lunar math (simplified Meeus algorithms) ---

// Lunar position via Jean Meeus, "Astronomical Algorithms" 2nd ed.
// Chapters 47 (position) & 48 (illumination). Coefficients are the
// principal terms from Table 47.A; lower-order terms omitted for speed.
function computeLunar() {
  const now = new Date();
  const JD = julianDate(now);
  const T = (JD - 2451545.0) / 36525.0; // centuries since J2000

  // Moon's mean longitude (L')
  const Lp = mod360(218.3165 + 481267.8813 * T);
  // Moon's mean anomaly (M')
  const Mp = mod360(134.9634 + 477198.8676 * T);
  // Moon's mean elongation (D)
  const D = mod360(297.8502 + 445267.1115 * T);
  // Sun's mean anomaly (M)
  const M = mod360(357.5291 + 35999.0503 * T);
  // Moon's argument of latitude (F)
  const F = mod360(93.2720 + 483202.0175 * T);

  const rad = Math.PI / 180;

  // Ecliptic longitude
  let lambda = Lp
    + 6.289 * Math.sin(Mp * rad)
    - 1.274 * Math.sin((2 * D - Mp) * rad)
    + 0.658 * Math.sin(2 * D * rad)
    - 0.214 * Math.sin(2 * Mp * rad)
    - 0.186 * Math.sin(M * rad)
    - 0.114 * Math.sin(2 * F * rad);
  lambda = mod360(lambda);

  // Ecliptic latitude
  const beta = 5.128 * Math.sin(F * rad)
    + 0.281 * Math.sin((Mp + F) * rad)
    - 0.277 * Math.sin((Mp - F) * rad)
    - 0.173 * Math.sin((2 * D - F) * rad);

  // Horizontal parallax (distance), in degrees
  const horizParallax = 0.9508
    + 0.0518 * Math.cos(Mp * rad)
    + 0.0095 * Math.cos((2 * D - Mp) * rad)
    + 0.0078 * Math.cos(2 * D * rad)
    + 0.0028 * Math.cos(2 * Mp * rad);

  const distance = 6378.14 / Math.sin(horizParallax * rad); // km

  // Ecliptic to equatorial conversion
  const epsilon = 23.4393 - 0.0130 * T; // obliquity of ecliptic
  const lambdaRad = lambda * rad;
  const betaRad = beta * rad;
  const epsilonRad = epsilon * rad;

  const sinDec = Math.sin(betaRad) * Math.cos(epsilonRad)
    + Math.cos(betaRad) * Math.sin(epsilonRad) * Math.sin(lambdaRad);
  const declination = Math.asin(sinDec) / rad;

  // Phase calculation
  // Sun's ecliptic longitude (approximate)
  const sunLongitude = mod360(280.4665 + 36000.7698 * T);
  let elongation = lambda - sunLongitude;
  elongation = mod360(elongation + 180) - 180;

  const illumination = (1 - Math.cos(elongation * rad)) / 2 * 100;

  const phase = moonPhaseName(elongation);

  // Path loss relative to average distance (384,400 km)
  const avgDistance = 384400;
  const pathLoss = 20 * Math.log10(distance / avgDistance);

  // Right ascension
  const sinRA = Math.cos(betaRad) * Math.sin(lambdaRad) * Math.cos(epsilonRad)
    - Math.sin(betaRad) * Math.sin(epsilonRad);
  const cosRA = Math.cos(betaRad) * Math.cos(lambdaRad);
  const rightAscension = Math.atan2(sinRA, cosRA) / rad;

  return {
    phase,
    illumination: Math.round(illumination * 10) / 10,
    declination: Math.round(declination * 10) / 10,
    distance: Math.round(distance),
    pathLoss: Math.round(pathLoss * 100) / 100,
    elongation: Math.round(elongation * 10) / 10,
    eclipticLon: Math.round(lambda * 10) / 10,
    eclipticLat: Math.round(beta * 100) / 100,
    rightAscension: Math.round(mod360(rightAscension) * 10) / 10,
  };
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

// --- Hardened fetch ---

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

// SSRF guard: rejects all non-routable IPs (loopback, link-local, IPv6 ULA, etc.).
// Broader than isRFC1918() below, which only checks LAN-routable ranges for TLS cert SANs.
function isPrivateIP(ip) {
  // IPv6 loopback and private
  if (ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique local
  if (ip.startsWith('fe80')) return true; // link-local
  if (ip === '::') return true; // unspecified address
  if (ip.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — extract and check the IPv4 part
    return isPrivateIP(ip.substring(7));
  }

  // IPv4
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 0) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
  }
  return false;
}

async function resolveHost(hostname) {
  // If it's already an IP literal, return it directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) {
    return hostname;
  }
  const { address } = await dns.promises.lookup(hostname);
  return address;
}

function secureFetch(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('Too many redirects'));
    }

    const parsed = new URL(url);

    // SSRF guard: HTTPS-only for external requests
    if (parsed.protocol !== 'https:') {
      return reject(new Error('Only HTTPS URLs are allowed'));
    }

    // Resolve DNS and check the actual IP before connecting
    resolveHost(parsed.hostname).then((resolvedIP) => {
      if (isPrivateIP(resolvedIP)) {
        return reject(new Error('Requests to private addresses are blocked'));
      }

      // Pin the resolved IP to prevent TOCTOU / DNS rebinding
      const options = {
        hostname: resolvedIP,
        path: parsed.pathname + parsed.search,
        port: parsed.port || 443,
        headers: {
          'User-Agent': 'HamTab/1.0',
          'Host': parsed.hostname,
        },
        servername: parsed.hostname, // for TLS SNI
      };

      const req = https.get(options, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          resp.resume();
          return secureFetch(resp.headers.location, redirectCount + 1).then(resolve).catch(reject);
        }
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          resp.resume();
          return reject(new Error(`HTTP ${resp.statusCode}`));
        }

        let data = '';
        let bytes = 0;
        resp.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) {
            resp.destroy();
            return reject(new Error('Response too large'));
          }
          data += chunk;
        });
        resp.on('end', () => resolve(data));
        resp.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    }).catch(reject);
  });
}

async function fetchJSON(url) {
  const data = await secureFetch(url);
  return JSON.parse(data);
}

async function fetchText(url) {
  return secureFetch(url);
}

// --- SOTA summit coordinate cache (TTL-based) ---

const sotaSummitCache = {};  // { 'W7W/LC-001': { lat, lon, expires }, ... }
const SUMMIT_TTL_OK   = 24 * 60 * 60 * 1000; // 24 hours for successful lookups
const SUMMIT_TTL_FAIL =      60 * 60 * 1000; // 1 hour for failed lookups

async function fetchSummitCoords(associationCode, summitCode) {
  const key = `${associationCode}/${summitCode}`;
  const cached = sotaSummitCache[key];
  if (cached && Date.now() < cached.expires) return cached;
  try {
    const data = await fetchJSON(
      `https://api2.sota.org.uk/api/summits/${encodeURIComponent(associationCode)}/${encodeURIComponent(summitCode)}`
    );
    const entry = {
      lat: data.latitude ?? null,
      lon: data.longitude ?? null,
      expires: Date.now() + SUMMIT_TTL_OK,
    };
    sotaSummitCache[key] = entry;
    return entry;
  } catch {
    const entry = { lat: null, lon: null, expires: Date.now() + SUMMIT_TTL_FAIL };
    sotaSummitCache[key] = entry;
    return entry;
  }
}

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

// --- TLS certificate management ---

const CERTS_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.cert');

function isRFC1918(ip) {
  // Subset of isPrivateIP: only RFC 1918 LAN-routable ranges (for TLS cert SANs)
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return false;
  const [a, b] = parts;
  return (a === 10) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function getLocalIPs() {
  const ips = new Set();

  // Collect non-internal IPv4 addresses from local interfaces
  const ifaces = os.networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    for (const addr of addrs) {
      if (!addr.internal && addr.family === 'IPv4' && isRFC1918(addr.address)) {
        ips.add(addr.address);
      }
    }
  }

  // In WSL, also discover Windows host IPs so the cert covers addresses
  // that LAN clients actually connect to via portproxy
  try {
    const result = execSync(
      'powershell.exe -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress"',
      { timeout: 5000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    for (const line of result.split(/\r?\n/)) {
      const ip = line.trim();
      if (ip && isRFC1918(ip)) {
        ips.add(ip);
      }
    }
  } catch {
    // Not running in WSL or powershell.exe not available
  }

  return [...ips].sort();
}

const SANS_PATH = path.join(CERTS_DIR, '.sans');

function ensureCerts() {
  const currentIPs = getLocalIPs();
  const allSANs = ['localhost', '127.0.0.1', '::1', ...currentIPs].sort().join(',');

  // Reuse existing cert if SANs still match current network addresses
  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH) && fs.existsSync(SANS_PATH)) {
    const savedSANs = fs.readFileSync(SANS_PATH, 'utf-8').trim();
    if (savedSANs === allSANs) {
      console.log('TLS certificate SANs match current network — reusing existing cert.');
      return {
        key: fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH),
      };
    }
    console.log('Network addresses changed — regenerating TLS certificate...');
  } else {
    console.log('Generating self-signed TLS certificate...');
  }

  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    { type: 7, ip: '::1' },
  ];

  for (const ip of currentIPs) {
    altNames.push({ type: 7, ip });
  }

  console.log('Certificate SANs:', ['localhost', '127.0.0.1', '::1', ...currentIPs].join(', '));

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    extensions: [{ name: 'subjectAltName', altNames }],
  });

  fs.mkdirSync(CERTS_DIR, { recursive: true });
  fs.writeFileSync(KEY_PATH, pems.private);
  fs.writeFileSync(CERT_PATH, pems.cert);
  fs.writeFileSync(SANS_PATH, allSANs);
  console.log(`Certificates saved to ${CERTS_DIR}/`);

  return { key: pems.private, cert: pems.cert };
}

// --- Cache eviction (runs every 30 minutes, removes expired entries) ---
const allCaches = [dxcCallCache, pskHeardCache, satPassCache, satTleCache, nwsGridCache, sdoDirCache, sotaSummitCache, voacapCache];
setInterval(() => {
  const now = Date.now();
  for (const cache of allCaches) {
    for (const key of Object.keys(cache)) {
      if (cache[key] && cache[key].expires && now > cache[key].expires) {
        delete cache[key];
      }
    }
  }
}, 30 * 60 * 1000); // 30 minutes

// --- Start servers ---

// Initialize VOACAP bridge (Python child process for real predictions)
voacap.init();

// Write PID file so dev tooling can find and kill this process cleanly
fs.writeFileSync(path.join(__dirname, 'server.pid'), String(process.pid));
process.on('exit', () => {
  voacap.shutdown();
  try { fs.unlinkSync(path.join(__dirname, 'server.pid')); } catch {}
});

app.listen(PORT, HOST, () => {
  console.log(`HTTP  server running at http://${HOST}:${PORT}`);
});

const tlsOptions = ensureCerts();
https.createServer(tlsOptions, app).listen(HTTPS_PORT, HOST, () => {
  console.log(`HTTPS server running at https://${HOST}:${HTTPS_PORT}`);
});
