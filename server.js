// Copyright (c) 2026 SF Foundry. MIT License.
// SPDX-License-Identifier: MIT

require('dotenv').config();

// --- Imports ---
const express = require('express');
const fs = require('fs');
const path = require('path');
const voacap = require('./voacap-bridge.js');
const { getConfig } = require('./server-config.js');
const { startListeners } = require('./server-startup.js');

// --- Lanmode-only imports ---
const os = require('os');
const https = require('https');
const net = require('net');
const { exec } = require('child_process');
const { isPrivateIP, resolveHost, secureFetch, fetchJSON, MAX_REDIRECTS } = require('./server/services/http-fetch');

// --- Extracted modules ---
const { startEviction, stopEviction } = require('./server/services/cache-store');
const cacheControlMiddleware = require('./server/middleware/cache-control');
const { setupSecurity } = require('./server/middleware/security');

// --- Routers ---
const metaRouter = require('./server/routes/meta');
const { setupDocs } = require('./server/routes/meta');
const callsignRouter = require('./server/routes/callsign');
const configRouter = require('./server/routes/config');
const weatherRouter = require('./server/routes/weather');
const spotsRouter = require('./server/routes/spots');
const solarRouter = require('./server/routes/solar');
const satellitesRouter = require('./server/routes/satellites');
const voacapRouter = require('./server/routes/voacap');

const app = express();
const config = getConfig();

// --- Security, rate limiting, body parsing, static files ---
setupSecurity(app, config);

// --- Health check (before rate limiter) ---
app.use(metaRouter);

// --- Cache-Control headers ---
app.use(cacheControlMiddleware);

// --- API docs ---
setupDocs(app, __dirname);

// --- Routers ---
app.use('/api', spotsRouter);
app.use('/api', solarRouter);
app.use('/api', satellitesRouter);
app.use('/api', callsignRouter);
app.use('/api', configRouter);
app.use('/api', voacapRouter);
app.use('/api/weather', weatherRouter);

// --- Cache eviction ---
startEviction();

// --- Mode-Specific Endpoints (Lanmode) ---
// Auto-update system: checks GitHub for new versions, downloads and applies updates

// --- Update state ---
const APP_DIR = __dirname;
const currentVersion = require('./package.json').version;
let updateAvailable = false;
let latestVersion = null;
let releaseUrl = null;
let lastCheckTime = null;
let checking = false;
let updateInProgress = false;
let updateCheckInterval = 3600; // seconds — default 1 hour
let updateTimer = null;

// Paths/dirs preserved during update (never overwritten)
const PRESERVE_ON_UPDATE = new Set([
  '.env', 'certs', 'node_modules', 'server.pid', 'logs',
  '.git', '.claude', 'tools', 'WORKING_ON.md',
]);

// --- Platform detection ---
function detectPlatform() {
  const platform = os.platform();
  if (platform === 'win32') return 'Windows';
  // Check for Raspberry Pi
  try {
    const model = fs.readFileSync('/proc/device-tree/model', 'utf-8');
    if (model.toLowerCase().includes('raspberry')) return 'Raspberry Pi';
  } catch { /* not a Pi */ }
  if (platform === 'linux') return 'Linux';
  return platform;
}

