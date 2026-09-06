// --- Spots router ---
// ALL spot-related endpoints: POTA, DXC, PSK, WSPR, SOTA, WWFF, MQTT, TCP/SSE feeds.
// Extracted from server.js.

const express = require('express');
const mqtt = require('mqtt');
const net = require('net');
const { XMLParser } = require('fast-xml-parser');
const { secureFetch, fetchJSON, fetchText } = require('../services/http-fetch');
const { registerCache } = require('../services/cache-store');
const { setFreshnessHeaders } = require('../services/freshness-headers');
const { isUSCallsign, lookupHamqth, gridToLatLon } = require('./callsign');

const router = express.Router();

// Proxy POTA spots API
router.get('/spots', async (req, res) => {
  try {
    const data = await fetchJSON('https://api.pota.app/spot/activator');
    // Normalize frequency from kHz (POTA API) to MHz (consistent with all other sources)
    const spots = (Array.isArray(data) ? data : []).map(s => ({
      ...s,
      frequency: s.frequency ? (parseFloat(s.frequency) / 1000).toFixed(3) : '',
    }));
    res.json(spots);
  } catch (err) {
    console.error('Error fetching spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch POTA spots' });
  }
});

// --- POTA Spot Submission Proxy ---
// Posts a spot to api.pota.app on behalf of the user
router.post('/pota/spot', express.json(), async (req, res) => {
  try {
    const { activator, spotter, frequency, reference, mode, comments } = req.body;

    // Validate required fields
    if (!activator || !/^[A-Z0-9]{3,10}$/i.test(activator)) {
      return res.status(400).json({ error: 'Invalid activator callsign' });
    }
    if (!spotter || !/^[A-Z0-9]{3,10}$/i.test(spotter)) {
      return res.status(400).json({ error: 'Invalid spotter callsign' });
    }
    if (!reference || !/^[A-Z0-9]+-\d{4,}$/i.test(reference)) {
      return res.status(400).json({ error: 'Invalid park reference' });
    }
    if (!frequency || isNaN(parseFloat(frequency))) {
      return res.status(400).json({ error: 'Invalid frequency' });
    }

    const spotData = {
      activator: activator.toUpperCase(),
      spotter: spotter.toUpperCase(),
      frequency: String(frequency),
      reference: reference.toUpperCase(),
      mode: (mode || '').toUpperCase(),
      comments: (comments || '').slice(0, 60),
      source: 'HamTab',
    };

    const resp = await secureFetch('https://api.pota.app/spot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(spotData),
    });

    if (resp.ok) {
      res.json({ success: true });
    } else {
      const text = await resp.text().catch(() => '');
      console.error('[POTA spot] Upstream error:', resp.status, text);
      res.status(resp.status).json({ error: `POTA API returned ${resp.status}` });
    }
  } catch (err) {
    console.error('[POTA spot] Error:', err.message);
    res.status(502).json({ error: 'Failed to submit spot' });
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
    let lat = null, lon = null;

    if (isUSCallsign(key)) {
      // US calls — callook.info (FCC database, richest data)
      const data = await fetchJSON(`https://callook.info/${encodeURIComponent(key)}/json`);
      if (data.status === 'VALID' && data.location) {
        lat = parseFloat(data.location.latitude) || null;
        lon = parseFloat(data.location.longitude) || null;
      }
    } else {
      // Non-US calls — HamQTH global database
      const data = await lookupHamqth(key);
      if (data && data.lat != null && data.lon != null) {
        lat = data.lat;
        lon = data.lon;
      }
    }

    if (lat !== null && lon !== null) {
      const entry = { lat, lon, expires: Date.now() + DXC_CALL_TTL_OK };
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

// --- PSKReporter outbound request governor ---
// Prevents rate-limit blocks when many users share the same container IP.
// - Split token buckets: separate limits for global feed vs per-callsign heard queries
// - Circuit breaker: stops upstream calls after consecutive failures, auto-recovers
// - Request coalescing: duplicate in-flight callsign queries share one upstream call
// - Stale-while-revalidate: return last known good data when upstream fails

// --- Per-endpoint token buckets ---
// Split budget so heard queries (many callsigns) don't starve the global feed
function createTokenBucket(limit, windowMs) {
  return { limit, windowMs, tokens: limit, resetAt: Date.now() + windowMs };
}

const pskGlobalBucket  = createTokenBucket(4, 60 * 1000);  // /api/spots/psk — 4 req/60s
const pskHeardBucket   = createTokenBucket(6, 60 * 1000);  // /api/spots/psk/heard — 6 req/60s

function pskAcquireToken(bucket) {
  const now = Date.now();
  if (now >= bucket.resetAt) {
    bucket.tokens = bucket.limit;
    bucket.resetAt = now + bucket.windowMs;
  }
  if (bucket.tokens > 0) {
    bucket.tokens--;
    return true;
  }
  return false;
}

// --- Circuit breaker ---
// Opens after consecutive upstream failures, serves stale data during cooldown
const PSK_CB_THRESHOLD = 3;          // consecutive failures before opening
const PSK_CB_COOLDOWN  = 60 * 1000;  // 60s — half-open attempt interval
const pskCircuitBreaker = {
  failures: 0,
  state: 'closed',       // closed | open | half-open
  openedAt: 0,
};

function pskCbAllowRequest() {
  if (pskCircuitBreaker.state === 'closed') return true;
  if (pskCircuitBreaker.state === 'open') {
    // Check if cooldown elapsed → transition to half-open
    if (Date.now() - pskCircuitBreaker.openedAt >= PSK_CB_COOLDOWN) {
      pskCircuitBreaker.state = 'half-open';
      return true; // allow one probe request
    }
    return false;
  }
  // half-open — allow (one probe already in flight)
  return true;
}

function pskCbRecordSuccess() {
  pskCircuitBreaker.failures = 0;
  pskCircuitBreaker.state = 'closed';
}

function pskCbRecordFailure() {
  pskCircuitBreaker.failures++;
  if (pskCircuitBreaker.failures >= PSK_CB_THRESHOLD) {
    pskCircuitBreaker.state = 'open';
    pskCircuitBreaker.openedAt = Date.now();
    console.warn(`[PSK] Circuit breaker OPEN after ${pskCircuitBreaker.failures} consecutive failures — serving stale data for ${PSK_CB_COOLDOWN / 1000}s`);
  }
}

// Build response metadata for stale/breaker status
function pskMeta(cache) {
  if (!cache?.data) return undefined;
  const ageMs = Date.now() - (cache.expires - PSK_CACHE_TTL);
  const stale = Date.now() >= cache.expires;
  if (!stale && pskCircuitBreaker.state === 'closed') return undefined;
  return { stale, ageSeconds: Math.round(ageMs / 1000), circuitBreaker: pskCircuitBreaker.state };
}

// In-flight request dedup — keyed by full URL
const pskInflight = new Map(); // url → Promise<string>

async function pskFetchDedup(url) {
  if (pskInflight.has(url)) return pskInflight.get(url);
  const promise = fetchText(url).finally(() => pskInflight.delete(url));
  pskInflight.set(url, promise);
  return promise;
}

// App contact string — PSKReporter requires this for identification
const PSK_APP_CONTACT = 'appcontact=admin@hamtab.net';

// --- PSKReporter MQTT real-time feed ---
// Connects to mqtt.pskreporter.info (community service by M0LTE) for real-time spots.
// Bypasses HTTP retrieval API entirely — no Cloudflare IP blocking issues.
// Falls back to HTTP retrieval if MQTT is unavailable.

const MQTT_BROKER = 'mqtt://mqtt.pskreporter.info:1883';
const MQTT_SPOT_TTL = 60 * 60 * 1000; // 1 hour — matches HTTP query window
const MQTT_RECONNECT_MS = 30 * 1000;  // 30s reconnect delay
const MQTT_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 min — purge expired spots

// Per-callsign MQTT spot accumulators
// { 'CALLSIGN': { spots: Map<key, spot>, subscribed: true, lastAccess: ts } }
const mqttCallsigns = {};

let mqttClient = null;
let mqttConnected = false;

// Subscribe to spots where callsign is the SENDER (others hearing you)
function mqttSubscribeCallsign(callsign) {
  const upper = callsign.toUpperCase();
  if (mqttCallsigns[upper]?.subscribed) {
    mqttCallsigns[upper].lastAccess = Date.now();
    return;
  }
  mqttCallsigns[upper] = {
    spots: new Map(),
    subscribed: false,
    lastAccess: Date.now(),
  };
  if (mqttClient && mqttConnected) {
    const topic = `pskr/filter/v2/+/+/${upper}/#`;
    mqttClient.subscribe(topic, { qos: 0 }, (err) => {
      if (!err) {
        mqttCallsigns[upper].subscribed = true;
        console.log(`[MQTT] Subscribed: ${topic}`);
      } else {
        console.error(`[MQTT] Subscribe error for ${upper}:`, err.message);
      }
    });
  }
}

// Unsubscribe callsigns not accessed in 30 minutes (cleanup stale subscriptions)
function mqttCleanupSubscriptions() {
  const staleThreshold = 30 * 60 * 1000;
  const now = Date.now();
  for (const [call, entry] of Object.entries(mqttCallsigns)) {
    if (now - entry.lastAccess > staleThreshold) {
      if (mqttClient && mqttConnected && entry.subscribed) {
        mqttClient.unsubscribe(`pskr/filter/v2/+/+/${call}/#`);
      }
      delete mqttCallsigns[call];
      console.log(`[MQTT] Unsubscribed stale callsign: ${call}`);
    }
  }
}

// Purge spots older than TTL from all accumulators
function mqttPurgeExpiredSpots() {
  const cutoff = Date.now() - MQTT_SPOT_TTL;
  for (const entry of Object.values(mqttCallsigns)) {
    for (const [key, spot] of entry.spots) {
      if (spot._receivedAt < cutoff) entry.spots.delete(key);
    }
  }
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

// Convert MQTT JSON message to our internal spot format
function mqttMessageToSpot(msg) {
  const freqHz = msg.f || 0;
  const freqMHz = (freqHz / 1000000).toFixed(3);
  const spotTime = msg.t ? new Date(msg.t * 1000).toISOString() : new Date().toISOString();

  const senderCoords = gridToLatLon(msg.sl || '');
  const receiverCoords = gridToLatLon(msg.rl || '');

  const snrVal = typeof msg.rp === 'number' ? msg.rp : parseInt(msg.rp, 10);
  const snrStr = isNaN(snrVal) ? '' : `${snrVal > 0 ? '+' : ''}${snrVal}`;

  let distanceKm = null;
  if (senderCoords && receiverCoords) {
    distanceKm = Math.round(haversineKm(
      senderCoords.lat, senderCoords.lon,
      receiverCoords.lat, receiverCoords.lon
    ));
  }

  const band = msg.b || freqToBandStr(freqMHz);

  return {
    callsign: msg.sc || '',
    frequency: freqMHz,
    mode: msg.md || '',
    receiver: msg.rc || '',
    receiverLocator: msg.rl || '',
    receiverLat: receiverCoords?.lat || null,
    receiverLon: receiverCoords?.lon || null,
    senderLocator: msg.sl || '',
    senderLat: senderCoords?.lat || null,
    senderLon: senderCoords?.lon || null,
    latitude: senderCoords?.lat || null,
    longitude: senderCoords?.lon || null,
    snr: snrStr,
    band,
    spotTime,
    distanceKm,
    reporter: msg.rc || '',
    reporterLocator: msg.rl || '',
    reporterLat: receiverCoords?.lat || null,
    reporterLon: receiverCoords?.lon || null,
    name: `Heard by ${msg.rc || 'unknown'}`,
    comments: snrStr ? `SNR: ${snrStr} dB` : '',
    _receivedAt: Date.now(), // internal timestamp for TTL eviction
  };
}

// Build "heard" response from accumulated MQTT spots (same shape as HTTP endpoint)
function mqttBuildHeardResponse(callsign) {
  const entry = mqttCallsigns[callsign];
  if (!entry) return { spots: [], summary: {} };

  const validSpots = [];
  for (const spot of entry.spots.values()) {
    if (spot.receiverLat !== null && spot.receiverLon !== null) {
      validSpots.push(spot);
    }
  }

  // Sort newest first
  validSpots.sort((a, b) => new Date(b.spotTime) - new Date(a.spotTime));

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

  return { spots: validSpots, summary, source: 'mqtt' };
}

// Initialize MQTT connection
function initMqttClient() {
  console.log('[MQTT] Connecting to mqtt.pskreporter.info...');
  mqttClient = mqtt.connect(MQTT_BROKER, {
    reconnectPeriod: MQTT_RECONNECT_MS,
    connectTimeout: 10 * 1000, // 10s connect timeout
    clientId: `hamtab_${Date.now().toString(36)}`,
    clean: true,
  });

  mqttClient.on('connect', () => {
    mqttConnected = true;
    console.log('[MQTT] Connected to mqtt.pskreporter.info');

    // Re-subscribe all active callsigns on reconnect
    for (const [call, entry] of Object.entries(mqttCallsigns)) {
      const topic = `pskr/filter/v2/+/+/${call}/#`;
      mqttClient.subscribe(topic, { qos: 0 }, (err) => {
        if (!err) {
          entry.subscribed = true;
        }
      });
    }

    // Note: global feed (pskr/filter/v2/#) is NOT subscribed — too much data.
    // /api/spots/psk uses HTTP fallback. MQTT is for per-callsign Live Spots only.
  });

  mqttClient.on('message', (topic, payload) => {
    try {
      const msg = JSON.parse(payload.toString());
      const spot = mqttMessageToSpot(msg);

      // Dedupe key: sender-receiver-band-timestamp
      const key = `${spot.callsign}-${spot.receiver}-${spot.band}-${spot.spotTime}`;

      // Route to per-callsign accumulator if subscribed
      const senderUpper = (spot.callsign || '').toUpperCase();
      if (mqttCallsigns[senderUpper]) {
        mqttCallsigns[senderUpper].spots.set(key, spot);
        // Cap at 500 spots per callsign
        if (mqttCallsigns[senderUpper].spots.size > 500) {
          const oldest = mqttCallsigns[senderUpper].spots.keys().next().value;
          mqttCallsigns[senderUpper].spots.delete(oldest);
        }
      }

    } catch {
      // Silently skip malformed messages
    }
  });

  mqttClient.on('error', (err) => {
    console.error('[MQTT] Error:', err.message);
  });

  mqttClient.on('close', () => {
    mqttConnected = false;
    // Mark all subscriptions as needing re-subscribe
    for (const entry of Object.values(mqttCallsigns)) {
      entry.subscribed = false;
    }
  });

  mqttClient.on('offline', () => {
    mqttConnected = false;
  });

  // Periodic cleanup
  setInterval(() => {
    mqttPurgeExpiredSpots();
    mqttCleanupSubscriptions();
  }, MQTT_CLEANUP_INTERVAL);
}

// Start MQTT on module load
initMqttClient();

// --- DX Cluster TCP Telnet + RBN Live Feeds ---
// Lazy TCP connections to DX Cluster and Reverse Beacon Network.
// Connected when first SSE client subscribes, disconnected after idle timeout.
// Uses node:net (no new dependencies). Skipped in hostedmode (no long-lived TCP).

const DXC_TCP_HOST = process.env.DXC_TCP_HOST || 'dxc.ai8w.net';
const DXC_TCP_PORT = parseInt(process.env.DXC_TCP_PORT, 10) || 7300;
const RBN_TCP_HOST = 'telnet.reversebeacon.net';
const RBN_TCP_PORT = 7000;
const DXC_TCP_RING_SIZE = 500;  // max spots in ring buffer per source
const DXC_TCP_SPOT_TTL = 60 * 60 * 1000; // 1 hour
const DXC_TCP_RECONNECT_MS = 30 * 1000;  // 30s backoff
const DXC_TCP_IDLE_MS = 5 * 60 * 1000;   // 5 min idle disconnect
const DXC_TCP_HEARTBEAT_MS = 30 * 1000;  // 30s SSE heartbeat

// Shared state for each TCP source
function createTcpSource() {
  return {
    socket: null,
    connected: false,
    ring: [],           // ring buffer of parsed spots
    sseClients: new Set(),
    reconnectTimer: null,
    idleTimer: null,
    lineBuffer: '',     // partial-line accumulator
    loginSent: false,
  };
}

const dxcTcp = createTcpSource();
const rbnTcp = createTcpSource();

// --- DXC Spot Parser ---
// Format: "DX de <spotter>:     <freq_khz>  <dx_call>       <comment>           <time>Z"
// Example: "DX de W3LPL:     14025.0  JA1ABC       CW 10 dB 25 WPM             1423Z"
const DXC_SPOT_RE = /^DX\s+de\s+(\S+):\s+([\d.]+)\s+(\S+)\s+(.*?)\s+(\d{4})Z\s*$/;

function parseDxcSpot(line) {
  const m = line.match(DXC_SPOT_RE);
  if (!m) return null;
  const [, spotter, freqKhz, dxCall, comment, timeZ] = m;
  const freqMHz = (parseFloat(freqKhz) / 1000).toFixed(3);
  const now = new Date();
  const hh = timeZ.substring(0, 2);
  const mm = timeZ.substring(2, 4);
  const spotTime = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(),
    parseInt(hh, 10), parseInt(mm, 10))).toISOString();

  return {
    callsign: dxCall.trim(),
    frequency: freqMHz,
    mode: extractModeFromComment(comment),
    spotter: spotter.replace(/:$/, ''),
    band: freqToBandStr(parseFloat(freqMHz)),
    spotTime,
    comments: comment.trim(),
    source: 'dxc-tcp',
    latitude: null,
    longitude: null,
  };
}

// --- RBN Spot Parser ---
// Same DX-spot format but often includes dB, WPM, and type in comment
// Example: "DX de KM3T-2-#:  14040.1  UA3AKO      CW    18 dB  25 WPM  CQ      1423Z"
const RBN_DB_RE = /(\d+)\s*dB/i;
const RBN_WPM_RE = /(\d+)\s*WPM/i;
const RBN_TYPE_RE = /\b(CQ|BEACON|NCDXF|DX)\b/i;

function parseRbnSpot(line) {
  const base = parseDxcSpot(line);
  if (!base) return null;
  base.source = 'rbn';

  // Extract RBN-specific fields from comment
  const dbMatch = base.comments.match(RBN_DB_RE);
  const wpmMatch = base.comments.match(RBN_WPM_RE);
  const typeMatch = base.comments.match(RBN_TYPE_RE);

  base.db = dbMatch ? parseInt(dbMatch[1], 10) : null;
  base.wpm = wpmMatch ? parseInt(wpmMatch[1], 10) : null;
  base.spotType = typeMatch ? typeMatch[1].toUpperCase() : '';
  base.skimmer = base.spotter; // RBN spotters are CW Skimmer stations

  return base;
}

// --- Ring Buffer Management ---

function ringPush(source, spot) {
  spot._ts = Date.now();
  source.ring.push(spot);
  // Enforce size limit
  if (source.ring.length > DXC_TCP_RING_SIZE) {
    source.ring.shift();
  }
  // Purge expired spots
  const cutoff = Date.now() - DXC_TCP_SPOT_TTL;
  while (source.ring.length > 0 && source.ring[0]._ts < cutoff) {
    source.ring.shift();
  }
}

// --- TCP Connection Manager ---

function connectTcpSource(source, host, port, callsign, parseFn) {
  if (process.env.HOSTED_MODE === '1') return; // no TCP in hostedmode
  if (source.socket) return; // already connected or connecting
  if (source.reconnectTimer) { clearTimeout(source.reconnectTimer); source.reconnectTimer = null; }

  const loginCall = callsign || process.env.DXC_CALLSIGN || process.env.HAMTAB_CALLSIGN || 'HAMTAB';
  console.log(`[TCP] Connecting to ${host}:${port} as ${loginCall}`);

  const sock = net.createConnection({ host, port, timeout: 15000 });
  source.socket = sock;
  source.loginSent = false;
  source.lineBuffer = '';

  sock.setEncoding('utf8');

  sock.on('connect', () => {
    source.connected = true;
    console.log(`[TCP] Connected to ${host}:${port}`);
    broadcastSseStatus(source, { connected: true, host });
  });

  sock.on('data', (chunk) => {
    source.lineBuffer += chunk;
    const lines = source.lineBuffer.split('\n');
    source.lineBuffer = lines.pop(); // keep incomplete last line

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r/g, '').trim();
      if (!line) continue;

      // Login prompt detection — send callsign once
      if (!source.loginSent && (line.includes('login:') || line.includes('call:') || line.includes('Please enter your call'))) {
        sock.write(loginCall + '\r\n');
        source.loginSent = true;
        continue;
      }

      // Parse spot
      const spot = parseFn(line);
      if (spot) {
        ringPush(source, spot);
        broadcastSseSpot(source, spot);
      }
    }
  });

  sock.on('timeout', () => {
    console.warn(`[TCP] Connection to ${host}:${port} timed out`);
    sock.destroy();
  });

  sock.on('error', (err) => {
    console.error(`[TCP] Error on ${host}:${port}:`, err.message);
  });

  sock.on('close', () => {
    source.connected = false;
    source.socket = null;
    source.loginSent = false;
    source.lineBuffer = '';
    console.log(`[TCP] Disconnected from ${host}:${port}`);
    broadcastSseStatus(source, { connected: false, host });

    // Reconnect if there are still SSE clients
    if (source.sseClients.size > 0) {
      source.reconnectTimer = setTimeout(() => {
        connectTcpSource(source, host, port, callsign, parseFn);
      }, DXC_TCP_RECONNECT_MS);
    }
  });

  // Reset idle timer
  resetIdleTimer(source, host, port);
}

