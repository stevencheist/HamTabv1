// --- Security & bootstrap middleware ---
// Extracted from server.js — CSP, helmet, CORS, rate limiting, body parsing.

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
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

  app.use(express.static(path.join(process.cwd(), 'public')));
}

module.exports = { setupSecurity, feedbackLimiter };
