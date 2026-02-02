require('dotenv').config();

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, spawn } = require('child_process');
const { URL } = require('url');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const selfsigned = require('selfsigned');
const { XMLParser } = require('fast-xml-parser');
const dns = require('dns');

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

function nwsFetchOnce(url) {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== 'string') {
      return reject(new Error(`nwsFetchOnce called with invalid url: ${JSON.stringify(url)}`));
    }
    let parsed;
    try { parsed = new URL(url); } catch (e) {
      return reject(new Error(`Invalid URL passed to nwsFetch: "${url}" — ${e.message}`));
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
          return nwsFetchOnce(redirectUrl).then(resolve).catch(reject);
        }
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          resp.resume();
          return reject(new Error(`HTTP ${resp.statusCode} from ${parsed.hostname}${parsed.pathname}`));
        }
        let data = '';
        resp.on('data', chunk => { data += chunk; });
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

// --- Auto-update system (GitHub Releases) ---

const currentVersion = require('./package.json').version;
const GITHUB_RELEASES_URL = 'https://api.github.com/repos/stevencheist/HamTabv1/releases/latest';

// Detect platform label once at startup
function detectPlatform() {
  const platform = os.platform();
  const arch = os.arch();
  // Check for Raspberry Pi via device-tree model
  try {
    const model = fs.readFileSync('/proc/device-tree/model', 'utf-8');
    if (/raspberry/i.test(model)) return 'Raspberry Pi';
  } catch { /* not linux or no device-tree */ }
  if (platform === 'win32') return 'Windows';
  if (platform === 'darwin') return 'macOS';
  if (platform === 'linux') {
    // Try to get distro name
    try {
      const release = fs.readFileSync('/etc/os-release', 'utf-8');
      const match = release.match(/^PRETTY_NAME="?([^"\n]+)"?/m);
      if (match) return match[1];
    } catch { /* fallback */ }
    return 'Linux';
  }
  return `${platform}/${arch}`;
}
const serverPlatform = detectPlatform();

let updateAvailable = false;
let latestVersion = null;
let releaseUrl = null;
let lastCheckTime = null;
let checking = false;
let updateCheckInterval = Math.min(Math.max(parseInt(process.env.UPDATE_INTERVAL_SECONDS, 10) || 900, 60), 86400) * 1000;
let updateTimer = null;

// Simple semver compare: returns 1 if a > b, -1 if a < b, 0 if equal
function compareSemver(a, b) {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

async function checkForUpdates() {
  if (checking) return;
  checking = true;
  try {
    const raw = await secureFetch(GITHUB_RELEASES_URL);
    const release = JSON.parse(raw);
    const tag = (release.tag_name || '').replace(/^v/, '');
    if (tag && compareSemver(tag, currentVersion) > 0) {
      latestVersion = tag;
      releaseUrl = release.html_url || null;
      updateAvailable = true;
      console.log(`Update check: v${tag} available (current: v${currentVersion})`);
    } else {
      updateAvailable = false;
      latestVersion = null;
      releaseUrl = null;
      console.log('Update check: up to date');
    }
  } catch (err) {
    console.error('Update check failed:', err.message);
  } finally {
    checking = false;
    lastCheckTime = new Date().toISOString();
  }
}

function startUpdateTimer() {
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(checkForUpdates, updateCheckInterval);
  console.log(`Update check interval: ${updateCheckInterval / 1000}s`);
}

// Run initial check and start timer
checkForUpdates();
startUpdateTimer();

// Status endpoint
app.get('/api/update/status', (req, res) => {
  res.json({
    available: updateAvailable,
    currentVersion,
    latestVersion,
    releaseUrl,
    lastCheck: lastCheckTime,
    checking,
    platform: serverPlatform,
  });
});

// Set check interval (min 60s, max 86400s)
app.post('/api/update/interval', (req, res) => {
  const seconds = parseInt(req.body.seconds, 10);
  if (!seconds || seconds < 60 || seconds > 86400) {
    return res.status(400).json({ error: 'Interval must be between 60 and 86400 seconds' });
  }
  updateCheckInterval = seconds * 1000;
  startUpdateTimer();
  res.json({ interval: seconds });
});

// Graceful restart — if running under start.sh wrapper, just exit and let it
// respawn. Otherwise, spawn a replacement process before exiting.
function gracefulRestart(delayMs) {
  setTimeout(() => {
    if (process.env.RESTART_WRAPPER) {
      process.exit(0);
    } else {
      console.log('No restart wrapper detected — self-restarting...');
      const child = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
        cwd: __dirname,
        detached: true,
        stdio: 'inherit',
        env: { ...process.env },
      });
      child.unref();
      process.exit(0);
    }
  }, delayMs);
}

app.post('/api/restart', (req, res) => {
  res.json({ restarting: true });
  console.log('Restart requested by client. Exiting...');
  gracefulRestart(500);
});

// --- Save .env settings from client config ---
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
    for (const [key, value] of Object.entries(updates)) {
      // Only allow known env keys
      if (key !== 'WU_API_KEY') continue;
      const idx = lines.findIndex(l => l.startsWith(key + '='));
      const entry = `${key}=${value}`;
      if (idx >= 0) {
        lines[idx] = entry;
      } else {
        lines.push(entry);
      }
    }

    fs.writeFileSync(envPath, lines.filter(l => l.trim() !== '').join('\n') + '\n');
    // Update process.env so it takes effect immediately
    for (const [key, value] of Object.entries(updates)) {
      if (key === 'WU_API_KEY') process.env[key] = value;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update .env:', err.message);
    res.status(500).json({ error: 'Failed to save config' });
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

function isPrivateIP(ip) {
  // IPv6 loopback and private
  if (ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique local
  if (ip.startsWith('fe80')) return true; // link-local
  if (ip === '::' || ip.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — extract and check the IPv4 part
    const v4 = ip.replace('::ffff:', '');
    if (v4 !== ip) return isPrivateIP(v4);
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
          'User-Agent': 'POTA-App/1.0',
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

// --- Start servers ---

app.listen(PORT, HOST, () => {
  console.log(`HTTP  server running at http://${HOST}:${PORT}`);
});

const tlsOptions = ensureCerts();
https.createServer(tlsOptions, app).listen(HTTPS_PORT, HOST, () => {
  console.log(`HTTPS server running at https://${HOST}:${HTTPS_PORT}`);
});
