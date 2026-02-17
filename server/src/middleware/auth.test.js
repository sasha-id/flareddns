const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB_PATH = path.join(__dirname, '..', '..', '..', 'data', 'test-auth.db');

describe('Auth middleware and routes', () => {
  let server;
  let baseUrl;
  let cookie;

  before(async () => {
    fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DB_PATH = TEST_DB_PATH;
    process.env.ADMIN_USER = 'admin';
    process.env.ADMIN_PASSWORD = 'testpass';

    // Clear cached modules
    for (const key of Object.keys(require.cache)) {
      if (key.includes('flareddns/server/src/')) {
        delete require.cache[key];
      }
    }

    const { getDb } = require('../db');
    getDb();

    const express = require('express');
    const session = require('express-session');
    const app = express();

    app.use(session({
      secret: 'test-secret',
      resave: false,
      saveUninitialized: false,
    }));

    const { createAuthRouter } = require('../routes/auth');
    const { requireAuth } = require('./auth');

    app.use('/api/auth', createAuthRouter());
    app.get('/api/protected', requireAuth, (req, res) => {
      res.json({ ok: true });
    });

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

  function request(method, urlPath, { body, headers: hdrs = {} } = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${baseUrl}${urlPath}`);
      const options = {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method,
        headers: { ...hdrs },
      };

      if (body) {
        const data = JSON.stringify(body);
        options.headers['Content-Type'] = 'application/json';
        options.headers['Content-Length'] = Buffer.byteLength(data);
      }

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          let parsed;
          try { parsed = JSON.parse(data); } catch { parsed = data; }
          resolve({ status: res.statusCode, body: parsed, headers: res.headers });
        });
      });
      req.on('error', reject);
      if (body) req.write(JSON.stringify(body));
      req.end();
    });
  }

  it('should return 401 for protected routes when not authenticated', async () => {
    const res = await request('GET', '/api/protected');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Unauthorized');
  });

  it('should return auth status as not authenticated initially', async () => {
    const res = await request('GET', '/api/auth/status');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.authenticated, false);
  });

  it('should reject login with wrong credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { username: 'admin', password: 'wrong' },
    });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error, 'Invalid credentials');
  });

  it('should accept login with correct credentials', async () => {
    const res = await request('POST', '/api/auth/login', {
      body: { username: 'admin', password: 'testpass' },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    // Save cookie for subsequent requests
    cookie = res.headers['set-cookie']?.[0]?.split(';')[0];
    assert.ok(cookie, 'Should set session cookie');
  });

  it('should allow access to protected routes after login', async () => {
    const res = await request('GET', '/api/protected', {
      headers: { 'Cookie': cookie },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ok, true);
  });

  it('should show authenticated status after login', async () => {
    const res = await request('GET', '/api/auth/status', {
      headers: { 'Cookie': cookie },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.authenticated, true);
  });

  it('should logout successfully', async () => {
    const res = await request('POST', '/api/auth/logout', {
      headers: { 'Cookie': cookie },
    });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
  });

  it('should deny protected routes after logout', async () => {
    const res = await request('GET', '/api/protected', {
      headers: { 'Cookie': cookie },
    });
    assert.strictEqual(res.status, 401);
  });
});
