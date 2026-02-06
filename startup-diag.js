// Diagnostic startup wrapper — catches startup crashes and exposes the error.
// TEMPORARY — remove after debugging.

process.on('uncaughtException', (err) => {
  console.error('[DIAG] Uncaught exception:', err.message);
  console.error(err.stack);

  // Start a minimal server to report the error
  const http = require('http');
  http.createServer((req, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      diag: true,
      error: err.message,
      stack: err.stack,
      files: require('fs').readdirSync('/app').join(', '),
    }));
  }).listen(8080, '0.0.0.0', () => {
    console.log('[DIAG] Error reporting server on 8080');
  });
});

// Load the real server
require('./server.js');
