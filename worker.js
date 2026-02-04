// --- Cloudflare Worker entry point (hostedmode) ---
// Routes /api/settings to Workers KV, everything else to the Container.

import { DurableObject } from 'cloudflare:workers';

export class HamTab extends DurableObject {
  defaultPort = 8080;
  sleepAfter = '5m';

  async fetch(request) {
    try {
      // Debug: check what's available
      const hasCtx = !!this.ctx;
      const hasContainer = hasCtx && !!this.ctx.container;
      const hasGetTcpPort = hasContainer && typeof this.ctx.container.getTcpPort === 'function';

      if (!hasGetTcpPort) {
        return new Response(JSON.stringify({
          debug: true,
          hasCtx,
          hasContainer,
          hasGetTcpPort,
          ctxKeys: hasCtx ? Object.keys(this.ctx) : null,
          containerKeys: hasContainer ? Object.keys(this.ctx.container) : null,
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Use the container API to proxy request to the container
      const port = this.ctx.container.getTcpPort(this.defaultPort);
      const url = new URL(request.url);
      return port.fetch(`http://container${url.pathname}${url.search}`, {
        method: request.method,
        headers: request.headers,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      });
    } catch (err) {
      return new Response(JSON.stringify({
        doError: err.message,
        name: err.name,
        stack: err.stack,
        port: this.defaultPort
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
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
      const id = env.HAMTAB.idFromName('hamtab');
      const container = env.HAMTAB.get(id);
      return container.fetch(request);
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message, stack: err.stack }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