function disconnectTcpSource(source) {
  if (source.reconnectTimer) { clearTimeout(source.reconnectTimer); source.reconnectTimer = null; }
  if (source.idleTimer) { clearTimeout(source.idleTimer); source.idleTimer = null; }
  if (source.socket) {
    source.socket.destroy();
    source.socket = null;
  }
  source.connected = false;
  source.loginSent = false;
  source.lineBuffer = '';
}

function resetIdleTimer(source, host, port) {
  if (source.idleTimer) clearTimeout(source.idleTimer);
  source.idleTimer = setTimeout(() => {
    if (source.sseClients.size === 0) {
      console.log(`[TCP] Idle timeout — disconnecting from ${host}:${port}`);
      disconnectTcpSource(source);
    }
  }, DXC_TCP_IDLE_MS);
}

// --- SSE Broadcasting ---

function broadcastSseSpot(source, spot) {
  const data = JSON.stringify(spot);
  for (const res of source.sseClients) {
    res.write(`data: ${data}\n\n`);
  }
}

function broadcastSseStatus(source, status) {
  const data = JSON.stringify(status);
  for (const res of source.sseClients) {
    res.write(`event: status\ndata: ${data}\n\n`);
  }
}

function addSseClient(source, res, host, port, callsign, parseFn) {
  // SSE headers
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // nginx proxy compat
  });

  // Send current ring buffer as init event
  const initData = JSON.stringify(source.ring.map(s => { const { _ts, ...rest } = s; return rest; }));
  res.write(`event: init\ndata: ${initData}\n\n`);

  // Send current connection status
  res.write(`event: status\ndata: ${JSON.stringify({ connected: source.connected, host })}\n\n`);

  source.sseClients.add(res);

  // Heartbeat to keep connection alive
  const heartbeat = setInterval(() => {
    res.write(`event: heartbeat\ndata: \n\n`);
  }, DXC_TCP_HEARTBEAT_MS);

  // Start TCP connection if not already connected
  if (!source.socket) {
    connectTcpSource(source, host, port, callsign, parseFn);
  }

  // Cleanup on client disconnect
  res.on('close', () => {
    source.sseClients.delete(res);
    clearInterval(heartbeat);
    // Start idle timer if no clients remain
    if (source.sseClients.size === 0) {
      resetIdleTimer(source, host, port);
    }
  });
}

