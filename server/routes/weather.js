// --- Weather router ---
// Weather Underground, NWS conditions/alerts, OWM, radar, cloud tiles.
// Extracted from server.js.

const https = require('https');
const { URL } = require('url');
const express = require('express');
const { isPrivateIP, resolveHost, fetchJSON, fetchText, MAX_REDIRECTS, MAX_RESPONSE_BYTES } = require('../services/http-fetch');
const { registerCache } = require('../services/cache-store');

const router = express.Router();

// --- Helper: compass direction from degrees ---

function degToCompass(deg) {
  const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
  return dirs[Math.round(deg / 22.5) % 16] || '';
}

// --- NWS fetch with retry + redirect handling ---

const nwsGridCache = registerCache({}); // { 'lat,lon': { forecastUrl, expires } }

// NWS API only covers the US and territories — reject out-of-range coordinates early
function isNwsCoverage(lat, lon) {
  return lat >= 17.5 && lat <= 72 && lon >= -180 && lon <= -64;
}

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

// --- Radar cache ---

const radarCache = { data: null, expires: 0 };
const RADAR_TTL = 5 * 60 * 1000; // 5 minutes

// --- Routes ---

// Weather Underground personal weather station
router.get('/', async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.query.apikey || process.env.WU_API_KEY;
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

// NWS weather conditions (background gradient for local clock)
router.get('/conditions', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Provide valid lat (-90..90) and lon (-180..180)' });
    }
    if (!isNwsCoverage(lat, lon)) {
      return res.status(400).json({ error: 'NWS only covers US locations' });
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
router.get('/alerts', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Provide valid lat (-90..90) and lon (-180..180)' });
    }
    if (!isNwsCoverage(lat, lon)) {
      return res.json([]); // no alerts outside US coverage
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

// OWM Current Weather (global coverage — fallback when NWS unavailable)
router.get('/owm', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lon = parseFloat(req.query.lon);
    if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      return res.status(400).json({ error: 'Provide valid lat (-90..90) and lon (-180..180)' });
    }
    const apiKey = req.headers['x-api-key'] || req.query.apikey || process.env.OWM_API_KEY;
    if (!apiKey) {
      return res.status(400).json({ error: 'OWM API key required' });
    }
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.toFixed(4)}&lon=${lon.toFixed(4)}&appid=${encodeURIComponent(apiKey)}&units=imperial`;
    const raw = await fetchText(url);
    const data = JSON.parse(raw);

    // Map OWM response to same shape as NWS conditions endpoint
    const weather = data.weather && data.weather[0] ? data.weather[0].main : '';
    const temp = data.main ? Math.round(data.main.temp) : null;
    const humidity = data.main ? data.main.humidity : null;
    const windSpeedMph = data.wind ? Math.round(data.wind.speed) : null;
    const windDeg = data.wind ? data.wind.deg : null;
    const isDaytime = data.sys ? (Date.now() / 1000 > data.sys.sunrise && Date.now() / 1000 < data.sys.sunset) : true;

    res.json({
      shortForecast: weather,
      temperature: temp,
      temperatureUnit: 'F',
      isDaytime,
      windSpeed: windSpeedMph != null ? windSpeedMph + ' mph' : null,
      windDirection: windDeg != null ? degToCompass(windDeg) : '',
      relativeHumidity: humidity,
      source: 'owm',
    });
  } catch (err) {
    console.error('Error fetching OWM conditions:', err.message);
    res.status(502).json({ error: 'Failed to fetch OWM weather data' });
  }
});

// Radar data from RainViewer
router.get('/radar', async (req, res) => {
  try {
    if (radarCache.data && Date.now() < radarCache.expires) {
      return res.json(radarCache.data);
    }
    const json = await fetchJSON('https://api.rainviewer.com/public/weather-maps.json');
    // Extract latest radar frame
    const radar = json.radar;
    if (!radar || !radar.past || !radar.past.length) {
      throw new Error('No radar frames available');
    }
    const latest = radar.past[radar.past.length - 1];
    const result = { host: json.host, path: latest.path, time: latest.time };
    radarCache.data = result;
    radarCache.expires = Date.now() + RADAR_TTL;
    res.json(result);
  } catch (err) {
    console.error('Error fetching weather radar:', err.message);
    res.status(502).json({ error: 'Failed to fetch weather radar data' });
  }
});

// Cloud cover tiles — proxy OpenWeatherMap tile API to keep API key server-side
router.get('/clouds/:z/:x/:y', async (req, res) => {
  try {
    const apiKey = process.env.OWM_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'No OpenWeatherMap API key configured' });
    }
    const { z, x, y } = req.params;
    // Validate tile coordinates are integers
    if (!/^\d+$/.test(z) || !/^\d+$/.test(x) || !/^\d+$/.test(y)) {
      return res.status(400).json({ error: 'Invalid tile coordinates' });
    }
    const url = `https://tile.openweathermap.org/map/clouds_new/${z}/${x}/${y}.png?appid=${apiKey}`;
    const parsed = new URL(url);
    const resolvedIP = await resolveHost(parsed.hostname);
    if (isPrivateIP(resolvedIP)) {
      return res.status(403).json({ error: 'Blocked' });
    }
    const proxyReq = https.get({
      hostname: resolvedIP,
      path: parsed.pathname + parsed.search,
      port: 443,
      headers: { 'User-Agent': 'HamTab/1.0', 'Host': parsed.hostname },
      servername: parsed.hostname,
    }, (upstream) => {
      if (upstream.statusCode < 200 || upstream.statusCode >= 300) {
        upstream.resume();
        return res.status(502).json({ error: 'Failed to fetch cloud cover tile' });
      }
      res.set('Content-Type', upstream.headers['content-type'] || 'image/png');
      res.set('Cache-Control', 'public, max-age=1800, s-maxage=3600'); // 30m browser, 1h edge
      upstream.pipe(res);
    });
    proxyReq.on('error', (err) => {
      console.error('Cloud cover tile proxy error:', err.message);
      if (!res.headersSent) res.status(502).json({ error: 'Failed to fetch cloud cover tile' });
    });
    proxyReq.setTimeout(10000, () => { proxyReq.destroy(); });
  } catch (err) {
    console.error('Error fetching cloud cover tile:', err.message);
    res.status(502).json({ error: 'Failed to fetch cloud cover tile' });
  }
});

module.exports = router;
