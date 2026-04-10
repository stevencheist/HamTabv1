// --- Callsign lookup router ---
// US calls via callook.info (FCC), non-US via HamQTH (global).
// Extracted from server.js.

const express = require('express');
const { secureFetch, fetchJSON, fetchText } = require('../services/http-fetch');

const router = express.Router();

// --- Grid square to lat/lon conversion ---

function gridToLatLon(grid) {
  if (!grid || grid.length < 4) return null;
  const A = 'A'.charCodeAt(0);
  const ZERO = '0'.charCodeAt(0);
  // Field (AA): 20° longitude, 10° latitude per field
  const lon = (grid.charCodeAt(0) - A) * 20 + (grid.charCodeAt(2) - ZERO) * 2 + 1 - 180;
  const lat = (grid.charCodeAt(1) - A) * 10 + (grid.charCodeAt(3) - ZERO) + 0.5 - 90;
  return { lat, lon };
}

// --- US callsign prefix detection ---

function isUSCallsign(call) {
  if (!call) return false;
  return /^([KNW][A-Z]?\d|A[A-L]\d)/i.test(call);
}

// --- HamQTH Callsign Lookup (global, non-US) ---

// HamQTH session cache — XML API uses session-based auth with ~1h TTL
let hamqthSession = { id: null, expires: 0 };

async function getHamqthSessionId() {
  const user = process.env.HAMQTH_USER;
  const pass = process.env.HAMQTH_PASS;
  if (!user || !pass) return null;

  // Return cached session if still valid
  if (hamqthSession.id && Date.now() < hamqthSession.expires) {
    return hamqthSession.id;
  }

  try {
    const url = `https://www.hamqth.com/xml.php?u=${encodeURIComponent(user)}&p=${encodeURIComponent(pass)}`;
    const xml = await fetchText(url);
    const match = xml.match(/<session_id>([^<]+)<\/session_id>/);
    if (match) {
      hamqthSession = { id: match[1], expires: Date.now() + 55 * 60 * 1000 }; // 55 min TTL (server expires at 60)
      return match[1];
    }
    console.error('HamQTH auth failed:', xml.substring(0, 200));
    return null;
  } catch (err) {
    console.error('HamQTH session error:', err.message);
    return null;
  }
}

function parseHamqthResponse(xml) {
  // Extract fields from HamQTH XML response via regex
  const field = (name) => {
    const m = xml.match(new RegExp(`<${name}>([^<]*)</${name}>`));
    return m ? m[1].trim() : '';
  };

  const callsign = field('callsign');
  if (!callsign) return null;

  const name = [field('nick'), field('adr_name')].filter(Boolean).join(' ').trim() || callsign;
  const city = field('adr_city');
  const country = field('country');
  const addr2 = [city, country].filter(Boolean).join(', ');
  const grid = field('grid');
  let lat = parseFloat(field('latitude')) || null;
  let lon = parseFloat(field('longitude')) || null;

  // Fallback: derive lat/lon from grid square if HamQTH didn't provide coordinates
  if (lat === null && lon === null && grid) {
    const ll = gridToLatLon(grid);
    if (ll) { lat = ll.lat; lon = ll.lon; }
  }

  return {
    status: 'VALID',
    class: '',
    name,
    addr1: field('adr_street1'),
    addr2,
    grid,
    lat,
    lon,
    country,
    source: 'hamqth',
  };
}

async function lookupHamqth(call, retried) {
  const sid = await getHamqthSessionId();
  if (!sid) return null;

  try {
    const url = `https://www.hamqth.com/xml.php?id=${encodeURIComponent(sid)}&callsign=${encodeURIComponent(call)}&prg=HamTab`;
    const xml = await fetchText(url);

    // Session expired — clear and retry once
    if (!retried && xml.includes('Session does not exist')) {
      hamqthSession = { id: null, expires: 0 };
      return lookupHamqth(call, true);
    }

    // Check for error (not found, etc.)
    if (xml.includes('<error>')) return null;

    return parseHamqthResponse(xml);
  } catch (err) {
    console.error('HamQTH lookup error:', err.message);
    return null;
  }
}

// --- Route ---

router.get('/callsign/:call', async (req, res) => {
  try {
    const rawCall = req.params.call;
    if (!/^[A-Z0-9]{1,10}$/i.test(rawCall)) {
      return res.status(400).json({ error: 'Invalid callsign format' });
    }
    const callUpper = rawCall.toUpperCase();

    if (isUSCallsign(callUpper)) {
      // US calls — callook.info (FCC database)
      const call = encodeURIComponent(callUpper);
      const data = await fetchJSON(`https://callook.info/${call}/json`);
      const addr = data.address || {};
      const loc = data.location || {};
      let lat = loc.latitude ? parseFloat(loc.latitude) : null;
      let lon = loc.longitude ? parseFloat(loc.longitude) : null;

      // Fallback: geocode via Nominatim when callook.info has address but no coordinates
      if (lat === null && lon === null && addr.line2) {
        try {
          const q = encodeURIComponent(addr.line2);
          const geoUrl = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`;
          const geoText = await secureFetch(geoUrl);
          const geoResults = JSON.parse(geoText);
          if (geoResults.length > 0) {
            lat = parseFloat(geoResults[0].lat);
            lon = parseFloat(geoResults[0].lon);
          }
        } catch {
          // Geocode is best-effort — silently fall through with null coordinates
        }
      }

      res.json({
        status: data.status || 'INVALID',
        class: (data.current && data.current.operClass) || '',
        name: (data.name || ''),
        addr1: addr.line1 || '',
        addr2: addr.line2 || '',
        grid: loc.gridsquare || '',
        lat,
        lon,
        country: 'United States',
        source: 'callook',
      });
    } else {
      // Non-US calls — HamQTH global database
      const data = await lookupHamqth(callUpper);
      if (data) {
        res.json(data);
      } else {
        res.json({ status: 'NOT_FOUND', class: '', name: '', addr1: '', addr2: '', grid: '', lat: null, lon: null, country: '', source: 'hamqth' });
      }
    }
  } catch (err) {
    console.error('Error fetching callsign data:', err.message);
    res.status(502).json({ error: 'Failed to fetch callsign data' });
  }
});

module.exports = router;
module.exports.isUSCallsign = isUSCallsign;
module.exports.lookupHamqth = lookupHamqth;
module.exports.gridToLatLon = gridToLatLon;
