const express = require('express');
const http = require('http');
const https = require('https');
const { URL } = require('url');

const app = express();
const PORT = 3000;

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

// Proxy ISS position API
app.get('/api/iss', async (req, res) => {
  try {
    const data = await fetchJSON('https://api.wheretheiss.at/v1/satellites/25544');
    res.json(data);
  } catch (err) {
    console.error('Error fetching ISS data:', err.message);
    res.status(502).json({ error: 'Failed to fetch ISS data' });
  }
});

// ISS orbit ground track (one full orbit, ~92 minutes)
app.get('/api/iss/orbit', async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000);
    const period = 92 * 60;
    const step = 120; // 2-minute intervals
    const allTimestamps = [];
    for (let t = now; t <= now + period; t += step) {
      allTimestamps.push(t);
    }

    // API allows max 10 timestamps per request — batch sequentially
    const positions = [];
    for (let i = 0; i < allTimestamps.length; i += 10) {
      const batch = allTimestamps.slice(i, i + 10);
      const url = `https://api.wheretheiss.at/v1/satellites/25544/positions?timestamps=${batch.join(',')}&units=kilometers`;
      const batchResult = await fetchJSON(url);
      positions.push(...batchResult);
    }

    res.json(positions);
  } catch (err) {
    console.error('Error fetching ISS orbit:', err.message);
    res.status(502).json({ error: 'Failed to fetch ISS orbit' });
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

// --- Lunar math (simplified Meeus algorithms) ---

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

  // Horizontal parallax (distance)
  const pi = 0.9508
    + 0.0518 * Math.cos(Mp * rad)
    + 0.0095 * Math.cos((2 * D - Mp) * rad)
    + 0.0078 * Math.cos(2 * D * rad)
    + 0.0028 * Math.cos(2 * Mp * rad);

  const distance = 6378.14 / Math.sin(pi * rad); // km

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

  return {
    phase,
    illumination: Math.round(illumination * 10) / 10,
    declination: Math.round(declination * 10) / 10,
    distance: Math.round(distance),
    pathLoss: Math.round(pathLoss * 100) / 100,
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

function fetch(url) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    client.get(url, { headers: { 'User-Agent': 'POTA-App/1.0' } }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        return fetch(resp.headers.location).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) {
        return reject(new Error(`HTTP ${resp.statusCode}`));
      }
      let data = '';
      resp.on('data', chunk => data += chunk);
      resp.on('end', () => resolve(data));
      resp.on('error', reject);
    }).on('error', reject);
  });
}

async function fetchJSON(url) {
  const data = await fetch(url);
  return JSON.parse(data);
}

async function fetchText(url) {
  return fetch(url);
}

function parseSolarXML(xml) {
  const get = (tag) => {
    const match = xml.match(new RegExp(`<${tag}>([^<]*)</${tag}>`));
    return match ? match[1].trim() : '';
  };

  const indices = {
    sfi: get('solarflux'),
    sunspots: get('sunspots'),
    aindex: get('aindex'),
    kindex: get('kindex'),
    xray: get('xray'),
    signalnoise: get('signalnoise'),
    updated: get('updated'),
  };

  // Parse band conditions
  const bands = [];
  const bandRegex = /<band name="([^"]*)" time="([^"]*)"[^>]*>([^<]*)<\/band>/g;
  let match;
  while ((match = bandRegex.exec(xml)) !== null) {
    bands.push({
      band: match[1],
      time: match[2],
      condition: match[3].trim(),
    });
  }

  return { indices, bands };
}

app.listen(PORT, () => {
  console.log(`POTA app running at http://localhost:${PORT}`);
});
