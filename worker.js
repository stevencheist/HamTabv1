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

        // Check running property
        try {
          const isRunning = this.ctx.container.running;
          diag.steps.push(`2. running property: ${isRunning} (type: ${typeof isRunning})`);
        } catch (e) {
          diag.steps.push(`2. running property error: ${e.message}`);
        }

        // Try start (may throw if already running — that's OK)
        try {
          this.ctx.container.start();
          diag.steps.push('3. start() succeeded');
        } catch (e) {
          diag.steps.push(`3. start() threw: ${e.message}`);
        }

        // Check running again after start attempt
        try {
          const isRunning2 = this.ctx.container.running;
          diag.steps.push(`4. running after start: ${isRunning2}`);
        } catch (e) {
          diag.steps.push(`4. running after start error: ${e.message}`);
        }

        // Read monitor stream for lifecycle events
        try {
          diag.steps.push('5. Reading monitor() stream...');
          const monitorStream = this.ctx.container.monitor();
          const reader = monitorStream.getReader();
          const events = [];
          const readWithTimeout = async (ms) => {
            const timeout = new Promise((_, reject) =>
              setTimeout(() => reject(new Error('timeout')), ms)
            );
            try {
              return await Promise.race([reader.read(), timeout]);
            } catch {
              return { done: true, value: undefined, timedOut: true };
            }
          };

          for (let i = 0; i < 5; i++) {
            const chunk = await readWithTimeout(10000);
            if (chunk.timedOut) { events.push('(timed out)'); break; }
            if (chunk.done) { events.push('(stream ended)'); break; }
            const text = typeof chunk.value === 'string'
              ? chunk.value
              : new TextDecoder().decode(chunk.value);
            events.push(text);
          }
          reader.releaseLock();
          diag.steps.push(`6. Monitor events: ${JSON.stringify(events)}`);
        } catch (e) {
          diag.steps.push(`5-6. monitor() error: ${e.message}`);
        }

        // Try getTcpPort
        try {
          const tcpPort = this.ctx.container.getTcpPort(8080);
          diag.steps.push(`7. getTcpPort(8080) type: ${typeof tcpPort}, keys: ${tcpPort ? Object.keys(tcpPort) : 'null'}`);
          if (tcpPort && tcpPort.fetch) {
            try {
              const resp = await tcpPort.fetch('http://localhost/api/health');
              const body = await resp.text();
              diag.steps.push(`8. tcpPort.fetch /api/health: HTTP ${resp.status}, body: ${body.slice(0, 200)}`);
            } catch (e) {
              diag.steps.push(`8. tcpPort.fetch error: ${e.message}`);
            }
          } else {
            diag.steps.push('8. tcpPort has no fetch method');
          }
        } catch (e) {
          diag.steps.push(`7. getTcpPort error: ${e.message}`);
        }

        // Try containerFetch (the method super.fetch() uses internally)
        try {
          const cfResp = await this.containerFetch(
            new Request('http://localhost/api/health')
          );
          const cfBody = await cfResp.text();
          diag.steps.push(`9. containerFetch /api/health: HTTP ${cfResp.status}, body: ${cfBody.slice(0, 200)}`);
        } catch (e) {
          diag.steps.push(`9. containerFetch error: ${e.message}`);
        }

        // Try super.fetch with a health check request
        try {
          const superResp = await super.fetch(
            new Request(new URL('/api/health', request.url).toString())
          );
          const superBody = await superResp.text();
          diag.steps.push(`10. super.fetch /api/health: HTTP ${superResp.status}, body: ${superBody.slice(0, 200)}`);
        } catch (e) {
          diag.steps.push(`10. super.fetch error: ${e.message}`);
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
