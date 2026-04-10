// --- Configuration & feedback router ---
// Config/admin write + feedback surfaces.
// Extracted from server.js.

const fs = require('fs');
const path = require('path');
const https = require('https');
const express = require('express');
const { isPrivateIP } = require('../services/http-fetch');
const { feedbackLimiter } = require('../middleware/security');

const router = express.Router();

// --- Configuration Endpoints ---
router.post('/config/env', (req, res) => {
  try {
    // Security gate: require loopback/private IP, or a CONFIG_ADMIN_TOKEN if set
    const rawIp = (req.ip || req.connection.remoteAddress || '').replace(/^::ffff:/, '');
    const adminToken = process.env.CONFIG_ADMIN_TOKEN;
    if (adminToken) {
      if (req.headers['x-admin-token'] !== adminToken) {
        console.warn(`Blocked /api/config/env from ${rawIp} — invalid admin token`);
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (!isPrivateIP(rawIp)) {
      console.warn(`Blocked /api/config/env from non-private IP: ${rawIp}`);
      return res.status(403).json({ error: 'Forbidden — config endpoint restricted to local network' });
    }

    const envPath = path.join(process.cwd(), '.env');
    const updates = req.body; // { key: value, ... }
    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'Invalid body' });
    }

    // Read existing .env lines
    let lines = [];
    if (fs.existsSync(envPath)) {
      lines = fs.readFileSync(envPath, 'utf-8').split('\n');
    }

    // Update or append each key
    const allowedKeys = ['WU_API_KEY', 'OWM_API_KEY', 'N2YO_API_KEY', 'HAMQTH_USER', 'HAMQTH_PASS'];
    for (const [key, value] of Object.entries(updates)) {
      // Only allow known env keys
      if (!allowedKeys.includes(key)) continue;
      // Sanitize: reject control chars (newline injection), enforce max length
      const sanitized = String(value).replace(/[\r\n\0]/g, '').trim();
      if (sanitized.length > 128 || sanitized.length === 0) continue;
      const idx = lines.findIndex(l => l.startsWith(key + '='));
      const entry = `${key}=${sanitized}`;
      if (idx >= 0) {
        lines[idx] = entry;
      } else {
        lines.push(entry);
      }
    }

    fs.writeFileSync(envPath, lines.filter(l => l.trim() !== '').join('\n') + '\n');
    // Update process.env so it takes effect immediately (with same sanitization)
    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key)) continue;
      const sanitized = String(value).replace(/[\r\n\0]/g, '').trim();
      if (sanitized.length > 128 || sanitized.length === 0) continue;
      process.env[key] = sanitized;
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('Failed to update .env:', err.message);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// --- Feedback endpoint (creates GitHub issue) ---
router.post('/feedback', feedbackLimiter, async (req, res) => {
  try {
    const { name, email, feedback, website } = req.body;

    // 1. Honeypot check (bots fill hidden "website" field)
    if (website) {
      console.log('Feedback spam blocked (honeypot)');
      return res.status(400).json({ error: 'Invalid submission' });
    }

    // 2. Validate feedback content
    if (!feedback || typeof feedback !== 'string') {
      return res.status(400).json({ error: 'Feedback is required' });
    }

    const feedbackTrimmed = feedback.trim();
    if (feedbackTrimmed.length < 10) {
      return res.status(400).json({ error: 'Feedback must be at least 10 characters' });
    }

    if (feedbackTrimmed.length > 5000) {
      return res.status(400).json({ error: 'Feedback must be less than 5000 characters' });
    }

    // 3. Simple spam keyword filter
    const spamKeywords = ['viagra', 'casino', 'lottery', 'crypto wallet', 'buy bitcoin'];
    const lowerFeedback = feedbackTrimmed.toLowerCase();
    if (spamKeywords.some(kw => lowerFeedback.includes(kw))) {
      console.log('Feedback spam blocked (keywords)');
      return res.status(400).json({ error: 'Invalid content' });
    }

    // 4. Validate optional fields
    const nameSafe = (name || '').trim().substring(0, 100);
    const emailSafe = (email || '').trim().substring(0, 100);

    // 5. Check for GitHub token — if not configured, optionally relay to hamtab.net
    const githubToken = process.env.GITHUB_FEEDBACK_TOKEN;
    if (!githubToken) {
      // Relay requires explicit opt-in via FEEDBACK_RELAY_ENABLED=1
      const relayEnabled = process.env.FEEDBACK_RELAY_ENABLED === '1';
      if (!relayEnabled) {
        console.warn('Feedback rejected — no GITHUB_FEEDBACK_TOKEN and FEEDBACK_RELAY_ENABLED not set');
        return res.status(503).json({
          error: 'Feedback not configured. Set GITHUB_FEEDBACK_TOKEN or FEEDBACK_RELAY_ENABLED=1 in .env. You can also submit feedback at https://github.com/stevencheist/HamTabv1/issues'
        });
      }

      console.log('No local GITHUB_FEEDBACK_TOKEN — relaying to hamtab.net (opt-in enabled)');
      try {
        const relayData = JSON.stringify({ name, email, feedback, website });
        const relayReq = https.request({
          hostname: 'hamtab.net',
          path: '/api/feedback',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(relayData),
            'User-Agent': 'HamTab-Lanmode-Relay',
          },
        }, (relayRes) => {
          let data = '';
          relayRes.on('data', chunk => data += chunk);
          relayRes.on('end', () => {
            try {
              const result = JSON.parse(data);
              res.status(relayRes.statusCode).json(result);
            } catch {
              res.status(relayRes.statusCode).json({ error: 'Relay response parse error' });
            }
          });
        });

        relayReq.setTimeout(15000, () => { // 15s timeout
          relayReq.destroy(new Error('Relay request timed out'));
        });

        relayReq.on('error', (err) => {
          console.error('Relay to hamtab.net failed:', err.message);
          res.status(503).json({
            error: 'Feedback relay unavailable. Please submit feedback directly at https://github.com/stevencheist/HamTabv1/issues'
          });
        });

        relayReq.write(relayData);
        relayReq.end();
        return;
      } catch (relayErr) {
        console.error('Relay error:', relayErr.message);
        return res.status(503).json({
          error: 'Feedback relay unavailable. Please submit feedback directly at https://github.com/stevencheist/HamTabv1/issues'
        });
      }
    }

    // 6. Build GitHub issue body
    let issueBody = feedbackTrimmed;
    if (nameSafe || emailSafe) {
      issueBody += '\n\n---\n\n**Submitted by:**';
      if (nameSafe) issueBody += `\nName: ${nameSafe}`;
      if (emailSafe) issueBody += `\nEmail: ${emailSafe}`;
    }

    // 7. Create GitHub issue
    const issueData = JSON.stringify({
      title: `[Feedback] ${feedbackTrimmed.substring(0, 50)}${feedbackTrimmed.length > 50 ? '...' : ''}`,
      body: issueBody,
      labels: ['feedback']
    });

    const options = {
      hostname: 'api.github.com',
      path: '/repos/stevencheist/HamTabv1/issues',
      method: 'POST',
      headers: {
        'User-Agent': 'HamTab-Feedback',
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(issueData)
      }
    };

    // Make GitHub API request
    const githubReq = https.request(options, (githubRes) => {
      let data = '';
      githubRes.on('data', chunk => data += chunk);
      githubRes.on('end', () => {
        if (githubRes.statusCode === 201) {
          console.log('Feedback submitted successfully');
          res.json({ success: true, message: 'Feedback submitted successfully' });
        } else {
          console.error('GitHub API error:', githubRes.statusCode, data);
          res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
        }
      });
    });

    githubReq.setTimeout(15000, () => { // 15s timeout
      githubReq.destroy(new Error('GitHub API request timed out'));
    });

    githubReq.on('error', (err) => {
      console.error('GitHub API request error:', err.message);
      res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
    });

    githubReq.write(issueData);
    githubReq.end();

  } catch (err) {
    console.error('Feedback endpoint error:', err.message);
    res.status(500).json({ error: 'Failed to submit feedback. Please try again later.' });
  }
});

module.exports = router;
