// --- Cloudflare Worker entry point (hostedmode) ---
// Routes /api/settings to Workers KV, caches cacheable GET responses at the edge
// via the Cache API, and proxies everything else to the Container.
// Auth: None (Cloudflare Access and Turnstile removed — revisit later)

import { Container, getContainer } from '@cloudflare/containers';

export class HamTab extends Container {
  defaultPort = 8080;
  sleepAfter = '5m';

  onStart() {
    console.log('[HamTab Container] Started', {
      timestamp: new Date().toISOString(),
      port: this.defaultPort
    });
  }

  onStop() {
    console.log('[HamTab Container] Stopped', {
      timestamp: new Date().toISOString()
    });
  }

  onError(error) {
    console.error('[HamTab Container] Error', {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
}

// --- Anonymous user identity ---
// Uses client-provided UUID from localStorage (no auth gate).
// Settings are per-browser, not per-authenticated-user.

function getUserId(request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('userId');
  // Validate UUID v4 format to prevent KV key injection
  if (id && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return id;
  }
  return null;
}

// --- Edge cache configuration ---
// TTLs mirror s-maxage values from server.js CACHE_RULES (Tier 1 + Tier 2).
// Longer prefixes first — first match wins.
const EDGE_CACHE_TTLS = [
  // Tier 1
  { prefix: '/api/solar/frames',        ttl: 3600 },   // 1h
  { prefix: '/api/solar',               ttl: 3600 },   // 1h
  { prefix: '/api/spacewx/history',     ttl: 900 },    // 15m
  { prefix: '/api/satellites/positions', ttl: 15 },     // 15s — real-time
  { prefix: '/api/satellites/passes',   ttl: 300 },     // 5m
  { prefix: '/api/satellites/list',     ttl: 86400 },   // 24h
  { prefix: '/api/satellites/tle',      ttl: 21600 },   // 6h
  { prefix: '/api/lunar',              ttl: 21600 },    // 6h
  { prefix: '/api/dxpeditions',        ttl: 86400 },    // 24h
  { prefix: '/api/contests',           ttl: 21600 },    // 6h
  { prefix: '/api/propagation',        ttl: 3600 },     // 1h
  { prefix: '/api/voacap/ssn',         ttl: 604800 },   // 7d
  // Tier 2
  { prefix: '/api/spots/psk/heard',    ttl: 300 },      // 5m
  { prefix: '/api/spots/psk',          ttl: 300 },      // 5m
  { prefix: '/api/spots/dxc',          ttl: 30 },       // 30s
  { prefix: '/api/spots/sota',         ttl: 60 },       // 60s
  { prefix: '/api/spots',              ttl: 60 },       // 60s
  { prefix: '/api/iss/position',       ttl: 10 },       // 10s — real-time
  { prefix: '/api/weather/conditions', ttl: 900 },      // 15m
  { prefix: '/api/weather/alerts',     ttl: 300 },      // 5m
  { prefix: '/api/weather',            ttl: 300 },      // 5m
  { prefix: '/api/callsign/',          ttl: 86400 },    // 24h — immutable lookups
  { prefix: '/api/voacap',             ttl: 1800 },     // 30m
];

// Paths that must never be edge-cached (diagnostic, per-user, or mutating)
const NOCACHE_PATHS = new Set([
  '/healthz',
  '/api/health',
  '/api/settings',
  '/api/feedback',
  '/api/voacap/status',
]);

// Query params that contain user-specific data — strip before building cache key
const STRIP_PARAMS = new Set(['userId', 'apikey', 'token']);

// Geo params to round to 1 decimal place (~11km) for cache key normalization
const GEO_PARAMS = new Set(['lat', 'lon', 'txLat', 'txLon', 'rxLat', 'rxLon']);

/**
 * First-match TTL lookup. Returns TTL in seconds, or 0 if no match.
 */
function getEdgeTtl(pathname) {
  for (const rule of EDGE_CACHE_TTLS) {
    if (pathname === rule.prefix || pathname.startsWith(rule.prefix + '/')) {
      return rule.ttl;
    }
  }
  return 0;
}

/**
 * Build a normalized cache key Request:
 * - Strips user-specific query params (userId, apikey, token)
 * - Rounds geo params (lat, lon, etc.) to 1 decimal place (~11km buckets)
 * - Sorts remaining query params alphabetically for deterministic keys
 */
function buildCacheKey(request) {
  const url = new URL(request.url);

  // Strip user-specific params
  for (const key of STRIP_PARAMS) {
    url.searchParams.delete(key);
  }

  // Round geo params to 1 decimal
  for (const key of GEO_PARAMS) {
    const val = url.searchParams.get(key);
    if (val !== null) {
      const num = parseFloat(val);
      if (!isNaN(num)) {
        url.searchParams.set(key, num.toFixed(1));
      }
    }
  }

  // Sort params alphabetically for deterministic cache keys
  url.searchParams.sort();

  return new Request(url.toString(), { method: 'GET' });
}

/**
 * Build the proxy request with shared headers (X-Forwarded-For, secrets).
 * Extracts duplicated header setup logic.
 */
function buildProxyRequest(request, url, env) {
  const headers = new Headers(request.headers);

  // Forward real client IP so Express rate limiter counts per-user
  const clientIP = request.headers.get('CF-Connecting-IP');
  if (clientIP) {
    headers.set('X-Forwarded-For', clientIP);
  }

  // Inject GitHub token for feedback endpoint
  if (url.pathname === '/api/feedback' && env.GITHUB_FEEDBACK_TOKEN) {
    headers.set('X-GitHub-Token', env.GITHUB_FEEDBACK_TOKEN);
  }

  return new Request(request, { headers });
}

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);

      // --- Health check ---
      if (url.pathname === '/healthz') {
        return new Response(JSON.stringify({ ok: true, time: Date.now() }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // --- Redirect /api to Swagger docs ---
      if (url.pathname === '/api' || url.pathname === '/api/') {
        return Response.redirect(new URL('/api/docs/', request.url).toString(), 302);
      }

      // --- Settings KV routes ---
      if (url.pathname === '/api/settings') {
        const userId = getUserId(request);
        if (!userId) {
          return new Response(JSON.stringify({ error: 'Missing or invalid userId' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const kvKey = `settings:anon:${userId}`;

        if (request.method === 'GET') {
          const data = await env.SETTINGS_KV.get(kvKey, 'json');
          return new Response(JSON.stringify(data || {}), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (request.method === 'PUT') {
          const body = await request.json();
          await env.SETTINGS_KV.put(kvKey, JSON.stringify(body));
          return new Response(JSON.stringify({ ok: true }), {
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response('Method not allowed', { status: 405 });
      }

      // --- Edge cache layer (Cloudflare Cache API) ---
      const isCacheable = request.method === 'GET'
        && !NOCACHE_PATHS.has(url.pathname)
        && !request.headers.has('Authorization');

      const edgeTtl = isCacheable ? getEdgeTtl(url.pathname) : 0;

      if (edgeTtl > 0) {
        const cache = caches.default;
        const cacheKey = buildCacheKey(request);

        // Check edge cache
        const cached = await cache.match(cacheKey);
        if (cached) {
          const resp = new Response(cached.body, cached);
          resp.headers.set('X-Cache', 'HIT');
          return resp;
        }

        // Cache miss — proxy to container
        const container = getContainer(env.HAMTAB, 'hamtab');
        const proxyReq = buildProxyRequest(request, url, env);
        const origin = await container.fetch(proxyReq);

        // Only cache 2xx responses
        if (origin.ok) {
          const resp = new Response(origin.body, origin);
          resp.headers.set('Cache-Control', `public, s-maxage=${edgeTtl}`);
          resp.headers.set('X-Cache', 'MISS');

          // Fire-and-forget cache.put — don't block the response
          const cacheResp = resp.clone();
          // Ensure the cached copy has the right headers
          const toCache = new Response(cacheResp.body, cacheResp);
          toCache.headers.set('Cache-Control', `public, s-maxage=${edgeTtl}`);
          // Remove headers that prevent caching
          toCache.headers.delete('Set-Cookie');
          ctx.waitUntil(cache.put(cacheKey, toCache));

          return resp;
        }

        // Non-2xx — pass through without caching
        const errResp = new Response(origin.body, origin);
        errResp.headers.set('X-Cache', 'MISS');
        return errResp;
      }

      // --- Non-cacheable: proxy directly to Container ---
      const container = getContainer(env.HAMTAB, 'hamtab');
      const proxyReq = buildProxyRequest(request, url, env);
      return await container.fetch(proxyReq);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