// --- SSE Endpoints ---

if (process.env.HOSTED_MODE !== '1') {
  // DXC live TCP stream
  router.get('/spots/dxc/stream', (req, res) => {
    const callsign = (req.query.callsign || '').replace(/[^A-Z0-9/]/gi, '').substring(0, 10);
    addSseClient(dxcTcp, res, DXC_TCP_HOST, DXC_TCP_PORT, callsign, parseDxcSpot);
  });

  // RBN live TCP stream
  router.get('/spots/rbn/stream', (req, res) => {
    const callsign = (req.query.callsign || '').replace(/[^A-Z0-9/]/gi, '').substring(0, 10);
    addSseClient(rbnTcp, res, RBN_TCP_HOST, RBN_TCP_PORT, callsign, parseRbnSpot);
  });

  // RBN HTTP snapshot (polling fallback)
  router.get('/spots/rbn', (req, res) => {
    res.json(rbnTcp.ring.map(s => { const { _ts, ...rest } = s; return rest; }));
  });
}

// Proxy HamQTH DX Cluster spots
router.get('/spots/dxc', async (req, res) => {
  try {
    // Return cached data if fresh
    if (dxcCache.data && Date.now() < dxcCache.expires) {
      setFreshnessHeaders(res, { fetchedAt: dxcCache.fetchedAt, expires: dxcCache.expires, cacheHit: true });
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
    const now = Date.now();
    dxcCache = { data: spots, fetchedAt: now, expires: now + DXC_CACHE_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: dxcCache.expires, cacheHit: false });
    res.json(spots);
  } catch (err) {
    console.error('Error fetching DXC spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch DX Cluster spots' });
  }
});

