const express = require('express');
const { getDb, setSetting, getSetting } = require('../db');
const cf = require('../cloudflare');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');

function createSetupRouter() {
  const router = express.Router();
  let cachedZones = null;

  router.use((req, res, next) => {
    if (getSetting('setup_complete') === 'true') {
      return res.status(403).json({ error: 'Setup already complete' });
    }
    next();
  });

  router.use(requireAuth);

  router.post('/validate-token', express.json(), async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'Token required' });

    let result;
    try {
      result = await cf.validateToken(token);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to validate token' });
    }
    if (result.valid) {
      setSetting('cf_api_token_pending', token);
      return res.json({ valid: true });
    }
    res.status(400).json({ valid: false, errors: result.errors });
  });

  router.get('/zones', async (req, res) => {
    const token = getSetting('cf_api_token_pending') || getSetting('cf_api_token');
    if (!token) return res.status(400).json({ error: 'No token configured' });

    try {
      const zones = await cf.listZones(token);
      cachedZones = zones;
      res.json(zones.map(z => ({ id: z.id, name: z.name, status: z.status })));
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.post('/complete', express.json(), async (req, res) => {
    const { zoneIds } = req.body;
    if (!zoneIds || !Array.isArray(zoneIds) || zoneIds.length === 0) {
      return res.status(400).json({ error: 'Select at least one zone' });
    }

    const token = getSetting('cf_api_token_pending') || getSetting('cf_api_token');
    if (!token) return res.status(400).json({ error: 'No token configured' });

    try {
      const allZones = cachedZones || await cf.listZones(token);
      cachedZones = null;
      const db = getDb();
      const insert = db.prepare('INSERT OR REPLACE INTO zones (id, name, status) VALUES (?, ?, ?)');
      const saveZones = db.transaction((zones) => {
        for (const zone of zones) {
          if (zoneIds.includes(zone.id)) {
            insert.run(zone.id, zone.name, zone.status);
          }
        }
      });
      saveZones(allZones);

      // Sync existing A/AAAA records from Cloudflare for selected zones
      const insertRecord = db.prepare(
        'INSERT OR REPLACE INTO dns_records (id, zone_id, name, type, content, proxied, ttl, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      );
      const now = new Date().toISOString();
      for (const zoneId of zoneIds) {
        const records = await cf.listDnsRecords(token, zoneId);
        for (const r of records) {
          if (r.type === 'A' || r.type === 'AAAA') {
            insertRecord.run(r.id, zoneId, r.name, r.type, r.content, r.proxied ? 1 : 0, r.ttl, now);
          }
        }
      }

      setSetting('cf_api_token', token);
      setSetting('setup_complete', 'true');
      db.prepare('DELETE FROM settings WHERE key = ?').run('cf_api_token_pending');

      res.json({
        success: true,
        ddnsUsers: config.ddnsUsers.map(u => ({ username: u.username })),
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}

module.exports = { createSetupRouter };
