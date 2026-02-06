// --- Cloudflare Worker entry point (hostedmode) ---
// Routes /api/settings to Workers KV, everything else to the Container.

import { Container, getContainer } from '@cloudflare/containers';

export class HamTab extends Container {
  defaultPort = 8080;
  sleepAfter = '5m';

  // Override fetch to add diagnostics and explicit lifecycle management
  async fetch(request) {
    const url = new URL(request.url);

    // Internal diagnostic endpoint — called via DO stub
    if (url.pathname === '/container-diag-internal') {
      const diag = { steps: [], timestamp: new Date().toISOString() };
      try {
        diag.steps.push('1. Inside Container class fetch()');
        diag.steps.push(`2. ctx.container exists: ${!!this.ctx.container}`);

        // Try to get container status
        try {
          const monitor = this.ctx.container.monitor();
          diag.steps.push(`3. monitor() returned: ${JSON.stringify(monitor)}`);
        } catch (e) {
          diag.steps.push(`3. monitor() error: ${e.message}`);
        }

        // Try explicit start
        diag.steps.push('4. Calling this.ctx.container.start()');
        this.ctx.container.start();
        diag.steps.push('5. start() called (no error)');

        // Wait a moment then check
        await new Promise(r => setTimeout(r, 5000));

        // Try to get container status again
        try {
          const monitor = this.ctx.container.monitor();
          diag.steps.push(`6. After start, monitor(): ${JSON.stringify(monitor)}`);
        } catch (e) {
          diag.steps.push(`6. After start, monitor() error: ${e.message}`);
        }

        // Try containerFetch
        diag.steps.push('7. Calling this.containerFetch()');
        const resp = await this.containerFetch(new Request('http://localhost:8080/api/health'));
        const body = await resp.text();
        diag.steps.push(`8. containerFetch responded: HTTP ${resp.status} — ${body}`);
        diag.ok = true;
      } catch (err) {
        diag.error = err.message;
        diag.stack = err.stack;
        diag.ok = false;
      }
      return new Response(JSON.stringify(diag, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Default: use base Container class fetch (auto-start + proxy)
    return super.fetch(request);
  }

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

      // --- Deep container diagnostics (runs inside DO) ---
      if (url.pathname === '/container-diag') {
        const container = getContainer(env.HAMTAB, 'hamtab');
        return await container.fetch(new Request('http://container/container-diag-internal'));
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

      // Clone headers and inject secrets for specific endpoints
      const headers = new Headers(request.headers);

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
