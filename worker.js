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

        // Enumerate ctx.container methods/properties
        const ctxKeys = Object.getOwnPropertyNames(Object.getPrototypeOf(this.ctx.container));
        diag.steps.push(`2. ctx.container methods: ${JSON.stringify(ctxKeys)}`);

        // List all own properties
        const ownKeys = Object.keys(this.ctx.container);
        diag.steps.push(`3. ctx.container ownKeys: ${JSON.stringify(ownKeys)}`);

        // Try start with explicit options
        diag.steps.push('4. Calling start()');
        this.ctx.container.start();
        diag.steps.push('5. start() returned');

        // Read monitor stream for events (with timeout)
        diag.steps.push('6. Reading monitor() stream...');
        const monitorStream = this.ctx.container.monitor();
        const reader = monitorStream.getReader();
        const events = [];
        const readWithTimeout = async (ms) => {
          const timeout = new Promise((_, reject) =>
            setTimeout(() => reject(new Error('timeout')), ms)
          );
          try {
            const result = await Promise.race([reader.read(), timeout]);
            return result;
          } catch {
            return { done: true, value: undefined, timedOut: true };
          }
        };

        // Read up to 5 events with 10s total timeout
        for (let i = 0; i < 5; i++) {
          const chunk = await readWithTimeout(10000);
          if (chunk.timedOut) {
            events.push('(timed out waiting for event)');
            break;
          }
          if (chunk.done) {
            events.push('(stream ended)');
            break;
          }
          // chunk.value could be a Uint8Array or string
          const text = typeof chunk.value === 'string'
            ? chunk.value
            : new TextDecoder().decode(chunk.value);
          events.push(text);
        }
        reader.releaseLock();
        diag.steps.push(`7. Monitor events: ${JSON.stringify(events)}`);

        // Try getTcpPort
        try {
          const tcpPort = this.ctx.container.getTcpPort(8080);
          diag.steps.push(`8. getTcpPort(8080): ${JSON.stringify(tcpPort)}, type: ${typeof tcpPort}`);
          if (tcpPort && tcpPort.fetch) {
            const resp = await tcpPort.fetch('http://localhost/api/health');
            diag.steps.push(`9. tcpPort.fetch: HTTP ${resp.status}`);
          }
        } catch (e) {
          diag.steps.push(`8. getTcpPort error: ${e.message}`);
        }

        // Try getIPAddress
        try {
          const ip = this.ctx.container.getIPAddress();
          diag.steps.push(`10. getIPAddress(): ${ip}`);
        } catch (e) {
          diag.steps.push(`10. getIPAddress error: ${e.message}`);
        }

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
