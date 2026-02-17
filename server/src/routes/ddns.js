const express = require('express');
const { getDb, getSetting } = require('../db');
const { findZoneForHostname } = require('../zones');
const { getClientIp, isIPv4, isIPv6 } = require('../ip');
const { createRateLimiter } = require('../ratelimit');
const cf = require('../cloudflare');

function createDdnsRouter() {
  const router = express.Router();
  const rateLimiter = createRateLimiter({ windowMs: 60000, maxRequests: 30 });

  function handler(req, res) {
    res.set('Content-Type', 'text/plain');

    // Parse Basic Auth
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Basic ')) {
      return res.status(401).send('badauth');
    }

    const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
    const [username, ...passparts] = decoded.split(':');
    const password = passparts.join(':');

    // Validate against DDNS_USERS
    const config = require('../config');
    const validUser = config.ddnsUsers.find(u => u.username === username && u.password === password);
    if (!validUser) {
      logUpdate(req, '', '', username, 'badauth');
      return res.send('badauth');
    }

    // Parse hostnames
    const hostnameParam = req.query.hostname || '';
    if (!hostnameParam) {
      logUpdate(req, '', '', username, 'notfqdn');
      return res.send('notfqdn');
    }

    const hostnames = hostnameParam.split(',').map(h => h.trim().toLowerCase()).filter(Boolean);
    if (hostnames.length === 0) {
      logUpdate(req, '', '', username, 'notfqdn');
      return res.send('notfqdn');
    }

    // Parse IPs
    const myipParam = req.query.myip || '';
    const detectedIp = getClientIp(req);
    const ips = myipParam ? myipParam.split(',').map(ip => ip.trim()).filter(Boolean) : [detectedIp];

    // Get zones from DB
    const db = getDb();
    const zones = db.prepare('SELECT id, name, status FROM zones').all();
    const token = getSetting('cf_api_token');

    if (!token) {
      return res.send('911');
    }

    // Process each hostname
    const promises = hostnames.map(async (hostname) => {
      if (!rateLimiter.check(hostname)) {
        logUpdate(req, hostname, ips[0] || detectedIp, username, 'abuse');
        return 'abuse';
      }

      const zone = findZoneForHostname(hostname, zones);
      if (!zone) {
        logUpdate(req, hostname, ips[0] || detectedIp, username, 'nohost');
        return 'nohost';
      }

      const hostnameResults = [];
      for (const ip of ips) {
        const recordType = isIPv6(ip) ? 'AAAA' : 'A';
        try {
          const result = await processUpdate(token, zone, hostname, ip, recordType, db);
          logUpdate(req, hostname, ip, username, result);
          hostnameResults.push(result);
        } catch (err) {
          console.error(`Error updating ${hostname}:`, err.message);
          logUpdate(req, hostname, ip, username, 'dnserr');
          hostnameResults.push('dnserr');
        }
      }
      return hostnameResults.join('\n');
    });

    Promise.all(promises)
      .then(results => res.send(results.join('\n')))
      .catch(() => res.send('911'));
  }

  router.get('/nic/update', handler);
  router.get('/v3/update', handler);

  return router;
}

async function processUpdate(token, zone, hostname, ip, recordType, db) {
  // Check local DB first
  const localRecord = db.prepare(
    'SELECT id, content, proxied, ttl FROM dns_records WHERE name = ? AND type = ?'
  ).get(hostname, recordType);

  if (localRecord) {
    if (localRecord.content === ip) {
      return `nochg ${ip}`;
    }

    await cf.updateDnsRecord(token, zone.id, localRecord.id, {
      name: hostname, type: recordType, content: ip,
      proxied: !!localRecord.proxied, ttl: localRecord.ttl,
    });

    db.prepare('UPDATE dns_records SET content = ?, last_updated = ? WHERE id = ?')
      .run(ip, new Date().toISOString(), localRecord.id);

    return `good ${ip}`;
  }

  // Not in local DB — check Cloudflare
  const cfRecords = await cf.listDnsRecords(token, zone.id, recordType);
  const existing = cfRecords.find(r => r.name === hostname && r.type === recordType);

  if (existing) {
    if (existing.content === ip) {
      db.prepare(
        'INSERT OR REPLACE INTO dns_records (id, zone_id, name, type, content, proxied, ttl, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(existing.id, zone.id, hostname, recordType, ip, existing.proxied ? 1 : 0, existing.ttl, new Date().toISOString());
      return `nochg ${ip}`;
    }

    await cf.updateDnsRecord(token, zone.id, existing.id, {
      name: hostname, type: recordType, content: ip,
      proxied: existing.proxied, ttl: existing.ttl,
    });

    db.prepare(
      'INSERT OR REPLACE INTO dns_records (id, zone_id, name, type, content, proxied, ttl, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(existing.id, zone.id, hostname, recordType, ip, existing.proxied ? 1 : 0, existing.ttl, new Date().toISOString());

    return `good ${ip}`;
  }

  // Auto-create
  const created = await cf.createDnsRecord(token, zone.id, {
    name: hostname, type: recordType, content: ip, proxied: false, ttl: 1,
  });

  db.prepare(
    'INSERT INTO dns_records (id, zone_id, name, type, content, proxied, ttl, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(created.id, zone.id, hostname, recordType, ip, 0, 1, new Date().toISOString());

  return `good ${ip}`;
}

function logUpdate(req, hostname, ip, username, response) {
  try {
    const db = getDb();
    const sourceIp = getClientIp(req);
    db.prepare(
      'INSERT INTO update_log (timestamp, hostname, ip, source_ip, response, username) VALUES (?, ?, ?, ?, ?, ?)'
    ).run(new Date().toISOString(), hostname, ip, sourceIp, response, username);
  } catch (err) {
    console.error('Failed to log update:', err.message);
  }
}

module.exports = { createDdnsRouter };
