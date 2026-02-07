// --- Deployment mode configuration ---
// Detects deployment mode from environment and returns config.
// Hostedmode: PORT=8080 (set by Cloudflare Container runtime)
// Lanmode: PORT unset or 3000 (default)

const HOSTEDMODE_PORT = 8080;

function getConfig() {
  const port = parseInt(process.env.PORT, 10) || 3000;
  const isHostedmode = port === HOSTEDMODE_PORT;

  return {
    port,
    httpsPort: parseInt(process.env.HTTPS_PORT, 10) || 3443,
    host: process.env.HOST || '0.0.0.0',
    isHostedmode,

    // Hostedmode sits behind Cloudflare Worker proxy
    trustProxy: isHostedmode,

    // Helmet options differ: lanmode uses self-signed certs (no HSTS, no upgrade)
    helmetOptions: {
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://*.basemaps.cartocdn.com"],
          connectSrc: ["'self'"],
          frameSrc: ["'none'"],
          ...(isHostedmode ? {} : { upgradeInsecureRequests: null }),
        },
      },
      strictTransportSecurity: isHostedmode
        ? { maxAge: 31536000 } // 1 year HSTS
        : false,               // no HSTS for self-signed certs
    },
  };
}

module.exports = { getConfig };
