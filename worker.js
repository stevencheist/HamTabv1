// --- Cloudflare Worker entry point (hostedmode) ---
// Routes /api/settings to Workers KV, everything else to the Container.

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

// Decode user email from CF Access JWT (already verified by Access before reaching Worker)
function getUserEmail(request) {
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!jwt) return null;
  try {
    const payload = jwt.split('.')[1];
    const decoded = JSON.parse(atob(payload));
    return decoded.email || null;
  } catch {
    return null;
  }
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // --- Health check ---
      if (url.pathname === '/healthz') {
        return new Response(JSON.stringify({ ok: true, time: Date.now() }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // --- Settings KV routes ---
      if (url.pathname === '/api/settings') {
        const email = getUserEmail(request);
        if (!email) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const kvKey = `settings:${email}`;

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

      // --- Proxy everything else to the Container ---
      const container = getContainer(env.HAMTAB, 'hamtab');

      // Clone headers, forward client IP, and inject secrets for specific endpoints
      const headers = new Headers(request.headers);

      // Forward real client IP so Express rate limiter counts per-user, not per-container
      const clientIP = request.headers.get('CF-Connecting-IP');
      if (clientIP) {
        headers.set('X-Forwarded-For', clientIP);
      }

      if (url.pathname === '/api/feedback' && env.GITHUB_FEEDBACK_TOKEN) {
        headers.set('X-GitHub-Token', env.GITHUB_FEEDBACK_TOKEN);
      }

      const proxyRequest = new Request(request, { headers });
      return await container.fetch(proxyRequest);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
