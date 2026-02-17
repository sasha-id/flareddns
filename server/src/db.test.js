const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');

const TEST_DB_PATH = path.join(__dirname, '..', '..', 'data', 'test.db');

describe('Database', () => {
  before(() => {
    fs.mkdirSync(path.dirname(TEST_DB_PATH), { recursive: true });
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
    process.env.DB_PATH = TEST_DB_PATH;
  });

  after(() => {
    const { close } = require('./db');
    close();
    if (fs.existsSync(TEST_DB_PATH)) fs.unlinkSync(TEST_DB_PATH);
  });

  it('should create all tables on init', () => {
    const { getDb } = require('./db');
    const db = getDb();
    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
    const tableNames = tables.map(t => t.name);
    assert.ok(tableNames.includes('settings'));
    assert.ok(tableNames.includes('zones'));
    assert.ok(tableNames.includes('dns_records'));
    assert.ok(tableNames.includes('update_log'));
  });

  it('should support settings CRUD', () => {
    const { getSetting, setSetting } = require('./db');
    setSetting('test_key', 'test_value');
    assert.strictEqual(getSetting('test_key'), 'test_value');
    setSetting('test_key', 'updated');
    assert.strictEqual(getSetting('test_key'), 'updated');
  });
});
