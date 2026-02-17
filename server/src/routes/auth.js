const express = require('express');
const config = require('../config');
const { getSetting } = require('../db');

function createAuthRouter() {
  const router = express.Router();

  router.post('/login', express.json(), (req, res) => {
    const { username, password } = req.body;
    if (username === config.adminUser && password === config.adminPassword) {
      req.session.authenticated = true;
      return res.json({ success: true });
    }
    res.status(401).json({ error: 'Invalid credentials' });
  });

  router.post('/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
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