// --- Semver compare ---
// Returns -1 if a < b, 0 if equal, 1 if a > b
function compareSemver(a, b) {
  const pa = a.replace(/^v/, '').split('.').map(Number);
  const pb = b.replace(/^v/, '').split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const na = pa[i] || 0;
    const nb = pb[i] || 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

// --- Check for updates via GitHub Releases API ---
async function checkForUpdates() {
  if (checking) return;
  checking = true;
  try {
    const data = await fetchJSON('https://api.github.com/repos/stevencheist/HamTabv1/releases/latest');
    lastCheckTime = Date.now();
    const tag = data.tag_name || '';
    const ver = tag.replace(/^v/, '');
    if (ver && compareSemver(currentVersion, ver) < 0) {
      updateAvailable = true;
      latestVersion = ver;
      releaseUrl = data.html_url || '';
    } else {
      updateAvailable = false;
      latestVersion = ver || currentVersion;
      releaseUrl = null;
    }
  } catch (err) {
    console.error('Update check failed:', err.message);
  } finally {
    checking = false;
  }
}

function startUpdateTimer() {
  if (updateTimer) clearInterval(updateTimer);
  updateTimer = setInterval(checkForUpdates, updateCheckInterval * 1000);
}

// --- Binary fetch (for zip download) ---
// Same SSRF guards as secureFetch but returns a Buffer. 50 MB limit, 120s timeout.
const MAX_BINARY_BYTES = 50 * 1024 * 1024; // 50 MB
const BINARY_TIMEOUT_MS = 120000; // 120 seconds — generous for Raspberry Pi

function secureFetchBinary(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > MAX_REDIRECTS) {
      return reject(new Error('Too many redirects'));
    }

    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') {
      return reject(new Error('Only HTTPS URLs are allowed'));
    }

    resolveHost(parsed.hostname).then((resolvedIP) => {
      if (isPrivateIP(resolvedIP)) {
        return reject(new Error('Requests to private addresses are blocked'));
      }

      const options = {
        hostname: resolvedIP,
        path: parsed.pathname + parsed.search,
        port: parsed.port || 443,
        headers: {
          'User-Agent': 'HamTab/1.0',
          'Host': parsed.hostname,
        },
        servername: parsed.hostname,
      };

      const req = https.get(options, (resp) => {
        if (resp.statusCode >= 300 && resp.statusCode < 400 && resp.headers.location) {
          resp.resume();
          return secureFetchBinary(resp.headers.location, redirectCount + 1).then(resolve).catch(reject);
        }
        if (resp.statusCode < 200 || resp.statusCode >= 300) {
          resp.resume();
          return reject(new Error(`HTTP ${resp.statusCode}`));
        }

        const chunks = [];
        let bytes = 0;
        resp.on('data', (chunk) => {
          bytes += chunk.length;
          if (bytes > MAX_BINARY_BYTES) {
            resp.destroy();
            return reject(new Error('Response too large'));
          }
          chunks.push(chunk);
        });
        resp.on('end', () => resolve(Buffer.concat(chunks)));
        resp.on('error', reject);
      });

      req.on('error', reject);
      req.setTimeout(BINARY_TIMEOUT_MS, () => {
        req.destroy();
        reject(new Error('Request timed out'));
      });
    }).catch(reject);
  });
}

