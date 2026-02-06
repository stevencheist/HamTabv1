// --- Server listener startup ---
// Starts HTTP on all modes. Starts HTTPS (self-signed) in lanmode only.

const https = require('https');
const { ensureCerts } = require('./server-tls.js');

/**
 * Start server listeners.
 * @param {import('express').Express} app
 * @param {{ port: number, httpsPort: number, host: string, isHostedmode: boolean }} config
 */
function startListeners(app, config) {
  // HTTP — always
  app.listen(config.port, config.host, () => {
    console.log(`HTTP server running at http://${config.host}:${config.port}`);
  });

  // HTTPS — lanmode only (hostedmode TLS is handled by Cloudflare)
  if (!config.isHostedmode) {
    const tlsOptions = ensureCerts();
    https.createServer(tlsOptions, app).listen(config.httpsPort, config.host, () => {
      console.log(`HTTPS server running at https://${config.host}:${config.httpsPort}`);
    });
  }
}

module.exports = { startListeners };
