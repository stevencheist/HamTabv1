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
