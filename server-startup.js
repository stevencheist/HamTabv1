// --- Server listener startup ---
// Starts HTTP on all modes. Starts HTTPS (self-signed) in lanmode only.
// Returns server references for graceful shutdown.

const https = require('https');
const { ensureCerts } = require('./server-tls.js');

function handleListenError(server, port, protocol) {
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`\n[startup] ${protocol} port ${port} is already in use.`);
      console.error('Another instance of HamTab may be running.\n');
      if (process.platform === 'win32') {
        console.error(`  Find the process:  netstat -ano | findstr :${port}`);
        console.error('  Kill by PID:       taskkill /PID <pid> /F\n');
      } else {
        console.error(`  Find the process:  lsof -i :${port}`);
        console.error('  Kill by PID:       kill <pid>\n');
      }
      process.exit(1);
    }
    throw err; // non-EADDRINUSE errors — preserve default crash behavior
  });
}

/**
 * Start server listeners.
 * @param {import('express').Express} app
 * @param {{ port: number, httpsPort: number, host: string, isHostedmode: boolean }} config
 * @returns {{ httpServer: import('http').Server, httpsServer: import('https').Server|null }}
 */
function startListeners(app, config) {
  // HTTP — always
  const httpServer = app.listen(config.port, config.host, () => {
    console.log(`HTTP server running at http://${config.host}:${config.port}`);
  });
  handleListenError(httpServer, config.port, 'HTTP');

  // HTTPS — lanmode only (hostedmode TLS is handled by Cloudflare)
  let httpsServer = null;
  if (!config.isHostedmode) {
    const tlsOptions = ensureCerts();
    httpsServer = https.createServer(tlsOptions, app).listen(config.httpsPort, config.host, () => {
      console.log(`HTTPS server running at https://${config.host}:${config.httpsPort}`);
    });
    handleListenError(httpsServer, config.httpsPort, 'HTTPS');
  }

  return { httpServer, httpsServer };
}

module.exports = { startListeners };
