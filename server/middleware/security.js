// --- Security & bootstrap middleware ---
// Extracted from server.js — CSP, helmet, CORS, rate limiting, body parsing,
// static files, and Swagger UI setup.

const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');
const { URL } = require('url');
const { isPrivateIP } = require('../services/http-fetch');

// Rate limit for feedback endpoint (10 submissions per day per IP)
const feedbackLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many feedback submissions. Please try again tomorrow.' },
});

function setupSecurity(app, config) {
  if (config.trustProxy) app.set('trust proxy', 1);

  // CSP relaxed for /api/docs (Swagger UI needs inline scripts)
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/docs') || req.path.startsWith('/api-docs')) {
      res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
      return next();
    }
    next();
  });

  app.use(helmet(config.helmetOptions));

  // CORS — lanmode only (restrict to same-origin, localhost, and RFC 1918 private ranges)
  // Hostedmode is same-origin behind Cloudflare — no CORS needed
  if (!config.isHostedmode) {
    app.use(cors({
      origin(origin, callback) {
        // Allow requests with no Origin header (same-origin, curl, etc.)
        if (!origin) return callback(null, true);

        try {
          const { hostname } = new URL(origin);
          if (hostname === 'localhost' || isPrivateIP(hostname)) {
            return callback(null, true);
          }
          callback(new Error('CORS not allowed'));
        } catch {
          callback(new Error('CORS not allowed'));
        }
      },
    }));
  }

  // Health check — before rate limiter so probes aren't counted
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, uptime: process.uptime() });
  });

  // Rate limiting — /api/ routes only; generous in LAN mode, stricter when hosted
  const apiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: process.env.HOSTED_MODE === '1' ? 60 : 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api/', apiLimiter);

  app.use(express.json({ limit: '100kb' }));
}

function setupDocs(app, rootDir) {
  app.use(express.static(path.join(rootDir, 'public')));

  const openapiSpec = YAML.load(fs.readFileSync(path.join(rootDir, 'openapi.yaml'), 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HamTab API Documentation',
  }));
  // Redirect /api to /api/docs for convenience
  app.get('/api', (req, res) => res.redirect('/api/docs'));
}

module.exports = { setupSecurity, setupDocs, feedbackLimiter };
