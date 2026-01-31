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

const app = express();
const PORT = process.env.PORT || 3000;
const HTTPS_PORT = process.env.HTTPS_PORT || 3443;
const HOST = process.env.HOST || '0.0.0.0';

// --- Security middleware ---

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https://*.basemaps.cartocdn.com", "https://cdnjs.cloudflare.com"],
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

      // Allow localhost
      if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
        return callback(null, true);
      }

      // Allow RFC 1918 private ranges
      const parts = hostname.split('.').map(Number);
      if (parts.length === 4 && parts.every(p => !isNaN(p))) {
        const [a, b] = parts;
        if (a === 10) return callback(null, true);                          // 10.0.0.0/8
        if (a === 172 && b >= 16 && b <= 31) return callback(null, true);   // 172.16.0.0/12
        if (a === 192 && b === 168) return callback(null, true);            // 192.168.0.0/16
      }

      // Reject public origins
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

// --- Hardened fetch ---

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

function isPrivateHost(hostname) {
  // Block localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  // Block IPv4 private ranges
  const parts = hostname.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 10) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 169 && b === 254) return true; // link-local
    if (a === 127) return true;
    if (a === 0) return true;
  }
  return false;
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

    // SSRF guard: block private/internal IPs
    if (isPrivateHost(parsed.hostname)) {
      return reject(new Error('Requests to private addresses are blocked'));
    }

    const req = https.get(url, { headers: { 'User-Agent': 'POTA-App/1.0' } }, (resp) => {
      if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
        resp.resume(); // drain socket
        return secureFetch(resp.headers.location, redirectCount + 1).then(resolve).catch(reject);
      }
      if (resp.statusCode !== 200) {
        resp.resume(); // drain socket
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
  });
}

async function fetchJSON(url) {
  const data = await secureFetch(url);
  return JSON.parse(data);
}

async function fetchText(url) {
  return secureFetch(url);
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

// --- TLS certificate management ---

const CERTS_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.cert');

function isRFC1918(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return false;
  const [a, b] = parts;
  if (a === 10) return true;                          // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16.0.0/12
  if (a === 192 && b === 168) return true;             // 192.168.0.0/16
  return false;
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

// --- Start servers ---

app.listen(PORT, HOST, () => {
  console.log(`HTTP  server running at http://${HOST}:${PORT}`);
});

const tlsOptions = ensureCerts();
https.createServer(tlsOptions, app).listen(HTTPS_PORT, HOST, () => {
  console.log(`HTTPS server running at https://${HOST}:${HTTPS_PORT}`);
});
