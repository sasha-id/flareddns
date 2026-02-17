const express = require('express');
const crypto = require('node:crypto');
const config = require('../config');
const { getSetting } = require('../db');

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, Buffer.alloc(bufA.length));
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function createAuthRouter() {
  const router = express.Router();

  router.post('/login', express.json(), (req, res) => {
    const { username, password } = req.body;
    if (safeEqual(username, config.adminUser) && safeEqual(password, config.adminPassword)) {
      req.session.authenticated = true;
      return res.json({ success: true });
    }
    res.status(401).json({ error: 'Invalid credentials' });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => {
      res.json({ success: true });
    });
  });

  router.get('/status', (req, res) => {
    const setupComplete = getSetting('setup_complete') === 'true';
    res.json({
      authenticated: !!(req.session && req.session.authenticated),
      setupComplete,
    });
  });

  return router;
}

module.exports = { createAuthRouter };