// Proxy PSKReporter API
router.get('/spots/psk', async (req, res) => {
  try {
    // Return cached data if fresh
    if (pskCache.data && Date.now() < pskCache.expires) {
      setFreshnessHeaders(res, { fetchedAt: pskCache.fetchedAt, expires: pskCache.expires, cacheHit: true });
      return res.json(pskCache.data);
    }

    // Circuit breaker check — serve stale if breaker is open
    // Global PSK returns a plain array (consumed by source tab), so no _meta wrapper
    if (!pskCbAllowRequest()) {
      if (pskCache.data) {
        setFreshnessHeaders(res, { fetchedAt: pskCache.fetchedAt, expires: pskCache.expires, cacheHit: true });
        return res.json(pskCache.data);
      }
      return res.status(503).json({ error: 'PSKReporter circuit breaker open — try again shortly' });
    }

    // Rate limit check — serve stale data if throttled
    if (!pskAcquireToken(pskGlobalBucket)) {
      if (pskCache.data) {
        setFreshnessHeaders(res, { fetchedAt: pskCache.fetchedAt, expires: pskCache.expires, cacheHit: true });
        return res.json(pskCache.data);
      }
      return res.status(429).json({ error: 'PSKReporter rate limit — try again shortly' });
    }

    // Build query params
    const params = new URLSearchParams({
      flowStartSeconds: '-3600',  // Last hour
      rrlimit: '500',             // Max 500 reports
      rronly: '1',                // Reception reports only
      nolocator: '0',             // Include grid squares
    });

    const url = `https://retrieve.pskreporter.info/query?${params}&${PSK_APP_CONTACT}`;
    const xml = await pskFetchDedup(url);

    pskCbRecordSuccess(); // upstream responded

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });
    const doc = parser.parse(xml);

    // Extract reception reports array
    const reports = doc.receptionReports?.receptionReport;
    if (!reports) {
      const now = Date.now();
      pskCache = { data: [], fetchedAt: now, expires: now + PSK_CACHE_TTL };
      setFreshnessHeaders(res, { fetchedAt: now, expires: pskCache.expires, cacheHit: false });
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

    const now = Date.now();
    pskCache = { data: validSpots, fetchedAt: now, expires: now + PSK_CACHE_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: pskCache.expires, cacheHit: false });
    res.json(validSpots);
  } catch (err) {
    console.error('Error fetching PSKReporter spots:', err.message);
    pskCbRecordFailure(); // track consecutive failures
    // Stale-while-revalidate — serve old data if available
    if (pskCache.data) {
      setFreshnessHeaders(res, { fetchedAt: pskCache.fetchedAt, expires: pskCache.expires, cacheHit: true });
      return res.json(pskCache.data);
    }
    res.status(502).json({ error: 'PSKReporter is unavailable — try again shortly' });
  }
});

