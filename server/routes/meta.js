// --- Meta router ---
// Health check and API documentation.
// Extracted from server.js.

const fs = require('fs');
const path = require('path');
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const YAML = require('js-yaml');

const router = express.Router();

// Health check — registered before rate limiter in the middleware stack
router.get('/api/health', (_req, res) => {
  res.json({ ok: true, uptime: process.uptime() });
});

// Mount Swagger UI and /api redirect
function setupDocs(app, rootDir) {
  const openapiSpec = YAML.load(fs.readFileSync(path.join(rootDir, 'openapi.yaml'), 'utf8'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(openapiSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'HamTab API Documentation',
  }));
  // Redirect /api to /api/docs for convenience
  app.get('/api', (req, res) => res.redirect('/api/docs'));
}

module.exports = router;
module.exports.setupDocs = setupDocs;