// --- Recursive copy with preservation and path traversal guard ---
function copyUpdateFiles(srcDir, destDir) {
  const entries = fs.readdirSync(srcDir, { withFileTypes: true });
  for (const entry of entries) {
    if (PRESERVE_ON_UPDATE.has(entry.name)) continue;

    const srcPath = path.join(srcDir, entry.name);
    const destPath = path.join(destDir, entry.name);

    // Path traversal guard — ensure destination stays within destDir
    if (!destPath.startsWith(destDir + path.sep) && destPath !== destDir) {
      console.error(`Path traversal blocked: ${destPath}`);
      continue;
    }

    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyUpdateFiles(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

// --- Run shell command as promise with timeout ---
function runCommand(cmd, opts = {}) {
  const timeout = opts.timeout || 120000; // 2 min default
  return new Promise((resolve, reject) => {
    exec(cmd, { cwd: APP_DIR, timeout }, (err, stdout, stderr) => {
      if (err) return reject(new Error(`${cmd}: ${err.message}\n${stderr}`));
      resolve(stdout);
    });
  });
}

// --- Update status endpoint ---
app.get('/api/update/status', (req, res) => {
  res.json({
    available: updateAvailable,
    currentVersion,
    latestVersion: latestVersion || currentVersion,
    releaseUrl,
    lastCheck: lastCheckTime,
    checking,
    updating: updateInProgress,
    platform: detectPlatform(),
  });
});

// --- Set update check interval ---
app.post('/api/update/interval', (req, res) => {
  const seconds = parseInt(req.body && req.body.seconds, 10);
  if (isNaN(seconds) || seconds < 60 || seconds > 86400) {
    return res.status(400).json({ error: 'Interval must be 60-86400 seconds' });
  }
  updateCheckInterval = seconds;
  startUpdateTimer();
  res.json({ ok: true, interval: seconds });
});

// --- Apply update endpoint ---
app.post('/api/update/apply', async (req, res) => {
  if (updateInProgress) {
    return res.status(409).json({ error: 'Update already in progress' });
  }
  if (!updateAvailable) {
    return res.status(400).json({ error: 'No update available' });
  }

  // Pre-flight: check write permissions on APP_DIR and node_modules
  // Catches the common case where install.sh ran as root and left files owned by root
  try {
    const testFile = path.join(APP_DIR, '.update-write-test');
    fs.writeFileSync(testFile, '');
    fs.unlinkSync(testFile);
  } catch {
    return res.status(500).json({
      error: `Permission denied on ${APP_DIR}. Run: sudo chown -R $(whoami) ${APP_DIR}`,
    });
  }
  const nmDir = path.join(APP_DIR, 'node_modules');
  if (fs.existsSync(nmDir)) {
    try {
      const testFile = path.join(nmDir, '.update-write-test');
      fs.writeFileSync(testFile, '');
      fs.unlinkSync(testFile);
    } catch {
      return res.status(500).json({
        error: `Permission denied on node_modules. Run: sudo chown -R $(whoami) ${APP_DIR}`,
      });
    }
  }

  updateInProgress = true;
  const tmpDir = path.join(os.tmpdir(), `hamtab-update-${Date.now()}`);

  try {
    console.log(`Downloading lanmode branch zip...`);
    const zipUrl = 'https://github.com/stevencheist/HamTabv1/archive/refs/heads/lanmode.zip';
    const zipBuffer = await secureFetchBinary(zipUrl);

    // Write zip to temp file
    fs.mkdirSync(tmpDir, { recursive: true });
    const zipPath = path.join(tmpDir, 'update.zip');
    fs.writeFileSync(zipPath, zipBuffer);
    console.log(`Downloaded ${zipBuffer.length} bytes to ${zipPath}`);

    // Extract zip
    const platform = os.platform();
    if (platform === 'win32') {
      await runCommand(
        `powershell -NoProfile -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${tmpDir}' -Force"`,
        { timeout: 60000 }
      );
    } else {
      await runCommand(`unzip -o "${zipPath}" -d "${tmpDir}"`, { timeout: 60000 });
    }

    // Find extracted directory (GitHub zips create a subfolder like HamTabv1-lanmode/)
    const extracted = fs.readdirSync(tmpDir).filter(
      f => f !== 'update.zip' && fs.statSync(path.join(tmpDir, f)).isDirectory()
    );
    if (extracted.length === 0) {
      throw new Error('No directory found in extracted zip');
    }
    const srcDir = path.join(tmpDir, extracted[0]);

    // Validate: extracted dir must contain package.json
    if (!fs.existsSync(path.join(srcDir, 'package.json'))) {
      throw new Error('Extracted archive missing package.json — aborting');
    }

    console.log('Copying update files...');
    copyUpdateFiles(srcDir, APP_DIR);

    console.log('Running npm install --production...');
    await runCommand('npm install --production', { timeout: 180000 }); // 3 min for Pi

    console.log('Running npm run build...');
    await runCommand('npm run build', { timeout: 60000 });

    // Clean up temp
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

    console.log('Update applied successfully. Restarting...');
    res.json({ updated: true, restarting: true });

    // Exit after response is sent — systemd/NSSM will restart the process
    setTimeout(() => process.exit(0), 1000);

    // Safety net: if process.exit didn't work (e.g. open handles), reset the flag
    // after 5 minutes so the user isn't permanently 409'd
    setTimeout(() => { updateInProgress = false; }, 300000); // 5 min
  } catch (err) {
    console.error('Update failed:', err.message);
    updateInProgress = false;
    // Clean up temp on failure
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    res.status(500).json({ error: `Update failed: ${err.message}` });
  }
});

// --- Update diagnostics endpoint ---
// Dry-run tests every step of the update process and reports pass/fail/warn.
// Accessible at /update-debug.html — helps diagnose update failures on user machines.
app.get('/api/update/diagnostics', async (req, res) => {
  const results = {};

  // 1. Environment info
  try {
    const userInfo = os.userInfo();
    results.environment = {
      status: 'pass',
      detail: {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        pid: process.pid,
        user: userInfo.username,
        uid: userInfo.uid,
        gid: userInfo.gid,
        appDir: APP_DIR,
        cwd: process.cwd(),
      },
    };
  } catch (err) {
    results.environment = { status: 'fail', detail: err.message };
  }

  // 2. Update state snapshot
  results.update_state = {
    status: 'pass',
    detail: {
      currentVersion,
      latestVersion: latestVersion || null,
      updateAvailable,
      updateInProgress,
      lastCheckTime: lastCheckTime ? new Date(lastCheckTime).toISOString() : null,
      checking,
      updateCheckInterval,
      releaseUrl,
    },
  };

  // 3. GitHub API reachability
  try {
    const data = await fetchJSON('https://api.github.com/repos/stevencheist/HamTabv1/releases/latest');
    const tag = data.tag_name || '(no tag)';
    results.github_api = { status: 'pass', detail: { tag, name: data.name || '' } };
  } catch (err) {
    results.github_api = { status: 'fail', detail: err.message };
  }

  // 4. Version comparison
  try {
    const latest = latestVersion || currentVersion;
    const cmp = compareSemver(currentVersion, latest);
    results.version_compare = {
      status: cmp < 0 ? 'pass' : 'warn',
      detail: {
        current: currentVersion,
        latest,
        result: cmp < 0 ? 'update available' : cmp === 0 ? 'up to date' : 'local is newer',
      },
    };
  } catch (err) {
    results.version_compare = { status: 'fail', detail: err.message };
  }

  // 5. Zip URL resolvability (HEAD request via secureFetch-style check)
  try {
    const zipUrl = `https://github.com/stevencheist/HamTabv1/archive/refs/heads/lanmode.zip`;
    // Use https module directly for a HEAD-like test (first redirect only)
    const testResult = await new Promise((resolve, reject) => {
      const parsed = new URL(zipUrl);
      const reqOpts = {
        method: 'HEAD',
        hostname: parsed.hostname,
        path: parsed.pathname,
        port: 443,
        headers: { 'User-Agent': 'HamTab/1.0' },
        timeout: 10000,
      };
      const r = https.request(reqOpts, (resp) => {
        resp.resume();
        resolve({
          statusCode: resp.statusCode,
          location: resp.headers.location || null,
        });
      });
      r.on('error', reject);
      r.on('timeout', () => { r.destroy(); reject(new Error('Timed out')); });
      r.end();
    });
    const ok = testResult.statusCode >= 200 && testResult.statusCode < 400;
    results.zip_url_resolve = {
      status: ok ? 'pass' : 'fail',
      detail: { url: `https://github.com/.../lanmode.zip`, ...testResult },
    };
  } catch (err) {
    results.zip_url_resolve = { status: 'fail', detail: err.message };
  }

  // 6. Write permissions
  try {
    const testFile = path.join(APP_DIR, '.diag-write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
    const nmDir = path.join(APP_DIR, 'node_modules');
    let nmWritable = false;
    if (fs.existsSync(nmDir)) {
      const nmTest = path.join(nmDir, '.diag-write-test');
      try {
        fs.writeFileSync(nmTest, 'test');
        fs.unlinkSync(nmTest);
        nmWritable = true;
      } catch { nmWritable = false; }
    } else {
      nmWritable = false; // node_modules doesn't exist
    }
    results.write_permissions = {
      status: nmWritable ? 'pass' : 'warn',
      detail: {
        appDir: 'writable',
        nodeModules: nmWritable ? 'writable' : 'NOT writable or missing',
      },
    };
  } catch (err) {
    results.write_permissions = {
      status: 'fail',
      detail: { appDir: `NOT writable: ${err.message}`, nodeModules: 'not tested' },
    };
  }

  // 7. Disk space
  try {
    if (os.platform() === 'win32') {
      results.disk_space = { status: 'pass', detail: { freeMemMB: Math.round(os.freemem() / 1048576), note: 'freemem only (Windows)' } };
    } else {
      const dfOut = await runCommand(`df -h "${APP_DIR}" | tail -1`);
      const parts = dfOut.trim().split(/\s+/);
      results.disk_space = {
        status: 'pass',
        detail: { filesystem: parts[0], size: parts[1], used: parts[2], available: parts[3], usePercent: parts[4], mount: parts[5] },
      };
    }
  } catch (err) {
    results.disk_space = { status: 'warn', detail: err.message };
  }

  // 8. npm available
  try {
    const npmVer = await runCommand('npm --version', { timeout: 10000 });
    results.npm_available = { status: 'pass', detail: { version: npmVer.trim() } };
  } catch (err) {
    results.npm_available = { status: 'fail', detail: err.message };
  }

  // 9. unzip available (Linux) or PowerShell Expand-Archive (Windows)
  try {
    if (os.platform() === 'win32') {
      const psOut = await runCommand('powershell -Command "Get-Command Expand-Archive | Select-Object -ExpandProperty Version"', { timeout: 10000 });
      results.unzip_available = { status: 'pass', detail: { tool: 'Expand-Archive', version: psOut.trim() } };
    } else {
      const unzipOut = await runCommand('unzip -v 2>&1 | head -1', { timeout: 10000 });
      results.unzip_available = { status: 'pass', detail: { tool: 'unzip', version: unzipOut.trim() } };
    }
  } catch (err) {
    results.unzip_available = { status: 'fail', detail: err.message };
  }

  // 10. esbuild available (needed for npm run build)
  // Use direct require instead of npx — npx can hang trying to download/install
  try {
    const esbuildVer = await runCommand('node -e "console.log(require(\'esbuild\').version)"', { timeout: 10000 });
    results.esbuild_available = { status: 'pass', detail: { version: esbuildVer.trim() } };
  } catch (err) {
    results.esbuild_available = { status: 'fail', detail: err.message };
  }

  res.json({ timestamp: new Date().toISOString(), checks: results });
});

// --- Restart endpoint ---
app.post('/api/restart', (req, res) => {
  res.json({ restarting: true });
  setTimeout(() => process.exit(0), 500);
});

// --- Config Sync Endpoints (lanmode only) ---
// Stores per-callsign config JSON files for cross-browser sync on the LAN.
// Hostedmode has no /api/sync routes — client checkSyncCapability() will get 404.

const SYNC_DIR = path.join(__dirname, 'data', 'configs');
fs.mkdirSync(SYNC_DIR, { recursive: true });

// Probe endpoint — client uses this to detect sync capability
app.head('/api/sync/probe', (_req, res) => res.sendStatus(200));

// GET /api/sync/:callsign — read stored config
app.get('/api/sync/:callsign', (req, res) => {
  const call = req.params.callsign.toUpperCase();
  if (!/^[A-Z0-9]{1,10}$/.test(call)) {
    return res.status(400).json({ error: 'Invalid callsign' });
  }
  const filePath = path.join(SYNC_DIR, `${call}.json`);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'No config found' });
  }
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json(data);
  } catch (err) {
    console.error('Sync read error:', err.message);
    res.status(500).json({ error: 'Failed to read config' });
  }
});