// --- Live Spots (PSKReporter "heard" query) ---

// Per-callsign cache for Live Spots
const pskHeardCache = {}; // { 'CALLSIGN': { data, expires }, ... }
const PSK_HEARD_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Live Spots: Query PSKReporter for spots where YOUR signal was received
router.get('/spots/psk/heard', async (req, res) => {
  const callsign = (req.query.callsign || '').toUpperCase().trim();
  try {

    // Validate callsign format
    if (!callsign || !/^[A-Z0-9]{3,10}$/i.test(callsign)) {
      return res.status(400).json({ error: 'Provide a valid callsign' });
    }

    // Ensure MQTT subscription for this callsign (idempotent)
    mqttSubscribeCallsign(callsign);

    // Prefer MQTT data if connected and has spots for this callsign
    if (mqttConnected && mqttCallsigns[callsign]?.spots.size > 0) {
      const result = mqttBuildHeardResponse(callsign);
      // Also update the HTTP cache so stale fallback has fresh data
      const now = Date.now();
      pskHeardCache[callsign] = { data: result, fetchedAt: now, expires: now + PSK_HEARD_CACHE_TTL };
      setFreshnessHeaders(res, { fetchedAt: now, expires: pskHeardCache[callsign].expires, cacheHit: false });
      return res.json(result);
    }

    // Check cache
    const cached = pskHeardCache[callsign];
    if (cached && Date.now() < cached.expires) {
      setFreshnessHeaders(res, { fetchedAt: cached.fetchedAt, expires: cached.expires, cacheHit: true });
      return res.json(cached.data);
    }

    // Circuit breaker check — serve stale if breaker is open
    if (!pskCbAllowRequest()) {
      const meta = pskMeta(cached);
      if (cached?.data) {
        setFreshnessHeaders(res, { fetchedAt: cached.fetchedAt, expires: cached.expires, cacheHit: true });
        return res.json({ ...cached.data, _meta: meta });
      }
      return res.status(503).json({ error: 'PSKReporter circuit breaker open — try again shortly' });
    }

    // Rate limit check — serve stale data if throttled
    if (!pskAcquireToken(pskHeardBucket)) {
      if (cached?.data) {
        setFreshnessHeaders(res, { fetchedAt: cached.fetchedAt, expires: cached.expires, cacheHit: true });
        return res.json(cached.data);
      }
      return res.status(429).json({ error: 'PSKReporter rate limit — try again shortly' });
    }

    // Build query params for PSKReporter
    const params = new URLSearchParams({
      senderCallsign: callsign,
      flowStartSeconds: '-3600', // Last hour
      rrlimit: '500',
      rronly: '1',
      nolocator: '0',
    });

    const url = `https://retrieve.pskreporter.info/query?${params}&${PSK_APP_CONTACT}`;
    const xml = await pskFetchDedup(url);

    pskCbRecordSuccess(); // upstream responded

    // Parse XML
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: '',
    });
    const doc = parser.parse(xml);

    const reports = doc.receptionReports?.receptionReport;
    if (!reports) {
      const result = { spots: [], summary: {} };
      const now = Date.now();
      pskHeardCache[callsign] = { data: result, fetchedAt: now, expires: now + PSK_HEARD_CACHE_TTL };
      setFreshnessHeaders(res, { fetchedAt: now, expires: pskHeardCache[callsign].expires, cacheHit: false });
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
    const now = Date.now();
    pskHeardCache[callsign] = { data: result, fetchedAt: now, expires: now + PSK_HEARD_CACHE_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: pskHeardCache[callsign].expires, cacheHit: false });
    res.json(result);
  } catch (err) {
    console.error('Error fetching PSKReporter heard spots:', err.message);
    pskCbRecordFailure(); // track consecutive failures
    // Stale-while-revalidate — serve old data if available
    const stale = pskHeardCache[callsign];
    if (stale?.data) {
      setFreshnessHeaders(res, { fetchedAt: stale.fetchedAt, expires: stale.expires, cacheHit: true });
      return res.json(stale.data);
    }
    res.status(502).json({ error: 'PSKReporter is unavailable — try again shortly' });
  }
});

