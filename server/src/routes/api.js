const express = require('express');
const { getDb, getSetting, setSetting } = require('../db');
const { requireAuth } = require('../middleware/auth');
const cf = require('../cloudflare');

function createApiRouter() {
  const router = express.Router();
  router.use(requireAuth);
  router.use(express.json());

  // Dashboard
  router.get('/dashboard', (req, res) => {
    const db = getDb();
    const records = db.prepare(`
      SELECT dr.name, dr.type, dr.content, dr.proxied, dr.last_updated,
             z.name as zone_name
      FROM dns_records dr
      JOIN zones z ON dr.zone_id = z.id
      ORDER BY dr.name
    `).all();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const stats = db.prepare(`
      SELECT COUNT(*) as total,
             SUM(CASE WHEN response LIKE 'good%' THEN 1 ELSE 0 END) as successful
      FROM update_log
      WHERE timestamp >= ?
    `).get(todayStart.toISOString());

    const lastUpdate = db.prepare(
      'SELECT timestamp FROM update_log ORDER BY id DESC LIMIT 1'
    ).get();

    res.json({
      records,
      stats: {
        totalToday: stats?.total || 0,
        successfulToday: stats?.successful || 0,
        activeHostnames: records.length,
        lastUpdate: lastUpdate?.timestamp || null,
      },
    });
  });

  // Zones
  router.get('/zones', (req, res) => {
    const db = getDb();
    const zones = db.prepare('SELECT * FROM zones ORDER BY name').all();
    res.json(zones);
  });

  router.post('/zones/sync', async (req, res) => {
    const token = getSetting('cf_api_token');
    if (!token) return res.status(400).json({ error: 'No token configured' });

    try {
      const cfZones = await cf.listZones(token);
      const db = getDb();
      const existing = db.prepare('SELECT id FROM zones').all().map(z => z.id);
      const update = db.prepare('UPDATE zones SET name = ?, status = ? WHERE id = ?');
      for (const zone of cfZones) {
        if (existing.includes(zone.id)) {
          update.run(zone.name, zone.status, zone.id);
        }
      }
      const zones = db.prepare('SELECT * FROM zones ORDER BY name').all();
      res.json(zones);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Records
  router.get('/records', (req, res) => {
    const db = getDb();
    const records = db.prepare(`
      SELECT dr.*, z.name as zone_name
      FROM dns_records dr
      JOIN zones z ON dr.zone_id = z.id
      ORDER BY dr.name
    `).all();
    res.json(records);
  });

  router.post('/records', async (req, res) => {
    const { zoneId, name, type, content, proxied, ttl } = req.body;
    const token = getSetting('cf_api_token');
    if (!token) return res.status(400).json({ error: 'No token configured' });

    try {
      const created = await cf.createDnsRecord(token, zoneId, {
        name, type: type || 'A', content, proxied: !!proxied, ttl: ttl || 1,
      });

      const db = getDb();
      db.prepare(
        'INSERT INTO dns_records (id, zone_id, name, type, content, proxied, ttl, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(created.id, zoneId, created.name, created.type, created.content, created.proxied ? 1 : 0, created.ttl, new Date().toISOString());

      res.json(created);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.patch('/records/:id', async (req, res) => {
    const { id } = req.params;
    const { proxied, ttl } = req.body;
    const token = getSetting('cf_api_token');
    if (!token) return res.status(400).json({ error: 'No token configured' });

    const db = getDb();
    const record = db.prepare('SELECT * FROM dns_records WHERE id = ?').get(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    try {
      const updated = await cf.updateDnsRecord(token, record.zone_id, id, {
        name: record.name, type: record.type, content: record.content,
        proxied: proxied !== undefined ? !!proxied : !!record.proxied,
        ttl: ttl !== undefined ? ttl : record.ttl,
      });

      db.prepare('UPDATE dns_records SET proxied = ?, ttl = ?, last_updated = ? WHERE id = ?')
        .run(updated.proxied ? 1 : 0, updated.ttl, new Date().toISOString(), id);

      res.json(updated);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  router.delete('/records/:id', async (req, res) => {
    const { id } = req.params;
    const token = getSetting('cf_api_token');
    if (!token) return res.status(400).json({ error: 'No token configured' });

    const db = getDb();
    const record = db.prepare('SELECT * FROM dns_records WHERE id = ?').get(id);
    if (!record) return res.status(404).json({ error: 'Record not found' });

    try {
      await cf.deleteDnsRecord(token, record.zone_id, id);
      db.prepare('DELETE FROM dns_records WHERE id = ?').run(id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Logs
  router.get('/logs', (req, res) => {
    const db = getDb();
    const { hostname, response } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    let where = 'WHERE 1=1';
    const params = [];
    if (hostname) { where += ' AND hostname LIKE ?'; params.push(`%${hostname}%`); }
    if (response) { where += ' AND response LIKE ?'; params.push(`${response}%`); }

    const total = db.prepare(`SELECT COUNT(*) as count FROM update_log ${where}`).get(...params);
    const logs = db.prepare(
      `SELECT * FROM update_log ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
    ).all(...params, limit, offset);

    res.json({
      logs,
      total: total.count,
      page,
      totalPages: Math.ceil(total.count / limit),
    });
  });

  // Settings
  router.get('/settings', (req, res) => {
    const config = require('../config');
    res.json({
      cfApiToken: getSetting('cf_api_token') ? '********' : '',
      hasToken: !!getSetting('cf_api_token'),
      rateLimitWindow: parseInt(getSetting('rate_limit_window') || '60000'),
      rateLimitMax: parseInt(getSetting('rate_limit_max') || '30'),
      ddnsUsers: config.ddnsUsers.map(u => ({ username: u.username })),
    });
  });

  router.put('/settings', async (req, res) => {
    const { cfApiToken, rateLimitWindow, rateLimitMax } = req.body;

    if (cfApiToken) {
      try {
        const result = await cf.validateToken(cfApiToken);
        if (!result.valid) {
          return res.status(400).json({ error: 'Invalid token' });
        }
        setSetting('cf_api_token', cfApiToken);
      } catch (err) {
        return res.status(500).json({ error: 'Failed to validate token' });
      }
    }

    if (rateLimitWindow !== undefined) setSetting('rate_limit_window', String(rateLimitWindow));
    if (rateLimitMax !== undefined) setSetting('rate_limit_max', String(rateLimitMax));

    res.json({ success: true });
  });

  return router;
}

module.exports = { createApiRouter };
