// --- Hardened fetch helpers ---
// Extracted from server.js — SSRF-safe HTTP client for upstream API calls.

const dns = require('dns');
const https = require('https');
const { URL } = require('url');

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const REQUEST_TIMEOUT_MS = 10000; // 10 seconds

// SSRF guard: rejects all non-routable IPs (loopback, link-local, IPv6 ULA, etc.).
function isPrivateIP(ip) {
  // IPv6 loopback and private
  if (ip === '::1') return true;
  if (ip.startsWith('fc') || ip.startsWith('fd')) return true; // unique local
  if (ip.startsWith('fe80')) return true; // link-local
  if (ip === '::') return true; // unspecified address
  if (ip.startsWith('::ffff:')) {
    // IPv4-mapped IPv6 — extract and check the IPv4 part
    return isPrivateIP(ip.substring(7));
  }

  // IPv4
  const parts = ip.split('.').map(Number);
  if (parts.length === 4 && parts.every(p => !isNaN(p) && p >= 0 && p <= 255)) {
    const [a, b] = parts;
    if (a === 0) return true;                         // 0.0.0.0/8 — current network
    if (a === 10) return true;                        // 10.0.0.0/8 — RFC 1918
    if (a === 127) return true;                       // 127.0.0.0/8 — loopback
    if (a === 169 && b === 254) return true;          // 169.254.0.0/16 — link-local
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12 — RFC 1918
    if (a === 192 && b === 168) return true;          // 192.168.0.0/16 — RFC 1918
    if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 — CGNAT (RFC 6598)
    if (a === 198 && (b === 18 || b === 19)) return true; // 198.18.0.0/15 — benchmark testing
    if (a >= 224 && a <= 239) return true;            // 224.0.0.0/4 — multicast
    if (a >= 240) return true;                        // 240.0.0.0/4 — reserved + broadcast
  }
  return false;
}

async function resolveHost(hostname) {
  // If it's already an IP literal, return it directly
  if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) || hostname.includes(':')) {
    return hostname;
  }
  const { address } = await dns.promises.lookup(hostname);
  return address;
}

function secureFetch(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('Too many redirects'));
    }

    const parsed = new URL(url);

    // SSRF guard: HTTPS-only for external requests
    if (parsed.protocol !== 'https:') {
      return reject(new Error('Only HTTPS URLs are allowed'));
    }

    // Resolve DNS and check the actual IP before connecting
    resolveHost(parsed.hostname).then((resolvedIP) => {
      if (isPrivateIP(resolvedIP)) {
        return reject(new Error('Requests to private addresses are blocked'));
      }

      // Pin the resolved IP to prevent TOCTOU / DNS rebinding
      const options = {
        hostname: resolvedIP,
        path: parsed.pathname + parsed.search,
        port: parsed.port || 443,
        headers: {
          'User-Agent': 'HamTab/1.0',
          'Host': parsed.hostname,
        },
        servername: parsed.hostname, // for TLS SNI
      };

      const req = https.get(options, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          resp.resume();
          return secureFetch(resp.headers.location, redirectCount + 1).then(resolve).catch(reject);
        }
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          resp.resume();
          return reject(new Error(`HTTP ${resp.statusCode}`));
        }

        let data = '';
        let bytes = 0;
        resp.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > MAX_RESPONSE_BYTES) {
            resp.destroy();
            return reject(new Error('Response too large'));
          }
          data += chunk;
        });
        resp.on('end', () => resolve(data));
        resp.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(REQUEST_TIMEOUT_MS, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    }).catch(reject);
  });
}

async function fetchJSON(url) {
  const data = await secureFetch(url);
  return JSON.parse(data);
}

async function fetchText(url) {
  return secureFetch(url);
}

module.exports = { isPrivateIP, resolveHost, secureFetch, fetchJSON, fetchText, MAX_REDIRECTS, MAX_RESPONSE_BYTES, REQUEST_TIMEOUT_MS };