// --- Internal PSKReporter XML parse endpoints (hostedmode Worker edge-fetch) ---
// The Worker fetches PSKReporter from edge IPs (avoids container IP blocking),
// then POSTs the raw XML here for parsing. Not called in lanmode.

// Shared parser: PSKReporter XML → spot array
function parsePskSpots(xml) {
  const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' });
  const doc = parser.parse(xml);
  const reports = doc.receptionReports?.receptionReport;
  if (!reports) return [];
  return Array.isArray(reports) ? reports : [reports];
}

// Shared transformer: raw report → API spot format (for /api/spots/psk)
function transformPskSpot(r) {
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
}

// Shared transformer: raw report → heard spot format (for /api/spots/psk/heard)
function transformPskHeardSpot(r) {
  const freqHz = parseInt(r.frequency, 10) || 0;
  const freqMHz = (freqHz / 1000000).toFixed(3);
  const flowStartSec = parseInt(r.flowStartSeconds, 10) || 0;
  const spotTime = new Date(flowStartSec * 1000).toISOString();
  const senderCoords = gridToLatLon(r.senderLocator || '');
  const receiverCoords = gridToLatLon(r.receiverLocator || '');
  const snrVal = parseInt(r.sNR, 10);
  const snrStr = isNaN(snrVal) ? '' : `${snrVal > 0 ? '+' : ''}${snrVal}`;
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
}

