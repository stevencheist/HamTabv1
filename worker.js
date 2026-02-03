// --- Cloudflare Worker entry point (hostedmode) ---
// Routes /api/settings to Workers KV, everything else to the Container.

import { DurableObject } from 'cloudflare:workers';

export class HamTab extends DurableObject {
  defaultPort = 8080;
  sleepAfter = '5m';
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
    const url = new URL(request.url);

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
    const id = env.HAMTAB.idFromName('hamtab');
    const container = env.HAMTAB.get(id);
    return container.fetch(request);
  },
};
