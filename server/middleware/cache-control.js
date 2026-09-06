// --- Cache-Control headers ---
// Extracted from server.js — browser + CDN cache hints for globally-shared API data.
// Edge caching (Cloudflare) requires additional Worker-side config (hostedmode only).
// max-age = browser TTL, s-maxage = shared/CDN TTL

const CACHE_RULES = [
  // Tier 1 — globally-shared, slow-changing data
  { prefix: '/api/solar/frames',        cc: 'public, max-age=300, s-maxage=3600' },    // SDO hourly; browser 5m, edge 1h
  { prefix: '/api/solar',               cc: 'public, max-age=300, s-maxage=3600' },    // upstream ~hourly; browser 5m, edge 1h
  { prefix: '/api/spacewx/history',     cc: 'public, max-age=300, s-maxage=900' },     // upstream 15m; browser 5m, edge 15m
  { prefix: '/api/satellites/positions', cc: 'public, max-age=5, s-maxage=15' },       // real-time; client polls 10s
  { prefix: '/api/satellites/passes',   cc: 'public, max-age=120, s-maxage=300' },     // server caches 5m; browser 2m, edge 5m
  { prefix: '/api/satellites/list',     cc: 'public, max-age=3600, s-maxage=86400' },  // upstream daily; browser 1h, edge 24h
  { prefix: '/api/satellites/tle',      cc: 'public, max-age=3600, s-maxage=21600' },  // Celestrak ~12h; browser 1h, edge 6h
  { prefix: '/api/lunar',              cc: 'public, max-age=3600, s-maxage=21600' },   // computed; browser 1h, edge 6h
  { prefix: '/api/dxpeditions',        cc: 'public, max-age=1800, s-maxage=86400' },   // NG3K ~daily; browser 30m, edge 24h
  { prefix: '/api/contests',           cc: 'public, max-age=1800, s-maxage=21600' },   // schedules; browser 30m, edge 6h
  { prefix: '/api/propagation',        cc: 'public, max-age=300, s-maxage=3600' },     // upstream ~hourly; browser 5m, edge 1h
  { prefix: '/api/voacap/ssn',         cc: 'public, max-age=86400, s-maxage=604800' }, // NOAA monthly; browser 1d, edge 7d
  // Tier 2 — per-endpoint, faster-changing data
  { prefix: '/api/spots/psk/heard',    cc: 'public, max-age=120, s-maxage=300' },      // server caches 5m; browser 2m, edge 5m
  { prefix: '/api/spots/psk',          cc: 'public, max-age=120, s-maxage=300' },      // server caches 5m; browser 2m, edge 5m
  { prefix: '/api/spots/wspr',         cc: 'public, max-age=120, s-maxage=300' },      // server caches 5m; browser 2m, edge 5m
  { prefix: '/api/spots/dxc',          cc: 'public, max-age=15, s-maxage=30' },        // server caches 10s; browser 15s, edge 30s
  { prefix: '/api/spots/wwff',          cc: 'public, max-age=30, s-maxage=60' },        // no server cache; browser 30s, edge 60s
  { prefix: '/api/spots/sota',         cc: 'public, max-age=30, s-maxage=60' },        // no server cache; browser 30s, edge 60s
  { prefix: '/api/spots',              cc: 'public, max-age=30, s-maxage=60' },        // POTA; client polls 60s
  { prefix: '/api/iss/position',       cc: 'public, max-age=5, s-maxage=10' },         // real-time; client polls 10s
  { prefix: '/api/weather/clouds',     cc: 'public, max-age=1800, s-maxage=3600' },     // OWM cloud tiles; browser 30m, edge 1h
  { prefix: '/api/weather/radar',      cc: 'public, max-age=120, s-maxage=300' },      // RainViewer; browser 2m, edge 5m
  { prefix: '/api/weather/owm',        cc: 'public, max-age=300, s-maxage=900' },      // OWM 15m refresh; browser 5m, edge 15m
  { prefix: '/api/weather/conditions', cc: 'public, max-age=300, s-maxage=900' },      // NWS 15m refresh; browser 5m, edge 15m
  { prefix: '/api/weather/alerts',     cc: 'public, max-age=120, s-maxage=300' },      // safety-critical; browser 2m, edge 5m
  { prefix: '/api/weather',            cc: 'public, max-age=120, s-maxage=300' },      // WU data; browser 2m, edge 5m
  { prefix: '/api/callsign',           cc: 'public, max-age=3600, s-maxage=86400' },   // immutable lookups; browser 1h, edge 24h
  { prefix: '/api/voacap',             cc: 'public, max-age=300, s-maxage=1800' },     // heavy computation; browser 5m, edge 30m
];

function cacheControlMiddleware(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const rule = CACHE_RULES.find(r => req.path === r.prefix || req.path.startsWith(r.prefix + '/'));
  if (rule) res.set('Cache-Control', rule.cc);
  next();
}

module.exports = cacheControlMiddleware;
module.exports.CACHE_RULES = CACHE_RULES;