// Internal: parse PSK spots XML (Worker edge-fetch → container parse)
router.post('/internal/psk-parse', express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  try {
    const reports = parsePskSpots(req.body);
    const spots = reports.map(transformPskSpot);
    const validSpots = spots.filter(s => s.latitude !== null && s.longitude !== null);
    const now = Date.now();
    pskCache = { data: validSpots, fetchedAt: now, expires: now + PSK_CACHE_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: pskCache.expires, cacheHit: false });
    res.json(validSpots);
  } catch (err) {
    console.error('[internal/psk-parse] Error:', err.message);
    res.status(500).json({ error: 'XML parse failed' });
  }
});

// Internal: parse PSK heard spots XML (Worker edge-fetch → container parse)
router.post('/internal/psk-heard-parse', express.text({ type: '*/*', limit: '5mb' }), (req, res) => {
  try {
    const callsign = (req.query.callsign || '').toUpperCase().trim();
    const reports = parsePskSpots(req.body);
    const spots = reports.map(transformPskHeardSpot);
    const validSpots = spots.filter(s => s.receiverLat !== null && s.receiverLon !== null);
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
    const now = Date.now();
    if (callsign) pskHeardCache[callsign] = { data: result, fetchedAt: now, expires: now + PSK_HEARD_CACHE_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: now + PSK_HEARD_CACHE_TTL, cacheHit: false });
    res.json(result);
  } catch (err) {
    console.error('[internal/psk-heard-parse] Error:', err.message);
    res.status(500).json({ error: 'XML parse failed' });
  }
});

