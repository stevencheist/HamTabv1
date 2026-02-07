// --- Cloudflare Worker entry point (hostedmode) ---
// Routes /api/settings to Workers KV, /service-auth to Turnstile auth,
// everything else to the Container.

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

// --- Base64url helpers (Web Crypto produces ArrayBuffers) ---

function b64urlEncode(buf) {
  const bytes = new Uint8Array(buf);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(str) {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

// --- JWT utilities (HMAC-SHA256 via Web Crypto) ---

async function getSigningKey(hexSecret) {
  const keyBytes = new Uint8Array(hexSecret.match(/.{2}/g).map(h => parseInt(h, 16)));
  return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

async function signSessionJWT(uuid, signingKey) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: `anon:${uuid}`,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 604800, // 7 days
  };

  const enc = new TextEncoder();
  const headerB64 = b64urlEncode(enc.encode(JSON.stringify(header)));
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sigInput = enc.encode(`${headerB64}.${payloadB64}`);

  const sig = await crypto.subtle.sign('HMAC', signingKey, sigInput);
  return `${headerB64}.${payloadB64}.${b64urlEncode(sig)}`;
}

async function verifySessionJWT(token, signingKey) {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const enc = new TextEncoder();
    const sigInput = enc.encode(`${parts[0]}.${parts[1]}`);
    const sig = b64urlDecode(parts[2]);

    const valid = await crypto.subtle.verify('HMAC', signingKey, sig, sigInput);
    if (!valid) return null;

    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1])));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

// --- Turnstile verification ---

async function verifyTurnstile(token, ip, secretKey) {
  const resp = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ secret: secretKey, response: token, remoteip: ip }),
  });
  const result = await resp.json();
  return result.success === true;
}

// --- User identity (email-auth or anonymous Turnstile) ---
// Returns { type: 'email', id } or { type: 'anon', id } or null

async function getUserIdentity(request, env) {
  // 1. Check CF Access JWT for email (existing email-auth users)
  const jwt = request.headers.get('Cf-Access-Jwt-Assertion');
  if (jwt) {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]));
      if (payload.email) return { type: 'email', id: payload.email };
    } catch {
      // Malformed JWT — fall through to cookie check
    }
  }

  // 2. Check hamtab_session cookie for signed JWT (Turnstile users)
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/(?:^|;\s*)hamtab_session=([^\s;]+)/);
  if (match && env.SESSION_SIGNING_KEY) {
    const signingKey = await getSigningKey(env.SESSION_SIGNING_KEY);
    const payload = await verifySessionJWT(match[1], signingKey);
    if (payload && payload.sub && payload.sub.startsWith('anon:')) {
      const uuid = payload.sub.slice(5); // strip "anon:" prefix
      // Validate UUID v4 format to prevent KV key injection
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)) {
        return { type: 'anon', id: uuid };
      }
    }
  }

  return null;
}

// --- Cookie helper ---

function setCookie(name, value, maxAge) {
  return `${name}=${value}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

// --- Service auth HTML (Turnstile challenge page) ---

const TURNSTILE_SITE_KEY = '0x4AAAAAACYnuiozIW8htgHF'; // public key — safe to embed

const SERVICE_AUTH_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HamTab — Verify Access</title>
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1a1a2e; color: #e0e0e0;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .card {
      background: #16213e; border-radius: 12px; padding: 2.5rem;
      max-width: 420px; width: 90%; text-align: center;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
    }
    h1 { font-size: 1.6rem; margin-bottom: 0.5rem; color: #00d4ff; }
    p { margin-bottom: 1.5rem; line-height: 1.5; color: #a0a0b8; font-size: 0.95rem; }
    .cf-turnstile { display: flex; justify-content: center; margin-bottom: 1rem; }
    .status {
      font-size: 0.9rem; min-height: 1.4em; color: #a0a0b8;
      transition: color 0.3s;
    }
    .status.error { color: #ff6b6b; }
    .status.success { color: #51cf66; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Welcome to HamTab</h1>
    <p>Please verify you're human to access the dashboard.</p>
    <div class="cf-turnstile" data-sitekey="${TURNSTILE_SITE_KEY}"
         data-callback="onTurnstileSuccess" data-theme="dark"></div>
    <div class="status" id="status"></div>
  </div>
  <script>
    async function onTurnstileSuccess(token) {
      const el = document.getElementById('status');
      el.textContent = 'Verifying…';
      el.className = 'status';
      try {
        const resp = await fetch('/service-auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });
        const data = await resp.json();
        if (data.ok) {
          el.textContent = 'Verified! Redirecting…';
          el.className = 'status success';
          if (data.userId) localStorage.setItem('hamtab_user_id', data.userId);
          setTimeout(() => window.location.href = '/', 500);
        } else {
          el.textContent = data.error || 'Verification failed. Please try again.';
          el.className = 'status error';
          turnstile.reset();
        }
      } catch {
        el.textContent = 'Network error. Please try again.';
        el.className = 'status error';
        turnstile.reset();
      }
    }
  </script>
</body>
</html>`;

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

      // --- Service auth: Turnstile challenge page ---
      if (url.pathname === '/service-auth' || url.pathname === '/service-auth/') {
        return new Response(SERVICE_AUTH_HTML, {
          headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
      }

      // --- Service auth: Turnstile verification ---
      if (url.pathname === '/service-auth/verify' && request.method === 'POST') {
        const body = await request.json();
        const token = body && body.token;
        if (!token || typeof token !== 'string') {
          return new Response(JSON.stringify({ ok: false, error: 'Missing token' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Verify Turnstile response server-side
        const clientIP = request.headers.get('CF-Connecting-IP') || '';
        const valid = await verifyTurnstile(token, clientIP, env.TURNSTILE_SECRET_KEY);
        if (!valid) {
          return new Response(JSON.stringify({ ok: false, error: 'Turnstile verification failed' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Generate per-user UUID and sign a session JWT
        const uuid = crypto.randomUUID();
        const signingKey = await getSigningKey(env.SESSION_SIGNING_KEY);
        const sessionJWT = await signSessionJWT(uuid, signingKey);

        const maxAge = 604800; // 7 days in seconds
        const headers = new Headers({
          'Content-Type': 'application/json',
        });
        headers.append('Set-Cookie', setCookie('CF-Access-Client-Id', env.CF_SERVICE_TOKEN_ID, maxAge));
        headers.append('Set-Cookie', setCookie('CF-Access-Client-Secret', env.CF_SERVICE_TOKEN_SECRET, maxAge));
        headers.append('Set-Cookie', setCookie('hamtab_session', sessionJWT, maxAge));

        return new Response(JSON.stringify({ ok: true, userId: uuid }), {
          status: 200,
          headers,
        });
      }

      // --- Settings KV routes ---
      if (url.pathname === '/api/settings') {
        const identity = await getUserIdentity(request, env);
        if (!identity) {
          return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Email users: "settings:{email}", anon users: "settings:anon:{uuid}"
        const kvKey = identity.type === 'email'
          ? `settings:${identity.id}`
          : `settings:anon:${identity.id}`;

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
