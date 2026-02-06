// TEMPORARY — wraps server.js to capture startup crashes
// Serves the error on port 8080 so we can see it via the Worker proxy
const http = require('http');

function serveCrash(err) {
  const body = JSON.stringify({
    crash: true,
    error: err.message,
    stack: err.stack,
    cwd: process.cwd(),
    files: (() => { try { return require('fs').readdirSync('.'); } catch { return []; } })(),
    nodeModules: (() => { try { return require('fs').existsSync('./node_modules'); } catch { return false; } })(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      HOST: process.env.HOST,
    }
  }, null, 2);

  http.createServer((_, res) => {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(body);
  }).listen(8080, '0.0.0.0', () => {
    console.error('[startup-diag] Server crashed, serving error on :8080');
    console.error(err.stack);
  });
}

process.on('uncaughtException', serveCrash);
process.on('unhandledRejection', (reason) => {
  serveCrash(reason instanceof Error ? reason : new Error(String(reason)));
});

try {
  require('./server.js');
} catch (err) {
  serveCrash(err);
}