// --- WSPR Spots (wspr.live ClickHouse) ---
let wsprCache = { data: null, expires: 0 };
const WSPR_CACHE_TTL = 5 * 60 * 1000; // 5 min — WSPR 2-min cycle; 20 req/min API limit

router.get('/spots/wspr', async (req, res) => {
  try {
    if (wsprCache.data && Date.now() < wsprCache.expires) {
      setFreshnessHeaders(res, { fetchedAt: wsprCache.fetchedAt, expires: wsprCache.expires, cacheHit: true });
      return res.json(wsprCache.data);
    }

    const sql = `SELECT time, tx_sign, rx_sign, frequency, snr, power,
                        distance, drift, tx_lat, tx_lon, rx_lat, rx_lon, tx_loc, rx_loc
                 FROM wspr.rx
                 WHERE time > now() - INTERVAL 30 MINUTE
                 ORDER BY time DESC
                 LIMIT 1000
                 FORMAT JSON`;
    const url = `https://db1.wspr.live/?query=${encodeURIComponent(sql)}`;
    const json = await fetchJSON(url);
    const rows = json.data || [];

    const spots = rows.map(r => {
      const freqMHz = (parseInt(r.frequency, 10) / 1e6).toFixed(4);
      const snrVal = parseInt(r.snr, 10);
      const snrStr = isNaN(snrVal) ? '' : `${snrVal > 0 ? '+' : ''}${snrVal}`;
      return {
        callsign: r.tx_sign || '',
        rxSign: r.rx_sign || '',
        frequency: freqMHz,
        band: freqToBandStr(parseFloat(freqMHz)),
        mode: 'WSPR',
        snr: snrStr,
        power: `${r.power} dBm`,
        distance: r.distance ? `${r.distance}` : '',
        drift: r.drift,
        latitude: parseFloat(r.tx_lat) || null,
        longitude: parseFloat(r.tx_lon) || null,
        rxLat: parseFloat(r.rx_lat) || null,
        rxLon: parseFloat(r.rx_lon) || null,
        name: `RX: ${r.rx_sign || '?'}`,
        comments: `SNR: ${snrStr || '?'} dB · Power: ${r.power} dBm · Dist: ${r.distance || '?'} km`,
        spotTime: r.time || '',
        reference: '',
      };
    });

    // Filter out spots with no valid transmitter coordinates
    const validSpots = spots.filter(s => s.latitude !== null && s.longitude !== null);

    const now = Date.now();
    wsprCache = { data: validSpots, fetchedAt: now, expires: now + WSPR_CACHE_TTL };
    setFreshnessHeaders(res, { fetchedAt: now, expires: wsprCache.expires, cacheHit: false });
    res.json(validSpots);
  } catch (err) {
    console.error('Error fetching WSPR spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch WSPR spots' });
  }
});

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

// Proxy SOTA spots API
router.get('/spots/sota', async (req, res) => {
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

// --- WWFF (World Wide Flora & Fauna) Spots API ---

router.get('/spots/wwff', async (req, res) => {
  try {
    const data = await fetchJSON('https://spots.wwff.co/static/spots.json');
    const spots = (Array.isArray(data) ? data : []).map(s => ({
      callsign:   s.activator || '',
      frequency:  s.frequency_khz ? String(s.frequency_khz / 1000) : '', // kHz → MHz
      mode:       s.mode || '',
      reference:  s.reference || '',
      name:       s.reference_name || '',
      spotTime:   s.spot_time ? new Date(s.spot_time * 1000).toISOString() : '', // Unix → ISO
      comments:   s.remarks || '',
      latitude:   s.latitude ?? null,
      longitude:  s.longitude ?? null,
    }));
    res.json(spots);
  } catch (err) {
    console.error('Error fetching WWFF spots:', err.message);
    res.status(502).json({ error: 'Failed to fetch WWFF spots' });
  }
});

// --- Cache eviction (register spot caches with the shared eviction service) ---
registerCache(dxcCallCache);
registerCache(pskHeardCache);
registerCache(sotaSummitCache);

module.exports = router;
