// --- TLS certificate management (lanmode only) ---
// Generates self-signed certs for HTTPS on local networks.
// In hostedmode, Cloudflare handles TLS — this module is a no-op.

const fs = require('fs');
const path = require('path');

const CERTS_DIR = path.join(__dirname, 'certs');
const KEY_PATH = path.join(CERTS_DIR, 'server.key');
const CERT_PATH = path.join(CERTS_DIR, 'server.cert');
const SANS_PATH = path.join(CERTS_DIR, '.sans');

function isRFC1918(ip) {
  // Subset of isPrivateIP: only RFC 1918 LAN-routable ranges (for TLS cert SANs)
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p))) return false;
  const [a, b] = parts;
  return (a === 10) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168);
}

function getLocalIPs() {
  const os = require('os');
  const { execSync } = require('child_process');
  const ips = new Set();

  // Collect non-internal IPv4 addresses from local interfaces
  const ifaces = os.networkInterfaces();
  for (const addrs of Object.values(ifaces)) {
    for (const addr of addrs) {
      if (!addr.internal && addr.family === 'IPv4' && isRFC1918(addr.address)) {
        ips.add(addr.address);
      }
    }
  }

  // In WSL, also discover Windows host IPs so the cert covers addresses
  // that LAN clients actually connect to via portproxy
  try {
    const result = execSync(
      'powershell.exe -NoProfile -Command "Get-NetIPAddress -AddressFamily IPv4 | Select-Object -ExpandProperty IPAddress"',
      { timeout: 5000, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    for (const line of result.split(/\r?\n/)) {
      const ip = line.trim();
      if (ip && isRFC1918(ip)) {
        ips.add(ip);
      }
    }
  } catch {
    // Not running in WSL or powershell.exe not available
  }

  return [...ips].sort();
}

/**
 * Generate or reuse self-signed TLS certificates.
 * Returns { key, cert } for https.createServer(), or null if not needed.
 */
function ensureCerts() {
  const selfsigned = require('selfsigned');
  const currentIPs = getLocalIPs();
  const allSANs = ['localhost', '127.0.0.1', '::1', ...currentIPs].sort().join(',');

  // Reuse existing cert if SANs still match current network addresses
  if (fs.existsSync(KEY_PATH) && fs.existsSync(CERT_PATH) && fs.existsSync(SANS_PATH)) {
    const savedSANs = fs.readFileSync(SANS_PATH, 'utf-8').trim();
    if (savedSANs === allSANs) {
      console.log('TLS certificate SANs match current network — reusing existing cert.');
      return {
        key: fs.readFileSync(KEY_PATH),
        cert: fs.readFileSync(CERT_PATH),
      };
    }
    console.log('Network addresses changed — regenerating TLS certificate...');
  } else {
    console.log('Generating self-signed TLS certificate...');
  }

  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    { type: 7, ip: '::1' },
  ];

  for (const ip of currentIPs) {
    altNames.push({ type: 7, ip });
  }

  console.log('Certificate SANs:', ['localhost', '127.0.0.1', '::1', ...currentIPs].join(', '));

  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = selfsigned.generate(attrs, {
    days: 365,
    keySize: 2048,
    extensions: [{ name: 'subjectAltName', altNames }],
  });

  fs.mkdirSync(CERTS_DIR, { recursive: true });
  fs.writeFileSync(KEY_PATH, pems.private);
  fs.writeFileSync(CERT_PATH, pems.cert);
  fs.writeFileSync(SANS_PATH, allSANs);
  console.log(`Certificates saved to ${CERTS_DIR}/`);

  return { key: pems.private, cert: pems.cert };
}

module.exports = { ensureCerts };
