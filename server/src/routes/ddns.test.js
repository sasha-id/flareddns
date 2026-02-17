const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'test-ddns.db');

describe('dyndns2 update endpoint', () => {
  let server;
  let baseUrl;

  before(async () => {
    fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DB_PATH = TEST_DB_PATH;
    process.env.DDNS_USERS = 'testuser:testpass';

    const { getDb, setSetting } = require('../db');
    const db = getDb();
    db.prepare('INSERT INTO zones (id, name, status) VALUES (?, ?, ?)').run('z1', 'example.com', 'active');
    setSetting('setup_complete', 'true');
    setSetting('cf_api_token', 'fake-token');

    const express = require('express');
    const app = express();
    app.set('trust proxy', true);

    const { createDdnsRouter } = require('./ddns');
    app.use(createDdnsRouter());

    await new Promise((resolve) => {
      server = app.listen(0, '127.0.0.1', () => {
        baseUrl = `http://127.0.0.1:${server.address().port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (server) await new Promise(r => server.close(r));
    const { close } = require('../db');
    close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  function makeRequest(urlPath, { username = 'testuser', password = 'testpass' } = {}) {
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    return new Promise((resolve, reject) => {
      http.get(`${baseUrl}${urlPath}`, {
        headers: { 'Authorization': `Basic ${auth}` },
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve({ status: res.statusCode, body: data.trim(), headers: res.headers }));
      }).on('error', reject);
    });
  }

  it('should return badauth for invalid credentials', async () => {
    const res = await makeRequest('/nic/update?hostname=test.example.com&myip=1.2.3.4', {
      username: 'wrong', password: 'wrong',
    });
    assert.strictEqual(res.body, 'badauth');
  });

  it('should return notfqdn for empty hostname', async () => {
    const res = await makeRequest('/nic/update?hostname=&myip=1.2.3.4');
    assert.strictEqual(res.body, 'notfqdn');
  });

  it('should return nohost for hostname with no matching zone', async () => {
    const res = await makeRequest('/nic/update?hostname=test.unknown.net&myip=1.2.3.4');
    assert.strictEqual(res.body, 'nohost');
  });

  it('should return plain text content type', async () => {
    const res = await makeRequest('/nic/update?hostname=test.example.com&myip=1.2.3.4');
    assert.ok(res.headers['content-type'].includes('text/plain'));
  });

  it('should work on /v3/update alias', async () => {
    const res = await makeRequest('/v3/update?hostname=test.example.com&myip=1.2.3.4');
    assert.ok(res.body !== 'badauth');
  });
});