// PUT /api/sync/:callsign — store config
app.put('/api/sync/:callsign', (req, res) => {
  const call = req.params.callsign.toUpperCase();
  if (!/^[A-Z0-9]{1,10}$/.test(call)) {
    return res.status(400).json({ error: 'Invalid callsign' });
  }
  const body = req.body;
  if (!body || typeof body !== 'object' || !body.config) {
    return res.status(400).json({ error: 'Invalid body' });
  }
  // Enforce size limit (100KB)
  const json = JSON.stringify(body);
  if (json.length > 100 * 1024) {
    return res.status(413).json({ error: 'Config too large' });
  }
  body.updatedAt = new Date().toISOString();
  try {
    fs.writeFileSync(path.join(SYNC_DIR, `${call}.json`), JSON.stringify(body, null, 2));
    res.json({ ok: true, updatedAt: body.updatedAt });
  } catch (err) {
    console.error('Sync write error:', err.message);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// DELETE /api/sync/:callsign — remove stored config
app.delete('/api/sync/:callsign', (req, res) => {
  const call = req.params.callsign.toUpperCase();
  if (!/^[A-Z0-9]{1,10}$/.test(call)) {
    return res.status(400).json({ error: 'Invalid callsign' });
  }
  const filePath = path.join(SYNC_DIR, `${call}.json`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
  res.json({ ok: true });
});

// --- Server startup ---

const PID_FILE = path.join(__dirname, 'server.pid');

// Initialize VOACAP bridge (Python child process for real predictions)
voacap.init();

// Write PID file so dev tooling can find and kill this process cleanly
fs.writeFileSync(PID_FILE, String(process.pid));

// Start HTTP (always) and HTTPS (lanmode only)
const servers = startListeners(app, config);

// --- Graceful shutdown ---

let shutdownInProgress = false;

function gracefulShutdown(signal) {
  if (shutdownInProgress) return; // prevent double Ctrl+C crash
  shutdownInProgress = true;
  console.log(`\n[shutdown] ${signal} received — draining connections...`);

  // Force exit after 10s if drain stalls
  const forceTimer = setTimeout(() => {
    console.error('[shutdown] Timed out waiting for connections to drain — forcing exit');
    process.exit(1);
  }, 10000); // 10s — covers voacap 1s grace + generous drain margin
  forceTimer.unref(); // don't keep process alive just for this timer

  let pendingCloses = 0;

  function onServerClosed() {
    pendingCloses--;
    if (pendingCloses === 0) finishShutdown();
  }

  // Stop accepting new connections, drain existing
  if (servers.httpServer) {
    pendingCloses++;
    servers.httpServer.close(onServerClosed);
  }
  if (servers.httpsServer) {
    pendingCloses++;
    servers.httpsServer.close(onServerClosed);
  }

  // No servers to close (shouldn't happen, but handle it)
  if (pendingCloses === 0) finishShutdown();
}

function finishShutdown() {
  voacap.shutdown(); // sends stdin.end(), 1s grace, then force kill
  stopEviction();
  clearInterval(updateTimer); // stop update checker (lanmode)
  try { fs.unlinkSync(PID_FILE); } catch {}
  console.log('[shutdown] Clean exit');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  console.error('[fatal] Uncaught exception:', err);
  try { fs.unlinkSync(PID_FILE); } catch {}
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('[fatal] Unhandled rejection:', reason);
  try { fs.unlinkSync(PID_FILE); } catch {}
  process.exit(1);
});

// Safety net — sync-only PID cleanup for any exit path (e.g. EADDRINUSE)
process.on('exit', () => {
  try { fs.unlinkSync(PID_FILE); } catch {}
});
